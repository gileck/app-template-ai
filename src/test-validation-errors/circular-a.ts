/**
 * TEST FILE: Intentional circular dependency (part A)
 * This file imports from circular-b.ts which imports from this file
 */

import { valueB } from './circular-b';

export const valueA = 'A' + valueB;
