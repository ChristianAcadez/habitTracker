// src/app/(tabs)/progress.tsx
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
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
import { colors } from '../../constants/colors';
import { getTodayString } from '../../utils/date';

interface HabitStreak {
  id: number;
  name: string;
  streak: number;
  isActive: boolean;
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
          stroke={colors.statusEmpty}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.ringCenter}>
          <Text style={styles.ringPercentage}>{percentage}%</Text>
          <Text style={styles.ringLabel}>completado</Text>
        </View>
      </View>
    </View>
  );
}

function HabitStreakRow({ habit }: { habit: HabitStreak }) {
  return (
    <View style={styles.habitStreakRow}>
      <Text style={styles.habitStreakName}>{habit.name}</Text>
      <Text style={styles.habitStreakValue}>
        {habit.streak} {habit.streak === 1 ? 'día' : 'días'}
      </Text>
    </View>
  );
}

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const [totalStreak, setTotalStreak] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [activeHabits, setActiveHabits] = useState<HabitStreak[]>([]);
  const [completedHabits, setCompletedHabits] = useState<HabitStreak[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    const today = getTodayString();
    const now = new Date();

    const [streak, rate, habits] = await Promise.all([
      getTotalStreak(db, today),
      getMonthCompletionRate(db, now.getFullYear(), now.getMonth() + 1, today),
      getAllHabits(db),
    ]);

    const streaksPerHabit: HabitStreak[] = await Promise.all(
      habits.map(async (habit: Habit) => ({
        id: habit.id,
        name: habit.name,
        streak: await getHabitStreak(db, habit.id, today),
        isActive: !habit.end_date || habit.end_date >= today,
      }))
    );

    setTotalStreak(streak);
    setCompletionRate(rate);
    setActiveHabits(
      streaksPerHabit.filter((h) => h.isActive).sort((a, b) => b.streak - a.streak)
    );
    setCompletedHabits(
      streaksPerHabit.filter((h) => !h.isActive).sort((a, b) => b.streak - a.streak)
    );
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
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.streakLabel}>
        Racha {totalStreak} {totalStreak === 1 ? 'día' : 'días'}
      </Text>

      <View style={styles.ringWrapper}>
        <CompletionRing percentage={completionRate} />
      </View>

      <Text style={styles.encouragement}>¡Sigue así!</Text>

      <Text style={styles.sectionTitle}>Hábitos actuales</Text>
      {activeHabits.length === 0 ? (
        <Text style={styles.empty}>No tienes hábitos activos.</Text>
      ) : (
        activeHabits.map((habit) => <HabitStreakRow key={habit.id} habit={habit} />)
      )}

      {completedHabits.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, styles.completedTitle]}>Hábitos completados</Text>
          {completedHabits.map((habit) => (
            <HabitStreakRow key={habit.id} habit={habit} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  loadingText: { color: colors.textPrimary, textAlign: 'center', marginTop: 100 },
  scrollContent: { paddingTop: 60, paddingBottom: 40 },
  streakLabel: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 20, color: colors.textPrimary },
  ringWrapper: { alignItems: 'center', marginBottom: 12 },
  ringCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringPercentage: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  ringLabel: { fontSize: 13, color: colors.textSecondary },
  encouragement: { textAlign: 'center', fontSize: 16, color: colors.primary, marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, color: colors.textSecondary },
  completedTitle: { marginTop: 20 },
  habitStreakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  habitStreakName: { fontSize: 15, color: colors.textPrimary },
  habitStreakValue: { fontSize: 15, fontWeight: '600', color: colors.primary },
  empty: { color: colors.textSecondary, marginTop: 4, marginBottom: 12 },
});