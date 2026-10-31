import { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getMonthSummary,
  getHabitsWithStatusForDate,
  toggleHabitRecord,
  DaySummary,
  DayStatus,
  HabitWithStatus,
} from '../../db/queries';
import { colors } from '../../constants/colors';
import { toDateString } from '../../utils/date';
import { useToday } from '../../hooks/useToday';
import { hapticMark, hapticUnmark } from '../../utils/haptics';
import ProgressBar from '../../components/ProgressBar';

const STATUS_COLORS: Record<DayStatus, string> = {
  complete: colors.statusComplete,
  partial: colors.statusPartial,
  none: colors.statusNone,
};

const WEEKDAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatSheetDate(dateStr: string): string {
  return capitalize(
    new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  );
}

function buildCalendarGrid(year: number, month: number, summaries: DaySummary[]) {
  const statusByDate = new Map(summaries.map((s) => [s.date, s.status]));
  const leadingBlanks = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: { day: number | null; dateStr: string | null; status: DayStatus | null }[] = [];

  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ day: null, dateStr: null, status: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = toDateString(new Date(year, month - 1, day));
    cells.push({ day, dateStr, status: statusByDate.get(dateStr) ?? null });
  }

  return cells;
}

function SummaryTile({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <View style={styles.summaryTile}>
      <View style={styles.summaryTop}>
        <View style={[styles.summaryDot, { backgroundColor: color }]} />
        <Text style={styles.summaryCount}>{count}</Text>
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const todayString = useToday();
  const todayDate = new Date(todayString + 'T00:00:00');

  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth() + 1);
  const [summaries, setSummaries] = useState<DaySummary[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayHabits, setDayHabits] = useState<HabitWithStatus[]>([]);

  const isCurrentMonth = year === todayDate.getFullYear() && month === todayDate.getMonth() + 1;
  const isFutureDate = selectedDate !== null && selectedDate > todayString;

  useEffect(() => {
    if (!selectedDate) return;
    getHabitsWithStatusForDate(db, selectedDate).then(setDayHabits);
  }, [db, selectedDate]);

  const loadMonth = useCallback(async () => {
    const result = await getMonthSummary(db, year, month, todayString);
    setSummaries(result);
  }, [db, year, month, todayString]);

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

  function goToToday() {
    setYear(todayDate.getFullYear());
    setMonth(todayDate.getMonth() + 1);
  }

  async function handleToggleHabit(habit: HabitWithStatus) {
    if (!selectedDate || isFutureDate) return;
    const newValue = !habit.completed;

    if (newValue) hapticMark();
    else hapticUnmark();

    setDayHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, completed: newValue } : h))
    );

    await toggleHabitRecord(db, habit.id, habit.name, selectedDate, newValue);
    loadMonth(); // recalcula el color del día y el resumen del mes
  }

  const monthLabel = capitalize(
    new Date(year, month - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  );
  const cells = buildCalendarGrid(year, month, summaries);

  // hoy sin nada marcado todavía no es un fallo, así que no entra al resumen
  const countedSummaries = summaries.filter(
    (s) => !(s.date === todayString && s.status === 'none')
  );
  const completeCount = countedSummaries.filter((s) => s.status === 'complete').length;
  const partialCount = countedSummaries.filter((s) => s.status === 'partial').length;
  const missedCount = countedSummaries.filter((s) => s.status === 'none').length;

  const doneCount = dayHabits.filter((h) => h.completed).length;
  const totalCount = dayHabits.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Pressable onPress={goToPreviousMonth} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        <Text style={styles.monthLabel}>{monthLabel}</Text>

        <View style={[styles.headerSide, styles.headerSideRight]}>
          {!isCurrentMonth && (
            <Pressable style={styles.todayChip} onPress={goToToday}>
              <Text style={styles.todayChipText}>Hoy</Text>
            </Pressable>
          )}
          <Pressable onPress={goToNextMonth} hitSlop={8}>
            <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, i) => (
              <Text key={i} style={styles.weekdayLabel}>{label}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell, index) => {
              const isToday = cell.dateStr === todayString;
              const displayStatus = isToday && cell.status === 'none' ? null : cell.status;

              return (
                <Pressable
                  key={index}
                  style={styles.cell}
                  disabled={cell.dateStr === null}
                  onPress={() => cell.dateStr && setSelectedDate(cell.dateStr)}
                >
                  {cell.day !== null && (
                    <View
                      style={[
                        styles.dayCircle,
                        displayStatus && { backgroundColor: STATUS_COLORS[displayStatus] },
                        isToday && styles.dayCircleToday,
                      ]}
                    >
                      <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                        {cell.day}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryTile
            color={colors.statusComplete}
            count={completeCount}
            label={completeCount === 1 ? 'completo' : 'completos'}
          />
          <SummaryTile
            color={colors.statusPartial}
            count={partialCount}
            label={partialCount === 1 ? 'parcial' : 'parciales'}
          />
          <SummaryTile
            color={colors.statusNone}
            count={missedCount}
            label={missedCount === 1 ? 'fallido' : 'fallidos'}
          />
        </View>
      </ScrollView>

      <Modal
        visible={selectedDate !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDate(null)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setSelectedDate(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>
              {selectedDate && formatSheetDate(selectedDate)}
            </Text>

            {totalCount > 0 && !isFutureDate && (
              <View style={styles.sheetProgress}>
                <Text style={styles.sheetProgressText}>
                  {doneCount} de {totalCount}
                </Text>
                <ProgressBar progress={doneCount / totalCount} />
              </View>
            )}

            {totalCount === 0 ? (
              <Text style={styles.sheetEmpty}>
                {isFutureDate
                  ? 'No hay hábitos programados ese día.'
                  : 'No había hábitos activos ese día.'}
              </Text>
            ) : (
              <ScrollView style={styles.sheetList}>
                {dayHabits.map((habit) => (
                  <Pressable
                    key={habit.id}
                    style={styles.sheetHabitRow}
                    onPress={() => handleToggleHabit(habit)}
                    disabled={isFutureDate}
                  >
                    <Ionicons
                      name={
                        isFutureDate
                          ? 'ellipse-outline'
                          : habit.completed
                            ? 'checkmark-circle'
                            : 'close-circle'
                      }
                      size={20}
                      color={
                        isFutureDate
                          ? colors.textSecondary
                          : habit.completed
                            ? colors.statusComplete
                            : colors.statusNone
                      }
                    />
                    <View style={styles.sheetHabitTexts}>
                      <Text style={styles.sheetHabitName}>{habit.name}</Text>
                      {habit.description ? (
                        <Text style={styles.sheetHabitDescription}>{habit.description}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {totalCount > 0 && (
              <Text style={styles.sheetHint}>
                {isFutureDate
                  ? 'Los días futuros aún no se pueden marcar.'
                  : 'Toca un hábito para corregirlo.'}
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerSide: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerSideRight: { justifyContent: 'flex-end', gap: 10 },
  monthLabel: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  todayChip: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  todayChipText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  body: { padding: 16, gap: 12 },

  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12 },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.statusEmpty,
  },
  dayCircleToday: { borderWidth: 2, borderColor: colors.textPrimary },
  dayText: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  dayTextToday: { fontWeight: '700' },

  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryCount: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  sheetProgress: { marginTop: 12, gap: 8 },
  sheetProgressText: { fontSize: 13, color: colors.textSecondary },
  sheetList: { marginTop: 8, maxHeight: 320 },
  sheetEmpty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 },
  sheetHabitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  sheetHabitTexts: { flex: 1 },
  sheetHabitName: { fontSize: 15, color: colors.textPrimary },
  sheetHabitDescription: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  sheetHint: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
});