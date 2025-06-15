import { Button } from '@/components/ui/button';
import { Task } from '@/types/task';
import { Loader2, ChevronRight, CheckCircle2 } from 'lucide-react';
import React, { ComponentType, useState } from 'react';
import { TaskCardMode } from './TaskContent';

export interface WithSaveFunctionalityProps {
    task: Task;
    mode: TaskCardMode;
    onUpdate?: (updatedTask: Task) => void;
    onSave?: (responseData: any) => void;
    showSaveButton?: boolean;
    disabled?: boolean;
    response: any;
    setResponse: (response: any) => void;
    isLastTask?: boolean;
    onNext?: () => void;
}

export const withSaveFunctionality = <P extends object>(
    WrappedComponent: ComponentType<P & WithSaveFunctionalityProps>
) => {
    const ComponentWithSave = (props: P & {
        task: Task;
        mode: TaskCardMode;
        onSave?: (responseData: any) => void;
        showSaveButton?: boolean;
        disabled?: boolean;
        isLastTask?: boolean;
        onNext?: () => void;
    }) => {
        const [response, setResponse] = useState<any>(null);

        const handleSaveAndNext = () => {
            if (props.onSave) {
                props.onSave(response);
            }
            // The onNext will be called after successful save in the parent component
        };

        const buttonText = props.isLastTask ? 'Completar Rotina' : 'Próxima';
        const buttonIcon = props.isLastTask ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />;

        return (
            <div className="space-y-4">
                <WrappedComponent {...props} response={response} setResponse={setResponse} />
                {props.showSaveButton && props.mode === 'respond' && (
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSaveAndNext}
                            disabled={props.disabled}
                            size="sm"
                        >
                            {props.disabled ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                buttonIcon
                            )}
                            {buttonText}
                        </Button>
                    </div>
                )}
            </div>
        );
    };
    return ComponentWithSave;
}; 