/**
 * FastFlow v3.0 — Módulo de Notificações Unificado (Nativo Android via Capacitor & Web Notifications)
 * Suporte a notificações locais em segundo plano (mesmo com celular bloqueado ou app fechado),
 * avisos de meta atingida, contagem regressiva de 30 minutos, lembretes diários
 * e lembretes específicos de aplicação de caneta GLP-1 e hidratação.
 */

import { getState } from './state.js';
import { getMedicationInfo } from './glp1.js';

let dailyReminderTimer = null;
let glp1ReminderTimer = null;

const NOTIF_ID_30M = 1001;
const NOTIF_ID_TARGET = 1002;
const NOTIF_ID_DAILY = 2001;
const NOTIF_ID_GLP1 = 3001;

/**
 * Obtém o plugin de notificações nativas do Capacitor (quando rodando como APK Android).
 */
function getNativeNotifications() {
  if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.LocalNotifications) {
    return window.Capacitor.Plugins.LocalNotifications;
  }
  return null;
}

/**
 * Garante que o canal de notificação no Android exista com som e vibração.
 */
async function ensureNotificationChannel() {
  const native = getNativeNotifications();
  if (!native) return;
  try {
    await native.createChannel({
      id: 'fastflow_alerts',
      name: 'Alertas do FastFlow',
      description: 'Lembretes de jejum, metas e hidratação',
      importance: 5,
      visibility: 1,
      vibration: true
    });
  } catch (e) {
    // Canal já existente ou não suportado
  }
}

/**
 * Verifica se a API de Notificações está disponível (seja nativa do Android ou do Navegador).
 */
export function isNotificationSupported() {
  if (getNativeNotifications()) return true;
  return 'Notification' in window;
}

/**
 * Verifica se o usuário já concedeu permissão de notificações.
 */
export async function hasNotificationPermission() {
  const native = getNativeNotifications();
  if (native) {
    try {
      const check = await native.checkPermissions();
      return check.display === 'granted';
    } catch (e) {
      console.warn('[FastFlow Native Notifications] Erro ao checar permissão:', e);
      return false;
    }
  }
  return isNotificationSupported() && Notification.permission === 'granted';
}

/**
 * Solicita permissão para exibir notificações ao usuário.
 */
export async function requestNotificationPermission() {
  const native = getNativeNotifications();
  if (native) {
    try {
      await ensureNotificationChannel();
      const res = await native.requestPermissions();
      return res.display === 'granted';
    } catch (error) {
      console.warn('[FastFlow Native Notifications] Erro ao solicitar permissão:', error);
      return false;
    }
  }

  if (!isNotificationSupported()) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.warn('[FastFlow Notifications] Erro ao solicitar permissão web:', error);
    return false;
  }
}

/**
 * Dispara uma notificação imediata (Nativa no APK ou Web no Navegador).
 */
export async function sendNotification(title, options = {}) {
  const { settings } = getState();

  if (!settings.notifications || !settings.notifications.enabled) {
    return;
  }

  const native = getNativeNotifications();
  if (native) {
    try {
      await ensureNotificationChannel();
      await native.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 800000) + 100000,
            title,
            body: options.body || '',
            channelId: 'fastflow_alerts',
            schedule: { at: new Date(Date.now() + 200), allowWhileIdle: true }
          }
        ]
      });
      return;
    } catch (err) {
      console.warn('[FastFlow Native Notifications] Falha ao despachar notificação nativa:', err);
    }
  }

  // Fallback para Web Notifications (PWA no browser)
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
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
    console.warn('[FastFlow Notifications] Falha ao despachar notificação web:', err);
  }
}

/**
 * Agenda notificações nativas para o ciclo de jejum no Android (30 min antes e na meta exata).
 * Toca mesmo se o app estiver fechado ou tela bloqueada.
 */
export async function scheduleFastingNativeNotifications(fast) {
  const native = getNativeNotifications();
  if (!native || !fast || !fast.targetEndTime) return;

  const { settings } = getState();
  if (!settings.notifications?.enabled) return;

  try {
    await ensureNotificationChannel();
    await cancelFastingNativeNotifications();

    const notifications = [];
    const now = Date.now();
    const thirtyMinMs = 30 * 60 * 1000;

    // 1. Notificação de 30 minutos antes
    if (settings.notifications.before30m && (fast.targetEndTime - thirtyMinMs > now)) {
      notifications.push({
        id: NOTIF_ID_30M,
        title: 'Faltam 30 minutos! ⏳',
        body: `Você está quase lá! Seu jejum de ${fast.fastHours}h termina em 30 minutos.`,
        channelId: 'fastflow_alerts',
        schedule: {
          at: new Date(fast.targetEndTime - thirtyMinMs),
          allowWhileIdle: true
        }
      });
    }

    // 2. Notificação ao atingir a meta
    if (settings.notifications.onTarget && (fast.targetEndTime > now)) {
      notifications.push({
        id: NOTIF_ID_TARGET,
        title: 'Meta de Jejum Atingida! 🎉',
        body: `Parabéns! Você completou sua meta de ${fast.fastHours} horas com sucesso.`,
        channelId: 'fastflow_alerts',
        schedule: {
          at: new Date(fast.targetEndTime),
          allowWhileIdle: true
        }
      });
    }

    if (notifications.length > 0) {
      await native.schedule({ notifications });
      console.log('[FastFlow Native Notifications] Notificações do timer agendadas no Android.');
    }
  } catch (err) {
    console.warn('[FastFlow Native Notifications] Erro ao agendar notificações do timer:', err);
  }
}

/**
 * Cancela as notificações agendadas do timer ativo (ao encerrar ou cancelar jejum).
 */
export async function cancelFastingNativeNotifications() {
  const native = getNativeNotifications();
  if (!native) return;
  try {
    await native.cancel({
      notifications: [{ id: NOTIF_ID_30M }, { id: NOTIF_ID_TARGET }]
    });
  } catch (err) {
    console.warn('[FastFlow Native Notifications] Erro ao cancelar notificações do timer:', err);
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
export async function scheduleDailyReminder() {
  if (dailyReminderTimer) {
    clearTimeout(dailyReminderTimer);
    dailyReminderTimer = null;
  }

  const { settings } = getState();
  const native = getNativeNotifications();

  // Se estiver rodando nativamente no Android APK
  if (native) {
    try {
      await native.cancel({ notifications: [{ id: NOTIF_ID_DAILY }] });
      if (settings.notifications?.enabled && settings.notifications?.dailyReminder) {
        const reminderTime = settings.notifications.dailyReminderTime || '20:00';
        const [hour, minute] = reminderTime.split(':').map(Number);
        await ensureNotificationChannel();
        await native.schedule({
          notifications: [
            {
              id: NOTIF_ID_DAILY,
              title: 'Hora de Iniciar seu Jejum 🌙',
              body: 'Seu horário habitual de jejum começou. Abra o FastFlow para dar o play!',
              channelId: 'fastflow_alerts',
              schedule: {
                on: { hour, minute },
                repeats: true,
                every: 'day',
                allowWhileIdle: true
              }
            }
          ]
        });
      }
    } catch (e) {
      console.warn('[FastFlow Native Notifications] Erro ao agendar lembrete diário nativo:', e);
    }
    return;
  }

  // Fallback web (setTimeout para navegador)
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
export async function scheduleGLP1Reminder() {
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
