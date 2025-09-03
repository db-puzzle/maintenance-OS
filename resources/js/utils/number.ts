/**
 * Number formatting utilities
 */

/**
 * Formats a number intelligently by removing unnecessary trailing zeros
 * and decimal places for whole numbers.
 * 
 * @param value - The number to format (can be number, string, null, or undefined)
 * @returns Formatted string representation of the number
 * 
 * @example
 * formatNumber(50.0000) // "50"
 * formatNumber(50.25) // "50.25"
 * formatNumber("123.456") // "123.456"
 * formatNumber(null) // ""
 * formatNumber(undefined) // ""
 */
export const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '';

    // Convert to number if it's not already
    const numValue = typeof value === 'number' ? value : Number(value);

    // Check if it's a valid number
    if (isNaN(numValue)) return '';

    // If it's a whole number, display without decimals
    if (Number.isInteger(numValue)) {
        return numValue.toString();
    }

    // For decimals, remove trailing zeros
    return parseFloat(numValue.toFixed(10)).toString();
};

/**
 * Formats a number as currency with intelligent decimal handling
 * 
 * @param value - The number to format
 * @param currency - Currency symbol (default: 'R$')
 * @param locale - Locale for formatting (default: 'pt-BR')
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234.5) // "R$ 1.234,50"
 * formatCurrency(1000) // "R$ 1.000"
 */
export const formatCurrency = (
    value: number | string | null | undefined,
    currency: string = 'R$',
    locale: string = 'pt-BR'
): string => {
    const numValue = typeof value === 'number' ? value : Number(value);

    if (isNaN(numValue) || value === null || value === undefined) return '';

    // Format with locale-specific number formatting
    const formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: Number.isInteger(numValue) ? 0 : 2,
        maximumFractionDigits: 2,
    });

    return `${currency} ${formatter.format(numValue)}`;
};

/**
 * Formats a number as a percentage with intelligent decimal handling
 * 
 * @param value - The number to format (should be between 0-100)
 * @param decimals - Maximum number of decimal places (default: auto)
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercentage(85) // "85%"
 * formatPercentage(85.5) // "85.5%"
 * formatPercentage(85.50) // "85.5%"
 */
export const formatPercentage = (
    value: number | string | null | undefined,
    decimals?: number
): string => {
    const numValue = typeof value === 'number' ? value : Number(value);

    if (isNaN(numValue) || value === null || value === undefined) return '';

    if (decimals !== undefined) {
        return `${numValue.toFixed(decimals)}%`;
    }

    // Use intelligent formatting (remove trailing zeros)
    return `${formatNumber(numValue)}%`;
};

/**
 * Formats a number with thousand separators
 * 
 * @param value - The number to format
 * @param locale - Locale for formatting (default: 'pt-BR')
 * @returns Formatted number string with separators
 * 
 * @example
 * formatThousands(1234567.89) // "1.234.567,89"
 * formatThousands(1000) // "1.000"
 */
export const formatThousands = (
    value: number | string | null | undefined,
    locale: string = 'pt-BR'
): string => {
    const numValue = typeof value === 'number' ? value : Number(value);

    if (isNaN(numValue) || value === null || value === undefined) return '';

    const formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: Number.isInteger(numValue) ? 0 : 10,
    });

    // Remove trailing zeros for decimals
    const formatted = formatter.format(numValue);
    return formatted.replace(/,?0+$/, '');
};

/**
 * Parses a formatted number string back to a number
 * Handles various formats including Brazilian locale formatting
 * 
 * @param value - The formatted number string
 * @returns Parsed number or NaN if invalid
 * 
 * @example
 * parseNumber("1.234,56") // 1234.56
 * parseNumber("1,234.56") // 1234.56
 * parseNumber("50") // 50
 */
export const parseNumber = (value: string | null | undefined): number => {
    if (!value || typeof value !== 'string') return NaN;

    // Remove spaces and currency symbols
    let cleaned = value.replace(/[^\d.,\-+]/g, '');

    // Handle Brazilian format (1.234,56) vs US format (1,234.56)
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    if (lastComma > lastDot) {
        // Brazilian format: 1.234,56
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        // US format: 1,234.56
        cleaned = cleaned.replace(/,/g, '');
    }

    return Number(cleaned);
};
