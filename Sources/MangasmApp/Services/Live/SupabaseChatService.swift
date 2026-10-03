import Foundation
@preconcurrency import Supabase

// MARK: - SupabaseChatService
/// Live DM layer over `public.messages` (sender_id / recipient_id / body).
/// Local cache = `ChatInboxCache` (unit-tested); server ops run in Tasks.
/// Block purge: local clear + `purge_conversation_with(other)` RPC (or best-effort deletes).
@MainActor
public final class SupabaseChatService: ChatService {
    private let client: SupabaseClient
    private let inbox: ChatInboxCache

    public init(client: SupabaseClient, inbox: ChatInboxCache = ChatInboxCache()) {
        self.client = client
        self.inbox = inbox
    }

    // MARK: - ChatService

    public func conversations() -> [Conversation] { inbox.conversations() }

    public func messages(for conversationID: String) -> [Message] {
        inbox.messages(for: conversationID)
    }

    public func send(_ text: String, to conversationID: String) {
        guard let sent = inbox.send(text, to: conversationID) else { return }
        Task { await persistSend(text: sent.text, conversationID: conversationID) }
    }

    public func removeConversation(for candidateID: String) {
        inbox.removeConversation(for: candidateID)
        Task { await purgeServerMessages(with: candidateID) }
    }

    @discardableResult
    public func conversation(for candidateID: String, name: String, avatarURL: String?) -> Conversation {
        inbox.conversation(
            for: candidateID,
            name: name,
            avatarURL: avatarURL,
            stableID: { ChatInboxCache.stableConversationID(candidateID: $0) }
        )
    }

    /// Hydrate inbox from `messages` + peer profile rows. Call after sign-in.
    public func loadFromServer() async {
        guard let me = try? await currentUserID() else { return }

        struct MessageRow: Decodable {
            let id: UUID
            let sender_id: UUID
            let recipient_id: UUID
            let body: String
            let created_at: Date
        }

        let rows: [MessageRow]
        do {
            rows = try await client
                .from("messages")
                .select("id,sender_id,recipient_id,body,created_at")
                .or("sender_id.eq.\(me.uuidString),recipient_id.eq.\(me.uuidString)")
                .order("created_at", ascending: true)
                .limit(500)
                .execute()
                .value
        } catch {
            return
        }

        var byPeer: [UUID: [MessageRow]] = [:]
        for row in rows {
            let peer = row.sender_id == me ? row.recipient_id : row.sender_id
            byPeer[peer, default: []].append(row)
        }

        let peerIDs = Array(byPeer.keys)
        let nameMap = await loadPeerLabels(ids: peerIDs)

        var nextConvos: [Conversation] = []
        var nextMessages: [String: [Message]] = [:]

        for (peer, peerRows) in byPeer {
            let candidateID = peer.uuidString
            let convID = ChatInboxCache.stableConversationID(candidateID: candidateID)
            let label = nameMap[peer] ?? PeerLabel(name: "Member", avatarURL: nil)
            let mapped: [Message] = peerRows.map { row in
                Message(
                    id: row.id.uuidString,
                    senderIsMe: row.sender_id == me,
                    text: row.body,
                    timestamp: row.created_at
                )
            }
            nextMessages[convID] = mapped
            nextConvos.append(
                Conversation(
                    id: convID,
                    candidateID: candidateID,
                    candidateName: label.name,
                    candidateAvatarURL: label.avatarURL,
                    messages: mapped,
                    unreadCount: mapped.filter { !$0.senderIsMe }.suffix(3).count
                )
            )
        }

        nextConvos.sort {
            ($0.messages.last?.timestamp ?? .distantPast) > ($1.messages.last?.timestamp ?? .distantPast)
        }
        inbox.replace(conversations: nextConvos, messagesByConversation: nextMessages)
    }

    // MARK: - Private

    private struct PeerLabel {
        let name: String
        let avatarURL: String?
    }

    private func loadPeerLabels(ids: [UUID]) async -> [UUID: PeerLabel] {
        guard !ids.isEmpty else { return [:] }

        struct PeerRow: Decodable {
            let id: UUID
            let name: String?
            let display_name: String?
            let handle: String?
            let avatar_url: String?
        }

        if let rows: [PeerRow] = try? await client
            .from("profiles")
            .select("id,name,display_name,handle,avatar_url")
            .in("id", values: ids.map(\.uuidString))
            .execute()
            .value {
            return Dictionary(uniqueKeysWithValues: rows.map { row in
                let name = row.name ?? row.display_name ?? row.handle ?? "Member"
                return (row.id, PeerLabel(name: name, avatarURL: row.avatar_url))
            })
        }

        struct Minimal: Decodable {
            let id: UUID
            let handle: String?
            let avatar_url: String?
        }
        let minimal: [Minimal] = (try? await client
            .from("profiles")
            .select("id,handle,avatar_url")
            .in("id", values: ids.map(\.uuidString))
            .execute()
            .value) ?? []
        return Dictionary(uniqueKeysWithValues: minimal.map {
            ($0.id, PeerLabel(name: $0.handle ?? "Member", avatarURL: $0.avatar_url))
        })
    }

    private func persistSend(text: String, conversationID: String) async {
        guard let me = try? await currentUserID(),
              let peer = peerUUID(fromConversationID: conversationID)
        else { return }

        struct Insert: Encodable {
            let sender_id: UUID
            let recipient_id: UUID
            let body: String
        }

        _ = try? await client
            .from("messages")
            .insert(Insert(sender_id: me, recipient_id: peer, body: text))
            .execute()
    }

    private func purgeServerMessages(with candidateID: String) async {
        guard let peer = UUID(uuidString: candidateID) else { return }

        struct Params: Encodable { let other_user_id: UUID }
        if (try? await client
            .rpc("purge_conversation_with", params: Params(other_user_id: peer))
            .execute()) != nil {
            return
        }

        // Fallback when RPC is not deployed: delete both directions (RLS may only
        // allow the caller's sent rows; received rows need purge_conversation_with).
        guard let me = try? await currentUserID() else { return }
        _ = try? await client
            .from("messages")
            .delete()
            .eq("sender_id", value: me.uuidString)
            .eq("recipient_id", value: peer.uuidString)
            .execute()
        _ = try? await client
            .from("messages")
            .delete()
            .eq("sender_id", value: peer.uuidString)
            .eq("recipient_id", value: me.uuidString)
            .execute()
    }

    private func peerUUID(fromConversationID id: String) -> UUID? {
        if let c = inbox.conversations().first(where: { $0.id == id }) {
            return UUID(uuidString: c.candidateID)
        }
        if id.hasPrefix("conv-") {
            return UUID(uuidString: String(id.dropFirst(5)))
        }
        return nil
    }

    private func currentUserID() async throws -> UUID {
        try await client.auth.session.user.id
    }
}
