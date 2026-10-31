import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import type { DaySummary } from '../db/queries';
import { toDateString } from '../utils/date';

const WEEKDAY_INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

interface WeekStripProps {
  today: string;
  summaries: DaySummary[];
  days?: number;
}

export default function WeekStrip({ today, summaries, days = 7 }: WeekStripProps) {
  const statusByDate = new Map(summaries.map((s) => [s.date, s.status]));
  const base = new Date(today + 'T00:00:00');

  const cells = Array.from({ length: days }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() - (days - 1 - index));
    const dateStr = toDateString(date);
    return {
      dateStr,
      label: WEEKDAY_INITIALS[date.getDay()],
      status: statusByDate.get(dateStr) ?? null,
      isToday: dateStr === today,
    };
  });

  return (
    <View style={styles.container}>
      {cells.map((cell) => {
        const pending = cell.isToday && cell.status === 'none';
        let background = colors.statusEmpty;
        let icon: keyof typeof Ionicons.glyphMap | null = null;
        let iconColor = '#fff';

        if (cell.status === 'complete') {
          background = colors.statusComplete;
          icon = 'checkmark';
        } else if (cell.status === 'partial') {
          background = colors.statusPartial;
          icon = 'remove';
          iconColor = colors.surface; // el blanco no se lee sobre el amarillo
        } else if (cell.status === 'none' && !pending) {
          background = colors.statusNone;
          icon = 'close';
        }

        return (
          <View key={cell.dateStr} style={styles.cell}>
            <Text style={[styles.label, cell.isToday && styles.labelToday]}>{cell.label}</Text>
            <View
              style={[
                styles.circle,
                { backgroundColor: background },
                cell.isToday && styles.circleToday,
              ]}
            >
              {icon && <Ionicons name={icon} size={16} color={iconColor} />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  cell: { flex: 1, alignItems: 'center', gap: 6 },
  label: { fontSize: 11, color: colors.textSecondary },
  labelToday: { color: colors.textPrimary, fontWeight: '600' },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleToday: { borderWidth: 2, borderColor: colors.textPrimary },
});