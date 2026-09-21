/**
 * FastFlow v2.0 — Módulo de Interface do Usuário (UI Orchestration)
 * Renderização dinâmica do DOM, anel SVG animado, bottom-sheet, toasts
 * e novo ecossistema GLP-1 Companion (injeções, hidratação e peso).
 */

import {
  getState,
  getCurrentProtocol,
  updateSettings,
  dismissSuggestion,
  getTodayWaterCups,
  addGLP1Injection,
  deleteGLP1Injection,
  addWeightEntry,
  getLatestWeight
} from './state.js';
import { getTimerStatus, startFast, endFast, cancelFast } from './timer.js';
import {
  getFilteredHistory,
  deleteFastFromHistory,
  updateFastInHistory,
  getLastCompletedFast,
  isRecordFast
} from './history.js';
import { getAllStats } from './stats.js';
import { renderAllCharts } from './charts.js';
import {
  formatHMS,
  formatDuration,
  formatTime,
  formatDate,
  formatDateTime,
  getGreeting
} from './utils.js';
import {
  getMedicationInfo,
  getDaysUntilNextInjection,
  getNextSuggestedSite,
  calculateHydration,
  getProteinRecommendation,
  INJECTION_SITES,
  SYMPTOMS_LIST,
  GLP1_MEDICATIONS
} from './glp1.js';
import { isProActive, activateLicense } from './license.js';
import { compileClinicalReportData, generateMedicalReportHtml, printClinicalReport } from './reports.js';
import { getActivePenStatus, registerDoseConsumption, saveInventory } from './inventory.js';
import {
  FAST_BREAKING_PROTOCOL,
  RECOMMENDED_SUPPLEMENTS,
  addProteinGrams,
  getProteinProgress
} from './nutrition.js';

const RING_CIRCUMFERENCE = 841.95;
let activeHistoryFilter = 'all';
let activeHistoryViewType = 'fasts'; // 'fasts' | 'glp1'
let activeChartPeriod = 7;

/**
 * Exibe um toast flutuante no topo da tela.
 */
export function showToast(message, type = 'info', duration = 3200) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✅',
    warning: '⚠️',
    danger: '🛑',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span>${iconMap[type] || 'ℹ️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hiding');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, duration);
}

/**
 * Abre o modal deslizante (Bottom Sheet).
 */
export function openBottomSheet(title, htmlContent) {
  const backdrop = document.getElementById('bottom-sheet-backdrop');
  const titleEl = document.getElementById('bottom-sheet-title');
  const bodyEl = document.getElementById('bottom-sheet-body');

  if (!backdrop || !titleEl || !bodyEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = htmlContent;
  backdrop.classList.add('active');
}

/**
 * Fecha o modal deslizante (Bottom Sheet).
 */
export function closeBottomSheet() {
  const backdrop = document.getElementById('bottom-sheet-backdrop');
  if (backdrop) {
    backdrop.classList.remove('active');
  }
}

/**
 * Renderiza a Tela Hoje (cronômetro, anel SVG, card GLP-1 e hidratação).
 */
export function renderTodayScreen(timerData = getTimerStatus()) {
  const state = getState();
  const greetingEl = document.getElementById('today-greeting');
  const protocolChip = document.getElementById('today-protocol-chip');
  const targetChip = document.getElementById('today-target-chip');

  const idleDisplay = document.getElementById('timer-idle-display');
  const activeDisplay = document.getElementById('timer-active-display');
  const ringBar = document.getElementById('timer-progress-ring');
  const ringContainer = document.querySelector('.ring-container');

  const btnStart = document.getElementById('btn-start-fast');
  const activeButtons = document.getElementById('active-fast-buttons');

  const digitsEl = document.getElementById('timer-digits');
  const subtextEl = document.getElementById('timer-subtext');
  const percentEl = document.getElementById('timer-progress-percent');
  const miniBar = document.getElementById('mini-progress-bar');
  const miniStart = document.getElementById('mini-time-start');
  const miniTarget = document.getElementById('mini-time-target');

  const stageNameEl = document.getElementById('current-stage-name');
  const stageDescEl = document.getElementById('current-stage-desc');

  if (greetingEl) greetingEl.textContent = getGreeting();

  const protocol = getCurrentProtocol();
  if (protocolChip) protocolChip.textContent = `Protocolo ${protocol.shortLabel}`;
  if (targetChip) targetChip.textContent = `Meta: ${protocol.fastHours}h`;

  if (!timerData.isActive) {
    // ESTADO PARADO
    if (idleDisplay) idleDisplay.classList.remove('hidden');
    if (activeDisplay) activeDisplay.classList.add('hidden');
    if (btnStart) btnStart.classList.remove('hidden');
    if (activeButtons) activeButtons.classList.add('hidden');

    if (ringBar) ringBar.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
    if (ringContainer) ringContainer.classList.remove('target-reached');
    if (miniBar) miniBar.style.width = '0%';
    if (miniStart) miniStart.textContent = 'Início: --:--';
    if (miniTarget) miniTarget.textContent = `Meta: ${protocol.fastHours}h`;

    if (stageNameEl) stageNameEl.textContent = 'Fase Digestiva (Pronto)';
    if (stageDescEl) stageDescEl.textContent = 'Inicie o cronômetro para acompanhar os estágios metabólicos do seu corpo.';

    renderSecondaryCardIdle();
  } else {
    // ESTADO EM JEJUM
    if (idleDisplay) idleDisplay.classList.add('hidden');
    if (activeDisplay) activeDisplay.classList.remove('hidden');
    if (btnStart) btnStart.classList.add('hidden');
    if (activeButtons) activeButtons.classList.remove('hidden');

    const percent = timerData.progressPercent;
    const offset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * percent) / 100;
    
    if (ringBar) ringBar.style.strokeDashoffset = String(offset);

    if (ringContainer) {
      if (timerData.isTargetReached) {
        ringContainer.classList.add('target-reached');
      } else {
        ringContainer.classList.remove('target-reached');
      }
    }

    if (digitsEl) digitsEl.textContent = timerData.formattedHMS;
    if (subtextEl) subtextEl.textContent = timerData.formattedRemaining;
    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;

    if (miniBar) miniBar.style.width = `${percent}%`;
    if (miniStart) miniStart.textContent = `Início: ${formatTime(timerData.activeFast.startedAt)}`;
    if (miniTarget) miniTarget.textContent = `Término: ${formatTime(timerData.activeFast.targetEndTime)}`;

    if (stageNameEl && timerData.fastingStage) stageNameEl.textContent = timerData.fastingStage.name;
    if (stageDescEl && timerData.fastingStage) stageDescEl.textContent = timerData.fastingStage.desc;

    renderSecondaryCardActive(timerData.activeFast);
  }

  // Renderiza Widgets GLP-1 se habilitado
  renderGLP1TodayWidgets(state);
}

