import Config from 'react-native-config';

export const ENV = {
  apiUrl: Config.API_BASE_URL,
  socketUrl: Config.SOCKET_URL,

  imageBaseUrl: Config.IMAGE_BASE_URL,
  pdfBaseUrl: Config.PDF_BASE_URL,

  apiTimeout: Number(Config.API_TIMEOUT),

  defaultCountry: Config.DEFAULT_COUNTRY,
  defaultCurrency: Config.DEFAULT_CURRENCY,

  locationInterval: Number(Config.LOCATION_INTERVAL),
  locationDistance: Number(Config.LOCATION_DISTANCE),
};
