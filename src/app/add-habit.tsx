// src/app/add-habit.tsx
import { useState } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createHabit } from '../db/queries';

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
    const endDateStr =
      durationMode === 'untilDate' ? endDate.toISOString().slice(0, 10) : null;

    await createHabit(db, trimmedName, description.trim() || null, 'daily', endDateStr);
    router.back();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Brush teeth at night"
        autoFocus
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Any extra notes"
        multiline
      />

      <Text style={styles.label}>Duración</Text>
      <View style={styles.segmentRow}>
        <Pressable
          style={[styles.segment, durationMode === 'forever' && styles.segmentActive]}
          onPress={() => setDurationMode('forever')}
        >
          <Text style={durationMode === 'forever' && styles.segmentTextActive}>
            Sin fecha de fin
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, durationMode === 'untilDate' && styles.segmentActive]}
          onPress={() => setDurationMode('untilDate')}
        >
          <Text style={durationMode === 'untilDate' && styles.segmentTextActive}>
            Hasta una fecha
          </Text>
        </Pressable>
      </View>

      {durationMode === 'untilDate' && (
        <>
          <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text>{endDate.toISOString().slice(0, 10)}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              minimumDate={new Date()}
              onChange={(_, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios'); // en iOS el picker es inline, en Android es modal y se cierra solo
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
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save habit'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  multiline: { height: 80, textAlignVertical: 'top' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  segmentTextActive: { color: 'white', fontWeight: '600' },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: { backgroundColor: '#aaa' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});