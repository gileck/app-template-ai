/**
 * Domain Configuration
 *
 * Defines the list of valid domain values for workflow item classification.
 * Domains categorize items by the area of the application they affect.
 */

export const DOMAINS = [
    { value: 'ui', label: 'UI', description: 'User interface, components, pages, styling' },
    { value: 'api', label: 'API', description: 'Server endpoints, API handlers' },
    { value: 'database', label: 'Database', description: 'MongoDB collections, schemas, queries' },
    { value: 'agents', label: 'Agents', description: 'AI agents, workflow pipeline' },
    { value: 'infra', label: 'Infrastructure', description: 'Build, CI/CD, deployment, config' },
    { value: 'auth', label: 'Auth', description: 'Authentication, authorization' },
] as const;

export type DomainValue = typeof DOMAINS[number]['value'];
export const VALID_DOMAIN_VALUES = new Set<string>(DOMAINS.map(d => d.value));
export const DOMAIN_VALUES = DOMAINS.map(d => d.value);
