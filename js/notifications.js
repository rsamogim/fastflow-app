/**
 * FastFlow v2.0 — Módulo de Notificações Web (Web Notifications API)
 * Avisos de meta atingida, contagem regressiva de 30 minutos, lembretes diários
 * e lembretes específicos de aplicação de caneta GLP-1 e hidratação.
 */

import { getState } from './state.js';
import { getMedicationInfo } from './glp1.js';

let dailyReminderTimer = null;
let glp1ReminderTimer = null;

/**
 * Verifica se a API de Notificações está disponível no navegador.
 */
export function isNotificationSupported() {
  return 'Notification' in window;
}

/**
 * Verifica se o usuário já concedeu permissão.
 */
export function hasNotificationPermission() {
  return isNotificationSupported() && Notification.permission === 'granted';
}

/**
 * Solicita permissão para exibir notificações ao usuário.
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.warn('[FastFlow Notifications] Erro ao solicitar permissão:', error);
    return false;
  }
}

/**
 * Dispara uma notificação para o usuário (via Service Worker ou construtor Notification).
 */
export async function sendNotification(title, options = {}) {
  const { settings } = getState();

  if (!settings.notifications || !settings.notifications.enabled) {
    return;
  }

  if (!hasNotificationPermission()) {
    return;
  }

  const defaultOptions = {
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'fastflow-alert',
    renotify: true,
    ...options
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, defaultOptions);
        return;
      }
    }

    new Notification(title, defaultOptions);
  } catch (err) {
    console.warn('[FastFlow Notifications] Falha ao despachar notificação nativa:', err);
  }
}

/**
 * Dispara aviso de meta atingida.
 */
export function notifyTargetReached(fastHours = 16) {
  const { settings } = getState();
  if (!settings.notifications?.onTarget) return;

  sendNotification('Meta de Jejum Atingida! 🎉', {
    body: `Parabéns! Você completou sua meta de ${fastHours} horas com sucesso.`,
    tag: 'fast-target-reached'
  });
}

/**
 * Dispara aviso preventivo de 30 minutos restantes.
 */
export function notifyBeforeTarget(fastHours = 16) {
  const { settings } = getState();
  if (!settings.notifications?.before30m) return;

  sendNotification('Quase lá! Faltam 30 minutos ⏱️', {
    body: `Você está a apenas 30 minutos de completar sua meta de ${fastHours} horas.`,
    tag: 'fast-before-target'
  });
}

/**
 * Notificação específica do dia de aplicação da caneta GLP-1.
 */
export function notifyGLP1Injection(medName = 'Ozempic', dose = '0,5mg') {
  sendNotification(`Dia de Aplicação 💉 (${medName})`, {
    body: `Hoje é o dia programado para sua dose de ${dose}. Lembre-se de alternar o local de aplicação!`,
    tag: 'glp1-injection-reminder'
  });
}

/**
 * Notificação periódica de hidratação (combate à perda de sede por GLP-1).
 */
export function notifyHydrationAlert() {
  sendNotification('Hora de Hidratar 💧', {
    body: 'O GLP-1 reduz a sensação de sede. Beba um copo de água para proteger seus rins e acelerar seu metabolismo!',
    tag: 'glp1-hydration-reminder'
  });
}

/**
 * Agenda o lembrete diário para iniciar o jejum.
 */
export function scheduleDailyReminder() {
  if (dailyReminderTimer) {
    clearTimeout(dailyReminderTimer);
    dailyReminderTimer = null;
  }

  const { settings } = getState();
  if (!settings.notifications?.enabled || !settings.notifications?.dailyReminder) {
    return;
  }

  const reminderTime = settings.notifications.dailyReminderTime || '20:00';
  const [targetHour, targetMinute] = reminderTime.split(':').map(Number);

  const now = new Date();
  const scheduledTime = new Date(now);
  scheduledTime.setHours(targetHour, targetMinute, 0, 0);

  if (scheduledTime.getTime() <= now.getTime()) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const delayMs = scheduledTime.getTime() - now.getTime();

  dailyReminderTimer = setTimeout(() => {
    const { activeFast } = getState();
    if (!activeFast) {
      sendNotification('Hora de Iniciar seu Jejum 🌙', {
        body: 'Seu horário habitual de jejum começou. Abra o FastFlow para dar o play!',
        tag: 'daily-reminder'
      });
    }
    scheduleDailyReminder();
  }, delayMs);
}

/**
 * Agenda lembrete semanal de aplicação GLP-1.
 */
export function scheduleGLP1Reminder() {
  if (glp1ReminderTimer) {
    clearTimeout(glp1ReminderTimer);
    glp1ReminderTimer = null;
  }

  const { settings } = getState();
  if (!settings.notifications?.enabled || !settings.glp1?.enabled || !settings.glp1?.notifyInjection) {
    return;
  }

  const medInfo = getMedicationInfo(settings.glp1.medication);
  const injTime = settings.glp1.injectionTime || '08:00';
  const [h, m] = injTime.split(':').map(Number);

  const now = new Date();
  const nextCheck = new Date(now);
  nextCheck.setHours(h, m, 0, 0);

  // Se o horário de hoje já passou, agenda para amanhã
  if (nextCheck.getTime() <= now.getTime()) {
    nextCheck.setDate(nextCheck.getDate() + 1);
  }

  const delayMs = nextCheck.getTime() - now.getTime();

  glp1ReminderTimer = setTimeout(() => {
    const current = getState();
    if (current.settings.glp1?.enabled) {
      const todayDayId = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][new Date().getDay()];
      if (current.settings.glp1.injectionDay === todayDayId || medInfo.frequency === 'daily') {
        notifyGLP1Injection(medInfo.name, current.settings.glp1.currentDose);
      }
    }
    scheduleGLP1Reminder();
  }, delayMs);
}

/**
 * Dispara uma notificação imediata de teste para conferência do usuário.
 */
export function testNotification() {
  const { settings } = getState();
  const extra = settings.glp1?.enabled ? ' (com suporte ativo a Canetas GLP-1)' : '';
  sendNotification('Teste do FastFlow 🔔', {
    body: `Suas notificações estão ativas e funcionando perfeitamente!${extra}`,
    tag: 'fastflow-test'
  });
}
