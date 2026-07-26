import XCTest
@testable import MangasmApp

final class WeatherTests: XCTestCase {

    // MARK: - WeatherHeuristic (deterministic season/latitude fallback)

    func testTropicsAlwaysClear() {
        let equatorial = GeoCoordinate(latitude: 10, longitude: 0)
        XCTAssertEqual(WeatherHeuristic.estimate(at: equatorial, month: 1), .clear)
        XCTAssertEqual(WeatherHeuristic.estimate(at: equatorial, month: 7), .clear)
    }

    func testNorthernTemperateSwingsBySeason() {
        let temperate = GeoCoordinate(latitude: 30, longitude: -80)   // 23..<45 band
        XCTAssertEqual(WeatherHeuristic.estimate(at: temperate, month: 1), .rain)   // winter
        XCTAssertEqual(WeatherHeuristic.estimate(at: temperate, month: 7), .clear)  // summer
    }

    func testColdLatitudesSnowInWinter() {
        let cold = GeoCoordinate(latitude: 55, longitude: 0)
        XCTAssertEqual(WeatherHeuristic.estimate(at: cold, month: 1), .snow)
        XCTAssertEqual(WeatherHeuristic.estimate(at: cold, month: 7), .clear)
    }

    func testPolarSummerIsCloudyNotClear() {
        let polar = GeoCoordinate(latitude: 70, longitude: 0)
        XCTAssertEqual(WeatherHeuristic.estimate(at: polar, month: 1), .snow)
        XCTAssertEqual(WeatherHeuristic.estimate(at: polar, month: 7), .cloudy)
    }

    func testSouthernHemisphereWinterIsInvertedMonths() {
        let southern = GeoCoordinate(latitude: -55, longitude: 0)
        XCTAssertEqual(WeatherHeuristic.estimate(at: southern, month: 7), .snow)   // Jul = S. winter
        XCTAssertEqual(WeatherHeuristic.estimate(at: southern, month: 1), .clear)  // Jan = S. summer
    }

    // MARK: - Mocks

    func testMockWeatherProviderReturnsStub() async {
        let provider = MockWeatherProvider(stub: .heavyRain)
        let w = await provider.current(at: GeoCoordinate(latitude: 0, longitude: 0))
        XCTAssertEqual(w, .heavyRain)
    }

    func testMockLocationProviderNilMeansUnavailable() async {
        let some = await MockLocationProvider().currentCoordinate()
        XCTAssertNotNil(some)
        let none = await MockLocationProvider(coordinate: nil).currentCoordinate()
        XCTAssertNil(none)
    }

    // MARK: - AppState.refreshWeather wiring

    @MainActor
    func testRefreshWeatherSetsWeatherFromProvider() async {
        let state = AppState()
        XCTAssertEqual(state.weather, .clear)   // default
        await state.refreshWeather(weather: MockWeatherProvider(stub: .snow),
                                   location: MockLocationProvider())
        XCTAssertEqual(state.weather, .snow)
    }

    @MainActor
    func testRefreshWeatherKeepsDefaultWhenLocationUnavailable() async {
        let state = AppState()
        await state.refreshWeather(weather: MockWeatherProvider(stub: .snow),
                                   location: MockLocationProvider(coordinate: nil))
        XCTAssertEqual(state.weather, .clear)   // location denied → default stays
    }

    @MainActor
    func testRefreshWeatherResolvesOnlyOnce() async {
        let state = AppState()
        await state.refreshWeather(weather: MockWeatherProvider(stub: .snow),
                                   location: MockLocationProvider())
        // A second call with a different stub must NOT override — resolved once.
        await state.refreshWeather(weather: MockWeatherProvider(stub: .rain),
                                   location: MockLocationProvider())
        XCTAssertEqual(state.weather, .snow)
    }
}
