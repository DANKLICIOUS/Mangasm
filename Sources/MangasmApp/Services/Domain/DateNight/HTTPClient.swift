import Foundation

/// Minimal HTTP surface so Yelp/Ticketmaster clients stay testable without new SPM deps.
public protocol HTTPClient: Sendable {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

public struct URLSessionHTTPClient: HTTPClient {
    private let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await session.data(for: request)
    }
}

/// In-memory stub for unit tests.
public struct StubHTTPClient: HTTPClient {
    public var handler: @Sendable (URLRequest) async throws -> (Data, URLResponse)

    public init(handler: @escaping @Sendable (URLRequest) async throws -> (Data, URLResponse)) {
        self.handler = handler
    }

    public func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await handler(request)
    }
}
