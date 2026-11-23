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
