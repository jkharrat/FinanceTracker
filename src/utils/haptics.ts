import { Platform } from 'react-native';

let Haptics: typeof import('expo-haptics') | null = null;

if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch {
    // expo-haptics not available
  }
}

export function hapticLight() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticSuccess() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function hapticError() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
