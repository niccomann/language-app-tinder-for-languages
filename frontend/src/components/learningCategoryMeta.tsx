import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BadgeHelp,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  Bus,
  ChefHat,
  Clock,
  Dumbbell,
  GraduationCap,
  Heart,
  Home,
  Layers,
  MapPin,
  Mountain,
  Package,
  Palette,
  PawPrint,
  Shirt,
  Sparkles,
  Tags,
  Utensils,
  Users,
  Zap,
} from 'lucide-react';

export interface LearningCategoryMeta {
  label: string;
  description: string;
  Icon: LucideIcon;
  gradientClass: string;
  softClass: string;
  textClass: string;
  borderClass: string;
}

const palette = [
  {
    gradientClass: 'from-emerald-500 to-teal-500',
    softClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
  },
  {
    gradientClass: 'from-sky-500 to-blue-600',
    softClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200',
  },
  {
    gradientClass: 'from-amber-400 to-orange-500',
    softClass: 'bg-amber-50',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-200',
  },
  {
    gradientClass: 'from-rose-500 to-pink-600',
    softClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
  },
  {
    gradientClass: 'from-violet-500 to-indigo-600',
    softClass: 'bg-violet-50',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-200',
  },
  {
    gradientClass: 'from-lime-500 to-green-600',
    softClass: 'bg-lime-50',
    textClass: 'text-lime-800',
    borderClass: 'border-lime-200',
  },
];

const categoryMetaByName: Record<string, Pick<LearningCategoryMeta, 'label' | 'description' | 'Icon'> & Partial<Omit<LearningCategoryMeta, 'label' | 'description' | 'Icon'>>> = {
  animals: {
    label: 'Animal Pack',
    description: 'Creatures, pets, and wildlife.',
    Icon: PawPrint,
    ...palette[0],
  },
  animal: {
    label: 'Animal Pack',
    description: 'Creatures, pets, and wildlife.',
    Icon: PawPrint,
    ...palette[0],
  },
  concepts: {
    label: 'Concept Pack',
    description: 'Ideas, abstract nouns, and meanings.',
    Icon: Brain,
    ...palette[4],
  },
  concept: {
    label: 'Concept Pack',
    description: 'Ideas, abstract nouns, and meanings.',
    Icon: Brain,
    ...palette[4],
  },
  types: {
    label: 'Type Pack',
    description: 'Word types, roles, and patterns.',
    Icon: Tags,
    ...palette[1],
  },
  home: {
    label: 'Home Base',
    description: 'Rooms, furniture, and daily objects.',
    Icon: Home,
    ...palette[1],
  },
  food: {
    label: 'Food Quest',
    description: 'Meals, ingredients, and tastes.',
    Icon: Utensils,
    ...palette[2],
  },
  learning: {
    label: 'Skill Lab',
    description: 'Study, school, and knowledge words.',
    Icon: BookOpen,
    ...palette[4],
  },
  nature: {
    label: 'Nature Trail',
    description: 'Plants, weather, and outdoors.',
    Icon: Mountain,
    ...palette[5],
  },
  family: {
    label: 'Family Circle',
    description: 'People, relationships, and roles.',
    Icon: Users,
    ...palette[3],
  },
  body: {
    label: 'Body Mode',
    description: 'Body parts, movement, and health.',
    Icon: Dumbbell,
    ...palette[0],
  },
  transport: {
    label: 'Transit Run',
    description: 'Travel, vehicles, and movement.',
    Icon: Bus,
    ...palette[1],
  },
  places: {
    label: 'Places Map',
    description: 'Locations, buildings, and spaces.',
    Icon: MapPin,
    ...palette[3],
  },
  objects: {
    label: 'Object Loot',
    description: 'Tools, items, and everyday things.',
    Icon: Package,
    ...palette[2],
  },
  actions: {
    label: 'Action Moves',
    description: 'Verbs and things you do.',
    Icon: Activity,
    ...palette[4],
  },
  descriptions: {
    label: 'Description Boost',
    description: 'Adjectives and qualities.',
    Icon: Sparkles,
    ...palette[3],
  },
  adverbs: {
    label: 'Adverb Speed',
    description: 'How, when, and how much.',
    Icon: Zap,
    ...palette[2],
  },
  clothing: {
    label: 'Outfit Kit',
    description: 'Clothes, accessories, and style.',
    Icon: Shirt,
    ...palette[4],
  },
  kitchen: {
    label: 'Kitchen Set',
    description: 'Cooking tools and kitchen words.',
    Icon: ChefHat,
    ...palette[2],
  },
  school: {
    label: 'School Pack',
    description: 'Classes, subjects, and supplies.',
    Icon: GraduationCap,
    ...palette[1],
  },
  work: {
    label: 'Work Pack',
    description: 'Jobs, offices, and tasks.',
    Icon: BriefcaseBusiness,
    ...palette[4],
  },
  time: {
    label: 'Time Pack',
    description: 'Dates, timing, and frequency.',
    Icon: Clock,
    ...palette[1],
  },
  emotions: {
    label: 'Emotion Pack',
    description: 'Feelings, moods, and reactions.',
    Icon: Heart,
    ...palette[3],
  },
  colors: {
    label: 'Color Pack',
    description: 'Colors, shades, and visual details.',
    Icon: Palette,
    ...palette[4],
  },
};

const titleCase = (value: string) =>
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function getLearningCategoryMeta(category: string, index = 0): LearningCategoryMeta {
  const normalized = category.trim().toLowerCase();
  const fallbackTheme = palette[index % palette.length];
  const specific = categoryMetaByName[normalized];

  return {
    label: specific?.label ?? `${titleCase(category)} Pack`,
    description: specific?.description ?? 'A focused topic pack for this deck.',
    Icon: specific?.Icon ?? (normalized.includes('grammar') ? Layers : BadgeHelp),
    gradientClass: specific?.gradientClass ?? fallbackTheme.gradientClass,
    softClass: specific?.softClass ?? fallbackTheme.softClass,
    textClass: specific?.textClass ?? fallbackTheme.textClass,
    borderClass: specific?.borderClass ?? fallbackTheme.borderClass,
  };
}
