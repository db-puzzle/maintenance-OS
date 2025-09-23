import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { DuplicateCheckResult, DuplicateAction } from '@/types/media';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/utils/format';

interface DuplicateResolverProps {
    file: File;
    duplicateCheck: DuplicateCheckResult;
    onResolve: (action: DuplicateAction) => void;
    onCancel: () => void;
}

export function DuplicateResolver({
    file,
    duplicateCheck,
    onResolve,
    onCancel,
}: DuplicateResolverProps) {
    const [selectedAction, setSelectedAction] = useState<DuplicateAction['action']>('skip');
    const [selectedMatch, setSelectedMatch] = useState(duplicateCheck.matches[0]);

    const getConfidenceBadge = (confidence: number) => {
        if (confidence >= 0.95) return <Badge variant="destructive">Exact Match</Badge>;
        if (confidence >= 0.85) return <Badge className="bg-orange-500">Very Similar</Badge>;
        return <Badge variant="secondary">Similar</Badge>;
    };

    const handleResolve = () => {
        onResolve({
            action: selectedAction,
            originalMediaId: selectedMatch?.id,
        });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Duplicate Detected
                        {getConfidenceBadge(duplicateCheck.confidence)}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Visual Comparison */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-medium mb-2">New File</h4>
                            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                                {file.type.startsWith('image/') && (
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt="New file"
                                        className="w-full h-full object-contain"
                                    />
                                )}
                                {!file.type.startsWith('image/') && (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        <span className="text-4xl">📄</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium mb-2">Existing File</h4>
                            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                                {selectedMatch?.is_image && (
                                    <img
                                        src={selectedMatch.url}
                                        alt={selectedMatch.name}
                                        className="w-full h-full object-contain"
                                    />
                                )}
                                {!selectedMatch?.is_image && (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        <span className="text-4xl">📄</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Metadata Comparison */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <h4 className="font-medium mb-2">New File</h4>
                            <dl className="space-y-1">
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Name:</dt>
                                    <dd className="font-mono text-xs">{file.name}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Size:</dt>
                                    <dd>{formatBytes(file.size)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Type:</dt>
                                    <dd>{file.type}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Modified:</dt>
                                    <dd>{new Date(file.lastModified).toLocaleString()}</dd>
                                </div>
                            </dl>
                        </div>

                        <div>
                            <h4 className="font-medium mb-2">Existing File</h4>
                            <dl className="space-y-1">
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Name:</dt>
                                    <dd className="font-mono text-xs">{selectedMatch?.name}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Size:</dt>
                                    <dd>{selectedMatch?.human_readable_size}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Type:</dt>
                                    <dd>{selectedMatch?.mime_type}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Uploaded:</dt>
                                    <dd>{selectedMatch && new Date(selectedMatch.uploaded_at).toLocaleString()}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    {/* Multiple matches */}
                    {duplicateCheck.matches.length > 1 && (
                        <div>
                            <h4 className="font-medium mb-2">Multiple Matches Found</h4>
                            <div className="grid grid-cols-4 gap-2">
                                {duplicateCheck.matches.map((match) => (
                                    <button
                                        key={match.id}
                                        onClick={() => setSelectedMatch(match)}
                                        className={cn(
                                            'relative aspect-square rounded-lg overflow-hidden border-2',
                                            selectedMatch?.id === match.id
                                                ? 'border-primary'
                                                : 'border-transparent'
                                        )}
                                    >
                                        {match.is_image && match.conversions?.thumb && (
                                            <img
                                                src={match.conversions.thumb}
                                                alt={match.name}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        {(!match.is_image || !match.conversions?.thumb) && (
                                            <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
                                                <span className="text-2xl">📄</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Selection */}
                    <div>
                        <h4 className="font-medium mb-3">Choose Action</h4>
                        <RadioGroup value={selectedAction} onValueChange={(value) => setSelectedAction(value as DuplicateAction['action'])}>
                            <div className="space-y-3">
                                <div className="flex items-start space-x-3">
                                    <RadioGroupItem value="skip" id="skip" />
                                    <div className="flex-1">
                                        <Label htmlFor="skip" className="font-medium cursor-pointer">
                                            Skip Upload
                                        </Label>
                                        <p className="text-sm text-gray-500">
                                            Don't upload this file, keep the existing one
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <RadioGroupItem value="replace" id="replace" />
                                    <div className="flex-1">
                                        <Label htmlFor="replace" className="font-medium cursor-pointer">
                                            Replace Existing
                                        </Label>
                                        <p className="text-sm text-gray-500">
                                            Upload this file and replace the existing one
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <RadioGroupItem value="keep-both" id="keep-both" />
                                    <div className="flex-1">
                                        <Label htmlFor="keep-both" className="font-medium cursor-pointer">
                                            Keep Both
                                        </Label>
                                        <p className="text-sm text-gray-500">
                                            Upload as a new file alongside the existing one
                                        </p>
                                    </div>
                                </div>

                                {duplicateCheck.type === 'visual' && (
                                    <div className="flex items-start space-x-3">
                                        <RadioGroupItem value="create-version" id="create-version" />
                                        <div className="flex-1">
                                            <Label htmlFor="create-version" className="font-medium cursor-pointer">
                                                Create Version
                                            </Label>
                                            <p className="text-sm text-gray-500">
                                                Link this as a new version of the existing file
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleResolve}>
                        {selectedAction === 'skip' ? 'Skip' : 'Continue'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
