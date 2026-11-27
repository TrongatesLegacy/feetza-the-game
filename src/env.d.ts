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

/** The pre-built art packs' unit versions (src/game/packs.ts): each unit's hash over the files it's painted by, as
 * they are in this build (vite.config.ts, scripts/prebuild/deps.mjs). */
declare module 'virtual:pack-versions' {
  const versions: Record<string, string>;
  export default versions;
}
