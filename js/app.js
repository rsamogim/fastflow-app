/**
 * FastFlow v2.0 — Bootstrap Principal, Roteamento e Interações Globais
 * Inclui gerenciamento de eventos do Módulo GLP-1 Companion & Hidratação.
 */

import {
  initState,
  getState,
  updateSettings,
  dismissSuggestion,
  subscribe,
  incrementTodayWater,
  decrementTodayWater,
  deleteGLP1Injection
} from './state.js';
import { initTheme, setTheme } from './theme.js';
import { initTimer, startFast, onTimerTick, getTimerStatus } from './timer.js';
import { deleteFastFromHistory, getFilteredHistory } from './history.js';
import { exportAllData, importAllData, clearAllFastFlowData } from './storage.js';
import { downloadJSON, readJSONFile } from './utils.js';
import {
  requestNotificationPermission,
  testNotification,
  scheduleDailyReminder,
  scheduleGLP1Reminder
} from './notifications.js';
import {
  renderTodayScreen,
  renderHistoryScreen,
  renderStatsScreen,
  renderSettingsScreen,
  showEndFastModal,
  showCancelFastModal,
  showFastDetailsModal,
  showLogInjectionModal,
  showLogWeightModal,
  showPaywallModal,
  showMedicalReportModal,
  showPenInventoryModal,
  showFastBreakGuideModal,
  renderProteinCard,
  renderPlanStatus,
  updateDoseSelectOptions,
  openBottomSheet,
  closeBottomSheet,
  showToast
} from './ui.js';
import { checkUrlLicenseActivation, activateLicense } from './license.js';
import { addProteinGrams } from './nutrition.js';
import { renderAllCharts } from './charts.js';

let deferredInstallPrompt = null;
let currentTabId = 'screen-today';
let currentChartPeriod = 7;
let currentHistoryType = 'fasts';

/**
 * Alterna entre as 4 abas principais da aplicação.
 */
export function navigateToTab(targetScreenId) {
  currentTabId = targetScreenId;

  document.querySelectorAll('.screen-view').forEach((screen) => {
    screen.classList.toggle('active', screen.id === targetScreenId);
  });

  document.querySelectorAll('.bottom-nav .nav-item').forEach((item) => {
    item.classList.toggle('active', item.getAttribute('data-tab') === targetScreenId);
  });

  switch (targetScreenId) {
    case 'screen-today':
      renderTodayScreen();
      break;
    case 'screen-history':
      renderHistoryScreen(undefined, currentHistoryType);
      break;
    case 'screen-stats':
      renderStatsScreen();
      break;
    case 'screen-settings':
      renderSettingsScreen();
      break;
  }
}

/**
 * Inicialização dos Event Listeners do DOM.
 */
