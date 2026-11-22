// Loads every live backdrop module (src/content/live/*.ts) so they register themselves.
// Add new files under src/content/live/; nothing else needs editing.
import.meta.glob('./live/*.ts', { eager: true });
