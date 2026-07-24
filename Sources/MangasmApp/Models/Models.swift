import Foundation

// MARK: - RepTier
// Reputation tier thresholds (inferred from prototype display of score 42 = "Veteran")
public enum RepTier: String, CaseIterable, Sendable, Codable {
    case new       // 0–19
    case rising    // 20–39
    case veteran   // 40–69
    case elite     // 70–89
    case legend    // 90–100

    public static func tier(for score: Int) -> RepTier {
        switch score {
        case 0..<20:  return .new
        case 20..<40: return .rising
        case 40..<70: return .veteran
        case 70..<90: return .elite
        default:      return .legend
        }
    }
}

// MARK: - Profile
public struct Profile: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var name: String
    public var age: Int
    public var location: String
    public var headline: String
    public var bio: String
    public var hobbies: [String]
    public var position: String          // "Top" | "Vers" | "Bottom"
    public var into: [String]            // fetishes (M+ only to show)
    public var instagram: String
    public var x: String
    public var astro: String             // western zodiac
    public var chinese: String           // chinese zodiac
    public var lifePath: Int             // numerology life path
    public var repScore: Int
    public var avatarURL: String?        // remote URL string; not fetched at runtime
    public var photos: [String] = []
    public var vouches: Int = 0
    public var aiMatch: Double = 0.0
    public var premium: Bool = false
    public var referralCode: String = ""
    public var referralCount: Int = 0

    public init(
        id: UUID = UUID(),
        name: String,
        age: Int,
        location: String,
        headline: String,
        bio: String,
        hobbies: [String] = [],
        position: String,
        into: [String] = [],
        instagram: String = "",
        x: String = "",
        astro: String,
        chinese: String,
        lifePath: Int,
        repScore: Int = 0,
        avatarURL: String? = nil,
        photos: [String] = [],
        vouches: Int = 0,
        aiMatch: Double = 0.0,
        premium: Bool = false,
        referralCode: String = "",
        referralCount: Int = 0
    ) {
        self.id = id
        self.name = name
        self.age = age
        self.location = location
        self.headline = headline
        self.bio = bio
        self.hobbies = hobbies
        self.position = position
        self.into = into
        self.instagram = instagram
        self.x = x
        self.astro = astro
        self.chinese = chinese
        self.lifePath = lifePath
        self.repScore = repScore
        self.avatarURL = avatarURL
        self.photos = photos
        self.vouches = vouches
        self.aiMatch = aiMatch
        self.premium = premium
        self.referralCode = referralCode
        self.referralCount = referralCount
    }

    /// Bio character limit — 300 free, 600 M+ (matches prototype Settings bio field max)
    public static func bioMax(premium: Bool) -> Int { premium ? 600 : 300 }

    /// Seed from PROFILE_DEFAULT in mangasm-shell.jsx
    public static let sample = Profile(
        name: "Julian",
        age: 32,
        location: "Dubai → London",
        headline: "Slow mornings, fast cars",
        bio: "Jet-set architect of good nights. Sunsets, fast cars & slow mornings. Find me where the signal shouldn't reach. 🛥️🥂",
        hobbies: ["Sailing", "Mixology", "Vintage cars", "House music"],
        position: "Vers",
        into: ["Feet", "Roleplay"],
        instagram: "julianv",
        x: "julian_v",
        astro: "Scorpio",
        chinese: "Dragon",
        lifePath: 7,
        repScore: 42,
        photos: [
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&q=80&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&q=80&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=500&q=80&auto=format&fit=crop"
        ],
        vouches: 1204,
        aiMatch: 98,
        premium: false
    )
}

// MARK: - Visibility
// Mirrors VIS_DEFAULT from mangasm-shell.jsx
public struct Visibility: Hashable, Sendable, Codable {
    public var headline: Bool
    public var hobbies: Bool
    public var position: Bool
    public var into: Bool       // fetishes — hidden by default, M+ required
    public var anthem: Bool
    public var photos: Bool
    public var socials: Bool
    public var instagram: Bool
    public var x: Bool

