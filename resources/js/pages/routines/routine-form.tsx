import { RoutineFormViewer } from './routine-form-wrapper';

interface Props {
    routine: {
        id: number;
        name: string;
        form: {
            id: number;
            name: string;
            tasks: any[];
        };
    };
    asset: {
        id: number;
        tag: string;
    };
    mode?: 'view' | 'fill';
}

export default function RoutineFormPage({ routine, asset, mode = 'view' }: Props) {
    return <RoutineFormViewer routine={routine} asset={asset} mode={mode} />;
} 