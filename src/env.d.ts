/// <reference types="vite/client" />

declare module 'virtual:audio-manifest' {
  const files: string[];
  export default files;
}

/** A hash of the source the cached art is drawn by (vite.config.ts: artVersion). */
declare module 'virtual:art-version' {
  const version: string;
  export default version;
}

/** The same for the peels' art (everything src/game/peels.ts draws with): the cached peel thumbnails' version. */
declare module 'virtual:peel-version' {
  const version: string;
  export default version;
}
