// src/app/(tabs)/calendar.tsx
import { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getMonthSummary,
  getHabitsWithStatusForDate,
  DaySummary,
  DayStatus,
  HabitWithStatus,
} from '../../db/queries';
import { colors } from '../../constants/colors';
import { getTodayString } from '../../utils/date';

const STATUS_COLORS: Record<DayStatus, string> = {
  complete: colors.statusComplete,
  partial: colors.statusPartial,
  none: colors.statusNone,
};

const WEEKDAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function buildCalendarGrid(year: number, month: number, summaries: DaySummary[]) {
  const statusByDate = new Map(summaries.map((s) => [s.date, s.status]));
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = firstDayOfMonth.getDay();

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
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [summaries, setSummaries] = useState<DaySummary[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayHabits, setDayHabits] = useState<HabitWithStatus[]>([]);

  useEffect(() => {
    if (!selectedDate) return;
    getHabitsWithStatusForDate(db, selectedDate).then(setDayHabits);
  }, [db, selectedDate]);

  function formatModalDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

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
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={goToNextMonth}>
          <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={styles.weekdayLabel}>{label}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => (
          <Pressable
            key={index}
            style={styles.cell}
            disabled={cell.day === null}
            onPress={() => {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
              setSelectedDate(dateStr);
            }}
          >
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
          </Pressable>
        ))}
      </View>

      <Modal
        visible={selectedDate !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDate(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedDate(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {selectedDate && formatModalDate(selectedDate)}
            </Text>

            {dayHabits.length === 0 ? (
              <Text style={styles.modalEmpty}>No había hábitos activos ese día.</Text>
            ) : (
              dayHabits.map((habit) => (
                <View key={habit.id} style={styles.modalHabitRow}>
                  <Ionicons
                    name={habit.completed ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={habit.completed ? colors.statusComplete : colors.statusNone}
                  />
                  <Text style={styles.modalHabitName}>{habit.name}</Text>
                </View>
              ))
            )}

            <Pressable style={styles.modalCloseButton} onPress={() => setSelectedDate(null)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthLabel: { fontSize: 18, fontWeight: '600', textTransform: 'capitalize', color: colors.textPrimary },
  weekdayRow: { flexDirection: 'row', marginTop: 16, paddingHorizontal: 20 },
  weekdayLabel: { flex: 1, textAlign: 'center', color: colors.textSecondary, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.statusEmpty,
  },
  dayText: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: 16,
    color: colors.textPrimary,
  },
  modalEmpty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 },
  modalHabitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  modalHabitName: { fontSize: 15, color: colors.textPrimary },
  modalCloseButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
    backgroundColor: colors.border,
    borderRadius: 8,
  },
  modalCloseText: { fontWeight: '600', color: colors.textPrimary },
});