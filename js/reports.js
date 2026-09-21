/**
 * FastFlow v3.0 — Módulo de Relatório Clínico para Médicos & Nutricionistas (PRO)
 * Gera prontuário estético e laudo metabólico com histórico de jejum, titulação GLP-1,
 * evolução de peso, sintomas e hidratação. Otimizado para visualização e impressão A4/PDF.
 */

import { getState } from './state.js';
import { getAllStats } from './stats.js';
import { getFilteredHistory } from './history.js';
import { getLatestWeight, getWeightHistory } from './storage.js';
import { formatDateTime, formatDate, formatDuration } from './utils.js';
import { getMedicationInfo, getProteinRecommendation } from './glp1.js';

/**
 * Compila os dados consolidados para o relatório clínico.
 * @returns {object}
 */
export function compileClinicalReportData() {
  const state = getState();
  const stats = getAllStats();
  const fasts = getFilteredHistory('all');
  const injections = state.glp1Injections || [];
  const weights = getWeightHistory();
  const latestWeight = getLatestWeight();
  const initialWeight = weights.length > 0 ? weights[0].weight : latestWeight;
  const weightDelta = (latestWeight - initialWeight).toFixed(1);
  const medInfo = getMedicationInfo(state.settings?.glp1?.medication);
  const protein = getProteinRecommendation(latestWeight);

  // Calcula sintomas mais frequentes
  const symptomCounts = {};
  injections.forEach((inj) => {
    (inj.symptoms || []).forEach((s) => {
      symptomCounts[s] = (symptomCounts[s] || 0) + 1;
    });
  });

  return {
    generatedAt: new Date(),
    patientName: state.settings?.profileName || 'Paciente',
    isGLP1: Boolean(state.settings?.glp1?.enabled),
    medication: medInfo,
    currentDose: state.settings?.glp1?.currentDose || 'N/A',
    fastingStats: {
      streak: stats.streak,
      totalFasts: fasts.length,
      completionRate: stats.completionRate,
      avgDuration: stats.avgDuration30d > 0 ? formatDuration(stats.avgDuration30d) : '0h 00m',
      totalHoursMonth: stats.monthTotals.totalHours
    },
    weightStats: {
      initialWeight,
      latestWeight,
      weightDelta: Number(weightDelta),
      entriesCount: weights.length,
      proteinMin: protein.minGrams,
      proteinMax: protein.maxGrams
    },
    injectionsHistory: injections.slice(0, 15), // últimas 15 doses
    symptomCounts,
    waterTarget: state.settings?.glp1?.dailyWaterTarget || 2500
  };
}

/**
 * Retorna o HTML estruturado do laudo médico pronto para impressão em A4.
 * @param {object} data
 * @returns {string}
 */
