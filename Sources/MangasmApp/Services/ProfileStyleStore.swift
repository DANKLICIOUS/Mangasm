import Foundation

public protocol ProfileStyleStore: Sendable {
    func loadPreferred() -> ProfileStyleId?
    func loadSeenUnlockIds() -> Set<ProfileStyleId>
    func savePreferred(_ id: ProfileStyleId?)
    func saveSeenUnlockIds(_ ids: Set<ProfileStyleId>)
}

public final class InMemoryProfileStyleStore: ProfileStyleStore, @unchecked Sendable {
    private var preferred: ProfileStyleId?
    private var seen: Set<ProfileStyleId> = []

    public init() {}

    public func loadPreferred() -> ProfileStyleId? { preferred }
    public func loadSeenUnlockIds() -> Set<ProfileStyleId> { seen }
    public func savePreferred(_ id: ProfileStyleId?) { preferred = id }
    public func saveSeenUnlockIds(_ ids: Set<ProfileStyleId>) { seen = ids }
}

public final class UserDefaultsProfileStyleStore: ProfileStyleStore, @unchecked Sendable {
    private let defaults: UserDefaults
    private let preferredKey = "mangasm.profileStyle.preferred"
    private let seenKey = "mangasm.profileStyle.seen"

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    public func loadPreferred() -> ProfileStyleId? {
        guard let raw = defaults.string(forKey: preferredKey) else { return nil }
        return ProfileStyleId(rawValue: raw)
    }

    public func loadSeenUnlockIds() -> Set<ProfileStyleId> {
        let raw = defaults.stringArray(forKey: seenKey) ?? []
        return Set(raw.compactMap(ProfileStyleId.init(rawValue:)))
    }

    public func savePreferred(_ id: ProfileStyleId?) {
        if let id {
            defaults.set(id.rawValue, forKey: preferredKey)
        } else {
            defaults.removeObject(forKey: preferredKey)
        }
    }

    public func saveSeenUnlockIds(_ ids: Set<ProfileStyleId>) {
        defaults.set(ids.map(\.rawValue).sorted(), forKey: seenKey)
    }
}
