import notifee, {
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
} from '@notifee/react-native';
import { createNotifeeNotifier } from '..';
import { nextMorningTimestamp } from '../../../core/notifications';

const FIXED_NOW = new Date(2026, 7, 15, 6, 0, 0); // 06:00 local → today 07:30

describe('createNotifeeNotifier (AC-3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('AC-3: scheduleMorning schedules a DAILY timestamp trigger at the next 07:30 with a fixed id', async () => {
    await createNotifeeNotifier(() => FIXED_NOW).scheduleMorning();

    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
    const [notification, trigger] = (
      notifee.createTriggerNotification as jest.Mock
    ).mock.calls[0];
    expect(trigger).toEqual({
      type: TriggerType.TIMESTAMP,
      timestamp: nextMorningTimestamp(FIXED_NOW),
      repeatFrequency: RepeatFrequency.DAILY,
    });
    expect(notification.id).toBe('powietrze-morning');
    expect(notifee.createChannel).toHaveBeenCalledTimes(1);
  });

  test('AC-3: scheduleMorning honors a custom time', async () => {
    await createNotifeeNotifier(() => FIXED_NOW).scheduleMorning('08:15');
    const [, trigger] = (notifee.createTriggerNotification as jest.Mock).mock
      .calls[0];
    expect(trigger.timestamp).toBe(nextMorningTimestamp(FIXED_NOW, '08:15'));
  });

  test('AC-3: cancelMorning cancels the fixed-id trigger', async () => {
    await createNotifeeNotifier(() => FIXED_NOW).cancelMorning();
    expect(notifee.cancelTriggerNotification).toHaveBeenCalledWith(
      'powietrze-morning',
    );
  });

  test('AC-3: requestPermission maps AUTHORIZED → true', async () => {
    (notifee.requestPermission as jest.Mock).mockResolvedValueOnce({
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    });
    await expect(
      createNotifeeNotifier(() => FIXED_NOW).requestPermission(),
    ).resolves.toBe(true);
  });

  test('AC-3: requestPermission maps PROVISIONAL → true', async () => {
    (notifee.requestPermission as jest.Mock).mockResolvedValueOnce({
      authorizationStatus: AuthorizationStatus.PROVISIONAL,
    });
    await expect(
      createNotifeeNotifier(() => FIXED_NOW).requestPermission(),
    ).resolves.toBe(true);
  });

  test('AC-3: requestPermission maps DENIED → false', async () => {
    (notifee.requestPermission as jest.Mock).mockResolvedValueOnce({
      authorizationStatus: AuthorizationStatus.DENIED,
    });
    await expect(
      createNotifeeNotifier(() => FIXED_NOW).requestPermission(),
    ).resolves.toBe(false);
  });
});
