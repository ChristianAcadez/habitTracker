import { requireOptionalNativeModule } from 'expo-modules-core';

// Si el módulo nativo no existe (Expo Go en Android), devuelve un objeto vacío en vez de fallar
export default requireOptionalNativeModule('ExpoTopicSubscriptionModule') ?? {};