import { mount } from 'svelte'
import StandaloneNotesApp from './StandaloneNotesApp.svelte'
import './styles.css'

mount(StandaloneNotesApp, {
  target: document.getElementById('app')!,
})
