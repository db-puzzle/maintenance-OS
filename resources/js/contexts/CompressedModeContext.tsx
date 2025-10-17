import { createContext, useContext } from 'react';

interface CompressedModeContextType {
    isCompressed: boolean;
}

const CompressedModeContext = createContext<CompressedModeContextType | undefined>(undefined);

export function useCompressedMode() {
    const context = useContext(CompressedModeContext);
    return context?.isCompressed ?? false;
}

export default CompressedModeContext;

