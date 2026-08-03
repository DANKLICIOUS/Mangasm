import SwiftUI

// MARK: - EventCard
// Spec §5.7 — Event card: type icon tile, type label + title, approval/open privacy badge,
// host avatar+name+"REP", description, time + location meta rows, attendees + RSVP/Request button.
// Prototype: mangasm-events.jsx EventCard.
// RSVP state is local only; also calls env.events.rsvp() for mock side-effects.

struct EventCard: View {
    let event: EventItem

    @EnvironmentObject var env: AppEnvironment
    @State private var rsvped: Bool = false
    @State private var showReportReasons: Bool = false
    @State private var showReportConfirm: Bool = false

    private var isApproval: Bool { event.privacy == "approval" }

    private var left: Int {
        max(event.capacity - event.going - (rsvped ? 1 : 0), 0)
    }

    private var goingCount: Int {
        event.going + (rsvped ? 1 : 0)
    }

    var body: some View {
        // Holo border
        ZStack {
            RoundedRectangle(cornerRadius: 18)
                .fill(MGGradient.holo)
                .shadow(
                    color: Color(red: 40/255, green: 30/255, blue: 15/255).opacity(0.55),
                    radius: 22, x: 0, y: 16
                )

            VStack(alignment: .leading, spacing: 0) {
                // ── Header: type icon + label/title + privacy badge ──────────
                HStack(alignment: .center, spacing: 8) {
                    // Type icon tile
                    ZStack {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(MGColor.gold.opacity(0.13))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(MGColor.gold.opacity(0.27), lineWidth: 1)
                            )
                        EventTypeIcon(type: event.type, size: 18, color: MGColor.gold)
                    }
                    .frame(width: 34, height: 34)

                    VStack(alignment: .leading, spacing: 1) {
                        Text(event.type.label.uppercased())
                            .font(MGFont.mono(7))
                            .tracking(7 * 0.16)
                            .foregroundStyle(MGColor.gold)
                        Text(event.title)
                            .font(MGFont.serif(16, .bold))
                            .foregroundStyle(MGColor.ink)
                            .lineLimit(1)
                    }

                    Spacer(minLength: 0)

                    // Privacy badge — approval (gold) or open (green)
                    PrivacyBadge(isApproval: isApproval)

                    // Report affordance (Guideline 1.2 — events are UGC).
                    Menu {
                        Button {
                            showReportReasons = true
                        } label: {
                            Label("Report event…", systemImage: "flag")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(MGColor.gold)
                            .frame(width: 28, height: 28)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }

                // ── Host row ─────────────────────────────────────────────────
                HStack(spacing: 7) {
                    AsyncImage(url: URL(string: event.avatarURL ?? "")) { phase in
                        switch phase {
                        case .success(let img):
                            img.resizable().scaledToFill()
                        default:
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [MGColor.goldBright.opacity(0.4), MGColor.goldDeep.opacity(0.5)],
                                        startPoint: .topLeading, endPoint: .bottomTrailing
                                    )
                                )
                        }
                    }
                    .frame(width: 22, height: 22)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(MGColor.gold.opacity(0.4), lineWidth: 1))

                    Text(event.hostName)
                        .font(MGFont.sans(10.5, .semibold))
                        .foregroundStyle(MGColor.ink)

                    Text("· REP \(event.hostRep)")
                        .font(MGFont.mono(7.5))
                        .foregroundStyle(MGColor.inkFaint)
                }
                .padding(.top, 10)

                // ── Description ──────────────────────────────────────────────
                Text(event.description)
                    .font(MGFont.sans(11, .light))
                    .foregroundStyle(MGColor.inkSoft)
                    .lineSpacing(4)
                    .padding(.top, 9)

                // ── Meta rows: time and location ─────────────────────────────
                MetaRow(systemName: "clock") {
                    Text(event.when)
                }
                .padding(.top, 6)

                let locationText = isApproval
                    ? "\(event.place) · \(event.area) · exact address on approval"
                    : "\(event.place) · \(event.area)"
                MetaRow(systemName: "mappin.circle") {
                    Text(locationText)
                }
                .padding(.top, 2)

                // ── Attendees + RSVP ─────────────────────────────────────────
                HStack(alignment: .center) {
                    // "X going · Y left" — Y in gold if ≤ 3
                    HStack(spacing: 0) {
                        Text("\(goingCount) going · ")
                            .font(MGFont.mono(8.5))
                            .foregroundStyle(MGColor.inkSoft)
                        Text("\(left) left")
                            .font(MGFont.mono(8.5))
                            .foregroundStyle(left <= 3 ? MGColor.goldDeep : MGColor.inkFaint)
                    }

                    Spacer()

                    // RSVP / Request button
                    Button {
                        withAnimation(.easeInOut(duration: 0.18)) {
                            rsvped.toggle()
                        }
                        if !rsvped {
                            // Un-RSVP: no matching protocol method — local toggle only
                        } else {
                            env.events.rsvp(event.id)
                        }
                    } label: {
                        let btnLabel: String = rsvped
                            ? (isApproval ? "Requested" : "You're in")
                            : (isApproval ? "Request" : "RSVP")

                        Text(btnLabel)
                            .font(MGFont.serif(12.5, .bold))
                            .tracking(12.5 * 0.04)
                            .foregroundStyle(
                                rsvped
                                    ? AnyShapeStyle(MGColor.spotify)
                                    : AnyShapeStyle(MGColor.goldText)
                            )
                            .padding(.vertical, 8)
                            .padding(.horizontal, 16)
                            .background {
                                if rsvped {
                                    RoundedRectangle(cornerRadius: 11)
                                        .fill(MGColor.spotify.opacity(0.12))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 11)
                                                .stroke(MGColor.spotify.opacity(0.4), lineWidth: 1)
                                        )
                                } else {
                                    RoundedRectangle(cornerRadius: 11)
                                        .fill(MGGradient.goldButton)
                                        .shadow(
                                            color: MGColor.gold.opacity(0.7),
                                            radius: 7, x: 0, y: 4
                                        )
                                }
                            }
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 12)
            }
            .padding(.horizontal, 13)
            .padding(.vertical, 12)
            .clipShape(RoundedRectangle(cornerRadius: 17))
            .glassBackground(17)
            .padding(1)
        }
        .confirmationDialog(
            "Report \(event.title)",
            isPresented: $showReportReasons,
            titleVisibility: .visible
        ) {
            ForEach(ReportReason.allCases, id: \.self) { reason in
                Button(reason.label) {
                    // Events carry no host UUID on the client → reportedUserID nil;
                    // the event id is the takedown target.
                    env.safety.reportContent(
                        .event,
                        contentID: event.id,
                        reportedUserID: nil,
                        reason: reason.label
                    )
                    showReportConfirm = true
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Select a reason for your report.")
        }
        .alert("Report Submitted", isPresented: $showReportConfirm) {
            Button("OK") {}
        } message: {
            Text("Thank you. Your report has been submitted.")
        }
    }
}

