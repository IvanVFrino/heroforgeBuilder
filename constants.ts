
import { AbilityScores } from './types';

export interface PointBuyConfig {
  totalPoints: number;
  costs: Record<number, number>; // Score -> cost to reach this score from score-1 (or base cost for minScore)
  minScore: number;
  maxScore: number;
  baseScore: number; // The score from which point buy starts (usually minScore)
}

export const POINT_BUY_CONFIG: PointBuyConfig = {
  totalPoints: 27,
  costs: { // Cost to *reach* this score from the one below it, or from base if it's the first step up
    // Or, more simply, total cost for a score.
    // Let's use total cost from baseScore (8)
    // Score: Cost
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7, // Buying 14 costs 7 points (2 more than 13)
    15: 9  // Buying 15 costs 9 points (2 more than 14)
  },
  minScore: 8,
  maxScore: 15,
  baseScore: 8,
};

export const MANUAL_ROLL_CONFIG = {
  minScore: 3,
  maxScore: 18,
  defaultScore: 10,
};

export const DEFAULT_SCORES_FOR_POINT_BUY: AbilityScores = {
  Strength: POINT_BUY_CONFIG.baseScore,
  Dexterity: POINT_BUY_CONFIG.baseScore,
  Constitution: POINT_BUY_CONFIG.baseScore,
  Intelligence: POINT_BUY_CONFIG.baseScore,
  Wisdom: POINT_BUY_CONFIG.baseScore,
  Charisma: POINT_BUY_CONFIG.baseScore,
};

export const DEFAULT_SCORES_FOR_MANUAL_ROLL: AbilityScores = {
  Strength: MANUAL_ROLL_CONFIG.defaultScore,
  Dexterity: MANUAL_ROLL_CONFIG.defaultScore,
  Constitution: MANUAL_ROLL_CONFIG.defaultScore,
  Intelligence: MANUAL_ROLL_CONFIG.defaultScore,
  Wisdom: MANUAL_ROLL_CONFIG.defaultScore,
  Charisma: MANUAL_ROLL_CONFIG.defaultScore,
};

// Default for Standard Array will be all 0s, handled by commonData.DEFAULT_ABILITY_SCORES
