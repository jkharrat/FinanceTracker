import { renderHook, act } from '@testing-library/react-native';
import { useShake } from '../hooks/useShake';

jest.mock('../utils/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticError: jest.fn(),
}));

describe('useShake', () => {
  it('returns shakeStyle and triggerShake', () => {
    const { result } = renderHook(() => useShake());
    expect(result.current).toHaveProperty('shakeStyle');
    expect(result.current).toHaveProperty('triggerShake');
  });

  it('triggerShake is a function', () => {
    const { result } = renderHook(() => useShake());
    expect(typeof result.current.triggerShake).toBe('function');
  });

  it('triggerShake can be called without throwing', () => {
    const { result } = renderHook(() => useShake());
    expect(() => {
      act(() => {
        result.current.triggerShake();
      });
    }).not.toThrow();
  });

  it('shakeStyle is an object', () => {
    const { result } = renderHook(() => useShake());
    expect(typeof result.current.shakeStyle).toBe('object');
  });

  it('calls hapticError when triggered', () => {
    const { hapticError } = require('../utils/haptics');
    const { result } = renderHook(() => useShake());
    act(() => {
      result.current.triggerShake();
    });
    expect(hapticError).toHaveBeenCalled();
  });

  it('can be triggered multiple times', () => {
    const { result } = renderHook(() => useShake());
    expect(() => {
      act(() => {
        result.current.triggerShake();
        result.current.triggerShake();
        result.current.triggerShake();
      });
    }).not.toThrow();
  });
});
