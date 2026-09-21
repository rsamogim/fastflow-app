/**
 * FastFlow v2.0 — Gerenciamento de Estado Central Reativo (Pub/Sub)
 * Ponto único de verdade para o ciclo de jejum ativo, histórico, preferências
 * e módulo GLP-1 Companion (injeções, hidratação e peso).
 */

import { getStorage, setStorage, STORAGE_KEYS } from './storage.js';
import { getProtocolById } from './protocols.js';

const listeners = new Set();

const DEFAULT_SETTINGS = {
  currentProtocol: '16:8',
  customFastHours: 16,
  customEatingHours: 8,
  targetStartTime: '20:00',
  autoProgress: true,
  autoProgressThreshold: 5,
  theme: 'dark',
  notifications: {
    enabled: false,
    before30m: true,
    onTarget: true,
    dailyReminder: false,
    dailyReminderTime: '20:00'
  },
  glp1: {
    enabled: false,
    medication: 'ozempic',
    currentDose: '0,5mg',
    injectionDay: 'quinta',
    injectionTime: '08:00',
    waterTargetMl: 2500,
    currentWeight: 75,
    notifyInjection: true,
    notifyWater: true,
    notifyProtein: true
  }
};

let appState = {
  activeFast: null,
  history: [],
  settings: { ...DEFAULT_SETTINGS },
  glp1Injections: [],
  glp1WaterLog: {},
  weightHistory: [],
  dismissedSuggestionProtocol: null,
  license: null,
  isPro: false,
  inventory: null,
  proteinLog: {},
  todayProtein: 0
};

/**
 * Notifica todos os observadores cadastrados sobre uma mudança no estado.
 */
function notifyListeners(changedKey = null) {
  listeners.forEach((callback) => {
    try {
      callback(appState, changedKey);
    } catch (err) {
      console.error('[FastFlow State] Erro em listener:', err);
    }
  });
}

/**
 * Retorna a chave do dia atual no formato YYYY-MM-DD.
 */
export function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Inscreve uma função para receber atualizações do estado central.
 * @param {Function} callback
 * @returns {Function} Função de desinscrição
 */
export function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Retorna uma cópia do estado atual da aplicação.
 */
export function getState() {
  return { ...appState };
}

/**
 * Atualiza parcialmente o estado da aplicação e notifica observadores.
 * @param {object} partial
 */
export function setState(partial) {
  appState = { ...appState, ...partial };
  notifyListeners('setState');
}

/**
 * Retorna uma cópia do histórico de peso corporal.
 */
export function getWeightHistory() {
  return [...appState.weightHistory];
}

/**
 * Inicializa o estado a partir do armazenamento local ao carregar a página.
 */
export function initState() {
  const savedSettings = getStorage(STORAGE_KEYS.SETTINGS, {});
  appState.settings = {
    ...DEFAULT_SETTINGS,
    ...savedSettings,
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...(savedSettings.notifications || {})
    },
    glp1: {
      ...DEFAULT_SETTINGS.glp1,
      ...(savedSettings.glp1 || {})
    }
  };

  appState.history = getStorage(STORAGE_KEYS.HISTORY, []);
  appState.glp1Injections = getStorage(STORAGE_KEYS.GLP1_INJECTIONS, []);
  appState.glp1WaterLog = getStorage(STORAGE_KEYS.GLP1_WATER, {});
  appState.weightHistory = getStorage(STORAGE_KEYS.WEIGHT, []);
  
  // v3.0: Licença, Estoque e Nutrição
  const savedLicense = getStorage(STORAGE_KEYS.LICENSE, null);
  appState.license = savedLicense;
  appState.isPro = Boolean(savedLicense && savedLicense.isPro);
  appState.inventory = getStorage(STORAGE_KEYS.INVENTORY, null);
  appState.proteinLog = getStorage(STORAGE_KEYS.PROTEIN, {});
  appState.todayProtein = Number(appState.proteinLog[getTodayKey()]) || 0;

  // Recupera jejum em andamento se existir
  const savedActiveFast = getStorage(STORAGE_KEYS.STATE, null);
  if (savedActiveFast && savedActiveFast.startedAt && !savedActiveFast.endedAt) {
    appState.activeFast = savedActiveFast;
  } else {
    appState.activeFast = null;
  }

  notifyListeners('init');
  return appState;
}

/**
 * Atualiza o jejum ativo e persiste no storage.
 */
