// src/app/(tabs)/index.tsx
import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHabitsWithStatusForDate, toggleHabitRecord, completeHabit, HabitWithStatus } from '../../db/queries';
import { colors } from '../../constants/colors';
import { getTodayString } from '../../utils/date';


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
  const today = getTodayString();

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
        <Text style={styles.date}>{formatDisplayDate(new Date())}</Text>
        <Pressable onPress={() => router.push('/add-habit')}>
          <Ionicons name="add-circle" size={32} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={habits}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Aún no tienes hábitos. Agrega el primero.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.habitRow}
            onPress={() => handleToggle(item)}
            onLongPress={() => handleLongPress(item)}
          >
            <Ionicons
              name={item.completed ? 'checkbox' : 'square-outline'}
              size={24}
              color={item.completed ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.habitName, item.completed && styles.habitNameDone]}>
              {item.name}
            </Text>
          </Pressable>
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
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitName: { fontSize: 16, color: colors.textPrimary },
  habitNameDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  empty: { color: colors.textSecondary, marginTop: 40, textAlign: 'center' },
});