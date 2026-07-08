import { mount } from 'svelte'
import { applyTokens, loadThemeMode, resolveTheme } from '@og-toolkit/theme'
import StandaloneNotesApp from './StandaloneNotesApp.svelte'
import './styles.css'

// Apply the resolved theme (system or independent, see @og-toolkit/theme)
// before mounting, so the app never flashes its bundled default colors
// first.
resolveTheme(loadThemeMode())
  .then((tokens) => applyTokens(tokens))
  .finally(() => {
    mount(StandaloneNotesApp, {
      target: document.getElementById('app')!,
    })
  })
