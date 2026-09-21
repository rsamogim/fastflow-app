/**
 * FastFlow — Módulo de Protocolos de Jejum & Escala de Progressão
 * Definições clínicas dos protocolos populares e regras de progressão automática.
 */

export const PROTOCOLS = {
  '14:10': {
    id: '14:10',
    fastHours: 14,
    eatingHours: 10,
    name: 'Iniciante (14:10)',
    shortLabel: '14:10',
    description: 'Ideal para adaptação suave e transição ao jejum.'
  },
  '16:8': {
    id: '16:8',
    fastHours: 16,
    eatingHours: 8,
    name: 'Clássico LeanGains (16:8)',
    shortLabel: '16:8',
    description: 'O protocolo padrão ouro. Sustentável, eficaz e com benefícios comprovados.'
  },
  '17:7': {
    id: '17:7',
    fastHours: 17,
    eatingHours: 7,
    name: 'Intermediário (17:7)',
    shortLabel: '17:7',
    description: 'Ponte natural de evolução para quem já domina o 16:8.'
  },
  '18:6': {
    id: '18:6',
    fastHours: 18,
    eatingHours: 6,
    name: 'Avançado (18:6)',
    shortLabel: '18:6',
    description: 'Acelera a cetose e estimula processos iniciais de autofagia.'
  },
  '20:4': {
    id: '20:4',
    fastHours: 20,
    eatingHours: 4,
    name: 'Dieta do Guerreiro (20:4)',
    shortLabel: '20:4',
    description: 'Janela condensada de alimentação diária de apenas 4 horas.'
  },
  '22:2': {
    id: '22:2',
    fastHours: 22,
    eatingHours: 2,
    name: 'Foco Intenso (22:2)',
    shortLabel: '22:2',
    description: 'Jejum profundo de 22 horas com 2 horas de refeições.'
  },
  '23:1': {
    id: '23:1',
    fastHours: 23,
    eatingHours: 1,
    name: 'OMAD — Uma Refeição ao Dia (23:1)',
    shortLabel: 'OMAD',
    description: 'One Meal A Day. Apenas uma refeição nutritiva diária.'
  },
  'custom': {
    id: 'custom',
    fastHours: 16,
    eatingHours: 8,
    name: 'Personalizado',
    shortLabel: 'Personalizado',
    description: 'Defina suas próprias horas de jejum e janela alimentar.'
  }
};

/**
 * Escala sequencial para sugestão inteligente de progressão.
 */
export const PROGRESSION_SCALE = [
  '14:10',
  '16:8',
  '17:7',
  '18:6',
  '20:4',
  '22:2',
  '23:1'
];

/**
 * Retorna as informações de um protocolo pelo ID, calculando valores custom se aplicável.
 * @param {string} id
 * @param {number} customFastHours
 * @param {number} customEatingHours
 * @returns {Object}
 */
export function getProtocolById(id = '16:8', customFastHours = 16, customEatingHours = 8) {
  if (id === 'custom') {
    const fHours = Math.max(1, Number(customFastHours) || 16);
    const eHours = Math.max(1, Number(customEatingHours) || 8);
    return {
      id: 'custom',
      fastHours: fHours,
      eatingHours: eHours,
      name: `Personalizado (${fHours}:${eHours})`,
      shortLabel: `${fHours}:${eHours}`,
      description: `Configurado para ${fHours}h de jejum e ${eHours}h de alimentação.`
    };
  }

  return PROTOCOLS[id] || PROTOCOLS['16:8'];
}

/**
 * Retorna o próximo protocolo sugerido na escala evolutiva.
 * @param {string} currentId
 * @returns {Object|null}
 */
export function getNextProtocol(currentId) {
  const currentIndex = PROGRESSION_SCALE.indexOf(currentId);
  if (currentIndex === -1 || currentIndex >= PROGRESSION_SCALE.length - 1) {
    return null; // Já está no patamar mais alto ou usa protocolo custom
  }
  const nextId = PROGRESSION_SCALE[currentIndex + 1];
  return PROTOCOLS[nextId];
}
