/**
 * FastFlow — Módulo de Histórico de Jejuns
 * Operações CRUD, filtros por período (Todos, Esta semana, Este mês)
 * e identificação de recordes pessoais.
 */

import { getState, setHistory } from './state.js';
import { isThisWeek, isThisMonth } from './utils.js';

/**
 * Retorna todos os jejuns ordenados do mais recente ao mais antigo.
 * @returns {Array}
 */
export function getHistory() {
  const { history } = getState();
  return [...history].sort((a, b) => (b.endedAt || b.startedAt) - (a.endedAt || a.startedAt));
}

/**
 * Adiciona um novo jejum concluído ao topo do histórico.
 * @param {Object} fastRecord
 */
export function addFastToHistory(fastRecord) {
  const currentHistory = getHistory();
  const updatedHistory = [fastRecord, ...currentHistory];
  setHistory(updatedHistory);
}

/**
 * Remove um jejum do histórico pelo ID.
 * @param {string} fastId
 * @returns {boolean}
 */
export function deleteFastFromHistory(fastId) {
  const currentHistory = getHistory();
  const updatedHistory = currentHistory.filter((item) => item.id !== fastId);
  setHistory(updatedHistory);
  return true;
}

/**
 * Atualiza notas ou detalhes de um jejum existente.
 * @param {string} fastId
 * @param {Object} updates
 */
export function updateFastInHistory(fastId, updates) {
  const currentHistory = getHistory();
  const updatedHistory = currentHistory.map((item) => {
    if (item.id === fastId) {
      return { ...item, ...updates };
    }
    return item;
  });
  setHistory(updatedHistory);
}

/**
 * Retorna a lista de histórico filtrada pelo critério especificado.
 * @param {'all'|'week'|'month'} filterType
 * @returns {Array}
 */
export function getFilteredHistory(filterType = 'all') {
  const history = getHistory();

  if (filterType === 'week') {
    return history.filter((item) => isThisWeek(item.endedAt || item.startedAt));
  }

  if (filterType === 'month') {
    return history.filter((item) => isThisMonth(item.endedAt || item.startedAt));
  }

  return history;
}

/**
 * Retorna o último jejum finalizado no histórico, ou null se não houver.
 * @returns {Object|null}
 */
export function getLastCompletedFast() {
  const history = getHistory();
  return history.length > 0 ? history[0] : null;
}

/**
 * Identifica o jejum com a maior duração já registrada.
 * @returns {Object|null}
 */
export function getLongestFast() {
  const history = getHistory();
  if (history.length === 0) return null;

  return history.reduce((max, current) => {
    const currentDuration = current.durationMs || 0;
    const maxDuration = max.durationMs || 0;
    return currentDuration > maxDuration ? current : max;
  }, history[0]);
}

/**
 * Verifica se um determinado jejum é o recorde de duração pessoal.
 * @param {Object} fast
 * @returns {boolean}
 */
export function isRecordFast(fast) {
  if (!fast || !fast.durationMs) return false;
  const history = getHistory();
  if (history.length <= 1) return true;

  const otherMax = history
    .filter((item) => item.id !== fast.id)
    .reduce((max, item) => Math.max(max, item.durationMs || 0), 0);

  return fast.durationMs > otherMax;
}
