import React from 'react';
import HierarchicalConfiguration from './HierarchicalConfiguration';
import { BomItem, Item } from '@/types/production';

interface BomConfigurationProps {
  bomId: number;
  versionId: number;
  bomItems: (BomItem & { item: Item; children?: any[] })[];
  availableItems: Item[];
  canEdit: boolean;
  onUpdate?: () => void;
  bom?: {
    name: string;
    bom_number: string;
    current_version?: {
      version_number: number;
      items?: any[];
    };
    versions?: any[];
  };
}

/**
 * BomConfiguration component - wrapper for HierarchicalConfiguration
 * This component maintains backward compatibility while delegating
 * all functionality to the generic HierarchicalConfiguration component
 */
export default function BomConfiguration({
  bomId,
  versionId,
  bomItems,
  availableItems,
  canEdit,
  onUpdate,
  bom
}: BomConfigurationProps) {
  return (
    <HierarchicalConfiguration
      type="bom"
      bomId={bomId}
      versionId={versionId}
      bomItems={bomItems}
      availableItems={availableItems}
      canEdit={canEdit}
      onUpdate={onUpdate}
      bom={bom}
    />
  );
}