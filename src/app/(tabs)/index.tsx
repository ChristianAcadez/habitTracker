// src/app/(tabs)/index.tsx
import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHabitsWithStatusForDate, toggleHabitRecord, completeHabit, HabitWithStatus } from '../../db/queries';
import { colors } from '../../constants/colors';
import { getTodayString } from '../../utils/date';
import { useToday } from '../../hooks/useToday';


function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function IndexScreen() {
  const db = useSQLiteContext();
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const today = useToday();

  const loadHabits = useCallback(async () => {
    const result = await getHabitsWithStatusForDate(db, today);
    setHabits(result);
    setLoading(false);
  }, [db, today]);

  function handleLongPress(habit: HabitWithStatus) {
    Alert.alert(
      'Completar hábito',
      `"${habit.name}" ya no aparecerá en tu lista diaria, pero conservarás todo su historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          style: 'destructive',
          onPress: async () => {
            await completeHabit(db, habit.id, today);
            loadHabits();
          },
        },
      ]
    );
  }

  function handleOptionsPress(habit: HabitWithStatus) {
    Alert.alert(
      habit.name,
      '¿Qué quieres hacer con este hábito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Editar',
          onPress: () => router.push(`/edit-habit/${habit.id}`),
        },
        {
          text: 'Completar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Completar hábito',
              `"${habit.name}" ya no aparecerá en tu lista diaria, pero conservarás todo su historial.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Completar',
                  style: 'destructive',
                  onPress: async () => {
                    await completeHabit(db, habit.id, today);
                    loadHabits();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [loadHabits])
  );

  async function handleToggle(habit: HabitWithStatus) {
    const newValue = !habit.completed;

    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, completed: newValue } : h))
    );

    await toggleHabitRecord(db, habit.id, habit.name, today, newValue);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.date}>{formatDisplayDate(new Date(today + 'T00:00:00'))}</Text>
        <Pressable onPress={() => router.push('/add-habit')}>
          <Ionicons name="add-circle" size={32} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={habits}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No tienes hábitos programados para hoy.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.habitRow}>
            <Pressable
              style={styles.habitMain}
              onPress={() => handleToggle(item)}
              onLongPress={() => handleLongPress(item)}
            >
              <Ionicons
                name={item.completed ? 'checkbox' : 'square-outline'}
                size={24}
                color={item.completed ? colors.primary : colors.textSecondary}
              />
              <View style={styles.habitTexts}>
                <Text style={[styles.habitName, item.completed && styles.habitNameDone]}>
                  {item.name}
                </Text>
                {item.description ? (
                  <Text style={styles.habitDescription}>{item.description}</Text>
                ) : null}
              </View>
            </Pressable>

            <Pressable
              style={styles.editButton}
              onPress={() => handleOptionsPress(item)}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingText: { color: colors.textPrimary, textAlign: 'center', marginTop: 100 },
  header: {
    backgroundColor: colors.surface,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: { fontSize: 20, fontWeight: '600', textTransform: 'capitalize', color: colors.textPrimary },
  list: { gap: 12, paddingHorizontal: 20, paddingTop: 16 },
  habitName: { fontSize: 16, color: colors.textPrimary },
  habitNameDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  empty: { color: colors.textSecondary, marginTop: 40, textAlign: 'center' },
  habitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  habitMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  editButton: { padding: 6 },
  habitTexts: { flex: 1 },
  habitDescription: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});