import { RoutineFormEditor } from './routine-form-wrapper';

interface Props {
    routine: {
        id: number;
        name: string;
        form?: {
            id: number;
            name: string;
            tasks: any[];
        };
    };
    asset: {
        id: number;
        tag: string;
    };
}

export default function RoutineFormEditorPage({ routine, asset }: Props) {
    return <RoutineFormEditor routine={routine} asset={asset} />;
} 