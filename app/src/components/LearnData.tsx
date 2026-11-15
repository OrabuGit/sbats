// Facts for the Learn page. Only well-established dates, names and places are listed, each with the
// organisation that publishes it. Where a figure was not certain it is left out rather than guessed.
// Planet figures are not repeated here: the Worlds chapter reads them from data/worlds.ts.
import type { Badge } from '../types';
import type { WorldId } from './Worlds';

export interface Src {
  name: string;
  url?: string;
}

export const SRC = {
  nasaAnalog: { name: 'NASA, Analog Missions', url: 'https://www.nasa.gov/analog-missions/' },
  nasaArtemis: { name: "NASA, Moon to Mars: NASA's Artemis Program", url: 'https://www.nasa.gov/humans-in-space/artemis/' },
  nasaApollo11: { name: 'NASA, Apollo 11 mission page', url: 'https://www.nasa.gov/mission/apollo-11/' },
  nasaLro: { name: 'NASA Science, Lunar Reconnaissance Orbiter', url: 'https://science.nasa.gov/mission/lro/' },
  nasaViking1: { name: 'NASA Science, Viking 1', url: 'https://science.nasa.gov/mission/viking-1/' },
  nasaMsl: { name: 'NASA Science, Mars Science Laboratory: Curiosity', url: 'https://science.nasa.gov/mission/msl-curiosity/' },
  nasaM2020: { name: 'NASA Science, Mars 2020: Perseverance', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/' },
  nssdca: { name: 'NASA NSSDCA, Master Catalog', url: 'https://nssdc.gsfc.nasa.gov/nmc/' },
  nasaApollo: { name: 'NASA, Apollo program mission pages', url: 'https://www.nasa.gov/the-apollo-program/' },
  nasaMer: { name: 'NASA Science, Mars Exploration Rovers' },
  nasaIngenuity: { name: 'NASA Science, Ingenuity Mars Helicopter' },
  nasaNeemo: { name: 'NASA, NEEMO (NASA Extreme Environment Mission Operations)' },
  nasaChapea: { name: 'NASA, CHAPEA (Crew Health and Performance Exploration Analog)' },
  cnsa: { name: 'CNSA, China National Space Administration', url: 'https://www.cnsa.gov.cn/' },
  isro: { name: 'ISRO, Chandrayaan-3', url: 'https://www.isro.gov.in/' },
  jaxa: { name: 'JAXA, SLIM (Smart Lander for Investigating Moon)', url: 'https://www.jaxa.jp/' },
  esaConcordia: { name: 'ESA, Concordia station', url: 'https://www.esa.int/' },
  esaMars500: { name: 'ESA, Mars500', url: 'https://www.esa.int/' },
  marsSociety: { name: 'The Mars Society, Mars Desert Research Station', url: 'https://mdrs.marssociety.org/' },
  marsSocietyFmars: { name: 'The Mars Society, Flashline Mars Arctic Research Station' },
  marsInstitute: { name: 'Mars Institute, Haughton-Mars Project' },
  hiseas: { name: 'HI-SEAS, Hawaii Space Exploration Analog and Simulation', url: 'https://hi-seas.org/' },
} satisfies Record<string, Src>;

export interface Station {
  id: string;
  name: string;
  full: string;
  where: string;
  since: string;
  analogOf: string;
  text: string;
  /** Approximate position, only to place a dot on the world map. Not shown as a number. */
  lat: number;
  lon: number;
  src: Src[];
  badge: Badge;
}

export const STATIONS: Station[] = [
  {
    id: 'mdrs',
    name: 'MDRS',
    full: 'Mars Desert Research Station',
    where: 'Near Hanksville, Utah, USA',
    since: '2001',
    analogOf: 'Mars',
    text: 'A small round habitat in red desert rock. Crews live inside for short rotations and go outside only in mock spacesuits.',
    lat: 38.4,
    lon: -110.8,
    src: [SRC.marsSociety],
    badge: 'Literature',
  },
  {
    id: 'devon',
    name: 'Devon Island',
    full: 'Haughton-Mars Project and FMARS',
    where: 'Haughton crater, Nunavut, Canada',
    since: '1997',
    analogOf: 'Mars and the Moon',
    text: 'A cold, dry impact crater in the high Arctic. Field seasons have run there since 1997. The Flashline station was built on the crater rim in 2000.',
    lat: 75.4,
    lon: -89.8,
    src: [SRC.marsInstitute, SRC.marsSocietyFmars],
    badge: 'Literature',
  },
  {
    id: 'hiseas',
    name: 'HI-SEAS',
    full: 'Hawaii Space Exploration Analog and Simulation',
    where: 'Mauna Loa, Hawaii, USA',
    since: '2013',
    analogOf: 'Mars and the Moon',
    text: 'A dome on bare lava high on a volcano. Crews live in isolation and eat, sleep and work as they would on another world.',
    lat: 19.6,
    lon: -155.5,
    src: [SRC.hiseas],
    badge: 'Literature',
  },
  {
    id: 'concordia',
    name: 'Concordia',
    full: 'Concordia Station, Dome C',
    where: 'Antarctic plateau',
    since: '2005',
    analogOf: 'Long stays far from help',
    text: 'A French and Italian station on the ice, open all year since 2005. Nobody can reach it in winter. ESA calls it "White Mars" and studies how isolation affects the crew.',
    lat: -75.1,
    lon: 123.3,
    src: [SRC.esaConcordia],
    badge: 'Literature',
  },
  {
    id: 'neemo',
    name: 'NEEMO',
    full: 'NASA Extreme Environment Mission Operations',
    where: 'Aquarius reef base, off Key Largo, Florida, USA',
    since: '2001',
    analogOf: 'Spacewalks in low gravity',
    text: 'Crews live in an undersea laboratory on the sea floor. Floating in water stands in for working in low gravity on the Moon or Mars.',
    lat: 25.0,
    lon: -80.5,
    src: [SRC.nasaNeemo],
    badge: 'Literature',
  },
  {
    id: 'chapea',
    name: 'CHAPEA',
    full: 'Crew Health and Performance Exploration Analog',
    where: 'Johnson Space Center, Houston, Texas, USA',
    since: '2023',
    analogOf: 'A year on Mars',
    text: 'A 3D-printed habitat called Mars Dune Alpha. The first crew of four lived inside for about a year, from 2023 to 2024.',
    lat: 29.6,
    lon: -95.1,
    src: [SRC.nasaChapea, SRC.nasaAnalog],
    badge: 'Literature',
  },
  {
    id: 'mars500',
    name: 'Mars500',
    full: 'Mars500 isolation study',
    where: 'Moscow, Russia',
    since: '2010',
    analogOf: 'A trip to Mars and back',
    text: 'Six people stayed sealed inside a mock spacecraft for 520 days, from 2010 to 2011, the length of a return trip to Mars.',
    lat: 55.7,
    lon: 37.6,
    src: [SRC.esaMars500],
    badge: 'Literature',
  },
];

export interface Planned {
  id: string;
  name: string;
  body: 'moon' | 'mars';
  who: string;
  text: string;
  status: string;
  src: Src[];
  badge: Badge;
}

export const PLANNED: Planned[] = [
  {
    id: 'artemis',
    name: 'Artemis Moon Base',
    body: 'moon',
    who: 'NASA and partners',
    text: 'A base where astronauts will live, work and explore near the lunar South Pole. Water ice may sit in craters there that never see sunlight.',
    status: 'Planned',
    src: [SRC.nasaArtemis],
    badge: 'Mission',
  },
  {
    id: 'ilrs',
    name: 'International Lunar Research Station',
    body: 'moon',
    who: 'China (CNSA) and partners',
    text: 'A research station planned for the region around the lunar South Pole, built up over several Chang\'e missions.',
    status: 'Planned',
    src: [SRC.cnsa],
    badge: 'Mission',
  },
  {
    id: 'mars',
    name: 'A first base on Mars',
    body: 'mars',
    who: 'No agency yet',
    text: 'No base on Mars is funded yet. NASA describes the Moon base as a foundation for the first crewed missions to Mars.',
    status: 'Not yet planned',
    src: [SRC.nasaArtemis],
    badge: 'Mission',
  },
];

export type Lane = 'moon' | 'mars' | 'earth';

export interface Event {
  year: number;
  when: string;
  title: string;
  text: string;
  lane: Lane;
  src: Src;
  badge: Badge;
}

/** Exploration and analog milestones, in time order. Month or day only where certain. */
export const EVENTS: Event[] = [
  { year: 1959, when: 'September 1959', lane: 'moon', title: 'Luna 2', text: 'First spacecraft to reach the Moon. It hit the surface on purpose.', src: SRC.nssdca, badge: 'Mission' },
  { year: 1966, when: 'February 1966', lane: 'moon', title: 'Luna 9', text: 'First soft landing on the Moon, and the first pictures from its surface.', src: SRC.nssdca, badge: 'Mission' },
  { year: 1969, when: '20 July 1969', lane: 'moon', title: 'Apollo 11', text: 'First people on the Moon. The crew called the landing site Tranquility Base.', src: SRC.nasaApollo11, badge: 'Mission' },
  { year: 1970, when: 'November 1970', lane: 'moon', title: 'Lunokhod 1', text: 'First rover on another world, driven from Earth by a team in the Soviet Union.', src: SRC.nssdca, badge: 'Mission' },
  { year: 1971, when: 'July 1971', lane: 'moon', title: 'Apollo 15', text: 'First drive of the Lunar Roving Vehicle, a car for two astronauts.', src: SRC.nasaApollo, badge: 'Mission' },
  { year: 1972, when: 'December 1972', lane: 'moon', title: 'Apollo 17', text: 'The last crewed landing on the Moon so far.', src: SRC.nasaApollo, badge: 'Mission' },
  { year: 1976, when: '20 July 1976', lane: 'mars', title: 'Viking 1', text: 'In NASA\'s words, the first truly successful landing on Mars.', src: SRC.nasaViking1, badge: 'Mission' },
  { year: 1997, when: '1997', lane: 'earth', title: 'Haughton-Mars Project', text: 'Field research starts in Haughton crater on Devon Island, in the Canadian Arctic.', src: SRC.marsInstitute, badge: 'Literature' },
  { year: 1997, when: 'July 1997', lane: 'mars', title: 'Sojourner', text: 'Mars Pathfinder lands. Its small rover Sojourner is the first rover on Mars.', src: SRC.nssdca, badge: 'Mission' },
  { year: 2000, when: '2000', lane: 'earth', title: 'FMARS', text: 'The Flashline Mars Arctic Research Station is built on the rim of Haughton crater.', src: SRC.marsSocietyFmars, badge: 'Literature' },
  { year: 2001, when: '2001', lane: 'earth', title: 'MDRS', text: 'The Mars Desert Research Station opens in the Utah desert.', src: SRC.marsSociety, badge: 'Literature' },
  { year: 2001, when: '2001', lane: 'earth', title: 'NEEMO 1', text: 'First NEEMO crew lives in the Aquarius undersea laboratory.', src: SRC.nasaNeemo, badge: 'Literature' },
  { year: 2004, when: 'January 2004', lane: 'mars', title: 'Spirit and Opportunity', text: 'Twin rovers land on opposite sides of Mars.', src: SRC.nasaMer, badge: 'Mission' },
  { year: 2005, when: '2005', lane: 'earth', title: 'Concordia', text: 'The Antarctic station at Dome C opens all year round.', src: SRC.esaConcordia, badge: 'Literature' },
  { year: 2009, when: '18 June 2009', lane: 'moon', title: 'LRO', text: 'The Lunar Reconnaissance Orbiter launches. SBATS uses its maps of lunar terrain and temperature.', src: SRC.nasaLro, badge: 'Mission' },
  { year: 2010, when: '2010 to 2011', lane: 'earth', title: 'Mars500', text: 'Six people spend 520 days sealed in a mock spacecraft.', src: SRC.esaMars500, badge: 'Literature' },
  { year: 2012, when: '6 August 2012', lane: 'mars', title: 'Curiosity', text: 'Lands in Gale Crater to learn whether Mars could ever support microbes.', src: SRC.nasaMsl, badge: 'Mission' },
  { year: 2013, when: '2013', lane: 'earth', title: 'HI-SEAS', text: 'First mission in the dome on Mauna Loa, Hawaii.', src: SRC.hiseas, badge: 'Literature' },
  { year: 2013, when: 'December 2013', lane: 'moon', title: 'Chang\'e 3 and Yutu', text: 'China\'s first landing on the Moon, with the Yutu rover.', src: SRC.cnsa, badge: 'Mission' },
  { year: 2019, when: 'January 2019', lane: 'moon', title: 'Chang\'e 4 and Yutu-2', text: 'First landing on the far side of the Moon.', src: SRC.cnsa, badge: 'Mission' },
  { year: 2021, when: '18 February 2021', lane: 'mars', title: 'Perseverance', text: 'Lands in Jezero Crater to look for signs of ancient life.', src: SRC.nasaM2020, badge: 'Mission' },
  { year: 2021, when: 'April 2021', lane: 'mars', title: 'Ingenuity', text: 'First powered, controlled flight on another planet.', src: SRC.nasaIngenuity, badge: 'Mission' },
  { year: 2021, when: 'May 2021', lane: 'mars', title: 'Zhurong', text: 'China\'s first Mars rover lands, carried by Tianwen-1.', src: SRC.cnsa, badge: 'Mission' },
  { year: 2023, when: 'August 2023', lane: 'moon', title: 'Chandrayaan-3', text: 'India\'s first Moon landing, far to the south, with the Pragyan rover.', src: SRC.isro, badge: 'Mission' },
  { year: 2023, when: '2023 to 2024', lane: 'earth', title: 'CHAPEA 1', text: 'A crew of four lives about a year in a 3D-printed mock Mars habitat.', src: SRC.nasaChapea, badge: 'Literature' },
  { year: 2024, when: 'January 2024', lane: 'moon', title: 'SLIM', text: 'Japan\'s first Moon landing, aimed at a very small target.', src: SRC.jaxa, badge: 'Mission' },
  { year: 2024, when: 'June 2024', lane: 'moon', title: 'Chang\'e 6', text: 'First rock samples brought back from the far side of the Moon.', src: SRC.cnsa, badge: 'Mission' },
];

export const LANE_NAME: Record<Lane, string> = { moon: 'Moon', mars: 'Mars', earth: 'Analogs on Earth' };
export const LANE_TEX: Record<Lane, string> = { moon: 'moon-wac-2048', mars: 'mars-viking-2048', earth: 'blue-marble-2048' };
export const WORLD_TEX: Record<WorldId, string> = { earth: 'blue-marble-2048', moon: 'moon-wac-2048', mars: 'mars-viking-2048' };
