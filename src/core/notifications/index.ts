export const MORNING_TIME = '07:30';

// The seam features/settings use; the @notifee adapter (data layer) implements it,
// a fake in tests. Never import @notifee outside that adapter.
export interface Notifier {
  requestPermission(): Promise<boolean>;
  scheduleMorning(time?: string): Promise<void>;
  cancelMorning(): Promise<void>;
}

// Epoch-ms of the NEXT occurrence of HH:MM in LOCAL wall-clock time: today if
// `now` is strictly before it, else tomorrow (a notifee TimestampTrigger needs a
// future time). `now` is injected (pure/testable).
export function nextMorningTimestamp(
  now: Date,
  time: string = MORNING_TIME,
): number {
  const [h, m] = time.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime();
}
