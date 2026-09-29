import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { ThemeColors } from './colors';
import { fontStyle } from './fonts';

export function stackScreenOptions(colors: ThemeColors, isDark: boolean): NativeStackNavigationOptions {
  const header: NativeStackNavigationOptions = Platform.OS === 'ios'
    ? {
        headerTransparent: true,
        headerBlurEffect: isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial',
        headerStyle: { backgroundColor: 'transparent' },
      }
    : {
        headerStyle: { backgroundColor: colors.background },
      };

  return {
    ...header,
    headerTintColor: colors.text,
    headerTitleStyle: {
      ...(fontStyle('600') as { fontFamily: string }),
      fontSize: 17,
    },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
    animation: Platform.OS === 'android' ? 'ios_from_right' : 'default',
  };
}

export const rootTitleOptions: NativeStackNavigationOptions = {
  headerTitleStyle: {
    ...(fontStyle('700') as { fontFamily: string }),
    fontSize: 20,
  },
};

export const modalScreenOptions: NativeStackNavigationOptions = {
  presentation: 'modal',
  animation: Platform.OS === 'ios' ? 'default' : 'fade_from_bottom',
};
