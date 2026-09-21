/**
 * FastFlow — Gerenciamento de Temas (Dark / Light / Sistema)
 * Sincroniza meta tags theme-color e preferências do sistema operacional.
 */

import { getStorage, setStorage, STORAGE_KEYS } from './storage.js';

let systemMediaWatcher = null;

/**
 * Obtém o modo de tema configurado ('dark', 'light' ou 'system').
 */
export function getSavedThemeMode() {
  const settings = getStorage(STORAGE_KEYS.SETTINGS, {});
  return settings.theme || 'dark';
}

/**
 * Retorna o tema final em vigor ('dark' ou 'light').
 */
export function getEffectiveTheme(themeMode = getSavedThemeMode()) {
  if (themeMode === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return themeMode === 'light' ? 'light' : 'dark';
}

/**
 * Aplica o tema na tag <html> e atualiza a meta tag theme-color.
 * @param {'dark'|'light'|'system'} mode
 */
export function applyTheme(mode) {
  const effectiveTheme = getEffectiveTheme(mode);
  document.documentElement.setAttribute('data-theme', effectiveTheme);

  // Sincroniza cor da barra de status móvel (notch/Safari/Chrome Android)
  const metaThemeColor = document.getElementById('meta-theme-color');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#0F1115' : '#F7F8FA');
  }

  // Atualiza botões e rádios visuais
  updateThemeUI(mode);
}

/**
 * Define e persiste um novo modo de tema.
 * @param {'dark'|'light'|'system'} mode
 */
export function setTheme(mode) {
  const settings = getStorage(STORAGE_KEYS.SETTINGS, {});
  settings.theme = mode;
  setStorage(STORAGE_KEYS.SETTINGS, settings);
  applyTheme(mode);
}

/**
 * Alternância rápida (Dark <-> Light) usada no botão do cabeçalho.
 */
export function toggleThemeQuickly() {
  const currentMode = getSavedThemeMode();
  const effective = getEffectiveTheme(currentMode);
  const nextTheme = effective === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
}

/**
 * Atualiza os seletores visuais de tema na tela de Ajustes.
 */
function updateThemeUI(activeMode) {
  const themeButtons = document.querySelectorAll('#theme-selector-group .theme-option-card');
  themeButtons.forEach((btn) => {
    const val = btn.getAttribute('data-theme-value');
    btn.classList.toggle('active', val === activeMode);
  });
}

/**
 * Inicializa os ouvintes e aplica o tema salvo no carregamento do app.
 */
export function initTheme() {
  const initialMode = getSavedThemeMode();
  applyTheme(initialMode);

  // Escuta alterações dinâmicas no SO caso o usuário use 'system'
  if (window.matchMedia) {
    systemMediaWatcher = window.matchMedia('(prefers-color-scheme: dark)');
    systemMediaWatcher.addEventListener('change', () => {
      if (getSavedThemeMode() === 'system') {
        applyTheme('system');
      }
    });
  }

  // Vincula evento no botão de alternância rápida do cabeçalho
  const quickToggleBtn = document.getElementById('quick-theme-toggle');
  if (quickToggleBtn) {
    quickToggleBtn.addEventListener('click', () => {
      toggleThemeQuickly();
    });
  }
}
