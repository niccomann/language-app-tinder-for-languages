export const UI_RADIUS = {
  surface: 'rounded-xl',
  control: 'rounded-lg',
  pill: 'rounded-full',
  touchIcon: 'rounded-full',
  media: 'rounded-lg',
} as const;

export const UI_SIZE = {
  touchControl: 'min-h-11',
  iconButton: 'h-11 w-11',
  smallIcon: 'h-9 w-9',
  nodeImage: 'h-8 w-8',
} as const;

export const UI_ELEVATION = {
  surface: 'shadow-sm',
  raised: 'shadow-md',
  floating: 'shadow-lg',
} as const;

export const UI_INTERACTION = {
  transition: 'transition-all duration-300',
  fastTransition: 'transition-all duration-200',
  lift: 'hover:scale-[1.02]',
  iconLift: 'hover:scale-[1.04]',
  press: 'active:scale-95',
  subtlePress: 'active:scale-[0.99]',
  raisedHover: 'hover:shadow-lg',
  floatingHover: 'hover:shadow-xl',
} as const;
