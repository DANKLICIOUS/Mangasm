import CoreLocation
import SwiftUI

/// AI Match "RSVP A FIRST DATE" discovery: dual-proximity Yelp + Ticketmaster deep-links.
struct DateNightSection: View {
    let matchName: String
    let matchCoordinate: GeoCoordinate?
    let onMessage: () -> Void

    @EnvironmentObject private var env: AppEnvironment
    @State private var places: [DateNightPlace] = []
    @State private var status: Status = .loading
    @State private var zipInput: String = ""
    @State private var useDeviceLocation: Bool = true
    /// Yelp `term` keyword — e.g. "delis" → /v3/businesses/search?term=delis&latitude=…
    @State private var keyword: String = ""

    private enum Status: Equatable {
        case loading
        case ready
        case error(String)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel("RSVP A FIRST DATE")
                .padding(.top, 4)

            Text("Restaurants, events & festivals within 10 miles of both of you. Party of 2 — book or buy tickets via deep link.")
                .font(MGFont.sans(10, .light))
                .foregroundStyle(MGColor.inkSoft)
                .lineSpacing(3)

            locationControls

            switch status {
            case .loading:
                ProgressView()
                    .tint(MGColor.gold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            case .error(let message):
                Text(message)
                    .font(MGFont.sans(11, .medium))
                    .foregroundStyle(MGColor.inkSoft)
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                Button("Try again") {
                    Task { await reload() }
                }
                .font(MGFont.sans(11, .semibold))
                .foregroundStyle(MGColor.gold)
            case .ready:
                if places.isEmpty {
                    Text("No spots within 10 miles of both of you yet.")
                        .font(MGFont.sans(11, .medium))
                        .foregroundStyle(MGColor.inkSoft)
                } else {
                    ForEach(places) { place in
                        DateNightPlaceCard(
                            place: place,
                            matchName: matchName,
                            onMessage: onMessage
                        )
                    }
                }
            }
        }
        .task(id: reloadToken) {
            await reload()
        }
    }

    private var reloadToken: String {
        "\(zipInput)|\(useDeviceLocation)|\(keyword)|\(matchCoordinate?.latitude ?? 0)"
    }

    private var locationControls: some View {
        VStack(alignment: .leading, spacing: 8) {
            keywordField

            Toggle(isOn: $useDeviceLocation) {
                Text("Use my GPS")
                    .font(MGFont.sans(11, .medium))
                    .foregroundStyle(MGColor.ink)
            }
            .tint(MGColor.gold)

            HStack(spacing: 8) {
                zipField

                Button("Find") {
                    Task { await reload() }
                }
                .font(MGFont.serif(13, .bold))
                .foregroundStyle(MGColor.goldText)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(MGGradient.goldButton, in: RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private var keywordField: some View {
        TextField("Keyword (e.g. delis, sushi, rooftop)", text: $keyword)
            .font(MGFont.sans(12, .medium))
            .padding(10)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(MGColor.gold.opacity(0.22), lineWidth: 1)
            )
            .onSubmit {
                Task { await reload() }
            }
    }

    @ViewBuilder
    private var zipField: some View {
        let field = TextField("My ZIP (if no GPS)", text: $zipInput)
            .font(MGFont.sans(12, .medium))
            .padding(10)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(MGColor.gold.opacity(0.22), lineWidth: 1)
            )
        #if os(iOS)
        field
            .keyboardType(.numberPad)
            .textInputAutocapitalization(.never)
        #else
        field
        #endif
    }

    @MainActor
    private func reload() async {
        status = .loading
        do {
            let viewer = try await resolveViewerCoordinate()
            let match = try resolveMatchCoordinate()
            let term = keyword.trimmingCharacters(in: .whitespacesAndNewlines)
            let query = DateNightQuery(
                viewer: viewer,
                match: match,
                term: term.isEmpty ? nil : term
            )
            let results = try await env.dateNight.discover(query)
            places = results
            status = .ready
        } catch let error as DateNightError {
            places = []
            status = .error(error.localizedDescription)
        } catch {
            places = []
            status = .error(error.localizedDescription)
        }
    }

    private func resolveMatchCoordinate() throws -> GeoCoordinate {
        if let matchCoordinate { return matchCoordinate }
        // Fallback: treat match as near viewer cluster (mock discover seed)
        // until profiles expose lat/lon / zip.
        throw DateNightError.missingAnchor(role: matchName)
    }

    private func resolveViewerCoordinate() async throws -> GeoCoordinate {
        if useDeviceLocation, let gps = await DeviceLocation.current() {
            return gps
        }
        let zip = GeoAnchor.normalizedZip(zipInput)
        if let zip, let coord = await ZipGeocoder.coordinate(for: zip) {
            return coord
        }
        // Simulator / preview fallback so DateNight is demoable without keys/GPS.
        #if DEBUG
        if zipInput.isEmpty && !useDeviceLocation {
            return GeoCoordinate(latitude: 25.7617, longitude: -80.1918)
        }
        if useDeviceLocation {
            return GeoCoordinate(latitude: 25.7617, longitude: -80.1918)
        }
        #endif
        throw DateNightError.missingAnchor(role: "you")
    }
}

// MARK: - DeviceLocation (CoreLocation — system framework, not SPM)

enum DeviceLocation {
    @MainActor
    static func current() async -> GeoCoordinate? {
        let manager = CLLocationManager()
        let status = manager.authorizationStatus
        if status == .notDetermined {
            manager.requestWhenInUseAuthorization()
        }
        guard let loc = manager.location else { return nil }
        return GeoCoordinate(latitude: loc.coordinate.latitude, longitude: loc.coordinate.longitude)
    }
}

// MARK: - ZipGeocoder

enum ZipGeocoder {
    static func coordinate(for zip: String) async -> GeoCoordinate? {
        await withCheckedContinuation { continuation in
            let geocoder = CLGeocoder()
            geocoder.geocodeAddressString(zip) { placemarks, _ in
                if let c = placemarks?.first?.location?.coordinate {
                    continuation.resume(returning: GeoCoordinate(latitude: c.latitude, longitude: c.longitude))
                } else {
                    continuation.resume(returning: nil)
                }
            }
        }
    }
}