    public init(
        headline: Bool = true,
        hobbies: Bool = true,
        position: Bool = true,
        into: Bool = false,
        anthem: Bool = true,
        photos: Bool = true,
        socials: Bool = true,
        instagram: Bool = true,
        x: Bool = true
    ) {
        self.headline = headline
        self.hobbies = hobbies
        self.position = position
        self.into = into
        self.anthem = anthem
        self.photos = photos
        self.socials = socials
        self.instagram = instagram
        self.x = x
    }

    /// Fetishes ("into") default to HIDDEN; users opt in explicitly.
    public static let sample = Visibility()
}

// MARK: - CompatNotes
public struct CompatNotes: Hashable, Sendable {
    public var astro: String
    public var numerology: String
    public var chinese: String

    public init(astro: String, numerology: String, chinese: String) {
        self.astro = astro
        self.numerology = numerology
        self.chinese = chinese
    }
}

// MARK: - Candidate
// Seeded from MATCHES in mangasm-match.jsx
public struct Candidate: Identifiable, Hashable, Sendable {
    public let id: String
    public var name: String
    public var age: Int
    public var distanceLabel: String     // e.g. "0.4 km"
    public var matchPct: Int             // 0–100
    public var astro: String
    public var chinese: String
    public var lifePath: Int
    public var position: String
    public var sharedInterests: [String]
    public var hobbies: [String]
    public var bio: String
    public var notes: CompatNotes
    public var avatarURL: String?        // Unsplash URL string
    /// Optional lat/lon for DateNight dual-proximity (≤10 mi of both).
    public var geoCoordinate: GeoCoordinate?

    public init(
        id: String,
        name: String,
        age: Int,
        distanceLabel: String,
        matchPct: Int,
        astro: String,
        chinese: String,
        lifePath: Int,
        position: String,
        sharedInterests: [String],
        hobbies: [String],
        bio: String,
        notes: CompatNotes,
        avatarURL: String? = nil,
        geoCoordinate: GeoCoordinate? = nil
    ) {
        self.id = id
        self.name = name
        self.age = age
        self.distanceLabel = distanceLabel
        self.matchPct = matchPct
        self.astro = astro
        self.chinese = chinese
        self.lifePath = lifePath
        self.position = position
        self.sharedInterests = sharedInterests
        self.hobbies = hobbies
        self.bio = bio
        self.notes = notes
        self.avatarURL = avatarURL
        self.geoCoordinate = geoCoordinate
    }

    public static let sample = samples[0]

