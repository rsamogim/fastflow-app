/**
 * FastFlow — Módulo de Utilitários e Helpers
 * Formatações de tempo, datas em PT-BR, IDs únicos e estágios metabólicos.
 */

/**
 * Formata milissegundos no padrão HH:MM:SS com padding e suporte a durações > 24h.
 * @param {number} ms - Duração em milissegundos
 * @returns {string} Ex: "16:04:29"
 */
export function formatHMS(ms) {
  if (!ms || ms < 0) return '00:00:00';
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formata milissegundos para texto amigável em PT-BR.
 * @param {number} ms - Duração em milissegundos
 * @param {boolean} includeSeconds - Se deve incluir segundos
 * @returns {string} Ex: "16h 30min" ou "45min"
 */
export function formatDuration(ms, includeSeconds = false) {
  if (!ms || ms < 0) return '0min';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours === 0 && minutes === 0 && includeSeconds) {
    return `${seconds}s`;
  }

  if (hours === 0) {
    return includeSeconds ? `${minutes}min ${seconds}s` : `${minutes}min`;
  }

  if (minutes === 0 && !includeSeconds) {
    return `${hours}h`;
  }

  if (includeSeconds) {
    return `${hours}h ${minutes}min ${seconds}s`;
  }

  return `${hours}h ${minutes}min`;
}

/**
 * Retorna hora e minuto no formato "HH:MM" (PT-BR).
 * @param {number|Date} timestamp
 * @returns {string} Ex: "14:30"
 */
export function formatTime(timestamp) {
  if (!timestamp) return '--:--';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formata data de forma resumida (Ex: "18 de set." ou "Hoje").
 * @param {number|Date} timestamp
 * @returns {string}
 */
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  }).replace('.', '');
}

/**
 * Formata data e hora completas para visualização em detalhes.
 * @param {number|Date} timestamp
 * @returns {string} Ex: "18 de setembro às 20:30"
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const dateStr = date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long'
  });
  const timeStr = formatTime(date);
  return `${dateStr} às ${timeStr}`;
}

/**
 * Verifica se duas datas correspondem ao mesmo dia civil.
 */
export function isSameDay(d1, d2) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Verifica se a data é hoje.
 */
export function isToday(timestamp) {
  return isSameDay(new Date(timestamp), new Date());
}

/**
 * Verifica se a data foi ontem.
 */
export function isYesterday(timestamp) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(new Date(timestamp), yesterday);
}

/**
 * Verifica se a data pertence à semana atual (últimos 7 dias ou semana civil).
 */
export function isThisWeek(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return date >= startOfWeek && date <= endOfWeek;
}

/**
 * Verifica se a data pertence ao mês e ano atuais.
 */
export function isThisMonth(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

/**
 * Retorna saudação dinâmica baseada no horário do aparelho.
 * @returns {string} "Bom dia", "Boa tarde" ou "Boa noite"
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Gera um ID único com UUID ou fallback robusto.
 * @returns {string}
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'fast-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Limita um número entre min e max.
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Força o download de um objeto como arquivo JSON no navegador.
 */
export function downloadJSON(data, filename = 'fastflow-backup.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Lê um arquivo File selecionado pelo usuário e faz parse para JSON.
 */
export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Arquivo JSON inválido ou corrompido.'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
    reader.readAsText(file);
  });
}

/**
 * Retorna o estágio fisiológico/metabólico do jejum de acordo com as horas decorridas.
 * @param {number} elapsedHours - Horas decorridas de jejum
 * @returns {{ name: string, desc: string }}
 */
export function getFastingStage(elapsedHours) {
  if (elapsedHours < 4) {
    return {
      name: 'Fase Digestiva (Glicemia)',
      desc: 'O corpo está digerindo a última refeição e consumindo a glicose no sangue para gerar energia.'
    };
  }
  if (elapsedHours < 8) {
    return {
      name: 'Queda de Insulina',
      desc: 'Os níveis de insulina caem. Seu corpo passa a queimar o glicogênio armazenado no fígado.'
    };
  }
  if (elapsedHours < 12) {
    return {
      name: 'Gliconeogênese Ativa',
      desc: 'O glicogênio hepático esgota-se. O corpo inicia a queima acelerada de gordura para combustível.'
    };
  }
  if (elapsedHours < 16) {
    return {
      name: 'Cetose Inicial & Foco Mental',
      desc: 'Queima intensa de gordura com produção de corpos cetônicos. Clareza mental e disposição aumentam.'
    };
  }
  if (elapsedHours < 24) {
    return {
      name: 'Autofagia & Renovação',
      desc: 'Início da reciclagem celular profunda (autofagia). Limpeza de proteínas danificadas e rejuvenescimento.'
    };
  }
  return {
    name: 'Autofagia Profunda & HGH',
    desc: 'Pico de autofagia e estímulo ao hormônio do crescimento. Máxima sensibilidade à insulina. Lembre-se de beber água!'
  };
}
