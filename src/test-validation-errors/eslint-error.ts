/**
 * TEST FILE: Intentional ESLint error
 * This file should cause the ESLint check to fail
 */

// Unused variable (ESLint error)
const unusedVariable = 'this variable is never used';

export function doSomething() {
  return 'hello';
}