function bindEventListeners() {
  // 1. Navegação de Abas
  document.querySelectorAll('.bottom-nav .nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId) navigateToTab(tabId);
    });
  });

  // 2. Tela Hoje — Botão Iniciar Jejum
  document.getElementById('btn-start-fast')?.addEventListener('click', () => {
    startFast();
    showToast('Jejum iniciado! Bom ciclo 🍃', 'success');
    renderTodayScreen();
  });

  document.getElementById('btn-end-fast')?.addEventListener('click', () => {
    showEndFastModal();
  });

  document.getElementById('btn-cancel-fast')?.addEventListener('click', () => {
    showCancelFastModal();
  });

  // NOVO v2.0: Widget de Hidratação
  document.getElementById('btn-water-add')?.addEventListener('click', () => {
    incrementTodayWater();
    renderTodayScreen();
    showToast('+ 1 copo de água (250ml) 💧', 'info', 1800);
  });

  document.getElementById('btn-water-sub')?.addEventListener('click', () => {
    decrementTodayWater();
    renderTodayScreen();
  });

  // NOVO v2.0: Botão Registrar Aplicação GLP-1
  document.getElementById('btn-log-injection-modal')?.addEventListener('click', () => {
    showLogInjectionModal();
  });

  // NOVO v3.0: Widget de Ingestão Proteica
  document.getElementById('btn-add-protein-15')?.addEventListener('click', () => {
    addProteinGrams(15);
    renderProteinCard(getState());
    showToast('+15g de proteína adicionados! 🍗', 'success', 1800);
  });

  document.getElementById('btn-add-protein-30')?.addEventListener('click', () => {
    addProteinGrams(30);
    renderProteinCard(getState());
    showToast('+30g de proteína adicionados! 🍗', 'success', 1800);
  });

  document.getElementById('btn-guide-fast-break')?.addEventListener('click', () => {
    showFastBreakGuideModal();
  });

  // NOVO v3.0: Gerenciador de Estoque de Caneta
  document.getElementById('btn-manage-pen-modal')?.addEventListener('click', () => {
    showPenInventoryModal();
  });

  // NOVO v3.0: Botão Relatório Clínico (Histórico / Progresso)
  document.getElementById('btn-export-medical-report')?.addEventListener('click', () => {
    showMedicalReportModal();
  });

  // NOVO v3.0: Ajustes — Paywall & Licença
  document.getElementById('btn-open-paywall-settings')?.addEventListener('click', () => {
    showPaywallModal('o Acesso Completo');
  });

  document.getElementById('btn-activate-license')?.addEventListener('click', () => {
    const key = document.getElementById('input-license-key')?.value || '';
    const res = activateLicense(key, 'lifetime');
    if (res.success) {
      showToast('👑 Chave VIP ativada com sucesso!', 'success');
      renderTodayScreen();
      renderStatsScreen();
      renderSettingsScreen();
    } else {
      showToast(res.message, 'warning');
    }
  });

  // 3. Modal Bottom Sheet (Fechamento)
  document.getElementById('bottom-sheet-close')?.addEventListener('click', closeBottomSheet);
  document.getElementById('bottom-sheet-backdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      closeBottomSheet();
    }
  });

  // 4. Tela Histórico — Alternância entre Jejuns e Aplicações GLP-1
  document.querySelectorAll('#history-view-type-row .filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const type = chip.getAttribute('data-view-type') || 'fasts';
      currentHistoryType = type;
      renderHistoryScreen(undefined, currentHistoryType);
    });
  });

  // Tela Histórico — Filtros de Período de Jejum
  document.querySelectorAll('#history-period-filter-row .filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const filter = chip.getAttribute('data-filter') || 'all';
      renderHistoryScreen(filter, 'fasts');
    });
  });

  // Tela Histórico — Clique nos Cards e Ações de Excluir
  const historyContainer = document.getElementById('history-list-container');
  historyContainer?.addEventListener('click', (e) => {
    // Exclusão de injeção GLP-1
    const deleteInjBtn = e.target.closest('[data-action="delete-injection"]');
    const injCard = e.target.closest('.injection-history-item');
    if (deleteInjBtn && injCard) {
      e.stopPropagation();
      const injId = injCard.getAttribute('data-inj-id');
      if (injId) {
        deleteGLP1Injection(injId);
        showToast('Aplicação removida.', 'info');
        renderHistoryScreen(undefined, 'glp1');
        renderTodayScreen();
      }
      return;
    }

    // Exclusão de jejum normal
    const deleteBtn = e.target.closest('[data-action="delete"]');
    const fastCard = e.target.closest('.history-item-card');
    if (deleteBtn && fastCard) {
      e.stopPropagation();
      const fastId = fastCard.getAttribute('data-fast-id');
      if (fastId) {
        deleteFastFromHistory(fastId);
        showToast('Jejum removido do histórico.', 'info');
        renderHistoryScreen(undefined, 'fasts');
        renderStatsScreen();
        renderTodayScreen();
      }
      return;
    }

    // Abertura de detalhes de jejum
    if (fastCard) {
      const fastId = fastCard.getAttribute('data-fast-id');
      if (fastId) showFastDetailsModal(fastId);
    }
  });

  // 5. Tela Progresso — Botão Registrar Peso
  document.getElementById('btn-log-weight-modal')?.addEventListener('click', () => {
    showLogWeightModal();
  });

  // Tela Progresso — Alternador de Período do Gráfico de Barras
  document.querySelectorAll('.chart-period-selector .period-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chart-period-selector .period-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentChartPeriod = Number(chip.getAttribute('data-chart-period')) || 7;
      const history = getFilteredHistory('all');
      renderAllCharts(history, currentChartPeriod, getState());
    });
  });

  // Tela Progresso — Ações do Card de Sugestão
  document.getElementById('btn-accept-suggestion')?.addEventListener('click', () => {
    const suggestionCard = document.getElementById('progression-suggestion-card');
    const nextId = suggestionCard?.dataset.nextProtocolId;
    if (nextId) {
      updateSettings({ currentProtocol: nextId });
      showToast(`Parabéns! Protocolo atualizado para ${nextId} 🚀`, 'success');
      renderStatsScreen();
      renderTodayScreen();
      renderSettingsScreen();
    }
  });

  document.getElementById('btn-dismiss-suggestion')?.addEventListener('click', () => {
    const suggestionCard = document.getElementById('progression-suggestion-card');
    const nextId = suggestionCard?.dataset.nextProtocolId;
    if (nextId) {
      dismissSuggestion(nextId);
      suggestionCard.classList.add('hidden');
      showToast('Sugestão dispensada.', 'info');
    }
  });

  // 6. Tela Ajustes — Módulo GLP-1 Companion
  document.getElementById('toggle-glp1-enable')?.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    updateSettings({
      glp1: {
        ...getState().settings.glp1,
        enabled: isEnabled
      }
    });
    renderSettingsScreen();
    renderTodayScreen();
    renderStatsScreen();
    scheduleGLP1Reminder();
    showToast(isEnabled ? 'Módulo GLP-1 Companion ativado! 💉' : 'Módulo GLP-1 desativado.', 'info');
  });

  document.getElementById('setting-glp1-med')?.addEventListener('change', (e) => {
    const medId = e.target.value;
    updateDoseSelectOptions(medId);
    const firstDose = document.getElementById('setting-glp1-dose')?.value;
    updateSettings({
      glp1: {
        ...getState().settings.glp1,
        medication: medId,
        currentDose: firstDose
      }
    });
    renderTodayScreen();
  });

  document.getElementById('setting-glp1-dose')?.addEventListener('change', (e) => {
    updateSettings({
      glp1: {
        ...getState().settings.glp1,
        currentDose: e.target.value
      }
    });
    renderTodayScreen();
  });

  document.getElementById('setting-glp1-day')?.addEventListener('change', (e) => {
    updateSettings({
      glp1: {
        ...getState().settings.glp1,
        injectionDay: e.target.value
      }
    });
    renderTodayScreen();
    scheduleGLP1Reminder();
  });

  document.getElementById('setting-glp1-water-target')?.addEventListener('change', (e) => {
    const val = Math.max(1000, Number(e.target.value) || 2500);
    updateSettings({
      glp1: {
        ...getState().settings.glp1,
        waterTargetMl: val
      }
    });
    renderTodayScreen();
  });

  document.getElementById('setting-glp1-weight')?.addEventListener('change', (e) => {
    const val = Math.max(30, Number(e.target.value) || 75);
    updateSettings({
      glp1: {
        ...getState().settings.glp1,
        currentWeight: val
      }
    });
    renderStatsScreen();
  });

  document.getElementById('toggle-glp1-notify-inj')?.addEventListener('change', (e) => {
    updateSettings({
      glp1: {
        ...getState().settings.glp1,
        notifyInjection: e.target.checked
      }
    });
    scheduleGLP1Reminder();
  });

  document.getElementById('toggle-glp1-notify-protein')?.addEventListener('change', (e) => {
    updateSettings({
      glp1: {
        ...getState().settings.glp1,
        notifyProtein: e.target.checked
      }
    });
  });

  // Tela Ajustes — Protocolo de Jejum
  document.querySelectorAll('#settings-protocol-chips .chip-select').forEach((chip) => {
    chip.addEventListener('click', () => {
      const protocol = chip.getAttribute('data-protocol');
      if (protocol) {
        updateSettings({ currentProtocol: protocol });
        renderSettingsScreen();
        renderTodayScreen();
        showToast(`Protocolo ${protocol} selecionado!`, 'success');
      }
    });
  });

  document.getElementById('custom-fast-hours')?.addEventListener('change', (e) => {
    const val = Math.max(1, Number(e.target.value) || 16);
    updateSettings({ customFastHours: val });
    renderTodayScreen();
  });

  document.getElementById('custom-eating-hours')?.addEventListener('change', (e) => {
    const val = Math.max(1, Number(e.target.value) || 8);
    updateSettings({ customEatingHours: val });
  });

  document.getElementById('setting-target-start-time')?.addEventListener('change', (e) => {
    updateSettings({ targetStartTime: e.target.value });
  });

  document.getElementById('toggle-auto-progress')?.addEventListener('change', (e) => {
    updateSettings({ autoProgress: e.target.checked });
    renderSettingsScreen();
  });

  document.getElementById('setting-progress-threshold')?.addEventListener('change', (e) => {
    const val = Math.max(3, Number(e.target.value) || 5);
    updateSettings({ autoProgressThreshold: val });
  });

  // Tela Ajustes — Notificações Gerais
  document.getElementById('toggle-notifications')?.addEventListener('change', async (e) => {
    if (e.target.checked) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        e.target.checked = false;
        showToast('Permissão de notificações negada no navegador.', 'warning');
        return;
      }
      updateSettings({
        notifications: {
          ...getState().settings.notifications,
          enabled: true
        }
      });
      scheduleDailyReminder();
      scheduleGLP1Reminder();
      showToast('Notificações ativadas! 🔔', 'success');
    } else {
      updateSettings({
        notifications: {
          ...getState().settings.notifications,
          enabled: false
        }
      });
      showToast('Notificações desativadas.', 'info');
    }
    renderSettingsScreen();
  });

  document.getElementById('toggle-notify-before')?.addEventListener('change', (e) => {
    updateSettings({
      notifications: { ...getState().settings.notifications, before30m: e.target.checked }
    });
  });

  document.getElementById('toggle-notify-target')?.addEventListener('change', (e) => {
    updateSettings({
      notifications: { ...getState().settings.notifications, onTarget: e.target.checked }
    });
  });

  document.getElementById('toggle-notify-daily')?.addEventListener('change', (e) => {
    updateSettings({
      notifications: { ...getState().settings.notifications, dailyReminder: e.target.checked }
    });
    scheduleDailyReminder();
  });

  document.getElementById('setting-daily-reminder-time')?.addEventListener('change', (e) => {
    updateSettings({
      notifications: { ...getState().settings.notifications, dailyReminderTime: e.target.value }
    });
    scheduleDailyReminder();
  });

  document.getElementById('btn-test-notification')?.addEventListener('click', () => {
    testNotification();
    showToast('Notificação de teste enviada!', 'info');
  });

  // Tela Ajustes — Tema
  document.querySelectorAll('#theme-selector-group .theme-option-card').forEach((card) => {
    card.addEventListener('click', () => {
      const mode = card.getAttribute('data-theme-value');
      if (mode) {
        setTheme(mode);
        if (currentTabId === 'screen-stats') {
          renderStatsScreen();
        }
      }
    });
  });

  // Tela Ajustes — Backup JSON
  document.getElementById('btn-export-data')?.addEventListener('click', () => {
    const data = exportAllData();
    const dateStr = new Date().toISOString().split('T')[0];
    downloadJSON(data, `fastflow-v2-backup-${dateStr}.json`);
    showToast('Backup v2.0 exportado com sucesso! 💾', 'success');
  });

  const fileImportInput = document.getElementById('file-import-input');
  document.getElementById('btn-import-data-trigger')?.addEventListener('click', () => {
    fileImportInput?.click();
  });

  fileImportInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await readJSONFile(file);
      importAllData(parsedData);
      initState();
      showToast('Dados restaurados com sucesso! 🚀', 'success');
      renderTodayScreen();
      renderHistoryScreen();
      renderStatsScreen();
      renderSettingsScreen();
    } catch (err) {
      showToast(err.message || 'Erro ao importar backup.', 'danger');
    } finally {
      fileImportInput.value = '';
    }
  });

  // Tela Ajustes — Limpar Dados
  document.getElementById('btn-clear-data')?.addEventListener('click', () => {
    const content = `
      <p style="font-size: 0.875rem; color: var(--danger); margin-bottom: 16px;">
        <strong>Atenção:</strong> Esta ação apagará permanentemente todo o seu histórico de jejuns, dados de GLP-1 e configurações.
      </p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button type="button" class="btn btn-accent btn-large" id="modal-confirm-clear">
          Sim, apagar tudo
        </button>
        <button type="button" class="btn btn-subtle" id="modal-cancel-clear">
          Cancelar
        </button>
      </div>
    `;

    openBottomSheet('Apagar todos os dados?', content);

    document.getElementById('modal-confirm-clear')?.addEventListener('click', () => {
      clearAllFastFlowData();
      initState();
      closeBottomSheet();
      showToast('Todos os dados foram resetados.', 'info');
      renderTodayScreen();
      renderHistoryScreen();
      renderStatsScreen();
      renderSettingsScreen();
    });

    document.getElementById('modal-cancel-clear')?.addEventListener('click', closeBottomSheet);
  });

  // PWA Install
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const pwaBox = document.getElementById('install-pwa-box');
    if (pwaBox) pwaBox.classList.remove('hidden');
  });

  document.getElementById('btn-install-pwa')?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('FastFlow adicionado à sua tela inicial! 🎉', 'success');
    }
    deferredInstallPrompt = null;
    document.getElementById('install-pwa-box')?.classList.add('hidden');
  });

  window.addEventListener('resize', () => {
    if (currentTabId === 'screen-stats') {
      const history = getFilteredHistory('all');
      renderAllCharts(history, currentChartPeriod, getState());
    }
  });
}

