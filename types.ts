
export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: string; // Changed from number to string 'YYYY-MM-DD'
  priority: 'low' | 'medium' | 'high';
  dueDate?: string; // Changed from number to string 'YYYY-MM-DD'
  reminderTime?: number;
  tags: string[]; // Tag IDs
}

export interface JournalEntry {
  id: string; // Use date string 'YYYY-MM-DD' as ID
  date: string; // 'YYYY-MM-DD'
  content: string;
  mood: MoodType;
  updatedAt: number;
  tags: string[];
  reminderEnabled: boolean;
  reminderTime?: string; // "HH:mm"
}

export interface DailyAnalysis {
  summary: string;
  score: number;
  advice: string;
  moodTrend: string;
}

export enum MoodType {
  HAPPY = 'happy',
  NEUTRAL = 'neutral',
  SAD = 'sad',
  ANXIOUS = 'anxious',
  EXCITED = 'excited'
}

export const MOOD_EMOJIS: Record<MoodType, string> = {
  [MoodType.HAPPY]: '😊',
  [MoodType.NEUTRAL]: '😐',
  [MoodType.SAD]: '😔',
  [MoodType.ANXIOUS]: '😰',
  [MoodType.EXCITED]: '🤩',
};

export const TAG_COLORS = [
  'bg-red-100 text-red-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-700',
  'bg-green-100 text-green-700',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-purple-100 text-purple-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-pink-100 text-pink-700',
  'bg-rose-100 text-rose-700',
];