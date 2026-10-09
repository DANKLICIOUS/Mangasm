# frozen_string_literal: true

require 'appwrite'
require 'json'

# Shared TablesDB client for slay.llc Void Market / The Grove.
# Dynamic function key only — never persist API keys in source.
module Grove
  DATABASE_ID = ENV['APPWRITE_DATABASE_ID'] || ENV['GROVE_DATABASE_ID'] || 'grove'
  TABLE_ARTIFACT = 'artifacts'
  TABLE_GNOMIE = 'gnomies'
  TABLE_MARKET = 'markets'
  TABLE_TRADE = 'trades'
  TABLE_SIGNAL = 'signals'
  TABLE_COMMENT = 'comments'
  TABLE_REPUTATION = 'reputation'
  TABLE_LEARNING = 'learning_progress'
  TABLE_ECONOMICS = 'creator_economics'
  FORBIDDEN = %w[forge revx place_order place-order order_place nft-collection guaranteed-return].freeze

  module_function

  def header(context, key)
    headers = context.req.headers || {}
    headers[key] || headers[key.to_s.downcase]
  end

  def client(context)
    key = first_present(
      header(context, 'x-appwrite-key'),
      ENV['APPWRITE_API_KEY'],
      ENV['APPWRITE_FUNCTION_API_KEY']
    )
    raise 'Missing Appwrite API key (function dynamic key or APPWRITE_API_KEY secret)' if key.to_s.empty?

    project = first_present(ENV['APPWRITE_FUNCTION_PROJECT_ID'], ENV['APPWRITE_PROJECT_ID'])
    raise 'Missing APPWRITE_PROJECT_ID' if project.to_s.empty?

    Appwrite::Client.new
                    .set_endpoint(first_present(ENV['APPWRITE_FUNCTION_API_ENDPOINT'], ENV['APPWRITE_ENDPOINT'], 'https://cloud.appwrite.io/v1'))
                    .set_project(project)
                    .set_key(key)
  end

  def tables(context)
    Appwrite::TablesDB.new(client(context))
  end

  def json_body(context)
    body = context.req.body_json
    return stringify_keys(body) if body.is_a?(Hash)

    raw = context.req.body.to_s
    return {} if raw.strip.empty?

    parsed = JSON.parse(raw)
    parsed.is_a?(Hash) ? stringify_keys(parsed) : {}
  rescue JSON::ParserError
    {}
  end

  def stringify_keys(hash)
    hash.each_with_object({}) { |(key, value), acc| acc[key.to_s] = value }
  end

  def forbidden_payload?(payload)
    haystack = payload.to_s.downcase
    FORBIDDEN.any? { |token| haystack.include?(token) }
  end

  def reject_forbidden(context)
    context.res.json({
      'ok' => false,
      'error' => 'FORGE, NFT-collection framing, guaranteed returns, and live order placement are disabled. GROW creates Artifacts; Trade only simulates.'
    }, 400)
  end

  def normalize_ticker(raw)
    ticker = raw.to_s.strip.upcase
    return '' if ticker.empty?

    ticker.start_with?('$') ? ticker : "$#{ticker}"
  end

  def first_present(*values)
    values.find { |value| !value.to_s.strip.empty? }
  end
end
