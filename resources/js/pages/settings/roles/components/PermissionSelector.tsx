import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Search, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Permission {
    id: number;
    name: string;
    display_name: string | null;
    description: string | null;
    resource: string;
    action: string;
    scope: string | null;
    is_global: boolean;
    is_scoped: boolean;
}

interface PermissionSelectorProps {
    permissions: Record<string, Permission[]>;
    selectedPermissions: number[];
    onPermissionToggle: (permissionId: number) => void;
    onSelectAll: (permissionIds: number[]) => void;
    onClearAll: () => void;
    disabled?: boolean;
}

export function PermissionSelector({
    permissions,
    selectedPermissions,
    onPermissionToggle,
    onSelectAll,
    onClearAll,
    disabled = false,
}: PermissionSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Filter permissions based on search term
    const filteredPermissions = useMemo(() => {
        if (!searchTerm) return permissions;

        const filtered: Record<string, Permission[]> = {};

        Object.entries(permissions).forEach(([resource, perms]) => {
            const matchingPerms = perms.filter(perm =>
                perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (perm.display_name && perm.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (perm.description && perm.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );

            if (matchingPerms.length > 0) {
                filtered[resource] = matchingPerms;
            }
        });

        return filtered;
    }, [permissions, searchTerm]);

    const allPermissionIds = useMemo(() => {
        return Object.values(permissions).flat().map(p => p.id);
    }, [permissions]);

    const toggleGroup = (resource: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(resource)) {
                next.delete(resource);
            } else {
                next.add(resource);
            }
            return next;
        });
    };

    const toggleAllInGroup = (resource: string, perms: Permission[]) => {
        const groupPermIds = perms.map(p => p.id);
        const allSelected = groupPermIds.every(id => selectedPermissions.includes(id));

        if (allSelected) {
            // Remove all from this group
            const newSelected = selectedPermissions.filter(id => !groupPermIds.includes(id));
            onSelectAll(newSelected);
        } else {
            // Add all from this group
            const newSelected = [...new Set([...selectedPermissions, ...groupPermIds])];
            onSelectAll(newSelected);
        }
    };

    const getResourceLabel = (resource: string): string => {
        const labels: Record<string, string> = {
            'system': 'System',
            'users': 'User Management',
            'roles': 'Role Management',
            'plants': 'Plants',
            'areas': 'Areas',
            'sectors': 'Sectors',
            'assets': 'Assets',
            'work-orders': 'Work Orders',
            'parts': 'Parts',
            'shifts': 'Shifts',
            'asset-types': 'Asset Types',
            'manufacturers': 'Manufacturers',
        };

        return labels[resource] || resource.charAt(0).toUpperCase() + resource.slice(1);
    };

    const getActionLabel = (action: string): string => {
        const labels: Record<string, string> = {
            'viewAny': 'View List',
            'view': 'View Details',
            'create': 'Create',
            'update': 'Update',
            'delete': 'Delete',
            'manage': 'Manage',
            'execute': 'Execute',
            'export': 'Export',
            'import': 'Import',
            'invite': 'Invite Users',
            'execute-routines': 'Execute Routines',
            'manage-shifts': 'Manage Shifts',
            'bulk-import-assets': 'Bulk Import Assets',
            'bulk-export-assets': 'Bulk Export Assets',
            'manage-permissions': 'Manage Permissions',
        };

        return labels[action] || action;
    };

    return (
        <div className="space-y-4">
            {/* Search and Actions */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search permissions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                        disabled={disabled}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectAll(allPermissionIds)}
                        disabled={disabled}
                    >
                        Select All
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onClearAll}
                        disabled={disabled}
                    >
                        Clear All
                    </Button>
                </div>
            </div>

            {/* Permission Groups */}
            <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                    {Object.entries(filteredPermissions).map(([resource, perms]) => {
                        const groupPermIds = perms.map(p => p.id);
                        const selectedInGroup = groupPermIds.filter(id => selectedPermissions.includes(id)).length;
                        const allSelected = selectedInGroup === perms.length;
                        const someSelected = selectedInGroup > 0 && selectedInGroup < perms.length;

                        return (
                            <Collapsible
                                key={resource}
                                open={expandedGroups.has(resource)}
                                onOpenChange={() => toggleGroup(resource)}
                            >
                                <div className="border rounded-lg">
                                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={someSelected ? "indeterminate" : allSelected}
                                                onCheckedChange={() => toggleAllInGroup(resource, perms)}
                                                disabled={disabled}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{getResourceLabel(resource)}</span>
                                                <Badge variant="secondary">
                                                    {selectedInGroup}/{perms.length}
                                                </Badge>
                                            </div>
                                        </div>
                                        <ChevronDown
                                            className={cn(
                                                "h-4 w-4 text-muted-foreground transition-transform",
                                                expandedGroups.has(resource) && "rotate-180"
                                            )}
                                        />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <div className="px-4 pb-4 space-y-2">
                                            {perms.map((permission) => (
                                                <div
                                                    key={permission.id}
                                                    className="flex items-start gap-3 py-2"
                                                >
                                                    <Checkbox
                                                        checked={selectedPermissions.includes(permission.id)}
                                                        onCheckedChange={() => onPermissionToggle(permission.id)}
                                                        disabled={disabled}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-medium">
                                                                {permission.display_name || permission.name}
                                                            </p>
                                                            {permission.is_scoped && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    Entity-scoped
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {permission.description && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {permission.description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <code className="px-1 py-0.5 bg-muted rounded">
                                                                {permission.name}
                                                            </code>
                                                            <span>•</span>
                                                            <span>{getActionLabel(permission.action)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        );
                    })}

                    {Object.keys(filteredPermissions).length === 0 && (
                        <div className="text-center py-8">
                            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {searchTerm
                                    ? 'No permissions match your search'
                                    : 'No permissions available'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
