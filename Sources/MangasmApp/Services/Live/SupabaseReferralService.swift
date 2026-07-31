import Foundation
import Supabase

public enum ReferralError: LocalizedError, Sendable {
    case notAuthenticated
    case invalidCode
    case alreadyReferred
    case server(String)

    public var errorDescription: String? {
        switch self {
        case .notAuthenticated: return "Sign in to apply a referral code."
        case .invalidCode:      return "That referral code isn't on the team."
        case .alreadyReferred:  return "You've already joined with a referral."
        case .server(let msg):  return msg
        }
    }
}

public struct ReferralRedeemResult: Sendable, Decodable {
    public let ok: Bool?
    public let code: String?
    public let reward: Reward?

    public struct Reward: Sendable, Decodable {
        public let granted: Bool?
        public let monthsGranted: Int?
        public let completedReferrals: Int?

        enum CodingKeys: String, CodingKey {
            case granted
            case monthsGranted = "months_granted"
            case completedReferrals = "completed_referrals"
        }
    }
}

@MainActor
public final class SupabaseReferralService: ReferralService {
    private let client: SupabaseClient
    private let projectURL: URL
    private let publishableKey: String

    public init(client: SupabaseClient, projectURL: URL, publishableKey: String) {
        self.client = client
        self.projectURL = projectURL
        self.publishableKey = publishableKey
    }

    public func redeem(code raw: String) async throws -> ReferralRedeemResult {
        guard let code = ReferralCode.normalize(raw) else { throw ReferralError.invalidCode }

        let accessToken: String
        do {
            accessToken = try await client.auth.session.accessToken
        } catch {
            throw ReferralError.notAuthenticated
        }

        // The edge function derives the referred user from the verified JWT
        // (auth: 'user'), so only the code travels in the body.
        let url = projectURL.appending(path: "functions/v1/validate-referral")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(RedeemBody(referrer_code: code))

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw ReferralError.server("Referral request failed")
        }

        if http.statusCode == 404 {
            throw ReferralError.invalidCode
        }
        if http.statusCode == 409 {
            throw ReferralError.alreadyReferred
        }
        guard (200...299).contains(http.statusCode) else {
            let msg = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error ?? "Referral failed"
            throw ReferralError.server(msg)
        }

        return try JSONDecoder().decode(ReferralRedeemResult.self, from: data)
    }

    private struct RedeemBody: Encodable {
        let referrer_code: String
    }

    private struct ErrorBody: Decodable {
        let error: String?
    }
}