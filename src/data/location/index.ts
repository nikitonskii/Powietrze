import Geo from '@react-native-community/geolocation';
import type { Geolocation } from '../../core/geo';

// Wraps @react-native-community/geolocation behind the pure Geolocation
// interface. No IO at construction — the OS permission prompt fires on the
// first getCurrentPosition() call. iOS Info.plist carries the usage string.
export function createDeviceGeolocation(): Geolocation {
  return {
    getCurrentPosition() {
      return new Promise((resolve, reject) => {
        Geo.getCurrentPosition(
          pos =>
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          err => reject(new Error(err.message)),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
        );
      });
    },
  };
}
