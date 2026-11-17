/**
 * Spiritual Tours — public surface of the feature.
 * Screens are imported by CustomerNavigator; everything else is
 * exported for tests and for future surfaces (e.g. a home-screen
 * teaser row) that will want the same cached catalog.
 */
export { default as SpiritualToursScreen } from './screens/SpiritualToursScreen';
export { default as SpiritualTourDetailScreen } from './screens/SpiritualTourDetailScreen';

/* ---- List screen ---- */
export { TourCard, subtitleFor } from './components/TourCard';
export { AdvisorCallBar } from './components/AdvisorCallBar';
export { TourIcon } from './components/TourIcon';
export { TourThumbnail } from './components/TourThumbnail';
export { RegionHeader } from './components/RegionHeader';
export { SpiritualToursHero, HERO_BG } from './components/SpiritualToursHero';

/* ---- Detail screen ---- */
export { TourHeroCarousel } from './components/TourHeroCarousel';
export { DestinationTiles } from './components/DestinationTiles';
export { TourFactStrip } from './components/TourFactStrip';
export { TourHighlights } from './components/TourHighlights';
export { TourDetailFooter } from './components/TourDetailFooter';
export {
  TourTabBar,
  TOUR_TABS,
  TOUR_TAB_LABEL,
  type TourTab,
} from './components/TourTabBar';
export { OverviewTab } from './components/tabs/OverviewTab';
export { ItineraryTab } from './components/tabs/ItineraryTab';
export { ListTab } from './components/tabs/ListTab';
export { PricingTab } from './components/tabs/PricingTab';
export { SectionHeading, TabEmpty } from './components/tabs/TabPieces';

/* ---- Data ---- */
export {
  useSpiritualTours,
  useSpiritualTour,
  useTourSections,
} from './hooks/useSpiritualTours';
export type {
  SpiritualTourResult,
  TourSectionsResult,
} from './hooks/useSpiritualTours';

export { fetchSpiritualTours } from './api';
export {
  parseSpiritualTourCatalog,
  isHttpsUrl,
  SpiritualTourFormatError,
} from './schema';
export { groupToursByRegion, findTourById } from './utils/grouping';
export { TOUR_IMAGES, bundledTourImage } from './tourImages';

export { REGION_LABEL } from './types';
export type {
  SpiritualTour,
  SpiritualTourFacts,
  SpiritualTourIcon,
  SpiritualTourItineraryDay,
  SpiritualTourPlace,
  SpiritualTourPrice,
  SpiritualTourRegion,
  SpiritualTourSection,
} from './types';