// MARK: - PrivacyBadge
// Approval badge (gold lock) or Open badge (green dot).
private struct PrivacyBadge: View {
    let isApproval: Bool

    var body: some View {
        HStack(spacing: 4) {
            if isApproval {
                // Lock icon path
                Image(systemName: "lock.fill")
                    .font(.system(size: 8, weight: .semibold))
                    .foregroundStyle(MGColor.goldDeep)
            } else {
                Circle()
                    .fill(MGColor.spotify)
                    .frame(width: 6, height: 6)
                    .shadow(color: MGColor.spotify, radius: 2.5)
            }
            Text(isApproval ? "APPROVAL" : "OPEN")
                .font(MGFont.mono(6.5))
                .tracking(6.5 * 0.08)
                .foregroundStyle(isApproval ? MGColor.goldDeep : MGColor.spotify)
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isApproval ? MGColor.gold.opacity(0.14) : MGColor.spotify.opacity(0.12))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(
                            isApproval ? MGColor.gold.opacity(0.33) : MGColor.spotify.opacity(0.33),
                            lineWidth: 1
                        )
                )
        )
    }
}

// MARK: - MetaRow
// Icon + text meta row (time, location).
private struct MetaRow<Content: View>: View {
    let systemName: String
    @ViewBuilder let content: Content

    var body: some View {
        HStack(alignment: .center, spacing: 8) {
            Image(systemName: systemName)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(MGColor.goldDeep)
                .frame(width: 13, height: 13)
            content
                .font(MGFont.sans(10.5, .semibold))
                .foregroundStyle(MGColor.inkSoft)
                .lineLimit(2)
        }
    }
}

// MARK: - EventTypeIcon
// Canvas-drawn SVG icon for each event type. Matches prototype ETYPES paths.
struct EventTypeIcon: View {
    let type: EventType
    var size: CGFloat = 18
    var color: Color = MGColor.gold

