import React, { useState } from 'react';
import { Artifact } from '../types/domain';
import { GnomieAvatar } from './GnomieAvatar';
import { InteractiveMarketChart } from './InteractiveMarketChart';
import { GnomieVisionPanel } from './GnomieVisionPanel';
import { TradeModal } from './TradeModal';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  ExternalLink, 
  Share2, 
  BookOpen, 
  ArrowLeft,
  Lock,
  Layers,
  FileCheck2,
  Users,
  Coins,
  History,
  MessageSquare
} from 'lucide-react';
import { slayAudio } from '../utils/audio';

interface ArtifactDetailViewProps {
  artifact: Artifact;
  onBack: () => void;
  onOpenLearn: (topicSlug?: string) => void;
}

export const ArtifactDetailView: React.FC<ArtifactDetailViewProps> = ({
  artifact,
  onBack,
  onOpenLearn
}) => {
  const [viewMode, setViewMode] = useState<'BEGINNER' | 'ADVANCED'>('BEGINNER');
  const [activeTab, setActiveTab] = useState<'MARKET' | 'SIGNALS' | 'PROVENANCE' | 'ECONOMICS' | 'LORE'>('MARKET');
  const [isTradeOpen, setIsTradeOpen] = useState<boolean>(false);
  const [newComment, setNewComment] = useState<string>('');
  const [comments, setComments] = useState(artifact.comments);

  const isPositive = artifact.market.priceChange24h >= 0;

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    slayAudio.playSubtleTick();
    setComments([
      ...comments,
      {
        id: `c-${Date.now()}`,
        gnomieId: 'GNOMIE #48291',
        author: 'You (Gnomie #48291)',
        tier: 'EXPERT',
        text: newComment.trim(),
        timestamp: 'Just now'
      }
    ]);
    setNewComment('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-xs font-mono text-chrome-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO GROVE</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Beginner / Advanced Mode Toggle */}
          <div className="glass-panel rounded-full p-1 flex items-center border border-white/10 text-xs font-mono">
            <button
              onClick={() => {
                slayAudio.playSubtleTick();
                setViewMode('BEGINNER');
              }}
              className={`px-3 py-1 rounded-full transition-all ${
                viewMode === 'BEGINNER' ? 'bg-electric-green text-obsidian-950 font-bold' : 'text-chrome-400 hover:text-white'
              }`}
            >
              Beginner View
            </button>
            <button
              onClick={() => {
                slayAudio.playSubtleTick();
                setViewMode('ADVANCED');
              }}
              className={`px-3 py-1 rounded-full transition-all ${
                viewMode === 'ADVANCED' ? 'bg-electric-green text-obsidian-950 font-bold' : 'text-chrome-400 hover:text-white'
              }`}
            >
              Advanced Data
            </button>
          </div>

          <button
            onClick={() => onOpenLearn('artifact-vs-nft')}
            className="p-2 rounded-full glass-panel text-chrome-400 hover:text-white transition-colors"
            title="Learn about Artifacts"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left Hero & Identity, Right Live Market Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (5 Cols): Media, Creator & Lore */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-white/10 overflow-hidden relative">
            <div 
              className="absolute inset-0 opacity-15 blur-2xl pointer-events-none"
              style={{ backgroundColor: artifact.media.ambientColor }}
            />

            {/* Media Asset */}
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-obsidian-900 border border-white/10 mb-6 relative">
              {artifact.media.type === 'IMAGE' ? (
                <img
                  src={artifact.media.url}
                  alt={artifact.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-obsidian-900 to-obsidian-950 p-8">
                  <GnomieAvatar seed={artifact.id} size="hero" expression="mystical" auraColor={artifact.media.ambientColor} />
                </div>
              )}

              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-obsidian-950/80 backdrop-blur-md border border-white/10 text-xs font-mono text-electric-green font-bold">
                {artifact.ticker}
              </div>
            </div>

            {/* Artifact Names */}
            <div className="space-y-2 mb-6">
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-chrome-100">
                {artifact.name}
              </h1>
              <p className="text-sm text-chrome-300 font-light leading-relaxed">
                {artifact.tagline}
              </p>
            </div>

            {/* Creator Information */}
            <div className="p-4 rounded-2xl bg-obsidian-900 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GnomieAvatar seed={artifact.creator.id} size="md" expression="wise" auraColor={artifact.media.ambientColor} />
                <div>
                  <p className="text-xs font-mono text-chrome-400">Creator & Root Sower</p>
                  <p className="text-sm font-mono text-chrome-100 font-bold flex items-center gap-1">
                    <span>{artifact.creator.name}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-electric-green" />
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-electric-green/10 text-electric-green text-[10px] font-mono font-semibold">
                {artifact.creator.tier}
              </span>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 text-xs font-mono text-chrome-400">
              {artifact.socials.x && (
                <a href={artifact.socials.x} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-electric-green transition-colors">
                  <span>X / Twitter</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {artifact.socials.telegram && (
                <a href={artifact.socials.telegram} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-electric-green transition-colors ml-4">
                  <span>Telegram</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Lore & Narrative Accordion */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-3">
            <h3 className="font-display text-xl font-bold text-chrome-100">Grove Lore & History</h3>
            <p className="text-xs text-chrome-300 font-sans leading-relaxed">
              {artifact.lore}
            </p>
          </div>
        </div>

        {/* Right Column (7 Cols): Live Market, Signals, Tabs, Trade CTA */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Market Header Statistics Bar */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-chrome-400">Current Market Price</p>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="font-mono text-3xl sm:text-4xl font-bold text-chrome-100">
                    ${artifact.market.priceUsd.toFixed(6)}
                  </span>
                  <div className={`inline-flex items-center gap-1 text-sm font-mono font-bold ${isPositive ? 'text-electric-green' : 'text-rose-400'}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{isPositive ? '+' : ''}{artifact.market.priceChange24h.toFixed(1)}% (24h)</span>
                  </div>
                </div>
              </div>

              {/* Trade Action Trigger */}
              <button
                onClick={() => setIsTradeOpen(true)}
                className="px-8 py-3.5 rounded-full bg-electric-green text-obsidian-950 font-bold font-mono text-sm tracking-wide hover:scale-105 transition-all box-glow-green"
              >
                TRADE {artifact.ticker}
              </button>
            </div>

            {/* Beginner Explanation vs Advanced Grid */}
            {viewMode === 'BEGINNER' ? (
              <div className="p-4 rounded-2xl bg-electric-green/5 border border-electric-green/20 text-xs font-mono space-y-2">
                <p className="text-electric-green font-bold">What is happening in this market?</p>
                <p className="text-chrome-300 font-sans leading-relaxed">
                  {artifact.visionSummary}
                </p>
              </div>
            ) : null}

            {/* Multi-Stat Data Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/5">
                <span className="text-chrome-400 block text-[11px]">Market Cap</span>
                <span className="text-chrome-100 font-bold text-sm sm:text-base">${(artifact.market.marketCapUsd / 1000).toFixed(1)}k</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/5">
                <span className="text-chrome-400 block text-[11px]">Liquidity</span>
                <span className="text-chrome-100 font-bold text-sm sm:text-base">${(artifact.market.liquidityUsd / 1000).toFixed(1)}k</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/5">
                <span className="text-chrome-400 block text-[11px]">24h Volume</span>
                <span className="text-chrome-100 font-bold text-sm sm:text-base">${(artifact.market.volume24hUsd / 1000).toFixed(1)}k</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/5">
                <span className="text-chrome-400 block text-[11px]">Holders</span>
                <span className="text-chrome-100 font-bold text-sm sm:text-base">{artifact.market.holdersCount.toLocaleString()}</span>
              </div>
            </div>

            {/* Interactive Continuous Bonding Chart */}
            <InteractiveMarketChart
              basePrice={artifact.market.priceUsd}
              priceChange24h={artifact.market.priceChange24h}
              ambientColor={artifact.media.ambientColor}
            />
          </div>

          {/* Navigation Tabs (Signals / Provenance / Economics / Comments) */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5 text-xs font-mono">
              <button
                onClick={() => setActiveTab('SIGNALS')}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  activeTab === 'SIGNALS' ? 'bg-electric-green text-obsidian-950 font-bold' : 'text-chrome-400 hover:text-white'
                }`}
              >
                GNOMIE Vision Signals
              </button>
              <button
                onClick={() => setActiveTab('PROVENANCE')}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  activeTab === 'PROVENANCE' ? 'bg-electric-green text-obsidian-950 font-bold' : 'text-chrome-400 hover:text-white'
                }`}
              >
                25SHA Provenance
              </button>
              <button
                onClick={() => setActiveTab('ECONOMICS')}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  activeTab === 'ECONOMICS' ? 'bg-electric-green text-obsidian-950 font-bold' : 'text-chrome-400 hover:text-white'
                }`}
              >
                Creator Economics
              </button>
              <button
                onClick={() => setActiveTab('LORE')}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  activeTab === 'LORE' ? 'bg-electric-green text-obsidian-950 font-bold' : 'text-chrome-400 hover:text-white'
                }`}
              >
                Community ({comments.length})
              </button>
            </div>

            {/* TAB CONTENT: GNOMIE Vision Signals */}
            {activeTab === 'SIGNALS' && (
              <GnomieVisionPanel signals={artifact.signals} summary={artifact.visionSummary} />
            )}

            {/* TAB CONTENT: 25SHA Provenance Lifecycle */}
            {activeTab === 'PROVENANCE' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-chrome-400">
                  <span>Sacred Loop / 25SHA Audit Trail</span>
                  <span className="text-electric-green">Immutable Receipts Attached</span>
                </div>
                <div className="space-y-3">
                  {artifact.provenance.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-obsidian-900 border border-white/5 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-obsidian-800 flex items-center justify-center text-[10px] text-chrome-300">
                          {p.station}
                        </span>
                        <div>
                          <p className="text-chrome-100 font-bold">{p.name}</p>
                          <p className="text-[10px] text-chrome-500">{p.operator} · {p.timestamp}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded bg-electric-green/10 text-electric-green text-[10px] font-bold">
                          {p.status}
                        </span>
                        <p className="text-[9px] text-chrome-500 font-mono mt-0.5">{p.hash}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Creator Economics */}
            {activeTab === 'ECONOMICS' && (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-obsidian-900 border border-white/5 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-chrome-400">Creator Reward Share:</span>
                    <span className="text-electric-green font-bold">{artifact.economics.creatorRewardSharePct}% of trade volume</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-chrome-400">Platform Protocol Fee:</span>
                    <span className="text-chrome-200">{artifact.economics.platformFeePct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-chrome-400">Liquidity Lock Rate:</span>
                    <span className="text-turquoise-400">{artifact.economics.liquidityLockedPct}% Immutable</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-chrome-400">Curve Architecture:</span>
                    <span className="text-chrome-200">{artifact.economics.bondingCurveType}</span>
                  </div>
                </div>
                <p className="text-[11px] text-chrome-400 font-sans italic">
                  "{artifact.economics.disclaimer}"
                </p>
              </div>
            )}

            {/* TAB CONTENT: Community Comments */}
            {activeTab === 'LORE' && (
              <div className="space-y-4">
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Contribute lore or market observation..."
                    className="flex-1 bg-obsidian-900 border border-white/10 rounded-xl px-4 py-2 text-xs font-sans text-chrome-100 placeholder:text-chrome-500 focus:outline-none focus:border-electric-green"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-electric-green text-obsidian-950 font-mono text-xs font-bold hover:scale-105 transition-all"
                  >
                    POST
                  </button>
                </form>

                <div className="space-y-2">
                  {comments.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-obsidian-900 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-chrome-300 font-bold">{c.author}</span>
                        <span className="text-[10px] text-chrome-500">{c.timestamp}</span>
                      </div>
                      <p className="text-xs text-chrome-300 font-sans">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Trade Modal Drawer */}
      {isTradeOpen && (
        <TradeModal
          artifact={artifact}
          onClose={() => setIsTradeOpen(false)}
          onSuccess={() => setIsTradeOpen(false)}
        />
      )}
    </div>
  );
};
