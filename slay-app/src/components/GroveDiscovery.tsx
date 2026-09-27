import React, { useState } from 'react';
import { Artifact } from '../types/domain';
import { ArtifactCard } from './ArtifactCard';
import { Search, Sparkles, Filter, Activity, Compass, MessageSquare } from 'lucide-react';
import { GnomieAvatar } from './GnomieAvatar';

interface GroveDiscoveryProps {
  artifacts: Artifact[];
  onSelectArtifact: (artifact: Artifact) => void;
  onTradeArtifact: (artifact: Artifact) => void;
  onGrowClick: () => void;
}

export const GroveDiscovery: React.FC<GroveDiscoveryProps> = ({
  artifacts,
  onSelectArtifact,
  onTradeArtifact,
  onGrowClick
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TRENDING' | 'NEW' | 'MIGRATED'>('ALL');

  const filteredArtifacts = artifacts.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'TRENDING') return item.market.volume24hUsd > 200000;
    if (activeFilter === 'NEW') return item.market.ageDays < 10;
    if (activeFilter === 'MIGRATED') return item.market.bondingProgressPct >= 100;
    return true;
  });

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Grove Social & Discovery Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-green/10 text-electric-green border border-electric-green/20 text-xs font-mono font-medium mb-3">
            <Compass className="w-3.5 h-3.5" />
            <span>THE GROVE SOCIAL LAYER</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-chrome-100">
            What's Growing in the Grove?
          </h2>
          <p className="text-chrome-400 max-w-xl text-sm sm:text-base mt-2">
            Explore live meme markets created by the community. Inspect on-chain liquidity depth, observe Gnomie Vision signals, and join the discourse.
          </p>
        </div>

        <button
          onClick={onGrowClick}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-electric-green via-turquoise-400 to-iridescent-start text-obsidian-950 font-bold text-sm tracking-wide shadow-lg shadow-electric-green/10 transition-all hover:scale-105"
        >
          <Sparkles className="w-4 h-4 text-obsidian-950 fill-current" />
          <span>GROW AN ARTIFACT</span>
        </button>
      </div>

      {/* Live Community Activity Stream Pill */}
      <div className="glass-panel-subtle rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex -space-x-2">
            <GnomieAvatar seed="comm-1" size="sm" auraColor="#00FF66" />
            <GnomieAvatar seed="comm-2" size="sm" auraColor="#FF3B81" />
            <GnomieAvatar seed="comm-3" size="sm" auraColor="#22D3EE" />
          </div>
          <div className="text-xs font-mono truncate">
            <span className="text-electric-green font-semibold">Live Activity:</span>{' '}
            <span className="text-chrome-300">GNOMIE #48291 swapped 2.4 SOL into $VOID</span>
            <span className="text-chrome-500 ml-2">· 45s ago</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-chrome-400 shrink-0">
          <Activity className="w-3.5 h-3.5 text-turquoise-400 animate-pulse" />
          <span>Realtime Root Synchronizer Active</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {(['ALL', 'TRENDING', 'NEW', 'MIGRATED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-xs font-mono font-medium transition-all ${
                activeFilter === filter
                  ? 'bg-electric-green text-obsidian-950 font-bold box-glow-green'
                  : 'glass-panel text-chrome-400 hover:text-chrome-100 hover:border-chrome-400'
              }`}
            >
              {filter === 'ALL' && 'All Artifacts'}
              {filter === 'TRENDING' && '🔥 Active Markets'}
              {filter === 'NEW' && '🌱 Fresh Spores'}
              {filter === 'MIGRATED' && '⚡ DEX Graduated'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-chrome-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search artifacts, tickers..."
            className="w-full bg-obsidian-900 border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs font-mono text-chrome-100 placeholder:text-chrome-500 focus:outline-none focus:border-electric-green transition-colors"
          />
        </div>
      </div>

      {/* Artifact Grid */}
      {filteredArtifacts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtifacts.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              onSelect={onSelectArtifact}
              onTrade={onTradeArtifact}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 glass-panel rounded-3xl p-8 border border-white/5 space-y-4">
          <GnomieAvatar seed="empty-grove" size="xl" expression="curious" auraColor="#7000FF" />
          <h3 className="font-display text-2xl text-chrome-200">The forest is quiet here.</h3>
          <p className="text-xs font-mono text-chrome-400 max-w-sm mx-auto">
            No Artifacts found matching your query. Be the first GNOMIE to sprout a new market in this clearing!
          </p>
          <button
            onClick={onGrowClick}
            className="px-6 py-2.5 rounded-full bg-electric-green text-obsidian-950 font-mono text-xs font-bold hover:scale-105 transition-transform"
          >
            GROW THIS ARTIFACT
          </button>
        </div>
      )}
    </section>
  );
};
