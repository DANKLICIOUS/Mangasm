import SwiftUI

// MARK: - HostEventForm
// Spec §5.7 — M+ host form: type picker (2-col grid), fields with char counters,
// visibility picker, consent note (green), publish button enabled only when required fields valid.
// Required fields: title, description, when, place. cap and area are optional.
// Prototype: mangasm-events.jsx HostForm.
// Contract: onPublish() → () called when valid form is submitted. No EventItem returned.

struct HostEventForm: View {
    let onPublish: () -> Void
    var onCancel: (() -> Void)? = nil

    @State private var eventType: EventType = .circle
    @State private var title: String = ""
    @State private var description: String = ""
    @State private var when: String = ""
    @State private var capacity: String = "12"
    @State private var place: String = ""
    @State private var area: String = ""
    @State private var privacy: HostPrivacy = .approval

    enum HostPrivacy: String, CaseIterable {
        case approval = "approval"
        case open = "public"

        var label: String {
            switch self {
            case .approval: return "Approval required"
            case .open:     return "Open"
            }
        }

        var subtitle: String {
            switch self {
            case .approval: return "Address hidden until you approve"
            case .open:     return "Anyone can RSVP"
            }
        }
    }

    // Pure validation function — easily unit-testable
    static func isValid(title: String, description: String, when: String, place: String) -> Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
            && !description.trimmingCharacters(in: .whitespaces).isEmpty
            && !when.trimmingCharacters(in: .whitespaces).isEmpty
            && !place.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private var ready: Bool {
        Self.isValid(title: title, description: description, when: when, place: place)
    }

    var body: some View {
        // Holo border wrapper
        ZStack {
            RoundedRectangle(cornerRadius: 20)
                .fill(MGGradient.holo)
                .shadow(
                    color: Color(red: 40/255, green: 30/255, blue: 15/255).opacity(0.6),
                    radius: 27, x: 0, y: 22
                )

            VStack(alignment: .leading, spacing: 0) {
                // Header: "Host an Event" + M+ badge + optional × close
                HStack(spacing: 7) {
                    Text("Host an Event")
                        .font(MGFont.serif(18, .bold))
                        .foregroundStyle(MGGradient.goldHeading)
                        .shadow(color: MGColor.gold.opacity(0.30), radius: 5, x: 0, y: 1)

                    Text("M+")
                        .font(MGFont.mono(7))
                        .tracking(7 * 0.08)
                        .foregroundStyle(MGColor.goldDeep)
                        .padding(.vertical, 2)
                        .padding(.horizontal, 6)
                        .background(
                            RoundedRectangle(cornerRadius: 6)
                                .fill(MGColor.gold.opacity(0.13))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(MGColor.gold.opacity(0.4), lineWidth: 1)
                                )
                        )

                    Spacer()

                    if onCancel != nil {
                        Button {
                            onCancel?()
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(MGColor.inkSoft)
                                .padding(7)
                                .background(
                                    Circle()
                                        .fill(Color.white.opacity(0.18))
                                        .overlay(
                                            Circle()
                                                .stroke(MGColor.inkFaint.opacity(0.25), lineWidth: 1)
                                        )
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.bottom, 13)

                // Event type picker (2-col grid)
                Text("EVENT TYPE")
                    .font(MGFont.mono(8))
                    .tracking(8 * 0.1)
                    .foregroundStyle(MGColor.inkFaint)
                    .padding(.bottom, 7)

                LazyVGrid(
                    columns: [GridItem(.flexible(), spacing: 7), GridItem(.flexible(), spacing: 7)],
                    spacing: 7
                ) {
                    ForEach(EventType.allCases) { eType in
                        let isSelected = eventType == eType
                        Button {
                            eventType = eType
                        } label: {
                            HStack(spacing: 8) {
                                EventTypeIcon(
                                    type: eType,
                                    size: 17,
                                    color: isSelected ? MGColor.goldDeep : MGColor.inkSoft
                                )
                                Text(eType.label)
                                    .font(MGFont.sans(10.5, .bold))
                                    .foregroundStyle(isSelected ? MGColor.goldDeep : MGColor.inkSoft)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.75)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 9)
                            .padding(.horizontal, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 11)
                                    .fill(isSelected ? MGColor.gold.opacity(0.16) : Color(red: 40/255, green: 33/255, blue: 23/255).opacity(0.05))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 11)
                                            .stroke(
                                                isSelected ? MGColor.gold : Color(red: 40/255, green: 33/255, blue: 23/255).opacity(0.12),
                                                lineWidth: 1
                                            )
                                    )
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.bottom, 11)

                // Title field
                HostField(
                    label: "EVENT TITLE",
                    placeholder: "e.g. Sunset Circle",
                    text: $title,
                    maxLength: 32
                )

                // Description field (multiline)
                HostField(
                    label: "DESCRIPTION",
                    placeholder: "Vibe, dress code, rules, safety notes\u{2026}",
                    text: $description,
                    maxLength: 160,
                    isMultiline: true
                )

                // Date/Time + Capacity row
                HStack(spacing: 9) {
                    HostField(
                        label: "DATE & TIME",
                        placeholder: "Sat \u{00B7} 11 PM",
                        text: $when,
                        maxLength: 20
                    )
                    HostField(
                        label: "CAPACITY",
                        placeholder: "12",
                        text: $capacity,
                        maxLength: 3,
                        digitsOnly: true
                    )
                }

                // Place / Venue field
                HostField(
                    label: "PLACE / VENUE",
                    placeholder: "Gaslight Parlor",
                    text: $place,
                    maxLength: 28
                )

                // Area field
                HostField(
                    label: "AREA",
                    placeholder: "Inkhouse Ward",
                    text: $area,
                    maxLength: 24
                )

                // Visibility picker
                Text("VISIBILITY")
                    .font(MGFont.mono(8))
                    .tracking(8 * 0.1)
                    .foregroundStyle(MGColor.inkFaint)
                    .padding(.top, 13)
                    .padding(.bottom, 7)

                HStack(spacing: 7) {
                    ForEach(HostPrivacy.allCases, id: \.rawValue) { option in
                        let isSelected = privacy == option
                        Button {
                            privacy = option
                        } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(option.label)
                                    .font(MGFont.sans(11, .bold))
                                    .foregroundStyle(isSelected ? MGColor.goldDeep : MGColor.ink)
                                Text(option.subtitle)
                                    .font(MGFont.sans(8.5, .light))
                                    .foregroundStyle(MGColor.inkSoft)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 9)
                            .padding(.horizontal, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 11)
                                    .fill(isSelected ? MGColor.gold.opacity(0.16) : Color(red: 40/255, green: 33/255, blue: 23/255).opacity(0.05))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 11)
                                            .stroke(
                                                isSelected ? MGColor.gold : Color(red: 40/255, green: 33/255, blue: 23/255).opacity(0.12),
                                                lineWidth: 1
                                            )
                                    )
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }

                // Consent note (green)
                HStack(alignment: .top, spacing: 7) {
                    Image(systemName: "checkmark.shield.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(MGColor.spotify)
                        .padding(.top, 1)

                    Text("Hosts agree to Mangasm\u{2019}s safety & consent code. 18+ only, ID at door, no recording.")
                        .font(MGFont.sans(9.5, .light))
                        .foregroundStyle(MGColor.inkSoft)
                        .lineSpacing(4)
                }
                .padding(.vertical, 9)
                .padding(.horizontal, 11)
                .background(
                    RoundedRectangle(cornerRadius: 11)
                        .fill(MGColor.spotify.opacity(0.08))
                        .overlay(
                            RoundedRectangle(cornerRadius: 11)
                                .stroke(MGColor.spotify.opacity(0.25), lineWidth: 1)
                        )
                )
                .padding(.top, 13)

                // Publish button
                Button {
                    if ready { onPublish() }
                } label: {
                    Text("Publish Event")
                        .font(MGFont.serif(15, .bold))
                        .tracking(15 * 0.06)
                        .foregroundStyle(MGColor.goldText)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 13)
                                .fill(MGGradient.goldButton)
                                .shadow(
                                    color: ready ? MGColor.gold.opacity(0.8) : .clear,
                                    radius: 8, x: 0, y: 6
                                )
                        )
                        .opacity(ready ? 1.0 : 0.45)
                }
                .buttonStyle(.plain)
                .disabled(!ready)
                .padding(.top, 14)
            }
            .padding(.horizontal, 15)
            .padding(.vertical, 15)
            .clipShape(RoundedRectangle(cornerRadius: 19))
            .glassBackground(19)
            .padding(1)
        }
    }
}

