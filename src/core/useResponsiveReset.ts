import { useEffect } from 'react';

export function resetResponsivePictureState(element: HTMLPictureElement | null) {
  if (!element) return;
  element.querySelectorAll('source').forEach((source) => {
    // force browser to reconsider responsive sources
    const srcset = source.getAttribute('srcset');
    if (srcset) {
      source.setAttribute('data-srcset', srcset);
      source.removeAttribute('srcset');
      requestAnimationFrame(() => {
        source.setAttribute('srcset', srcset);
      });
    }
  });
}

export function useResponsiveReset(ref: React.RefObject<HTMLPictureElement | HTMLImageElement>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (element instanceof HTMLPictureElement) {
      resetResponsivePictureState(element);
    } else if (element.parentElement instanceof HTMLPictureElement) {
      resetResponsivePictureState(element.parentElement);
    }
  }, [ref]);
}

