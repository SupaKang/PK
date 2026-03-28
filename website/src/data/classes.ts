import classesJson from '../../../data/classes.json';
import type { BaseStats, LearnsetEntry } from './monsters';

export interface PlayerClass {
  id: string;
  name: string;
  description: string;
  type: string[];
  baseStats: BaseStats;
  growthRate: string;
  learnset: LearnsetEntry[];
  uniqueSkill: LearnsetEntry;
}

const data = classesJson as { classes: PlayerClass[] };

export const classes = data.classes;
