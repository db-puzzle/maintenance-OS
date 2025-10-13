import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, AlertTriangle, SquareChartGantt } from 'lucide-react';

interface Family {
    top_parent: {
        id: number;
        order_number: string;
        priority: number;
    };
    members: Array<{
        id: number;
        order_number: string;
        parent_id: number | null;
        quantity: number;
        status: string;
        has_route: boolean;
        step_count: number;
    }>;
    total_steps: number;
    total_orders: number;
    priority: number;
    has_dependencies: boolean;
}

interface FamilyVisualizationProps {
    families: Family[];
    selectedOrders: number[];
}

export default function FamilyVisualization({
    families,
    selectedOrders
}: FamilyVisualizationProps) {
    const getFamilyColor = (index: number) => {
        const colors = [
            'bg-blue-100 border-blue-300',
            'bg-green-100 border-green-300',
            'bg-purple-100 border-purple-300',
            'bg-yellow-100 border-yellow-300',
            'bg-pink-100 border-pink-300',
            'bg-indigo-100 border-indigo-300',
        ];
        return colors[index % colors.length];
    };

    const calculateFamilyCompletion = (family: Family) => {
        const selectedMembers = family.members.filter(m => selectedOrders.includes(m.id));
        return (selectedMembers.length / family.members.length) * 100;
    };

    const renderFamilyTree = (family: Family, members: typeof family.members, parentId: number | null = null, level: number = 0) => {
        return members
            .filter(m => m.parent_id === parentId)
            .map(member => {
                const children = members.filter(m => m.parent_id === member.id);
                const isSelected = selectedOrders.includes(member.id);

                return (
                    <div key={member.id} className={`${level > 0 ? 'ml-6' : ''}`}>
                        <div className={`px-2 py-1 rounded-md mb-0.5 flex items-center justify-between ${isSelected ? 'bg-primary/20' : 'bg-gray-50'
                            }`}>
                            <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span className="text-xs font-medium">{member.order_number}</span>
                                {!member.has_route && (
                                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs py-0 px-1">
                                    {member.step_count}s
                                </Badge>
                                <Badge variant="secondary" className="text-xs py-0 px-1">
                                    {member.status}
                                </Badge>
                            </div>
                        </div>
                        {children.length > 0 && renderFamilyTree(family, members, member.id, level + 1)}
                    </div>
                );
            });
    };

    return (
        <div className="h-full flex flex-col min-h-0">
            <div className="flex-shrink-0 mb-3">
                <div className="flex items-center justify-between text-base font-semibold">
                    <span>Selected Orders</span>
                    <Badge variant="secondary" className="text-xs">
                        {families.length} order families
                    </Badge>
                </div>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
                <ScrollArea className="h-full pr-3">
                    <div className="space-y-3">
                        {families.map((family, index) => {
                            const completion = calculateFamilyCompletion(family);
                            const familyColor = getFamilyColor(index);

                            return (
                                <div
                                    key={family.top_parent.id}
                                    className={`p-3 rounded-lg border ${familyColor}`}
                                >
                                    <div className="space-y-2">
                                        {/* Family Header */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <SquareChartGantt className="w-4 h-4" />
                                                <span className="font-semibold text-sm">
                                                    {family.top_parent.order_number}
                                                </span>
                                                <Badge className="text-xs py-0 px-1.5">P{family.priority}</Badge>
                                                {family.has_dependencies && (
                                                    <span className="text-orange-600 flex items-center gap-0.5 text-xs">
                                                        <AlertTriangle className="w-2.5 h-2.5" />
                                                        External deps
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-600">
                                                <span>{family.total_orders} orders</span>
                                                <span>{family.total_steps} steps</span>
                                            </div>
                                        </div>

                                        {/* Family Tree */}
                                        <div className="border-t pt-2">
                                            {renderFamilyTree(family, family.members)}
                                        </div>

                                        {/* Family Stats */}
                                        <div className="border-t pt-2 grid grid-cols-3 gap-1 text-xs">
                                            <div className="text-center">
                                                <div className="font-medium text-sm">{family.members.filter(m => m.has_route).length}</div>
                                                <div className="text-gray-500 text-[10px]">With Routes</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-medium text-sm">{family.members.filter(m => !m.has_route).length}</div>
                                                <div className="text-gray-500 text-[10px]">No Routes</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-medium text-sm">{Math.round(completion)}%</div>
                                                <div className="text-gray-500 text-[10px]">Selected</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
