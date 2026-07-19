import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

const appVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version

const alias = [
  { find: '@og-suite/ui/ActionBar', replacement: fileURLToPath(new URL('../../packages/ui/src/ActionBar.svelte', import.meta.url)) },
  { find: '@og-suite/ui/Icon', replacement: fileURLToPath(new URL('../../packages/ui/src/Icon.svelte', import.meta.url)) },
  { find: '@og-suite/ui/MobileSuiteTopBar', replacement: fileURLToPath(new URL('../../packages/ui/src/MobileSuiteTopBar.svelte', import.meta.url)) },
  { find: '@og-suite/contracts', replacement: fileURLToPath(new URL('../../packages/contracts/src/index.ts', import.meta.url)) },
  { find: '@og-suite/crdt', replacement: fileURLToPath(new URL('../../packages/crdt/src/index.ts', import.meta.url)) },
  { find: '@og-suite/runtime', replacement: fileURLToPath(new URL('../../packages/runtime/src/index.ts', import.meta.url)) },
  { find: '@og-suite/sync', replacement: fileURLToPath(new URL('../../packages/sync/src/index.ts', import.meta.url)) },
  { find: '@og-suite/ui', replacement: fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)) },
  { find: '@og-toolkit/theme/ThemeModeToggle', replacement: fileURLToPath(new URL('../../packages/theme/src/ThemeModeToggle.svelte', import.meta.url)) },
  { find: '@og-toolkit/theme', replacement: fileURLToPath(new URL('../../packages/theme/src/index.ts', import.meta.url)) },
]

export default defineConfig({
  base: process.env.OG_NOTES_BASE ?? '/',
  plugins: [svelte()],
  resolve: { alias },
  define: {
    // Single source of truth for the version shown in Settings — bump
    // package.json's version and this follows automatically, no separate
    // env var to remember to set.
    'import.meta.env.VITE_OG_APP_VERSION': JSON.stringify(appVersion),
  },
})
