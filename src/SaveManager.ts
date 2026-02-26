import {
  AnimalType, ActivityType, ACTIVITIES, ANIMAL_ORDER,
  ANIMALS, NeedType, NEED_DECAY_RATE, MAX_DECAY_MINUTES,
  COSMETICS, CosmeticItem,
} from './config';

interface NeedValues {
  hunger: number;
  cleanliness: number;
  happiness: number;
}

interface SaveData {
  /** Stars earned per animal per activity */
  stars: Record<AnimalType, Record<ActivityType, number>>;
  /** Which animals the player has unlocked */
  unlockedAnimals: AnimalType[];
  /** Total stars earned (cached for quick display) */
  totalStars: number;
  /** Animal needs */
  needs: Record<AnimalType, NeedValues>;
  /** Timestamp of last needs update */
  lastNeedsUpdate: number;
  /** Unlocked cosmetic IDs */
  unlockedCosmetics: string[];
  /** Equipped cosmetic per animal (null = none) */
  equippedCosmetics: Record<AnimalType, string | null>;
  /** Saved cosmetic positions per animal (container-local coords, null = default) */
  cosmeticPositions: Record<AnimalType, { x: number; y: number } | null>;
  /** Custom names per animal (null = use default) */
  animalNames: Record<AnimalType, string | null>;
}

/** Return type for awardStar — tells caller what got unlocked */
export interface StarAwardResult {
  newAnimals: AnimalType[];
  newCosmetics: CosmeticItem[];
}

const SAVE_KEY = 'natalies-farm-save';

function defaultNeeds(): NeedValues {
  return { hunger: 100, cleanliness: 100, happiness: 100 };
}

function defaultSave(): SaveData {
  const stars = {} as SaveData['stars'];
  const needs = {} as SaveData['needs'];
  const equippedCosmetics = {} as SaveData['equippedCosmetics'];
  const cosmeticPositions = {} as SaveData['cosmeticPositions'];
  const animalNames = {} as SaveData['animalNames'];

  for (const animal of ANIMAL_ORDER) {
    stars[animal] = {} as Record<ActivityType, number>;
    for (const act of ACTIVITIES) {
      stars[animal][act] = 0;
    }
    needs[animal] = defaultNeeds();
    equippedCosmetics[animal] = null;
    cosmeticPositions[animal] = null;
    animalNames[animal] = null;
  }

  return {
    stars,
    unlockedAnimals: [...ANIMAL_ORDER],
    totalStars: 0,
    needs,
    lastNeedsUpdate: Date.now(),
    unlockedCosmetics: [],
    equippedCosmetics,
    cosmeticPositions,
    animalNames,
  };
}

