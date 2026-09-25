import { useEffect, useRef } from 'react';

const modalStack = [];

export default function useEscapeClose(onClose, enabled = true) {
  const closeRef = useRef(onClose);
  const hasHandler = Boolean(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!enabled || !hasHandler) return undefined;
    const token = {};
    modalStack.push(token);
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || modalStack.at(-1) !== token) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeRef.current?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const index = modalStack.indexOf(token);
      if (index >= 0) modalStack.splice(index, 1);
    };
  }, [enabled, hasHandler]);
}
