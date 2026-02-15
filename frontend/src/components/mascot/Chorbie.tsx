export type ChorbieExpression = 'happy' | 'excited' | 'encouraging' | 'celebrating' | 'thinking';
export type ChorbieSeason = 'default' | 'halloween' | 'christmas' | 'easter' | 'summer';

export interface ChorbieProps {
  expression?: ChorbieExpression;
  season?: ChorbieSeason;
  size?: number | string;
  className?: string;
}

/**
 * Chorbie - The KidsChores mascot
 * A friendly star character with multiple expressions
 *
 * Expressions:
 * - happy: Default warm smile
 * - excited: Wide eyes, open smile, sparkles
 * - encouraging: Thumbs up, wink
 * - celebrating: Party hat, confetti
 * - thinking: Hand on chin, raised eyebrow
 */
export function Chorbie({ expression = 'happy', season = 'default', size = 100, className = '' }: ChorbieProps) {
  const sizeValue = typeof size === 'number' ? size : undefined;
  const sizeStyle = typeof size === 'string' ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      width={sizeValue}
      height={sizeValue}
      style={sizeStyle}
      className={className}
      role="img"
      aria-label={`Chorbie mascot - ${expression}`}
    >
      <defs>
        {/* Main body gradient - Feather Green */}
        <linearGradient id="chorbieBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7AE82A" />
          <stop offset="100%" stopColor="#58CC02" />
        </linearGradient>

        {/* Darker green for depth */}
        <linearGradient id="chorbieBodyDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#58CC02" />
          <stop offset="100%" stopColor="#4CAD02" />
        </linearGradient>

        {/* Party hat gradient */}
        <linearGradient id="partyHat" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF9600" />
          <stop offset="50%" stopColor="#1CB0F6" />
          <stop offset="100%" stopColor="#CE82FF" />
        </linearGradient>

        {/* Sparkle gradient */}
        <linearGradient id="sparkle" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD93D" />
          <stop offset="100%" stopColor="#FF9600" />
        </linearGradient>

        {/* Seasonal gradients */}
        <linearGradient id="witchHat" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2D1B4E" />
          <stop offset="100%" stopColor="#BF00FF" />
        </linearGradient>
        <linearGradient id="santaHat" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#CC0000" />
          <stop offset="100%" stopColor="#FF0033" />
        </linearGradient>
      </defs>

      {/* Star body */}
      <path
        d="M50 8 L61 35 L92 35 L67 53 L77 82 L50 66 L23 82 L33 53 L8 35 L39 35 Z"
        fill="url(#chorbieBody)"
        stroke="#4CAD02"
        strokeWidth="2"
      />

      {/* Seasonal outfit overlays */}
      {season === 'halloween' && <HalloweenOutfit />}
      {season === 'christmas' && <ChristmasOutfit />}
      {season === 'easter' && <EasterOutfit />}
      {season === 'summer' && <SummerOutfit />}

      {/* Expression-specific elements */}
      {expression === 'happy' && <HappyFace season={season} />}
      {expression === 'excited' && <ExcitedFace />}
      {expression === 'encouraging' && <EncouragingFace />}
      {expression === 'celebrating' && <CelebratingFace />}
      {expression === 'thinking' && <ThinkingFace />}
    </svg>
  );
}

/* ====== Seasonal Outfit Components ====== */

function HalloweenOutfit() {
  return (
    <g>
      {/* Witch hat */}
      <polygon points="50,-2 36,24 64,24" fill="url(#witchHat)" stroke="#1A0A2A" strokeWidth="1.5" />
      {/* Hat brim */}
      <ellipse cx="50" cy="24" rx="18" ry="5" fill="#2D1B4E" stroke="#1A0A2A" strokeWidth="1" />
      {/* Hat buckle */}
      <rect x="46" y="14" width="8" height="6" rx="1" fill="#FFD700" />
      {/* Bat wings */}
      <path d="M8,40 Q2,30 10,28 Q8,34 14,32 Q10,38 8,40Z" fill="#2D1B4E" opacity="0.7" />
      <path d="M92,40 Q98,30 90,28 Q92,34 86,32 Q90,38 92,40Z" fill="#2D1B4E" opacity="0.7" />
    </g>
  );
}

function ChristmasOutfit() {
  return (
    <g>
      {/* Santa hat */}
      <polygon points="50,-2 38,26 62,26" fill="url(#santaHat)" stroke="#990000" strokeWidth="1" />
      {/* Hat fur trim */}
      <ellipse cx="50" cy="26" rx="14" ry="4" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="0.5" />
      {/* Pom-pom */}
      <circle cx="50" cy="-2" r="5" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="0.5" />
      {/* Scarf */}
      <path d="M35,62 Q42,67 50,66 Q58,67 65,62" stroke="#FF0033" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M35,62 Q42,69 50,68 Q58,69 65,62" stroke="#00AA44" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
    </g>
  );
}

