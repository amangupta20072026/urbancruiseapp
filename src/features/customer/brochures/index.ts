export { default as VehicleBrochuresScreen } from './screens/VehicleBrochuresScreen';
export { default as VehicleVideoScreen } from './screens/VehicleVideoScreen';
export { default as CompareVehiclesScreen } from './screens/CompareVehiclesScreen';

export { BrochureActionRow } from './components/BrochureActionRow';
export type {
  BrochureActionRowProps,
  BrochureVideoState,
} from './components/BrochureActionRow';
export {
  ViewAllVehiclesLink,
  WatchVehicleVideoButton,
} from './components/BrochureLinks';
export { TierPill } from './components/TierPill';
export {
  BrochurePlayer,
  isInAppPlayerEnabled,
} from './components/BrochurePlayer';
export { YouTubePlayer } from './components/YouTubePlayer';
export type {
  YouTubePlayerProps,
  YouTubePlayerErrorCode,
} from './components/YouTubePlayer';

export { openBrochureInYouTube } from './utils/openInYouTube';
export type { BrochureOpenSource } from './utils/openInYouTube';

export {
  useBrochures,
  useBrochureFor,
  useGroupedBrochures,
  BROCHURE_STALE_TIME_MS,
} from './hooks/useBrochures';
export type {
  BrochureForResult,
  GroupedBrochuresResult,
} from './hooks/useBrochures';

export { fetchBrochureCatalog } from './api';
export {
  parseBrochureCatalog,
  isYouTubeId,
  BrochureCatalogFormatError,
} from './schema';

export { groupBrochures } from './utils/grouping';
export {
  findBrochure,
  findBrochureByGroupKey,
  lookupForVehicleOption,
  hasVideo,
  vehicleOptionIdsFor,
} from './utils/match';
export {
  buildYouTubeWatchUrl,
  buildYouTubePlaylistUrl,
  buildYouTubeUrlForEntry,
} from './utils/youtube';

export type {
  BrochureTier,
  BrochureSpecs,
  BrochureEntry,
  BrochureSeaterGroup,
  BrochureVehicleTypeGroup,
  BrochureLookup,
} from './types';
