import { useEffect, type ReactNode } from 'react';
import type { Notifier } from '../../core/notifications';
import { useSettings } from '../settings';

// Drives local notifications from settings.morning. On enable: request permission
// → schedule (or revert the toggle on denial). On disable: cancel. Idempotent
// (adapter uses a fixed id) so cold-launch hydration schedules exactly once.
export function NotificationsProvider({
  notifier,
  children,
}: {
  notifier: Notifier;
  children: ReactNode;
}) {
  const { settings, set } = useSettings();
  const morning = settings.morning;
  useEffect(() => {
    let active = true;
    if (morning) {
      notifier.requestPermission().then(granted => {
        if (!active) return;
        if (granted) notifier.scheduleMorning();
        else set('morning', false);
      });
    } else {
      notifier.cancelMorning();
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on morning; `set` intentionally excluded (not referentially stable)
  }, [morning, notifier]);
  return <>{children}</>;
}
