declare global {
  interface Window {
    YT?: {
      Player?: new (elementId: string, options: Record<string, unknown>) => unknown;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
