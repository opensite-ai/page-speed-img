import { useEffect } from 'react';

const MEDIA_SELECTED_EVENT = 'dt:media-selected';

export function sendMediaSelection(blockId: string, payload: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(MEDIA_SELECTED_EVENT, {
      detail: { blockId, payload },
    })
  );
}

export function useMediaSelectionEffect() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      // no-op: the real handler is attached in the builder via addEventListener
    };
    window.addEventListener(MEDIA_SELECTED_EVENT, handler);
    return () => window.removeEventListener(MEDIA_SELECTED_EVENT, handler);
  }, []);
}

