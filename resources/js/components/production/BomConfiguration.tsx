import React from 'react';
import BomHierarchicalView from './BomHierarchicalView';
import { BomItem, Item, ItemCategory } from '@/types/production';

interface BomConfigurationProps {
  bomId: number;
  bomItems: (BomItem & { item: Item; children?: (BomItem & { item: Item })[] })[];
  availableItems: Item[];
  categories?: ItemCategory[];
  canEdit: boolean;
  onUpdate?: () => void;
  bom?: {
    name: string;
    bom_number: string;
    items?: BomItem[];
  };
}

/**
 * BomConfiguration component - wrapper for BomHierarchicalView
 * This component maintains backward compatibility while delegating
 * all functionality to the new BomHierarchicalView component
 */
export default function BomConfiguration({
  bomId,
  bomItems,
  availableItems,
  categories,
  canEdit,
  onUpdate,
  bom
}: BomConfigurationProps) {
  return (
    <BomHierarchicalView
      bomId={bomId}
      bomItems={bomItems}
      availableItems={availableItems}
      categories={categories}
      canEdit={canEdit}
      onUpdate={onUpdate}
      bom={bom}
    />
  );
}
