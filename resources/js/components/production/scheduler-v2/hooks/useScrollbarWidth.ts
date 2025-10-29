import { useEffect, useState } from 'react';

export const useScrollbarWidth = () => {
    const [scrollbarWidth, setScrollbarWidth] = useState(0);

    useEffect(() => {
        const calculateScrollbarWidth = () => {
            // Create a temporary div with scrollbar
            const outer = document.createElement('div');
            outer.style.visibility = 'hidden';
            outer.style.overflow = 'scroll';
            (outer.style as CSSStyleDeclaration & { msOverflowStyle?: string }).msOverflowStyle = 'scrollbar'; // needed for IE
            document.body.appendChild(outer);

            // Create inner div
            const inner = document.createElement('div');
            outer.appendChild(inner);

            // Calculate scrollbar width
            const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

            // Clean up
            outer.parentNode?.removeChild(outer);

            return scrollbarWidth;
        };

        setScrollbarWidth(calculateScrollbarWidth());
    }, []);

    return scrollbarWidth;
};
