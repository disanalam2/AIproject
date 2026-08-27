import { HashFieldConfiguration, HashFieldNormalizeOptions } from './types';
export declare function hashString(input: string, config: Omit<HashFieldConfiguration, 'sourceField'>): string;
export declare function normalizeHashString(input: string, options?: HashFieldNormalizeOptions[]): string;
