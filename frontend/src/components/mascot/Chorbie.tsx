export type ChorbieExpression = 'happy' | 'excited' | 'encouraging' | 'celebrating' | 'thinking';

export interface ChorbieProps {
  expression?: ChorbieExpression;
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
export function Chorbie({ expression = 'happy', size = 100, className = '' }: ChorbieProps) {
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
      </defs>

      {/* Star body */}
      <path
        d="M50 8 L61 35 L92 35 L67 53 L77 82 L50 66 L23 82 L33 53 L8 35 L39 35 Z"
        fill="url(#chorbieBody)"
        stroke="#4CAD02"
        strokeWidth="2"
      />

      {/* Expression-specific elements */}
      {expression === 'happy' && <HappyFace />}
      {expression === 'excited' && <ExcitedFace />}
      {expression === 'encouraging' && <EncouragingFace />}
      {expression === 'celebrating' && <CelebratingFace />}
      {expression === 'thinking' && <ThinkingFace />}
    </svg>
  );
}

function HappyFace() {
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
      <ellipse cx="30" cy="50" rx="6" ry="4" fill="#FFB6C1" opacity="0.5" />
      <ellipse cx="70" cy="50" rx="6" ry="4" fill="#FFB6C1" opacity="0.5" />
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
