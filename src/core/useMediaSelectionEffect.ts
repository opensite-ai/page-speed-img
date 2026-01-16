import { useEffect } from 'react';

const MEDIA_SELECTED_EVENT = 'dt:media-selected';
const mediaSelectionHandler = () => {
  // no-op: the real handler is attached in the builder via addEventListener
};

let mediaSelectionListenerCount = 0;
let isMediaSelectionListenerAttached = false;

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
    if (!isMediaSelectionListenerAttached) {
      window.addEventListener(MEDIA_SELECTED_EVENT, mediaSelectionHandler);
      isMediaSelectionListenerAttached = true;
    }
    mediaSelectionListenerCount += 1;

    return () => {
      mediaSelectionListenerCount -= 1;
      if (mediaSelectionListenerCount <= 0 && isMediaSelectionListenerAttached) {
        window.removeEventListener(MEDIA_SELECTED_EVENT, mediaSelectionHandler);
        isMediaSelectionListenerAttached = false;
      }
    };
  }, []);
}
