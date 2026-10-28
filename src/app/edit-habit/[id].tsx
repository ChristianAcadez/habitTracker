// src/app/edit-habit/[id].tsx
import { useState, useEffect } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getHabitById, updateHabit } from '../../db/queries';
import { toDateString } from '../../utils/date';
import { colors } from '../../constants/colors';
import WeekdayPicker from '../../components/WeekdayPicker';
import { ALL_WEEKDAYS, parseWeekdays } from '../../utils/weekdays';
import TimeOfDayPicker from '../../components/TimeOfDayPicker';
import { TimeOfDay } from '../../constants/timeOfDay';

type DurationMode = 'forever' | 'untilDate';

export default function EditHabitScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = Number(id);

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMode, setDurationMode] = useState<DurationMode>('forever');
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>(ALL_WEEKDAYS);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('anytime');

  useEffect(() => {
    getHabitById(db, habitId).then((habit) => {
      if (!habit) {
        router.back();
        return;
      }
      setName(habit.name);
      setDescription(habit.description ?? '');
      if (habit.end_date) {
        setDurationMode('untilDate');
        setEndDate(new Date(habit.end_date + 'T00:00:00'));
      }
      setWeekdays(parseWeekdays(habit.active_weekdays));
      setTimeOfDay(habit.time_of_day);
      setLoading(false);
    });
  }, [db, habitId]);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);
    const endDateStr = durationMode === 'untilDate' ? toDateString(endDate) : null;

    await updateHabit(db, habitId, trimmedName, description.trim() || null, weekdays, timeOfDay, endDateStr);
    router.back();
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nombre</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={styles.label}>Descripción (opcional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Notas adicionales"
        placeholderTextColor={colors.textSecondary}
        multiline
      />

      <Text style={styles.label}>Días de la semana</Text>
      <WeekdayPicker value={weekdays} onChange={setWeekdays} />
      <Text style={styles.hint}>
        Cambiar los días también afecta cómo se calcula tu historial pasado.
      </Text>
      <Text style={styles.label}>Momento del día</Text>
      <TimeOfDayPicker value={timeOfDay} onChange={setTimeOfDay} />
      <Text style={styles.label}>Duración</Text>
      <View style={styles.segmentRow}>
        <Pressable
          style={[styles.segment, durationMode === 'forever' && styles.segmentActive]}
          onPress={() => setDurationMode('forever')}
        >
          <Text style={[styles.segmentText, durationMode === 'forever' && styles.segmentTextActive]}>
            Sin fecha de fin
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, durationMode === 'untilDate' && styles.segmentActive]}
          onPress={() => setDurationMode('untilDate')}
        >
          <Text style={[styles.segmentText, durationMode === 'untilDate' && styles.segmentTextActive]}>
            Hasta una fecha
          </Text>
        </Pressable>
      </View>

      {durationMode === 'untilDate' && (
        <>
          <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateButtonText}>{toDateString(endDate)}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              onChange={(_, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) setEndDate(selectedDate);
              }}
            />
          )}
        </>
      )}

      <Pressable
        style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!name.trim() || saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 20 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16, color: colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.card,
  },
  multiline: { height: 80, textAlignVertical: 'top' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  segmentText: { color: colors.textPrimary },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    backgroundColor: colors.card,
  },
  dateButtonText: { color: colors.textPrimary },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  saveButtonDisabled: { backgroundColor: colors.statusEmpty },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});