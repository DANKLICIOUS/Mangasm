import React, { useState, useEffect } from 'react';
import { 
  INITIAL_ARTIFACTS, 
  INITIAL_GNOMIE_USER, 
  SCHOOL_LESSONS 
} from './data/mockData';
import { Artifact, GnomieUser, WalletState } from './types/domain';
import { HeroPortal } from './components/HeroPortal';
import { GroveDiscovery } from './components/GroveDiscovery';
import { ArtifactDetailView } from './components/ArtifactDetailView';
import { GrowWizard } from './components/GrowWizard';
import { GnomieSchool } from './components/GnomieSchool';
import { GnomieProfileView } from './components/GnomieProfileView';
import { WalletModal } from './components/WalletModal';
import { TradeModal } from './components/TradeModal';
import { AmbientParticles } from './components/AmbientParticles';
import { GnomieAvatar } from './components/GnomieAvatar';
import { 
  Compass, 
  Sparkles, 
  GraduationCap, 
  TrendingUp, 
  Wallet, 
  Volume2, 
  VolumeX, 
  Search,
  Menu,
  X
} from 'lucide-react';
import { slayAudio } from './utils/audio';

export const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'HERO' | 'GROVE' | 'GROW' | 'SCHOOL' | 'PROFILE'>('HERO');
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [tradeTargetArtifact, setTradeTargetArtifact] = useState<Artifact | null>(null);

  // App Data State
  const [artifacts, setArtifacts] = useState<Artifact[]>(INITIAL_ARTIFACTS);
  const [user, setUser] = useState<GnomieUser>(INITIAL_GNOMIE_USER);
  
  // Wallet State
  const [walletState, setWalletState] = useState<WalletState>({
    status: 'CONNECTED',
    address: '8Xv...4pQ9',
    balanceSol: 8.42,
    balanceUsd: 1263.00,
    gnomieProfile: INITIAL_GNOMIE_USER
  });
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);

  // Audio / Sound FX
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Realtime Market Ticker Simulator
  useEffect(() => {
    const interval = setInterval(() => {
      setArtifacts((prev) =>
        prev.map((art) => {
          // Slight random drift
          const delta = (Math.random() - 0.49) * 0.008;
          const newPrice = Math.max(0.000001, art.market.priceUsd * (1 + delta));
          const newTx = art.market.transactions24h + (Math.random() > 0.6 ? 1 : 0);
          return {
            ...art,
            market: {
              ...art.market,
              priceUsd: newPrice,
              transactions24h: newTx,
              priceChange24h: art.market.priceChange24h + delta * 20
            }
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tab: 'HERO' | 'GROVE' | 'GROW' | 'SCHOOL' | 'PROFILE') => {
    slayAudio.playSubtleTick();
    setSelectedArtifact(null);
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleArtifactCreated = (newArt: Artifact) => {
    setArtifacts([newArt, ...artifacts]);
    setSelectedArtifact(newArt);
    setActiveTab('GROVE');
    // Update user stats
    setUser((prev) => ({
      ...prev,
      signals: {
        ...prev.signals,
        artifactsGrown: prev.signals.artifactsGrown + 1
      }
    }));
  };

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    slayAudio.setMuted(next);
  };

  return (
    <div className="min-h-screen bg-obsidian-950 text-chrome-100 flex flex-col justify-between selection:bg-electric-green selection:text-obsidian-950 relative overflow-x-hidden">
      {/* Background Ambient Particles Canvas */}
      <AmbientParticles particleCount={35} glowColor="rgba(0, 255, 102, 0.3)" />

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/5 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Wordmark */}
          <div 
            onClick={() => handleTabChange('HERO')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-obsidian-900 to-obsidian-800 border border-electric-green/40 flex items-center justify-center box-glow-green transition-transform duration-300 group-hover:scale-110">
              <span className="font-display font-bold text-electric-green text-sm">S</span>
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-chrome-100 group-hover:text-electric-green transition-colors">
                SLAY<span className="text-electric-green font-mono text-xs ml-1 font-normal">.LLC</span>
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 glass-panel-subtle px-3 py-1.5 rounded-full border border-white/5">
            <button
              onClick={() => handleTabChange('GROVE')}
              className={`px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
                activeTab === 'GROVE' ? 'bg-electric-green text-obsidian-950 font-bold box-glow-green' : 'text-chrome-300 hover:text-white'
              }`}
            >
              GROVE
            </button>
            <button
              onClick={() => handleTabChange('GROW')}
              className={`px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
                activeTab === 'GROW' ? 'bg-electric-green text-obsidian-950 font-bold box-glow-green' : 'text-chrome-300 hover:text-white'
              }`}
            >
              GROW
            </button>
            <button
              onClick={() => handleTabChange('SCHOOL')}
              className={`px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
                activeTab === 'SCHOOL' ? 'bg-electric-green text-obsidian-950 font-bold box-glow-green' : 'text-chrome-300 hover:text-white'
              }`}
            >
              LEARN
            </button>
          </nav>

          {/* Right Header Controls (Sound, Wallet, Profile) */}
          <div className="flex items-center gap-3">
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-full glass-panel-subtle text-chrome-400 hover:text-white transition-colors"
              title={isMuted ? 'Unmute Atmosphere' : 'Mute Atmosphere'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-electric-green" />}
            </button>

            {/* Wallet Button */}
            <button
              onClick={() => {
                slayAudio.playSubtleTick();
                setIsWalletModalOpen(true);
              }}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border border-white/10 text-xs font-mono text-chrome-200 hover:border-electric-green transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-electric-green animate-pulse" />
              <span>{walletState.status === 'CONNECTED' ? `${walletState.balanceSol.toFixed(2)} SOL` : 'CONNECT WALLET'}</span>
            </button>

            {/* Gnomie Profile Button */}
            <div
              onClick={() => handleTabChange('PROFILE')}
              className="cursor-pointer hover:scale-105 transition-transform"
              title="Gnomie Profile"
            >
              <GnomieAvatar seed={user.avatarSeed} size="sm" expression="wise" auraColor="#00FF66" />
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full glass-panel text-chrome-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-panel border-b border-white/10 p-4 space-y-2 animate-fade-in">
            <button
              onClick={() => handleTabChange('GROVE')}
              className="w-full text-left py-2 px-3 rounded-xl font-mono text-xs text-chrome-200 hover:bg-obsidian-900"
            >
              GROVE (Discovery)
            </button>
            <button
              onClick={() => handleTabChange('GROW')}
              className="w-full text-left py-2 px-3 rounded-xl font-mono text-xs text-chrome-200 hover:bg-obsidian-900"
            >
              GROW (Create Artifact)
            </button>
            <button
              onClick={() => handleTabChange('SCHOOL')}
              className="w-full text-left py-2 px-3 rounded-xl font-mono text-xs text-chrome-200 hover:bg-obsidian-900"
            >
              LEARN (Gnomie School)
            </button>
            <button
              onClick={() => handleTabChange('PROFILE')}
              className="w-full text-left py-2 px-3 rounded-xl font-mono text-xs text-chrome-200 hover:bg-obsidian-900"
            >
              GNOMIE PROFILE
            </button>
          </div>
        )}
      </header>

      {/* MAIN CONTENT SURFACE */}
      <main className="flex-1 relative z-10">
        {selectedArtifact ? (
          <ArtifactDetailView
            artifact={selectedArtifact}
            onBack={() => setSelectedArtifact(null)}
            onOpenLearn={(slug) => {
              setSelectedArtifact(null);
              setActiveTab('SCHOOL');
            }}
          />
        ) : (
          <>
            {activeTab === 'HERO' && (
              <HeroPortal
                onEnterGrove={() => handleTabChange('GROVE')}
                onExploreArtifact={(id) => {
                  const target = artifacts.find((a) => a.id === id) || artifacts[0];
                  setSelectedArtifact(target);
                }}
              />
            )}

            {activeTab === 'GROVE' && (
              <GroveDiscovery
                artifacts={artifacts}
                onSelectArtifact={(art) => setSelectedArtifact(art)}
                onTradeArtifact={(art) => setTradeTargetArtifact(art)}
                onGrowClick={() => handleTabChange('GROW')}
              />
            )}

            {activeTab === 'GROW' && (
              <GrowWizard
                onArtifactCreated={handleArtifactCreated}
                onCancel={() => handleTabChange('GROVE')}
              />
            )}

            {activeTab === 'SCHOOL' && (
              <GnomieSchool
                lessons={SCHOOL_LESSONS}
                userLearningProgress={user.signals.learningProgress}
              />
            )}

            {activeTab === 'PROFILE' && (
              <GnomieProfileView
                user={user}
                onNavigateTab={(t) => handleTabChange(t)}
              />
            )}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-obsidian-950 py-10 px-4 sm:px-6 relative z-10 text-xs font-mono text-chrome-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-electric-green" />
            <span className="text-chrome-300 font-bold">SLAY.LLC</span>
            <span>· The Living Meme Market Ecosystem</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-chrome-400">
            <button onClick={() => handleTabChange('GROVE')} className="hover:text-electric-green transition-colors">Grove</button>
            <button onClick={() => handleTabChange('GROW')} className="hover:text-electric-green transition-colors">Grow</button>
            <button onClick={() => handleTabChange('SCHOOL')} className="hover:text-electric-green transition-colors">Gnomie School</button>
            <a href="/terms" target="_blank" rel="noreferrer" className="hover:text-electric-green transition-colors">Terms</a>
            <a href="/privacy" target="_blank" rel="noreferrer" className="hover:text-electric-green transition-colors">Privacy</a>
          </div>

          <div className="text-[10px] text-chrome-600">
            © 2026 SLAY.LLC · Built with Gnomie Vision Protocol
          </div>
        </div>
      </footer>

      {/* GLOBAL MODALS */}
      {isWalletModalOpen && (
        <WalletModal
          walletState={walletState}
          onConnect={() => {
            setWalletState({
              status: 'CONNECTED',
              address: '8Xv...4pQ9',
              balanceSol: 8.42,
              balanceUsd: 1263.00,
              gnomieProfile: user
            });
            setIsWalletModalOpen(false);
          }}
          onDisconnect={() => {
            setWalletState({
              status: 'DISCONNECTED',
              address: null,
              balanceSol: 0,
              balanceUsd: 0,
              gnomieProfile: null
            });
            setIsWalletModalOpen(false);
          }}
          onClose={() => setIsWalletModalOpen(false)}
        />
      )}

      {tradeTargetArtifact && (
        <TradeModal
          artifact={tradeTargetArtifact}
          onClose={() => setTradeTargetArtifact(null)}
          onSuccess={() => setTradeTargetArtifact(null)}
        />
      )}
    </div>
  );
};
