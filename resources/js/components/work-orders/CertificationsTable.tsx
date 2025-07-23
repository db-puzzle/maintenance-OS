import React from 'react';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { ColumnConfig } from '@/types/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Award } from 'lucide-react';

interface Certification {
    id: number;
    name: string;
    description?: string | null;
    issuing_organization: string;
    validity_period_days?: number | null;
    active: boolean;
}

interface CertificationsTableProps {
    selectedCertifications: Certification[];
    isViewMode: boolean;
    onRemoveCertification: (certificationId: number) => void;
}

export default function CertificationsTable({
    selectedCertifications,
    isViewMode,
    onRemoveCertification
}: CertificationsTableProps) {

    // Define columns for the certifications table
    const certificationsColumns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Certificação',
            render: (value, row) => {
                const cert = row as unknown as Certification;
                return (
                    <span className="text-sm font-medium">{cert.name}</span>
                );
            },
        },
        {
            key: 'issuing_organization',
            label: 'Organização Emissora',
            width: 'w-[250px]',
            render: (value, row) => {
                const cert = row as unknown as Certification;
                return (
                    <span className="text-sm text-muted-foreground">
                        {cert.issuing_organization}
                    </span>
                );
            },
        },
        {
            key: 'validity_period_days',
            label: 'Validade',
            width: 'w-[150px]',
            render: (value, row) => {
                const cert = row as unknown as Certification;
                if (!cert.validity_period_days) {
                    return <span className="text-sm text-muted-foreground">-</span>;
                }
                const years = Math.floor(cert.validity_period_days / 365);
                const months = Math.floor((cert.validity_period_days % 365) / 30);
                let validity = '';
                if (years > 0) {
                    validity = `${years} ${years === 1 ? 'ano' : 'anos'}`;
                }
                if (months > 0) {
                    if (validity) validity += ' e ';
                    validity += `${months} ${months === 1 ? 'mês' : 'meses'}`;
                }
                return (
                    <span className="text-sm text-muted-foreground">
                        {validity || `${cert.validity_period_days} dias`}
                    </span>
                );
            },
        },
    ];

    // Actions for each row (remove button)
    const certificationsActions = !isViewMode ? (row: Record<string, unknown>) => {
        const cert = row as unknown as Certification;
        return (
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveCertification(cert.id)}
                className="h-8 w-8 p-0"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        );
    } : undefined;

    if (selectedCertifications.length > 0) {
        return (
            <div className="[&_td]:py-1 [&_td]:text-sm [&_th]:py-1.5 [&_th]:text-sm">
                <EntityDataTable
                    data={selectedCertifications as any[]}
                    columns={certificationsColumns}
                    actions={certificationsActions}
                    emptyMessage="Nenhuma certificação selecionada"
                />
            </div>
        );
    }

    return (
        <div className="text-center py-4 text-muted-foreground border rounded-lg min-h-[60px] flex flex-col justify-center">
            <Award className="h-6 w-6 mx-auto mb-1" />
            <p className="text-sm">Nenhuma certificação adicionada</p>
        </div>
    );
} 