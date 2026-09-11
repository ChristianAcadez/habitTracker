// src/app/(tabs)/index.tsx
import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHabitsWithStatusForDate, toggleHabitRecord, HabitWithStatus } from '../../db/queries';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { completeHabit } from '../../db/queries';

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

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

    // actualiza el estado local de inmediato (optimistic update),
    // así el checkbox responde al instante sin esperar la escritura en disco
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, completed: newValue } : h))
    );

    await toggleHabitRecord(db, habit.id, habit.name, today, newValue);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.date}>{formatDisplayDate(new Date())}</Text>

      <Pressable style={styles.addButton} onPress={() => router.push('/add-habit')}>
        <Ionicons name="add-circle" size={32} color="#4CAF50" />
      </Pressable>
      
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
              color={item.completed ? '#4CAF50' : '#888'}
            />
            <Text
              style={[styles.habitName, item.completed && styles.habitNameDone]}
            >
              {item.name}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  date: {
    fontSize: 20,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: 20,
  },
  list: { gap: 12 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitName: { fontSize: 16 },
  habitNameDone: { textDecorationLine: 'line-through', color: '#888' },
  empty: { color: '#888', marginTop: 40, textAlign: 'center' },
  addButton: { position: 'absolute', top: 55, right: 20, zIndex: 1 },
});