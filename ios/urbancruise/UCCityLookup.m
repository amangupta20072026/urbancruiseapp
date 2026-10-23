/**
 * City name for a coordinate, using Apple's built-in CLGeocoder
 * (no API key, no paid service).
 * https://developer.apple.com/documentation/corelocation/clgeocoder
 *
 * Best-effort: every failure resolves nil (JS null) so the user types the
 * city. Failures include: no network, Apple's rate limit
 * (kCLErrorNetwork), no result, or a result without a locality. Only
 * CLPlacemark.locality is returned; district and state are not cities.
 *
 * Names are requested in English for India (en_IN) so they match the
 * spelling the CRM uses.
 *
 * Written in Objective-C so the project needs no Swift bridging header.
 *
 * JS: NativeModules.CityLookup.fromCoordinates(lat, lng): Promise<string | null>
 */

#import <CoreLocation/CoreLocation.h>
#import <React/RCTBridgeModule.h>
#import <os/log.h>

@interface UCCityLookup : NSObject <RCTBridgeModule>
@end

@implementation UCCityLookup {
  // One instance: CLGeocoder runs one request at a time, and Apple asks
  // apps not to send more than one request per user action.
  CLGeocoder *_geocoder;
}

RCT_EXPORT_MODULE(CityLookup);

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (instancetype)init
{
  if ((self = [super init])) {
    _geocoder = [CLGeocoder new];
  }
  return self;
}

static os_log_t UCCityLookupLog(void)
{
  static os_log_t log;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    log = os_log_create("app.urbancruise", "UCCityLookup");
  });
  return log;
}

RCT_EXPORT_METHOD(fromCoordinates : (double)latitude
                  longitude : (double)longitude
                  resolve : (RCTPromiseResolveBlock)resolve
                  reject : (RCTPromiseRejectBlock)reject)
{
  CLLocationCoordinate2D coordinate = CLLocationCoordinate2DMake(latitude, longitude);
  if (!CLLocationCoordinate2DIsValid(coordinate)) {
    os_log(UCCityLookupLog(), "Rejected invalid coordinate");
    resolve([NSNull null]);
    return;
  }

  // CLGeocoder is not thread-safe; use it only on the main queue.
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self->_geocoder.isGeocoding) {
      os_log(UCCityLookupLog(), "A lookup is already running");
      resolve([NSNull null]);
      return;
    }

    CLLocation *location = [[CLLocation alloc] initWithLatitude:latitude longitude:longitude];
    NSLocale *locale = [NSLocale localeWithLocaleIdentifier:@"en_IN"];

    [self->_geocoder
        reverseGeocodeLocation:location
               preferredLocale:locale
             completionHandler:^(NSArray<CLPlacemark *> *_Nullable placemarks, NSError *_Nullable error) {
               if (error != nil) {
                 os_log(UCCityLookupLog(), "Geocoder error: %{public}ld", (long)error.code);
                 resolve([NSNull null]);
                 return;
               }
               NSString *city = [placemarks.firstObject.locality
                   stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
               if (city.length == 0) {
                 os_log(UCCityLookupLog(), "No locality in the geocoder result");
                 resolve([NSNull null]);
                 return;
               }
               resolve(city);
             }];
  });
}

@end