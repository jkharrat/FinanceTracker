import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Kid } from '../types';
import {
  MoneyArrival,
  SeenMarker,
  findArrivals,
  lastSeenKey,
  markerFor,
  parseMarker,
  sameMarker,
} from '../utils/moneyArrived';

/**
 * Tracks what the kid last saw on their dashboard and reports money that arrived since.
 * The first load for a kid only records a marker, so nothing is celebrated retroactively.
 * Pass `visible = false` while the screen is hidden or data is still loading.
 */
export function useMoneyArrived(kid: Kid | undefined, visible: boolean) {
  const kidId = kid?.id;
  const [arrival, setArrival] = useState<MoneyArrival | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const seenRef = useRef<SeenMarker | null>(null);

  useEffect(() => {
    if (!kidId) return;
    let cancelled = false;
    setLoadedFor(null);
    AsyncStorage.getItem(lastSeenKey(kidId))
      .then((raw) => {
        if (cancelled) return;
        seenRef.current = parseMarker(raw);
        setLoadedFor(kidId);
      })
      .catch(() => {
        if (cancelled) return;
        seenRef.current = null;
        setLoadedFor(kidId);
      });
    return () => { cancelled = true; };
  }, [kidId]);

  useEffect(() => {
    if (!kid || !visible || loadedFor !== kid.id || arrival) return;
    const current = markerFor(kid);
    const seen = seenRef.current;
    if (seen && sameMarker(seen, current)) return;

    if (seen) {
      const found = findArrivals(kid, seen);
      if (found) setArrival(found);
    }
    seenRef.current = current;
    AsyncStorage.setItem(lastSeenKey(kid.id), JSON.stringify(current)).catch(() => {});
  }, [kid, visible, loadedFor, arrival]);

  const dismiss = useCallback(() => setArrival(null), []);

  return { arrival, dismiss };
}
