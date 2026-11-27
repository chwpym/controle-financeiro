/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * EN: Resolves the application semantic version (`1.11.0` from `package.json`).
 *     When running on Render (`process.env.RENDER`) or when `git rev-list --count HEAD` returns 1
 *     (shallow clone `--depth 1`), uses the exact `package.json` version (`1.11.0`) so footer and
 *     sidebar always display `v1.11.0 • <commit>` in production.
 * PT: Resolve a versão semântica da aplicação (`1.11.0` do `package.json`).
 *     Quando `process.env.RENDER` estiver ativo ou a contagem do Git for 1 (shallow clone `--depth 1`),
 *     utiliza a versão declarada no `package.json` (`1.11.0`), garantindo que rodapé e sidebar mostrem
 *     sempre `v1.11.0 • <commit>` em produção.
 */
function resolveAppVersion(skipSubprocess = false): string {
  let baseVersion = '1.11.0';
  try {
    const pkgPath = path.resolve(rootDir, 'package.json');
    const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgRaw) as { version?: string };
    if (pkg.version?.trim()) {
      baseVersion = pkg.version.trim();
    }
  } catch {
    // Keep fallback baseVersion / Mantém baseVersion padrão
  }

  // On Render CI/CD or inside Vitest child workers, always honor package.json version (1.11.0)
  // No ambiente Render ou em workers do Vitest, utiliza diretamente a versão oficial do package.json (1.11.0)
  if (skipSubprocess || Boolean(process.env.RENDER)) {
    return baseVersion;
  }

  try {
    const commitCountRaw = execSync('git rev-list --count HEAD', {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const commitCount = Number.parseInt(commitCountRaw, 10);
    // Shallow clones (--depth 1) report count === 1; keep exact package.json version in that case
    // Clones rasos (--depth 1) retornam contagem === 1; mantém a versão exata do package.json
    if (Number.isFinite(commitCount) && commitCount > 1) {
      const parts = baseVersion.split('.');
      const major = parts[0] || '1';
      const minor = parts[1] || '11';
      const declaredPatch = Number.parseInt(parts[2] || '0', 10);
      // If package.json just bumped minor (patch === 0, e.g. 1.11.0), keep 1.11.0 cleanly;
      // otherwise allow local git count when higher than declared patch.
      if (declaredPatch === 0) {
        return baseVersion;
      }
      return `${major}.${minor}.${commitCount}`;
    }
  } catch {
    // Fallback to package.json version when .git is absent / Fallback para package.json caso .git não esteja disponível
  }

  return baseVersion;
}

/**
 * Resolve the active short Git commit hash (Render CI/CD env first, local git fallback).
 * Captura o hash curto do Git Commit atual priorizando RENDER_GIT_COMMIT no deploy do Render
 * e utilizando fallback para o comando local `git rev-parse --short HEAD` (ou 'dev').
 * Em workers filhos do Vitest, evita disparar múltiplos subprocessos simultâneos no Windows.
 */
function resolveCommitHash(skipSubprocess = false): string {
  const renderCommit = process.env.RENDER_GIT_COMMIT?.trim();
  if (renderCommit) {
    return renderCommit.slice(0, 7);
  }
  if (skipSubprocess) {
    return 'dev';
  }
  try {
    return (
      execSync('git rev-parse --short HEAD', {
        cwd: rootDir,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim() || 'dev'
    );
  } catch {
    return 'dev';
  }
}

export default defineConfig(({ mode }) => {
  const isTest = mode === 'test' || Boolean(process.env.VITEST);
  const isVitestWorker = Boolean(process.env.VITEST_WORKER_ID || process.env.VITEST_POOL_ID);

  // Build metadata constants injected into the frontend bundle at compile time
  // Constantes de metadados do build injetadas globalmente no bundle do frontend em tempo de compilação
  const appVersion = resolveAppVersion(isVitestWorker);
  const commitHash = resolveCommitHash(isVitestWorker);
  const buildTime = new Date().toISOString();

  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __BUILD_TIME__: JSON.stringify(buildTime),
    },
    plugins: [
      react(),
      ...(!isTest
        ? [
            tailwindcss(),
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
              manifest: {
                id: '/',
                name: 'FluxoClaro - Contas a Pagar e Receber',
                short_name: 'FluxoClaro',
                description: 'Controle simples de contas a pagar e receber em BRL com parcelamento, funcionamento offline e relatórios mensais.',
                theme_color: '#0F766E',
                background_color: '#F8FAFC',
                display: 'standalone',
                start_url: '/',
                scope: '/',
                lang: 'pt-BR',
                icons: [
                  {
                    src: '/pwa-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: '/pwa-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: '/pwa-maskable-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              },
              workbox: {
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api\//],
                runtimeCaching: [
                  {
                    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'google-fonts-cache',
                      expiration: {
                        maxEntries: 10,
                        maxAgeSeconds: 60 * 60 * 24 * 365,
                      },
                      cacheableResponse: {
                        statuses: [0, 200],
                      },
                    },
                  },
                  {
                    urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'gstatic-fonts-cache',
                      expiration: {
                        maxEntries: 10,
                        maxAgeSeconds: 60 * 60 * 24 * 365,
                      },
                      cacheableResponse: {
                        statuses: [0, 200],
                      },
                    },
                  },
                ],
              },
              devOptions: {
                enabled: false,
              },
            }),
            {
              name: 'copy-unbundled-src-assets',
              apply: 'build' as const,
              closeBundle(error?: Error): void {
                if (error) {
                  return;
                }
                const distDir = path.resolve(rootDir, 'dist');
                const srcAssets = path.resolve(rootDir, 'src/assets');
                const distAssets = path.resolve(distDir, 'src/assets');
                if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
                  fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
                }
              },
            },
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      pool: 'forks',
      // EN: Limits concurrent fork workers on Windows and raises testTimeout to prevent 5000ms timeouts under heavy CPU load.
      // PT: Limita workers simultâneos no Windows e amplia o testTimeout para evitar timeouts de 5000ms sob carga.
      maxWorkers: 2,
      testTimeout: 20000,
    },
  };
});