    /// Seeded from MATCHES array in mangasm-match.jsx
    /// geoCoordinate: Miami-area anchors so DateNight dual-proximity demos work offline.
    public static let samples: [Candidate] = [
        Candidate(
            id: "m1",
            name: "Marco",
            age: 34,
            distanceLabel: "0.4 km",
            matchPct: 94,
            astro: "Cancer",
            chinese: "Rat",
            lifePath: 5,
            position: "Top",
            sharedInterests: ["House music", "Sailing"],
            hobbies: ["Sailing", "House music", "Vinyl", "Yachts"],
            bio: "Yacht broker by day, vinyl DJ by night. I collect sunrises and rare pressings. Bring an appetite and an open mind.",
            notes: CompatNotes(
                astro: "Water trine — deep & loyal",
                numerology: "Seeker meets free spirit",
                chinese: "Dragon × Rat — a classic power pair"
            ),
            avatarURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&h=240&q=80&auto=format&fit=crop&crop=faces",
            geoCoordinate: GeoCoordinate(latitude: 25.7907, longitude: -80.1300)
        ),
        Candidate(
            id: "m2",
            name: "Theo",
            age: 31,
            distanceLabel: "1.2 km",
            matchPct: 90,
            astro: "Pisces",
            chinese: "Monkey",
            lifePath: 3,
            position: "Vers",
            sharedInterests: ["Mixology", "Vintage cars"],
            hobbies: ["Mixology", "Vintage cars", "Travel"],
            bio: "Mixologist with a vintage Porsche problem. Equal parts mischief and manners.",
            notes: CompatNotes(
                astro: "Water harmony — intuitive",
                numerology: "Creative spark, playful",
                chinese: "Dragon × Monkey — magnetic"
            ),
            avatarURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&h=240&q=80&auto=format&fit=crop&crop=faces",
            geoCoordinate: GeoCoordinate(latitude: 25.786, longitude: -80.14)
        ),
        Candidate(
            id: "m3",
            name: "Rafa",
            age: 36,
            distanceLabel: "2.0 km",
            matchPct: 87,
            astro: "Cancer",
            chinese: "Monkey",
            lifePath: 9,
            position: "Bottom",
            sharedInterests: ["Sailing", "House music"],
            hobbies: ["Sailing", "Architecture", "House music"],
            bio: "Architect, sailor, hopeless romantic. I build things that last — let us see if we do.",
            notes: CompatNotes(
                astro: "Emotional depth",
                numerology: "Old soul meets idealist",
                chinese: "Dragon × Monkey — magnetic"
            ),
            avatarURL: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&h=240&q=80&auto=format&fit=crop&crop=faces",
            geoCoordinate: GeoCoordinate(latitude: 25.775, longitude: -80.19)
        ),
        Candidate(
            id: "m4",
            name: "Sven",
            age: 33,
            distanceLabel: "3.1 km",
            matchPct: 83,
            astro: "Scorpio",
            chinese: "Rat",
            lifePath: 7,
            position: "Top",
            sharedInterests: ["Vintage cars"],
            hobbies: ["Vintage cars", "Cigars", "Golf"],
            bio: "Old-money taste, new-school energy. Cars, cigars, and quiet luxury.",
            notes: CompatNotes(
                astro: "Twin intensity — electric",
                numerology: "Mirror life paths",
                chinese: "Dragon × Rat — power pair"
            ),
            avatarURL: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=240&h=240&q=80&auto=format&fit=crop&crop=faces",
            geoCoordinate: GeoCoordinate(latitude: 25.77, longitude: -80.20)
        ),
        Candidate(
            id: "m5",
            name: "Kai",
            age: 29,
            distanceLabel: "4.6 km",
            matchPct: 79,
            astro: "Virgo",
            chinese: "Rooster",
            lifePath: 4,
            position: "Vers",
            sharedInterests: ["Mixology"],
            hobbies: ["Mixology", "Philosophy", "Surf"],
            bio: "Bartender-philosopher. I make a negroni that will change your evening.",
            notes: CompatNotes(
                astro: "Earth grounds water",
                numerology: "Builder energy",
                chinese: "Dragon × Rooster — bold duo"
            ),
            avatarURL: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=240&h=240&q=80&auto=format&fit=crop&crop=faces",
            geoCoordinate: GeoCoordinate(latitude: 25.80, longitude: -80.13)
        ),
    ]
}

// MARK: - Message
// Seeded from ChatScreen initial msgs in mangasm-chat.jsx
public struct Message: Identifiable, Hashable, Sendable {
    public let id: String
    public var senderIsMe: Bool
    public var text: String
    public var timestamp: Date

    public init(id: String, senderIsMe: Bool, text: String, timestamp: Date = Date()) {
        self.id = id
        self.senderIsMe = senderIsMe
        self.text = text
        self.timestamp = timestamp
    }
}

// MARK: - Conversation
// One per match; messages from mangasm-chat.jsx ChatScreen initial state
public struct Conversation: Identifiable, Hashable, Sendable {
    public let id: String
    public var candidateID: String
    public var candidateName: String
    public var candidateAvatarURL: String?
    public var messages: [Message]
    public var unreadCount: Int
    public var lastMessagePreview: String { messages.last?.text ?? "" }

    public init(
        id: String,
        candidateID: String,
        candidateName: String,
        candidateAvatarURL: String? = nil,
        messages: [Message] = [],
        unreadCount: Int = 0
    ) {
        self.id = id
        self.candidateID = candidateID
        self.candidateName = candidateName
        self.candidateAvatarURL = candidateAvatarURL
        self.messages = messages
        self.unreadCount = unreadCount
    }

    public static let sample = samples[0]