    var body: some View {
        Canvas { ctx, sz in
            let scale = sz.width / 24
            var path: Path
            switch type {
            case .openDoor:
                // Rect M3 6h18v12H3z + circle cx12 cy12 r3
                path = Path { p in
                    p.move(to: CGPoint(x: 3 * scale, y: 6 * scale))
                    p.addLine(to: CGPoint(x: 21 * scale, y: 6 * scale))
                    p.addLine(to: CGPoint(x: 21 * scale, y: 18 * scale))
                    p.addLine(to: CGPoint(x: 3 * scale, y: 18 * scale))
                    p.closeSubpath()
                }
                ctx.stroke(path, with: .color(color),
                           style: StrokeStyle(lineWidth: 1.7 * scale, lineCap: .round, lineJoin: .round))
                let circleRect = CGRect(
                    x: (12 - 3) * scale, y: (12 - 3) * scale,
                    width: 6 * scale, height: 6 * scale
                )
                ctx.stroke(Path(ellipseIn: circleRect), with: .color(color),
                           style: StrokeStyle(lineWidth: 1.7 * scale))

            case .socialMixer:
                // M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z
                path = Path { p in
                    p.move(to: CGPoint(x: 12 * scale, y: 3 * scale))
                    p.addCurve(
                        to: CGPoint(x: 18 * scale, y: 14 * scale),
                        control1: CGPoint(x: 12 * scale, y: 3 * scale),
                        control2: CGPoint(x: 18 * scale, y: 10 * scale)
                    )
                    p.addArc(
                        center: CGPoint(x: 12 * scale, y: 14 * scale),
                        radius: 6 * scale,
                        startAngle: .degrees(0),
                        endAngle: .degrees(180),
                        clockwise: false
                    )
                    p.addCurve(
                        to: CGPoint(x: 12 * scale, y: 3 * scale),
                        control1: CGPoint(x: 6 * scale, y: 10 * scale),
                        control2: CGPoint(x: 12 * scale, y: 3 * scale)
                    )
                    p.closeSubpath()
                }
                ctx.stroke(path, with: .color(color),
                           style: StrokeStyle(lineWidth: 1.7 * scale, lineCap: .round, lineJoin: .round))

            case .circle:
                // Two concentric circles: r8.5 + r2.4
                let outer = CGRect(
                    x: (12 - 8.5) * scale, y: (12 - 8.5) * scale,
                    width: 17 * scale, height: 17 * scale
                )
                let inner = CGRect(
                    x: (12 - 2.4) * scale, y: (12 - 2.4) * scale,
                    width: 4.8 * scale, height: 4.8 * scale
                )
                ctx.stroke(Path(ellipseIn: outer), with: .color(color),
                           style: StrokeStyle(lineWidth: 1.7 * scale))
                ctx.stroke(Path(ellipseIn: inner), with: .color(color),
                           style: StrokeStyle(lineWidth: 1.7 * scale))

            case .cosplay:
                // M4 8c5-2.4 11-2.4 16 0 0 7-4 10-8 10S4 15 4 8z + two eye dots
                path = Path { p in
                    p.move(to: CGPoint(x: 4 * scale, y: 8 * scale))
                    p.addCurve(
                        to: CGPoint(x: 20 * scale, y: 8 * scale),
                        control1: CGPoint(x: 9 * scale, y: 5.6 * scale),
                        control2: CGPoint(x: 15 * scale, y: 5.6 * scale)
                    )
                    p.addCurve(
                        to: CGPoint(x: 12 * scale, y: 18 * scale),
                        control1: CGPoint(x: 20 * scale, y: 15 * scale),
                        control2: CGPoint(x: 16 * scale, y: 18 * scale)
                    )
                    p.addCurve(
                        to: CGPoint(x: 4 * scale, y: 8 * scale),
                        control1: CGPoint(x: 8 * scale, y: 18 * scale),
                        control2: CGPoint(x: 4 * scale, y: 15 * scale)
                    )
                    p.closeSubpath()
                }
                ctx.stroke(path, with: .color(color),
                           style: StrokeStyle(lineWidth: 1.7 * scale, lineCap: .round, lineJoin: .round))
                // Eye dots at (9,10.5) and (15,10.5) r=0.9
                let eyeSize = 1.8 * scale
                let leftEye = CGRect(x: (9 - 0.9) * scale, y: (10.5 - 0.9) * scale, width: eyeSize, height: eyeSize)
                let rightEye = CGRect(x: (15 - 0.9) * scale, y: (10.5 - 0.9) * scale, width: eyeSize, height: eyeSize)
                ctx.fill(Path(ellipseIn: leftEye), with: .color(color))
                ctx.fill(Path(ellipseIn: rightEye), with: .color(color))
            }
        }
        .frame(width: size, height: size)
    }
}
