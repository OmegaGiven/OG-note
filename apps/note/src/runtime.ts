import {
  createBrowserLocalCache,
  createBrowserSyncQueue,
  createHttpApiClient,
  createNoopDocumentUpdateChannel,
  createNoopPresenceChannel,
  createOfflineApiClient,
  createRuntimeId,
  createWebSocketDocumentUpdates,
  createWebSocketPresence,
} from '@og-suite/runtime'
import { loadStoredTokens } from '@og-suite/ui'
import type { RuntimeServices } from '@og-suite/runtime'

function loadClientId() {
  const clientId = localStorage.getItem('og-suite:client-id') ?? createRuntimeId('client')
  localStorage.setItem('og-suite:client-id', clientId)
  return clientId
}

export function createStandaloneRuntime(serverUrl?: string): RuntimeServices {
  const apiHost = typeof window === 'undefined' || window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname
  const defaultApiUrl =
    typeof window === 'undefined' ? 'http://127.0.0.1:8080' : `http://${apiHost}:8080`
  const storedServerUrl = typeof localStorage === 'undefined' ? null : localStorage.getItem('og-suite:server-url')
  const baseUrl = serverUrl ?? import.meta.env.VITE_OG_API_URL ?? storedServerUrl ?? defaultApiUrl
  const clientId = loadClientId()
  return {
    api: createHttpApiClient(baseUrl, () => localStorage.getItem('og-suite:auth:access-token')),
    cache: createBrowserLocalCache('og-suite:notes:workspace'),
    syncQueue: createBrowserSyncQueue('og-suite:notes:sync-queue'),
    presence: createWebSocketPresence(baseUrl, clientId),
    documentUpdates: createWebSocketDocumentUpdates(baseUrl, clientId),
    tokens: loadStoredTokens(),
    clientId,
    runtimeMode: 'remote',
    serverUrl: baseUrl,
  }
}

export function createLocalOnlyRuntime(): RuntimeServices {
  const clientId = loadClientId()
  return {
    api: createOfflineApiClient(),
    cache: createBrowserLocalCache('og-suite:notes:workspace'),
    syncQueue: createBrowserSyncQueue('og-suite:notes:sync-queue'),
    presence: createNoopPresenceChannel(),
    documentUpdates: createNoopDocumentUpdateChannel(),
    tokens: loadStoredTokens(),
    clientId,
    runtimeMode: 'local',
  }
}
