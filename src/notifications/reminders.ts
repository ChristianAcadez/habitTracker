import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getHabitsWithStatusForDate } from '../db/queries';
import { getRemindersConfig } from '../db/settings';
import { REMINDER_SLOTS, REMINDER_NOUNS, ReminderSlot } from '../constants/reminders';
import type { TimeOfDay } from '../constants/timeOfDay';
import { toDateString } from '../utils/date';

const CHANNEL_ID = 'reminders';
const ID_PREFIX = 'reminder-';
const DAYS_AHEAD = 7;

// ---------- Preparación ----------

async function ensureChannel() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Recordatorios de hábitos',
        importance: Notifications.AndroidImportance.HIGH,
    });
}

// Se llama una vez al iniciar la app (en el _layout raíz)
export function setupNotifications() {
    // qué hacer si el aviso llega con la app abierta: mostrarlo también
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
    ensureChannel().catch(() => { });
}

// ---------- Permisos ----------

export async function hasNotificationPermission(): Promise<boolean> {
    const permissions = await Notifications.getPermissionsAsync();
    return permissions.granted;
}

// En Android 13+ el aviso del sistema solo aparece si el canal ya existe
export async function requestNotificationPermission(): Promise<boolean> {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const result = await Notifications.requestPermissionsAsync();
    return result.granted;
}

export async function sendTestNotification() {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Recordatorio de prueba',
            body: 'Así se verán tus recordatorios de hábitos.',
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 5,
            channelId: CHANNEL_ID,
        },
    });
}

// ---------- Sincronización ----------

// Los hábitos sin horario se suman al aviso de la noche
function slotFor(timeOfDay: TimeOfDay): ReminderSlot {
    return timeOfDay === 'anytime' ? 'evening' : timeOfDay;
}

function buildBody(names: string[]): string {
    if (names.length === 1) return `Te falta: ${names[0]}`;
    const shown = names.slice(0, 3).join(', ');
    const extra = names.length - 3;
    const base = `Te faltan ${names.length}: ${shown}`;
    return extra > 0 ? `${base} y ${extra} más` : base;
}

async function doSync(db: SQLiteDatabase) {
    // 1. borra los avisos programados antes (solo los nuestros)
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
        scheduled
            .filter((n) => n.identifier.startsWith(ID_PREFIX))
            .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    // 2. si no hay avisos activos o falta el permiso, no hay nada que programar
    const config = await getRemindersConfig(db);
    const enabledSlots = REMINDER_SLOTS.filter((slot) => config[slot].enabled);
    if (enabledSlots.length === 0) return;
    if (!(await hasNotificationPermission())) return;

    await ensureChannel();

    // 3. programa los próximos días, solo donde haya algo pendiente
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (let offset = 0; offset < DAYS_AHEAD; offset++) {
        const day = new Date(base);
        day.setDate(base.getDate() + offset);
        const dateStr = toDateString(day);

        const habits = await getHabitsWithStatusForDate(db, dateStr);

        for (const slot of enabledSlots) {
            const { hour, minute } = config[slot];
            const triggerDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0);
            if (triggerDate.getTime() <= now.getTime()) continue; // esa hora ya pasó

            const pending = habits.filter((h) => slotFor(h.time_of_day) === slot && !h.completed);
            if (pending.length === 0) continue; // nada pendiente: no avisa

            await Notifications.scheduleNotificationAsync({
                identifier: `${ID_PREFIX}${dateStr}-${slot}`,
                content: {
                    title: `Hábitos de la ${REMINDER_NOUNS[slot]}`,
                    body: buildBody(pending.map((h) => h.name)),
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: triggerDate,
                    channelId: CHANNEL_ID,
                },
            });
        }
    }
}

// Si llegan varios cambios seguidos, se ejecuta una sola vez más al terminar
let running = false;
let rerun = false;

export async function syncReminders(db: SQLiteDatabase) {
    if (running) {
        rerun = true;
        return;
    }
    running = true;
    try {
        do {
            rerun = false;
            try {
                await doSync(db);
            } catch (error) {
                console.warn('No se pudieron programar los recordatorios', error);
            }
        } while (rerun);
    } finally {
        running = false;
    }
}