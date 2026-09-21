/**
 * FastFlow — Módulo de Armazenamento Local (Storage)
 * Wrapper seguro sobre localStorage com tratamento de exceções,
 * exportação e importação de backups completos.
 */

export const STORAGE_KEYS = {
  STATE: 'fastflow:state',
  HISTORY: 'fastflow:history',
  SETTINGS: 'fastflow:settings',
  GLP1_INJECTIONS: 'fastflow:glp1_injections',
  GLP1_WATER: 'fastflow:glp1_water',
  WEIGHT: 'fastflow:weight',
  LICENSE: 'fastflow:license',
  INVENTORY: 'fastflow:inventory',
  PROTEIN: 'fastflow:protein_log'
};

export const getStorageItem = getStorage;
export const setStorageItem = setStorage;
export const removeStorageItem = removeStorage;

/**
 * Lê um valor serializado em JSON do localStorage.
 * @param {string} key - Chave do localStorage
 * @param {*} defaultValue - Valor retornado se a chave não existir ou falhar
 * @returns {*}
 */
export function getStorage(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[FastFlow Storage] Falha ao recuperar chave "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Salva um valor serializado em JSON no localStorage.
 * @param {string} key - Chave do localStorage
 * @param {*} value - Valor a ser persistido
 * @returns {boolean} Retorna true se salvou com sucesso
 */
export function setStorage(key, value) {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`[FastFlow Storage] Falha ao salvar chave "${key}":`, error);
    return false;
  }
}

/**
 * Remove uma chave do localStorage.
 * @param {string} key
 */
export function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[FastFlow Storage] Falha ao remover chave "${key}":`, error);
  }
}

/**
 * Limpa todos os dados associados ao FastFlow.
 */
export function clearAllFastFlowData() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    removeStorage(key);
  });
}

/**
 * Agrupa todo o banco de dados local em um único objeto para backup.
 * @returns {Object}
 */
export function exportAllData() {
  return {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    state: getStorage(STORAGE_KEYS.STATE, {}),
    history: getStorage(STORAGE_KEYS.HISTORY, []),
    settings: getStorage(STORAGE_KEYS.SETTINGS, {}),
    glp1Injections: getStorage(STORAGE_KEYS.GLP1_INJECTIONS, []),
    glp1Water: getStorage(STORAGE_KEYS.GLP1_WATER, {}),
    weightHistory: getStorage(STORAGE_KEYS.WEIGHT, [])
  };
}

/**
 * Valida e importa um backup de dados, restaurando as chaves locais.
 * @param {Object} data - Objeto vindo do JSON importado
 * @returns {boolean}
 */
export function importAllData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Arquivo de dados inválido.');
  }

  if (data.history && Array.isArray(data.history)) {
    setStorage(STORAGE_KEYS.HISTORY, data.history);
  }

  if (data.settings && typeof data.settings === 'object') {
    setStorage(STORAGE_KEYS.SETTINGS, data.settings);
  }

  if (data.state && typeof data.state === 'object') {
    setStorage(STORAGE_KEYS.STATE, data.state);
  }

  if (data.glp1Injections && Array.isArray(data.glp1Injections)) {
    setStorage(STORAGE_KEYS.GLP1_INJECTIONS, data.glp1Injections);
  }

  if (data.glp1Water && typeof data.glp1Water === 'object') {
    setStorage(STORAGE_KEYS.GLP1_WATER, data.glp1Water);
  }

  if (data.weightHistory && Array.isArray(data.weightHistory)) {
    setStorage(STORAGE_KEYS.WEIGHT, data.weightHistory);
  }

  return true;
}

/**
 * Retorna o histórico de peso diretamente do storage.
 */
export function getWeightHistory() {
  return getStorage(STORAGE_KEYS.WEIGHT, []);
}

/**
 * Retorna o peso mais recente registrado ou valor padrão.
 */
export function getLatestWeight() {
  const history = getWeightHistory();
  if (history && history.length > 0) {
    return history[0].weight;
  }
  const settings = getStorage(STORAGE_KEYS.SETTINGS, {});
  return settings.glp1?.currentWeight || 75;
}

