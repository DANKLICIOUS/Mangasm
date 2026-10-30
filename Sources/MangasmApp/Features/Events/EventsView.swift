import SwiftUI
import StoreKit

// MARK: - EventsView
// Spec §5.7 — Events sub-tab: section label + count, host CTA (locked/premium),
// event-type filter bar (All + 4 types), list of EventCards filtered by type.
// Prototype: mangasm-events.jsx EventsView + HostCTA.
// premium: Bool passed in from DiscoverScreen (state.premium). Upgrade CTA sets
// state.premium = true via @EnvironmentObject so it propagates back.

struct EventsView: View {
    let premium: Bool

    @EnvironmentObject var env: AppEnvironment
    @EnvironmentObject var state: AppState
    @EnvironmentObject var store: StoreKitStore

    @State private var hosting: Bool = false
    @State private var filter: EventType? = nil  // nil = "All"

    private var allEvents: [EventItem] {
        env.events.events()
    }

    private var filteredEvents: [EventItem] {
        guard let filter else { return allEvents }
        return allEvents.filter { $0.type == filter }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Section header
            HStack(alignment: .firstTextBaseline) {
                SectionLabel("EVENTS NEAR YOU")
                Spacer()
                Text("\(allEvents.count) live")
                    .font(MGFont.mono(8))
                    .foregroundStyle(MGColor.inkFaint)
            }

            // Host CTA or form
            if hosting {
                HostEventForm(
                    onPublish: {
                        // onPublish — close form (event not appended: no Binding on list)
                        hosting = false
                    },
                    onCancel: { hosting = false }
                )
                .padding(.bottom, 16)
            } else {
                if premium {
                    // Premium: "Host an Event" button
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) { hosting = true }
                    } label: {
                        HStack(spacing: 9) {
                            Image(systemName: "plus")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundStyle(MGColor.goldDeep)
                            Text("Host an Event")
                                .font(MGFont.serif(15.5, .bold))
                                .tracking(15.5 * 0.05)
                                .foregroundStyle(MGGradient.goldHeading)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .glassBackground(15, glow: true)
                        .shadow(color: MGColor.gold.opacity(0.6), radius: 10, x: 0, y: 0)
                    }
                    .buttonStyle(.plain)
                    .padding(.bottom, 16)
                } else {
                    // Locked: upsell card — triggers real StoreKit purchase
                    HostUpsellCard(store: store)
                        .padding(.bottom, 16)
                }
            }

            // Type filter bar (horizontal scroll)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    // "All" chip
                    FilterChip(label: "All", isSelected: filter == nil, icon: nil) {
                        filter = nil
                    }

                    // Per-type chips
                    ForEach(EventType.allCases) { eType in
                        FilterChip(
                            label: eType.label,
                            isSelected: filter == eType,
                            icon: eType
                        ) {
                            filter = eType
                        }
                    }
                }
                .padding(.bottom, 4)
            }
            .padding(.bottom, 12)

            // Event cards
            VStack(spacing: 12) {
                ForEach(filteredEvents) { event in
                    EventCard(event: event)
                }
                if filteredEvents.isEmpty {
                    let label = filter?.label ?? "event"
                    Text("No \(label) events yet — be the first to host.")
                        .font(MGFont.mono(9))
                        .foregroundStyle(MGColor.inkFaint)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 24)
                        .frame(maxWidth: .infinity)
                }
            }
        }
    }
}

// MARK: - FilterChip
// Event-type filter pill for the horizontal filter bar.
private struct FilterChip: View {
    let label: String
    let isSelected: Bool
    let icon: EventType?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let icon {
                    EventTypeIcon(
                        type: icon,
                        size: 13,
                        color: isSelected ? MGColor.goldText : MGColor.inkSoft
                    )
                }
                Text(label)
                    .font(MGFont.sans(9.5, .bold))
                    .foregroundStyle(
                        isSelected
                            ? AnyShapeStyle(MGColor.goldText)
                            : AnyShapeStyle(MGColor.inkSoft)
                    )
                    .lineLimit(1)
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 11)
            .background {
                if isSelected {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(MGGradient.goldButton)
                } else {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color(red: 40/255, green: 33/255, blue: 23/255).opacity(0.06))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color(red: 40/255, green: 33/255, blue: 23/255).opacity(0.14), lineWidth: 1)
                        )
                }
            }
        }
        .buttonStyle(.plain)
        .fixedSize()
    }
}

