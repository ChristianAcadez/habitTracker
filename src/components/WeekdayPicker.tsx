import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface WeekdayPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
}

export default function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  function toggleDay(day: number) {
    if (value.includes(day)) {
      if (value.length === 1) return; // siempre debe quedar al menos un día
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day].sort((a, b) => a - b));
    }
  }

  return (
    <View style={styles.row}>
      {WEEKDAY_LABELS.map((label, day) => {
        const selected = value.includes(day);
        return (
          <Pressable
            key={day}
            style={[styles.day, selected && styles.daySelected]}
            onPress={() => toggleDay(day)}
          >
            <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 12, color: colors.textPrimary },
  dayTextSelected: { color: '#fff', fontWeight: '600' },
});