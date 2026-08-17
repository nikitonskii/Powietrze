export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 7;

export function isQuietHour(now: Date): boolean {
  const h = now.getHours();
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
}

export interface SmogInput {
  index: number;
  threshold: number;
  alertOn: boolean;
  now: Date;
}
export interface SmogDecision {
  fire: boolean;
  wasAbove: boolean;
}

export function smogAlertDecision(
  prev: { wasAbove: boolean },
  input: SmogInput,
): SmogDecision {
  if (!input.alertOn) return { fire: false, wasAbove: false };
  if (isQuietHour(input.now)) return { fire: false, wasAbove: prev.wasAbove };
  const above = input.index >= input.threshold;
  return { fire: above && !prev.wasAbove, wasAbove: above };
}