// MARK: - HostUpsellCard
// Shown to free users. Tapping "Unlock M+" triggers a real StoreKit 2 purchase
// for the monthly M+ subscription ($9.99/mo). Price is read from the live
// Product when available; falls back to "$9.99/mo". A secondary affordance offers
// the 3-month billing length ($24.99).
private struct HostUpsellCard: View {
    @ObservedObject var store: StoreKitStore
    @State private var isPurchasing: Bool = false
    @State private var purchaseError: String? = nil

    /// The M+ monthly product, if loaded.
    private var premiumProduct: Product? {
        store.products.first { $0.id == MangasmProduct.monthly.rawValue }
    }

    /// The M+ 3-month product, if loaded.
    private var quarterlyProduct: Product? {
        store.products.first { $0.id == MangasmProduct.quarterly.rawValue }
    }

    /// Display price for M+: live from App Store or static fallback.
    private var premiumPrice: String {
        premiumProduct.map { "\($0.displayPrice)/mo" } ?? "$9.99/mo"
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 18)
                .fill(MGGradient.holo)
                .shadow(
                    color: Color(red: 40/255, green: 30/255, blue: 15/255).opacity(0.55),
                    radius: 20, x: 0, y: 16
                )

            VStack(spacing: 0) {
                // Lock icon tile
                ZStack {
                    RoundedRectangle(cornerRadius: 13)
                        .fill(MGColor.gold.opacity(0.14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 13)
                                .stroke(MGColor.gold.opacity(0.33), lineWidth: 1)
                        )
                    Image(systemName: "lock.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(MGColor.goldDeep)
                }
                .frame(width: 42, height: 42)

                Text("Hosting is an M+ feature")
                    .font(MGFont.serif(18, .bold))
                    .foregroundStyle(MGColor.ink)
                    .padding(.top, 9)

                Text("Create Open Door, Social Mixer, Circle or Costume events with private RSVPs, capacity & approval controls.")
                    .font(MGFont.sans(10.5, .light))
                    .foregroundStyle(MGColor.inkSoft)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.top, 6)
                    .frame(maxWidth: 260)

                // M+ purchase button
                Button {
                    guard !isPurchasing else { return }
                    guard let product = premiumProduct else {
                        purchaseError = "Store unavailable. Try again."
                        return
                    }
                    isPurchasing = true
                    purchaseError = nil
                    Task {
                        do {
                            _ = try await store.purchase(product)
                        } catch {
                            purchaseError = "Purchase failed. Please try again."
                            print("[HostUpsellCard] purchase error: \(error)")
                        }
                        isPurchasing = false
                    }
                } label: {
                    Group {
                        if isPurchasing {
                            Text("Processing…")
                        } else {
                            Text("Unlock M+ \u{00B7} \(premiumPrice)")
                        }
                    }
                    .font(MGFont.serif(14.5, .bold))
                    .tracking(14.5 * 0.04)
                    .foregroundStyle(MGColor.goldText)
                    .padding(.vertical, 11)
                    .padding(.horizontal, 22)
                    .background(
                        RoundedRectangle(cornerRadius: 13)
                            .fill(MGGradient.goldButton)
                            .shadow(color: MGColor.gold.opacity(0.8), radius: 8, x: 0, y: 6)
                    )
                }
                .buttonStyle(.plain)
                .disabled(isPurchasing)
                .padding(.top, 13)

                // 3-month billing option (same M+ tier, longer commitment)
                if let plusProduct = quarterlyProduct {
                    Button {
                        guard !isPurchasing else { return }
                        isPurchasing = true
                        purchaseError = nil
                        Task {
                            do {
                                _ = try await store.purchase(plusProduct)
                            } catch {
                                purchaseError = "Purchase failed. Please try again."
                                print("[HostUpsellCard] purchase error: \(error)")
                            }
                            isPurchasing = false
                        }
                    } label: {
                        Text("Or get 3 months \u{00B7} \(plusProduct.displayPrice)")
                            .font(MGFont.mono(8.5))
                            .foregroundStyle(MGColor.goldDeep)
                    }
                    .buttonStyle(.plain)
                    .disabled(isPurchasing)
                    .padding(.top, 6)
                }

                if let err = purchaseError {
                    Text(err)
                        .font(MGFont.mono(7.5))
                        .foregroundStyle(Color(red: 192/255, green: 57/255, blue: 43/255))
                        .padding(.top, 6)
                }

                Text("Cancel anytime \u{00B7} also unlocks extended bio & fetishes")
                    .font(MGFont.mono(7.5))
                    .foregroundStyle(MGColor.inkFaint)
                    .padding(.top, 8)
            }
            .padding(.horizontal, 15)
            .padding(.vertical, 15)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .clipShape(RoundedRectangle(cornerRadius: 17))
            .glassBackground(17)
            .padding(1)
        }
    }
}
