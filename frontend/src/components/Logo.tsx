// Brand mark — a clean geometric spark (faceless; the Chorbie mascot was
// retired in the Midnight+Electric redesign). Self-contained SVG + wordmark
// so no raster/asset pipeline is needed.

type LogoVariant = 'icon' | 'wordmark' | 'stacked' | 'horizontal';

interface LogoProps {
  variant?: LogoVariant;
  size?: number;
  className?: string;
  alt?: string;
}

function SparkMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="text-primary-500"
    >
      <path
        fill="currentColor"
        d="M12 1.6 14.3 9 22 12l-7.7 3L12 22.4 9.7 15 2 12l7.7-3Z"
      />
    </svg>
  );
}

function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span
      className="font-display font-bold text-text-primary tracking-tight leading-none"
      style={{ fontSize: size }}
    >
      Kids<span className="text-primary-500">Chores</span>
    </span>
  );
}

export function Logo({ variant = 'stacked', size, className = '', alt = 'KidsChores' }: LogoProps) {
  // `size` historically meant: icon → square edge; others → overall width.
  // Map it onto the new mark/text proportions.
  if (variant === 'icon') {
    return (
      <span className={className} role="img" aria-label={alt}>
        <SparkMark size={size ?? 28} />
      </span>
    );
  }

  if (variant === 'wordmark') {
    return (
      <span className={className} role="img" aria-label={alt}>
        <Wordmark size={size ? size / 6.2 : 20} />
      </span>
    );
  }

  if (variant === 'stacked') {
    const mark = size ? size / 3 : 40;
    return (
      <span
        className={`inline-flex flex-col items-center gap-2 ${className}`}
        role="img"
        aria-label={alt}
      >
        <SparkMark size={mark} />
        <Wordmark size={size ? size / 6 : 22} />
      </span>
    );
  }

  // horizontal
  const mark = size ? size / 7 : 24;
  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      role="img"
      aria-label={alt}
    >
      <SparkMark size={Math.max(mark, 18)} />
      <Wordmark size={size ? size / 8.5 : 20} />
    </span>
  );
}

export default Logo;
