/**
 * State for one 4-digit MPIN entry. Calls `onComplete` once when the
 * 4th digit is entered. Digits live only in component memory.
 */
import { useCallback, useRef, useState } from 'react';
import { MPIN_LENGTH } from '@services/ucSecurity/mpinRules';

export function usePinInput(onComplete: (pin: string) => void) {
  const [pin, setPin] = useState('');
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const addDigit = useCallback((d: string) => {
    setPin(prev => {
      if (prev.length >= MPIN_LENGTH) return prev;
      const next = prev + d;
      if (next.length === MPIN_LENGTH) {
        // After this render, so the 4th dot shows before the work starts.
        setTimeout(() => completeRef.current(next), 0);
      }
      return next;
    });
  }, []);

  const removeDigit = useCallback(() => setPin(prev => prev.slice(0, -1)), []);
  const clear = useCallback(() => setPin(''), []);

  return { pin, addDigit, removeDigit, clear };
}
