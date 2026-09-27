import React, { useState } from 'react';
import { SchoolLesson } from '../types/domain';
import { GnomieAvatar } from './GnomieAvatar';
import { BookOpen, GraduationCap, Play, CheckCircle, Calculator, TrendingUp, AlertTriangle } from 'lucide-react';
import { slayAudio } from '../utils/audio';

interface GnomieSchoolProps {
  lessons: SchoolLesson[];
  userLearningProgress: number;
}

export const GnomieSchool: React.FC<GnomieSchoolProps> = ({
  lessons,
  userLearningProgress
}) => {
  const [selectedLesson, setSelectedLesson] = useState<SchoolLesson | null>(lessons[0] || null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(['lesson-01']);
  
  // Interactive Simulator States
  const [curveTokensBought, setCurveTokensBought] = useState<number>(500);
  const [simTradeAmountSol, setSimTradeAmountSol] = useState<number>(2.0);

  // Bonding curve simulation formula: P = 0.00001 + 0.00000005 * Tokens
  const simulatedCurvePrice = 0.00001 + 0.00000005 * curveTokensBought;
  const simulatedMarketCap = simulatedCurvePrice * 1000000;

  // Slippage simulation
  const poolDepthSol = 50.0;
  const simulatedPriceImpact = (simTradeAmountSol / (poolDepthSol + simTradeAmountSol)) * 100;

  const handleLessonSelect = (l: SchoolLesson) => {
    slayAudio.playSubtleTick();
    setSelectedLesson(l);
  };

  const handleCompleteLesson = (id: string) => {
    slayAudio.playHarmonicSuccess();
    if (!completedLessonIds.includes(id)) {
      setCompletedLessonIds([...completedLessonIds, id]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      {/* School Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-green/10 text-electric-green border border-electric-green/20 text-xs font-mono mb-3">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>GNOMIE SCHOOL · RISK-FREE LEARNING PROTOCOL</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-chrome-100">
            Understand the Roots Before You Trade.
          </h2>
          <p className="text-chrome-400 max-w-xl text-sm sm:text-base mt-2">
            No real capital required. Master liquidity curves, slippage protection, and market signals with interactive simulations.
          </p>
        </div>

        {/* Learning Progress Indicator */}
        <div className="glass-panel rounded-2xl p-4 min-w-[240px] border border-white/10 space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-chrome-400">Curriculum Mastery:</span>
            <span className="text-electric-green font-bold">
              {Math.round((completedLessonIds.length / lessons.length) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-obsidian-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-turquoise-500 to-electric-green rounded-full transition-all duration-500"
              style={{ width: `${(completedLessonIds.length / lessons.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Study Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (4 Cols): Lesson Directory */}
        <div className="lg:col-span-4 space-y-3">
          <p className="text-xs font-mono text-chrome-400 uppercase tracking-wider mb-2">
            Interactive Modules ({lessons.length})
          </p>
          {lessons.map((lesson) => {
            const isCompleted = completedLessonIds.includes(lesson.id);
            const isSelected = selectedLesson?.id === lesson.id;

            return (
              <div
                key={lesson.id}
                onClick={() => handleLessonSelect(lesson)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  isSelected 
                    ? 'glass-panel-glow border-electric-green text-chrome-100' 
                    : 'glass-panel border-white/5 text-chrome-300 hover:border-chrome-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-electric-green text-[10px]">{lesson.category}</span>
                  <div className="flex items-center gap-1 text-[10px] text-chrome-500">
                    {isCompleted ? (
                      <span className="text-electric-green flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" /> Done
                      </span>
                    ) : (
                      <span>{lesson.readTimeMin} min read</span>
                    )}
                  </div>
                </div>
                <h4 className="font-display text-lg font-bold text-chrome-100 leading-tight">
                  {lesson.title}
                </h4>
              </div>
            );
          })}
        </div>

        {/* Right Column (8 Cols): Active Lesson & Interactive Simulator */}
        <div className="lg:col-span-8 space-y-6">
          {selectedLesson && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
              
              {/* Header */}
              <div className="space-y-2 pb-4 border-b border-white/5">
                <span className="px-2.5 py-1 rounded-full bg-electric-green/10 text-electric-green text-[10px] font-mono font-bold">
                  {selectedLesson.difficulty} TIER
                </span>
                <h3 className="font-display text-3xl font-bold text-chrome-100">
                  {selectedLesson.title}
                </h3>
                <p className="text-xs font-mono text-chrome-400">
                  {selectedLesson.summary}
                </p>
              </div>

              {/* Lesson Narrative */}
              <div className="space-y-4 text-sm text-chrome-300 font-sans leading-relaxed">
                {selectedLesson.content.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              {/* INTERACTIVE SIMULATOR (If Available) */}
              {selectedLesson.interactiveSimType === 'BONDING_CURVE' && (
                <div className="p-5 rounded-2xl bg-obsidian-900 border border-electric-green/30 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-electric-green font-bold">
                    <Calculator className="w-4 h-4" />
                    <span>INTERACTIVE SIMULATOR · CONTINUOUS BONDING CURVE</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-chrome-400">Simulated Tokens Purchased:</span>
                      <span className="text-chrome-100 font-bold">{curveTokensBought}k Tokens</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="25"
                      value={curveTokensBought}
                      onChange={(e) => setCurveTokensBought(parseFloat(e.target.value))}
                      className="w-full accent-electric-green"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-2">
                    <div className="p-3 rounded-xl bg-obsidian-950 border border-white/5">
                      <span className="text-chrome-500 block">Spot Price</span>
                      <span className="text-electric-green font-bold text-sm">${simulatedCurvePrice.toFixed(6)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-obsidian-950 border border-white/5">
                      <span className="text-chrome-500 block">Implied Market Cap</span>
                      <span className="text-turquoise-400 font-bold text-sm">${Math.round(simulatedMarketCap).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedLesson.interactiveSimType === 'SLIPPAGE_CALCULATOR' && (
                <div className="p-5 rounded-2xl bg-obsidian-900 border border-turquoise-400/30 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-turquoise-400 font-bold">
                    <Calculator className="w-4 h-4" />
                    <span>INTERACTIVE SIMULATOR · PRICE IMPACT & SLIPPAGE</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-chrome-400">Order Swap Size:</span>
                      <span className="text-chrome-100 font-bold">{simTradeAmountSol.toFixed(1)} SOL</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="20"
                      step="0.5"
                      value={simTradeAmountSol}
                      onChange={(e) => setSimTradeAmountSol(parseFloat(e.target.value))}
                      className="w-full accent-turquoise-400"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-obsidian-950 border border-white/5 text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-chrome-500">Pool Depth:</span>
                      <span className="text-chrome-200">50.0 SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-chrome-500">Resulting Price Impact:</span>
                      <span className={`font-bold ${simulatedPriceImpact > 10 ? 'text-rose-400' : 'text-electric-green'}`}>
                        {simulatedPriceImpact.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Takeaway Banner */}
              <div className="p-4 rounded-2xl bg-electric-green/10 border border-electric-green/20 text-xs font-mono space-y-1">
                <span className="text-electric-green font-bold">CORE TAKEAWAY:</span>
                <p className="text-chrome-200 font-sans">{selectedLesson.keyTakeaway}</p>
              </div>

              {/* Completion Action */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <GnomieAvatar seed="mentor-school" size="sm" expression="wise" auraColor="#00FF66" />
                  <span className="text-xs font-mono text-chrome-400">Taught by GNOMIE Mentors</span>
                </div>

                <button
                  onClick={() => handleCompleteLesson(selectedLesson.id)}
                  className="px-6 py-2.5 rounded-full bg-electric-green text-obsidian-950 text-xs font-mono font-bold hover:scale-105 transition-all box-glow-green"
                >
                  {completedLessonIds.includes(selectedLesson.id) ? '✓ MODULE COMPLETED' : 'MARK AS MASTERED'}
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