/**
 * Renderiza os widgets específicos de GLP-1 e Hidratação na tela inicial.
 */
function renderGLP1TodayWidgets(state) {
  const glp1Card = document.getElementById('glp1-companion-card');
  const waterCard = document.getElementById('water-tracker-card');
  const proteinCard = document.getElementById('protein-tracker-card');
  const penCard = document.getElementById('pen-inventory-card');
  const isEnabled = state.settings?.glp1?.enabled;

  if (!glp1Card || !waterCard) return;

  if (!isEnabled) {
    glp1Card.classList.add('hidden');
    waterCard.classList.add('hidden');
    if (proteinCard) proteinCard.classList.add('hidden');
    if (penCard) penCard.classList.add('hidden');
    return;
  }

  glp1Card.classList.remove('hidden');
  waterCard.classList.remove('hidden');
  if (proteinCard) proteinCard.classList.remove('hidden');
  if (penCard) penCard.classList.remove('hidden');

  renderProteinCard(state);
  renderPenInventoryCard(state);

  // Atualiza Card GLP-1
  const medInfo = getMedicationInfo(state.settings.glp1.medication);
  const medBadge = document.getElementById('glp1-med-badge');
  const nextTitle = document.getElementById('glp1-next-inj-title');
  const countdownPill = document.getElementById('glp1-countdown-pill');
  const siteSuggestion = document.getElementById('glp1-suggested-site');

  if (medBadge) {
    medBadge.textContent = `💉 ${medInfo.name.split(' ')[0]} (${state.settings.glp1.currentDose || 'Dose Padrão'})`;
  }

  const injDays = getDaysUntilNextInjection(state.settings.glp1.injectionDay, state.glp1Injections || []);
  const suggestedSite = getNextSuggestedSite(state.glp1Injections || []);

  if (injDays.isToday) {
    if (nextTitle) nextTitle.textContent = 'Dia de Aplicação!';
    if (countdownPill) {
      countdownPill.textContent = '💉 Aplicar Hoje';
      countdownPill.style.backgroundColor = 'rgba(0, 198, 255, 0.25)';
    }
  } else {
    if (nextTitle) nextTitle.textContent = `Próxima Aplicação: ${injDays.dayName}`;
    if (countdownPill) {
      countdownPill.textContent = injDays.daysRemaining === 1 ? 'Amanhã' : `Em ${injDays.daysRemaining} dias`;
      countdownPill.style.backgroundColor = '';
    }
  }

  if (siteSuggestion) {
    siteSuggestion.innerHTML = `🎯 Local sugerido: <strong>${suggestedSite.name}</strong>`;
  }

  // Atualiza Widget de Hidratação
  const cups = getTodayWaterCups();
  const hydration = calculateHydration(cups, state.settings.glp1.waterTargetMl || 2500);

  const waterStatsText = document.getElementById('water-stats-text');
  const waterProgressFill = document.getElementById('water-progress-fill');

  if (waterStatsText) {
    waterStatsText.textContent = `${hydration.currentMl} / ${hydration.targetMl} ml (${hydration.cups} copos)`;
  }
  if (waterProgressFill) {
    waterProgressFill.style.width = `${hydration.percentage}%`;
  }
}

function renderSecondaryCardIdle() {
  const icon = document.getElementById('secondary-card-icon');
  const title = document.getElementById('secondary-card-title');
  const desc = document.getElementById('secondary-card-desc');
  const footerTag = document.getElementById('secondary-time-elapsed');

  const lastFast = getLastCompletedFast();

  if (!lastFast) {
    if (icon) icon.textContent = '⏱️';
    if (title) title.textContent = 'Primeiro Jejum';
    if (desc) desc.textContent = 'Você ainda não registrou nenhum ciclo.';
    if (footerTag) footerTag.textContent = 'Toque em Iniciar Jejum';
    return;
  }

  const timeSinceEnded = Math.max(0, Date.now() - (lastFast.endedAt || Date.now()));
  if (icon) icon.textContent = '🍽️';
  if (title) title.textContent = 'Janela de Alimentação';
  if (desc) desc.textContent = `Último ciclo: ${formatDuration(lastFast.durationMs)} (${lastFast.protocolName || lastFast.protocolId})`;
  if (footerTag) footerTag.textContent = `Alimentando-se há ${formatDuration(timeSinceEnded)}`;
}

function renderSecondaryCardActive(activeFast) {
  const icon = document.getElementById('secondary-card-icon');
  const title = document.getElementById('secondary-card-title');
  const desc = document.getElementById('secondary-card-desc');
  const footerTag = document.getElementById('secondary-time-elapsed');

  if (icon) icon.textContent = '🔥';
  if (title) title.textContent = `Jejum ${activeFast.protocolName || activeFast.protocolId}`;
  if (desc) desc.textContent = `Iniciado ${formatDateTime(activeFast.startedAt)}`;
  if (footerTag) footerTag.textContent = `Meta: ${activeFast.fastHours}h de jejum`;
}

/**
 * Renderiza a Tela de Histórico (com suporte a alternância entre Jejuns e Aplicações GLP-1).
 */