// MARK: - HostField
// Labeled text field with optional char counter. Uses TextEditor for multiline.
// SwiftUI TextField has no maxLength — enforced via onChange.
private struct HostField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var maxLength: Int
    var isMultiline: Bool = false
    var digitsOnly: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Label row with counter
            HStack(alignment: .firstTextBaseline) {
                Text(label)
                    .font(MGFont.mono(8))
                    .tracking(8 * 0.1)
                    .foregroundStyle(MGColor.inkFaint)
                Spacer()
                Text("\(text.count)/\(maxLength)")
                    .font(MGFont.mono(7.5))
                    .foregroundStyle(MGColor.inkFaint)
            }
            .padding(.bottom, 5)

            if isMultiline {
                ZStack(alignment: .topLeading) {
                    if text.isEmpty {
                        Text(placeholder)
                            .font(MGFont.sans(12, .semibold))
                            .foregroundStyle(MGColor.inkFaint)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 16)
                            .allowsHitTesting(false)
                    }
                    TextEditor(text: $text)
                        .scrollContentBackground(.hidden)
                        .font(MGFont.sans(12, .semibold))
                        .foregroundStyle(MGColor.ink)
                        .frame(minHeight: 60, maxHeight: 80)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                }
                .background(
                    RoundedRectangle(cornerRadius: 9)
                        .fill(Color.white.opacity(0.5))
                        .overlay(
                            RoundedRectangle(cornerRadius: 9)
                                .stroke(MGColor.gold.opacity(0.33), lineWidth: 1)
                        )
                )
                .onChange(of: text) { _, newValue in
                    if newValue.count > maxLength {
                        text = String(newValue.prefix(maxLength))
                    }
                }
            } else {
                TextField(placeholder, text: $text)
                    .font(MGFont.sans(12, .semibold))
                    .foregroundStyle(MGColor.ink)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 9)
                            .fill(Color.white.opacity(0.5))
                            .overlay(
                                RoundedRectangle(cornerRadius: 9)
                                    .stroke(MGColor.gold.opacity(0.33), lineWidth: 1)
                            )
                    )
                    .onChange(of: text) { _, newValue in
                        var filtered = newValue
                        if digitsOnly {
                            filtered = filtered.filter { $0.isNumber }
                        }
                        if filtered.count > maxLength {
                            filtered = String(filtered.prefix(maxLength))
                        }
                        if filtered != newValue {
                            text = filtered
                        }
                    }
            }
        }
        .padding(.bottom, 11)
    }
}
