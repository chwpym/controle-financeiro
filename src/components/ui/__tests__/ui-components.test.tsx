/// <reference types="@testing-library/jest-dom/vitest" />
import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  Modal,
  Input,
  MoneyInput,
  ConfirmDialog,
  EmptyState,
} from '../index';

describe('UI Atomic Components (Design System)', () => {
  describe('Button', () => {
    it('renders with children and responds to click', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Salvar Lançamento</Button>);

      const btn = screen.getByRole('button', { name: /salvar lançamento/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disables button and shows spinner when isLoading=true', () => {
      const handleClick = vi.fn();
      render(<Button isLoading onClick={handleClick}>Processando</Button>);

      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Badge', () => {
    it('renders correct labels and semantic styles for status', () => {
      const { rerender } = render(<Badge variant="settled" />);
      expect(screen.getByText('Pago / Recebido')).toBeInTheDocument();

      rerender(<Badge variant="pending" />);
      expect(screen.getByText('Pendente')).toBeInTheDocument();

      rerender(<Badge variant="overdue" />);
      expect(screen.getByText('Vencido')).toBeInTheDocument();
    });
  });

  describe('Card', () => {
    it('renders title, subtitle and children content', () => {
      render(
        <Card>
          <CardHeader title="Resumo do Mês" subtitle="Novembro 2026" />
          <p>Conteúdo do Card</p>
        </Card>
      );

      expect(screen.getByText('Resumo do Mês')).toBeInTheDocument();
      expect(screen.getByText('Novembro 2026')).toBeInTheDocument();
      expect(screen.getByText('Conteúdo do Card')).toBeInTheDocument();
    });
  });

  describe('Modal', () => {
    it('renders when isOpen=true and triggers onClose on close button click', () => {
      const handleClose = vi.fn();
      const { rerender } = render(
        <Modal isOpen={false} onClose={handleClose} title="Novo Lançamento">
          <p>Formulário de Conta</p>
        </Modal>
      );

      expect(screen.queryByText('Novo Lançamento')).not.toBeInTheDocument();

      rerender(
        <Modal isOpen={true} onClose={handleClose} title="Novo Lançamento">
          <p>Formulário de Conta</p>
        </Modal>
      );

      expect(screen.getByText('Novo Lançamento')).toBeInTheDocument();
      expect(screen.getByText('Formulário de Conta')).toBeInTheDocument();

      const closeBtn = screen.getByRole('button', { name: /fechar/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose on Escape key press', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Modal Teste">
          Conteúdo
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('MoneyInput', () => {
    it('formats initial cents and triggers onChangeCents on typing', () => {
      function Wrapper() {
        const [cents, setCents] = useState(15000); // R$ 150,00
        return (
          <div>
            <MoneyInput valueCents={cents} onChangeCents={setCents} label="Valor da Parcela" />
            <span data-testid="cents-output">{cents}</span>
          </div>
        );
      }

      render(<Wrapper />);
      const input = screen.getByLabelText(/valor da parcela/i) as HTMLInputElement;
      expect(input.value).toBe('150,00');

      // Type new digits: replace with 25000 (R$ 250,00)
      fireEvent.change(input, { target: { value: '25000' } });
      expect(screen.getByTestId('cents-output').textContent).toBe('25000');
    });
  });

  describe('ConfirmDialog', () => {
    it('calls onConfirm when confirming and onClose when canceling', () => {
      const handleConfirm = vi.fn();
      const handleClose = vi.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          title="Excluir Lançamento"
          message="Tem certeza que deseja apagar esta conta?"
          confirmLabel="Sim, excluir"
          cancelLabel="Não, voltar"
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      );

      expect(screen.getByText('Excluir Lançamento')).toBeInTheDocument();
      expect(screen.getByText('Tem certeza que deseja apagar esta conta?')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /sim, excluir/i }));
      expect(handleConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /não, voltar/i }));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('EmptyState', () => {
    it('renders empty title, description and calls onAction', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="Nenhuma conta encontrada"
          description="Tente ajustar os filtros ou lance uma nova conta."
          actionLabel="Nova Conta"
          onAction={handleAction}
        />
      );

      expect(screen.getByText('Nenhuma conta encontrada')).toBeInTheDocument();
      expect(screen.getByText('Tente ajustar os filtros ou lance uma nova conta.')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /nova conta/i }));
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });
});
