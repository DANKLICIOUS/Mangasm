import React from 'react';
import { Artifact } from '../types/domain';
import { GnomieAvatar } from './GnomieAvatar';
import { TrendingUp, TrendingDown, Eye, Radio, Sparkles, ShieldCheck } from 'lucide-react';
import { slayAudio } from '../utils/audio';

interface ArtifactCardProps {
  artifact: Artifact;
  onSelect: (artifact: Artifact) => void;
  onTrade: (artifact: Artifact) => void;
}

export const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onSelect, onTrade }) => {
  const isPositive = artifact.market.priceChange24h >= 0;

  const handleCardClick = () => {
    slayAudio.playSubtleTick();
    onSelect(artifact);
  };

  const handleTradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    slayAudio.playSubtleTick();
    onTrade(artifact);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col rounded-3xl glass-panel p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-chrome-400 hover:shadow-2xl hover:shadow-electric-green/10"
      style={{
        boxShadow: `0 10px 30px -10px ${artifact.media.ambientColor}20`
      }}
    >
      {/* Ambient background hover flare */}
      <div 
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-15 transition-opacity duration-500 pointer-events-none blur-xl"
        style={{ backgroundColor: artifact.media.ambientColor }}
      />

      {/* Media & Badge Header */}
      <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-obsidian-900 border border-white/5 mb-4">
        {artifact.media.type === 'IMAGE' ? (
          <img
            src={artifact.media.url}
            alt={artifact.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-obsidian-900 via-obsidian-850 to-obsidian-950 p-6 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-electric-green/20 animate-ping absolute inset-0" />
              <GnomieAvatar seed={artifact.id} size="lg" expression="mystical" auraColor={artifact.media.ambientColor} />
            </div>
          </div>
        )}

        {/* Chain & Ticker Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-obsidian-950/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-chrome-200">
          <span className="font-bold text-electric-green">{artifact.ticker}</span>
          <span className="text-chrome-500">·</span>
          <span>{artifact.token.chain}</span>
        </div>

        {/* Bonding Curve Progress Pill */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-obsidian-950/80 backdrop-blur-md border border-white/10 text-[11px] font-mono">
          <Radio className="w-3 h-3 text-turquoise-400 animate-pulse" />
          <span className="text-chrome-300">Bonding: {artifact.market.bondingProgressPct}%</span>
        </div>
      </div>

      {/* Artifact Identity */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-display text-2xl font-bold text-chrome-100 group-hover:text-electric-green transition-colors">
            {artifact.name}
          </h3>
          <p className="text-xs text-chrome-400 line-clamp-1">{artifact.tagline}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-bold text-chrome-100">${artifact.market.priceUsd.toFixed(6)}</p>
          <div className={`inline-flex items-center gap-0.5 text-xs font-mono font-semibold ${isPositive ? 'text-electric-green' : 'text-rose-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{isPositive ? '+' : ''}{artifact.market.priceChange24h.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Visual Activity & Health Meters (Non-crypto representation) */}
      <div className="space-y-2 py-3 my-2 border-y border-white/5 text-xs font-mono">
        <div>
          <div className="flex justify-between text-[11px] text-chrome-400 mb-1">
            <span>Market Activity (Velocity)</span>
            <span className="text-chrome-200">{artifact.market.transactions24h.toLocaleString()} txs/24h</span>
          </div>
          <div className="w-full h-1.5 bg-obsidian-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-turquoise-500 to-electric-green rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (artifact.market.transactions24h / 5000) * 100)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] text-chrome-400 mb-1">
            <span>Liquidity Root Pool</span>
            <span className="text-chrome-200">${(artifact.market.liquidityUsd / 1000).toFixed(0)}k Depth</span>
          </div>
          <div className="w-full h-1.5 bg-obsidian-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-iridescent-mid to-turquoise-400 rounded-full"
              style={{ width: `${Math.min(100, (artifact.market.liquidityUsd / 500000) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Creator & Signal Teaser Footer */}
      <div className="flex items-center justify-between pt-1 mt-auto">
        <div className="flex items-center gap-2">
          <GnomieAvatar seed={artifact.creator.id} size="sm" expression="wise" auraColor={artifact.media.ambientColor} />
          <div className="text-left">
            <p className="text-[11px] font-mono text-chrome-300 flex items-center gap-1">
              <span>{artifact.creator.name}</span>
              <ShieldCheck className="w-3 h-3 text-electric-green" />
            </p>
            <p className="text-[10px] text-chrome-500 font-mono">{artifact.creator.tier}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTradeClick}
            className="px-3 py-1.5 rounded-full bg-electric-green/10 text-electric-green border border-electric-green/30 text-xs font-mono font-semibold transition-all hover:bg-electric-green hover:text-obsidian-950"
          >
            TRADE
          </button>
          <div className="p-1.5 rounded-full glass-panel text-chrome-400 group-hover:text-chrome-100">
            <Eye className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