export function renderHistoryScreen(filterType = activeHistoryFilter, viewType = activeHistoryViewType) {
  activeHistoryFilter = filterType;
  activeHistoryViewType = viewType;

  const state = getState();
  const container = document.getElementById('history-list-container');
  const emptyState = document.getElementById('history-empty-state');
  const glp1Chip = document.getElementById('chip-view-glp1');
  const periodFilterRow = document.getElementById('history-period-filter-row');

  // Exibe botão de aplicações GLP-1 apenas se módulo estiver ativo
  if (glp1Chip) {
    glp1Chip.classList.toggle('hidden', !state.settings?.glp1?.enabled);
  }

  // Atualiza botões do tipo de visão (Jejuns / GLP-1)
  document.querySelectorAll('#history-view-type-row .filter-chip').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-view-type') === viewType);
  });

  if (viewType === 'glp1') {
    // Visão de Aplicações GLP-1
    if (periodFilterRow) periodFilterRow.classList.add('hidden');
    renderGLP1InjectionsHistory(state.glp1Injections || []);
    return;
  }

  // Visão tradicional de Jejuns
  if (periodFilterRow) periodFilterRow.classList.remove('hidden');

  document.querySelectorAll('#history-period-filter-row .filter-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.getAttribute('data-filter') === filterType);
  });

  const history = getFilteredHistory(filterType);

  if (!container || !emptyState) return;

  if (history.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    document.getElementById('empty-title-text').textContent = 'Nenhum jejum no período';
    document.getElementById('empty-desc-text').textContent = 'Inicie seu primeiro jejum na tela inicial para começar seu histórico.';
    return;
  }

  emptyState.classList.add('hidden');

  container.innerHTML = history
    .map((item) => {
      const isRecord = isRecordFast(item);
      const isSuccess = item.isCompleted;

      let badgeHtml = '';
      if (isRecord) {
        badgeHtml = '<span class="status-badge badge-record">🔥 Recorde</span>';
      } else if (isSuccess) {
        badgeHtml = '<span class="status-badge badge-success">✅ Concluído</span>';
      } else {
        badgeHtml = '<span class="status-badge badge-warning">⚠️ Parcial</span>';
      }

      const dateStr = formatDate(item.endedAt || item.startedAt);
      const durationStr = formatDuration(item.durationMs);
      const rangeStr = `${formatTime(item.startedAt)} → ${formatTime(item.endedAt)}`;

      return `
        <div class="history-item-card" data-fast-id="${item.id}">
          <div class="history-item-left">
            <span class="history-date">${dateStr} • ${item.protocolId || '16:8'}</span>
            <span class="history-duration">${durationStr}</span>
            <span class="history-time-range">${rangeStr}</span>
          </div>
          <div class="history-item-right">
            <div class="history-badges">
              ${badgeHtml}
            </div>
            <button type="button" class="history-delete-btn" data-action="delete" title="Excluir jejum" aria-label="Excluir jejum">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

/**
 * Renderiza o histórico de injeções GLP-1.
 */
function renderGLP1InjectionsHistory(injections = []) {
  const container = document.getElementById('history-list-container');
  const emptyState = document.getElementById('history-empty-state');
  if (!container || !emptyState) return;

  if (injections.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    document.getElementById('empty-title-text').textContent = 'Nenhuma aplicação registrada';
    document.getElementById('empty-desc-text').textContent = 'Registre sua primeira dose de caneta para acompanhar locais de injeção e sintomas.';
    return;
  }

  emptyState.classList.add('hidden');

  container.innerHTML = injections
    .map((inj) => {
      const dateStr = formatDateTime(inj.date);
      const symptomsHtml = inj.symptoms && inj.symptoms.length > 0
        ? inj.symptoms.map((s) => `<span class="tag-pill" style="font-size:0.65rem;">${s}</span>`).join(' ')
        : '<span class="tag-pill" style="font-size:0.65rem;">Sem sintomas</span>';

      return `
        <div class="injection-history-item" data-inj-id="${inj.id}">
          <div>
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span class="badge-glp1">💉 ${inj.dose}</span>
              <strong style="font-size:0.875rem;">${inj.medicationName || 'GLP-1'}</strong>
            </div>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">
              🎯 Local: <strong>${inj.siteName || 'Abdômen'}</strong> • ${dateStr}
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:6px;">
              ${symptomsHtml}
            </div>
          </div>
          <div>
            <button type="button" class="history-delete-btn" data-action="delete-injection" title="Excluir injeção" aria-label="Excluir injeção">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

/**
 * Renderiza a Tela de Progresso (Estatísticas, Gráficos e Seção GLP-1).
 */
export function renderStatsScreen() {
  const state = getState();
  const stats = getAllStats();

  const headerStreakCount = document.getElementById('header-streak-count');
  if (headerStreakCount) headerStreakCount.textContent = String(stats.streak);

  const streakVal = document.getElementById('stat-streak-val');
  const longestVal = document.getElementById('stat-longest-val');
  const avgVal = document.getElementById('stat-avg-val');
  const rateVal = document.getElementById('stat-rate-val');
  const monthTotal = document.getElementById('stat-month-total');
  const totalFasts = document.getElementById('stat-total-fasts');

  if (streakVal) streakVal.textContent = `${stats.streak} ${stats.streak === 1 ? 'dia' : 'dias'}`;
  if (longestVal) longestVal.textContent = stats.longestFast ? formatDuration(stats.longestFast.durationMs) : '0h 00m';
  if (avgVal) avgVal.textContent = stats.avgDuration30d > 0 ? formatDuration(stats.avgDuration30d) : '0h 00m';
  if (rateVal) rateVal.textContent = `${stats.completionRate}%`;
  
  if (monthTotal) monthTotal.textContent = `${stats.monthTotals.totalHours}h jejuadas`;
  if (totalFasts) totalFasts.textContent = `${stats.monthTotals.count} jejuns este mês`;

  // Seção GLP-1 & Peso
  const weightBanner = document.getElementById('weight-tracker-banner');
  const weightChartCard = document.getElementById('glp1-weight-chart-card');
  const waterChartCard = document.getElementById('glp1-water-chart-card');
  const isGLP1 = state.settings?.glp1?.enabled;

  if (weightBanner) weightBanner.classList.toggle('hidden', !isGLP1);
  if (weightChartCard) weightChartCard.classList.toggle('hidden', !isGLP1);
  if (waterChartCard) waterChartCard.classList.toggle('hidden', !isGLP1);

  if (isGLP1) {
    const latestWeight = getLatestWeight();
    const proteinRec = getProteinRecommendation(latestWeight);
    const weightEl = document.getElementById('stat-current-weight');
    const proteinEl = document.getElementById('stat-protein-target');

    if (weightEl) weightEl.textContent = `${Number(latestWeight).toFixed(1)} kg`;
    if (proteinEl) proteinEl.textContent = `Meta proteica diária: ${proteinRec.minGrams}g - ${proteinRec.maxGrams}g`;
  }

  // Card de Sugestão de Progressão
  const suggestionCard = document.getElementById('progression-suggestion-card');
  const suggestionDesc = document.getElementById('suggestion-desc');

  if (suggestionCard && suggestionDesc) {
    if (stats.progression.eligible) {
      suggestionCard.classList.remove('hidden');
      suggestionDesc.innerHTML = `
        Você atingiu a meta <strong>${stats.progression.consecutiveSuccesses} vezes seguidas</strong>!
        Que tal evoluir de <strong>${stats.progression.currentProtocol.shortLabel}</strong> para <strong>${stats.progression.nextProtocol.shortLabel}</strong>?
      `;
      suggestionCard.dataset.nextProtocolId = stats.progression.nextProtocol.id;
    } else {
      suggestionCard.classList.add('hidden');
    }
  }

  const history = getFilteredHistory('all');
  renderAllCharts(history, activeChartPeriod, state);
  renderSupplementsShowcase();
}

/**
 * Renderiza os controles da Tela de Ajustes (incluindo painel GLP-1).
 */
export function renderSettingsScreen() {
  const { settings } = getState();

  // Módulo GLP-1
  const toggleGLP1 = document.getElementById('toggle-glp1-enable');
  const glp1Panel = document.getElementById('glp1-settings-panel');
  const medSelect = document.getElementById('setting-glp1-med');
  const doseSelect = document.getElementById('setting-glp1-dose');
  const daySelect = document.getElementById('setting-glp1-day');
  const waterTarget = document.getElementById('setting-glp1-water-target');
  const weightInput = document.getElementById('setting-glp1-weight');
  const notifyInj = document.getElementById('toggle-glp1-notify-inj');
  const notifyProtein = document.getElementById('toggle-glp1-notify-protein');

  const glp1Config = settings.glp1 || {};

  if (toggleGLP1) toggleGLP1.checked = !!glp1Config.enabled;
  if (glp1Panel) glp1Panel.classList.toggle('hidden', !glp1Config.enabled);

  if (medSelect) {
    medSelect.value = glp1Config.medication || 'ozempic';
    updateDoseSelectOptions(glp1Config.medication || 'ozempic', glp1Config.currentDose);
  }

  if (daySelect) daySelect.value = glp1Config.injectionDay || 'quinta';
  if (waterTarget) waterTarget.value = glp1Config.waterTargetMl || 2500;
  if (weightInput) weightInput.value = glp1Config.currentWeight || 75;
  if (notifyInj) notifyInj.checked = glp1Config.notifyInjection !== false;
  if (notifyProtein) notifyProtein.checked = glp1Config.notifyProtein !== false;

  // Chips de Protocolo
  document.querySelectorAll('#settings-protocol-chips .chip-select').forEach((chip) => {
    const p = chip.getAttribute('data-protocol');
    chip.classList.toggle('active', p === settings.currentProtocol);
  });

  const customBox = document.getElementById('custom-protocol-box');
  if (customBox) {
    customBox.classList.toggle('hidden', settings.currentProtocol !== 'custom');
  }

  const customFast = document.getElementById('custom-fast-hours');
  const customEating = document.getElementById('custom-eating-hours');
  if (customFast) customFast.value = settings.customFastHours || 16;
  if (customEating) customEating.value = settings.customEatingHours || 8;

  const targetStartTime = document.getElementById('setting-target-start-time');
  if (targetStartTime) targetStartTime.value = settings.targetStartTime || '20:00';

  const toggleAutoProgress = document.getElementById('toggle-auto-progress');
  const thresholdInput = document.getElementById('setting-progress-threshold');
  const thresholdRow = document.getElementById('auto-progress-threshold-row');

  if (toggleAutoProgress) toggleAutoProgress.checked = !!settings.autoProgress;
  if (thresholdInput) thresholdInput.value = settings.autoProgressThreshold || 5;
  if (thresholdRow) thresholdRow.style.display = settings.autoProgress ? 'flex' : 'none';

  const toggleNotif = document.getElementById('toggle-notifications');
  const subNotifContainer = document.getElementById('sub-notifications-container');
  const toggleBefore = document.getElementById('toggle-notify-before');
  const toggleTarget = document.getElementById('toggle-notify-target');
  const toggleDaily = document.getElementById('toggle-notify-daily');
  const dailyTime = document.getElementById('setting-daily-reminder-time');

  const notifSettings = settings.notifications || {};
  if (toggleNotif) toggleNotif.checked = !!notifSettings.enabled;
  if (subNotifContainer) subNotifContainer.style.display = notifSettings.enabled ? 'flex' : 'none';

  if (toggleBefore) toggleBefore.checked = !!notifSettings.before30m;
  if (toggleTarget) toggleTarget.checked = !!notifSettings.onTarget;
  if (toggleDaily) toggleDaily.checked = !!notifSettings.dailyReminder;
  if (dailyTime) dailyTime.value = notifSettings.dailyReminderTime || '20:00';

  // v3.0: Exibe status da assinatura PRO
  renderPlanStatus();
}

/**
 * Atualiza dinamicamente as opções do seletor de doses de acordo com a medicação.
 */
export function updateDoseSelectOptions(medId, currentDose = null) {
  const doseSelect = document.getElementById('setting-glp1-dose');
  if (!doseSelect) return;

  const medInfo = getMedicationInfo(medId);
  doseSelect.innerHTML = medInfo.doses
    .map((dose) => `<option value="${dose}" ${dose === currentDose ? 'selected' : ''}>${dose}</option>`)
    .join('');
}

/**
 * Exibe o Bottom Sheet com confirmação de encerramento de jejum (com dica de proteína se GLP-1 ativo).
 */
export function showEndFastModal() {
  const status = getTimerStatus();
  if (!status.isActive) return;

  const state = getState();
  const targetMs = status.targetDurationMs;
  const isTargetAchieved = status.elapsedMs >= targetMs;

  let proteinTipHtml = '';
  if (state.settings?.glp1?.enabled && state.settings?.glp1?.notifyProtein) {
    const weight = getLatestWeight();
    const rec = getProteinRecommendation(weight);
    proteinTipHtml = `
      <div style="background: rgba(0, 198, 255, 0.08); border-left: 3px solid var(--accent-glp1); padding: 10px; border-radius: 8px; margin-bottom: 12px; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
        🛡️ <strong style="color: var(--accent-glp1);">Proteção Muscular (GLP-1):</strong> Ao quebrar seu jejum, priorize fontes ricas em proteína (ovos, frango, iogurte grego, peixe) para prevenir perda de massa muscular.
      </div>
    `;
  }

  const content = `
    <div style="text-align: center; margin-bottom: 12px;">
      <span style="font-size: 2.2rem; font-weight: 800; color: var(--text-primary);">
        ${status.formattedHMS}
      </span>
      <p style="font-size: 0.875rem; margin-top: 4px; color: ${isTargetAchieved ? 'var(--accent)' : 'var(--accent-eating)'};">
        ${isTargetAchieved ? '🎉 Meta de jejum superada com sucesso!' : '⚠️ Encerramento antes da meta programada.'}
      </p>
    </div>

    ${proteinTipHtml}

    <div class="input-field" style="margin-bottom: 16px;">
      <label for="end-fast-notes" style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px; display: block;">
        Notas ou refeição de quebra (opcional):
      </label>
      <textarea id="end-fast-notes" rows="2" placeholder="Ex: Quebrei com ovos mexidos e whey..." style="
        width: 100%;
        background-color: var(--bg-elevated);
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-md);
        padding: 8px 12px;
        color: var(--text-primary);
        font-size: 0.875rem;
        outline: none;
        resize: none;
      "></textarea>
    </div>

    <div style="display: flex; flex-direction: column; gap: 8px;">
      <button type="button" class="btn btn-primary btn-large" id="modal-btn-confirm-end">
        Confirmar Encerramento
      </button>
      <button type="button" class="btn btn-subtle" id="modal-btn-cancel">
        Continuar jejuando
      </button>
    </div>
  `;

  openBottomSheet('Encerrar Jejum', content);

  document.getElementById('modal-btn-confirm-end')?.addEventListener('click', () => {
    const notes = document.getElementById('end-fast-notes')?.value || '';
    endFast(notes);
    closeBottomSheet();
    showToast('Jejum concluído e registrado! 👏', 'success');
    renderTodayScreen();
    renderStatsScreen();
  });

  document.getElementById('modal-btn-cancel')?.addEventListener('click', closeBottomSheet);
}

/**
 * Exibe o Bottom Sheet com confirmação de cancelamento de jejum.
 */
export function showCancelFastModal() {
  const content = `
    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 16px;">
      Tem certeza de que deseja cancelar este jejum? O tempo decorrido não será salvo no histórico.
    </p>

    <div style="display: flex; flex-direction: column; gap: 8px;">
      <button type="button" class="btn btn-accent btn-large" id="modal-btn-confirm-cancel">
        Sim, cancelar jejum
      </button>
      <button type="button" class="btn btn-subtle" id="modal-btn-keep-fasting">
        Não, voltar ao timer
      </button>
    </div>
  `;

  openBottomSheet('Cancelar Jejum?', content);

  document.getElementById('modal-btn-confirm-cancel')?.addEventListener('click', () => {
    cancelFast();
    closeBottomSheet();
    showToast('Jejum cancelado.', 'info');
    renderTodayScreen();
  });

  document.getElementById('modal-btn-keep-fasting')?.addEventListener('click', closeBottomSheet);
}

/**
 * Exibe o Bottom Sheet com detalhes de um jejum do histórico.
 */
export function showFastDetailsModal(fastId) {
  const history = getFilteredHistory('all');
  const fast = history.find((item) => item.id === fastId);
  if (!fast) return;

  const content = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
        <span style="color: var(--text-secondary); font-size: 0.875rem;">Protocolo:</span>
        <strong style="color: var(--text-primary);">${fast.protocolName || fast.protocolId}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
        <span style="color: var(--text-secondary); font-size: 0.875rem;">Duração Real:</span>
        <strong style="color: var(--accent); font-size: 1.1rem;">${formatDuration(fast.durationMs, true)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
        <span style="color: var(--text-secondary); font-size: 0.875rem;">Início:</span>
        <span>${formatDateTime(fast.startedAt)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
        <span style="color: var(--text-secondary); font-size: 0.875rem;">Fim:</span>
        <span>${formatDateTime(fast.endedAt)}</span>
      </div>

      <div class="input-field" style="margin-top: 8px;">
        <label for="edit-fast-notes" style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px; display: block;">
          Observações:
        </label>
        <textarea id="edit-fast-notes" rows="2" style="
          width: 100%;
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-md);
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: 0.875rem;
          outline: none;
        ">${fast.notes || ''}</textarea>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button type="button" class="btn btn-primary btn-full" id="btn-save-fast-notes">
          Salvar Notas
        </button>
        <button type="button" class="btn btn-danger-outline" id="btn-delete-fast-modal" title="Excluir">
          Excluir
        </button>
      </div>
    </div>
  `;

  openBottomSheet('Detalhes do Jejum', content);

  document.getElementById('btn-save-fast-notes')?.addEventListener('click', () => {
    const notes = document.getElementById('edit-fast-notes')?.value || '';
    updateFastInHistory(fastId, { notes });
    closeBottomSheet();
    showToast('Notas atualizadas!', 'success');
  });

  document.getElementById('btn-delete-fast-modal')?.addEventListener('click', () => {
    deleteFastFromHistory(fastId);
    closeBottomSheet();
    showToast('Jejum excluído.', 'info');
    renderHistoryScreen();
    renderStatsScreen();
  });
}

/**
 * NOVO v2.0: Modal de Registro de Aplicação de Caneta GLP-1.
 */
export function showLogInjectionModal() {
  const state = getState();
  const medInfo = getMedicationInfo(state.settings.glp1.medication);
  const suggestedSite = getNextSuggestedSite(state.glp1Injections || []);

  const sitesButtonsHtml = INJECTION_SITES.map(
    (s) => `
    <button type="button" class="site-choice-btn ${s.id === suggestedSite.id ? 'active' : ''}" data-site-id="${s.id}">
      <span>${s.icon}</span>
      <span>${s.name}</span>
    </button>
  `
  ).join('');

  const symptomsChipsHtml = SYMPTOMS_LIST.map(
    (s) => `
    <span class="symptom-chip ${s === 'Sem Sintomas' ? 'selected' : ''}" data-symptom="${s}">
      ${s}
    </span>
  `
  ).join('');

  const dosesOptionsHtml = medInfo.doses
    .map((d) => `<option value="${d}" ${d === state.settings.glp1.currentDose ? 'selected' : ''}>${d}</option>`)
    .join('');

  const content = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div class="input-row">
        <div class="input-field">
          <label style="font-size:0.75rem; color:var(--text-secondary);">Medicação</label>
          <strong style="color:var(--text-primary); padding-top:4px;">${medInfo.name}</strong>
        </div>
        <div class="input-field">
          <label for="modal-inj-dose" style="font-size:0.75rem; color:var(--text-secondary);">Dose Aplicada</label>
          <select id="modal-inj-dose" class="time-input">${dosesOptionsHtml}</select>
        </div>
      </div>

      <div>
        <label style="font-size:0.75rem; color:var(--text-secondary); display:block; margin-bottom:4px;">
          Local da Aplicação (Alternar Zonas):
        </label>
        <div class="injection-site-grid" id="modal-sites-grid">
          ${sitesButtonsHtml}
        </div>
      </div>

      <div>
        <label style="font-size:0.75rem; color:var(--text-secondary); display:block; margin-bottom:4px;">
          Como você está se sentindo? (Sintomas):
        </label>
        <div class="symptom-chip-grid" id="modal-symptoms-grid">
          ${symptomsChipsHtml}
        </div>
      </div>

      <div class="input-field">
        <label for="modal-inj-notes" style="font-size:0.75rem; color:var(--text-secondary); display:block; margin-bottom:4px;">
          Observações adicionais (opcional):
        </label>
        <input type="text" id="modal-inj-notes" class="time-input" placeholder="Ex: Aplicação indolor, hidratação ok...">
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
        <button type="button" class="btn btn-glp1 btn-large" id="btn-confirm-log-inj">
          Confirmar Aplicação 💉
        </button>
        <button type="button" class="btn btn-subtle" id="btn-cancel-log-inj">
          Cancelar
        </button>
      </div>
    </div>
  `;

  openBottomSheet('Registrar Aplicação GLP-1', content);

  // Manipulação de seleção de local
  let selectedSiteId = suggestedSite.id;
  document.querySelectorAll('#modal-sites-grid .site-choice-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#modal-sites-grid .site-choice-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSiteId = btn.getAttribute('data-site-id');
    });
  });

  // Manipulação de seleção de sintomas
  const selectedSymptoms = new Set(['Sem Sintomas']);
  document.querySelectorAll('#modal-symptoms-grid .symptom-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const symptom = chip.getAttribute('data-symptom');
      if (symptom === 'Sem Sintomas') {
        selectedSymptoms.clear();
        selectedSymptoms.add('Sem Sintomas');
        document.querySelectorAll('#modal-symptoms-grid .symptom-chip').forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
      } else {
        selectedSymptoms.delete('Sem Sintomas');
        document.querySelector('[data-symptom="Sem Sintomas"]')?.classList.remove('selected');

        if (selectedSymptoms.has(symptom)) {
          selectedSymptoms.delete(symptom);
          chip.classList.remove('selected');
        } else {
          selectedSymptoms.add(symptom);
          chip.classList.add('selected');
        }

        if (selectedSymptoms.size === 0) {
          selectedSymptoms.add('Sem Sintomas');
          document.querySelector('[data-symptom="Sem Sintomas"]')?.classList.add('selected');
        }
      }
    });
  });

  // Confirmação do Registro
  document.getElementById('btn-confirm-log-inj')?.addEventListener('click', () => {
    const dose = document.getElementById('modal-inj-dose')?.value || state.settings.glp1.currentDose;
    const notes = document.getElementById('modal-inj-notes')?.value || '';
    const siteObj = INJECTION_SITES.find((s) => s.id === selectedSiteId) || suggestedSite;

    addGLP1Injection({
      id: 'inj-' + Date.now(),
      date: Date.now(),
      medicationId: medInfo.id,
      medicationName: medInfo.name,
      dose,
      siteId: siteObj.id,
      siteName: siteObj.name,
      symptoms: Array.from(selectedSymptoms),
      notes
    });

    registerDoseConsumption();

    closeBottomSheet();
    showToast('Dose registrada com sucesso! 💉', 'success');
    renderTodayScreen();
    renderStatsScreen();
  });

  document.getElementById('btn-cancel-log-inj')?.addEventListener('click', closeBottomSheet);
}

