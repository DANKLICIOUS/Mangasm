import StoreKit
import Foundation

// MARK: - Product IDs

public enum MangasmProduct: String, CaseIterable, Sendable {
    // Product IDs must match App Store Connect exactly. One M+ tier, two billing
    // lengths: monthly ($9.99) and 3-month ($24.99).
    case monthly   = "Mangasm2cute4u001"
    case quarterly = "Mangasm0001"
}

// MARK: - StoreKitStore

/// Manages M+ subscription state via StoreKit 2.
/// Drives AppState.premium through an onChange observer in MangasmRootView.
@MainActor
public final class StoreKitStore: ObservableObject {

    // MARK: Published state

    @Published public var products: [Product] = []
    @Published public var purchasedProductIDs: Set<String> = []
    @Published public var isPremium: Bool = false

    // MARK: Edge Function config

    /// Base URL of the Supabase project, e.g. "https://dvomzrvslwdabwcwtvrg.supabase.co"
    /// Set to a real value when the Edge Function is deployed. An empty string disables the POST.
    public var verifyBaseURL: String = ""

    /// Supplies the signed-in user's access token for the verify-purchase call.
    /// The edge function requires a verified user JWT (auth: 'user'); when this
    /// is nil or returns nil (signed out), the POST is skipped.
    public var authTokenProvider: (@Sendable () async -> String?)?

    // MARK: Private

    private var updatesTask: Task<Void, Never>?

    // MARK: Init / deinit

    public init() {
        // Start listening for Transaction.updates immediately (covers renewals, cancellations,
        // and purchases finished in other app instances).
        updatesTask = Task { [weak self] in
            for await verificationResult in Transaction.updates {
                guard let self else { return }
                await self.handle(verificationResult: verificationResult)
            }
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    // MARK: Public API

    /// Fetches available products from App Store Connect / StoreKit config.
    public func loadProducts() async {
        do {
            let ids = MangasmProduct.allCases.map(\.rawValue)
            products = try await Product.products(for: ids)
        } catch {
            print("[StoreKitStore] loadProducts failed: \(error)")
        }
    }

    /// Refreshes entitlements from Transaction.currentEntitlements.
    /// Call at launch and after any purchase/restore.
    public func updatePurchasedProducts() async {
        var entitled: Set<String> = []
        for await verificationResult in Transaction.currentEntitlements {
            guard let transaction = try? checkVerified(verificationResult) else { continue }
            if transaction.revocationDate == nil {
                entitled.insert(transaction.productID)
            }
        }
        purchasedProductIDs = entitled
        isPremium = MangasmProduct.allCases.contains { entitled.contains($0.rawValue) }
    }

    /// Initiates a purchase flow for the given product.
    /// Returns `true` if the user completed the purchase; `false` if they cancelled.
    /// Throws on StoreKit or verification errors.
    @discardableResult
    public func purchase(_ product: Product) async throws -> Bool {
        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await transaction.finish()
            await updatePurchasedProducts()
            // Post JWS to the server-authoritative Edge Function (fire-and-forget)
            postToVerifyFunction(jwsRepresentation: verification.jwsRepresentation)
            return true
        case .userCancelled:
            return false
        case .pending:
            return false
        @unknown default:
            return false
        }
    }

    /// Restores completed transactions (useful for the Restore Purchases button).
    public func restore() async {
        do {
            try await AppStore.sync()
            await updatePurchasedProducts()
        } catch {
            print("[StoreKitStore] restore failed: \(error)")
        }
    }

    // MARK: Helpers

    /// Unwraps a VerificationResult, throwing if verification failed.
    public func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let value):
            return value
        }
    }

    // MARK: Private

    private func handle(verificationResult: VerificationResult<Transaction>) async {
        guard let transaction = try? checkVerified(verificationResult) else { return }
        await transaction.finish()
        await updatePurchasedProducts()
        postToVerifyFunction(jwsRepresentation: verificationResult.jwsRepresentation)
    }

    /// Posts the JWS-signed transaction to the verify-purchase Edge Function.
    /// No-ops silently if `verifyBaseURL` is empty or unconfigured.
    /// Must NOT throw — call site is fire-and-forget inside a Task.
    private func postToVerifyFunction(jwsRepresentation: String) {
        guard !verifyBaseURL.isEmpty else { return }
        let urlString = "\(verifyBaseURL)/functions/v1/verify-purchase"
        guard let url = URL(string: urlString) else {
            print("[StoreKitStore] verifyBaseURL is not a valid URL: \(verifyBaseURL)")
            return
        }
        let tokenProvider = authTokenProvider
        Task {
            do {
                guard let token = await tokenProvider?() else {
                    print("[StoreKitStore] no session token — skipping verify-purchase POST")
                    return
                }
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                let body = ["signedTransaction": jwsRepresentation]
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
                let (_, response) = try await URLSession.shared.data(for: request)
                if let http = response as? HTTPURLResponse, http.statusCode != 200 {
                    print("[StoreKitStore] verify-purchase returned HTTP \(http.statusCode)")
                }
            } catch {
                print("[StoreKitStore] verify-purchase POST failed: \(error)")
            }
        }
    }
}
