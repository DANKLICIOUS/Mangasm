import React, { useState } from 'react';
import { Artifact, CreatorEconomics } from '../types/domain';
import { GnomieAvatar } from './GnomieAvatar';
import { Sparkles, ArrowRight, ArrowLeft, ShieldAlert, CheckCircle2, Info, Lock, Zap } from 'lucide-react';
import { slayAudio } from '../utils/audio';

interface GrowWizardProps {
  onArtifactCreated: (artifact: Artifact) => void;
  onCancel: () => void;
}

export const GrowWizard: React.FC<GrowWizardProps> = ({ onArtifactCreated, onCancel }) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>('');
  const [ticker, setTicker] = useState<string>('');
  const [tagline, setTagline] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [lore, setLore] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState<string>('https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80');
  const [ambientColor, setAmbientColor] = useState<string>('#00FF66');
  const [xLink, setXLink] = useState<string>('');
  const [tgLink, setTgLink] = useState<string>('');

  // Bonding & Economics Parameters
  const [initialBuySol, setInitialBuySol] = useState<string>('0.1');
  const [curveType, setCurveType] = useState<'LINEAR' | 'EXPONENTIAL' | 'SIGMOID_MIGRATION'>('SIGMOID_MIGRATION');
  const [riskAcknowledged, setRiskAcknowledged] = useState<boolean>(false);

  const creatorEconomics: CreatorEconomics = {
    creatorRewardSharePct: 1.0,
    platformFeePct: 0.3,
    networkGasEstSol: 0.00005,
    liquidityLockedPct: 99.0,
    bondingCurveType: curveType,
    migrationTargetMarketCap: 69000,
    disclaimer: 'Creator rewards are programmatic distribution shares from protocol transaction activity, not guaranteed investment returns.'
  };

  const handleNext = () => {
    slayAudio.playSubtleTick();
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrev = () => {
    slayAudio.playSubtleTick();
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riskAcknowledged) return;

    setIsSubmitting(true);
    slayAudio.playPortalSwell();

    setTimeout(() => {
      const newArtifact: Artifact = {
        id: `grown-${Date.now()}`,
        name: name.trim() || 'Forest Phantasm',
        ticker: (ticker.startsWith('$') ? ticker : `$${ticker}`).toUpperCase() || '$PHANTASM',
        tagline: tagline.trim() || 'A new spore emerges from the damp Grove.',
        description: description.trim() || 'A living community artifact cultivated in the Sacred Loop.',
        lore: lore.trim() || 'Grown by an autonomous Gnomie in the dawn hours.',
        media: {
          type: 'IMAGE',
          url: mediaUrl,
          ambientColor: ambientColor
        },
        creator: {
          id: 'GNOMIE #48291',
          name: 'You (Gnomie #48291)',
          tier: 'EXPERT',
          avatarUrl: ''
        },
        socials: {
          x: xLink || undefined,
          telegram: tgLink || undefined
        },
        token: {
          contractAddress: `8xG${Math.random().toString(36).substring(2, 8).toUpperCase()}_SLAY`,
          chain: 'SOLANA',
          totalSupply: 1_000_000_000,
          decimals: 9
        },
        market: {
          priceUsd: 0.000035,
          priceNative: 0.00000024,
          priceChange24h: 0.0,
          marketCapUsd: 35000,
          liquidityUsd: 12000,
          volume24hUsd: 840,
          transactions24h: 1,
          holdersCount: 1,
          buyCount24h: 1,
          sellCount24h: 0,
          volatilityScore: 10,
          ageDays: 0,
          bondingProgressPct: 15
        },
        signals: [
          {
            dimension: 'AGE',
            label: 'Fresh Sprout',
            observation: 'Just emerged into the Grove. Bonding curve initialized.',
            intensity: 'LOW',
            score: 15
          }
        ],
        visionSummary: 'Brand new Artifact in genesis bonding phase. Healthy initial liquidity seed locked.',
        economics: creatorEconomics,
        provenance: [
          { station: 1, name: 'Conception Seed', status: 'VERIFIED', hash: `sha256_${Date.now()}`, timestamp: new Date().toISOString(), operator: 'GNOMIE #48291' }
        ],
        monetizeOS: {
          commercialStatus: 'INCUBATING',
          derivativeRightsAllowed: true,
          licensingTerms: 'Standard CC0 meme remixing with 0.5% creator attribution split.'
        },
        comments: []
      };

      slayAudio.playHarmonicSuccess();
      setIsSubmitting(false);
      onArtifactCreated(newArtifact);
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Wizard Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-green/10 text-electric-green border border-electric-green/20 text-xs font-mono mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>GROWING PROTOCOL · STEP {step} OF 4</span>
        </div>
        <h2 className="font-display text-4xl font-bold text-chrome-100">
          {step === 1 && 'What are we growing?'}
          {step === 2 && 'Meme Identity & Lore'}
          {step === 3 && 'Transparent Creator Economics'}
          {step === 4 && 'Risk Disclosure & Ignition'}
        </h2>
        <p className="text-xs font-mono text-chrome-400 max-w-md mx-auto mt-2">
          {step === 1 && 'Define the core seed of your Artifact. Name and ticker form the permanent token identity.'}
          {step === 2 && 'Give your Artifact a cultural narrative, imagery, and community social roots.'}
          {step === 3 && 'Inspect programmatic rewards, liquidity locks, and non-negotiable fee schedules.'}
          {step === 4 && 'Review on-chain parameters and initialize the continuous bonding curve.'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-obsidian-800 rounded-full mb-8 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-turquoise-500 via-electric-green to-iridescent-start transition-all duration-300"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Wizard Body Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* STEP 1: Core Seed Concept */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-mono text-chrome-300 mb-1.5 uppercase">
                  Artifact Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Celestial Cap Mushroom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-obsidian-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-sans text-chrome-100 placeholder:text-chrome-600 focus:outline-none focus:border-electric-green"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-chrome-300 mb-1.5 uppercase">
                  Market Ticker ($SYMBOL) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. $CAP"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="w-full bg-obsidian-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono uppercase text-electric-green placeholder:text-chrome-600 focus:outline-none focus:border-electric-green"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-chrome-300 mb-1.5 uppercase">
                  One-Line Tagline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Glows brighter as the liquidity deepens."
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-obsidian-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-sans text-chrome-100 placeholder:text-chrome-600 focus:outline-none focus:border-electric-green"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Media, Lore & Socials */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-mono text-chrome-300 mb-1.5 uppercase">
                  Artifact Media URL (Image or Canvas)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full bg-obsidian-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-chrome-100 placeholder:text-chrome-600 focus:outline-none focus:border-electric-green"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-chrome-300 mb-1.5 uppercase">
                  Aura Ambient Color
                </label>
                <div className="flex items-center gap-3">
                  {['#00FF66', '#FF3B81', '#22D3EE', '#7000FF', '#FDE68A'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setAmbientColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        ambientColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-chrome-300 mb-1.5 uppercase">
                  Artifact Lore & Cultural Backstory
                </label>
                <textarea
                  rows={3}
                  placeholder="Where in the Grove was this discovered? What mystical properties does it possess?"
                  value={lore}
                  onChange={(e) => setLore(e.target.value)}
                  className="w-full bg-obsidian-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-sans text-chrome-100 placeholder:text-chrome-600 focus:outline-none focus:border-electric-green"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-chrome-400 mb-1">X / Twitter</label>
                  <input
                    type="text"
                    placeholder="https://x.com/..."
                    value={xLink}
                    onChange={(e) => setXLink(e.target.value)}
                    className="w-full bg-obsidian-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-chrome-100 focus:outline-none focus:border-electric-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-chrome-400 mb-1">Telegram Community</label>
                  <input
                    type="text"
                    placeholder="https://t.me/..."
                    value={tgLink}
                    onChange={(e) => setTgLink(e.target.value)}
                    className="w-full bg-obsidian-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-chrome-100 focus:outline-none focus:border-electric-green"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Transparent Creator Economics */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-electric-green/5 border border-electric-green/20 text-xs font-mono space-y-2">
                <div className="flex items-center gap-2 text-electric-green font-bold">
                  <Info className="w-4 h-4" />
                  <span>TRANSPARENT PROTOCOL BREAKDOWN</span>
                </div>
                <p className="text-chrome-300 font-sans leading-relaxed">
                  SLAY strictly discloses all protocol fees and creator mechanics. No hidden slippage taxes or arbitrary dev allocations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-obsidian-900 border border-white/5 space-y-1">
                  <p className="text-[11px] font-mono text-chrome-400">Creator Reward Share</p>
                  <p className="text-xl font-mono font-bold text-electric-green">1.0%</p>
                  <p className="text-[10px] text-chrome-500">Programmatic share of all trading volume.</p>
                </div>

                <div className="p-4 rounded-xl bg-obsidian-900 border border-white/5 space-y-1">
                  <p className="text-[11px] font-mono text-chrome-400">Platform Maintenance Fee</p>
                  <p className="text-xl font-mono font-bold text-chrome-200">0.3%</p>
                  <p className="text-[10px] text-chrome-500">Node infrastructure & Gnomie Vision AI compute.</p>
                </div>

                <div className="p-4 rounded-xl bg-obsidian-900 border border-white/5 space-y-1">
                  <p className="text-[11px] font-mono text-chrome-400">Liquidity Permanently Locked</p>
                  <p className="text-xl font-mono font-bold text-turquoise-400 flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    <span>99.0%</span>
                  </p>
                  <p className="text-[10px] text-chrome-500">Immutable lock until DEX migration target.</p>
                </div>

                <div className="p-4 rounded-xl bg-obsidian-900 border border-white/5 space-y-1">
                  <p className="text-[11px] font-mono text-chrome-400">DEX Migration Target</p>
                  <p className="text-xl font-mono font-bold text-iridescent-start">$69,000</p>
                  <p className="text-[10px] text-chrome-500">Graduates automatically to Raydium/Orca pools.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-chrome-300 mb-1.5 uppercase">
                  Bonding Curve Model
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['SIGMOID_MIGRATION', 'EXPONENTIAL', 'LINEAR'] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setCurveType(type)}
                      className={`p-3 rounded-xl border text-xs font-mono transition-all text-center ${
                        curveType === type
                          ? 'border-electric-green bg-electric-green/10 text-electric-green font-bold'
                          : 'border-white/5 bg-obsidian-900 text-chrome-400 hover:border-chrome-500'
                      }`}
                    >
                      {type === 'SIGMOID_MIGRATION' && 'Sigmoid (Default)'}
                      {type === 'EXPONENTIAL' && 'Exponential'}
                      {type === 'LINEAR' && 'Linear Flat'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Risk Disclosure & Confirmation */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <ShieldAlert className="w-4 h-4" />
                  <span>MANDATORY MARKET RISK DISCLOSURE</span>
                </div>
                <p className="leading-relaxed font-sans text-chrome-200">
                  Cryptocurrency markets and community meme Artifacts are highly volatile and speculative. SLAY does not guarantee token appreciation, liquidity migration, or future value. Never allocate capital you cannot afford to lose.
                </p>
              </div>

              {/* Summary Preview */}
              <div className="glass-panel-subtle rounded-2xl p-4 border border-white/5 space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-chrome-400">Artifact:</span>
                  <span className="text-chrome-100 font-bold">{name || 'Unnamed Spore'} ({ticker.toUpperCase() || '$TICKER'})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-chrome-400">Creator Account:</span>
                  <span className="text-electric-green">GNOMIE #48291 (You)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-chrome-400">Total Token Supply:</span>
                  <span className="text-chrome-200">1,000,000,000</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-chrome-400">Est. Network Ignition Gas:</span>
                  <span className="text-chrome-200">~0.00005 SOL</span>
                </div>
              </div>

              {/* Mandatory Checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-obsidian-900 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={riskAcknowledged}
                  onChange={(e) => setRiskAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 text-electric-green focus:ring-0"
                />
                <span className="text-xs text-chrome-300 font-sans leading-tight">
                  I understand that creating this Artifact initializes a live on-chain token market. I agree to the transparent creator economics and acknowledge that creator rewards depend strictly on observable protocol trading activity.
                </span>
              </label>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-panel text-xs font-mono text-chrome-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-mono text-chrome-500 hover:text-chrome-300"
              >
                Cancel
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={step === 1 && (!name || !ticker)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-electric-green text-obsidian-950 text-xs font-mono font-bold hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 box-glow-green"
              >
                <span>CONTINUE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!riskAcknowledged || isSubmitting}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-electric-green to-turquoise-400 text-obsidian-950 text-xs font-mono font-bold tracking-wider hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 shadow-xl shadow-electric-green/20"
              >
                {isSubmitting ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin" />
                    <span>SPROUTING INTO THE GROVE...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>IGNITE ARTIFACT MARKET</span>
                  </>
                )}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};
