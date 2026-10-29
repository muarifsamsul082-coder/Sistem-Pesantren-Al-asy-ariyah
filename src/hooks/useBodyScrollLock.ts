import { useEffect } from 'react';

/**
 * Custom hook to lock body scrolling whenever a modal or popup is open.
 * Prevents background content from scrolling behind the popup.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    const originalPosition = document.body.style.position;
    const scrollY = window.scrollY;

    // Lock body
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow || '';
      document.body.style.touchAction = originalTouchAction || '';
      document.body.style.position = originalPosition || '';
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}
