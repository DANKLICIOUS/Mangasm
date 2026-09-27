import React from 'react';
import { GnomieUser } from '../types/domain';
import { GnomieAvatar } from './GnomieAvatar';
import { ShieldCheck, Award, BookOpen, Sparkles, TrendingUp, Users, HeartHandshake, Info } from 'lucide-react';

interface GnomieProfileViewProps {
  user: GnomieUser;
  onNavigateTab: (tab: 'GROVE' | 'GROW' | 'SCHOOL') => void;
}

export const GnomieProfileView: React.FC<GnomieProfileViewProps> = ({ user, onNavigateTab }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      {/* Profile Card Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-electric-green/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
          <div className="relative">
            <GnomieAvatar seed={user.avatarSeed} size="xl" expression="wise" auraColor="#00FF66" />
            <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-electric-green text-obsidian-950 text-[10px] font-mono font-bold">
              {user.tier}
            </span>
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-chrome-100">
                {user.id}
              </h1>
              <span className="text-xs font-mono text-chrome-400">
                Inhabitant Since: <strong className="text-chrome-200">{user.joinedDate}</strong>
              </span>
            </div>

            <p className="text-xs font-mono text-electric-green">{user.handle}</p>
            <p className="text-sm text-chrome-300 max-w-xl font-light">
              Cultivating decentralized liquidity roots across the Sacred Loop. Signal interpreter and botanical mentor.
            </p>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
              {user.badges.map((b, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-obsidian-900 border border-white/5 text-[11px] font-mono text-chrome-300 flex items-center gap-1"
                >
                  <Award className="w-3 h-3 text-electric-green" />
                  <span>{b}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transparent Participation Reputation System */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-electric-green" />
            <h3 className="font-mono text-xs font-bold text-electric-green tracking-wider uppercase">
              TRANSPARENT REPUTATION & PARTICIPATION SIGNALS
            </h3>
          </div>
          <p className="text-xs font-mono text-chrome-400">
            Social reputation is derived from constructive platform contributions, not financial returns.
          </p>
        </div>

        {/* Breakdown Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div className="p-4 rounded-2xl bg-obsidian-900 border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-chrome-400 text-[10px]">
              <BookOpen className="w-3.5 h-3.5 text-turquoise-400" />
              <span>School Progress</span>
            </div>
            <p className="text-xl font-bold text-chrome-100">{user.signals.learningProgress}%</p>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-900 border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-chrome-400 text-[10px]">
              <Sparkles className="w-3.5 h-3.5 text-electric-green" />
              <span>Artifacts Grown</span>
            </div>
            <p className="text-xl font-bold text-chrome-100">{user.signals.artifactsGrown}</p>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-900 border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-chrome-400 text-[10px]">
              <TrendingUp className="w-3.5 h-3.5 text-iridescent-start" />
              <span>Trades Executed</span>
            </div>
            <p className="text-xl font-bold text-chrome-100">{user.signals.tradesExecuted}</p>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-900 border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-chrome-400 text-[10px]">
              <HeartHandshake className="w-3.5 h-3.5 text-pastel-pink" />
              <span>Mentorships</span>
            </div>
            <p className="text-xl font-bold text-chrome-100">{user.signals.mentorshipHelps}</p>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-900 border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-chrome-400 text-[10px]">
              <Users className="w-3.5 h-3.5 text-pastel-mint" />
              <span>Community Lore</span>
            </div>
            <p className="text-xl font-bold text-chrome-100">{user.signals.communityContributions}</p>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-900 border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-chrome-400 text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Tenure Days</span>
            </div>
            <p className="text-xl font-bold text-chrome-100">{user.signals.tenureDays}d</p>
          </div>
        </div>

        {/* Progression Explanation */}
        <div className="p-4 rounded-2xl bg-obsidian-950 border border-white/5 flex items-start gap-3 text-xs font-mono text-chrome-400">
          <Info className="w-4 h-4 text-electric-green shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-chrome-200 font-bold">Progression Tiers: NOVICE → EXPERT → MENTOR → TOP 1%</p>
            <p className="text-[11px] text-chrome-400 leading-relaxed font-sans">
              Advancement unlocks peer curation privileges in Gnomie School, enhanced signal validation nodes, and early discovery previews in the Grove.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
