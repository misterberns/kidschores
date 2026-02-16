import { useTheme } from '../theme';

// Import all logo SVGs
import iconLight from '../assets/logo/kc-icon.svg';
import iconDark from '../assets/logo/kc-icon-dark.svg';
import wordmarkLight from '../assets/logo/kc-wordmark.svg';
import wordmarkDark from '../assets/logo/kc-wordmark-dark.svg';
import stackedLight from '../assets/logo/kc-logo-stacked.svg';
import stackedDark from '../assets/logo/kc-logo-stacked-dark.svg';
import horizontalLight from '../assets/logo/kc-logo-horizontal.svg';
import horizontalDark from '../assets/logo/kc-logo-horizontal-dark.svg';

type LogoVariant = 'icon' | 'wordmark' | 'stacked' | 'horizontal';

interface LogoProps {
  variant?: LogoVariant;
  size?: number;
  className?: string;
  alt?: string;
}

const logoMap: Record<LogoVariant, { light: string; dark: string }> = {
  icon: { light: iconLight, dark: iconDark },
  wordmark: { light: wordmarkLight, dark: wordmarkDark },
  stacked: { light: stackedLight, dark: stackedDark },
  horizontal: { light: horizontalLight, dark: horizontalDark },
};

export function Logo({ variant = 'stacked', size, className = '', alt = 'KidsChores' }: LogoProps) {
  const { isDark } = useTheme();
  const src = isDark ? logoMap[variant].dark : logoMap[variant].light;

  const sizeProps: React.ImgHTMLAttributes<HTMLImageElement> = {};
  if (size) {
    if (variant === 'icon') {
      sizeProps.width = size;
      sizeProps.height = size;
    } else {
      sizeProps.width = size;
    }
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      {...sizeProps}
    />
  );
}

export default Logo;
