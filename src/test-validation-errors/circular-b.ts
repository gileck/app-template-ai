/**
 * TEST FILE: Intentional circular dependency (part B)
 * This file imports from circular-a.ts which imports from this file
 */

import { valueA } from './circular-a';

export const valueB = 'B' + valueA;
