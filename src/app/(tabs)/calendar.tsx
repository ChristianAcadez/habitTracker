// src/app/(tabs)/calendar.tsx
import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMonthSummary, DaySummary, DayStatus } from '../../db/queries';

const STATUS_COLORS: Record<DayStatus, string> = {
  complete: '#4CAF50',
  partial: '#FFC107',
  none: '#E57373',
};

const WEEKDAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildCalendarGrid(year: number, month: number, summaries: DaySummary[]) {
  const statusByDate = new Map(summaries.map((s) => [s.date, s.status]));
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = firstDayOfMonth.getDay(); // 0 (domingo) a 6

  const cells: { day: number | null; status: DayStatus | null }[] = [];

  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ day: null, status: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ day, status: statusByDate.get(dateStr) ?? null });
  }

  return cells;
}

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [summaries, setSummaries] = useState<DaySummary[]>([]);

  const loadMonth = useCallback(async () => {
    const result = await getMonthSummary(db, year, month, getTodayString());
    setSummaries(result);
  }, [db, year, month]);

  useFocusEffect(
    useCallback(() => {
      loadMonth();
    }, [loadMonth])
  );

  function goToPreviousMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  const cells = buildCalendarGrid(year, month, summaries);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goToPreviousMonth}>
          <Ionicons name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={goToNextMonth}>
          <Ionicons name="chevron-forward" size={24} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={styles.weekdayLabel}>{label}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => (
          <View key={index} style={styles.cell}>
            {cell.day !== null && (
              <View
                style={[
                  styles.dayCircle,
                  cell.status && { backgroundColor: STATUS_COLORS[cell.status] },
                ]}
              >
                <Text style={styles.dayText}>{cell.day}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthLabel: { fontSize: 18, fontWeight: '600', textTransform: 'capitalize' },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayLabel: { flex: 1, textAlign: 'center', color: '#888', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0', // gris para días futuros o sin datos aún
  },
  dayText: { fontSize: 13, fontWeight: '500' },
});