/**
 * FastFlow v2.0 — Módulo GLP-1 & Canetas Emagrecedoras Companion
 * Suporte completo a análogos de GLP-1/GIP (Ozempic, Wegovy, Mounjaro, Saxenda, etc.),
 * controle de doses, rotação de locais de injeção, hidratação e proteção muscular.
 */

import { generateUUID } from './utils.js';

export const GLP1_MEDICATIONS = {
  ozempic: {
    id: 'ozempic',
    name: 'Ozempic (Semaglutida)',
    substance: 'Semaglutida',
    type: 'Injetável Semanal',
    frequency: 'weekly',
    doses: ['0,25mg', '0,5mg', '1,0mg', '2,0mg'],
    defaultDose: '0,5mg',
    accentColor: '#00C6FF'
  },
  wegovy: {
    id: 'wegovy',
    name: 'Wegovy (Semaglutida)',
    substance: 'Semaglutida',
    type: 'Injetável Semanal',
    frequency: 'weekly',
    doses: ['0,25mg', '0,5mg', '1,0mg', '1,7mg', '2,4mg'],
    defaultDose: '0,5mg',
    accentColor: '#0072FF'
  },
  mounjaro: {
    id: 'mounjaro',
    name: 'Mounjaro (Tirzepatida)',
    substance: 'Tirzepatida',
    type: 'Injetável Semanal (GLP-1 + GIP)',
    frequency: 'weekly',
    doses: ['2,5mg', '5,0mg', '7,5mg', '10,0mg', '12,5mg', '15,0mg'],
    defaultDose: '2,5mg',
    accentColor: '#8A2BE2'
  },
  zepbound: {
    id: 'zepbound',
    name: 'Zepbound (Tirzepatida)',
    substance: 'Tirzepatida',
    type: 'Injetável Semanal (GLP-1 + GIP)',
    frequency: 'weekly',
    doses: ['2,5mg', '5,0mg', '7,5mg', '10,0mg', '12,5mg', '15,0mg'],
    defaultDose: '2,5mg',
    accentColor: '#9333EA'
  },
  saxenda: {
    id: 'saxenda',
    name: 'Saxenda (Liraglutida)',
    substance: 'Liraglutida',
    type: 'Injetável Diário',
    frequency: 'daily',
    doses: ['0,6mg', '1,2mg', '1,8mg', '2,4mg', '3,0mg'],
    defaultDose: '1,2mg',
    accentColor: '#00B4D8'
  },
  rybelsus: {
    id: 'rybelsus',
    name: 'Rybelsus (Semaglutida Oral)',
    substance: 'Semaglutida Oral',
    type: 'Comprimido Diário',
    frequency: 'daily',
    doses: ['3mg', '7mg', '14mg'],
    defaultDose: '7mg',
    accentColor: '#38BDF8'
  },
  custom: {
    id: 'custom',
    name: 'Outra Medicação',
    substance: 'Personalizado',
    type: 'Injetável / Oral',
    frequency: 'weekly',
    doses: ['Dose Inicial', 'Dose Intermediária', 'Dose Máxima'],
    defaultDose: 'Dose Inicial',
    accentColor: '#00C6FF'
  }
};

export const INJECTION_SITES = [
  { id: 'abdomen_right', name: 'Abdômen Direito', icon: '🎯' },
  { id: 'abdomen_left', name: 'Abdômen Esquerdo', icon: '🎯' },
  { id: 'thigh_right', name: 'Coxa Direita', icon: '🦵' },
  { id: 'thigh_left', name: 'Coxa Esquerda', icon: '🦵' },
  { id: 'arm_right', name: 'Braço Direito', icon: '💪' },
  { id: 'arm_left', name: 'Braço Esquerdo', icon: '💪' }
];

export const SYMPTOMS_LIST = [
  'Sem Sintomas',
  'Náusea Leve',
  'Náusea Moderada',
  'Azia / Refluxo',
  'Saciedade Intensa',
  'Constipação',
  'Dor de Cabeça',
  'Fadiga',
  'Tontura Leve'
];

export const DAYS_OF_WEEK = [
  { id: 'domingo', name: 'Domingo', dayIndex: 0 },
  { id: 'segunda', name: 'Segunda-feira', dayIndex: 1 },
  { id: 'terca', name: 'Terça-feira', dayIndex: 2 },
  { id: 'quarta', name: 'Quarta-feira', dayIndex: 3 },
  { id: 'quinta', name: 'Quinta-feira', dayIndex: 4 },
  { id: 'sexta', name: 'Sexta-feira', dayIndex: 5 },
  { id: 'sabado', name: 'Sábado', dayIndex: 6 }
];

