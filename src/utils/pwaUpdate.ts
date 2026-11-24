/**
 * Payload returned by GET /api/version on the backend.
 * Estrutura de dados retornada pelo endpoint GET /api/version do backend.
 */
export interface ServerVersionPayload {
  version: string;
  commit: string;
  buildTime: string;
  serverTime: string;
  status: 'healthy' | 'degraded' | string;
}

/**
 * Detailed result of comparing local build metadata with the remote server.
 * Resultado detalhado da comparação entre os metadados locais do bundle e o servidor em nuvem.
 */
export interface VersionCheckResult {
  hasUpdate: boolean;
  localVersion: string;
  localCommit: string;
  localBuildTime: string;
  serverVersion: string;
  serverCommit: string;
  serverBuildTime: string;
  serverTime: string;
  status: string;
  latencyMs: number;
  swChecked: boolean;
}

/**
 * Safely reads the compile-time constants injected by Vite, providing fallbacks for isolated environments.
 * Lê de forma segura as constantes injetadas pelo Vite no momento do build, garantindo fallback seguro em testes.
 */
export function getLocalBuildInfo(): { version: string; commit: string; buildTime: string } {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.10.2';
  const commit = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev';
  const buildTime =
    typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();
  return { version, commit, buildTime };
}

/**
 * Queries GET /api/version bypassing browser HTTP caches, checks Service Worker updates,
 * and compares the remote commit/version against the local frontend bundle.
 * Consulta `GET /api/version` ignorando caches intermediários, solicita verificação ao Service Worker
 * e compara o commit/versão retornados pelo servidor com o `__COMMIT_HASH__` local do frontend.
 */
export async function checkServerVersion(): Promise<VersionCheckResult> {
  const local = getLocalBuildInfo();
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  // Request fresh version info from backend / Consulta o endpoint sem usar cache HTTP
  const response = await fetch(`/api/version?t=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar versão no servidor (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as ServerVersionPayload;
  const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const latencyMs = Math.max(1, Math.round(endedAt - startedAt));

  // Also trigger Service Worker update check if supported / Verifica atualização no Service Worker ativo
  let swChecked = false;
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.update()));
      swChecked = true;
    } catch {
      swChecked = false;
    }
  }

  const normalizedServerCommit = (data.commit || '').trim();
  const normalizedLocalCommit = (local.commit || '').trim();
  const normalizedServerVersion = (data.version || '').trim();
  const normalizedLocalVersion = (local.version || '').trim();

  // Detect new deploy if commit hash differs (ignoring empty) or semantic version differs
  // Detecta nova versão caso o hash do commit ou a versão semântica do servidor sejam diferentes do bundle local
  const commitChanged =
    Boolean(normalizedServerCommit) &&
    Boolean(normalizedLocalCommit) &&
    normalizedServerCommit !== normalizedLocalCommit;

  const versionChanged =
    Boolean(normalizedServerVersion) &&
    Boolean(normalizedLocalVersion) &&
    normalizedServerVersion !== normalizedLocalVersion;

  return {
    hasUpdate: commitChanged || versionChanged,
    localVersion: local.version,
    localCommit: local.commit,
    localBuildTime: local.buildTime,
    serverVersion: data.version || local.version,
    serverCommit: data.commit || local.commit,
    serverBuildTime: data.buildTime || local.buildTime,
    serverTime: data.serverTime || new Date().toISOString(),
    status: data.status || 'healthy',
    latencyMs,
    swChecked,
  };
}

/**
 * Purges all Cache Storage entries, updates and activates/unregisters stale Service Workers,
 * and reloads the current page so the browser immediately fetches the newest production bundle.
 * Limpa todos os caches locais registrados (`caches.keys()`), solicita atualização ao Service Worker ativo
 * e recarrega a página imediatamente (`window.location.reload()`), eliminando qualquer bundle antigo preso em cache.
 */
export async function forcePwaRefresh(): Promise<void> {
  // 1. Delete all Cache Storage keys / Limpa todas as chaves do Cache Storage do navegador
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    } catch {
      // Ignore cache deletion restrictions / Ignora restrições de ambiente caso Cache API esteja indisponível
    }
  }

  // 2. Ask active Service Worker registrations to update / Solicita atualização ao Service Worker ativo
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (registration) => {
          try {
            await registration.update();
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          } catch {
            // Ignore individual SW update errors
          }
        })
      );
    } catch {
      // Ignore SW lookup errors
    }
  }

  // 3. Reload application window / Recarrega a aplicação para carregar o novo bundle limpo
  if (typeof window !== 'undefined' && window.location) {
    window.location.reload();
  }
}
