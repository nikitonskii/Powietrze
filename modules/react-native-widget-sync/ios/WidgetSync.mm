#import <React/RCTBridgeModule.h>

// Exposes the Swift `WidgetSync` class to React Native. Under the New Architecture
// (bridgeless) this legacy-registered module is served via the interop layer, so
// `TurboModuleRegistry.get('WidgetSync')` on the JS side resolves it.
@interface RCT_EXTERN_MODULE(WidgetSync, NSObject)

RCT_EXTERN_METHOD(writeSnapshot:(NSString *)json)
RCT_EXTERN_METHOD(reloadTimelines)

@end
