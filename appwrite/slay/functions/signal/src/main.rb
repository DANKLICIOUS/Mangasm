# frozen_string_literal: true

require_relative 'grove'

include Appwrite

# Gnomie Vision signals. Informational analytics only — no profit claims.
def main(context)
  payload = Grove.json_body(context)
  return Grove.reject_forbidden(context) if Grove.forbidden_payload?(payload)

  tables = Grove.tables(context)
  query = context.req.query || {}
  artifact_id = query['artifact_id'] || query['artifactId'] || payload['artifact_id'] || payload['artifactId']
  disclaimer = 'Gnomie Vision is informational observation of market activity. It is not financial advice and does not guarantee returns.'

  if context.req.method == 'GET'
    queries = [Query.limit(50), Query.order_desc('$createdAt')]
    queries.unshift(Query.equal('artifact_id', artifact_id)) if artifact_id && !artifact_id.to_s.empty?
    rows = tables.list_rows(
      database_id: Grove::DATABASE_ID,
      table_id: Grove::TABLE_SIGNAL,
      queries: queries
    )
    return context.res.json({ 'ok' => true, 'disclaimer' => disclaimer, 'signals' => rows })
  end

  unless context.req.method.to_s.upcase == 'POST'
    return context.res.json({ 'ok' => false, 'error' => 'Use GET to list or POST to record a signal.' }, 405)
  end

  if artifact_id.to_s.strip.empty? || payload['label'].to_s.strip.empty?
    return context.res.json({ 'ok' => false, 'error' => 'artifact_id and label are required.' }, 400)
  end

  dimension = (payload['dimension'] || 'AGE').to_s
  allowed = %w[PRICE VOLUME LIQUIDITY TRANSACTION_FREQUENCY VOLATILITY HOLDER_DISTRIBUTION BUY_SELL_RATIO AGE]
  dimension = 'AGE' unless allowed.include?(dimension)
  intensity = (payload['intensity'] || 'LOW').to_s
  intensity = 'LOW' unless %w[LOW MODERATE ELEVATED HIGH].include?(intensity)

  row = tables.create_row(
    database_id: Grove::DATABASE_ID,
    table_id: Grove::TABLE_SIGNAL,
    row_id: ID.unique,
    data: {
      'artifact_id' => artifact_id,
      'dimension' => dimension,
      'label' => payload['label'].to_s,
      'observation' => payload['observation'].to_s,
      'intensity' => intensity,
      'score' => [[(payload['score'] || 0).to_i, 0].max, 100].min,
      'is_financial_advice' => false,
      'disclaimer' => disclaimer
    }
  )

  context.res.json({ 'ok' => true, 'disclaimer' => disclaimer, 'signal' => row })
rescue Appwrite::Exception => e
  context.error(e.message)
  context.res.json({ 'ok' => false, 'error' => e.message }, 400)
end
