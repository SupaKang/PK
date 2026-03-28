import storyJson from '../../../data/story.json';

export interface Scene {
  type: string;
  speaker?: string;
  text?: string;
  choices?: { text: string; karma_change?: number }[];
}

export interface StoryEvent {
  id: string;
  location: string;
  trigger: string;
  scenes: Scene[];
  requirements?: Record<string, unknown>;
}

export interface Chapter {
  id: number;
  title: string;
  events: StoryEvent[];
}

const data = storyJson as { chapters: Chapter[] };

export const chapters = data.chapters;
