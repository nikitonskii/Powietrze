import notifee, {
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
  AndroidImportance,
  type TimestampTrigger,
} from '@notifee/react-native';
import {
  MORNING_TIME,
  nextMorningTimestamp,
  type Notifier,
} from '../../core/notifications';

// A FIXED id so re-scheduling REPLACES rather than duplicating the daily notif.
const MORNING_ID = 'powietrze-morning';
const MORNING_CHANNEL = 'powietrze-morning';

// The @notifee implementation of the pure `Notifier` seam. `now` is injectable
// for tests (defaults to the wall clock). This is the ONLY module that imports
// @notifee — features/settings use the `Notifier` interface. Content is generic
// (a local scheduled notif's body is fixed at schedule time — no live-data/city
// access here; that needs the deferred background fetch).
export function createNotifeeNotifier(
  now: () => Date = () => new Date(),
): Notifier {
  return {
    async requestPermission() {
      const { authorizationStatus } = await notifee.requestPermission();
      return (
        authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        authorizationStatus === AuthorizationStatus.PROVISIONAL
      );
    },

    async scheduleMorning(time: string = MORNING_TIME) {
      // Channel is Android-only (iOS ignores it); create before scheduling so the
      // repeating notification has a valid channel on Android.
      await notifee.createChannel({
        id: MORNING_CHANNEL,
        name: 'Poranne podsumowanie',
        importance: AndroidImportance.DEFAULT,
      });
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: nextMorningTimestamp(now(), time),
        repeatFrequency: RepeatFrequency.DAILY,
      };
      await notifee.createTriggerNotification(
        {
          id: MORNING_ID,
          title: 'Poranny raport',
          body: 'Sprawdź dziś jakość powietrza',
          android: { channelId: MORNING_CHANNEL },
        },
        trigger,
      );
    },

    async cancelMorning() {
      await notifee.cancelTriggerNotification(MORNING_ID);
    },
  };
}
