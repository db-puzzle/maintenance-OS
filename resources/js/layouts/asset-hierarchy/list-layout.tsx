import { ListTableHeader } from '@/components/table-headers/list-table-header';
import { ReactNode } from 'react';

interface ListLayoutProps {
    children: ReactNode;
    title: string;
    description: string;
    searchPlaceholder?: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    createRoute?: string;
    onCreateClick?: () => void;
    createButtonText: string;
    actions?: ReactNode;
}

export default function ListLayout({
    children,
    title,
    description,
    searchPlaceholder,
    searchValue,
    onSearchChange,
    createRoute,
    onCreateClick,
    createButtonText,
    actions,
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
                onCreateClick={onCreateClick}
                createButtonText={createButtonText}
                actions={actions}
            />
            {children}
        </div>
    );
}
