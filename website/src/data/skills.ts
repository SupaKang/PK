import skillsJson from '../../../data/skills.json';

export interface SkillEffect {
  type: string;
  chance?: number;
  target?: string;
  stat?: string;
  stages?: number;
  value?: number;
}

export interface Skill {
  id: string;
  name: string;
  type: string;
  category: 'physical' | 'special' | 'status';
  power: number;
  accuracy: number;
  pp: number;
  effect: SkillEffect | null;
  description: string;
}

const data = skillsJson as { skills: Skill[] };

export const skills = data.skills;

export function getSkill(id: string): Skill | undefined {
  return skills.find(s => s.id === id);
}
