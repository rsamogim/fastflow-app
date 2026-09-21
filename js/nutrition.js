/**
 * FastFlow v3.0 — Módulo de Nutrição, Quebra de Jejum Anti-Náusea & Proteção Muscular
 * Orientações clínicas para evitar refluxo e náuseas severas decorrentes do retardo no
 * esvaziamento gástrico, rastreador diário de proteínas e vitrine de suplementação.
 */

import { getStorageItem, setStorageItem } from './storage.js';
import { getState, setState } from './state.js';
import { getLatestWeight } from './storage.js';
import { getProteinRecommendation } from './glp1.js';

const PROTEIN_STORAGE_KEY = 'fastflow:protein_log';

/**
 * Protocolo Clínico de Quebra de Jejum para Usuários de GLP-1 em 2 Fases.
 */
export const FAST_BREAKING_PROTOCOL = {
  phase1: {
    title: 'Fase 1: Abertura Digestiva (Primeiros 30-45 minutos)',
    description: 'Com o retardo do esvaziamento gástrico, o estômago precisa de líquidos mornos ou pastosos com baixa osmolaridade para evitar espasmos e náuseas.',
    recommendations: [
      {
        title: 'Caldo de Ossos ou Legumes Morno (150-200ml)',
        benefit: 'Repõe eletrólitos (sódio/potássio) e estimula enzimas digestivas sem dilatar o estômago.'
      },
      {
        title: '2 Ovos Mexidos Macios com Pouca Gordura',
        benefit: 'Proteína de fácil digestão gástrica com cerca de 12g de proteína pura.'
      },
      {
        title: 'Iogurte Grego Proteico / Whey Protein Isolado',
        benefit: 'Rápida absorção de aminoácidos essenciais sem gordura pesada.'
      }
    ]
  },
  phase2: {
    title: 'Fase 2: Refeição Sólida & Aporte Proteico Principal',
    description: 'Realizada 45 a 60 minutos após a fase 1, focando na meta proteica para evitar o "Ozempic Face" e perda muscular.',
    recommendations: [
      {
        title: 'Filé de Peito de Frango Desfiado ou Peixe Branco Grelhado (120-150g)',
        benefit: 'Aporte de 30g a 35g de proteína magra.'
      },
      {
        title: 'Legumes Cozidos no Vapor (Abobrinha, Cenoura, Chuchu)',
        benefit: 'Fibras macias fáceis de digerir que previnem a constipação sem fermentar excessivamente.'
      },
      {
        title: 'Tofu Grelhado ou Omelete de Claras com Queijo Branco',
        benefit: 'Excelente opção leve de alta densidade proteica.'
      }
    ]
  },
  whatToAvoid: [
    'Frituras e carnes com gordura aparente (paralisam ainda mais o estômago causando vômito tardio)',
    'Grandes volumes de saladas cruas volumosas de uma só vez (fermentação e distensão abdominal)',
    'Bebidas gasosas e refrigerantes durante a refeição',
    'Doces concentrados em jejum (risco de hipoglicemia reativa e dumping leve)'
  ]
};

/**
 * Vitrine de Suplementos Curados para Pacientes em GLP-1 (Monetização por Afiliados).
 */
export const RECOMMENDED_SUPPLEMENTS = [
  {
    id: 'whey-iso',
    name: 'Whey Protein 100% Isolado',
    category: 'Proteção Muscular',
    badge: 'Essencial',
    reason: 'Ajuda a bater a meta proteica diária sem causar sensação de estômago empanturrado.',
    link: 'https://amzn.to/3example-whey',
    ctaText: 'Ver na Amazon / Loja'
  },
  {
    id: 'creatina',
    name: 'Creatina Monohidratada 100% Pura',
    category: 'Anti-Sarcopenia',
    badge: 'Massa Magra',
    reason: 'Preserva a força muscular e a densidade tecidual durante o déficit calórico prolongado.',
    link: 'https://amzn.to/3example-creatina',
    ctaText: 'Ver Ofertas'
  },
  {
    id: 'psyllium',
    name: 'Psyllium Puro & Fibras Prebióticas',
    category: 'Saúde Intestinal',
    badge: 'Anti-Constipação',
    reason: 'Regula o trânsito intestinal e combate o ressecamento comum das canetas sem causar gases.',
    link: 'https://amzn.to/3example-fibras',
    ctaText: 'Ver Opções'
  },
  {
    id: 'balanca',
    name: 'Balança de Bioimpedância Bluetooth',
    category: 'Monitoramento',
    badge: 'Aparelho',
    reason: 'Mede porcentagem de gordura vs massa muscular no celular para garantir perda de peso saudável.',
    link: 'https://amzn.to/3example-balanca',
    ctaText: 'Ver Modelos'
  }
];

/**
 * Retorna a chave de data no formato AAAA-MM-DD.
 */
function getTodayDateKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna o registro de proteínas diárias.
 * @returns {object}
 */
export function loadProteinLog() {
  return getStorageItem(PROTEIN_STORAGE_KEY, {});
}

/**
 * Retorna a quantidade de gramas consumidas hoje.
 * @returns {number}
 */
export function getTodayProteinGrams() {
  const log = getState().proteinLog || loadProteinLog();
  const today = getTodayDateKey();
  return Number(log[today]) || 0;
}

/**
 * Adiciona gramas de proteína ao registro de hoje.
 * @param {number} grams
 */
export function addProteinGrams(grams) {
  const log = loadProteinLog();
  const today = getTodayDateKey();
  const current = Number(log[today]) || 0;
  log[today] = Math.max(0, current + Number(grams));

  setStorageItem(PROTEIN_STORAGE_KEY, log);
  setState({ proteinLog: log, todayProtein: log[today] });
}

/**
 * Retorna o progresso atual em relação à meta calculada.
 * @returns {{
 *   currentGrams: number,
 *   targetMin: number,
 *   targetMax: number,
 *   percentage: number,
 *   remainingMin: number
 * }}
 */
export function getProteinProgress() {
  const currentGrams = getTodayProteinGrams();
  const weight = getLatestWeight();
  const rec = getProteinRecommendation(weight);

  const percentage = Math.min(100, Math.round((currentGrams / rec.minGrams) * 100));
  const remainingMin = Math.max(0, rec.minGrams - currentGrams);

  return {
    currentGrams,
    targetMin: rec.minGrams,
    targetMax: rec.maxGrams,
    percentage,
    remainingMin
  };
}