/**
 * NOVO v2.0: Modal de Registro de Peso Corporal.
 */
export function showLogWeightModal() {
  const currentWeight = getLatestWeight();

  const content = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <p style="font-size:0.875rem; color:var(--text-secondary);">
        Acompanhe sua perda de peso em conjunto com o jejum intermitente e sua dosagem de GLP-1.
      </p>

      <div class="input-field">
        <label for="modal-weight-val" style="font-size:0.75rem; color:var(--text-secondary); display:block; margin-bottom:4px;">
          Peso Corporal (kg):
        </label>
        <input type="number" id="modal-weight-val" class="time-input" step="0.1" min="30" max="300" value="${currentWeight}" style="font-size:1.5rem; text-align:center;">
      </div>

      <div class="input-field">
        <label for="modal-weight-notes" style="font-size:0.75rem; color:var(--text-secondary); display:block; margin-bottom:4px;">
          Notas (opcional):
        </label>
        <input type="text" id="modal-weight-notes" class="time-input" placeholder="Ex: Pesagem em jejum matinal...">
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
        <button type="button" class="btn btn-primary btn-large" id="btn-confirm-weight">
          Salvar Peso
        </button>
        <button type="button" class="btn btn-subtle" id="btn-cancel-weight">
          Cancelar
        </button>
      </div>
    </div>
  `;

  openBottomSheet('Registrar Peso', content);

  document.getElementById('btn-confirm-weight')?.addEventListener('click', () => {
    const val = Number(document.getElementById('modal-weight-val')?.value);
    const notes = document.getElementById('modal-weight-notes')?.value || '';

    if (val && val > 0) {
      addWeightEntry(val, notes);
      closeBottomSheet();
      showToast(`Peso de ${val.toFixed(1)}kg registrado! ⚖️`, 'success');
      renderStatsScreen();
    }
  });

  document.getElementById('btn-cancel-weight')?.addEventListener('click', closeBottomSheet);
}

/**
 * ==========================================================================
 * NOVO v3.0: RENDERERS E MODAIS COMERCIAIS (PAYWALL, LAUDO, ESTOQUE, NUTRIÇÃO)
 * ==========================================================================
 */

/**
 * Renderiza o widget de Ingestão Proteica Diária na Tela Hoje.
 */
export function renderProteinCard(state) {
  const card = document.getElementById('protein-tracker-card');
  if (!card) return;
  if (!state.settings?.glp1?.enabled) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');

  const prog = getProteinProgress();
  const textEl = document.getElementById('protein-stats-text');
  const fillEl = document.getElementById('protein-progress-fill');

  if (textEl) {
    textEl.textContent = `${prog.currentGrams} / ${prog.targetMin}g (${prog.percentage}%)`;
  }
  if (fillEl) {
    fillEl.style.width = `${prog.percentage}%`;
  }
}

/**
 * Renderiza o card de Estoque de Caneta na Tela Hoje.
 */
export function renderPenInventoryCard(state) {
  const card = document.getElementById('pen-inventory-card');
  if (!card) return;
  if (!state.settings?.glp1?.enabled) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');

  const status = getActivePenStatus();
  const titleEl = document.getElementById('pen-inv-title');
  const descEl = document.getElementById('pen-inv-desc');
  const dotsContainer = document.getElementById('pen-dose-dots');
  const expiryPill = document.getElementById('pen-expiry-pill');
  const reorderBanner = document.getElementById('pen-reorder-banner');

  if (titleEl) titleEl.textContent = status.pen.penName || 'Estoque da Caneta';
  if (descEl) descEl.textContent = `${status.remainingDoses} de ${status.pen.totalDoses} doses restantes`;

  if (dotsContainer) {
    dotsContainer.innerHTML = Array.from({ length: status.pen.totalDoses })
      .map((_, i) => `<div class="dose-dot ${i < status.pen.dosesUsed ? 'used' : ''}"></div>`)
      .join('');
  }

  if (expiryPill) {
    expiryPill.textContent = status.isExpired
      ? '⚠️ Caneta expirada (56 dias)'
      : `Validade: ${status.daysRemainingExpiry} dias restantes`;
    expiryPill.style.color = status.isExpired ? '#EF4444' : '';
  }

  if (reorderBanner) {
    reorderBanner.classList.toggle('hidden', !status.needsReorder);
  }
}

/**
 * Renderiza a vitrine de Suplementos recomendados na Tela Progresso.
 */
export function renderSupplementsShowcase() {
  const container = document.getElementById('supplements-list-container');
  if (!container) return;

  container.innerHTML = RECOMMENDED_SUPPLEMENTS.map(s => `
    <div class="supplement-card">
      <div class="supplement-header">
        <span class="supplement-title">${s.name}</span>
        <span class="tag-pill" style="font-size:0.65rem;">${s.badge}</span>
      </div>
      <p class="supplement-desc">${s.reason}</p>
      <div style="display:flex; justify-content:flex-end; margin-top:4px;">
        <a href="${s.link}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size:0.7rem; padding:4px 10px; text-decoration:none;">
          ${s.ctaText} →
        </a>
      </div>
    </div>
  `).join('');
}

/**
 * Renderiza o status do plano na Tela de Ajustes.
 */
export function renderPlanStatus() {
  const isPro = isProActive();
  const badge = document.getElementById('settings-plan-badge');
  const title = document.getElementById('settings-plan-title');
  const desc = document.getElementById('settings-plan-desc');
  const btn = document.getElementById('btn-open-paywall-settings');

  if (badge) {
    badge.textContent = isPro ? 'PRO 👑' : 'FREE';
    badge.style.background = isPro ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'var(--bg-tertiary)';
    badge.style.color = isPro ? '#FFF' : 'var(--text-secondary)';
  }

  if (title) {
    title.textContent = isPro ? 'FastFlow VIP Ativo 👑' : 'FastFlow Gratuito';
  }

  if (desc) {
    desc.textContent = isPro
      ? 'Todos os recursos comerciais, laudos em PDF e estoque de canetas estão liberados!'
      : 'Desbloqueie laudos clínicos em PDF, estoque de canetas e guia anti-náusea.';
  }

  if (btn) {
    btn.textContent = isPro ? '👑 Assinatura VIP' : '👑 Upgrade PRO';
  }
}

/**
 * Exibe o Paywall de conversão para o FastFlow PRO.
 */
export function showPaywallModal(featureName = 'Recurso Exclusivo') {
  const content = `
    <div class="paywall-modal">
      <div class="paywall-hero">
        <span class="paywall-icon">👑</span>
        <h2 class="paywall-title">FastFlow PRO</h2>
        <p class="paywall-subtitle">Desbloqueie ${featureName} e potencialize seus resultados</p>
      </div>

      <div class="paywall-benefits">
        <div class="benefit-item">
          <span class="benefit-check">✓</span>
          <span><strong>Relatório Clínico em PDF:</strong> Histórico completo de doses e peso formatado para o seu médico/nutricionista.</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-check">✓</span>
          <span><strong>Estoque de Canetas & Alerta:</strong> Controle de doses restantes, validade pós-abertura (56 dias) e aviso de compra.</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-check">✓</span>
          <span><strong>Guia Anti-Náusea & Proteína:</strong> Como quebrar o jejum com GLP-1 sem refluxo e evitando perda muscular.</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-check">✓</span>
          <span><strong>Backup Ilimitado & Suporte VIP:</strong> Acesso prioritário a todas as novidades.</span>
        </div>
      </div>

      <div class="paywall-plans-grid">
        <div class="plan-card active" id="plan-lifetime" data-plan="lifetime">
          <span class="plan-flag">MAIS POPULAR • ECONOMIA 75%</span>
          <div class="plan-name">Acesso Vitalício</div>
          <div class="plan-price">R$ 47,00</div>
          <div class="plan-period">Pagamento único • Sem mensalidade</div>
        </div>

        <div class="plan-card" id="plan-monthly" data-plan="monthly">
          <div class="plan-name">Assinatura Mensal</div>
          <div class="plan-price">R$ 19,90</div>
          <div class="plan-period">por mês • Cancele quando quiser</div>
        </div>
      </div>

      <button type="button" class="btn btn-pro btn-large btn-full" id="btn-paywall-checkout">
        Quero Desbloquear o FastFlow PRO ⚡
      </button>

      <div class="paywall-guarantee">
        <span>🛡️</span>
        <span>Garantia Incondicional de 7 dias ou seu dinheiro de volta.</span>
      </div>

      <div class="license-trigger-row">
        <span style="font-size:0.75rem; color:var(--text-secondary);">Já comprou? Digite sua Chave de Licença:</span>
        <div class="license-input-wrapper">
          <input type="text" id="paywall-license-input" class="time-input" placeholder="Ex: FAST-VIP-XXXX-YYYY" style="text-transform:uppercase; font-size:0.8rem; font-family:monospace; flex:1;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-paywall-activate">Ativar</button>
        </div>
      </div>
    </div>
  `;

  openBottomSheet('FastFlow PRO', content);

  let selectedPlan = 'lifetime';
  document.getElementById('plan-lifetime')?.addEventListener('click', () => {
    document.getElementById('plan-lifetime')?.classList.add('active');
    document.getElementById('plan-monthly')?.classList.remove('active');
    selectedPlan = 'lifetime';
  });

  document.getElementById('plan-monthly')?.addEventListener('click', () => {
    document.getElementById('plan-monthly')?.classList.add('active');
    document.getElementById('plan-lifetime')?.classList.remove('active');
    selectedPlan = 'monthly';
  });

  // Simulação de Checkout / Ativação Imediata
  document.getElementById('btn-paywall-checkout')?.addEventListener('click', () => {
    const demoKey = 'FAST-VIP-DEMO-2026';
    activateLicense(demoKey, selectedPlan);
    closeBottomSheet();
    showToast('👑 FastFlow PRO ativado com sucesso! Aproveite!', 'success');
    renderTodayScreen();
    renderStatsScreen();
    renderSettingsScreen();
  });

  document.getElementById('btn-paywall-activate')?.addEventListener('click', () => {
    const key = document.getElementById('paywall-license-input')?.value || '';
    const res = activateLicense(key, 'lifetime');
    if (res.success) {
      closeBottomSheet();
      showToast('👑 Licença VIP ativada com sucesso!', 'success');
      renderTodayScreen();
      renderStatsScreen();
      renderSettingsScreen();
    } else {
      showToast(res.message, 'warning');
    }
  });
}

/**
 * Exibe o Relatório Clínico em PDF / A4.
 */
export function showMedicalReportModal() {
  if (!isProActive()) {
    showPaywallModal('o Relatório Clínico em PDF');
    return;
  }

  const reportData = compileClinicalReportData();
  const reportHtml = generateMedicalReportHtml(reportData);

  const content = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <p style="font-size: 0.8rem; color: var(--text-secondary);">
        Este documento reúne seus dados clínicos, histórico de doses e variação de peso para você apresentar na consulta com seu endocrinologista ou nutricionista.
      </p>

      <div style="max-height: 52vh; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 4px;">
        ${reportHtml}
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
        <button type="button" class="btn btn-primary btn-large btn-full" id="btn-print-report">
          🖨️ Imprimir ou Salvar PDF (A4)
        </button>
        <button type="button" class="btn btn-subtle" id="btn-close-report">
          Fechar
        </button>
      </div>
    </div>
  `;

  openBottomSheet('Relatório Clínico (A4 / PDF)', content);

  document.getElementById('btn-print-report')?.addEventListener('click', () => {
    printClinicalReport();
  });

  document.getElementById('btn-close-report')?.addEventListener('click', closeBottomSheet);
}

