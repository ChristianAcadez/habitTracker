// src/app/(tabs)/index.tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHabitsWithStatusForDate, toggleHabitRecord, completeHabit, HabitWithStatus, deleteHabit, getTotalStreak } from '../../db/queries';
import { colors } from '../../constants/colors';
import { useToday } from '../../hooks/useToday';
import { View, Text, SectionList, Pressable, StyleSheet, Alert, Modal, Animated } from 'react-native';
import { TIME_OF_DAY_ORDER, TIME_OF_DAY_LABELS, TIME_OF_DAY_ICONS } from '../../constants/timeOfDay';


function ProgressBar({ progress }: { progress: number }) {
  const animated = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: progress,
      duration: 250,
      useNativeDriver: false, // el ancho no se puede animar con el driver nativo
    }).start();
  }, [progress, animated]);

  const width = animated.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width }]} />
    </View>
  );
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
  const today = useToday();

  const [streak, setStreak] = useState(0);

  const loadHabits = useCallback(async () => {
    const [result, currentStreak] = await Promise.all([
      getHabitsWithStatusForDate(db, today),
      getTotalStreak(db, today),
    ]);
    setHabits(result);
    setStreak(currentStreak);
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

  const [optionsHabit, setOptionsHabit] = useState<HabitWithStatus | null>(null);

  function closeOptions() {
    setOptionsHabit(null);
  }

  function handleEdit(habit: HabitWithStatus) {
    closeOptions();
    router.push(`/edit-habit/${habit.id}`);
  }

  function handleComplete(habit: HabitWithStatus) {
    closeOptions();
    handleLongPress(habit); // reutiliza la confirmación de "Completar" que ya tienes
  }

  function handleDelete(habit: HabitWithStatus) {
    closeOptions();
    Alert.alert(
      'Eliminar hábito',
      `Se borrará "${habit.name}" y todo su historial. Esta acción no se puede deshacer.\n\nSi solo quieres dejar de verlo en tu lista diaria, usa "Completar".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteHabit(db, habit.id);
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
    setStreak(await getTotalStreak(db, today));
  }

  const completedCount = habits.filter((h) => h.completed).length;
  const totalCount = habits.length;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const sections = TIME_OF_DAY_ORDER.map((key) => ({
    key,
    data: habits.filter((h) => h.time_of_day === key),
  })).filter((section) => section.data.length > 0);

  const showSectionHeaders = !(sections.length === 1 && sections[0].key === 'anytime');

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

      {totalCount > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <Text style={[styles.summaryText, allDone && styles.summaryTextDone]}>
              {allDone ? '¡Todo completado hoy!' : `${completedCount} de ${totalCount} hoy`}
            </Text>
            <View style={styles.streakBadge}>
              <Ionicons
                name="flame"
                size={18}
                color={streak > 0 ? colors.primary : colors.textSecondary}
              />
              <Text style={styles.streakText}>
                {streak} {streak === 1 ? 'día' : 'días'}
              </Text>
            </View>
          </View>
          <ProgressBar progress={progress} />
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Text style={styles.empty}>No tienes hábitos programados para hoy.</Text>
        }
        renderSectionHeader={
          showSectionHeaders
            ? ({ section }) => (
              <View style={styles.sectionHeader}>
                <Ionicons
                  name={TIME_OF_DAY_ICONS[section.key]}
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.sectionTitle}>{TIME_OF_DAY_LABELS[section.key]}</Text>
              </View>
            )
            : undefined
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

            <Pressable style={styles.editButton} onPress={() => setOptionsHabit(item)}>
              <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
      />
      <Modal
        visible={optionsHabit !== null}
        transparent
        animationType="fade"
        onRequestClose={closeOptions}
      >
        <Pressable style={styles.sheetOverlay} onPress={closeOptions}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {optionsHabit?.name}
            </Text>

            <Pressable
              style={styles.sheetRow}
              onPress={() => optionsHabit && handleEdit(optionsHabit)}
            >
              <Ionicons name="pencil" size={20} color={colors.textPrimary} />
              <Text style={styles.sheetRowText}>Editar</Text>
            </Pressable>

            <Pressable
              style={styles.sheetRow}
              onPress={() => optionsHabit && handleComplete(optionsHabit)}
            >
              <Ionicons name="checkmark-done" size={20} color={colors.textPrimary} />
              <View>
                <Text style={styles.sheetRowText}>Completar</Text>
                <Text style={styles.sheetRowSub}>Deja de aparecer, conserva su historial</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.sheetRow}
              onPress={() => optionsHabit && handleDelete(optionsHabit)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.statusNone} />
              <View>
                <Text style={[styles.sheetRowText, { color: colors.statusNone }]}>Eliminar</Text>
                <Text style={styles.sheetRowSub}>Borra el hábito y todo su historial</Text>
              </View>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  sheetRowText: { fontSize: 16, color: colors.textPrimary },
  sheetRowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  summaryTextDone: { color: colors.primary },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusEmpty,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});