import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

export const PRESENTATION_DURATION = 3000;
type Presentation = {
  kind: 'abertura' | 'login' | 'cadastro';
  startedAt: number;
};
const Context = createContext<{
  presentation: Presentation;
  expired: boolean;
  apresentar: (kind: 'login' | 'cadastro') => void;
} | null>(null);

export function PresentationProvider({ children }: PropsWithChildren) {
  const [presentation, setPresentation] = useState<Presentation>(() => ({
    kind: 'abertura',
    startedAt: Date.now(),
  }));
  const [expired, setExpired] = useState(false);
  const apresentar = useCallback((kind: 'login' | 'cadastro') => {
    setExpired(false);
    setPresentation({ kind, startedAt: Date.now() });
  }, []);
  useEffect(() => {
    const update = () =>
      setExpired(Date.now() - presentation.startedAt >= PRESENTATION_DURATION);
    const timer = setTimeout(
      update,
      Math.max(
        0,
        PRESENTATION_DURATION - (Date.now() - presentation.startedAt),
      ),
    );
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [presentation]);
  const value = useMemo(
    () => ({ presentation, expired, apresentar }),
    [presentation, expired, apresentar],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePresentation() {
  const value = useContext(Context);
  if (!value) throw new Error('usePresentation requer PresentationProvider.');
  return value;
}
