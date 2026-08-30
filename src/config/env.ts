import Config from 'react-native-config';

export const ENV = {
  appName: Config.APP_NAME,
  environment: Config.APP_ENV,

  apiUrl: Config.API_BASE_URL,
  socketUrl: Config.SOCKET_URL,

  googleMapsKey: Config.GOOGLE_MAPS_API_KEY,

  razorpayKey: Config.RAZORPAY_KEY_ID,
  payuMerchantKey: Config.PAYU_MERCHANT_KEY,

  firebaseProjectId: Config.FIREBASE_PROJECT_ID,
  firebaseAppId: Config.FIREBASE_APP_ID,
  firebaseSenderId: Config.FIREBASE_SENDER_ID,

  imageBaseUrl: Config.IMAGE_BASE_URL,
  pdfBaseUrl: Config.PDF_BASE_URL,

  apiTimeout: Number(Config.API_TIMEOUT),

  enableLogs: Config.ENABLE_LOGS === 'true',
  enableAnalytics: Config.ENABLE_ANALYTICS === 'true',
  enableCrashlytics: Config.ENABLE_CRASHLYTICS === 'true',

  defaultCountry: Config.DEFAULT_COUNTRY,
  defaultCurrency: Config.DEFAULT_CURRENCY,

  locationInterval: Number(Config.LOCATION_INTERVAL),
  locationDistance: Number(Config.LOCATION_DISTANCE),
};
