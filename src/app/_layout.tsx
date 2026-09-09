// src/app/_layout.tsx
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { initDatabase } from '../db/schema';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="habits.db" onInit={initDatabase} useSuspense>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-habit"
          options={{ presentation: 'modal', title: 'New habit' }}
        />
      </Stack>
    </SQLiteProvider>
  );
}