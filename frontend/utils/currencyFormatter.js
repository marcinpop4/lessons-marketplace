/**
 * Utility functions for formatting currency values
 */
/**
 * Format a cent amount into a currency string
 * @param centsAmount Amount in cents
 * @param locale Locale to use for formatting (defaults to en-US)
 * @param currency Currency code (defaults to USD)
 * @returns Formatted currency string
 */
export function formatCurrency(centsAmount, locale = 'en-US', currency = 'USD') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(centsAmount / 100);
}
/**
 * Format a cent amount into a currency string without fractional cents
 * @param centsAmount Amount in cents
 * @param locale Locale to use for formatting (defaults to en-US)
 * @param currency Currency code (defaults to USD)
 * @returns Formatted currency string without cents
 */
export function formatCurrencyWithoutCents(centsAmount, locale = 'en-US', currency = 'USD') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(centsAmount / 100);
}
/**
 * NEVER use this for calculations - only for displaying input fields!
 * Converts a cent amount to dollars
 * @param centsAmount Amount in cents
 * @returns Dollar amount as a float
 */
export function centsToFloat(centsAmount) {
    return centsAmount / 100;
}
/**
 * Converts a dollar float to cents
 * @param dollarAmount Amount in dollars (float)
 * @returns Cent amount as an integer
 */
export function floatToCents(dollarAmount) {
    return Math.round(dollarAmount * 100);
}
