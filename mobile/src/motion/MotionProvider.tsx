import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';
const Context = createContext({ reducedMotion: true, active: true });

export function MotionProvider({ children }: PropsWithChildren) {
  // Até conhecer a preferência, o conteúdo fica disponível sem movimento.
  const [reducedMotion, setReducedMotion] = useState(() =>
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
        true)
      : true,
  );
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const state = AppState.addEventListener('change', (value) =>
      setActive(value === 'active'),
    );
    if (Platform.OS === 'web') {
      const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      const changed = (event: MediaQueryListEvent) =>
        setReducedMotion(event.matches);
      media?.addEventListener('change', changed);
      return () => {
        state.remove();
        media?.removeEventListener('change', changed);
      };
    }
    let alive = true,
      changed = false;
    const preference = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (value) => {
        changed = true;
        setReducedMotion(value);
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive && !changed) setReducedMotion(value);
      })
      .catch(() => {
        /* Mantém a opção conservadora se a consulta falhar. */
      });
    return () => {
      alive = false;
      state.remove();
      preference.remove();
    };
  }, []);
  const value = useMemo(
    () => ({ reducedMotion, active }),
    [reducedMotion, active],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useMotion = () => useContext(Context);
