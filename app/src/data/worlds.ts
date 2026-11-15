// Text and facts for the world pages. The prose is written for this project. Every number and date
// is read from the NASA page cited next to it (accessed 2026-11-15) and none comes from memory.
import type { WorldId } from '../components/Worlds';

export interface WorldSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
}

const ACCESSED = '2026-11-15';
export const WORLD_SOURCES_ACCESSED = ACCESSED;

export const WORLD_SOURCES: WorldSource[] = [
  { id: 'earthfact', title: 'Earth Fact Sheet (last updated 15 November 2024)', publisher: 'NASA NSSDCA, D. R. Williams', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html' },
  { id: 'moonfact', title: 'Moon Fact Sheet (last updated 11 January 2024)', publisher: 'NASA NSSDCA, D. R. Williams', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html' },
  { id: 'marsfact', title: 'Mars Fact Sheet (last updated 19 May 2025)', publisher: 'NASA NSSDCA, D. R. Williams', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html' },
  { id: 'analog', title: 'Analog Missions', publisher: 'NASA', url: 'https://www.nasa.gov/analog-missions/' },
  { id: 'apollo11', title: 'Apollo 11', publisher: 'NASA', url: 'https://www.nasa.gov/mission/apollo-11/' },
  { id: 'lro', title: 'Lunar Reconnaissance Orbiter', publisher: 'NASA Science', url: 'https://science.nasa.gov/mission/lro/' },
  { id: 'artemis', title: "Moon to Mars: NASA's Artemis Program", publisher: 'NASA', url: 'https://www.nasa.gov/humans-in-space/artemis/' },
  { id: 'viking1', title: 'Viking 1', publisher: 'NASA Science', url: 'https://science.nasa.gov/mission/viking-1/' },
  { id: 'msl', title: 'Mars Science Laboratory: Curiosity Rover', publisher: 'NASA Science', url: 'https://science.nasa.gov/mission/msl-curiosity/' },
  { id: 'm2020', title: 'Mars 2020: Perseverance Rover', publisher: 'NASA Science', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/' },
];

export interface Cited {
  text: string;
  /** Ids of WORLD_SOURCES. */
  src: string[];
}

export interface WorldPageData {
  lead: Cited;
  facts: { label: string; value: string; src: string }[];
  history: { when: string; what: string; src: string }[];
  historyTitle: string;
  why: Cited[];
  image: { file: string; alt: string; credit: string };
}

export const WORLD_PAGES: Record<WorldId, WorldPageData> = {
  earth: {
    lead: {
      text: 'Every rehearsal for a base on another world happens here. NASA calls a place used this way an analog: a location with natural or engineered physical similarities to an extreme space environment, used to test systems, protocols and scenarios before crews are sent to space.',
      src: ['analog'],
    },
    facts: [
      { label: 'Volumetric mean radius', value: '6,371.0 km', src: 'earthfact' },
      { label: 'Surface gravity, mean', value: '9.820 m/s²', src: 'earthfact' },
      { label: 'Length of day', value: '24.0000 h', src: 'earthfact' },
      { label: 'Obliquity to orbit', value: '23.44°', src: 'earthfact' },
      { label: 'Surface pressure', value: '1,014 mb', src: 'earthfact' },
      { label: 'Average temperature', value: '288 K (15 °C)', src: 'earthfact' },
      { label: 'Atmosphere, dry air by volume', value: '78.08% nitrogen, 20.95% oxygen', src: 'earthfact' },
      { label: 'Solar irradiance', value: '1,361.0 W/m²', src: 'marsfact' },
    ],
    historyTitle: 'Analog work on Earth',
    history: [
      { when: 'Field stations', what: "Antarctic stations are on NASA's list of analog locations.", src: 'analog' },
      { when: 'HERA', what: 'An analog facility based at Johnson Space Center.', src: 'analog' },
      { when: 'CHAPEA', what: 'Simulates year-long stays on the surface of Mars.', src: 'analog' },
    ],
    why: [
      {
        text: 'Earth offers the terrain, rock, dryness, cold and sunlight that a test needs, but never all of them in one place and never the gravity or the air pressure of the target. SBATS scores the first group cell by cell and lists the second under "What Earth cannot copy".',
        src: ['earthfact'],
      },
      {
        text: 'Most entries on NASA\'s list are built facilities, such as altitude chambers and the Neutral Buoyancy Lab. SBATS looks at the other kind, natural ground, and asks which of it has not been tried yet.',
        src: ['analog'],
      },
    ],
    image: { file: 'blue-marble-2048.jpg', alt: 'Map of Earth without clouds', credit: 'Blue Marble: Shaded Relief and Bathymetry, NASA Earth Observatory, served by NASA GIBS' },
  },
  moon: {
    lead: {
      text: 'The world with the next planned base. NASA describes a Moon Base where astronauts will live, work and explore near the South Pole, as a foundation for the first crewed missions to Mars.',
      src: ['artemis'],
    },
    facts: [
      { label: 'Volumetric mean radius', value: '1,737.4 km', src: 'moonfact' },
      { label: 'Surface gravity', value: '1.62 m/s²', src: 'moonfact' },
      { label: 'Escape velocity', value: '2.38 km/s', src: 'moonfact' },
      { label: 'Distance from Earth, semimajor axis', value: '384,400 km', src: 'moonfact' },
      { label: 'Synodic period, one day and night', value: '29.53 Earth days', src: 'moonfact' },
      { label: 'Obliquity to orbit', value: '6.68°', src: 'moonfact' },
      { label: 'Temperature range at the equator', value: '95 K to 390 K', src: 'moonfact' },
      { label: 'Surface pressure at night', value: '3 × 10⁻¹⁵ bar', src: 'moonfact' },
      { label: 'Solar irradiance', value: '1,361.0 W/m²', src: 'moonfact' },
    ],
    historyTitle: 'Exploration',
    history: [
      { when: '16 July 1969', what: 'Apollo 11 launched.', src: 'apollo11' },
      { when: '20 July 1969', what: 'Apollo 11 landed. The crew called the site Tranquility Base.', src: 'apollo11' },
      { when: '18 June 2009', what: 'Lunar Reconnaissance Orbiter launched. It has mapped the surface and measured its temperature. The terrain and temperature of the lunar targets in SBATS come from its instruments.', src: 'lro' },
      { when: 'Planned', what: 'Artemis: a base near the South Pole.', src: 'artemis' },
    ],
    why: [
      {
        text: 'A day and a night together last 29.53 Earth days, so a base away from the poles sits in the dark for about two weeks at a time. No night on Earth outside the polar circles comes close, which is why the sandbox reports the longest dark period for both places.',
        src: ['moonfact'],
      },
      {
        text: 'Gravity is 1.62 m/s² against 9.82 m/s² on Earth, and the surface pressure at night is 3 × 10⁻¹⁵ bar. Neither can be rehearsed on open ground, so SBATS never scores them.',
        src: ['moonfact', 'earthfact'],
      },
      {
        text: 'The equator swings from 95 K to 390 K. The coldest cell on Earth is far warmer than the cold end, so the app compares against Earth\'s limit and says how much is left over.',
        src: ['moonfact'],
      },
    ],
    image: { file: 'moon-wac-2048.jpg', alt: 'Map of the Moon in grey', credit: 'LROC WAC Global Mosaic, NASA/GSFC/Arizona State University, served by NASA Moon Trek' },
  },
  mars: {
    lead: {
      text: 'The harder target. A day is close to an Earth day, but the air is thin, cold and almost all carbon dioxide, and sunlight is less than half as strong as at Earth.',
      src: ['marsfact'],
    },
    facts: [
      { label: 'Volumetric mean radius', value: '3,389.5 km', src: 'marsfact' },
      { label: 'Surface gravity, mean', value: '3.73 m/s²', src: 'marsfact' },
      { label: 'Length of day', value: '24.6597 h', src: 'marsfact' },
      { label: 'Sidereal orbit period', value: '686.980 days', src: 'marsfact' },
      { label: 'Obliquity to orbit', value: '25.19°', src: 'marsfact' },
      { label: 'Surface pressure at mean radius', value: '6.36 mb (4.0 to 8.7 mb by season)', src: 'marsfact' },
      { label: 'Average temperature', value: 'about 214 K (−59 °C)', src: 'marsfact' },
      { label: 'Daily range at the Viking 1 site', value: '184 K to 242 K', src: 'marsfact' },
      { label: 'Atmosphere, by volume', value: '95.1% carbon dioxide', src: 'marsfact' },
      { label: 'Solar irradiance', value: '586.2 W/m²', src: 'marsfact' },
    ],
    historyTitle: 'Exploration',
    history: [
      { when: '20 July 1976', what: 'Viking 1 touched down at 22.483° N, 47.94° W: in NASA\'s words the first truly successful landing on Mars.', src: 'viking1' },
      { when: '6 August 2012', what: 'Curiosity landed in Gale Crater, to determine whether Mars was ever able to support microbial life. Gale is one of the targets in SBATS.', src: 'msl' },
      { when: '18 February 2021', what: 'Perseverance landed in Jezero Crater, to search for signs of ancient microbial life. Jezero is one of the targets in SBATS.', src: 'm2020' },
    ],
    why: [
      {
        text: 'A day of 24.66 hours means a crew schedule and a solar array see nearly the day and night cycle they would on Earth. Sunlight is 586.2 W/m² against 1,361.0 W/m², so the same array gives less than half the power before dust is counted.',
        src: ['marsfact'],
      },
      {
        text: 'Pressure is 6.36 mb against 1,014 mb on Earth and gravity 3.73 m/s² against 9.82 m/s². As for the Moon, neither is scored.',
        src: ['marsfact', 'earthfact'],
      },
      {
        text: 'Curiosity and Perseverance were sent to Gale and Jezero to learn whether Mars was ever able to support microbial life. Both craters are targets in SBATS, and rock type is one of its six factors.',
        src: ['msl', 'm2020'],
      },
    ],
    image: { file: 'mars-viking-2048.jpg', alt: 'Map of Mars in colour', credit: 'Viking MDIM 2.1 Colour Mosaic, NASA/JPL/USGS, served by NASA Mars Trek' },
  },
};
