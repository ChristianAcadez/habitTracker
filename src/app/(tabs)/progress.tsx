// src/app/(tabs)/progress.tsx
import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import {
  getTotalStreak,
  getHabitStreak,
  getAllHabits,
  getMonthCompletionRate,
  Habit,
} from '../../db/queries';

interface HabitStreak {
  id: number;
  name: string;
  streak: number;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function CompletionRing({ percentage }: { percentage: number }) {
  const size = 160;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#4CAF50"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={styles.ringCenter}>
          <Text style={styles.ringPercentage}>{percentage}%</Text>
          <Text style={styles.ringLabel}>completado</Text>
        </View>
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const [totalStreak, setTotalStreak] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [habitStreaks, setHabitStreaks] = useState<HabitStreak[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    const today = getTodayString();
    const now = new Date();

    const [streak, rate, habits] = await Promise.all([
      getTotalStreak(db, today),
      getMonthCompletionRate(db, now.getFullYear(), now.getMonth() + 1, today),
      getAllHabits(db),
    ]);

    const streaksPerHabit = await Promise.all(
      habits.map(async (habit: Habit) => ({
        id: habit.id,
        name: habit.name,
        streak: await getHabitStreak(db, habit.id, today),
      }))
    );

    setTotalStreak(streak);
    setCompletionRate(rate);
    setHabitStreaks(streaksPerHabit.sort((a, b) => b.streak - a.streak));
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [loadProgress])
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.streakLabel}>
        Racha {totalStreak} {totalStreak === 1 ? 'día' : 'días'}
      </Text>

      <View style={styles.ringWrapper}>
        <CompletionRing percentage={completionRate} />
      </View>

      <Text style={styles.encouragement}>¡Sigue así!</Text>

      <Text style={styles.sectionTitle}>Rachas por hábito</Text>
      <FlatList
        data={habitStreaks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Aún no hay hábitos para mostrar rachas.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.habitStreakRow}>
            <Text style={styles.habitStreakName}>{item.name}</Text>
            <Text style={styles.habitStreakValue}>
              {item.streak} {item.streak === 1 ? 'día' : 'días'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  streakLabel: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  ringWrapper: { alignItems: 'center', marginBottom: 12 },
  ringCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringPercentage: { fontSize: 28, fontWeight: '700' },
  ringLabel: { fontSize: 13, color: '#888' },
  encouragement: { textAlign: 'center', fontSize: 16, color: '#4CAF50', marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, color: '#555' },
  list: { gap: 10 },
  habitStreakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  habitStreakName: { fontSize: 15 },
  habitStreakValue: { fontSize: 15, fontWeight: '600', color: '#4CAF50' },
  empty: { color: '#888', marginTop: 20, textAlign: 'center' },
});