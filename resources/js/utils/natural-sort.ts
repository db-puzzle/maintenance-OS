/**
 * Natural/Alphanumeric sorting utility
 * Properly sorts strings containing numbers in a human-friendly way
 */

/**
 * Compares two strings using natural/alphanumeric sorting
 * @param a First string to compare
 * @param b Second string to compare
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function naturalCompare(a: string, b: string): number {
    // Split strings into parts (numeric and non-numeric)
    const aParts = a.split(/(\d+)/);
    const bParts = b.split(/(\d+)/);

    const maxLength = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < maxLength; i++) {
        const aPart = aParts[i] || '';
        const bPart = bParts[i] || '';

        // If one part is missing, the shorter string comes first
        if (!aPart && bPart) return -1;
        if (aPart && !bPart) return 1;

        // Check if both parts are numeric
        const aIsNum = /^\d+$/.test(aPart);
        const bIsNum = /^\d+$/.test(bPart);

        if (aIsNum && bIsNum) {
            // Compare as numbers
            const aNum = parseInt(aPart, 10);
            const bNum = parseInt(bPart, 10);
            if (aNum !== bNum) {
                return aNum - bNum;
            }
        } else if (aIsNum && !bIsNum) {
            // Numbers come before non-numbers
            return -1;
        } else if (!aIsNum && bIsNum) {
            // Non-numbers come after numbers
            return 1;
        } else {
            // Compare as strings
            const strCompare = aPart.localeCompare(bPart);
            if (strCompare !== 0) {
                return strCompare;
            }
        }
    }

    return 0;
}

/**
 * Sorts an array of objects by a string property using natural sorting
 * @param array Array to sort
 * @param key Property key to sort by
 * @param direction Sort direction ('asc' or 'desc')
 * @returns Sorted array (new array)
 */
export function naturalSort<T extends Record<string, unknown>>(
    array: T[],
    key: keyof T,
    direction: 'asc' | 'desc' = 'asc'
): T[] {
    const sorted = [...array].sort((a, b) => {
        const aValue = String(a[key] || '');
        const bValue = String(b[key] || '');
        const comparison = naturalCompare(aValue, bValue);
        return direction === 'asc' ? comparison : -comparison;
    });
    return sorted;
}
