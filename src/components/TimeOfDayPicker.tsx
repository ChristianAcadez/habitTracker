import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import {
  TIME_OF_DAY_ORDER,
  TIME_OF_DAY_LABELS,
  TIME_OF_DAY_ICONS,
  TimeOfDay,
} from '../constants/timeOfDay';

interface TimeOfDayPickerProps {
  value: TimeOfDay;
  onChange: (value: TimeOfDay) => void;
}

export default function TimeOfDayPicker({ value, onChange }: TimeOfDayPickerProps) {
  return (
    <View style={styles.row}>
      {TIME_OF_DAY_ORDER.map((key) => {
        const selected = value === key;
        return (
          <Pressable
            key={key}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onChange(key)}
          >
            <Ionicons
              name={TIME_OF_DAY_ICONS[key]}
              size={18}
              color={selected ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
              {TIME_OF_DAY_LABELS[key]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  option: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: 12, color: colors.textPrimary },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
});