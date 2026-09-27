import React, { useState, useEffect } from 'react';
import { GnomieAvatar } from './GnomieAvatar';
import { slayAudio } from '../utils/audio';
import { Compass, Sparkles, ChevronDown } from 'lucide-react';

interface HeroPortalProps {
  onEnterGrove: () => void;
  onExploreArtifact: (id: string) => void;
}

export const HeroPortal: React.FC<HeroPortalProps> = ({ onEnterGrove, onExploreArtifact }) => {
  const [revealStep, setRevealStep] = useState<number>(0);
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);

  useEffect(() => {
    // Cinematic emotional sequence:
    // 0: Initial Atmospheric Void & Ganesh Portal
    // 1: Subtle Movement & First Gnomie appearance (2s)
    // 2: Second Gnomie & Living Atmosphere (4s)
    // 3: The Grove & Market Signals revealed (6s)
    const t1 = setTimeout(() => {
      setRevealStep(1);
      slayAudio.playGnomieChime();
    }, 1800);

    const t2 = setTimeout(() => {
      setRevealStep(2);
      slayAudio.playSubtleTick();
    }, 4200);

    const t3 = setTimeout(() => {
      setRevealStep(3);
    }, 6500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleEnterClick = () => {
    slayAudio.playPortalSwell();
    onEnterGrove();
  };

  return (
    <section className="relative min-h-[92vh] flex flex-col justify-between items-center px-4 sm:px-6 pt-12 pb-16 overflow-hidden">
      {/* Background Cinematic Portal / Canvas fallback */}
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        {/* Subtle Ambient Video / Portal Layer */}
        {!videoError ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => setVideoError(true)}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
              videoLoaded ? 'opacity-30 mix-blend-screen scale-105 filter contrast-125' : 'opacity-0'
            }`}
            poster="/assets/01-opening-hero.jpg"
          >
            <source src="/assets/runway.mp4" type="video/mp4" />
          </video>
        ) : null}

        {/* Dynamic Sacred Geometry / Ganesh Portal Glow */}
        <div className="absolute w-[600px] sm:w-[900px] h-[600px] sm:h-[900px] rounded-full bg-gradient-to-tr from-obsidian-950 via-electric-green/10 to-iridescent-mid/15 blur-3xl pointer-events-none animate-pulse-subtle" />
        <div className="absolute w-[400px] sm:w-[550px] h-[400px] sm:h-[550px] rounded-full border border-electric-green/20 animate-spin opacity-25 pointer-events-none" style={{ animationDuration: '60s' }} />
        <div className="absolute w-[300px] sm:w-[420px] h-[300px] sm:h-[420px] rounded-full border border-dashed border-turquoise-400/30 animate-spin opacity-20 pointer-events-none" style={{ animationDuration: '40s', animationDirection: 'reverse' }} />
        
        {/* Subtle radial dark overlay for high readability */}
        <div className="absolute inset-0 bg-radial from-transparent via-obsidian-950/70 to-obsidian-950 pointer-events-none" />
      </div>

      {/* Top minimal brand indicator */}
      <div className="relative z-10 text-center space-y-1">
        <p className="text-[11px] font-mono tracking-[0.35em] text-chrome-400 uppercase">
          SLAY.LLC · GANESH CINEMATIC PROTOCOL
        </p>
      </div>

      {/* Central Hero Core: Restrained Typography & Progressive Reveal */}
      <div className="relative z-10 max-w-4xl mx-auto text-center my-auto py-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel-subtle text-xs text-chrome-300 mb-6 border border-white/10">
          <span className="w-2 h-2 rounded-full bg-electric-green animate-ping" />
          <span className="font-mono text-electric-green">THE GROVE IS BREATHING</span>
          <span className="text-chrome-500">·</span>
          <span>4 Live Artifacts Active</span>
        </div>

        <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight text-chrome-100 leading-[0.95] mb-6">
          WELCOME TO<br />
          <span className="iridescent-gradient-text italic font-normal">THE GROVE.</span>
        </h1>

        <p className="max-w-xl mx-auto text-base sm:text-lg text-chrome-300 font-light leading-relaxed mb-8">
          A living world where memes become continuous cryptocurrency markets.
          Discovered, grown, and sustained by the GNOMIES.
        </p>

        {/* Primary Restrained Action */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleEnterClick}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-electric-green text-obsidian-950 font-bold text-base tracking-wide transition-all duration-300 hover:scale-105 box-glow-green"
          >
            <span>ENTER THE GROVE</span>
            <Compass className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45" />
          </button>

          <button
            onClick={() => onExploreArtifact('void-gnome-01')}
            className="inline-flex items-center gap-2 px-6 py-4 rounded-full glass-panel text-chrome-200 font-medium text-sm transition-all duration-200 hover:text-white hover:border-chrome-400"
          >
            <Sparkles className="w-4 h-4 text-electric-green" />
            <span>Discover $VOID Artifact</span>
          </button>
        </div>
      </div>

      {/* Progressive GNOMIE Inhabitants Appearance Strip */}
      <div className="relative z-10 w-full max-w-5xl mx-auto">
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <GnomieAvatar seed="hero-elder" size="md" expression="mystical" auraColor="#00FF66" />
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-electric-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-electric-green"></span>
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs font-mono text-electric-green font-semibold">GNOMIE #19382 (Elder Spore)</p>
                <p className="text-xs text-chrome-300">"Look into the mycelium. The market is just the roots talking."</p>
              </div>
            </div>

            {/* Revealed Second & Third Inhabitants */}
            <div className="flex items-center gap-4 sm:border-l sm:border-white/10 sm:pl-6">
              {revealStep >= 1 ? (
                <div className="flex items-center gap-2 animate-fade-in transition-all duration-500">
                  <GnomieAvatar seed="hero-wanderer" size="sm" expression="wise" auraColor="#7000FF" />
                  <div className="text-left hidden md:block">
                    <p className="text-[11px] font-mono text-chrome-300">GNOMIE #48291</p>
                    <p className="text-[10px] text-chrome-400">Curating $VOID</p>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-mono text-chrome-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-chrome-500 animate-pulse" />
                  <span>Sensing movement in the moss...</span>
                </div>
              )}

              {revealStep >= 2 && (
                <div className="flex items-center gap-2 animate-fade-in transition-all duration-500">
                  <GnomieAvatar seed="hero-alchemist" size="sm" expression="curious" auraColor="#FF3B81" />
                  <div className="text-left hidden lg:block">
                    <p className="text-[11px] font-mono text-chrome-300">GNOMIE #54190</p>
                    <p className="text-[10px] text-chrome-400">Brewed $SPORE</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleEnterClick}
              className="text-xs font-mono text-chrome-400 hover:text-electric-green flex items-center gap-1 transition-colors"
            >
              <span>Explore The Grove</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>

          </div>
        </div>
      </div>
    </section>
  );
};
