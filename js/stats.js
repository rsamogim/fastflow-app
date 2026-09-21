/**
 * FastFlow — Módulo de Estatísticas & Análise de Desempenho
 * Cálculos de streak de dias consecutivos (≥90% da meta),
 * médias, taxas de conclusão e motor de progressão automática.
 */

import { getState } from './state.js';
import { getHistory, getLongestFast } from './history.js';
import { getNextProtocol, getProtocolById } from './protocols.js';
import { isThisMonth } from './utils.js';

/**
 * Converte timestamp para chave no formato 'YYYY-MM-DD'.
 */
function toDateKey(timestamp) {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula a sequência atual (streak) de dias consecutivos cumpridos.
 * Critério: O dia é válido se houver pelo menos um jejum com duração ≥ 90% da meta.
 * @param {Array} history
 * @returns {number} Quantidade de dias consecutivos
 */
export function calculateStreak(history = getHistory()) {
  if (!history || history.length === 0) return 0;

  // Mapeia os dias com jejum bem-sucedido (≥ 90% da meta)
  const validDays = new Set();
  history.forEach((fast) => {
    const targetMs = fast.targetDurationMs || (fast.fastHours * 3600 * 1000);
    const duration = fast.durationMs || 0;
    if (duration >= targetMs * 0.9) {
      const dateKey = toDateKey(fast.endedAt || fast.startedAt);
      validDays.add(dateKey);
    }
  });

  if (validDays.size === 0) return 0;

  const now = new Date();
  const todayKey = toDateKey(now);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  let streak = 0;
  let checkDate = new Date(now);

  // Se o usuário ainda não completou hoje, mas completou ontem, o streak ainda está vivo
  if (!validDays.has(todayKey)) {
    if (!validDays.has(yesterdayKey)) {
      return 0; // Perdeu o dia de ontem, streak reinicia em 0
    }
    checkDate = yesterday;
  }

  // Percorre os dias regressivamente contando a sequência ininterrupta
  while (true) {
    const key = toDateKey(checkDate);
    if (validDays.has(key)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calcula a média de duração dos jejuns nos últimos 30 dias.
 * @param {Array} history
 * @returns {number} Duração média em milissegundos
 */
export function calculateAverageDuration30Days(history = getHistory()) {
  if (!history || history.length === 0) return 0;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
  const recentFasts = history.filter((fast) => (fast.endedAt || fast.startedAt) >= thirtyDaysAgo);

  if (recentFasts.length === 0) return 0;

  const totalDuration = recentFasts.reduce((sum, item) => sum + (item.durationMs || 0), 0);
  return Math.round(totalDuration / recentFasts.length);
}

/**
 * Calcula a taxa percentual de jejuns que atingiram a meta.
 * @param {Array} history
 * @returns {number} 0 a 100
 */
export function calculateCompletionRate(history = getHistory()) {
  if (!history || history.length === 0) return 0;

  const completed = history.filter((fast) => {
    const targetMs = fast.targetDurationMs || (fast.fastHours * 3600 * 1000);
    return (fast.durationMs || 0) >= targetMs;
  });

  return Math.round((completed.length / history.length) * 100);
}

/**
 * Calcula a quantidade total de horas jejuadas no mês atual.
 * @param {Array} history
 * @returns {{ totalHours: number, totalMinutes: number, count: number }}
 */
export function calculateMonthTotals(history = getHistory()) {
  const monthFasts = history.filter((item) => isThisMonth(item.endedAt || item.startedAt));
  const totalMs = monthFasts.reduce((sum, item) => sum + (item.durationMs || 0), 0);
  const totalHours = Math.floor(totalMs / (3600 * 1000));
  const totalMinutes = Math.floor((totalMs % (3600 * 1000)) / 60000);

  return {
    totalHours,
    totalMinutes,
    count: monthFasts.length
  };
}

/**
 * Avalia se o usuário está elegível para receber sugestão de subir de protocolo.
 * Regra: se atingiu a meta N vezes consecutivas (padrão: 5).
 * @returns {Object}
 */
export function checkProgressionSuggestion() {
  const { settings, history, dismissedSuggestionProtocol } = getState();

  if (!settings.autoProgress) {
    return { eligible: false };
  }

  const threshold = Math.max(3, Number(settings.autoProgressThreshold) || 5);
  const currentProtocol = getProtocolById(
    settings.currentProtocol,
    settings.customFastHours,
    settings.customEatingHours
  );
  const nextProtocol = getNextProtocol(settings.currentProtocol);

  if (!nextProtocol) {
    return { eligible: false }; // Já está no topo ou em protocolo customizado
  }

  if (dismissedSuggestionProtocol === nextProtocol.id) {
    return { eligible: false }; // Usuário já recusou essa sugestão recentemente
  }

  // Verifica os últimos jejuns de forma consecutiva
  let consecutiveSuccesses = 0;
  for (const fast of history) {
    const targetMs = fast.targetDurationMs || (fast.fastHours * 3600 * 1000);
    if ((fast.durationMs || 0) >= targetMs) {
      consecutiveSuccesses++;
      if (consecutiveSuccesses >= threshold) {
        break;
      }
    } else {
      break; // Interrompeu a sequência
    }
  }

  if (consecutiveSuccesses >= threshold) {
    return {
      eligible: true,
      consecutiveSuccesses,
      currentProtocol,
      nextProtocol
    };
  }

  return { eligible: false };
}

/**
 * Agrupa todas as métricas calculadas em um único objeto para renderização de telas.
 * @returns {Object}
 */
export function getAllStats() {
  const history = getHistory();
  const streak = calculateStreak(history);
  const longestFast = getLongestFast();
  const avgDuration30d = calculateAverageDuration30Days(history);
  const completionRate = calculateCompletionRate(history);
  const monthTotals = calculateMonthTotals(history);
  const progression = checkProgressionSuggestion();

  return {
    streak,
    longestFast,
    avgDuration30d,
    completionRate,
    monthTotals,
    totalFasts: history.length,
    progression
  };
}
