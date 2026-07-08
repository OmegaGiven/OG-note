import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

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
})