/**
 * Retorna as informações de um medicamento GLP-1 cadastrado.
 */
export function getMedicationInfo(medId = 'ozempic') {
  return GLP1_MEDICATIONS[medId] || GLP1_MEDICATIONS.ozempic;
}

/**
 * Sugere o próximo local de aplicação para garantir a rotação contínua e prevenir lipodistrofia.
 * @param {Array} injectionsHistory
 * @returns {Object}
 */
export function getNextSuggestedSite(injectionsHistory = []) {
  if (!injectionsHistory || injectionsHistory.length === 0) {
    return INJECTION_SITES[0]; // Abdômen Direito por padrão
  }

  const lastInjection = injectionsHistory[0];
  const lastSiteId = lastInjection.siteId || lastInjection.site;

  const currentIndex = INJECTION_SITES.findIndex((s) => s.id === lastSiteId);
  const nextIndex = (currentIndex + 1) % INJECTION_SITES.length;

  return INJECTION_SITES[nextIndex];
}

/**
 * Calcula quantos dias faltam para a próxima aplicação semanal.
 * @param {string} configuredDayId - ID do dia da semana (ex: 'quinta')
 * @param {Array} injectionsHistory
 * @returns {{ daysRemaining: number, isToday: boolean, nextDate: Date }}
 */
export function getDaysUntilNextInjection(configuredDayId = 'quinta', injectionsHistory = []) {
  const dayObj = DAYS_OF_WEEK.find((d) => d.id === configuredDayId) || DAYS_OF_WEEK[4]; // Quinta por padrão
  const targetDayIndex = dayObj.dayIndex;

  const now = new Date();
  const currentDayIndex = now.getDay();

  // Verifica se já aplicou hoje
  const appliedToday = injectionsHistory.some((inj) => {
    const injDate = new Date(inj.date);
    return (
      injDate.getFullYear() === now.getFullYear() &&
      injDate.getMonth() === now.getMonth() &&
      injDate.getDate() === now.getDate()
    );
  });

  let daysRemaining = (targetDayIndex - currentDayIndex + 7) % 7;

  if (daysRemaining === 0 && appliedToday) {
    daysRemaining = 7; // Já aplicou hoje, próximo ciclo é daqui a 7 dias
  }

  const isToday = daysRemaining === 0 && !appliedToday;

  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysRemaining);

  return {
    daysRemaining,
    isToday,
    nextDate,
    dayName: dayObj.name
  };
}

/**
 * Retorna o cálculo da hidratação diária (copos de 250ml e porcentagem da meta).
 * @param {number} cupsCount
 * @param {number} targetMl
 * @returns {{ cups: number, currentMl: number, targetMl: number, targetCups: number, percentage: number }}
 */
export function calculateHydration(cupsCount = 0, targetMl = 2500) {
  const mlPerCup = 250;
  const targetCups = Math.ceil(targetMl / mlPerCup);
  const currentMl = cupsCount * mlPerCup;
  const percentage = Math.min(100, Math.round((currentMl / targetMl) * 100));

  return {
    cups: cupsCount,
    currentMl,
    targetMl,
    targetCups,
    percentage
  };
}

/**
 * Retorna recomendação clínica de proteína (g/dia) para evitar perda de massa magra.
 * Diretriz para pacientes em GLP-1: 1,2g a 1,6g de proteína por kg de peso corporal.
 * @param {number} weightKg
 * @returns {{ minGrams: number, maxGrams: number, tip: string }}
 */
export function getProteinRecommendation(weightKg = 75) {
  const safeWeight = Math.max(40, Number(weightKg) || 75);
  const minGrams = Math.round(safeWeight * 1.2);
  const maxGrams = Math.round(safeWeight * 1.6);

  return {
    minGrams,
    maxGrams,
    tip: `Com base no seu peso (${safeWeight}kg), busque consumir entre ${minGrams}g e ${maxGrams}g de proteína durante sua janela alimentar para preservar músculos.`
  };
}

/**
 * Verifica se a data atual é o dia programado para injeção.
 * @param {string} injectionDayId
 * @returns {boolean}
 */
export function isTodayInjectionDay(injectionDayId = 'quinta') {
  const dayIndexMap = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
  const targetIndex = dayIndexMap[injectionDayId] ?? 4;
  return new Date().getDay() === targetIndex;
}

