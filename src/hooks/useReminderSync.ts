import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { subscribeToDataChanges } from '../db/changes';
import { syncReminders } from '../notifications/reminders';
import { useToday } from './useToday';

export function useReminderSync() {
    const db = useSQLiteContext();
    const today = useToday();

    useEffect(() => {
        const sync = () => {
            syncReminders(db);
        };

        sync(); // al abrir la app y al cambiar de día
        const unsubscribe = subscribeToDataChanges(sync);
        const appState = AppState.addEventListener('change', (state) => {
            if (state === 'active') sync(); // por si cambiaste el permiso en los ajustes del teléfono
        });

        return () => {
            unsubscribe();
            appState.remove();
        };
    }, [db, today]);
}