export function setActiveFast(fast) {
  appState.activeFast = fast;
  if (fast) {
    setStorage(STORAGE_KEYS.STATE, fast);
  } else {
    setStorage(STORAGE_KEYS.STATE, null);
  }
  notifyListeners('activeFast');
}

/**
 * Atualiza o histórico de jejuns e persiste no storage.
 */
export function setHistory(historyList) {
  appState.history = historyList;
  setStorage(STORAGE_KEYS.HISTORY, historyList);
  notifyListeners('history');
}

/**
 * Atualiza as configurações do usuário e persiste no storage.
 */
export function updateSettings(partialSettings) {
  appState.settings = {
    ...appState.settings,
    ...partialSettings,
    notifications: {
      ...appState.settings.notifications,
      ...(partialSettings.notifications || {})
    },
    glp1: {
      ...appState.settings.glp1,
      ...(partialSettings.glp1 || {})
    }
  };
  setStorage(STORAGE_KEYS.SETTINGS, appState.settings);
  notifyListeners('settings');
}

/**
 * Retorna o protocolo atualmente selecionado pelo usuário.
 */
export function getCurrentProtocol() {
  const { currentProtocol, customFastHours, customEatingHours } = appState.settings;
  return getProtocolById(currentProtocol, customFastHours, customEatingHours);
}

/**
 * Registra a dispensa de uma sugestão de protocolo.
 */
export function dismissSuggestion(protocolId) {
  appState.dismissedSuggestionProtocol = protocolId;
  notifyListeners('suggestion');
}

/* ==========================================================================
   AÇÕES DO MÓDULO GLP-1 & SAÚDE
   ========================================================================== */

/**
 * Adiciona um registro de aplicação de caneta GLP-1.
 */
export function addGLP1Injection(injection) {
  const updated = [injection, ...appState.glp1Injections];
  appState.glp1Injections = updated;
  setStorage(STORAGE_KEYS.GLP1_INJECTIONS, updated);
  notifyListeners('glp1Injections');
}

/**
 * Remove uma aplicação registrada.
 */
export function deleteGLP1Injection(id) {
  const updated = appState.glp1Injections.filter((inj) => inj.id !== id);
  appState.glp1Injections = updated;
  setStorage(STORAGE_KEYS.GLP1_INJECTIONS, updated);
  notifyListeners('glp1Injections');
}

/**
 * Retorna o número de copos de água consumidos hoje.
 */
export function getTodayWaterCups() {
  const today = getTodayKey();
  return appState.glp1WaterLog[today] || 0;
}

/**
 * Define o número de copos de hoje.
 */
export function setTodayWaterCups(cups) {
  const today = getTodayKey();
  const safeCups = Math.max(0, Number(cups) || 0);
  appState.glp1WaterLog = {
    ...appState.glp1WaterLog,
    [today]: safeCups
  };
  setStorage(STORAGE_KEYS.GLP1_WATER, appState.glp1WaterLog);
  notifyListeners('water');
}

/**
 * Incrementa 1 copo de água (250ml).
 */
export function incrementTodayWater() {
  const current = getTodayWaterCups();
  setTodayWaterCups(current + 1);
}

/**
 * Decrementa 1 copo de água.
 */
export function decrementTodayWater() {
  const current = getTodayWaterCups();
  if (current > 0) {
    setTodayWaterCups(current - 1);
  }
}

/**
 * Adiciona um registro de peso corporal.
 */
export function addWeightEntry(weightKg, notes = '') {
  const entry = {
    id: 'weight-' + Date.now(),
    date: Date.now(),
    weight: Number(weightKg),
    notes: notes || ''
  };
  const updated = [entry, ...appState.weightHistory].sort((a, b) => b.date - a.date);
  appState.weightHistory = updated;
  setStorage(STORAGE_KEYS.WEIGHT, updated);

  // Atualiza também o peso atual nas configurações do GLP-1
  updateSettings({
    glp1: {
      ...appState.settings.glp1,
      currentWeight: Number(weightKg)
    }
  });

  notifyListeners('weight');
  return entry;
}

/**
 * Remove um registro de peso corporal.
 */
export function deleteWeightEntry(id) {
  const updated = appState.weightHistory.filter((w) => w.id !== id);
  appState.weightHistory = updated;
  setStorage(STORAGE_KEYS.WEIGHT, updated);
  notifyListeners('weight');
}

/**
 * Retorna o peso mais recente registrado.
 */
export function getLatestWeight() {
  if (appState.weightHistory.length > 0) {
    return appState.weightHistory[0].weight;
  }
  return appState.settings.glp1?.currentWeight || 75;
}
