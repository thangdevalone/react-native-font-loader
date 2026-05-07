/**
 * JS-side font cache registry.
 * Tracks which fonts have been loaded and their metadata.
 */

import type { FontLoadResult } from '../types';

const fontRegistry = new Map<string, FontLoadResult>();

export function registerFont(result: FontLoadResult): void {
  fontRegistry.set(result.name, result);
}

export function unregisterFont(name: string): void {
  fontRegistry.delete(name);
}

export function isRegistered(name: string): boolean {
  return fontRegistry.has(name);
}

export function getRegistered(name: string): FontLoadResult | undefined {
  return fontRegistry.get(name);
}

export function getAllRegistered(): string[] {
  return Array.from(fontRegistry.keys());
}

export function clearRegistry(): void {
  fontRegistry.clear();
}
