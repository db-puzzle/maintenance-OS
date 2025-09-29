import React, { createContext, useContext } from 'react';

interface PortalContextType {
    container: HTMLElement | null;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{
    container: HTMLElement | null;
    children: React.ReactNode;
}> = ({ container, children }) => {
    return (
        <PortalContext.Provider value={{ container }}>
            {children}
        </PortalContext.Provider>
    );
};

export const usePortalContainer = () => {
    const context = useContext(PortalContext);
    return context?.container || null;
};
