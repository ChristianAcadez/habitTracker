import { useState, useEffect } from 'react';
import { View, Text, Switch, Pressable, ScrollView, Alert, Linking, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getRemindersConfig, saveRemindersConfig } from '../db/settings';
import { requestNotificationPermission, sendTestNotification } from '../notifications/reminders';
import {
    DEFAULT_REMINDERS,
    REMINDER_SLOTS,
    REMINDER_LABELS,
    ReminderSetting,
    ReminderSlot,
    RemindersConfig,
} from '../constants/reminders';
import { TIME_OF_DAY_ICONS } from '../constants/timeOfDay';
import { colors } from '../constants/colors';

function formatTime(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function timeToDate(hour: number, minute: number): Date {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date;
}

function showPermissionAlert() {
    Alert.alert(
        'Permiso necesario',
        'Para enviarte recordatorios, permite las notificaciones de esta app en los ajustes del teléfono.',
        [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
        ]
    );
}

export default function RemindersScreen() {
    const db = useSQLiteContext();
    const [config, setConfig] = useState<RemindersConfig>(DEFAULT_REMINDERS);
    const [pickerSlot, setPickerSlot] = useState<ReminderSlot | null>(null);

    useEffect(() => {
        getRemindersConfig(db).then(setConfig);
    }, [db]);

    async function updateSlot(slot: ReminderSlot, changes: Partial<ReminderSetting>) {
        const next = { ...config, [slot]: { ...config[slot], ...changes } };
        setConfig(next);
        await saveRemindersConfig(db, next);
    }

    async function handleToggle(slot: ReminderSlot, enabled: boolean) {
        if (enabled) {
            const granted = await requestNotificationPermission();
            if (!granted) {
                showPermissionAlert();
                return;
            }
        }
        await updateSlot(slot, { enabled });
    }

    async function handleTest() {
        const granted = await requestNotificationPermission();
        if (!granted) {
            showPermissionAlert();
            return;
        }
        await sendTestNotification();
        Alert.alert(
            'Prueba enviada',
            'Llegará en unos 5 segundos. Sal de la app para verla como una notificación normal.'
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.intro}>
                Te aviso solo si te falta algo en ese momento del día. Los hábitos sin horario se
                incluyen en el aviso de la noche.
            </Text>

            {REMINDER_SLOTS.map((slot) => {
                const setting = config[slot];
                return (
                    <View key={slot} style={styles.row}>
                        <Ionicons
                            name={TIME_OF_DAY_ICONS[slot]}
                            size={22}
                            color={setting.enabled ? colors.primary : colors.textSecondary}
                        />
                        <View style={styles.rowTexts}>
                            <Text style={styles.rowTitle}>{REMINDER_LABELS[slot]}</Text>
                            <Pressable
                                style={[styles.timeChip, !setting.enabled && styles.timeChipDisabled]}
                                onPress={() => setPickerSlot(slot)}
                                disabled={!setting.enabled}
                            >
                                <Text style={[styles.timeText, !setting.enabled && styles.timeTextDisabled]}>
                                    {formatTime(setting.hour, setting.minute)}
                                </Text>
                            </Pressable>
                        </View>
                        <Switch
                            value={setting.enabled}
                            onValueChange={(value) => handleToggle(slot, value)}
                            trackColor={{ false: colors.statusEmpty, true: colors.primaryMuted }}
                            thumbColor={setting.enabled ? colors.primary : colors.textSecondary}
                        />
                    </View>
                );
            })}

            <Pressable style={styles.testButton} onPress={handleTest}>
                <Ionicons name="paper-plane-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.testButtonText}>Enviar notificación de prueba</Text>
            </Pressable>

            {pickerSlot && (
                <DateTimePicker
                    value={timeToDate(config[pickerSlot].hour, config[pickerSlot].minute)}
                    mode="time"
                    is24Hour
                    onValueChange={(_, date) => {
                        const slot = pickerSlot;
                        setPickerSlot(null);
                        updateSlot(slot, { hour: date.getHours(), minute: date.getMinutes() });
                    }}
                    onDismiss={() => setPickerSlot(null)}
                />
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 12 },
    intro: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    rowTexts: { flex: 1, alignItems: 'flex-start', gap: 6 },
    rowTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    timeChip: {
        backgroundColor: colors.border,
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    timeChipDisabled: { opacity: 0.5 },
    timeText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    timeTextDisabled: { color: colors.textSecondary },

    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        marginTop: 8,
    },
    testButtonText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
});