/**
 * @file utils.ts
 * @description Core CSS utility functions for conditional class concatenation and Tailwind conflict resolution.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges conditional CSS class names into a single string while resolving conflicting Tailwind CSS classes.
 *
 * @param inputs - Array or spread of class names, conditionals, objects, or arrays
 * @returns Deduplicated, normalized CSS class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
