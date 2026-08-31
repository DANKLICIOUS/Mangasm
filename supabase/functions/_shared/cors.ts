// Shared CORS headers for browser-invoked edge functions.
// Keep in sync with @supabase/supabase-js client headers.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage, x-admin-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
