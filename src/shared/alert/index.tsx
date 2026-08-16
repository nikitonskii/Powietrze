import { useEffect, useRef, type ReactNode } from 'react';
import type { ActivePlace } from '../../core/places';
import type { Notifier } from '../../core/notifications';
import { smogAlertDecision } from '../../core/alert';
import { useActivePlace } from '../place';
import { useSettings, type SettingsApi } from '../settings';

// Same placeKey expression as usePlaceReading.ts — kept in sync deliberately
// (both derive a stable per-place identity from ActivePlace).
function placeKeyFor(place: ActivePlace): string {
  return place.kind === 'location' ? 'location' : `station:${place.station.id}`;
}

// Requests notification permission when `alert` turns on; denial reverts the
// toggle (persisted). Mirrors NotificationsProvider's morning-toggle effect.
function useAlertPermission(
  alert: boolean,
  notifier: Notifier,
  set: SettingsApi['set'],
): void {
  useEffect(() => {
    let isActive = true;
    if (alert) {
      notifier.requestPermission().then(granted => {
        if (!isActive) return;
        if (!granted) set('alert', false);
      });
    }
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on alert; `set` intentionally excluded (not referentially stable)
  }, [alert, notifier]);
}

// Fires a local smog notification on a rising CAQI-index crossing of
// `threshold`, deduped per active place (spec 019 S2) and honoring quiet
// hours + the `alert` toggle (see src/core/alert).
export function SmogAlertProvider({
  notifier,
  now,
  children,
}: {
  notifier: Notifier;
  now?: () => Date;
  children: ReactNode;
}) {
  const { active, status, reading } = useActivePlace();
  const { settings, set } = useSettings();
  const { alert, threshold } = settings;
  const clock = now ?? (() => new Date());
  const mapRef = useRef(new Map<string, boolean>());

  useAlertPermission(alert, notifier, set);

  useEffect(() => {
    if (status !== 'ready' || !reading) return;
    const map = mapRef.current;
    const placeKey = placeKeyFor(active);
    const prev = map.get(placeKey) ?? false;
    const d = smogAlertDecision(
      { wasAbove: prev },
      { index: reading.index, threshold, alertOn: alert, now: clock() },
    );
    map.set(placeKey, d.wasAbove);
    if (d.fire) notifier.notifySmog(reading.index);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on status/reading/alert/threshold per spec; `active`/`notifier`/`clock` intentionally excluded — all three are only READ when the effect fires, not used as reactive triggers: `active` reflects the current place at fire-time, `notifier` is a stable app-level instance, and `clock` (a fresh closure each render) always samples "now" at invocation regardless of which render created it.
  }, [status, reading, alert, threshold]);

  return <>{children}</>;
}
