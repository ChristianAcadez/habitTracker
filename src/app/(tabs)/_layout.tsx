import { View, Text, Pressable, StyleSheet } from 'react-native';
import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from 'expo-router/js-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useReminderSync } from '../../hooks/useReminderSync';
import { useNotificationObserver } from '../../hooks/useNotificationObserver';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

const TAB_ITEMS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  calendar: { label: 'Calendario', icon: 'calendar-outline' },
  index: { label: 'Hoy', icon: 'checkbox-outline' },
  progress: { label: 'Progreso', icon: 'stats-chart-outline' },
};

interface BottomTabBarProps {
  state: { index: number; routes: { key: string; name: string; params?: object }[] };
  navigation: any;
}

function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const item = TAB_ITEMS[route.name];
        if (!item) return null;

        const focused = state.index === index;
        const color = focused ? colors.primary : colors.textSecondary;

        function handlePress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        }

        return (
          <Pressable
            key={route.key}
            style={styles.tab}
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
          >
            <Ionicons name={item.icon} size={24} color={color} />
            <Text style={[styles.label, { color }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  useReminderSync();
  useNotificationObserver();

  return (
    <MaterialTopTabs
      initialRouteName="index"
      tabBarPosition="bottom"
      tabBar={(props: BottomTabBarProps) => <BottomTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <MaterialTopTabs.Screen name="calendar" />
      <MaterialTopTabs.Screen name="index" />
      <MaterialTopTabs.Screen name="progress" />
    </MaterialTopTabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
    gap: 2,
  },
  label: { fontSize: 11, fontWeight: '500' },
});