    /// Four sample conversations — initial 3 messages from mangasm-chat.jsx,
    /// additional conversations inferred from the MATCHES list.
    public static let samples: [Conversation] = [
        Conversation(
            id: "conv-m1",
            candidateID: "m1",
            candidateName: "Marco",
            candidateAvatarURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&q=80&auto=format&fit=crop&crop=faces",
            messages: [
                Message(id: "msg-1", senderIsMe: false, text: "Hey — the stars said 94%. Bold of them 😏"),
                Message(id: "msg-2", senderIsMe: true,  text: "They don't lie. Dubai this weekend?"),
                Message(id: "msg-3", senderIsMe: false, text: "That hot-air balloon date looked unreal 🎈"),
            ],
            unreadCount: 2
        ),
        Conversation(
            id: "conv-m2",
            candidateID: "m2",
            candidateName: "Theo",
            candidateAvatarURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&q=80&auto=format&fit=crop&crop=faces",
            messages: [
                Message(id: "msg-4", senderIsMe: false, text: "Okay you have my attention."),
                Message(id: "msg-5", senderIsMe: true,  text: "Pick the time — I'll bring the wine 🍷"),
            ]
        ),
        Conversation(
            id: "conv-m3",
            candidateID: "m3",
            candidateName: "Rafa",
            candidateAvatarURL: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&q=80&auto=format&fit=crop&crop=faces",
            messages: [
                Message(id: "msg-6", senderIsMe: true,  text: "RSVP me. I'm serious."),
                Message(id: "msg-7", senderIsMe: false, text: "You're trouble. I like it."),
            ]
        ),
        Conversation(
            id: "conv-m4",
            candidateID: "m4",
            candidateName: "Sven",
            candidateAvatarURL: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&q=80&auto=format&fit=crop&crop=faces",
            messages: [
                Message(id: "msg-8", senderIsMe: false, text: "Cigars and vintage cars — sounds like a plan?"),
            ],
            unreadCount: 1
        ),
    ]
}

// MARK: - Venue
// Seeded from VENUES in mangasm-match.jsx
public struct Venue: Identifiable, Hashable, Sendable {
    public let id: String
    public var kind: String             // "Dinner", "Sunrise", etc.
    public var name: String
    public var subtitle: String         // day/time descriptor
    public var iconPath: String         // SVG path string (for rendering)

    public init(id: String, kind: String, name: String, subtitle: String, iconPath: String) {
        self.id = id
        self.kind = kind
        self.name = name
        self.subtitle = subtitle
        self.iconPath = iconPath
    }

    public static let sample = samples[0]

    /// Seeded from VENUES in mangasm-match.jsx
    public static let samples: [Venue] = [
        Venue(
            id: "v1",
            kind: "Dinner",
            name: "Ossiano · Atlantis",
            subtitle: "Underwater fine dining · Sat 8:30 PM",
            iconPath: "M6 3v7a3 3 0 0 0 6 0V3M9 3v18M18 3c-1.5 1-2 3-2 6s.5 4 2 5v7"
        ),
        Venue(
            id: "v2",
            kind: "Sunrise",
            name: "Hot-Air Balloon · Al Ain",
            subtitle: "Private flight for two · Sun 5:15 AM",
            iconPath: "M12 2a7 7 0 0 1 7 7c0 4-3 6.5-5 8h-4c-2-1.5-5-4-5-8a7 7 0 0 1 7-7zM9.5 17h5l-.6 4h-3.8z"
        ),
    ]
}

// MARK: - EventType
// Typed enum; App-Store-safe raw values (open_door/social_mixer/circle/cosplay).
// rawValue matches prototype ids for Codable round-trip and filter comparisons.
public enum EventType: String, CaseIterable, Sendable, Codable, Identifiable {
    case openDoor    = "open_door"
    case socialMixer = "social_mixer"
    case circle      = "circle"
    case cosplay     = "cosplay"

    public var id: String { rawValue }

    // App-Store-safe labels (Guideline 1.1.4) — concept preserved, strings clean.
    public var label: String {
        switch self {
        case .openDoor:    return "Open Door"
        case .socialMixer: return "Social Mixer"
        case .circle:      return "Circle"
        case .cosplay:     return "Cosplay / Roleplay"
        }
    }
}

// MARK: - EventItem
// Seeded from SEED_EVENTS in mangasm-events.jsx
public struct EventItem: Identifiable, Hashable, Sendable {
    public let id: String
    public var type: EventType
    public var title: String
    public var hostName: String
    public var hostRep: Int
    public var avatarURL: String?       // Unsplash URL string
    public var when: String
    public var place: String
    public var area: String
    public var description: String
    public var going: Int
    public var capacity: Int
    public var privacy: String          // "approval" | "public"

