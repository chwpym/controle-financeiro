/// <reference types="@testing-library/jest-dom/vitest" />
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DeployFooter } from '../DeployFooter';
import { UpdateCenterModal } from '../UpdateCenterModal';
import { getLocalBuildInfo } from '../../utils/pwaUpdate';

/**
 * Helper wrapper simulating the App footer + UpdateCenterModal integration.
 * Componente auxiliar de teste que simula a integração entre o badge do rodapé e o modal da Central de Atualizações.
 */
const FooterWithUpdateModalHarness: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <DeployFooter isOnline={true} onOpenUpdateCenter={() => setOpen(true)} />
      <UpdateCenterModal isOpen={open} onClose={() => setOpen(false)} isOnline={true} />
    </div>
  );
};

describe('UpdateCenterModal & DeployFooter (Fase 10.1)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /**
   * Test 1: Renders installed version, active commit, environment badge, and recent changelog.
   * Teste 1: Verifica a renderização das informações de versão, commit ativo, ambiente e histórico de releases.
   */
  it('renderiza versão instalada, commit ativo e histórico de releases na Central de Atualizações', () => {
    const local = getLocalBuildInfo();
    const handleClose = vi.fn();

    render(<UpdateCenterModal isOpen={true} onClose={handleClose} isOnline={true} />);

    expect(
      screen.getByRole('heading', { name: /Central de Atualizações & Diagnóstico/i })
    ).toBeInTheDocument();

    expect(screen.getByTestId('installed-version')).toHaveTextContent(`v${local.version}`);
    expect(screen.getByTestId('active-commit')).toHaveTextContent(local.commit);
    expect(screen.getByText('Ambiente de Produção')).toBeInTheDocument();

    // Verifica itens obrigatórios do Changelog / Checks required changelog items
    expect(screen.getByText('v1.9.3')).toBeInTheDocument();
    expect(screen.getByText('v1.9.2')).toBeInTheDocument();
    expect(screen.getByText('v1.9.1')).toBeInTheDocument();
    expect(screen.getByText('v1.8.0')).toBeInTheDocument();
  });

  /**
   * Test 2: Clicking "Verificar Novas Atualizações" queries /api/version, updates diagnostic logs,
   * and shows up-to-date badge when local and remote commits match.
   * Teste 2: Valida o botão "Verificar Novas Atualizações" consultando a API, atualizando o console
   * de diagnóstico e exibindo o aviso de versão mais recente quando não há novo deploy.
   */
  it('consulta /api/version, atualiza o log de diagnóstico e exibe badge de sistema atualizado', async () => {
    const local = getLocalBuildInfo();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: local.version,
        commit: local.commit,
        buildTime: local.buildTime,
        serverTime: '2026-11-24T16:45:00.000Z',
        status: 'healthy',
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<UpdateCenterModal isOpen={true} onClose={vi.fn()} isOnline={true} />);

    const checkBtn = screen.getByTestId('check-updates-button');
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // Valida URL consultada / Verifies endpoint queried
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/version');

    // Valida badge de versão atualizada / Verifies up-to-date badge
    expect(await screen.findByTestId('up-to-date-badge')).toHaveTextContent(
      /Você está utilizando a versão mais recente do sistema!/i
    );

    // Valida mensagens no log de diagnóstico / Verifies diagnostic terminal log lines
    const logBox = screen.getByTestId('diagnostic-log');
    expect(logBox).toHaveTextContent('Conectado ao servidor de produção.');
    expect(logBox).toHaveTextContent('Comparando versão local com a nuvem...');
    expect(logBox).toHaveTextContent('Cache do Service Worker verificado com sucesso.');
  });

  /**
   * Test 3: Displays the update alert and "Atualizar Sistema Agora" button when server reports a newer commit,
   * and clears PWA caches upon clicking update.
   * Teste 3: Exibe o banner de nova atualização e o botão "Atualizar Sistema Agora" quando o servidor
   * retorna um commit diferente, executando a limpeza de Cache Storage ao acionar a atualização.
   */
  it('exibe botão "Atualizar Sistema Agora" quando há nova versão no servidor e limpa caches ao clicar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: '1.10.3',
        commit: 'ff8899a',
        buildTime: '2026-11-24T17:00:00.000Z',
        serverTime: '2026-11-24T17:05:00.000Z',
        status: 'healthy',
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Mock Cache Storage & Service Worker / Simula Cache Storage e Service Worker no ambiente JSDOM
    const deleteCacheMock = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {
        keys: vi.fn().mockResolvedValue(['workbox-precache-v2', 'google-fonts-cache']),
        delete: deleteCacheMock,
      },
    });

    const swUpdateMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistrations: vi.fn().mockResolvedValue([{ update: swUpdateMock }]),
      },
    });

    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });

    render(<UpdateCenterModal isOpen={true} onClose={vi.fn()} isOnline={true} />);

    fireEvent.click(screen.getByTestId('check-updates-button'));

    const banner = await screen.findByTestId('update-available-banner');
    expect(banner).toHaveTextContent('v1.10.3 • ff8899a');

    const applyBtn = screen.getByTestId('apply-update-button');
    expect(applyBtn).toHaveTextContent(/Atualizar Sistema Agora/i);

    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(deleteCacheMock).toHaveBeenCalledWith('workbox-precache-v2');
      expect(deleteCacheMock).toHaveBeenCalledWith('google-fonts-cache');
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Test 4: Renders the Deploy Badge in the footer and opens the Update Center modal when clicked.
   * Teste 4: Renderiza o badge de versão e status no rodapé e abre o modal da Central de Atualizações ao clicar.
   */
  it('renderiza o badge de versão no rodapé e dispara a abertura da Central de Atualizações ao clicar', () => {
    const local = getLocalBuildInfo();

    render(<FooterWithUpdateModalHarness />);

    expect(screen.getByText(/FluxoClaro © 2026 · Gestão Financeira/i)).toBeInTheDocument();

    const badge = screen.getByTestId('deploy-version-badge');
    expect(badge).toHaveTextContent(`v${local.version} • ${local.commit}`);
    expect(badge).toHaveTextContent('Atualizações');

    // Modal inicialmente fechado / Modal is initially closed
    expect(screen.queryByTestId('update-center-modal')).not.toBeInTheDocument();

    // Clica no badge do rodapé / Clicks footer badge
    fireEvent.click(badge);

    // Modal aberto com sucesso / Modal opens immediately
    expect(screen.getByTestId('update-center-modal')).toBeInTheDocument();

    // Fecha o modal no botão X / Closes modal via close button
    fireEvent.click(screen.getByTestId('update-center-close'));
    expect(screen.queryByTestId('update-center-modal')).not.toBeInTheDocument();
  });
});
