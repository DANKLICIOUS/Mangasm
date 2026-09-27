import React, { useState } from 'react';
import { WalletState } from '../types/domain';
import { Wallet, Check, AlertCircle, Loader2, ArrowUpRight, Copy } from 'lucide-react';
import { slayAudio } from '../utils/audio';

interface WalletModalProps {
  walletState: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  walletState,
  onConnect,
  onDisconnect,
  onClose
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    if (walletState.address) {
      navigator.clipboard.writeText(walletState.address);
      setCopied(true);
      slayAudio.playSubtleTick();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl space-y-6">
        
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-electric-green" />
            <h3 className="font-mono text-xs font-bold text-chrome-100">
              NON-CUSTODIAL WALLET
            </h3>
          </div>
          <button onClick={onClose} className="text-xs font-mono text-chrome-500 hover:text-white">
            Close
          </button>
        </div>

        {/* STATE: CONNECTED */}
        {walletState.status === 'CONNECTED' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-obsidian-900 border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-chrome-400">Account:</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-chrome-200 hover:text-electric-green transition-colors"
                >
                  <span>{walletState.address?.substring(0, 4)}...{walletState.address?.substring(walletState.address.length - 4)}</span>
                  {copied ? <Check className="w-3 h-3 text-electric-green" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div className="flex justify-between items-center text-xs font-mono pt-2 border-t border-white/5">
                <span className="text-chrome-400">Available Balance:</span>
                <span className="text-electric-green font-bold text-sm">{walletState.balanceSol.toFixed(2)} SOL</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-obsidian-950 border border-white/5 text-[10px] font-mono text-chrome-500 space-y-1">
              <p className="text-chrome-400">Security Guarantee:</p>
              <p>SLAY never stores private keys or custody over your assets. Transactions require individual local hardware/extension authorization.</p>
            </div>

            <button
              onClick={() => {
                slayAudio.playSubtleTick();
                onDisconnect();
              }}
              className="w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-400 text-xs font-mono hover:bg-rose-500/10 transition-colors"
            >
              DISCONNECT WALLET
            </button>
          </div>
        ) : null}

        {/* STATE: CONNECTING */}
        {walletState.status === 'CONNECTING' ? (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-electric-green animate-spin mx-auto" />
            <p className="text-xs font-mono text-chrome-200">Connecting to Solana Provider...</p>
            <p className="text-[10px] font-mono text-chrome-500">Please approve the connection in your wallet window.</p>
          </div>
        ) : null}

        {/* STATE: DISCONNECTED */}
        {walletState.status === 'DISCONNECTED' ? (
          <div className="space-y-4">
            <p className="text-xs font-mono text-chrome-300 leading-relaxed">
              Connect your favorite Web3 wallet to grow Artifacts, execute continuous bonding trades, and track your Gnomie reputation.
            </p>

            <div className="space-y-2">
              {['Phantom', 'Solflare', 'Backpack'].map((provider) => (
                <button
                  key={provider}
                  onClick={() => {
                    slayAudio.playSubtleTick();
                    onConnect();
                  }}
                  className="w-full p-3 rounded-xl bg-obsidian-900 border border-white/5 flex items-center justify-between text-xs font-mono text-chrome-100 hover:border-electric-green hover:bg-obsidian-850 transition-all"
                >
                  <span className="font-bold">{provider}</span>
                  <ArrowUpRight className="w-4 h-4 text-chrome-400" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
};
