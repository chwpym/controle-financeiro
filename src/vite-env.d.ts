/// <reference types="vite/client" />

/**
 * Global compile-time build metadata injected by Vite (`vite.config.ts`).
 * Declaração global das constantes de versão, commit e horário de compilação
 * injetadas automaticamente pelo Vite para que o TypeScript reconheça sem erros no lint.
 */
declare const __APP_VERSION__: string;
declare const __COMMIT_HASH__: string;
declare const __BUILD_TIME__: string;
