// src/app/_layout.tsx
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { Theme, ThemeProvider, DarkTheme } from 'expo-router/react-navigation';
import { initDatabase } from '../db/schema';
import { colors } from '../constants/colors';

const appTheme: Theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.surface },
};

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="habits.db" onInit={initDatabase} useSuspense>
      <ThemeProvider value={appTheme}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-habit"
            options={{
              presentation: 'modal',
              title: 'Nuevo hábito',
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.textPrimary,
            }}
          />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}