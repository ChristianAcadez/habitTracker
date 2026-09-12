// src/app/add-habit.tsx
import { useState } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createHabit } from '../db/queries';
import { toDateString } from '../utils/date';
import { colors } from '../constants/colors';

type DurationMode = 'forever' | 'untilDate';

export default function AddHabitScreen() {
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMode, setDurationMode] = useState<DurationMode>('forever');
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);
    const endDateStr = durationMode === 'untilDate' ? toDateString(endDate) : null;

    await createHabit(db, trimmedName, description.trim() || null, 'daily', endDateStr);
    router.back();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nombre</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="ej. Cepillarme los dientes en la noche"
        placeholderTextColor={colors.textSecondary}
        autoFocus
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
              minimumDate={new Date()}
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
        <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar hábito'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 20 },
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
  saveButtonDisabled: { backgroundColor: colors.statusEmpty },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});