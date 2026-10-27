/** Ritmo visual único; nenhuma ação de negócio espera a animação terminar. */
export const motionDurations = {
  press: 110,
  release: 140,
  reveal: 190,
  focus: 150,
  navigation: 250,
  expand: 230,
  feedback: 280,
} as const;
export function staggerDelay(index: number) {
  return Math.min(4, Math.max(0, Math.floor(index))) * 25;
}

const tabs = new Set([
  'Home',
  'BuscarCuidador',
  'Agenda',
  'Mensagens',
  'Perfil',
]);
const forms = new Set([
  'EditarPerfil',
  'EditarIdoso',
  'AdicionarIdoso',
  'CriarProposta',
  'AgendarAtendimento',
]);
export type NavigationSnapshot = {
  index: number;
  routes: readonly { key: string; name: string }[];
};
export type NavigationMotion =
  'none' | 'forward' | 'back' | 'tab' | 'fade' | 'form';
export function navigationMotion(
  before: NavigationSnapshot | undefined,
  after: NavigationSnapshot,
): NavigationMotion {
  const previous = before?.routes[before.index],
    next = after.routes[after.index];
  if (!previous || !next || previous.key === next.key) return 'none';
  if (tabs.has(previous.name) && tabs.has(next.name)) return 'tab';
  if (before!.routes.some((route) => route.key === next.key)) return 'back';
  if (!after.routes.some((route) => route.key === previous.key)) return 'fade';
  return forms.has(next.name) ? 'form' : 'forward';
}
export function nativeTransition(
  name: string,
  reduced: boolean,
  platform: string,
) {
  if (reduced || platform === 'web') return 'none' as const;
  if (tabs.has(name)) return 'fade' as const;
  if (forms.has(name)) return 'slide_from_bottom' as const;
  return platform === 'ios'
    ? ('simple_push' as const)
    : ('slide_from_right' as const);
}
