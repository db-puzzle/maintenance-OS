import React from 'react';
import BomHierarchicalView from './BomHierarchicalView';
import { BomItem, Item, ItemCategory, BomVersion } from '@/types/production';

interface BomConfigurationProps {
  bomId: number;
  versionId: number;
  bomItems: (BomItem & { item: Item; children?: (BomItem & { item: Item })[] })[];
  availableItems: Item[];
  categories?: ItemCategory[];
  canEdit: boolean;
  onUpdate?: () => void;
  bom?: {
    name: string;
    bom_number: string;
    current_version?: {
      version_number: number;
      items?: BomItem[];
    };
    versions?: BomVersion[];
  };
}

/**
 * BomConfiguration component - wrapper for BomHierarchicalView
 * This component maintains backward compatibility while delegating
 * all functionality to the new BomHierarchicalView component
 */
export default function BomConfiguration({
  bomId,
  versionId,
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
      versionId={versionId}
      bomItems={bomItems}
      availableItems={availableItems}
      categories={categories}
      canEdit={canEdit}
      onUpdate={onUpdate}
      bom={bom}
    />
  );
}