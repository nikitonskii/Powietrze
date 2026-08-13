export type TrendArrow = '↑' | '↓' | '→';

// The Miejsca-row trend glyph, by absolute index (design Powietrze.dc.html:493):
// worsening (>85) ↑, clean (<40) ↓, moderate (else) →. Tinted the scene key
// color at the call site.
export function trendArrow(index: number): TrendArrow {
  return index > 85 ? '↑' : index < 40 ? '↓' : '→';
}
