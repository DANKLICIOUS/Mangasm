import React, { useState } from 'react';
import { Artifact, TradeOrderSimulation } from '../types/domain';
import { X, ArrowRight, ArrowDownUp, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import { slayAudio } from '../utils/audio';

interface TradeModalProps {
  artifact: Artifact;
  onClose: () => void;
  onSuccess: () => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({ artifact, onClose, onSuccess }) => {
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [amountIn, setAmountIn] = useState<string>('0.5');
  const [slippage, setSlippage] = useState<number>(1.0);
  const [txState, setTxState] = useState<'IDLE' | 'SIGNING' | 'CONFIRMING' | 'CONFIRMED' | 'FAILED'>('IDLE');

  const numAmount = parseFloat(amountIn) || 0;
  
  // Simulation calculations
  const solPriceUsd = 150;
  const tokenPriceUsd = artifact.market.priceUsd;
  
  const estimatedTokens = tradeType === 'BUY'
    ? (numAmount * solPriceUsd) / tokenPriceUsd
    : numAmount;

  const estimatedSolOutput = tradeType === 'SELL'
    ? (numAmount * tokenPriceUsd) / solPriceUsd
    : numAmount;

  const priceImpactPct = Math.min(5.0, (numAmount / (artifact.market.liquidityUsd / solPriceUsd)) * 100);
  const creatorFeeUsd = (numAmount * solPriceUsd) * (artifact.economics.creatorRewardSharePct / 100);
  const platformFeeUsd = (numAmount * solPriceUsd) * (artifact.economics.platformFeePct / 100);
  const gasEstSol = 0.00005;

  const handleExecute = () => {
    slayAudio.playSubtleTick();
    setTxState('SIGNING');

    setTimeout(() => {
      setTxState('CONFIRMING');
      setTimeout(() => {
        setTxState('CONFIRMED');
        slayAudio.playHarmonicSuccess();
        setTimeout(() => {
          onSuccess();
        }, 1200);
      }, 1500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-electric-green font-bold">TRADE ARTIFACT</span>
            <span className="text-chrome-500">·</span>
            <span className="font-mono text-xs text-chrome-200">{artifact.ticker}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-chrome-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buy / Sell Tabs */}
        <div className="grid grid-cols-2 gap-2 my-4 p-1 rounded-2xl bg-obsidian-900 border border-white/5">
          <button
            onClick={() => setTradeType('BUY')}
            className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              tradeType === 'BUY' ? 'bg-electric-green text-obsidian-950' : 'text-chrome-400 hover:text-white'
            }`}
          >
            BUY {artifact.ticker}
          </button>
          <button
            onClick={() => setTradeType('SELL')}
            className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              tradeType === 'SELL' ? 'bg-rose-500 text-white' : 'text-chrome-400 hover:text-white'
            }`}
          >
            SELL {artifact.ticker}
          </button>
        </div>

        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-mono text-chrome-400 mb-1">
              <span>You Pay</span>
              <span>Balance: 8.42 SOL</span>
            </div>
            <div className="flex items-center gap-2 bg-obsidian-900 border border-white/10 rounded-2xl p-3 focus-within:border-electric-green">
              <input
                type="number"
                step="any"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="w-full bg-transparent text-lg font-mono font-bold text-chrome-100 focus:outline-none"
              />
              <span className="text-xs font-mono font-bold text-chrome-300 px-3 py-1 bg-obsidian-800 rounded-xl">
                {tradeType === 'BUY' ? 'SOL' : artifact.ticker}
              </span>
            </div>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <div className="p-2 rounded-full bg-obsidian-800 border border-white/10 text-chrome-300 shadow-md">
              <ArrowDownUp className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-chrome-400 mb-1">
              <span>You Receive (Estimated)</span>
              <span>Spot: ${artifact.market.priceUsd.toFixed(6)}</span>
            </div>
            <div className="flex items-center gap-2 bg-obsidian-900/60 border border-white/5 rounded-2xl p-3">
              <span className="w-full text-lg font-mono font-bold text-electric-green truncate">
                {tradeType === 'BUY' ? estimatedTokens.toLocaleString(undefined, { maximumFractionDigits: 2 }) : estimatedSolOutput.toFixed(4)}
              </span>
              <span className="text-xs font-mono font-bold text-chrome-300 px-3 py-1 bg-obsidian-800 rounded-xl">
                {tradeType === 'BUY' ? artifact.ticker : 'SOL'}
              </span>
            </div>
          </div>

          {/* Transparent Execution & Fee Breakdown */}
          <div className="p-3.5 rounded-2xl bg-obsidian-900 border border-white/5 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-chrome-400">
              <span>Price Impact:</span>
              <span className={priceImpactPct > 2 ? 'text-amber-400 font-bold' : 'text-chrome-200'}>
                {priceImpactPct.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-chrome-400">
              <span>Creator Reward ({artifact.economics.creatorRewardSharePct}%):</span>
              <span className="text-chrome-200">${creatorFeeUsd.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-chrome-400">
              <span>Platform Maintenance ({artifact.economics.platformFeePct}%):</span>
              <span className="text-chrome-200">${platformFeeUsd.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-chrome-400">
              <span>Network Gas:</span>
              <span className="text-chrome-200">~{gasEstSol} SOL</span>
            </div>
            <div className="flex justify-between text-chrome-400 pt-1 border-t border-white/5">
              <span>Slippage Tolerance:</span>
              <div className="flex gap-1">
                {[0.5, 1.0, 2.5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlippage(s)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      slippage === s ? 'bg-electric-green text-obsidian-950 font-bold' : 'text-chrome-400 hover:text-white'
                    }`}
                  >
                    {s}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button & Transaction States */}
          <button
            onClick={handleExecute}
            disabled={txState !== 'IDLE'}
            className={`w-full py-4 rounded-2xl font-mono text-xs font-bold tracking-wider transition-all shadow-xl ${
              tradeType === 'BUY'
                ? 'bg-electric-green text-obsidian-950 hover:scale-[1.02] box-glow-green'
                : 'bg-rose-500 text-white hover:scale-[1.02]'
            } disabled:opacity-50`}
          >
            {txState === 'IDLE' && `CONFIRM ${tradeType} ORDER`}
            {txState === 'SIGNING' && 'REQUESTING WALLET SIGNATURE...'}
            {txState === 'CONFIRMING' && 'CONFIRMING ON SOLANA...'}
            {txState === 'CONFIRMED' && '✓ TRANSACTION CONFIRMED!'}
            {txState === 'FAILED' && 'TRANSACTION FAILED'}
          </button>
        </div>

      </div>
    </div>
  );
};
