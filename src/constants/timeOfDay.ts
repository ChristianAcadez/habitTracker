import { Ionicons } from '@expo/vector-icons';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export const TIME_OF_DAY_ORDER: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'anytime'];

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
    morning: 'Mañana',
    afternoon: 'Tarde',
    evening: 'Noche',
    anytime: 'Sin horario',
};

export const TIME_OF_DAY_ICONS: Record<TimeOfDay, keyof typeof Ionicons.glyphMap> = {
    morning: 'sunny-outline',
    afternoon: 'partly-sunny-outline',
    evening: 'moon-outline',
    anytime: 'time-outline',
};