import Foundation

#if os(iOS)
import CoreLocation

/// One-shot device location via CoreLocation. Requests When-In-Use permission on
/// first use (Info.plist already carries NSLocationWhenInUseUsageDescription).
/// Returns `nil` — never errors — when permission is denied or a fix isn't available,
/// so the caller keeps its default weather rather than blocking.
public final class LiveLocationProvider: NSObject, LocationProvider, @unchecked Sendable {
    private let manager = CLLocationManager()
    private var continuation: CheckedContinuation<GeoCoordinate?, Never>?

    public override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyReduced   // weather doesn't need precision
    }

    public func currentCoordinate() async -> GeoCoordinate? {
        await withCheckedContinuation { (cont: CheckedContinuation<GeoCoordinate?, Never>) in
            self.continuation = cont
            switch manager.authorizationStatus {
            case .notDetermined:
                manager.requestWhenInUseAuthorization()          // resumes via delegate
            case .authorizedWhenInUse, .authorizedAlways:
                manager.requestLocation()
            default:
                finish(nil)                                      // denied / restricted
            }
        }
    }

    private func finish(_ coordinate: GeoCoordinate?) {
        continuation?.resume(returning: coordinate)
        continuation = nil
    }
}

extension LiveLocationProvider: CLLocationManagerDelegate {
    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        case .denied, .restricted:
            finish(nil)
        default:
            break   // still .notDetermined — keep waiting for the user's choice
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.first else { finish(nil); return }
        finish(GeoCoordinate(latitude: loc.coordinate.latitude, longitude: loc.coordinate.longitude))
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        finish(nil)
    }
}

#else

/// Non-iOS builds (macOS test host) have no device location — always nil.
public struct LiveLocationProvider: LocationProvider {
    public init() {}
    public func currentCoordinate() async -> GeoCoordinate? { nil }
}

#endif
