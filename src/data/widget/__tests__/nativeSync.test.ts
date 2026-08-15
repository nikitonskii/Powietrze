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

// The Turbo Module is a static import in the adapter, so each case mocks
// `react-native-widget-sync`'s default export (the module, or null when absent)
// and re-requires the adapter fresh.
describe('createNativeWidgetSync (AC-4)', () => {
  beforeEach(() => {
    jest.resetModules();
  });
  afterEach(() => {
    jest.resetModules();
  });

  test('AC-4: native module absent → publish is a safe no-op', () => {
    jest.doMock('react-native-widget-sync', () => ({
      __esModule: true,
      default: null,
    }));
    const { createNativeWidgetSync } = require('..');
    expect(() => createNativeWidgetSync().publish(SNAP)).not.toThrow();
  });

  test('AC-4: module present → writeSnapshot(json) then reloadTimelines', () => {
    const writeSnapshot = jest.fn();
    const reloadTimelines = jest.fn();
    jest.doMock('react-native-widget-sync', () => ({
      __esModule: true,
      default: { writeSnapshot, reloadTimelines },
    }));
    const { createNativeWidgetSync } = require('..');

    createNativeWidgetSync().publish(SNAP);

    expect(writeSnapshot).toHaveBeenCalledWith(JSON.stringify(SNAP));
    expect(reloadTimelines).toHaveBeenCalled();
  });
});
