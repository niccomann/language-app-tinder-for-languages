export const UI_RADIUS = {
  surface: 'rounded-lg',
  control: 'rounded-md',
  pill: 'rounded-full',
  touchIcon: 'rounded-full',
  media: 'rounded-lg',
  hero: 'rounded-xl',
} as const;

export const UI_SIZE = {
  touchControl: 'min-h-10',
  iconButton: 'h-10 w-10',
  smallIcon: 'h-9 w-9',
  nodeImage: 'h-8 w-8',
} as const;

export const UI_ELEVATION = {
  surface: '',
  raised: '',
  floating: '',
  hoverSoft: 'hover:shadow-[0_1px_3px_rgba(20,20,19,0.08)]',
} as const;

export const UI_INTERACTION = {
  transition: 'transition-colors duration-200',
  fastTransition: 'transition-colors duration-150',
  lift: '',
  iconLift: '',
  press: '',
  subtlePress: '',
  raisedHover: '',
  floatingHover: '',
} as const;
