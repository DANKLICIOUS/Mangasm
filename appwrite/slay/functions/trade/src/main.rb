# frozen_string_literal: true

require_relative 'grove'

include Appwrite

# Trade records simulations only. Never places orders. No FORGE / RevX.
def main(context)
  payload = Grove.json_body(context)
  return Grove.reject_forbidden(context) if Grove.forbidden_payload?(payload)

  action = payload['action'].to_s.downcase
  return Grove.reject_forbidden(context) if %w[place place_order order forge revx].include?(action)

  tables = Grove.tables(context)
  query = context.req.query || {}
  disclaimer = 'Simulated bonding-curve quote only. Non-custodial. Not a return guarantee. No live order is placed.'

  if context.req.method == 'GET'
    artifact_id = query['artifact_id'] || query['artifactId']
    queries = [Query.limit(25), Query.order_desc('$createdAt')]
    queries.unshift(Query.equal('artifact_id', artifact_id)) if artifact_id && !artifact_id.to_s.empty?
    rows = tables.list_rows(
      database_id: Grove::DATABASE_ID,
      table_id: Grove::TABLE_TRADE,
      queries: queries
    )
    return context.res.json({ 'ok' => true, 'mode' => 'SIMULATED', 'disclaimer' => disclaimer, 'trades' => rows })
  end

  unless context.req.method.to_s.upcase == 'POST'
    return context.res.json({ 'ok' => false, 'error' => 'Use GET to list or POST to simulate.' }, 405)
  end

  artifact_id = (payload['artifact_id'] || payload['artifactId']).to_s.strip
  trade_type = payload['type'].to_s.upcase
  amount_in = (payload['amount_in'] || payload['amountIn']).to_f
  if artifact_id.empty? || !%w[BUY SELL].include?(trade_type) || amount_in <= 0
    return context.res.json({ 'ok' => false, 'error' => 'artifact_id, type (BUY|SELL), and amount_in > 0 are required.' }, 400)
  end

  creator_fee = (amount_in * 0.01).round(8)
  platform_fee = (amount_in * 0.003).round(8)
  slippage = (payload['slippage_tolerance_pct'] || payload['slippageTolerancePct'] || 1.0).to_f
  estimated = (amount_in - creator_fee - platform_fee).round(8)
  impact = [amount_in * 0.15, 8.0].min.round(4)

  row = tables.create_row(
    database_id: Grove::DATABASE_ID,
    table_id: Grove::TABLE_TRADE,
    row_id: ID.unique,
    data: {
      'artifact_id' => artifact_id,
      'gnomie_id' => (payload['gnomie_id'] || payload['gnomieId']).to_s,
      'type' => trade_type,
      'amount_in' => amount_in,
      'slippage_tolerance_pct' => slippage,
      'estimated_output' => estimated,
      'price_impact_pct' => impact,
      'creator_fee_usd' => creator_fee,
      'platform_fee_usd' => platform_fee,
      'network_gas_sol' => 0.00005,
      'execution_route' => 'SIMULATED_BONDING_CURVE',
      'status' => 'SIMULATED',
      'wallet_address' => payload['wallet_address'] || payload['walletAddress'],
      'disclaimer' => disclaimer
    }
  )

  context.log("Trade simulated artifact=#{artifact_id} type=#{trade_type} (not placed)")
  context.res.json({
    'ok' => true,
    'mode' => 'SIMULATED',
    'placed' => false,
    'disclaimer' => disclaimer,
    'trade' => row
  })
rescue Appwrite::Exception => e
  context.error(e.message)
  context.res.json({ 'ok' => false, 'error' => e.message }, 400)
end
