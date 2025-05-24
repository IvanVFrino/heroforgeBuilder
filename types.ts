
export interface AbilityScores {
  Strength: number;
  Dexterity: number;
  Constitution: number;
  Intelligence: number;
  Wisdom: number;
  Charisma: number;
}

export interface Subrace {
  name: string;
  description?: string;
  abilityScoreBonuses: Partial<AbilityScores>;
  traits: string[];
}

export interface Race {
  name: string;
  description: string;
  abilityScoreBonuses: Partial<AbilityScores>; // Base bonuses
  traits: string[]; // Base traits
  icon?: string; 
  subraces?: Subrace[];
  hasPerceptionProficiencyTrait?: boolean; // Helper for specific traits like Keen Senses
  source?: 'base' | 'user-ai'; // To distinguish origin
}

export interface ClassFeature {
  name: string;
  description: string;
}
export interface CharClass {
  name: string;
  description: string;
  hitDie: number; 
  savingThrowProficiencies: (keyof AbilityScores)[];
  skillProficiencies: { choose: number; options: string[] };
  armorProficiencies: string[];
  weaponProficiencies: string[];
  features?: ClassFeature[];
  icon?: string; 
  source?: 'base' | 'user-ai'; // To distinguish origin
}

export interface Background {
  name: string;
  description: string;
  skillProficiencies: string[];
  toolProficienciesOrLanguages: string[];
  equipment: string[];
  feature: { name: string; description: string };
  icon?: string;
  source?: 'base' | 'user-ai'; // To distinguish origin
}

// CharacterData is used for player characters and now also for AI-generated bestiary entries
export interface CharacterData {
  id: string; // Unique identifier
  name: string;
  race?: Race; // For PCs, this is the selected Race object
  charClass?: CharClass; // For PCs, this is the selected CharClass object
  abilityScores: AbilityScores; 
  finalAbilityScores: AbilityScores; 
  alignment?: string;
  background?: Background; // For PCs
  level: number;
  hitPoints?: number;
  armorClass?: number;
  proficiencyBonus?: number;
  proficientSkills: string[];
  proficientSavingThrows: (keyof AbilityScores)[];
  backstory: string; // Can be lore for bestiary entries
  availableScores: number[]; // PC specific - used for Standard Array
  imageUrl?: string; // URL for the character's image

  // Fields that AI might generate more descriptively for characters/bestiary entries
  // These are optional and can be used by AI generation prompt.
  // The AI will be asked to produce a structure that fits CharacterData as much as possible.
  raceName?: string; // AI might provide a name instead of full Race object
  className?: string; // AI might provide a name instead of full Class object
  description?: string; // General description for bestiary entries or AI PC concept
  monsterType?: string; // For bestiary: e.g., "Aberration", "Beast"
  challengeRating?: number; // For bestiary
  specialAbilities?: ClassFeature[]; // For bestiary monster abilities
  actions?: ClassFeature[]; // For bestiary monster actions
  source?: 'base' | 'user-ai' | 'pc-gallery-ai' | 'bestiary-ai';
}

export enum Ability {
  Strength = "Strength",
  Dexterity = "Dexterity",
  Constitution = "Constitution",
  Intelligence = "Intelligence",
  Wisdom = "Wisdom",
  Charisma = "Charisma",
}

export const ABILITY_NAMES = Object.values(Ability);

export interface Skill {
  name: string;
  ability: Ability; 
}

export interface CommonGameData {
  DEFAULT_ABILITY_SCORES: AbilityScores; // Should be all 0s to represent "unassigned"
  STANDARD_ARRAY_SCORES: number[];
  PROFICIENCY_BONUS_LEVEL_1: number;
}

export type AppView = 'initialLoad' | 'menu' | 'creation' | 'gallery' | 'bestiary' | 'viewCharacterSheet' | 'aiContentStudio';

// For AI Generated Content
export type AiContentType = 'Race' | 'Class' | 'Background' | 'Character';
export type AiCharacterSaveDestination = 'gallery' | 'bestiary';

// This interface defines the structure of the main save file for the entire session.
export interface HeroForgeSessionData {
  version: string;
  savedCharacters: CharacterData[]; // From the gallery
  aiGeneratedRaces: Race[];
  aiGeneratedClasses: CharClass[];
  aiGeneratedBackgrounds: Background[];
  aiGeneratedBestiaryEntries: CharacterData[]; // From the bestiary
}

export type AbilityScoreAssignmentMethod = 'standardArray' | 'pointBuy' | 'manualRoll';