function EasterOutfit() {
  return (
    <g>
      {/* Bunny ears */}
      <ellipse cx="40" cy="4" rx="6" ry="16" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="1" transform="rotate(-10 40 4)" />
      <ellipse cx="40" cy="4" rx="3" ry="12" fill="#FF69B4" opacity="0.4" transform="rotate(-10 40 4)" />
      <ellipse cx="60" cy="4" rx="6" ry="16" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="1" transform="rotate(10 60 4)" />
      <ellipse cx="60" cy="4" rx="3" ry="12" fill="#FF69B4" opacity="0.4" transform="rotate(10 60 4)" />
      {/* Flower */}
      <g transform="translate(80, 35)">
        <circle cx="0" cy="-4" r="3" fill="#FF69B4" opacity="0.8" />
        <circle cx="4" cy="0" r="3" fill="#BF5FFF" opacity="0.8" />
        <circle cx="0" cy="4" r="3" fill="#FF69B4" opacity="0.8" />
        <circle cx="-4" cy="0" r="3" fill="#BF5FFF" opacity="0.8" />
        <circle cx="0" cy="0" r="2" fill="#FFD700" />
      </g>
    </g>
  );
}

function SummerOutfit() {
  return (
    <g>
      {/* Sunglasses */}
      <rect x="32" y="38" width="14" height="10" rx="3" fill="#1A1A1A" opacity="0.85" />
      <rect x="54" y="38" width="14" height="10" rx="3" fill="#1A1A1A" opacity="0.85" />
      <line x1="46" y1="42" x2="54" y2="42" stroke="#1A1A1A" strokeWidth="2" />
      <line x1="32" y1="42" x2="25" y2="40" stroke="#1A1A1A" strokeWidth="1.5" />
      <line x1="68" y1="42" x2="75" y2="40" stroke="#1A1A1A" strokeWidth="1.5" />
      {/* Lens shine */}
      <rect x="34" y="39" width="4" height="2" rx="1" fill="#FFFFFF" opacity="0.3" />
      <rect x="56" y="39" width="4" height="2" rx="1" fill="#FFFFFF" opacity="0.3" />
      {/* Visor brim */}
      <path d="M30,32 Q50,28 70,32" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  );
}

/* ====== Expression Face Components ====== */

function HappyFace({ season = 'default' }: { season?: ChorbieSeason }) {
  // Summer: sunglasses cover eyes, only show smile + blush
  if (season === 'summer') {
    return (
      <g>
        <path d="M38 54 Q50 66 62 54" stroke="#3C3C3C" strokeWidth="3" strokeLinecap="round" fill="none" />
        <ellipse cx="30" cy="50" rx="6" ry="4" fill="#FF9600" opacity="0.5" />
        <ellipse cx="70" cy="50" rx="6" ry="4" fill="#FF9600" opacity="0.5" />
      </g>
    );
  }
  const blushColor = season === 'halloween' ? '#FF6600' : '#FFB6C1';
  return (
    <g>
      {/* Eyes */}
      <ellipse cx="40" cy="42" rx="5" ry="6" fill="#3C3C3C" />
      <ellipse cx="60" cy="42" rx="5" ry="6" fill="#3C3C3C" />
      {/* Eye highlights */}
      <circle cx="42" cy="40" r="2" fill="#FFFFFF" />
      <circle cx="62" cy="40" r="2" fill="#FFFFFF" />
      {/* Warm smile */}
      <path
        d="M38 54 Q50 66 62 54"
        stroke="#3C3C3C"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Blush */}
      <ellipse cx="30" cy="50" rx="6" ry="4" fill={blushColor} opacity="0.5" />
      <ellipse cx="70" cy="50" rx="6" ry="4" fill={blushColor} opacity="0.5" />
    </g>
  );
}

function ExcitedFace() {
  return (
    <g>
      {/* Big excited eyes */}
      <ellipse cx="40" cy="42" rx="7" ry="8" fill="#3C3C3C" />
      <ellipse cx="60" cy="42" rx="7" ry="8" fill="#3C3C3C" />
      {/* Big eye highlights */}
      <circle cx="43" cy="39" r="3" fill="#FFFFFF" />
      <circle cx="63" cy="39" r="3" fill="#FFFFFF" />
      <circle cx="38" cy="44" r="1.5" fill="#FFFFFF" />
      <circle cx="58" cy="44" r="1.5" fill="#FFFFFF" />
      {/* Open smile */}
      <ellipse cx="50" cy="58" rx="10" ry="7" fill="#3C3C3C" />
      <ellipse cx="50" cy="56" rx="8" ry="4" fill="#FF6B6B" />
      {/* Blush */}
      <ellipse cx="28" cy="50" rx="6" ry="4" fill="#FFB6C1" opacity="0.6" />
      <ellipse cx="72" cy="50" rx="6" ry="4" fill="#FFB6C1" opacity="0.6" />
      {/* Sparkles */}
      <g fill="url(#sparkle)">
        <polygon points="15,20 17,25 22,25 18,28 20,33 15,30 10,33 12,28 8,25 13,25" />
        <polygon points="85,20 87,24 91,24 88,27 89,31 85,29 81,31 82,27 79,24 83,24" />
        <polygon points="12,65 14,69 18,69 15,72 16,76 12,74 8,76 9,72 6,69 10,69" />
      </g>
    </g>
  );
}

