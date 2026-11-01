import type { TimeOfDay } from './timeOfDay';

export type ReminderSlot = Exclude<TimeOfDay, 'anytime'>;

export interface ReminderSetting {
    enabled: boolean;
    hour: number;
    minute: number;
}

export type RemindersConfig = Record<ReminderSlot, ReminderSetting>;

export const REMINDER_SLOTS: ReminderSlot[] = ['morning', 'afternoon', 'evening'];

export const REMINDER_LABELS: Record<ReminderSlot, string> = {
    morning: 'Mañana',
    afternoon: 'Tarde',
    evening: 'Noche',
};

// para el título: "Hábitos de la mañana"
export const REMINDER_NOUNS: Record<ReminderSlot, string> = {
    morning: 'mañana',
    afternoon: 'tarde',
    evening: 'noche',
};

// apagados por defecto: el permiso solo se pide cuando tú activas uno
export const DEFAULT_REMINDERS: RemindersConfig = {
    morning: { enabled: false, hour: 8, minute: 0 },
    afternoon: { enabled: false, hour: 14, minute: 0 },
    evening: { enabled: false, hour: 21, minute: 0 },
};