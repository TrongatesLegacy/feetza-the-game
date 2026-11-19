// Loads every content art module (foot kinds, toppings, scenes) so they register themselves.
// Add new files under src/content/art/; nothing else needs editing.
import.meta.glob('./art/*.ts', { eager: true });
