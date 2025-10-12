import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Package, AlertTriangle, CheckCircle } from 'lucide-react';

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
                        <div className={`p-2 rounded-md mb-1 flex items-center justify-between ${isSelected ? 'bg-primary/20' : 'bg-gray-50'
                            }`}>
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                <span className="text-sm font-medium">{member.order_number}</span>
                                {!member.has_route && (
                                    <AlertTriangle className="w-4 h-4 text-orange-500" title="No route defined" />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                    {member.step_count} steps
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Family Groups</span>
                    <Badge variant="secondary">
                        {families.length} families
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {families.map((family, index) => {
                        const completion = calculateFamilyCompletion(family);
                        const familyColor = getFamilyColor(index);

                        return (
                            <div
                                key={family.top_parent.id}
                                className={`p-4 rounded-lg border-2 ${familyColor}`}
                            >
                                <div className="space-y-3">
                                    {/* Family Header */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-5 h-5" />
                                                <span className="font-semibold text-lg">
                                                    {family.top_parent.order_number}
                                                </span>
                                                <Badge>Priority: {family.priority}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                                <span>{family.total_orders} orders</span>
                                                <span>{family.total_steps} total steps</span>
                                                {family.has_dependencies && (
                                                    <span className="text-orange-600 flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        External dependencies
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-600 mb-1">Selection</div>
                                            <Progress value={completion} className="w-24 h-2" />
                                        </div>
                                    </div>

                                    {/* Family Tree */}
                                    <div className="border-t pt-3">
                                        {renderFamilyTree(family, family.members)}
                                    </div>

                                    {/* Family Stats */}
                                    <div className="border-t pt-3 grid grid-cols-3 gap-2 text-sm">
                                        <div className="text-center">
                                            <div className="font-medium">{family.members.filter(m => m.has_route).length}</div>
                                            <div className="text-gray-500">With Routes</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-medium">{family.members.filter(m => !m.has_route).length}</div>
                                            <div className="text-gray-500">Missing Routes</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-medium">{Math.round(completion)}%</div>
                                            <div className="text-gray-500">Selected</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
