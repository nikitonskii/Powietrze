export type ColorProp = 'key' | 'deep' | 'mid';
export type Rgb = readonly [number, number, number];
export type BandIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type BandName =
  | 'Bardzo dobry'
  | 'Dobry'
  | 'Umiarkowany'
  | 'Dostateczny'
  | 'Zły'
  | 'Bardzo zły';

export interface Anchor {
  readonly v: number;
  readonly key: string;
  readonly deep: string;
  readonly mid: string;
}

export interface Scene {
  readonly key: string;
  readonly deep: string;
  readonly mid: string;
  readonly rgb: Rgb;
  readonly band: BandName;
  readonly advice: string;
  readonly pm25: number;
  readonly pm10: number;
  readonly no2: number;
  readonly density: number;
}
