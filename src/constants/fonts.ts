import { Platform } from 'react-native';

export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

type FontWeight = '400' | '500' | '600' | '700' | '800';

const weightToFamily: Record<FontWeight, string> = {
  '400': FontFamily.regular,
  '500': FontFamily.medium,
  '600': FontFamily.semiBold,
  '700': FontFamily.bold,
  '800': FontFamily.extraBold,
};

/**
 * Returns cross-platform font style props.
 * On native, fontFamily alone carries the weight; on web we also set fontWeight
 * so the browser picks the correct variation.
 */
export function fontStyle(weight: FontWeight = '400') {
  return {
    fontFamily: weightToFamily[weight],
    ...(Platform.OS === 'web' ? { fontWeight: weight as any } : {}),
  };
}
