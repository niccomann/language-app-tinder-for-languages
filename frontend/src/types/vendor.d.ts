declare module 'd3-cloud' {
  const cloud: () => any;
  export default cloud;
}

declare module 'react-simple-maps' {
  import type { ComponentType, ReactNode } from 'react';

  export const ComposableMap: ComponentType<Record<string, unknown> & { children?: ReactNode }>;
  export const Geographies: ComponentType<Record<string, unknown> & { children?: (props: { geographies: any[] }) => ReactNode }>;
  export const Geography: ComponentType<Record<string, unknown>>;
  export const ZoomableGroup: ComponentType<Record<string, unknown> & { children?: ReactNode }>;
}