/**
 * Registro do Service Worker para PWA Offline.
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./service-worker.js')
        .then((reg) => {
          console.log('[FastFlow v3.0 PWA] ServiceWorker ativo:', reg.scope);
        })
        .catch((err) => {
          console.warn('[FastFlow v3.0 PWA] Falha ao registrar ServiceWorker:', err);
        });
    });
  }
}

/**
 * Bootstrap da aplicação.
 */
function bootstrap() {
  initState();
  checkUrlLicenseActivation();
  initTheme();
  bindEventListeners();
  initTimer();

  onTimerTick((tickData) => {
    if (currentTabId === 'screen-today') {
      renderTodayScreen(tickData);
    }
  });

  subscribe((state, changedKey) => {
    if (['history', 'init', 'water', 'glp1Injections', 'weight', 'license', 'protein', 'inventory', 'setState'].includes(changedKey)) {
      if (currentTabId === 'screen-today') renderTodayScreen();
      if (currentTabId === 'screen-history') renderHistoryScreen(undefined, currentHistoryType);
      if (currentTabId === 'screen-stats') renderStatsScreen();
      if (currentTabId === 'screen-settings') renderSettingsScreen();
    }
  });

  renderTodayScreen();
  scheduleDailyReminder();
  scheduleGLP1Reminder();
  registerServiceWorker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
