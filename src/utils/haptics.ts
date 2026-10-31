import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Si el dispositivo no soporta haptics, no queremos que la app muestre errores
function run(action: () => Promise<void>) {
  action().catch(() => {});
}

// Marcar un hábito
export function hapticMark() {
  if (Platform.OS === 'android') {
    run(() => Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Toggle_On));
  } else {
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  }
}

// Desmarcar un hábito (más suave que marcar)
export function hapticUnmark() {
  if (Platform.OS === 'android') {
    run(() => Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Toggle_Off));
  } else {
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  }
}

// Completar el último hábito del día
export function hapticAllDone() {
  if (Platform.OS === 'android') {
    run(() => Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm));
  } else {
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  }
}