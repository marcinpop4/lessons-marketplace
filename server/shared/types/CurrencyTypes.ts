/**
 * Type definitions for currency handling in the application
 * Following the guidelines in docs/CURRENCY_GUIDELINES.md
 */

/**
 * Type guard to validate if a value is a valid cents amount (integer)
 * @param value The value to check
 * @returns True if the value is a valid cents amount (integer)
 */
export function isCentsValue(value: unknown): value is number {
  return (
    typeof value === 'number' && 
    Number.isInteger(value) && 
    !Number.isNaN(value)
  );
}

/**
 * Convert a dollar amount (float) to cents (integer)
 * @param dollarAmount Dollar amount as a float
 * @returns Cent amount as an integer
 */
export function dollarsToCents(dollarAmount: number): number {
  return Math.round(dollarAmount * 100);
}

/**
 * DANGER: Only use for UI display purposes, never for calculations!
 * Convert a cents amount to dollars for display only
 * @param centsAmount Amount in cents
 * @returns Dollar amount as a float
 */
export function centsToDisplayDollars(centsAmount: number): number {
  if (!isCentsValue(centsAmount)) {
    throw new Error('Invalid cents amount: must be an integer');
  }
  return centsAmount / 100;
} 