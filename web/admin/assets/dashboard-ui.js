const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const running = new Set();
const dialogs = new WeakMap();
const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';
function motion(element, frames, options) {
  if (reduced.matches || !element.animate) return null;
  const animation = element.animate(frames, { easing, ...options });
  running.add(animation);
  animation.finished.catch(() => {}).finally(() => running.delete(animation));
  return animation;
}
reduced.addEventListener('change', () => {
  if (reduced.matches) for (const animation of running) animation.cancel();
});
export function revealPage(root) {
  for (const animation of running) animation.cancel();
  const blocks = root.querySelectorAll(
    '.primary-stats .stat-card, .secondary-stats, .overview-charts > div > section, .overview-operations > section, .toolbar, .list-panel, .report-content > section',
  );
  blocks.forEach((element, index) =>
    motion(
      element,
      [
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 450, delay: Math.min(index * 50, 300) },
    ),
  );
  root.querySelectorAll('.chart-bar').forEach((element, index) =>
    motion(
      element,
      [
        { opacity: 0, transform: 'scaleY(0.05)' },
        { opacity: 1, transform: 'scaleY(1)' },
      ],
      { duration: 450, delay: Math.min(index * 30, 300) },
    ),
  );
  root.querySelectorAll('.donut-svg').forEach((element) =>
    motion(
      element,
      [
        { opacity: 0, transform: 'scale(0.96)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { duration: 450, delay: 200 },
    ),
  );
}
export function openDialog(dialog) {
  const previous = dialogs.get(dialog);
  previous?.animation?.cancel();
  const trigger = dialog.open ? previous?.trigger : document.activeElement;
  if (!dialog.open) dialog.showModal();
  dialogs.set(dialog, {
    trigger,
    animation: motion(
      dialog,
      [
        { opacity: 0, transform: 'translateY(12px) scale(0.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      { duration: 300 },
    ),
  });
}
export async function closeDialog(dialog, immediate = false) {
  if (!dialog.open) return;
  const previous = dialogs.get(dialog);
  previous?.animation?.cancel();
  const animation = immediate
    ? null
    : motion(
        dialog,
        [
          { opacity: 1, transform: 'translateY(0) scale(1)' },
          { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
        ],
        { duration: 200 },
      );
  const state = { trigger: previous?.trigger, animation };
  dialogs.set(dialog, state);
  if (animation) await animation.finished.catch(() => {});
  if (dialogs.get(dialog) !== state) return;
  dialog.close();
  if (state.trigger?.isConnected) state.trigger.focus({ preventScroll: true });
}
const paths = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
  contracts: 'M8 3H5v18h14V3h-3 M9 2h6v4H9z M8 11h8 M8 15h8',
  wallet: 'M3 5h16v4H3z M3 9v11h18V9z M16 13h5v4h-5z',
  chart: 'M4 3v18h17 M8 16v-4 M13 16V8 M18 16V5',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
  logout: 'M9 3H3v18h6 M9 12h12 M17 8l4 4-4 4',
};
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('nav-icon');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', paths[name] ?? paths.people);
  svg.append(path);
  return svg;
}
export function initializeDashboard() {
  const names = [
    'overview',
    'heart',
    'people',
    'people',
    'people',
    'contracts',
    'wallet',
    'chart',
    'chart',
    'chart',
    'settings',
  ];
  document.querySelectorAll('.sidebar nav a').forEach((link, index) => {
    const text = [...link.childNodes].find(
      (child) => child.nodeType === Node.TEXT_NODE,
    );
    if (text)
      text.textContent = text.textContent.replace(/^[\s◫♡◉◇♧▤↗▥⚙]+/, '');
    link.prepend(icon(names[index]));
  });
  const logout = document.getElementById('logout');
  logout.querySelector('span')?.remove();
  logout.prepend(icon('logout'));
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  function closeMenu() {
    sidebar.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', () => {
    const opened = sidebar.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(opened));
  });
  sidebar.addEventListener('click', (event) => {
    if (event.target.closest('a, #logout')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar.classList.contains('menu-open')) {
      closeMenu();
      toggle.focus();
    }
  });
  for (const dialog of document.querySelectorAll('dialog'))
    dialog.addEventListener('cancel', (event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      void closeDialog(dialog);
    });
  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.id = 'chart-tooltip';
  tooltip.role = 'tooltip';
  tooltip.hidden = true;
  document.body.append(tooltip);
  let target;
  const hide = () => {
    target?.removeAttribute('aria-describedby');
    tooltip.hidden = true;
    target = null;
  };
  function show(element) {
    if (!element) return;
    hide();
    target = element;
    tooltip.textContent = element.dataset.chartLabel;
    tooltip.hidden = false;
    element.setAttribute('aria-describedby', tooltip.id);
    const r = element.getBoundingClientRect();
    tooltip.style.left = `${Math.max(8, Math.min(innerWidth - tooltip.offsetWidth - 8, r.left + r.width / 2 - tooltip.offsetWidth / 2))}px`;
    tooltip.style.top = `${r.top > tooltip.offsetHeight + 12 ? r.top - tooltip.offsetHeight - 8 : r.bottom + 8}px`;
  }
  document.addEventListener('pointerover', (event) => {
    const element = event.target.closest('[data-chart-label]');
    if (element) show(element);
    else if (document.activeElement !== target) hide();
  });
  document.addEventListener(
    'focus',
    (event) => {
      show(event.target.closest('[data-chart-label]'));
    },
    true,
  );
  document.addEventListener('blur', hide, true);
  document.addEventListener('keyup', (event) => {
    if (event.key === 'Tab') {
      const focused = document.activeElement?.closest('[data-chart-label]');
      if (focused) show(focused);
      else hide();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });
  window.addEventListener(
    'scroll',
    () => {
      if (target && document.activeElement === target) show(target);
      else hide();
    },
    true,
  );
  window.addEventListener('resize', () => {
    const focused = document.activeElement?.closest('[data-chart-label]');
    if (focused) show(focused);
    else hide();
  });
  window.addEventListener('hashchange', hide);
}