export function generateMedicalReportHtml(data) {
  const dateFormatted = formatDateTime(data.generatedAt);
  const deltaColor = data.weightStats.weightDelta <= 0 ? '#10b981' : '#f59e0b';
  const deltaPrefix = data.weightStats.weightDelta > 0 ? '+' : '';

  const injectionsRows = data.injectionsHistory.length > 0
    ? data.injectionsHistory
        .map((inj) => {
          const symptomsText = (inj.symptoms && inj.symptoms.length > 0)
            ? inj.symptoms.join(', ')
            : 'Sem sintomas';
          return `
            <tr>
              <td>${formatDate(inj.date)}</td>
              <td><strong>${inj.medicationName || 'GLP-1'}</strong> (${inj.dose})</td>
              <td>${inj.siteName || 'Abdômen'}</td>
              <td>${symptomsText}</td>
              <td>${inj.notes || '—'}</td>
            </tr>
          `;
        })
        .join('')
    : `<tr><td colspan="5" style="text-align:center; color:#6b7280; padding:16px;">Nenhuma aplicação registrada no período.</td></tr>`;

  const topSymptoms = Object.entries(data.symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([symp, count]) => `<span class="report-badge">${symp}: ${count}x</span>`)
    .join(' ');

  return `
    <div class="medical-report-container" id="printable-clinical-report">
      <!-- Cabeçalho Clínico Oficial -->
      <div class="report-header">
        <div class="report-brand">
          <div class="report-logo">⚡ FastFlow</div>
          <div class="report-subtitle">Relatório Clínico de Jejum Intermitente & Acompanhamento GLP-1</div>
        </div>
        <div class="report-meta">
          <div><strong>Emissão:</strong> ${dateFormatted}</div>
          <div><strong>Paciente:</strong> ${data.patientName}</div>
          <div><strong>Documento:</strong> Laudo de Aderência Metabólica</div>
        </div>
      </div>

      <!-- Resumo de Métricas Principais (Cards) -->
      <div class="report-summary-grid">
        <div class="report-metric-card">
          <span class="report-metric-label">Peso Atual</span>
          <span class="report-metric-val">${data.weightStats.latestWeight} kg</span>
          <span class="report-metric-sub" style="color: ${deltaColor}">
            Variação: ${deltaPrefix}${data.weightStats.weightDelta} kg
          </span>
        </div>

        <div class="report-metric-card">
          <span class="report-metric-label">Medicação / Dose</span>
          <span class="report-metric-val" style="font-size:1.1rem;">${data.medication.name}</span>
          <span class="report-metric-sub">Dose Atual: <strong>${data.currentDose}</strong></span>
        </div>

        <div class="report-metric-card">
          <span class="report-metric-label">Aderência ao Jejum</span>
          <span class="report-metric-val">${data.fastingStats.completionRate}%</span>
          <span class="report-metric-sub">${data.fastingStats.totalFasts} jejuns concluídos</span>
        </div>

        <div class="report-metric-card">
          <span class="report-metric-label">Proteção Muscular</span>
          <span class="report-metric-val" style="font-size:1.1rem;">${data.weightStats.proteinMin}g - ${data.weightStats.proteinMax}g</span>
          <span class="report-metric-sub">Meta proteica / dia</span>
        </div>
      </div>

      <!-- Seção: Histórico e Tolerabilidade GLP-1 -->
      <div class="report-section">
        <h3 class="report-section-title">1. Acompanhamento de Doses & Locais de Injeção</h3>
        <p class="report-section-desc">
          Registro das aplicações subcutâneas com alternância anatômica de sítios para controle de lipodistrofia e relato de eventos adversos gastrointestinais.
        </p>

        <div class="report-table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Substância & Dose</th>
                <th>Sítio Anatômico</th>
                <th>Sintomas / Tolerabilidade</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${injectionsRows}
            </tbody>
          </table>
        </div>

        ${topSymptoms ? `<div class="report-symptoms-summary"><strong>Sintomas mais relatados:</strong> ${topSymptoms}</div>` : ''}
      </div>

      <!-- Seção: Consistência Metabólica & Hidratação -->
      <div class="report-section">
        <h3 class="report-section-title">2. Consistência do Jejum Intermitente & Hidratação</h3>
        <div class="report-meta-box">
          <div class="report-meta-item">
            <span>Sequência atual (Streak):</span>
            <strong>${data.fastingStats.streak} dias seguidos</strong>
          </div>
          <div class="report-meta-item">
            <span>Duração Média dos Jejuns:</span>
            <strong>${data.fastingStats.avgDuration}</strong>
          </div>
          <div class="report-meta-item">
            <span>Total de Horas em Jejum no Mês:</span>
            <strong>${data.fastingStats.totalHoursMonth} horas</strong>
          </div>
          <div class="report-meta-item">
            <span>Meta Diária de Hidratação:</span>
            <strong>${data.waterTarget} ml/dia</strong>
          </div>
        </div>
      </div>

      <!-- Parecer do Profissional de Saúde / Assinatura -->
      <div class="report-footer">
        <div class="report-notes-field">
          <div class="report-notes-title">Anotações e Conduta do Médico / Nutricionista:</div>
          <div class="report-notes-lines"></div>
        </div>

        <div class="report-signature-row">
          <div class="report-signature-box">
            <div class="report-sig-line"></div>
            <span>Assinatura / Carimbo do Médico ou Nutricionista</span>
          </div>
          <div class="report-disclaimer">
            Documento gerado eletronicamente pelo FastFlow v3.0 Clínico para fins de acompanhamento terapêutico.
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Abre a janela nativa de impressão do dispositivo (que permite Salvar como PDF).
 */
export function printClinicalReport() {
  window.print();
}
