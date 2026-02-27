/** Game-wide constants */
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

/** Font family used for all in-game text */
export const FONT = 'Fredoka, Arial Rounded MT Bold, Arial, sans-serif';

/** Colors */
export const COLORS = {
  barnWall: 0x8B4513,      // saddle brown
  barnWallLight: 0xA0522D,  // sienna
  barnFloor: 0xD2B48C,      // tan / hay color
  barnRoof: 0x654321,       // dark brown
  sky: 0x87CEEB,            // light sky blue
  hay: 0xDAA520,            // goldenrod
  wood: 0x6B3E26,           // dark wood
  woodLight: 0x8B6914,      // lighter wood
  white: 0xFFFFFF,
  black: 0x000000,
  green: 0x4CAF50,
  red: 0xF44336,
  yellow: 0xFFEB3B,
  pink: 0xFFB6C1,
  bubbleBlue: 0x87CEFA,
};

/** Animals available in the game */
export const ANIMALS = {
  horse: { name: 'Horse', color: 0x8B6914, starsToUnlock: 0 },
  pig: { name: 'Pig', color: 0xFFB6C1, starsToUnlock: 0 },
  chicken: { name: 'Chicken', color: 0xFFD700, starsToUnlock: 0 },
  goat: { name: 'Goat', color: 0x9E9E9E, starsToUnlock: 0 },
  sheep: { name: 'Sheep', color: 0xF5F5DC, starsToUnlock: 0 },
  bunny: { name: 'Bunny', color: 0xD2B48C, starsToUnlock: 0 },
} as const;

export type AnimalType = keyof typeof ANIMALS;

/** Ordered list of animals for iteration */
export const ANIMAL_ORDER: AnimalType[] = ['horse', 'pig', 'chicken', 'goat', 'sheep', 'bunny'];

/** Activities */
export const ACTIVITIES = ['feeding', 'brushing', 'washing', 'playing', 'cleaning'] as const;
export type ActivityType = (typeof ACTIVITIES)[number];

// ── Animal Needs System ──────────────────────────────────────

export type NeedType = 'hunger' | 'cleanliness' | 'happiness';

/** Points lost per minute for each need */
export const NEED_DECAY_RATE: Record<NeedType, number> = {
  hunger: 0.3,          // 1 point per ~3 minutes
  cleanliness: 0.2,     // 1 point per 5 minutes
  happiness: 0.15,      // 1 point per ~7 minutes
};

/** Maximum elapsed minutes to apply decay for (cap at 2 hours) */
export const MAX_DECAY_MINUTES = 120;

/** Need restoration amounts per activity */
export const ACTIVITY_NEED_EFFECTS: Record<ActivityType, Partial<Record<NeedType, number>>> = {
  feeding:  { hunger: 60, cleanliness: 15, happiness: 25 },
  washing:  { hunger: 10, cleanliness: 55, happiness: 20 },
  brushing: { hunger: 10, cleanliness: 40, happiness: 30 },
  playing:  { hunger: 10, cleanliness: 15, happiness: 50 },
  cleaning: { hunger: 10, cleanliness: 35, happiness: 30 },
};

/** Happiness boost when tapping the animal in the barn */
export const TAP_HAPPINESS_BOOST = 3;

// ── Cosmetics System ─────────────────────────────────────────

export type CosmeticType = 'bow' | 'hat' | 'tiara' | 'glasses' | 'necklace' | 'crown';

export interface CosmeticItem {
  id: string;
  name: string;
  type: CosmeticType;
  starsToUnlock: number;
  offsetY: number;
  /** If true, renders behind the animal sprite (e.g. bandana, necklace) */
  renderBehind?: boolean;
}

export const COSMETICS: CosmeticItem[] = [
  { id: 'red-bow',        name: 'Red Bow',        type: 'bow',      starsToUnlock: 5,   offsetY: -60 },
  { id: 'cowboy-hat',     name: 'Cowboy Hat',     type: 'hat',      starsToUnlock: 15,  offsetY: -70 },
  { id: 'pink-tiara',     name: 'Pink Tiara',     type: 'tiara',    starsToUnlock: 25,  offsetY: -70 },
  { id: 'glasses',         name: 'Glasses',         type: 'glasses',  starsToUnlock: 40,  offsetY: -35 },
  { id: 'daisy-necklace', name: 'Daisy Necklace', type: 'necklace', starsToUnlock: 65,  offsetY: 20,  renderBehind: true },
  { id: 'gold-crown',     name: 'Gold Crown',     type: 'crown',    starsToUnlock: 90,  offsetY: -75 },
];