function EncouragingFace() {
  return (
    <g>
      {/* Winking eye (closed) */}
      <path
        d="M35 42 Q40 46 45 42"
        stroke="#3C3C3C"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Open eye */}
      <ellipse cx="60" cy="42" rx="5" ry="6" fill="#3C3C3C" />
      <circle cx="62" cy="40" r="2" fill="#FFFFFF" />
      {/* Confident smile */}
      <path
        d="M38 54 Q50 64 62 54"
        stroke="#3C3C3C"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Blush */}
      <ellipse cx="30" cy="50" rx="6" ry="4" fill="#FFB6C1" opacity="0.5" />
      <ellipse cx="70" cy="50" rx="6" ry="4" fill="#FFB6C1" opacity="0.5" />
      {/* Thumbs up arm */}
      <g transform="translate(75, 55) rotate(15)">
        <ellipse cx="0" cy="0" rx="6" ry="8" fill="url(#chorbieBodyDark)" />
        <ellipse cx="0" cy="-12" rx="4" ry="6" fill="url(#chorbieBody)" />
      </g>
    </g>
  );
}

function CelebratingFace() {
  return (
    <g>
      {/* Party hat */}
      <polygon
        points="50,2 40,30 60,30"
        fill="url(#partyHat)"
        stroke="#FF9600"
        strokeWidth="1"
      />
      {/* Hat pom-pom */}
      <circle cx="50" cy="2" r="4" fill="#FFD93D" />
      {/* Hat stripes */}
      <line x1="45" y1="20" x2="48" y2="10" stroke="#FFFFFF" strokeWidth="2" opacity="0.5" />
      <line x1="52" y1="20" x2="55" y2="10" stroke="#FFFFFF" strokeWidth="2" opacity="0.5" />

      {/* Happy celebrating eyes - curved happy */}
      <path
        d="M35 42 Q40 38 45 42"
        stroke="#3C3C3C"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M55 42 Q60 38 65 42"
        stroke="#3C3C3C"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Big open smile */}
      <ellipse cx="50" cy="58" rx="12" ry="8" fill="#3C3C3C" />
      <ellipse cx="50" cy="56" rx="9" ry="4" fill="#FF6B6B" />
      {/* Excited blush */}
      <ellipse cx="28" cy="50" rx="7" ry="5" fill="#FFB6C1" opacity="0.7" />
      <ellipse cx="72" cy="50" rx="7" ry="5" fill="#FFB6C1" opacity="0.7" />

      {/* Confetti */}
      <g>
        <rect x="10" y="25" width="4" height="4" fill="#FF4B4B" transform="rotate(30 12 27)" />
        <rect x="85" y="30" width="4" height="4" fill="#1CB0F6" transform="rotate(-20 87 32)" />
        <rect x="20" y="70" width="3" height="3" fill="#FFD93D" transform="rotate(45 21.5 71.5)" />
        <rect x="78" y="65" width="3" height="3" fill="#CE82FF" transform="rotate(15 79.5 66.5)" />
        <circle cx="15" cy="50" r="2" fill="#FF9600" />
        <circle cx="88" cy="55" r="2" fill="#58CC02" />
        <circle cx="8" cy="40" r="1.5" fill="#1CB0F6" />
        <circle cx="92" cy="45" r="1.5" fill="#FF4B4B" />
      </g>
    </g>
  );
}

function ThinkingFace() {
  return (
    <g>
      {/* Raised eyebrow eye */}
      <ellipse cx="40" cy="44" rx="5" ry="6" fill="#3C3C3C" />
      <circle cx="42" cy="42" r="2" fill="#FFFFFF" />
      {/* Raised eyebrow */}
      <path
        d="M32 34 Q40 30 48 36"
        stroke="#3C3C3C"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Normal eye */}
      <ellipse cx="60" cy="44" rx="5" ry="6" fill="#3C3C3C" />
      <circle cx="62" cy="42" r="2" fill="#FFFFFF" />
      {/* Normal eyebrow */}
      <path
        d="M52 36 Q60 34 68 36"
        stroke="#3C3C3C"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Thinking mouth - small pursed */}
      <ellipse cx="50" cy="58" rx="5" ry="4" fill="#3C3C3C" />

      {/* Light blush */}
      <ellipse cx="30" cy="52" rx="5" ry="3" fill="#FFB6C1" opacity="0.4" />
      <ellipse cx="70" cy="52" rx="5" ry="3" fill="#FFB6C1" opacity="0.4" />

      {/* Thinking hand on chin */}
      <g transform="translate(25, 60)">
        <ellipse cx="0" cy="0" rx="6" ry="5" fill="url(#chorbieBodyDark)" />
      </g>

      {/* Thought bubbles */}
      <circle cx="80" cy="25" r="3" fill="#E5E5E5" opacity="0.8" />
      <circle cx="86" cy="18" r="4" fill="#E5E5E5" opacity="0.8" />
      <circle cx="90" cy="8" r="6" fill="#E5E5E5" opacity="0.8" />
    </g>
  );
}

export default Chorbie;
