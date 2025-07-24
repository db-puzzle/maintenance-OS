import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { TreePine, Grid3x3, Box, Package, Edit, QrCode, ChevronRight, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import { BillOfMaterial, BomItem } from '@/types/production';

interface Props {
    bom: BillOfMaterial & {
        items: BomItem[];
    };
}

interface ButtonGroupProps {
    children: React.ReactNode;
}

function ButtonGroup({ children }: ButtonGroupProps) {
    return (
        <div className="inline-flex rounded-md shadow-sm" role="group">
            {React.Children.map(children, (child, index) => {
                if (React.isValidElement(child)) {
                    const childElement = child as React.ReactElement<any>;
                    return React.cloneElement(childElement, {
                        className: cn(
                            childElement.props.className,
                            index === 0 && "rounded-r-none",
                            index === React.Children.count(children) - 1 && "rounded-l-none",
                            index > 0 && index < React.Children.count(children) - 1 && "rounded-none",
                            "border-l-0 first:border-l"
                        )
                    });
                }
                return child;
            })}
        </div>
    );
}

function SearchInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (value: string) => void }) {
    return (
        <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-8"
            />
        </div>
    );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm">{value || '—'}</dd>
        </div>
    );
}

export default function BomHierarchyView({ bom }: Props) {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [selectedItem, setSelectedItem] = useState<BomItem | null>(null);
    const [viewMode, setViewMode] = useState<'tree' | 'grid' | '3d'>('tree');
    const [searchValue, setSearchValue] = useState('');

    const breadcrumbs = [
        { title: 'Produção', href: '/' },
        { title: 'BOMs', href: route('production.bom.index') },
        { title: bom.name, href: route('production.bom.show', bom.id) },
        { title: 'Hierarquia', href: '' }
    ];

    const handleToggleExpand = (itemId: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(itemId)) {
            newExpanded.delete(itemId);
        } else {
            newExpanded.add(itemId);
        }
        setExpandedNodes(newExpanded);
    };

    // Filter items based on search
    const filteredItems = useMemo(() => {
        if (!searchValue) return bom.items;

        const searchLower = searchValue.toLowerCase();

        const filterRecursive = (items: BomItem[]): BomItem[] => {
            return items.reduce((acc: BomItem[], item) => {
                const matchesSearch =
                    item.item?.item_number?.toLowerCase().includes(searchLower) ||
                    item.item?.name?.toLowerCase().includes(searchLower);

                if (matchesSearch) {
                    acc.push(item);
                } else if (item.children && item.children.length > 0) {
                    const filteredChildren = filterRecursive(item.children);
                    if (filteredChildren.length > 0) {
                        acc.push({ ...item, children: filteredChildren });
                    }
                }

                return acc;
            }, []);
        };

        return filterRecursive(bom.items);
    }, [bom.items, searchValue]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-[calc(100vh-8rem)] flex">
                {/* Left Panel - Hierarchy Tree */}
                <div className="w-1/3 border-r flex flex-col">
                    <div className="p-4 border-b">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">{bom.name}</h2>
                            <ButtonGroup>
                                <Button
                                    variant={viewMode === 'tree' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('tree')}
                                >
                                    <TreePine className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Grid3x3 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === '3d' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('3d')}
                                    disabled
                                >
                                    <Box className="h-4 w-4" />
                                </Button>
                            </ButtonGroup>
                        </div>
                        <SearchInput
                            placeholder="Buscar item..."
                            value={searchValue}
                            onChange={setSearchValue}
                        />
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                        {viewMode === 'tree' && (
                            <BomTreeView
                                items={filteredItems}
                                expandedNodes={expandedNodes}
                                onToggleExpand={handleToggleExpand}
                                selectedItem={selectedItem}
                                onSelectItem={setSelectedItem}
                            />
                        )}
                        {viewMode === 'grid' && (
                            <BomGridView
                                items={filteredItems}
                                selectedItem={selectedItem}
                                onSelectItem={setSelectedItem}
                            />
                        )}
                    </div>
                </div>

                {/* Right Panel - Item Details */}
                <div className="flex-1 flex flex-col">
                    {selectedItem ? (
                        <>
                            <div className="p-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {selectedItem.item?.item_number}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedItem.item?.name}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={route('production.items.show', selectedItem.item_id)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Ver Item
                                            </Link>
                                        </Button>
                                        {selectedItem.qr_code && (
                                            <Button variant="outline" size="sm">
                                                <QrCode className="h-4 w-4 mr-2" />
                                                QR Code
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-4">
                                <BomItemDetails item={selectedItem} />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Package className="h-12 w-12 mx-auto mb-4" />
                                <p>Selecione um item para ver os detalhes</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

// BOM Tree View Component
function BomTreeView({
    items,
    expandedNodes,
    onToggleExpand,
    selectedItem,
    onSelectItem,
    level = 0
}: {
    items: BomItem[];
    expandedNodes: Set<string>;
    onToggleExpand: (itemId: string) => void;
    selectedItem: BomItem | null;
    onSelectItem: (item: BomItem) => void;
    level?: number;
}) {
    return (
        <div className="space-y-1">
            {items.map((item) => (
                <BomTreeNode
                    key={item.id}
                    bomItem={item}
                    level={level}
                    isExpanded={expandedNodes.has(item.id.toString())}
                    onToggle={() => onToggleExpand(item.id.toString())}
                    onSelect={() => onSelectItem(item)}
                    isSelected={selectedItem?.id === item.id}
                >
                    {item.children && item.children.length > 0 && expandedNodes.has(item.id.toString()) && (
                        <BomTreeView
                            items={item.children}
                            level={level + 1}
                            expandedNodes={expandedNodes}
                            onToggleExpand={onToggleExpand}
                            selectedItem={selectedItem}
                            onSelectItem={onSelectItem}
                        />
                    )}
                </BomTreeNode>
            ))}
        </div>
    );
}

// BOM Tree Node Component
function BomTreeNode({
    bomItem,
    level,
    isExpanded,
    onToggle,
    onSelect,
    isSelected,
    children
}: {
    bomItem: BomItem;
    level: number;
    isExpanded: boolean;
    onToggle: () => void;
    onSelect: () => void;
    isSelected: boolean;
    children?: React.ReactNode;
}) {
    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-2 py-1 px-2 rounded cursor-pointer",
                    "hover:bg-muted/50",
                    isSelected && "bg-muted"
                )}
                style={{ paddingLeft: `${level * 24 + 8}px` }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle();
                    }}
                    className="p-0.5"
                >
                    {bomItem.children && bomItem.children.length > 0 ? (
                        isExpanded ?
                            <ChevronDown className="h-4 w-4" /> :
                            <ChevronRight className="h-4 w-4" />
                    ) : (
                        <div className="w-4" />
                    )}
                </button>

                {bomItem.thumbnail_path && (
                    <img
                        src={bomItem.thumbnail_path}
                        alt={bomItem.item?.name}
                        className="w-8 h-8 object-cover rounded"
                    />
                )}

                <div className="flex-1" onClick={onSelect}>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                            {bomItem.item?.item_number}
                        </span>
                        <Badge variant="outline" className="text-xs">
                            {bomItem.quantity} {bomItem.unit_of_measure}
                        </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {bomItem.item?.name}
                    </span>
                </div>

                {bomItem.qr_code && (
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                )}
            </div>
            {children}
        </div>
    );
}

