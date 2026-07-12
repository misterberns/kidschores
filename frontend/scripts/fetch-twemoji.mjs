/**
 * Regenerates src/data/twemoji-icons.tsx from the Iconify API.
 *
 *   node scripts/fetch-twemoji.mjs
 *
 * MAPPING keys are OUR stable stored icon names (the lucide-kebab ids that
 * live in the DB and in icon-catalog.ts); values are the Twemoji CLDR names.
 * Adding an icon: add a row here AND a catalog/EXTRA entry, then re-run.
 *
 * Twemoji artwork © Twitter, Inc and other contributors, CC-BY 4.0.
 * Maintained fork: https://github.com/jdecked/twemoji
 */

const MAPPING = {
  // --- ICON_CATALOG (picker grid) ---
  'brush': 'broom',
  'sparkles': 'sparkles',
  'bed': 'bed',
  'utensils': 'fork-and-knife-with-plate',
  'cooking-pot': 'cooking',
  'shower-head': 'shower',
  'sofa': 'couch-and-lamp',
  'trees': 'deciduous-tree',
  'sprout': 'seedling',
  'trash-2': 'wastebasket',
  'shirt': 't-shirt',
  'washing-machine': 'basket',
  'book-open': 'open-book',
  'book': 'blue-book',
  'backpack': 'school-backpack',
  'pencil': 'pencil',
  'dog': 'dog-face',
  'cat': 'cat-face',
  'paw-print': 'paw-prints',
  'smartphone': 'mobile-phone',
  'gamepad-2': 'video-game',
  'clapperboard': 'clapper-board',
  'tv': 'television',
  'music': 'musical-note',
  'palette': 'artist-palette',
  'bike': 'bicycle',
  'car': 'automobile',
  'dumbbell': 'flexed-biceps',
  'pizza': 'pizza',
  'ice-cream-cone': 'soft-ice-cream',
  'moon': 'crescent-moon',
  'toy-brick': 'teddy-bear',
  'gift': 'wrapped-gift',
  'star': 'star',
  'heart': 'red-heart',
  'party-popper': 'party-popper',
  'folder': 'file-folder',
  // --- EXTRA_ICONS aliases (badges / challenges / legacy mdi values) ---
  'medal': 'sports-medal',
  'trophy': 'trophy',
  'trophy-award': 'trophy',
  'award': 'military-medal',
  'flame': 'fire',
  'fire': 'fire',
  'zap': 'high-voltage',
  'lightning-bolt': 'high-voltage',
  'crown': 'crown',
  'target': 'bullseye',
  'rocket': 'rocket',
  'rocket-launch': 'rocket',
  'camera': 'camera',
  'alert': 'warning',
  'alert-triangle': 'warning',
  'clock': 'alarm-clock',
  'calendar': 'calendar',
  'shopping': 'shopping-bags',
  'shopping-bag': 'shopping-bags',
  'cash': 'money-bag',
  'television': 'television',
  'gamepad': 'video-game',
  'gamepad-variant': 'video-game',
  'bicycle': 'bicycle',
  'ice-cream': 'soft-ice-cream',
  'check-circle': 'check-mark-button',
};

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'twemoji-icons.tsx');

async function fetchSvg(name) {
  const res = await fetch(`https://api.iconify.design/twemoji/${name}.svg`, {
    headers: { 'User-Agent': 'kidschores-icon-fetch' },
  });
  const text = await res.text();
  if (!res.ok || !text.includes('<svg')) {
    throw new Error(`twemoji:${name} -> HTTP ${res.status}`);
  }
  const viewBox = /viewBox="([^"]+)"/.exec(text)?.[1] ?? '0 0 36 36';
  const body = text.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
  return { viewBox, body };
}

const defs = {};
for (const [ours, tw] of Object.entries(MAPPING)) {
  defs[ours] = { tw, ...(await fetchSvg(tw)) };
  process.stdout.write(`${ours} <- twemoji:${tw}\n`);
}

const entries = Object.entries(defs)
  .map(([name, d]) =>
    `  ${JSON.stringify(name)}: { viewBox: ${JSON.stringify(d.viewBox)}, body: ${JSON.stringify(d.body)} },`)
  .join('\n');

const tsx = `/**
 * GENERATED FILE — do not edit by hand. Regenerate with:
 *   node scripts/fetch-twemoji.mjs
 *
 * Emoji artwork: Twemoji, © Twitter, Inc and other contributors,
 * licensed under CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
 * Maintained fork: https://github.com/jdecked/twemoji
 *
 * Keys are OUR stable stored icon names (see icon-catalog.ts); the artwork
 * source for each key is chosen in scripts/fetch-twemoji.mjs.
 */
import type { ComponentType } from 'react';

export interface IconProps {
  size?: number;
  className?: string;
}

export type IconComponent = ComponentType<IconProps>;

interface TwemojiDef {
  viewBox: string;
  body: string;
}

const TWEMOJI: Record<string, TwemojiDef> = {
${entries}
};

function makeIcon(name: string): IconComponent {
  const def = TWEMOJI[name];
  const Comp = ({ size = 24, className = '' }: IconProps) => (
    <svg
      viewBox={def.viewBox}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: def.body }}
    />
  );
  Comp.displayName = \`Twemoji(\${name})\`;
  return Comp;
}

export const TWEMOJI_ICONS: Record<string, IconComponent> = Object.fromEntries(
  Object.keys(TWEMOJI).map((n) => [n, makeIcon(n)])
);
`;

writeFileSync(outPath, tsx, 'utf-8');
process.stdout.write(`\nwrote ${outPath} (${tsx.length.toLocaleString()} bytes, ${Object.keys(defs).length} icons)\n`);
