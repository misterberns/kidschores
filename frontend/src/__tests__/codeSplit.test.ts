/**
 * v0.15.1 code-split contract: route pages must stay lazy.
 *
 * A single static `import { X } from './pages/X'` in App.tsx folds that page
 * (and its component graph) back into the entry chunk, silently undoing the
 * split. This source-inspection guard makes the regression a test failure.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const appSource = readFileSync(resolve(here, '../App.tsx'), 'utf-8')

describe('code-split contract (v0.15.1)', () => {
  it('App.tsx has NO static page imports', () => {
    // Static form: `import ... from './pages/X'` — dynamic `import('./pages/X')`
    // inside lazyWithRetry factories is the only allowed reference.
    const staticPageImport = /^import\s+[^(]*?from\s+['"]\.\/pages\//m
    expect(appSource).not.toMatch(staticPageImport)
  })

  it('every route page is wrapped in lazyWithRetry', () => {
    const lazyCount = (appSource.match(/lazyWithRetry\(\(\)\s*=>\s*import\(['"]\.\/pages\//g) || []).length
    expect(lazyCount).toBeGreaterThanOrEqual(16)
  })

  it('a Suspense boundary exists (lazy pages need a fallback)', () => {
    expect(appSource).toContain('<Suspense')
  })
})
