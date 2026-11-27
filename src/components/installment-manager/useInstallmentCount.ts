import { useState } from 'react';
import { MAX_INSTALLMENTS } from '../../utils/format';

/** Estado e handlers compartilhados de "quantidade de parcelas" (atalhos + input livre). */
export function useInstallmentCount(initial: number, onSmallCount?: () => void) {
  const [count, setCount] = useState<number>(initial);
  const [input, setInput] = useState<string>(String(initial));
  const [limitExceeded, setLimitExceeded] = useState<boolean>(false);

  const handlePreset = (val: number) => {
    const clamped = Math.max(1, Math.min(MAX_INSTALLMENTS, val));
    setCount(clamped);
    setInput(String(clamped));
    setLimitExceeded(false);
    if (clamped <= 6) onSmallCount?.();
  };

  const handleInputChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      setInput('');
      setLimitExceeded(false);
      return;
    }
    const parsed = Number.parseInt(digitsOnly, 10);
    if (!Number.isFinite(parsed)) return;

    setInput(digitsOnly);
    if (parsed > MAX_INSTALLMENTS) {
      setLimitExceeded(true);
      setCount(MAX_INSTALLMENTS);
      return;
    }

    setLimitExceeded(false);
    const clamped = Math.max(1, parsed);
    setCount(clamped);
    if (clamped <= 6) onSmallCount?.();
  };

  return { count, input, limitExceeded, handlePreset, handleInputChange };
}
