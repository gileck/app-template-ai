/**
 * Database Collections
 *
 * This file re-exports template collections and adds project-specific collections.
 * Template collections are in index.template.ts (synced from template).
 *
 * Add your project-specific collection exports below the template re-export.
 */

// Re-export all template collections
export * from './index.template';

// Project-specific collections:
export * as todos from './todos';
