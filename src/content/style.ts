// Loads every style-kit foot module (src/content/style/*.ts) so they register themselves (src/art/style/registry.ts).
// Add new files under src/content/style/; nothing else needs editing.
import.meta.glob('./style/*.ts', { eager: true });
