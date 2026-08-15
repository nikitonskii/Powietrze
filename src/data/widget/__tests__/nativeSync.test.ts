import { NativeModules } from 'react-native';
import { createNativeWidgetSync } from '..';
import type { WidgetSnapshot } from '../../../core/widget';

const SNAP: WidgetSnapshot = {
  version: 1,
  city: 'K',
  stationLabel: 'S',
  displayValue: '5',
  scaleCaption: 'µg/m³',
  band: 'Dobry',
  keyHex: '#5fe3a1',
  deepHex: '#04231a',
  midHex: '#0a3a2a',
  tiles: [],
  measuredAt: 't',
};

// react-native's NativeModules type is a loose index; narrow it here so the
// test can add/remove the WidgetSync entry without `any`.
type NativeModulesRecord = Record<string, unknown>;
const nativeModules = NativeModules as unknown as NativeModulesRecord;

describe('createNativeWidgetSync (AC-4)', () => {
  afterEach(() => {
    delete nativeModules.WidgetSync;
  });

  test('AC-4: native module absent → publish is a safe no-op', () => {
    delete nativeModules.WidgetSync;
    expect(() => createNativeWidgetSync().publish(SNAP)).not.toThrow();
  });

  test('AC-4: module present → writeSnapshot(json) then reloadTimelines', () => {
    const writeSnapshot = jest.fn();
    const reloadTimelines = jest.fn();
    nativeModules.WidgetSync = { writeSnapshot, reloadTimelines };

    createNativeWidgetSync().publish(SNAP);

    expect(writeSnapshot).toHaveBeenCalledWith(JSON.stringify(SNAP));
    expect(reloadTimelines).toHaveBeenCalled();
  });
});
