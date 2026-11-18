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
export { TourDetailHeader } from './components/TourDetailHeader';
export { TourTitleBlock } from './components/TourTitleBlock';
export { TourFactStrip } from './components/TourFactStrip';
export { TourAbout } from './components/TourAbout';
export { TourSectionRow, SectionIcon } from './components/TourSectionRow';
export { TourSectionSheet } from './components/TourSectionSheet';
export {
  SectionBody,
  SectionEmpty,
  ItineraryBody,
  ListBody,
  PricingBody,
  TextBody,
  isSectionEmpty,
} from './components/sectionBodies';

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
  SpiritualTourFact,
  SpiritualTourFactIcon,
  SpiritualTourIcon,
  SpiritualTourInfoSection,
  SpiritualTourItineraryDay,
  SpiritualTourPlace,
  SpiritualTourPrice,
  SpiritualTourRegion,
  SpiritualTourSection,
  SpiritualTourSectionIcon,
} from './types';
