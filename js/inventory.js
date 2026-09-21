/**
 * FastFlow v3.0 — Gerenciador de Estoque de Canetas & Alerta de Recompra (PRO)
 * Controle de doses restantes por caneta, contagem de cliques, alerta de validade
 * pós-abertura (56 dias refrigerado) e aviso de compra antecipada para evitar interrupção.
 */

import { getStorageItem, setStorageItem } from './storage.js';
import { getState, setState } from './state.js';

const INVENTORY_STORAGE_KEY = 'fastflow:inventory';

/**
 * Retorna o estado padrão do inventário de caneta.
 */
function getDefaultInventory() {
  return {
    activePen: {
      id: 'pen-default',
      medicationId: 'ozempic',
      penName: 'Caneta Ozempic 1,0mg/dose',
      totalDoses: 4,
      dosesUsed: 0,
      openedDate: Date.now(),
      expiryDays: 56, // 56 dias de estabilidade após o primeiro uso
      pricePaid: 1050.00
    },
    historyPens: []
  };
}

/**
 * Carrega os dados de estoque salvos.
 * @returns {object}
 */
export function loadInventory() {
  const data = getStorageItem(INVENTORY_STORAGE_KEY, null);
  if (!data) {
    const def = getDefaultInventory();
    setStorageItem(INVENTORY_STORAGE_KEY, def);
    return def;
  }
  return data;
}

/**
 * Salva os dados de estoque.
 * @param {object} inventoryData
 */
export function saveInventory(inventoryData) {
  setStorageItem(INVENTORY_STORAGE_KEY, inventoryData);
  setState({ inventory: inventoryData });
}

/**
 * Retorna as estatísticas da caneta ativa.
 * @returns {{
 *   pen: object,
 *   remainingDoses: number,
 *   percentUsed: number,
 *   isExpired: boolean,
 *   daysRemainingExpiry: number,
 *   needsReorder: boolean
 * }}
 */
export function getActivePenStatus() {
  const inv = getState().inventory || loadInventory();
  const pen = inv.activePen || getDefaultInventory().activePen;

  const remainingDoses = Math.max(0, pen.totalDoses - pen.dosesUsed);
  const percentUsed = Math.min(100, Math.round((pen.dosesUsed / pen.totalDoses) * 100));

  // Validade pós-abertura
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceOpened = Math.floor((Date.now() - pen.openedDate) / msPerDay);
  const daysRemainingExpiry = Math.max(0, pen.expiryDays - daysSinceOpened);
  const isExpired = daysRemainingExpiry <= 0;

  // Alerta de recompra: quando resta apenas 1 dose ou menos
  const needsReorder = remainingDoses <= 1;

  return {
    pen,
    remainingDoses,
    percentUsed,
    isExpired,
    daysRemainingExpiry,
    needsReorder
  };
}

/**
 * Consome uma dose da caneta ativa (chamado quando uma injeção é registrada).
 */
export function registerDoseConsumption() {
  const inv = getState().inventory || loadInventory();
  if (!inv.activePen) return;

  inv.activePen.dosesUsed = Math.min(inv.activePen.totalDoses, inv.activePen.dosesUsed + 1);
  saveInventory(inv);
}

/**
 * Registra uma nova caneta (substitui a anterior e move a antiga para o histórico).
 * @param {object} newPenData
 */
export function startNewPen({ penName, totalDoses = 4, pricePaid = 1000, expiryDays = 56 }) {
  const inv = getState().inventory || loadInventory();

  if (inv.activePen) {
    inv.historyPens.push({
      ...inv.activePen,
      closedAt: Date.now()
    });
  }

  inv.activePen = {
    id: 'pen-' + Date.now(),
    medicationId: getState().settings?.glp1?.medication || 'ozempic',
    penName: penName || 'Nova Caneta GLP-1',
    totalDoses: Number(totalDoses) || 4,
    dosesUsed: 0,
    openedDate: Date.now(),
    expiryDays: Number(expiryDays) || 56,
    pricePaid: Number(pricePaid) || 0
  };

  saveInventory(inv);
}
