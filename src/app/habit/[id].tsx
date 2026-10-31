import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHabitById, getHabitHistory, toggleHabitRecord, Habit, HabitDay } from '../../db/queries';
import { computeHabitStats } from '../../utils/habitStats';
import { parseWeekdays } from '../../utils/weekdays';
import { toDateString } from '../../utils/date';
import { useToday } from '../../hooks/useToday';
import { colors } from '../../constants/colors';
import { TIME_OF_DAY_LABELS, TIME_OF_DAY_ICONS } from '../../constants/timeOfDay';
import { hapticMark, hapticUnmark } from '../../utils/haptics';

const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WEEKDAY_INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function describeWeekdays(days: number[]): string {
    if (days.length === 7) return 'Todos los días';
    return days.map((d) => WEEKDAY_SHORT[d]).join(', ');
}

function formatLongDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatDays(count: number): string {
    return `${count} ${count === 1 ? 'día' : 'días'}`;
}

function buildGrid(year: number, month: number): (number | null)[] {
    const leadingBlanks = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = Array(leadingBlanks).fill(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(day);
    return cells;
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.statCard}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

export default function HabitDetailScreen() {
    const db = useSQLiteContext();
    const today = useToday();
    const { id } = useLocalSearchParams<{ id: string }>();
    const habitId = Number(id);

    const [habit, setHabit] = useState<Habit | null>(null);
    const [days, setDays] = useState<HabitDay[]>([]);
    const [loading, setLoading] = useState(true);

    const initialDate = new Date(today + 'T00:00:00');
    const [year, setYear] = useState(initialDate.getFullYear());
    const [month, setMonth] = useState(initialDate.getMonth() + 1);

    const load = useCallback(async () => {
        const habitRow = await getHabitById(db, habitId);
        if (!habitRow) {
            router.back();
            return;
        }
        const history = await getHabitHistory(db, habitId, today);
        setHabit(habitRow);
        setDays(history);
        setLoading(false);
    }, [db, habitId, today]);

    // se recarga al volver de editar el hábito
    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const stats = useMemo(() => computeHabitStats(days, today), [days, today]);
    const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d.completed])), [days]);

    async function handleToggleDay(dateStr: string) {
        if (!habit || !dayMap.has(dateStr)) return;
        const newValue = !dayMap.get(dateStr);
        if (newValue) hapticMark();
        else hapticUnmark();

        setDays((prev) => prev.map((d) => (d.date === dateStr ? { ...d, completed: newValue } : d)));
        await toggleHabitRecord(db, habit.id, habit.name, dateStr, newValue);
    }

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

    if (loading || !habit) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Cargando...</Text>
            </View>
        );
    }

    const isArchived = habit.end_date !== null && habit.end_date < today;
    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('es-MX', {
        month: 'long',
        year: 'numeric',
    });
    const cells = buildGrid(year, month);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.infoCard}>
                <Text style={styles.name}>{habit.name}</Text>
                {habit.description ? <Text style={styles.description}>{habit.description}</Text> : null}

                <View style={styles.chipRow}>
                    <View style={styles.chip}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.chipText}>
                            {describeWeekdays(parseWeekdays(habit.active_weekdays))}
                        </Text>
                    </View>
                    <View style={styles.chip}>
                        <Ionicons name={TIME_OF_DAY_ICONS[habit.time_of_day]} size={14} color={colors.textSecondary} />
                        <Text style={styles.chipText}>{TIME_OF_DAY_LABELS[habit.time_of_day]}</Text>
                    </View>
                </View>

                {habit.end_date ? (
                    <Text style={styles.endDate}>
                        {isArchived ? 'Completado el' : 'Termina el'} {formatLongDate(habit.end_date)}
                    </Text>
                ) : null}
            </View>

            <View style={styles.statsGrid}>
                <StatCard
                    label={isArchived ? 'Racha final' : 'Racha actual'}
                    value={formatDays(stats.currentStreak)}
                />
                <StatCard label="Mejor racha" value={formatDays(stats.bestStreak)} />
                <StatCard label="Cumplimiento" value={`${stats.completionRate}%`} />
                <StatCard label="Veces cumplido" value={String(stats.totalCompleted)} />
            </View>

            <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                    <Pressable onPress={goToPreviousMonth} hitSlop={8}>
                        <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={styles.monthLabel}>{monthLabel}</Text>
                    <Pressable onPress={goToNextMonth} hitSlop={8}>
                        <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
                    </Pressable>
                </View>

                <View style={styles.weekdayRow}>
                    {WEEKDAY_INITIALS.map((label, i) => (
                        <Text key={i} style={styles.weekdayLabel}>{label}</Text>
                    ))}
                </View>

                <View style={styles.grid}>
                    {cells.map((day, index) => {
                        if (day === null) return <View key={index} style={styles.cell} />;

                        const dateStr = toDateString(new Date(year, month - 1, day));
                        const status = dayMap.get(dateStr);
                        const isToday = dateStr === today;

                        return (
                            <Pressable
                                key={index}
                                style={styles.cell}
                                disabled={status === undefined}
                                onPress={() => handleToggleDay(dateStr)}
                            >
                                <View
                                    style={[
                                        styles.dayCircle,
                                        status === true && styles.dayDone,
                                        status === false && styles.dayMissed,
                                        isToday && styles.dayToday,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.dayText,
                                            status === undefined && styles.dayTextMuted,
                                            isToday && styles.dayTextToday,
                                        ]}
                                    >
                                        {day}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>

                <Text style={styles.calendarHint}>Toca un día programado para corregirlo.</Text>
            </View>

            <Pressable style={styles.editButton} onPress={() => router.push(`/edit-habit/${habit.id}`)}>
                <Ionicons name="pencil" size={16} color={colors.textPrimary} />
                <Text style={styles.editButtonText}>Editar hábito</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16, paddingBottom: 40 },
    loadingText: { color: colors.textPrimary, textAlign: 'center', marginTop: 100 },

    infoCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16 },
    name: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    description: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
        backgroundColor: colors.border,
    },
    chipText: { fontSize: 12, color: colors.textPrimary },
    endDate: { fontSize: 12, color: colors.textSecondary, marginTop: 12 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
        width: '48%',
        flexGrow: 1,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
    },
    statValue: { fontSize: 22, fontWeight: '700', color: colors.primary },
    statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },

    calendarCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16 },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    monthLabel: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize', color: colors.textPrimary },
    weekdayRow: { flexDirection: 'row', marginBottom: 4 },
    weekdayLabel: { flex: 1, textAlign: 'center', color: colors.textSecondary, fontWeight: '600', fontSize: 12 },
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
    dayDone: { backgroundColor: colors.statusComplete },
    dayMissed: { backgroundColor: colors.statusNone },
    dayText: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
    dayTextMuted: { color: colors.textSecondary },
    calendarHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 12 },

    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    editButtonText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    dayToday: { borderWidth: 2, borderColor: colors.textPrimary },
    dayTextToday: { fontWeight: '700' },
});