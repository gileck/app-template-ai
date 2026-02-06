/**
 * TEST FILE: Intentional unresolved dependency error
 * This file imports a package that doesn't exist
 */

// This package doesn't exist - should cause knip to report unresolved dependency
import { nonExistentFunction } from 'non-existent-package-xyz-123';

export function useNonExistent() {
  return nonExistentFunction();
}
