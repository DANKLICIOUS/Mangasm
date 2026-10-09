# frozen_string_literal: true

require_relative 'grove'

include Appwrite

# Market snapshots for The Grove. Informational read path.
def main(context)
  payload = Grove.json_body(context)
  return Grove.reject_forbidden(context) if Grove.forbidden_payload?(payload)

  tables = Grove.tables(context)
  query = context.req.query || {}
  artifact_id = query['artifact_id'] || query['artifactId'] || payload['artifact_id'] || payload['artifactId']

  if artifact_id && !artifact_id.to_s.empty?
    rows = tables.list_rows(
      database_id: Grove::DATABASE_ID,
      table_id: Grove::TABLE_MARKET,
      queries: [Query.equal('artifact_id', artifact_id), Query.limit(5), Query.order_desc('$createdAt')]
    )
    return context.res.json({ 'ok' => true, 'artifact_id' => artifact_id, 'markets' => rows })
  end

  rows = tables.list_rows(
    database_id: Grove::DATABASE_ID,
    table_id: Grove::TABLE_MARKET,
    queries: [Query.limit(25), Query.order_desc('volume_24h_usd')]
  )
  context.res.json({ 'ok' => true, 'markets' => rows })
rescue Appwrite::Exception => e
  context.error(e.message)
  context.res.json({ 'ok' => false, 'error' => e.message }, 400)
end
