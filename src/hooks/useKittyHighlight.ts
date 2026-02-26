import { useState, useEffect } from 'react';

/**
 * Returns true while the element with the given kitty-id is highlighted.
 * Highlight is triggered via window CustomEvent 'kitty:highlight'.
 * Auto-clears after 4 seconds.
 */
export function useKittyHighlight(id: string): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail.id === id) {
        setActive(true);
        setTimeout(() => setActive(false), 4000);
      }
    };
    window.addEventListener('kitty:highlight', handler);
    return () => window.removeEventListener('kitty:highlight', handler);
  }, [id]);

  return active;
}
