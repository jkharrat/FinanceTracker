import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider, useTheme, useColors } from '../context/ThemeContext';
import { LightColors, DarkColors, ACCENT_PALETTES, resolveColors } from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

function ThemeConsumer() {
  const { mode, isDark, colors, accentPalette } = useTheme();
  return (
    <>
      <Text testID="mode">{mode}</Text>
      <Text testID="isDark">{String(isDark)}</Text>
      <Text testID="bg">{colors.background}</Text>
      <Text testID="accent">{accentPalette}</Text>
      <Text testID="primary">{colors.primary}</Text>
    </>
  );
}

function ColorsConsumer() {
  const colors = useColors();
  return <Text testID="primary">{colors.primary}</Text>;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('renders children after loading', async () => {
    const { findByText } = render(
      <ThemeProvider>
        <Text>Child Content</Text>
      </ThemeProvider>
    );
    expect(await findByText('Child Content')).toBeTruthy();
  });

  it('defaults to system mode', async () => {
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const modeEl = await findByTestId('mode');
    expect(modeEl.props.children).toBe('system');
  });

  it('uses light colors when system is light', async () => {
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const bgEl = await findByTestId('bg');
    expect(bgEl.props.children).toBe(LightColors.background);
  });

  it('restores saved theme from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const modeEl = await findByTestId('mode');
    expect(modeEl.props.children).toBe('dark');
  });

  it('provides isDark=true when mode is dark', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const isDark = await findByTestId('isDark');
    expect(isDark.props.children).toBe('true');
  });

  it('provides isDark=false when mode is light', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('light');
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const isDark = await findByTestId('isDark');
    expect(isDark.props.children).toBe('false');
  });

  it('provides dark colors when mode is dark', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const bgEl = await findByTestId('bg');
    expect(bgEl.props.children).toBe(DarkColors.background);
  });

  it('ignores invalid stored theme value', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-theme');
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const modeEl = await findByTestId('mode');
    expect(modeEl.props.children).toBe('system');
  });

  it('handles AsyncStorage read error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('storage error'));
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const modeEl = await findByTestId('mode');
    expect(modeEl.props.children).toBe('system');
    consoleSpy.mockRestore();
  });
});

describe('useColors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('returns color values', async () => {
    const { findByTestId } = render(
      <ThemeProvider>
        <ColorsConsumer />
      </ThemeProvider>
    );
    const primaryEl = await findByTestId('primary');
    expect(primaryEl.props.children).toBe(LightColors.primary);
  });
});

describe('useTheme outside provider', () => {
  it('throws error when used outside ThemeProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<ThemeConsumer />);
    }).toThrow('useTheme must be used within a ThemeProvider');
    consoleError.mockRestore();
  });
});

describe('Accent palette persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('defaults to purple accent', async () => {
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const accent = await findByTestId('accent');
    expect(accent.props.children).toBe('purple');
  });

  it('restores saved accent from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@finance_tracker_accent') return Promise.resolve('blue');
      return Promise.resolve(null);
    });
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const accent = await findByTestId('accent');
    expect(accent.props.children).toBe('blue');
  });

  it('applies accent colors when restored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@finance_tracker_accent') return Promise.resolve('rose');
      return Promise.resolve(null);
    });
    const rosePalette = ACCENT_PALETTES.find((p) => p.id === 'rose')!;
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const primary = await findByTestId('primary');
    expect(primary.props.children).toBe(rosePalette.light.primary);
  });

  it('ignores invalid accent value from storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@finance_tracker_accent') return Promise.resolve('invalid-accent');
      return Promise.resolve(null);
    });
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const accent = await findByTestId('accent');
    expect(accent.props.children).toBe('purple');
  });

  it('restores both theme mode and accent together', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@finance_tracker_theme') return Promise.resolve('dark');
      if (key === '@finance_tracker_accent') return Promise.resolve('teal');
      return Promise.resolve(null);
    });
    const tealPalette = ACCENT_PALETTES.find((p) => p.id === 'teal')!;
    const { findByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const mode = await findByTestId('mode');
    const accent = await findByTestId('accent');
    const primary = await findByTestId('primary');
    expect(mode.props.children).toBe('dark');
    expect(accent.props.children).toBe('teal');
    expect(primary.props.children).toBe(tealPalette.dark.primary);
  });
});