    public init(
        id: String,
        type: EventType,
        title: String,
        hostName: String,
        hostRep: Int,
        avatarURL: String? = nil,
        when: String,
        place: String,
        area: String,
        description: String,
        going: Int,
        capacity: Int,
        privacy: String
    ) {
        self.id = id
        self.type = type
        self.title = title
        self.hostName = hostName
        self.hostRep = hostRep
        self.avatarURL = avatarURL
        self.when = when
        self.place = place
        self.area = area
        self.description = description
        self.going = going
        self.capacity = capacity
        self.privacy = privacy
    }

    public static let sample = samples[0]

    /// Seeded from SEED_EVENTS in mangasm-events.jsx
    public static let samples: [EventItem] = [
        EventItem(
            id: "e1",
            type: .circle,
            title: "Sunset Circle",
            hostName: "Marco",
            hostRep: 88,
            avatarURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&q=80&auto=format&fit=crop&crop=faces",
            when: "Tonight · 10:30 PM",
            place: "Marina Penthouse",
            area: "Dubai Marina",
            description: "Rooftop lounge, house sets, skyline views. Hosted, members-only, verified guests.",
            going: 9,
            capacity: 12,
            privacy: "approval"
        ),
        EventItem(
            id: "e2",
            type: .cosplay,
            title: "Latex & Leather Night",
            hostName: "Sven",
            hostRep: 74,
            avatarURL: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&q=80&auto=format&fit=crop&crop=faces",
            when: "Sat · 11:00 PM",
            place: "Private villa",
            area: "Palm Jumeirah",
            description: "Statement-style night — bold looks encouraged. Hosted, dress to impress, members verified.",
            going: 18,
            capacity: 30,
            privacy: "public"
        ),
        EventItem(
            id: "e3",
            type: .openDoor,
            title: "Open House",
            hostName: "Rafa",
            hostRep: 81,
            avatarURL: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&q=80&auto=format&fit=crop&crop=faces",
            when: "Fri · 9:00 PM",
            place: "Studio loft",
            area: "JBR",
            description: "Hosted open house with welcome drinks. ID-verified entry, hosts on site.",
            going: 6,
            capacity: 10,
            privacy: "approval"
        ),
        EventItem(
            id: "e4",
            type: .socialMixer,
            title: "Lunch Express",
            hostName: "Theo",
            hostRep: 69,
            avatarURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&q=80&auto=format&fit=crop&crop=faces",
            when: "Today · 1:00 PM",
            place: "Business Bay tower",
            area: "Business Bay",
            description: "Midday professionals' mixer over coffee. Book a slot, verified members, intros hosted.",
            going: 4,
            capacity: 8,
            privacy: "public"
        ),
    ]
}

// MARK: - Community
// Seeded from COMMS in mangasm-events.jsx
public struct Community: Identifiable, Hashable, Sendable {
    public let id: String
    public var name: String
    public var tagline: String
    public var memberCount: String      // e.g. "4.2k"
    public var monogram: String         // two-letter badge

    public init(id: String, name: String, tagline: String, memberCount: String, monogram: String) {
        self.id = id
        self.name = name
        self.tagline = tagline
        self.memberCount = memberCount
        self.monogram = monogram
    }

    public static let sample = samples[0]

    /// Seeded from COMMS in mangasm-events.jsx
    public static let samples: [Community] = [
        Community(id: "c1", name: "Pride Marina",          tagline: "Social · Allies welcome",  memberCount: "4.2k", monogram: "PM"),
        Community(id: "c2", name: "Bears & Cubs UAE",      tagline: "Body positive",             memberCount: "2.8k", monogram: "BC"),
        Community(id: "c3", name: "Leather & Fetish",      tagline: "Kink · Gear",               memberCount: "1.9k", monogram: "LF"),
        Community(id: "c4", name: "Trans+ & Allies",       tagline: "Support · Safe space",      memberCount: "1.1k", monogram: "TA"),
        Community(id: "c5", name: "Black Rock Brotherhood", tagline: "Playa · radical inclusion",  memberCount: "3.5k", monogram: "BR"),
        Community(id: "c6", name: "House & After-Hours",   tagline: "Music · Nightlife",         memberCount: "5.6k", monogram: "HA"),
    ]
}
