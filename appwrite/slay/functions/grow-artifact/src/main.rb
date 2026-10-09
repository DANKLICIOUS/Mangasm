# frozen_string_literal: true

# slay.llc Void Market — GROW creates Artifacts.
# Not FORGE. Not an NFT-collection mint. Not a return guarantee.
# Provenance / 25SHA fields are adapter metadata only.

require 'json'
require 'appwrite'

include Appwrite

DATABASE_ID = ENV['APPWRITE_DATABASE_ID'] || 'grove'
FORBIDDEN = /\b(forge|nft[-_ ]?collection|guaranteed returns?|risk[- ]?free profit|to the moon)\b/i
ECONOMICS_DISCLAIMER =
  'Creator rewards are programmatic distribution shares from protocol transaction activity, not guaranteed investment returns.'
PROVENANCE_NOTE =
  'Adapter metadata only. Not a cryptographic guarantee of authenticity, custody, or 25SHA integrity.'
VISION_DISCLAIMER =
  'Gnomie Vision is informational observation of market activity. It is not financial advice and does not guarantee returns.'

def main(context)
  if context.req.method == 'GET'
    return context.res.json({
      product: 'slay.llc Void Market / The Grove',
      primitive: 'GROW',
      creates: 'Artifact',
      rejects: ['FORGE', 'NFT collection marketplace', 'guaranteed returns'],
      provenance: PROVENANCE_NOTE
    })
  end

  unless context.req.method == 'POST'
    return json_error(context, 405, 'Method not allowed')
  end

  payload = context.req.body_json
  payload = {} unless payload.is_a?(Hash)

  validation_error = validate_grow(payload)
  return json_error(context, 400, validation_error) if validation_error

  begin
    tables = tables_client(context)
    artifact = persist_grow(tables, payload, context)
    context.res.json({
      ok: true,
      artifactId: artifact['$id'],
      ticker: artifact['ticker'],
      disclaimer: ECONOMICS_DISCLAIMER,
      provenanceNote: PROVENANCE_NOTE
    })
  rescue Appwrite::Exception => e
    context.error("GROW TablesDB error: #{e.message}")
    json_error(context, e.code.to_i.positive? ? e.code.to_i : 502, "GROW persist failed: #{e.message}")
  rescue StandardError => e
    context.error("GROW unexpected error: #{e.class}: #{e.message}")
    json_error(context, 500, 'GROW persist failed')
  end
end

def validate_grow(payload)
  name = stringify(payload['name'])
  ticker = normalize_ticker(payload['ticker'])
  return 'name is required' if name.empty?
  return 'ticker is required' if ticker.empty? || ticker == '$'
  return 'risk_acknowledged must be true' unless truthy?(payload['risk_acknowledged'])

  scanned = [name, ticker, stringify(payload['tagline']), stringify(payload['description']), stringify(payload['lore'])].join(' ')
  return 'GROW rejects FORGE, NFT-collection framing, and guaranteed-return language' if scanned.match?(FORBIDDEN)

  nil
end

