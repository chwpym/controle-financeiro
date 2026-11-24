import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';
import { db } from '../db';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * Timestamp recorded when the backend server booted (fallback for buildTime).
 * Data/hora registrada na inicialização do servidor backend (utilizada como referência de deploy).
 */
const SERVER_BOOT_TIME = new Date().toISOString();

/**
 * Resolves the semantic version automatically by combining `<major>.<minor>` from `package.json`
 * with the Git commit count (`git rev-list --count HEAD`) so every commit increments the patch automatically
 * (e.g., `1.10.26`), falling back to `package.json` when `.git` is unavailable.
 *
 * Resolve a versão semântica automaticamente combinando `<major>.<minor>` do `package.json` com o
 * total de commits do Git (`git rev-list --count HEAD`), incrementando o último número a cada commit
 * (ex: `1.10.26`), com fallback seguro para o `package.json` caso `.git` não esteja presente.
 */
function resolveServerVersion(): string {
  let baseVersion = '1.10.2';
  try {
    const pkgPath = path.resolve(ROOT_DIR, 'package.json');
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const parsed = JSON.parse(raw) as { version?: string };
    if (parsed.version?.trim()) {
      baseVersion = parsed.version.trim();
    }
  } catch {
    // Keep fallback baseVersion / Mantém versão base de segurança
  }

  try {
    const commitCountRaw = execSync('git rev-list --count HEAD', {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const commitCount = Number.parseInt(commitCountRaw, 10);
    if (Number.isFinite(commitCount) && commitCount > 0) {
      const parts = baseVersion.split('.');
      const major = parts[0] || '1';
      const minor = parts[1] || '10';
      return `${major}.${minor}.${commitCount}`;
    }
  } catch {
    // Fallback to package.json version if .git is not present in container / Fallback caso .git não exista
  }

  return baseVersion;
}

/**
 * Resolves the active Git short commit hash, prioritizing RENDER_GIT_COMMIT.
 * Obtém o hash curto do commit ativo, priorizando a variável de ambiente RENDER_GIT_COMMIT
 * (fornecida pelo Render em produção) ou executando `git rev-parse --short HEAD` localmente.
 */
function resolveServerCommit(): string {
  const renderCommit = process.env.RENDER_GIT_COMMIT?.trim();
  if (renderCommit) {
    return renderCommit.slice(0, 7);
  }
  try {
    return (
      execSync('git rev-parse --short HEAD', {
        cwd: ROOT_DIR,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim() || 'dev'
    );
  } catch {
    return 'dev';
  }
}

/**
 * Resolves the build timestamp from dist/index.html mtime if available, or boot time.
 * Determina o horário de compilação/build a partir da data de modificação do bundle `dist/index.html`
 * quando em produção, ou usa o horário de inicialização do servidor como fallback.
 */
function resolveBuildTime(): string {
  try {
    const distIndex = path.resolve(ROOT_DIR, 'dist/index.html');
    if (fs.existsSync(distIndex)) {
      return fs.statSync(distIndex).mtime.toISOString();
    }
  } catch {
    // Fallback to boot time / Usa o horário de boot caso dist não exista em modo dev
  }
  return SERVER_BOOT_TIME;
}

const CACHED_VERSION = resolveServerVersion();
const CACHED_COMMIT = resolveServerCommit();
const CACHED_BUILD_TIME = resolveBuildTime();

/**
 * Checks SQLite database connectivity and integrity with a fast lightweight query.
 * Verifica rapidamente a conectividade e integridade do banco SQLite através de uma query leve.
 */
function checkDatabaseHealth(): boolean {
  try {
    const row = db.prepare('SELECT 1 AS ok').get() as { ok?: number } | undefined;
    return row?.ok === 1;
  } catch {
    return false;
  }
}

/**
 * GET /api/version
 * Public lightweight endpoint returning current version, commit hash, build/server timestamps and SQLite health.
 * Endpoint público e leve que retorna versão, commit ativo, horários de build/servidor e integridade do SQLite,
 * permitindo que a Central de Atualizações detecte novos deploys na nuvem sem cache intermediário.
 */
router.get('/version', (_req: Request, res: Response) => {
  const dbHealthy = checkDatabaseHealth();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json({
    version: CACHED_VERSION,
    commit: process.env.RENDER_GIT_COMMIT?.trim().slice(0, 7) || CACHED_COMMIT,
    buildTime: CACHED_BUILD_TIME,
    serverTime: new Date().toISOString(),
    status: dbHealthy ? 'healthy' : 'degraded',
  });
});

export default router;