/**
 * Exibe o Modal de Gerenciamento de Estoque de Canetas GLP-1.
 */
export function showPenInventoryModal() {
  if (!isProActive()) {
    showPaywallModal('o Gerenciador de Estoque de Canetas');
    return;
  }

  const status = getActivePenStatus();
  const content = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div class="input-field">
        <label for="inv-pen-name" style="font-size: 0.75rem; color: var(--text-secondary);">Nome da Caneta / Dosagem</label>
        <input type="text" id="inv-pen-name" class="time-input" value="${status.pen.penName}">
      </div>

      <div class="input-row">
        <div class="input-field">
          <label for="inv-total-doses" style="font-size: 0.75rem; color: var(--text-secondary);">Total de Doses</label>
          <input type="number" id="inv-total-doses" class="time-input" min="1" max="60" value="${status.pen.totalDoses}">
        </div>
        <div class="input-field">
          <label for="inv-doses-used" style="font-size: 0.75rem; color: var(--text-secondary);">Doses já Aplicadas</label>
          <input type="number" id="inv-doses-used" class="time-input" min="0" max="60" value="${status.pen.dosesUsed}">
        </div>
      </div>

      <div class="input-row">
        <div class="input-field">
          <label for="inv-expiry-days" style="font-size: 0.75rem; color: var(--text-secondary);">Validade Pós-Uso (dias)</label>
          <input type="number" id="inv-expiry-days" class="time-input" min="1" max="180" value="${status.pen.expiryDays}">
        </div>
        <div class="input-field">
          <label for="inv-price" style="font-size: 0.75rem; color: var(--text-secondary);">Preço Pago (R$)</label>
          <input type="number" id="inv-price" class="time-input" min="0" step="10" value="${status.pen.pricePaid}">
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
        <button type="button" class="btn btn-glp1 btn-large" id="btn-save-inventory">
          Salvar Dados da Caneta
        </button>
        <button type="button" class="btn btn-subtle" id="btn-cancel-inventory">
          Cancelar
        </button>
      </div>
    </div>
  `;

  openBottomSheet('Estoque da Caneta GLP-1', content);

  document.getElementById('btn-save-inventory')?.addEventListener('click', () => {
    const penName = document.getElementById('inv-pen-name')?.value || 'Caneta GLP-1';
    const totalDoses = Number(document.getElementById('inv-total-doses')?.value) || 4;
    const dosesUsed = Number(document.getElementById('inv-doses-used')?.value) || 0;
    const expiryDays = Number(document.getElementById('inv-expiry-days')?.value) || 56;
    const pricePaid = Number(document.getElementById('inv-price')?.value) || 0;

    const inv = getState().inventory || {};
    inv.activePen = {
      ...(inv.activePen || {}),
      penName,
      totalDoses,
      dosesUsed,
      expiryDays,
      pricePaid
    };
    saveInventory(inv);
    closeBottomSheet();
    showToast('Estoque de caneta atualizado! 📦', 'success');
    renderTodayScreen();
  });

  document.getElementById('btn-cancel-inventory')?.addEventListener('click', closeBottomSheet);
}

/**
 * Exibe o Guia de Quebra de Jejum Anti-Náusea para Usuários de GLP-1.
 */
export function showFastBreakGuideModal() {
  const p1 = FAST_BREAKING_PROTOCOL.phase1;
  const p2 = FAST_BREAKING_PROTOCOL.phase2;
  const avoids = FAST_BREAKING_PROTOCOL.whatToAvoid;

  const content = `
    <div style="display: flex; flex-direction: column; gap: 14px; max-height: 65vh; overflow-y: auto;">
      <div style="background: rgba(0, 198, 255, 0.08); border: 1px solid rgba(0, 198, 255, 0.25); border-radius: var(--radius-md); padding: 10px 12px;">
        <strong style="color: var(--accent-glp1); font-size: 0.85rem;">Por que a quebra em 2 fases é vital no GLP-1?</strong>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
          Análogos de GLP-1 retardam a motilidade gástrica. Comer refeições pesadas logo após jejuar causa distensão brusca do estômago, gerando náuseas e refluxo.
        </p>
      </div>

      <div>
        <h4 style="font-size: 0.875rem; color: var(--accent-eating); margin-bottom: 4px;">${p1.title}</h4>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">${p1.description}</p>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${p1.recommendations.map(r => `
            <div style="background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 10px;">
              <strong style="font-size: 0.8rem; color: var(--text-primary);">${r.title}</strong>
              <div style="font-size: 0.7rem; color: var(--text-secondary);">${r.benefit}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div>
        <h4 style="font-size: 0.875rem; color: var(--accent); margin-bottom: 4px;">${p2.title}</h4>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">${p2.description}</p>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${p2.recommendations.map(r => `
            <div style="background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 10px;">
              <strong style="font-size: 0.8rem; color: var(--text-primary);">${r.title}</strong>
              <div style="font-size: 0.7rem; color: var(--text-secondary);">${r.benefit}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div>
        <h4 style="font-size: 0.85rem; color: #EF4444; margin-bottom: 6px;">🚫 O que EVITAR na Quebra:</h4>
        <ul style="padding-left: 18px; font-size: 0.75rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;">
          ${avoids.map(a => `<li>${a}</li>`).join('')}
        </ul>
      </div>

      <button type="button" class="btn btn-secondary btn-full" id="btn-close-guide" style="margin-top: 8px;">
        Entendido
      </button>
    </div>
  `;

  openBottomSheet('Guia de Quebra de Jejum & GLP-1', content);
  document.getElementById('btn-close-guide')?.addEventListener('click', closeBottomSheet);
}

