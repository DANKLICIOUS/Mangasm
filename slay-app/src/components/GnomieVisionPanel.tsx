import React from 'react';
import { MarketSignal } from '../types/domain';
import { Sparkles, Eye, AlertCircle, BarChart3, ShieldCheck } from 'lucide-react';

interface GnomieVisionPanelProps {
  signals: MarketSignal[];
  summary: string;
}

export const GnomieVisionPanel: React.FC<GnomieVisionPanelProps> = ({ signals, summary }) => {
  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-obsidian-900 to-obsidian-850 border border-electric-green/20 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-electric-green animate-pulse" />
            <h4 className="font-mono text-xs font-bold text-electric-green tracking-wider uppercase">
              GNOMIE VISION · INTELLIGENT MARKET INTERPRETATION
            </h4>
          </div>
          <span className="text-[10px] font-mono text-chrome-400 bg-obsidian-950 px-2.5 py-0.5 rounded-full border border-white/5">
            Informational Analytics Only
          </span>
        </div>
        <p className="text-xs text-chrome-200 font-sans leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Multidimensional Signal Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {signals.map((sig, idx) => {
          const intensityColor = 
            sig.intensity === 'HIGH' ? 'text-electric-green border-electric-green/30 bg-electric-green/5' :
            sig.intensity === 'ELEVATED' ? 'text-turquoise-400 border-turquoise-400/30 bg-turquoise-400/5' :
            sig.intensity === 'MODERATE' ? 'text-iridescent-start border-iridescent-start/30 bg-iridescent-start/5' :
            'text-chrome-300 border-white/10 bg-obsidian-900';

          return (
            <div key={idx} className="p-3.5 rounded-xl bg-obsidian-900 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-chrome-400">{sig.dimension}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${intensityColor}`}>
                  {sig.intensity} ({sig.score}/100)
                </span>
              </div>
              <p className="text-xs text-chrome-200 font-bold font-display">{sig.label}</p>
              <p className="text-[11px] text-chrome-400 font-sans leading-tight">
                {sig.observation}
              </p>
            </div>
          );
        })}
      </div>

      {/* Regulatory & Safety Notice */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-obsidian-950 border border-white/5 text-[10px] font-mono text-chrome-500">
        <AlertCircle className="w-3.5 h-3.5 text-chrome-400 shrink-0 mt-0.5" />
        <span>
          Gnomie Vision provides algorithmic interpretation of verifiable on-chain metrics. Signals represent historical and present statistical observations and are never financial advice or profit guarantees.
        </span>
      </div>
    </div>
  );
};