// BOM Grid View Component
function BomGridView({
    items,
    selectedItem,
    onSelectItem
}: {
    items: BomItem[];
    selectedItem: BomItem | null;
    onSelectItem: (item: BomItem) => void;
}) {
    const flattenItems = (items: BomItem[], level = 0): Array<BomItem & { level: number }> => {
        return items.reduce((acc: Array<BomItem & { level: number }>, item) => {
            acc.push({ ...item, level });
            if (item.children && item.children.length > 0) {
                acc.push(...flattenItems(item.children, level + 1));
            }
            return acc;
        }, []);
    };

    const flatItems = flattenItems(items);

    return (
        <div className="grid grid-cols-2 gap-2">
            {flatItems.map((item) => (
                <Card
                    key={item.id}
                    className={cn(
                        "cursor-pointer transition-colors",
                        "hover:bg-muted/50",
                        selectedItem?.id === item.id && "ring-2 ring-primary"
                    )}
                    onClick={() => onSelectItem(item)}
                >
                    <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                            {item.thumbnail_path && (
                                <img
                                    src={item.thumbnail_path}
                                    alt={item.item?.name}
                                    className="w-12 h-12 object-cover rounded"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                    {item.item?.item_number}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {item.item?.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                        {item.quantity} {item.unit_of_measure}
                                    </Badge>
                                    {item.level > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                            Nível {item.level}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// BOM Item Details Component
function BomItemDetails({ item }: { item: BomItem }) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Informações do Componente</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Quantidade" value={`${item.quantity} ${item.unit_of_measure}`} />
                        <DetailItem label="Posição" value={item.position} />
                        <DetailItem label="Referência" value={item.reference} />
                        <DetailItem label="Tipo" value={item.item?.item_type} />
                    </div>
                    {item.notes && (
                        <div className="mt-4">
                            <DetailItem label="Observações" value={item.notes} />
                        </div>
                    )}
                </CardContent>
            </Card>

            {item.item && (
                <Card>
                    <CardHeader>
                        <CardTitle>Detalhes do Item</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <DetailItem label="Categoria" value={item.item.category} />
                            <DetailItem label="Status" value={
                                <Badge variant={item.item.status === 'active' ? 'default' : 'secondary'}>
                                    {item.item.status}
                                </Badge>
                            } />
                            <DetailItem label="Lead Time" value={`${item.item.lead_time_days} dias`} />
                            <DetailItem label="Custo" value={item.item.cost ? `R$ ${item.item.cost}` : '—'} />
                        </div>
                        {item.item.description && (
                            <div className="mt-4">
                                <DetailItem label="Descrição" value={item.item.description} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 