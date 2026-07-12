import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * PWA manifest installability contract (ported from the Card Atlas v2.1.42
 * pattern). A regression here silently breaks Android/Chrome install.
 */
const publicDir = join(__dirname, '..', '..', 'public')
const manifest = JSON.parse(readFileSync(join(publicDir, 'manifest.json'), 'utf-8'))

interface ManifestIcon {
  src: string
  sizes: string
  type: string
  purpose?: string
}

describe('PWA manifest installability contract', () => {
  it('has the required install fields', () => {
    expect(manifest.name).toBe('KidsChores')
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.description).toBeTruthy()
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.id).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBeTruthy()
    expect(manifest.background_color).toBeTruthy()
  })

  it('declares any-192 + any-512 + maskable-512 icons', () => {
    const icons: ManifestIcon[] = manifest.icons
    const has = (sizes: string, purpose: string) =>
      icons.some(i => i.sizes === sizes && (i.purpose ?? 'any') === purpose)
    expect(has('192x192', 'any')).toBe(true)
    expect(has('512x512', 'any')).toBe(true)
    expect(has('512x512', 'maskable')).toBe(true)
  })

  it('every referenced icon file exists in public/', () => {
    const icons: ManifestIcon[] = manifest.icons
    for (const icon of icons) {
      const file = join(publicDir, icon.src.replace(/^\//, ''))
      expect(existsSync(file), `${icon.src} missing from public/`).toBe(true)
    }
  })

  it('the service worker file exists in public/', () => {
    expect(existsSync(join(publicDir, 'sw.js'))).toBe(true)
  })

  it('notification artwork exists and sw.js references it (the v0.13.0 Brave-icon bug)', () => {
    // A wrong path here gets the nginx SPA fallback (HTML) and the browser
    // swaps in ITS OWN icon. Both files must exist and sw.js must default
    // to them; the backend payload (push_service.py DEFAULT_ICON/DEFAULT_BADGE)
    // must reference the same files — guarded by backend/tests/test_push_payload_icons.py.
    expect(existsSync(join(publicDir, 'icon-192.png'))).toBe(true)
    expect(existsSync(join(publicDir, 'badge-72.png'))).toBe(true)
    const sw = readFileSync(join(publicDir, 'sw.js'), 'utf-8')
    expect(sw).toContain("icon: '/icon-192.png'")
    expect(sw).toContain("badge: '/badge-72.png'")
  })
})
