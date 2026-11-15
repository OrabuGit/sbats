import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * True once the element is within `margin` of the screen. Large pictures below the fold use it to start loading only when
 * the visitor scrolls close, so they do not compete with the first screen. Without IntersectionObserver it is always true.
 */
export function useNear<T extends HTMLElement>(margin = '500px'): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, margin]);
  return [ref, near];
}
