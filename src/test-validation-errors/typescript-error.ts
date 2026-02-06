/**
 * TEST FILE: Intentional TypeScript error
 * This file should cause the TypeScript check to fail
 */

// Type mismatch error
const numberValue: number = 'this is a string';

export { numberValue };
