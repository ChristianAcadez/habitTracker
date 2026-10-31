import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import {
  getTotalStreak,
  getBestTotalStreak,
  getHabitStreak,
  getAllHabits,
  getMonthCompletionRate,
  getRecentDaysSummary,
  deleteHabit,
  Habit,
  DaySummary,
} from '../../db/queries';
import { colors } from '../../constants/colors';
import { useToday } from '../../hooks/useToday';
import { getEncouragement } from '../../utils/encouragement';
import WeekStrip from '../../components/WeekStrip';

interface HabitStreak {
  id: number;
  name: string;
  streak: number;
  isActive: boolean;
}

function formatDays(count: number): string {
  return `${count} ${count === 1 ? 'día' : 'días'}`;
}

function CompletionRing({
  percentage,
  size = 44,
  strokeWidth = 5,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);

  return (
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
  );
}

function HabitStreakRow({ habit, onDelete }: { habit: HabitStreak; onDelete?: () => void }) {
  return (
    <Pressable
      style={styles.habitStreakRow}
      onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
    >
      <Text style={styles.habitStreakName}>{habit.name}</Text>
      <View style={styles.habitStreakRight}>
        <Text style={styles.habitStreakValue}>{formatDays(habit.streak)}</Text>
        {onDelete && (
          <Pressable onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const today = useToday();

  const [totalStreak, setTotalStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [weekSummaries, setWeekSummaries] = useState<DaySummary[]>([]);
  const [activeHabits, setActiveHabits] = useState<HabitStreak[]>([]);
  const [completedHabits, setCompletedHabits] = useState<HabitStreak[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    const now = new Date(today + 'T00:00:00');

    const [streak, best, rate, week, habits] = await Promise.all([
      getTotalStreak(db, today),
      getBestTotalStreak(db, today),
      getMonthCompletionRate(db, now.getFullYear(), now.getMonth() + 1, today),
      getRecentDaysSummary(db, today),
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
    setBestStreak(Math.max(best, streak));
    setCompletionRate(rate);
    setWeekSummaries(week);
    setActiveHabits(
      streaksPerHabit.filter((h) => h.isActive).sort((a, b) => b.streak - a.streak)
    );
    setCompletedHabits(
      streaksPerHabit.filter((h) => !h.isActive).sort((a, b) => b.streak - a.streak)
    );
    setLoading(false);
  }, [db, today]);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [loadProgress])
  );

  function confirmDelete(habit: HabitStreak) {
    Alert.alert(
      'Eliminar hábito',
      `Se borrará "${habit.name}" y todo su historial. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteHabit(db, habit.id);
            loadProgress();
          },
        },
      ]
    );
  }

  const hasHabits = activeHabits.length + completedHabits.length > 0;
  const encouragement = getEncouragement({
    streak: totalStreak,
    completionRate,
    hasHabits,
    today,
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Ionicons
          name="flame"
          size={44}
          color={totalStreak > 0 ? colors.primary : colors.textSecondary}
        />
        <Text style={styles.heroNumber}>{totalStreak}</Text>
        <Text style={styles.heroLabel}>{totalStreak === 1 ? 'día seguido' : 'días seguidos'}</Text>
        <Text style={styles.encouragement}>{encouragement}</Text>
      </View>

      <WeekStrip today={today} summaries={weekSummaries} />

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <CompletionRing percentage={completionRate} />
          <View>
            <Text style={styles.statValue}>{completionRate}%</Text>
            <Text style={styles.statLabel}>Este mes</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View>
            <Text style={styles.statValue}>{formatDays(bestStreak)}</Text>
            <Text style={styles.statLabel}>Mejor racha</Text>
          </View>
        </View>
      </View>

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
            <HabitStreakRow key={habit.id} habit={habit} onDelete={() => confirmDelete(habit)} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 20 },
  loadingText: { color: colors.textPrimary, textAlign: 'center', marginTop: 100 },

  hero: { alignItems: 'center', paddingBottom: 20 },
  heroNumber: { fontSize: 56, fontWeight: '700', color: colors.textPrimary, lineHeight: 62 },
  heroLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  encouragement: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.primary,
    paddingHorizontal: 12,
  },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, color: colors.textSecondary },
  completedTitle: { marginTop: 20 },
  habitStreakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  habitStreakName: { flex: 1, fontSize: 15, color: colors.textPrimary },
  habitStreakRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  habitStreakValue: { fontSize: 15, fontWeight: '600', color: colors.primary },
  empty: { color: colors.textSecondary, marginTop: 4, marginBottom: 12 },
});