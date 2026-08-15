export const colors = {
  base: '#07090d',
  accent: '#8fb7ff',
  success: '#34c759',
  danger: '#ff453a',
  shadow: '#000000',
  text: {
    primary: 'rgba(255,255,255,1)',
    high: 'rgba(255,255,255,0.92)',
    mid: 'rgba(255,255,255,0.72)',
    label: 'rgba(255,255,255,0.62)',
    dim: 'rgba(255,255,255,0.5)',
    inactive: 'rgba(255,255,255,0.45)',
    faint: 'rgba(255,255,255,0.4)',
    footer: 'rgba(255,255,255,0.35)',
    muted: 'rgba(255,255,255,0.55)',
  },
  tabBar: {
    bg: 'rgba(10,12,17,0.55)',
    border: 'rgba(255,255,255,0.08)',
  },
  card: 'rgba(255,255,255,0.06)',
  // Opaque equivalent of `card` composited over `base` — visually identical over
  // the solid Miejsca screen, but OPAQUE so a swiped row occludes the delete
  // action behind it (a translucent foreground lets the action bleed through).
  cardSolid: '#16181c',
  glass: 'rgba(255,255,255,0.07)',
  glassBorder: 'rgba(255,255,255,0.09)',
  control: {
    trackOff: 'rgba(255,255,255,0.18)',
    segBg: 'rgba(255,255,255,0.08)',
    segActive: 'rgba(255,255,255,0.16)',
    divider: 'rgba(255,255,255,0.06)',
  },
} as const;

export const type = {
  index: { size: 128, weight: '600', letterSpacing: -3 },
  band: { size: 22, weight: '500', letterSpacing: 0 },
  city: { size: 30, weight: '500', letterSpacing: 0 },
  label: { size: 12, weight: '600', letterSpacing: 2.4 },
  station: { size: 12.5, weight: '400', letterSpacing: 0 },
  pm: { size: 14, weight: '400', letterSpacing: 0 },
  advice: { size: 16, weight: '400', letterSpacing: 0 },
  tab: { size: 10.5, weight: '500', letterSpacing: 0 },
} as const;

export const spacing = {
  screenH: 24,
  screenTop: 70,
  screenBottom: 130,
  rowGap: 12,
  rowV: 14,
  cardH: 16,
} as const;
