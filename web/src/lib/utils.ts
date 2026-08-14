import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * "NOT_APPLICABLE" -> "Not Applicable". Base UI's <Select.Value> shows the
 * raw selected value unless given explicit children, unlike Radix which
 * auto-displays the matching item's label - use this as a quick fallback
 * label for enum values whose SelectItem children are just their title case.
 */
export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