def persist_grow(tables, payload, context)
  now = Time.now.utc.iso8601
  gnomie_id = stringify(payload['gnomie_id'])
  gnomie_id = context.req.headers['x-appwrite-user-id'] if gnomie_id.empty?
  gnomie_id = 'anonymous-gnomie' if gnomie_id.to_s.empty?

  name = stringify(payload['name'])
  ticker = normalize_ticker(payload['ticker'])
  tagline = stringify(payload['tagline'])
  tagline = 'A new spore emerges from the damp Grove.' if tagline.empty?
  description = stringify(payload['description'])
  description = 'A living community artifact cultivated in The Grove.' if description.empty?
  lore = stringify(payload['lore'])
  lore = 'Grown by a Gnomie. GROW creates Artifacts — there is no FORGE.' if lore.empty?

  curve = stringify(payload['bonding_curve_type']).upcase
  curve = 'SIGMOID_MIGRATION' unless %w[LINEAR EXPONENTIAL SIGMOID_MIGRATION].include?(curve)
  chain = stringify(payload['token_chain']).upcase
  chain = 'SOLANA' unless %w[SOLANA ETHEREUM BASE].include?(chain)
  media_type = stringify(payload['media_type']).upcase
  media_type = 'IMAGE' unless %w[IMAGE VIDEO INTERACTIVE_CANVAS].include?(media_type)

  artifact_id = ID.unique
  station_hash = stringify(payload['provenance_hash'])
  station_hash = "adapter_sha256_#{artifact_id}" if station_hash.empty?

  artifact = tables.create_row(
    database_id: DATABASE_ID,
    table_id: 'artifacts',
    row_id: artifact_id,
    data: {
      name: name,
      ticker: ticker,
      tagline: tagline,
      description: description,
      lore: lore,
      media_type: media_type,
      media_url: optional_url(payload['media_url']),
      poster_url: optional_url(payload['poster_url']),
      ambient_color: stringify(payload['ambient_color'], '#00FF66'),
      creator_gnomie_id: gnomie_id,
      social_x: optional_url(payload['social_x']),
      social_telegram: optional_url(payload['social_telegram']),
      social_website: optional_url(payload['social_website']),
      social_discord: optional_url(payload['social_discord']),
      token_contract: stringify(payload['token_contract']),
      token_chain: chain,
      token_total_supply: integer_or(payload['token_total_supply'], 1_000_000_000),
      token_decimals: integer_or(payload['token_decimals'], 9),
      vision_summary: 'Brand new Artifact in genesis bonding phase. Informational only — not a return forecast.',
      commercial_status: 'INCUBATING',
      derivative_rights_allowed: true,
      licensing_terms: stringify(payload['licensing_terms'], 'Community remixing with creator attribution. Not an NFT collection.'),
      provenance_adapter: JSON.generate([{
        station: 1,
        name: 'Conception Seed',
        status: 'VERIFIED',
        hash: station_hash,
        timestamp: now,
        operator: gnomie_id,
        note: PROVENANCE_NOTE
      }]),
      provenance_note: PROVENANCE_NOTE
    }
  )

  tables.create_row(
    database_id: DATABASE_ID,
    table_id: 'markets',
    row_id: ID.unique,
    data: {
      artifact_id: artifact_id,
      price_usd: 0.0,
      price_native: 0.0,
      price_change_24h: 0.0,
      market_cap_usd: 0.0,
      liquidity_usd: float_or(payload['initial_liquidity_usd'], 0.0),
      volume_24h_usd: 0.0,
      transactions_24h: 0,
      holders_count: 1,
      buy_count_24h: 0,
      sell_count_24h: 0,
      volatility_score: 10,
      age_days: 0,
      bonding_progress_pct: 0,
      trend: 'STABLE',
      captured_at: now
    }
  )

  tables.create_row(
    database_id: DATABASE_ID,
    table_id: 'creator_economics',
    row_id: ID.unique,
    data: {
      artifact_id: artifact_id,
      creator_reward_share_pct: 1.0,
      platform_fee_pct: 0.3,
      network_gas_est_sol: 0.00005,
      liquidity_locked_pct: 99.0,
      bonding_curve_type: curve,
      migration_target_market_cap: float_or(payload['migration_target_market_cap'], 69_000.0),
      disclaimer: ECONOMICS_DISCLAIMER
    }
  )

  tables.create_row(
    database_id: DATABASE_ID,
    table_id: 'signals',
    row_id: ID.unique,
    data: {
      artifact_id: artifact_id,
      dimension: 'AGE',
      label: 'Fresh Sprout',
      observation: 'Just emerged into The Grove. Bonding curve initialized. Informational only.',
      intensity: 'LOW',
      score: 15,
      is_financial_advice: false,
      disclaimer: VISION_DISCLAIMER
    }
  )

  artifact
end

def tables_client(context)
  endpoint = first_present(
    ENV['APPWRITE_ENDPOINT'],
    ENV['APPWRITE_FUNCTION_API_ENDPOINT'],
    'https://cloud.appwrite.io/v1'
  )
  project = first_present(
    ENV['APPWRITE_PROJECT_ID'],
    ENV['APPWRITE_FUNCTION_PROJECT_ID']
  )
  key = first_present(
    ENV['APPWRITE_API_KEY'],
    ENV['APPWRITE_FUNCTION_API_KEY']
  )

  raise 'Missing APPWRITE_PROJECT_ID (set in Console function vars)' if project.to_s.empty?
  raise 'Missing APPWRITE_API_KEY (set as a secret function var; do not commit it)' if key.to_s.empty?

  context.log("GROW using endpoint=#{endpoint} project=#{project} database=#{DATABASE_ID}")

  Client.new
        .set_endpoint(endpoint)
        .set_project(project)
        .set_key(key)
        .then { |client| TablesDB.new(client) }
end

def json_error(context, status, message)
  context.res.json({ ok: false, error: message, disclaimer: ECONOMICS_DISCLAIMER }, status)
end

def stringify(value, fallback = '')
  text = value.nil? ? '' : value.to_s.strip
  text.empty? ? fallback : text
end

def normalize_ticker(value)
  ticker = stringify(value).upcase
  return '' if ticker.empty?

  ticker.start_with?('$') ? ticker : "$#{ticker}"
end

def optional_url(value)
  text = stringify(value)
  text.empty? ? nil : text
end

def truthy?(value)
  value == true || value.to_s.strip.downcase == 'true'
end

def integer_or(value, fallback)
  Integer(value)
rescue ArgumentError, TypeError
  fallback
end

def float_or(value, fallback)
  Float(value)
rescue ArgumentError, TypeError
  fallback
end

def first_present(*values)
  values.find { |value| !value.to_s.strip.empty? }
end
