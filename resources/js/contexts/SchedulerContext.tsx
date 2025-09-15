import React, { createContext, useContext, ReactNode } from 'react';

interface SchedulerContextType {
    versionId: number | null;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

interface SchedulerProviderProps {
    children: ReactNode;
    versionId: number | null;
}

export function SchedulerProvider({ children, versionId }: SchedulerProviderProps) {
    return (
        <SchedulerContext.Provider value={{ versionId }}>
            {children}
        </SchedulerContext.Provider>
    );
}

export function useSchedulerContext() {
    const context = useContext(SchedulerContext);
    if (context === undefined) {
        throw new Error('useSchedulerContext must be used within a SchedulerProvider');
    }
    return context;
}