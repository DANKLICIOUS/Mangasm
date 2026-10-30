import SwiftUI

public extension Color {
    init(hex: String) {
        let s = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        var v: UInt64 = 0
        Scanner(string: s).scanHexInt64(&v)
        let r, g, b, a: Double
        if s.count == 8 {
            r = Double((v >> 24) & 0xFF) / 255; g = Double((v >> 16) & 0xFF) / 255
            b = Double((v >> 8) & 0xFF) / 255;  a = Double(v & 0xFF) / 255
        } else {
            r = Double((v >> 16) & 0xFF) / 255; g = Double((v >> 8) & 0xFF) / 255
            b = Double(v & 0xFF) / 255;         a = 1
        }
        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

public enum MGColor {
    public static let gold = Color(hex: "#C9A84C")
    public static let goldDeep = Color(hex: "#9A7B2C")
    public static let goldBright = Color(hex: "#E4C97E")
    public static let ink = Color(hex: "#2A2117")
    public static let goldText = Color(hex: "#2A1D05")
    public static let inkSoft = Color(red: 42/255, green: 33/255, blue: 23/255, opacity: 0.70)
    public static let inkFaint = Color(red: 42/255, green: 33/255, blue: 23/255, opacity: 0.50)
    public static let spotify = Color(hex: "#138A3E")
    public static let launchOrange = Color(hex: "#F08A38")
    public static let launchOrangeDeep = Color(hex: "#C95E1E")
    public static let skylineInk = Color(hex: "#120A14")
    /// Inkhouse chrome (Guideline 4.3 significant-change identity).
    public static let parlorInk = Color(hex: "#100808")
    public static let brass = Color(hex: "#C4A36A")
    public static let brassDeep = Color(hex: "#8A7044")
    public static let oxblood = Color(hex: "#6B1D2A")
    public static let parchment = Color(hex: "#F3E6C8")
    /// Kept as aliases so older jungle call sites compile; values match parlor.
    public static let jungleInk = parlorInk
    public static let jungleCanopy = Color(hex: "#3A1A14")
    public static let jungleMist = brass
    public static let boneIvory = parchment
    public static let campfire = oxblood
}

public enum MGFont {
    // Custom fonts fall back to system if not registered.
    // `scale` trims the DEFAULT baseline (the UI read too large); Dynamic Type
    // still scales relative to this baseline via `relativeTo:`, so the app also
    // adapts to the user's text-size preference.
    static let scale: CGFloat = 0.97

    public static func serif(_ size: CGFloat, _ w: Font.Weight = .bold) -> Font {
        .custom("CormorantGaramond-Bold", size: size * scale, relativeTo: .title2).weight(w)
    }
    public static func sans(_ size: CGFloat, _ w: Font.Weight = .semibold) -> Font {
        .custom("Mulish", size: size * scale, relativeTo: .body).weight(w)
    }
    public static func mono(_ size: CGFloat, _ w: Font.Weight = .regular) -> Font {
        .custom("SpaceMono-Regular", size: size * scale, relativeTo: .caption).weight(w)
    }
}

public enum MGGradient {
    public static let holo = LinearGradient(
        colors: [Color(hex: "#787C8C"), Color(hex: "#FFFFFF"), Color(hex: "#96B2D2"), MGColor.gold],
        startPoint: .topLeading, endPoint: .bottomTrailing)
    public static let goldButton = LinearGradient(
        colors: [MGColor.goldBright, MGColor.goldDeep],
        startPoint: .topLeading, endPoint: .bottomTrailing)
    public static let launchCTA = LinearGradient(
        colors: [MGColor.oxblood, Color(hex: "#4A121C")],
        startPoint: .topLeading, endPoint: .bottomTrailing)
    public static let brassHeading = LinearGradient(
        stops: [.init(color: MGColor.brass, location: 0),
                .init(color: Color(hex: "#A88850"), location: 0.48),
                .init(color: MGColor.brassDeep, location: 1)],
        startPoint: .top, endPoint: .bottom)
    /// Gold gradient for TEXT (wordmarks, section labels, ring centers): 3-stop
    /// vertical bright→gold@48%→deep, matching the prototype's `goldText`.
    /// (Not to be confused with `MGColor.goldText`, the dark ink used ON gold.)
    public static let goldHeading = LinearGradient(
        stops: [.init(color: MGColor.goldBright, location: 0),
                .init(color: MGColor.gold, location: 0.48),
                .init(color: MGColor.goldDeep, location: 1)],
        startPoint: .top, endPoint: .bottom)
}