class SaveManagerClass {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SaveData;
        this.migrate(parsed);
        return parsed;
      }
    } catch {
      console.warn('Failed to load save data, using defaults');
    }
    return defaultSave();
  }

  /** Migrate old save formats to current */
  private migrate(data: SaveData): void {
    const defaults = defaultSave();

    // Ensure star records exist for all animals
    for (const animal of ANIMAL_ORDER) {
      if (!data.stars[animal]) {
        data.stars[animal] = defaults.stars[animal];
      }
      for (const act of ACTIVITIES) {
        if (data.stars[animal][act] === undefined) {
          data.stars[animal][act] = 0;
        }
      }
    }

    // Ensure all animals are unlocked (all free from the start now)
    data.unlockedAnimals = [...ANIMAL_ORDER];

    // Add needs fields if missing
    if (!data.needs) {
      data.needs = {} as SaveData['needs'];
    }
    for (const animal of ANIMAL_ORDER) {
      if (!data.needs[animal]) {
        data.needs[animal] = defaultNeeds();
      }
    }
    if (!data.lastNeedsUpdate) {
      data.lastNeedsUpdate = Date.now();
    }

    // Migrate drying → playing star data
    for (const animal of ANIMAL_ORDER) {
      const stars = data.stars[animal] as Record<string, number>;
      if (stars['drying'] !== undefined) {
        if (stars['playing'] === undefined) {
          stars['playing'] = stars['drying'];
        } else {
          stars['playing'] += stars['drying'];
        }
        delete stars['drying'];
      }
    }

    // Migrate bandana → tiara
    if (data.unlockedCosmetics) {
      const idx = data.unlockedCosmetics.indexOf('blue-bandana');
      if (idx !== -1) data.unlockedCosmetics[idx] = 'pink-tiara';
    }
    if (data.equippedCosmetics) {
      for (const animal of ANIMAL_ORDER) {
        if (data.equippedCosmetics[animal] === 'blue-bandana') {
          data.equippedCosmetics[animal] = 'pink-tiara';
        }
      }
    }

    // Migrate star-glasses → glasses
    if (data.unlockedCosmetics) {
      const idx = data.unlockedCosmetics.indexOf('star-glasses');
      if (idx !== -1) data.unlockedCosmetics[idx] = 'glasses';
    }
    if (data.equippedCosmetics) {
      for (const animal of ANIMAL_ORDER) {
        if (data.equippedCosmetics[animal] === 'star-glasses') {
          data.equippedCosmetics[animal] = 'glasses';
        }
      }
    }

    // Add cosmetic fields if missing
    if (!data.unlockedCosmetics) {
      data.unlockedCosmetics = [];
    }
    if (!data.equippedCosmetics) {
      data.equippedCosmetics = {} as SaveData['equippedCosmetics'];
    }
    for (const animal of ANIMAL_ORDER) {
      if (data.equippedCosmetics[animal] === undefined) {
        data.equippedCosmetics[animal] = null;
      }
    }

    // Add animal names if missing
    if (!data.animalNames) {
      data.animalNames = {} as SaveData['animalNames'];
    }
    for (const animal of ANIMAL_ORDER) {
      if (data.animalNames[animal] === undefined) {
        data.animalNames[animal] = null;
      }
    }

    // Add cosmetic positions if missing
    if (!data.cosmeticPositions) {
      data.cosmeticPositions = {} as SaveData['cosmeticPositions'];
    }
    for (const animal of ANIMAL_ORDER) {
      if (data.cosmeticPositions[animal] === undefined) {
        data.cosmeticPositions[animal] = null;
      }
    }
  }

  private save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      console.warn('Failed to save data');
    }
  }

  // ── Stars ────────────────────────────────────────────────

  /** Award a star and return any newly unlocked animals/cosmetics */
  awardStar(animal: AnimalType, activity: ActivityType): StarAwardResult {
    this.data.stars[animal][activity]++;
    this.data.totalStars++;
    const newAnimals = this.checkAndUnlockAnimals();
    const newCosmetics = this.checkAndUnlockCosmetics();
    this.save();
    return { newAnimals, newCosmetics };
  }

  getStars(animal: AnimalType, activity: ActivityType): number {
    return this.data.stars[animal][activity];
  }

  getAnimalStars(animal: AnimalType): number {
    let total = 0;
    for (const act of ACTIVITIES) {
      total += this.data.stars[animal][act];
    }
    return total;
  }

  getTotalStars(): number {
    return this.data.totalStars;
  }

  // ── Animal Unlocks ───────────────────────────────────────

  /** Check star thresholds and unlock any qualifying animals. Returns newly unlocked. */
  private checkAndUnlockAnimals(): AnimalType[] {
    const newlyUnlocked: AnimalType[] = [];
    for (const animal of ANIMAL_ORDER) {
      if (!this.data.unlockedAnimals.includes(animal)) {
        if (this.data.totalStars >= ANIMALS[animal].starsToUnlock) {
          this.data.unlockedAnimals.push(animal);
          newlyUnlocked.push(animal);
        }
      }
    }
    return newlyUnlocked;
  }

  isUnlocked(animal: AnimalType): boolean {
    return this.data.unlockedAnimals.includes(animal);
  }

  unlockAnimal(animal: AnimalType): void {
    if (!this.data.unlockedAnimals.includes(animal)) {
      this.data.unlockedAnimals.push(animal);
      this.save();
    }
  }

  getUnlockedAnimals(): AnimalType[] {
    return [...this.data.unlockedAnimals];
  }

  // ── Needs ────────────────────────────────────────────────

  /** Apply timestamp-based decay to all needs. Call on BarnScene entry. */
  updateNeeds(): void {
    const now = Date.now();
    const elapsedMs = now - this.data.lastNeedsUpdate;
    const elapsedMin = Math.min(elapsedMs / 60000, MAX_DECAY_MINUTES);

    if (elapsedMin < 0.1) return; // skip tiny intervals

    for (const animal of ANIMAL_ORDER) {
      const n = this.data.needs[animal];
      const needs: NeedType[] = ['hunger', 'cleanliness', 'happiness'];
      for (const need of needs) {
        const decay = NEED_DECAY_RATE[need] * elapsedMin;
        n[need] = Math.max(0, n[need] - decay);
      }
    }

    this.data.lastNeedsUpdate = now;
    this.save();
  }

  /** Restore a specific need for an animal */
  restoreNeed(animal: AnimalType, need: NeedType, amount: number): void {
    this.data.needs[animal][need] = Math.min(100, this.data.needs[animal][need] + amount);
    this.save();
  }

  /** Restore multiple needs at once (from activity completion) */
  restoreNeeds(animal: AnimalType, effects: Partial<Record<NeedType, number>>): void {
    for (const [need, amount] of Object.entries(effects)) {
      if (amount) {
        this.data.needs[animal][need as NeedType] = Math.min(
          100,
          this.data.needs[animal][need as NeedType] + amount,
        );
      }
    }
    this.save();
  }

  getNeeds(animal: AnimalType): NeedValues {
    return { ...this.data.needs[animal] };
  }

  // ── Cosmetics ────────────────────────────────────────────

  /** Check star thresholds and unlock any qualifying cosmetics. Returns newly unlocked. */
  private checkAndUnlockCosmetics(): CosmeticItem[] {
    const newlyUnlocked: CosmeticItem[] = [];
    for (const cosmetic of COSMETICS) {
      if (!this.data.unlockedCosmetics.includes(cosmetic.id)) {
        if (this.data.totalStars >= cosmetic.starsToUnlock) {
          this.data.unlockedCosmetics.push(cosmetic.id);
          newlyUnlocked.push(cosmetic);
        }
      }
    }
    return newlyUnlocked;
  }

  isCosmeticUnlocked(id: string): boolean {
    return this.data.unlockedCosmetics.includes(id);
  }

  equipCosmetic(animal: AnimalType, id: string | null): void {
    this.data.equippedCosmetics[animal] = id;
    this.save();
  }

  getEquippedCosmetic(animal: AnimalType): string | null {
    return this.data.equippedCosmetics[animal];
  }

  setCosmeticPosition(animal: AnimalType, x: number, y: number): void {
    this.data.cosmeticPositions[animal] = { x, y };
    this.save();
  }

  getCosmeticPosition(animal: AnimalType): { x: number; y: number } | null {
    return this.data.cosmeticPositions[animal] ?? null;
  }

  resetCosmeticPosition(animal: AnimalType): void {
    this.data.cosmeticPositions[animal] = null;
    this.save();
  }

  // ── Animal Names ───────────────────────────────────────

  getAnimalName(animal: AnimalType): string {
    return this.data.animalNames[animal] ?? ANIMALS[animal].name;
  }

  setAnimalName(animal: AnimalType, name: string): void {
    const trimmed = name.trim();
    this.data.animalNames[animal] = trimmed || null;
    this.save();
  }

  // ── Reset ────────────────────────────────────────────────

  reset(): void {
    this.data = defaultSave();
    this.save();
  }
}

/** Singleton save manager */
export const SaveManager = new SaveManagerClass();
