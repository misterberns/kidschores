/**
 * Always-visible app version in the header (v0.17.0) — every role, every page,
 * so verbal bug reports can name the exact version without digging into Help.
 * Text is deliberately just "v<semver>" (no "KidsChores " prefix): the Help
 * page's e2e locator filters `.font-mono` on 'KidsChores v' and a second match
 * would break its strict mode.
 */
export function VersionChip() {
  return (
    <span
      data-testid="version-chip"
      aria-label={`App version ${__APP_VERSION__}`}
      className="font-mono text-[10px] text-text-secondary select-none"
    >
      v{__APP_VERSION__}
    </span>
  );
}
