/**
 * FastFlow — Módulo do Cronômetro (Timer)
 * Imune a atrasos de background: calcula tempo estritamente baseado em Date.now() - startedAt.
 * Recalcula instantaneamente no evento 'visibilitychange'.
 */

import { getState, setActiveFast, getCurrentProtocol } from './state.js';
import { generateUUID, formatHMS, formatDuration, getFastingStage } from './utils.js';
import { addFastToHistory } from './history.js';
import { notifyTargetReached, notifyBeforeTarget } from './notifications.js';

let timerInterval = null;
const timerListeners = new Set();

/**
 * Inscreve uma função para receber ticks a cada segundo do cronômetro.
 * @param {Function} callback
 * @returns {Function}
 */
export function onTimerTick(callback) {
  timerListeners.add(callback);
  return () => timerListeners.delete(callback);
}

/**
 * Emite os dados atualizados do timer para todos os ouvintes.
 */
function emitTimerTick(tickData) {
  timerListeners.forEach((callback) => {
    try {
      callback(tickData);
    } catch (err) {
      console.error('[FastFlow Timer] Erro em listener de tick:', err);
    }
  });
}

/**
 * Calcula o estado preciso do timer neste instante.
 * @returns {Object}
 */
export function getTimerStatus() {
  const { activeFast } = getState();

  if (!activeFast || !activeFast.startedAt) {
    return {
      isActive: false,
      elapsedMs: 0,
      remainingMs: 0,
      targetDurationMs: 0,
      progressPercent: 0,
      isTargetReached: false,
      formattedHMS: '00:00:00',
      formattedRemaining: 'Meta não iniciada',
      fastingStage: getFastingStage(0)
    };
  }

  const now = Date.now();
  const elapsedMs = Math.max(0, now - activeFast.startedAt);
  const targetDurationMs = (activeFast.fastHours || 16) * 3600 * 1000;
  const remainingMs = targetDurationMs - elapsedMs;
  const isTargetReached = elapsedMs >= targetDurationMs;
  const progressPercent = Math.min(100, Math.max(0, (elapsedMs / targetDurationMs) * 100));

  const elapsedHours = elapsedMs / (3600 * 1000);
  const fastingStage = getFastingStage(elapsedHours);

  // Verificação e disparo de notificações com marcação para não repetir
  checkTimerNotifications(activeFast, elapsedMs, targetDurationMs, remainingMs);

  return {
    isActive: true,
    activeFast,
    elapsedMs,
    remainingMs,
    targetDurationMs,
    progressPercent,
    isTargetReached,
    formattedHMS: formatHMS(elapsedMs),
    formattedRemaining: isTargetReached
      ? 'Meta atingida! 🎉'
      : `Tempo restante: ${formatDuration(Math.max(0, remainingMs))}`,
    fastingStage
  };
}

/**
 * Dispara notificações no momento exato (30m antes ou ao atingir a meta).
 */
function checkTimerNotifications(fast, elapsedMs, targetDurationMs, remainingMs) {
  const thirtyMinutesMs = 30 * 60 * 1000;

  // Aviso 30 minutos antes
  if (
    !fast.notified30m &&
    remainingMs <= thirtyMinutesMs &&
    remainingMs > 0 &&
    targetDurationMs > thirtyMinutesMs
  ) {
    fast.notified30m = true;
    setActiveFast(fast);
    notifyBeforeTarget(fast.fastHours);
  }

  // Aviso ao atingir a meta
  if (!fast.notifiedTarget && elapsedMs >= targetDurationMs) {
    fast.notifiedTarget = true;
    setActiveFast(fast);
    notifyTargetReached(fast.fastHours);
  }
}

/**
 * Executa um tick do timer e despacha para os listeners.
 */
function tick() {
  const status = getTimerStatus();
  emitTimerTick(status);
}

/**
 * Inicia o loop de ticks a cada 1000ms.
 */
export function startTimerTick() {
  if (timerInterval) clearInterval(timerInterval);
  tick(); // Execução imediata
  timerInterval = setInterval(tick, 1000);
}

/**
 * Para o loop do timer.
 */
export function stopTimerTick() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/**
 * Inicia um novo ciclo de jejum baseado no protocolo configurado ou informado.
 * @param {Object|null} customProtocol
 * @returns {Object} Novo objeto de jejum ativo
 */
export function startFast(customProtocol = null) {
  const protocol = customProtocol || getCurrentProtocol();
  const startedAt = Date.now();
  const fastHours = protocol.fastHours;
  const targetEndTime = startedAt + fastHours * 3600 * 1000;

  const newFast = {
    id: generateUUID(),
    protocolId: protocol.id,
    protocolName: protocol.name,
    fastHours: fastHours,
    eatingHours: protocol.eatingHours,
    startedAt,
    targetEndTime,
    notified30m: false,
    notifiedTarget: false,
    notes: ''
  };

  setActiveFast(newFast);
  startTimerTick();
  return newFast;
}

/**
 * Encerra o jejum atual, salvando no histórico.
 * @param {string} notes - Notas ou observações opcionais
 * @returns {Object|null} Registro do jejum finalizado
 */
export function endFast(notes = '') {
  const { activeFast } = getState();
  if (!activeFast) return null;

  const endedAt = Date.now();
  const durationMs = Math.max(0, endedAt - activeFast.startedAt);
  const targetDurationMs = activeFast.fastHours * 3600 * 1000;
  const isCompleted = durationMs >= targetDurationMs;
  const percentage = Math.round((durationMs / targetDurationMs) * 100);

  const completedFast = {
    id: activeFast.id,
    protocolId: activeFast.protocolId,
    protocolName: activeFast.protocolName,
    fastHours: activeFast.fastHours,
    eatingHours: activeFast.eatingHours,
    startedAt: activeFast.startedAt,
    endedAt,
    durationMs,
    targetDurationMs,
    isCompleted,
    percentage,
    notes: notes || ''
  };

  addFastToHistory(completedFast);
  setActiveFast(null);
  tick(); // Atualiza a interface para estado 'Parado'
  return completedFast;
}

/**
 * Cancela o jejum atual sem adicionar ao histórico.
 */
export function cancelFast() {
  setActiveFast(null);
  tick();
}

/**
 * Configura o listener do ciclo de vida da página (visibilitychange)
 * para evitar qualquer dessincronização de timer ao trocar de abas ou reabrir o app.
 */
export function initTimer() {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      tick();
    }
  });

  // Inicia o tick se houver um jejum ativo ao carregar
  startTimerTick();
}
