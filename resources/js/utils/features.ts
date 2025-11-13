/**
 * Feature Flags Utility
 * 
 * Provides helpers for checking feature availability on the frontend.
 * Features are passed from the backend through page props.
 */

import { usePage } from '@inertiajs/react';

/**
 * Feature flags interface
 */
export interface Features {
    [key: string]: boolean;
}

/**
 * Hook to get enabled features from page props.
 * 
 * @returns Object with feature keys as properties and boolean values
 */
export function useFeatures(): Features {
    const { props } = usePage();
    return (props as { features?: Features }).features || {};
}

/**
 * Check if a feature is enabled.
 * 
 * @param featureKey - The feature key to check
 * @returns Whether the feature is enabled
 */
export function useFeature(featureKey: string): boolean {
    const features = useFeatures();
    return features[featureKey] === true;
}

/**
 * Check if multiple features are enabled.
 * 
 * @param featureKeys - Array of feature keys to check
 * @returns Object with feature keys and their enabled status
 */
export function useMultipleFeatures(featureKeys: string[]): Record<string, boolean> {
    const features = useFeatures();
    const result: Record<string, boolean> = {};
    
    featureKeys.forEach(key => {
        result[key] = features[key] === true;
    });
    
    return result;
}

/**
 * Check if any of the provided features are enabled.
 * 
 * @param featureKeys - Array of feature keys to check
 * @returns True if at least one feature is enabled
 */
export function useAnyFeature(featureKeys: string[]): boolean {
    const features = useFeatures();
    return featureKeys.some(key => features[key] === true);
}

/**
 * Check if all of the provided features are enabled.
 * 
 * @param featureKeys - Array of feature keys to check
 * @returns True if all features are enabled
 */
export function useAllFeatures(featureKeys: string[]): boolean {
    const features = useFeatures();
    return featureKeys.every(key => features[key] === true);
}

/**
 * Get all enabled feature keys.
 * 
 * @returns Array of enabled feature keys
 */
export function useEnabledFeatures(): string[] {
    const features = useFeatures();
    return Object.keys(features).filter(key => features[key] === true);
}

/**
 * Feature flag constants for better type safety and autocompletion.
 */
export const FEATURES = {
    // Production features
    PRODUCTION_STEP_TYPES_ADVANCED: 'production_step_types_advanced',
    PRODUCTION_FORMS_ENGINE: 'production_forms_engine',
    PRODUCTION_SCHEDULER: 'production_scheduler',
    
    // Add more feature flags as they are created
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

