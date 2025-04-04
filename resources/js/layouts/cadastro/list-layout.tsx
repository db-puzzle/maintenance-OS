import { ReactNode } from 'react';
import { ListTableHeader } from '@/components/table-headers/list-table-header';

interface ListLayoutProps {
    children: ReactNode;
    title: string;
    description: string;
    searchPlaceholder?: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    createRoute: string;
    createButtonText: string;
}

export default function ListLayout({
    children,
    title,
    description,
    searchPlaceholder,
    searchValue,
    onSearchChange,
    createRoute,
    createButtonText
}: ListLayoutProps) {
    return (
        <div className="space-y-6 p-5">
            <ListTableHeader
                title={title}
                description={description}
                searchPlaceholder={searchPlaceholder}
                searchValue={searchValue}
                onSearchChange={onSearchChange}
                createRoute={createRoute}
                createButtonText={createButtonText}
            />
            {children}
        </div>
    );
} 