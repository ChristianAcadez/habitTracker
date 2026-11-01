import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

export function useNotificationObserver() {
    useEffect(() => {
        function openHome(response: Notifications.NotificationResponse | null) {
            if (!response) return;
            router.navigate('/');
            Notifications.clearLastNotificationResponse();
        }

        // app abierta desde cero al tocar el aviso
        openHome(Notifications.getLastNotificationResponse());

        // app ya abierta en segundo plano
        const subscription = Notifications.addNotificationResponseReceivedListener(openHome);
        return () => subscription.remove();
    }, []);
}