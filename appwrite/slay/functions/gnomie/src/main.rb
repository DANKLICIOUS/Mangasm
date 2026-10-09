# frozen_string_literal: true

require_relative 'grove'

include Appwrite

# Gnomie identity + participation reputation. Not a financial score. No FORGE.
def main(context)
  payload = Grove.json_body(context)
  return Grove.reject_forbidden(context) if Grove.forbidden_payload?(payload)

  tables = Grove.tables(context)
  query = context.req.query || {}

  if context.req.method == 'GET'
    gnomie_id = query['gnomie_id'] || query['gnomieId'] || query['id']
    if gnomie_id && !gnomie_id.to_s.empty?
      row = tables.get_row(database_id: Grove::DATABASE_ID, table_id: Grove::TABLE_GNOMIE, row_id: gnomie_id)
      return context.res.json({ 'ok' => true, 'gnomie' => row })
    end

    rows = tables.list_rows(
      database_id: Grove::DATABASE_ID,
      table_id: Grove::TABLE_GNOMIE,
      queries: [Query.limit(25), Query.order_desc('reputation_score')]
    )
    return context.res.json({ 'ok' => true, 'gnomies' => rows })
  end

  unless %w[POST PUT PATCH].include?(context.req.method.to_s.upcase)
    return context.res.json({ 'ok' => false, 'error' => 'Use GET, POST, or PATCH.' }, 405)
  end

  handle = payload['handle'].to_s.strip
  return context.res.json({ 'ok' => false, 'error' => 'handle is required.' }, 400) if handle.empty?

  tier = payload['tier'].to_s
  tier = 'NOVICE' unless %w[NOVICE EXPERT MENTOR TOP_1_PERCENT].include?(tier)

  row = tables.create_row(
    database_id: Grove::DATABASE_ID,
    table_id: Grove::TABLE_GNOMIE,
    row_id: payload['id'].to_s.empty? ? ID.unique : payload['id'],
    data: {
      'handle' => handle,
      'avatar_url' => payload['avatar_url'] || payload['avatarUrl'],
      'avatar_seed' => (payload['avatar_seed'] || payload['avatarSeed']).to_s,
      'joined_at' => payload['joined_at'] || payload['joinedDate'],
      'tier' => tier,
      'reputation_score' => (payload['reputation_score'] || payload['reputationScore'] || 0).to_i,
      'learning_progress' => (payload['learning_progress'] || payload['learningProgress'] || 0).to_i,
      'artifacts_grown' => (payload['artifacts_grown'] || payload['artifactsGrown'] || 0).to_i,
      'trades_executed' => (payload['trades_executed'] || payload['tradesExecuted'] || 0).to_i,
      'mentorship_helps' => (payload['mentorship_helps'] || payload['mentorshipHelps'] || 0).to_i,
      'community_contributions' => (payload['community_contributions'] || payload['communityContributions'] || 0).to_i,
      'tenure_days' => (payload['tenure_days'] || payload['tenureDays'] || 0).to_i,
      'badges' => Array(payload['badges'] || []),
      'wallet_address' => payload['wallet_address'] || payload['walletAddress']
    }
  )

  context.res.json({ 'ok' => true, 'gnomie' => row })
rescue Appwrite::Exception => e
  context.error(e.message)
  context.res.json({ 'ok' => false, 'error' => e.message }, 400)
end
