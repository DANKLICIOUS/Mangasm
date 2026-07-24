import SwiftUI

/// DateNight place card: restaurant / event / festival with deep-link booking.
struct DateNightPlaceCard: View {
    let place: DateNightPlace
    let matchName: String
    let onMessage: () -> Void

    @Environment(\.openURL) private var openURL
    @State private var cardState: CardState = .idle

    private enum CardState {
        case idle
        case proposed
        case declined
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
            RoundedRectangle(cornerRadius: 16)
                .stroke(MGColor.gold.opacity(0.20), lineWidth: 1)

            VStack(spacing: 0) {
                HStack(alignment: .center, spacing: 11) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 11)
                            .fill(MGColor.gold.opacity(0.12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 11)
                                    .stroke(MGColor.gold.opacity(0.44), lineWidth: 1)
                            )
                            .frame(width: 38, height: 38)
                        Image(systemName: place.category.systemImage)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 18, height: 18)
                            .foregroundStyle(MGColor.gold)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(place.category.label.uppercased()) · DATE FOR 2")
                            .font(MGFont.mono(7))
                            .tracking(7 * 0.16)
                            .foregroundStyle(MGColor.gold)
                        Text(place.name)
                            .font(MGFont.serif(15, .bold))
                            .foregroundStyle(MGColor.ink)
                            .lineLimit(1)
                        Text(place.subtitle)
                            .font(MGFont.sans(9.5, .light))
                            .foregroundStyle(MGColor.inkSoft)
                            .lineLimit(2)
                    }

                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 12)
                .padding(.top, 11)
                .padding(.bottom, cardState == .idle ? 0 : 11)

                switch cardState {
                case .idle:
                    HStack(spacing: 7) {
                        Button {
                            cardState = .proposed
                            openURL(place.bookingURL)
                        } label: {
                            Text(bookLabel)
                                .font(MGFont.serif(12, .bold))
                                .tracking(12 * 0.06)
                                .foregroundStyle(MGColor.goldText)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(MGGradient.goldButton, in: RoundedRectangle(cornerRadius: 10))
                                .shadow(color: MGColor.gold.opacity(0.7), radius: 7, x: 0, y: 4)
                        }
                        .buttonStyle(.plain)

                        Button(action: onMessage) {
                            Text("Message")
                                .font(MGFont.sans(10, .semibold))
                                .foregroundStyle(MGColor.ink)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 12)
                                .glassBackground(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(MGColor.ink.opacity(0.16), lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)

                        Button {
                            cardState = .declined
                        } label: {
                            Text("Skip")
                                .font(MGFont.sans(10, .semibold))
                                .foregroundStyle(MGColor.inkSoft)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 10)
                                .glassBackground(10)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 12)
                    .padding(.top, 10)
                    .padding(.bottom, 12)

                case .proposed:
                    Text("Opened \(place.provider) for you & \(matchName). Complete the table or tickets there — party of 2, within 10 mi of both.")
                        .font(MGFont.sans(10, .light))
                        .foregroundStyle(MGColor.inkSoft)
                        .padding(.horizontal, 12)
                        .padding(.bottom, 12)
                        .frame(maxWidth: .infinity, alignment: .leading)

                case .declined:
                    Text("Skipped — pick another date night nearby.")
                        .font(MGFont.sans(10, .light))
                        .foregroundStyle(MGColor.inkSoft)
                        .padding(.horizontal, 12)
                        .padding(.bottom, 12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if place.provider == "yelp" || place.id.hasPrefix("yelp:") {
                    YelpReviewsStrip(placeID: place.id)
                        .padding(.horizontal, 12)
                        .padding(.bottom, 12)
                }
            }
        }
        .fixedSize(horizontal: false, vertical: true)
    }

    private var bookLabel: String {
        switch place.category {
        case .restaurant: return "Book table"
        case .event, .festival: return "Get tickets"
        }
    }
}

// MARK: - Yelp reviews (up to 3)

/// Loads GET /v3/businesses/{id}/reviews when a Yelp key is configured.
private struct YelpReviewsStrip: View {
    let placeID: String

    @State private var reviews: [YelpReview] = []
    @State private var total: Int = 0
    @State private var status: LoadStatus = .idle
    @State private var expanded = false

    private enum LoadStatus: Equatable {
        case idle, loading, loaded, unavailable, failed(String)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button {
                expanded.toggle()
                if expanded, status == .idle || status == .failed("") {
                    Task { await load() }
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "star.bubble")
                        .font(.system(size: 11, weight: .semibold))
                    Text(headerTitle)
                        .font(MGFont.sans(10, .semibold))
                    Spacer(minLength: 0)
                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 10, weight: .semibold))
                }
                .foregroundStyle(MGColor.gold)
            }
            .buttonStyle(.plain)

            if expanded {
                switch status {
                case .idle, .loading:
                    ProgressView()
                        .tint(MGColor.gold)
                        .scaleEffect(0.8)
                case .unavailable:
                    Text("Add YELP_API_KEY to load up to 3 Yelp reviews.")
                        .font(MGFont.sans(9.5, .light))
                        .foregroundStyle(MGColor.inkSoft)
                case .failed(let message):
                    Text(message)
                        .font(MGFont.sans(9.5, .light))
                        .foregroundStyle(MGColor.inkSoft)
                case .loaded:
                    ForEach(reviews) { review in
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 4) {
                                Text(String(repeating: "★", count: max(0, min(5, review.rating))))
                                    .font(MGFont.mono(9))
                                    .foregroundStyle(MGColor.gold)
                                Text(review.userName)
                                    .font(MGFont.sans(9, .semibold))
                                    .foregroundStyle(MGColor.ink)
                                Spacer(minLength: 0)
                                if let reviewURL = review.url {
                                    Link(destination: reviewURL) {
                                        Image(systemName: "arrow.up.right.square")
                                            .font(.system(size: 10, weight: .semibold))
                                            .foregroundStyle(MGColor.gold.opacity(0.85))
                                    }
                                }
                            }
                            Text(review.text)
                                .font(MGFont.sans(9.5, .light))
                                .foregroundStyle(MGColor.inkSoft)
                                .lineLimit(4)
                        }
                        .padding(.vertical, 2)
                    }
                    if total > reviews.count {
                        Text("Showing \(reviews.count) of \(total) on Yelp")
                            .font(MGFont.mono(8))
                            .foregroundStyle(MGColor.inkSoft.opacity(0.8))
                    }
                }
            }
        }
    }

    private var headerTitle: String {
        switch status {
        case .loaded where !reviews.isEmpty:
            return "Yelp reviews (\(reviews.count))"
        default:
            return "Yelp reviews (up to 3)"
        }
    }

    @MainActor
    private func load() async {
        guard let config = DateNightConfig.fromInfoPlist(),
              DateNightConfig.isUsableKey(config.yelpAPIKey) else {
            status = .unavailable
            return
        }
        status = .loading
        do {
            let client = YelpFusionClient(apiKey: config.yelpAPIKey)
            let result = try await client.reviews(forPlaceID: placeID)
            reviews = result.reviews
            total = result.total
            status = .loaded
        } catch {
            status = .failed(error.localizedDescription)
        }
    }
}
