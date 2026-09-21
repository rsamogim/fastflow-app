/**
 * FastFlow v3.0 — Sistema de Licenciamento & Modo PRO (Monetização)
 * Suporte a verificação de chaves de ativação, ativação via URL (?license=FAST-...)
 * e controle de permissões de recursos exclusivos (Relatório Médico, Estoque, etc.).
 */

import { getState, setState } from './state.js';
import { getStorageItem, setStorageItem } from './storage.js';

const LICENSE_STORAGE_KEY = 'fastflow:license';

/**
 * Chaves Mestras Válidas para demonstração e testes rápidos.
 */
const MASTER_VALID_KEYS = [
  'FAST-VIP-DEMO-2026',
  'FAST-PRO-LIFETIME',
  'FAST-MED-CLINICAL',
  'FAST-VIP-TEST'
];

/**
 * Verifica se uma chave possui checksum/formato válido.
 * Formato suportado: FAST-(PRO|VIP)-XXXX-YYYY (onde soma dos caracteres obedece a regra de integridade)
 * ou chaves mestras oficiais.
 * @param {string} key
 * @returns {boolean}
 */
export function validateLicenseKeyFormat(key) {
  if (!key || typeof key !== 'string') return false;
  const cleanKey = key.trim().toUpperCase();

  if (MASTER_VALID_KEYS.includes(cleanKey)) {
    return true;
  }

  // Regex para chaves geradas: FAST-(VIP|PRO)-[A-Z0-9]{4}-[A-Z0-9]{4}
  const keyRegex = /^FAST-(VIP|PRO)-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!keyRegex.test(cleanKey)) {
    return false;
  }

  // Verificação simples de paridade/integridade dos caracteres
  let charSum = 0;
  for (let i = 0; i < cleanKey.length; i++) {
    charSum += cleanKey.charCodeAt(i);
  }
  // Chaves válidas geradas pelo nosso gerador têm resto par
  return charSum % 2 === 0;
}

/**
 * Gera uma chave de licença válida (útil para o desenvolvedor cadastrar na Kiwify/Hotmart).
 * @param {'VIP'|'PRO'} type
 * @returns {string}
 */
export function generateValidLicenseKey(type = 'VIP') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  let candidate = `FAST-${type}-${p1}-${p2}`;
  while (!validateLicenseKeyFormat(candidate)) {
    p2 = '';
    for (let i = 0; i < 4; i++) {
      p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    candidate = `FAST-${type}-${p1}-${p2}`;
  }

  return candidate;
}

/**
 * Carrega a licença armazenada no dispositivo.
 * @returns {{ isPro: boolean, key: string|null, activatedAt: number|null, planType: string|null }}
 */
export function loadLicense() {
  const saved = getStorageItem(LICENSE_STORAGE_KEY, null);
  if (saved && saved.isPro && validateLicenseKeyFormat(saved.key)) {
    return saved;
  }
  return {
    isPro: false,
    key: null,
    activatedAt: null,
    planType: null
  };
}

/**
 * Retorna se o usuário atual possui plano PRO ativo.
 * @returns {boolean}
 */
export function isProActive() {
  const license = getState().license || loadLicense();
  return Boolean(license.isPro);
}

/**
 * Ativa o modo PRO com uma chave de licença.
 * @param {string} key
 * @param {'lifetime'|'monthly'} [planType='lifetime']
 * @returns {{ success: boolean, message: string }}
 */
export function activateLicense(key, planType = 'lifetime') {
  if (!validateLicenseKeyFormat(key)) {
    return {
      success: false,
      message: 'Chave de ativação inválida ou não reconhecida. Verifique se digitou corretamente.'
    };
  }

  const cleanKey = key.trim().toUpperCase();
  const licenseData = {
    isPro: true,
    key: cleanKey,
    activatedAt: Date.now(),
    planType
  };

  setStorageItem(LICENSE_STORAGE_KEY, licenseData);
  setState({ license: licenseData, isPro: true });

  return {
    success: true,
    message: 'Parabéns! Sua assinatura FastFlow PRO foi ativada com sucesso. Todos os recursos foram liberados!'
  };
}

/**
 * Desativa o modo PRO (para testes ou cancelamento).
 */
export function deactivateLicense() {
  const emptyData = {
    isPro: false,
    key: null,
    activatedAt: null,
    planType: null
  };
  setStorageItem(LICENSE_STORAGE_KEY, emptyData);
  setState({ license: emptyData, isPro: false });
}

/**
 * Verifica se há parâmetro de ativação na URL ao abrir o app (ex: ?license=FAST-VIP-...).
 * Permite que a página de obrigado da plataforma de checkout ative automaticamente o app!
 * @returns {boolean}
 */
export function checkUrlLicenseActivation() {
  const params = new URLSearchParams(window.location.search);
  const queryKey = params.get('license') || params.get('key') || params.get('pro');

  if (queryKey && validateLicenseKeyFormat(queryKey)) {
    activateLicense(queryKey, 'lifetime');
    // Limpa a URL sem recarregar para ficar estético
    const newUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
    return true;
  }
  return false;
}
