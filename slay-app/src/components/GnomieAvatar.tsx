import React from 'react';

interface GnomieAvatarProps {
  seed?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  expression?: 'mystical' | 'happy' | 'curious' | 'wise' | 'mischievous';
  auraColor?: string;
}

export const GnomieAvatar: React.FC<GnomieAvatarProps> = ({
  seed = 'void-gnome-42',
  size = 'md',
  className = '',
  expression = 'mystical',
  auraColor = '#00FF66'
}) => {
  // Deterministic color / hat variation based on seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hatColors = [
    { base: '#7000FF', highlight: '#A855F7', hatTip: '#00F0FF' }, // Mystic Violet
    { base: '#00FF66', highlight: '#4ADE80', hatTip: '#FDE68A' }, // Electric Forest
    { base: '#FF3B81', highlight: '#FB7185', hatTip: '#A7F3D0' }, // Neon Bloom
    { base: '#06B6D4', highlight: '#38BDF8', hatTip: '#FFB5D5' }, // Turquoise Shimmer
    { base: '#F59E0B', highlight: '#FCD34D', hatTip: '#E0E7FF' }, // Solar Amber
  ];
  
  const colorIndex = Math.abs(hash) % hatColors.length;
  const currentPalette = hatColors[colorIndex];

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    hero: 'w-36 h-36',
  };

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full ${sizeClasses[size]} ${className}`}>
      {/* Background Aura Glow */}
      <div 
        className="absolute inset-0 rounded-full blur-md opacity-40 transition-all duration-700 pointer-events-none group-hover:opacity-75"
        style={{ backgroundColor: auraColor || currentPalette.base }}
      />
      
      {/* SVG Stylized Gnomie Character */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full relative z-10 drop-shadow-md overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`hat-grad-${seed}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={currentPalette.highlight} />
            <stop offset="100%" stopColor={currentPalette.base} />
          </linearGradient>
          <linearGradient id={`beard-grad-${seed}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#C4C4CC" />
          </linearGradient>
          <radialGradient id={`nose-grad-${seed}`} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="100%" stopColor="#FDBA74" />
          </radialGradient>
        </defs>

        {/* Ambient mushroom spore aura */}
        <circle cx="50" cy="50" r="45" fill="none" stroke={currentPalette.hatTip} strokeWidth="0.75" strokeDasharray="3 3" opacity="0.6" className="animate-spin" style={{ animationDuration: '24s' }} />

        {/* Tall Curved Pointy Hat */}
        <path 
          d="M 28,52 Q 40,8 72,12 Q 52,38 72,52 Z" 
          fill={`url(#hat-grad-${seed})`}
          className="transition-transform duration-300"
        />
        
        {/* Hat Tip Spore / Crystal Gem */}
        <circle cx="72" cy="12" r="4" fill={currentPalette.hatTip} className="animate-pulse" />

        {/* Fluffy Beard */}
        <path 
          d="M 26,50 C 18,68 30,86 50,92 C 70,86 82,68 74,50 C 65,58 35,58 26,50 Z" 
          fill={`url(#beard-grad-${seed})`}
        />

        {/* Cute Big Round Gnome Nose */}
        <ellipse cx="50" cy="52" rx="10" ry="7.5" fill={`url(#nose-grad-${seed})`} />

        {/* Mystical Eyes peeking beneath hat rim */}
        {expression === 'mystical' && (
          <g>
            <circle cx="42" cy="46" r="2.5" fill="#00FF66" className="animate-ping" style={{ animationDuration: '3s' }} />
            <circle cx="42" cy="46" r="2" fill="#050507" />
            <circle cx="43" cy="45" r="0.75" fill="#FFFFFF" />
            <circle cx="58" cy="46" r="2.5" fill="#00FF66" className="animate-ping" style={{ animationDuration: '3s' }} />
            <circle cx="58" cy="46" r="2" fill="#050507" />
            <circle cx="59" cy="45" r="0.75" fill="#FFFFFF" />
          </g>
        )}

        {expression === 'wise' && (
          <g>
            <path d="M 39,45 Q 43,47 47,45" fill="none" stroke="#1E1E2C" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 53,45 Q 57,47 61,45" fill="none" stroke="#1E1E2C" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}

        {expression === 'curious' && (
          <g>
            <circle cx="42" cy="45" r="2.5" fill="#22D3EE" />
            <circle cx="42.5" cy="44.5" r="1" fill="#FFFFFF" />
            <circle cx="58" cy="44" r="3.2" fill="#22D3EE" />
            <circle cx="58.5" cy="43.5" r="1.2" fill="#FFFFFF" />
          </g>
        )}

        {expression === 'happy' && (
          <g>
            <path d="M 40,46 Q 43,42 46,46" fill="none" stroke="#00FF66" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 54,46 Q 57,42 60,46" fill="none" stroke="#00FF66" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}

        {expression === 'mischievous' && (
          <g>
            <circle cx="42" cy="45" r="2.5" fill="#FF3B81" />
            <circle cx="58" cy="45" r="2" fill="#FF3B81" />
          </g>
        )}

        {/* Whispering spore floating next to hat */}
        <circle cx="20" cy="30" r="1.5" fill="#00FF66" opacity="0.7" className="animate-bounce" />
        <circle cx="82" cy="40" r="1" fill="#FFB5D5" opacity="0.8" />
      </svg>
    </div>
  );
};
