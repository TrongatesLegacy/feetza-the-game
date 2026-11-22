// Loads every live-kit module (src/content/styleLive/*.ts) so styled feet register how they move in play
// (src/game/liveKit.ts). Add new files under src/content/styleLive/; nothing else needs editing.
import.meta.glob('./styleLive/*.ts', { eager: true });
