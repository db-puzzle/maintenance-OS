import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Image, Video } from 'lucide-react';
import { 
    Instruction, 
    InstructionType, 
    TextInstruction, 
    ImageInstruction, 
    VideoInstruction 
} from '@/types/task';

interface InstructionFormProps {
    /** Instrução atual */
    instruction: Instruction;
    /** Callback para mudanças na instrução */
    onChange: (instruction: Instruction) => void;
    /** Callback para mudança de tipo de instrução */
    onTypeChange: (type: InstructionType) => void;
    /** Desabilita a troca de tipo */
    disableTypeChange?: boolean;
}

export function InstructionForm({ 
    instruction, 
    onChange, 
    onTypeChange, 
    disableTypeChange = false 
}: InstructionFormProps) {
    const [activeTab, setActiveTab] = useState<string>(instruction.type);

    // Atualiza a aba ativa se o tipo de instrução mudar externamente
    useEffect(() => {
        setActiveTab(instruction.type);
    }, [instruction.type]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        onTypeChange(value as InstructionType);
    };

    const renderTextForm = () => {
        const textInstruction = instruction as TextInstruction;
        
        return (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="text-content">Conteúdo</Label>
                    <Textarea
                        id="text-content"
                        value={textInstruction.content}
                        onChange={(e) => {
                            onChange({
                                ...textInstruction,
                                content: e.target.value
                            });
                        }}
                        placeholder="Digite o texto da instrução"
                        className="min-h-[150px]"
                    />
                </div>
            </div>
        );
    };

    const renderImageForm = () => {
        const imageInstruction = instruction as ImageInstruction;
        
        return (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="image-url">URL da Imagem</Label>
                    <Input
                        id="image-url"
                        value={imageInstruction.imageUrl}
                        onChange={(e) => {
                            onChange({
                                ...imageInstruction,
                                imageUrl: e.target.value
                            });
                        }}
                        placeholder="https://exemplo.com/imagem.jpg"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="image-caption">Legenda</Label>
                    <Input
                        id="image-caption"
                        value={imageInstruction.caption}
                        onChange={(e) => {
                            onChange({
                                ...imageInstruction,
                                caption: e.target.value
                            });
                        }}
                        placeholder="Descreva a imagem"
                    />
                </div>
                
                {imageInstruction.imageUrl && (
                    <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">Visualização:</p>
                        <div className="relative rounded-md overflow-hidden bg-muted">
                            <img 
                                src={imageInstruction.imageUrl} 
                                alt={imageInstruction.caption || "Visualização"} 
                                className="w-full h-auto object-cover max-h-48"
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderVideoForm = () => {
        const videoInstruction = instruction as VideoInstruction;
        
        return (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="video-url">URL do Vídeo</Label>
                    <Input
                        id="video-url"
                        value={videoInstruction.videoUrl}
                        onChange={(e) => {
                            onChange({
                                ...videoInstruction,
                                videoUrl: e.target.value
                            });
                        }}
                        placeholder="https://exemplo.com/video.mp4"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="video-caption">Legenda</Label>
                    <Input
                        id="video-caption"
                        value={videoInstruction.caption}
                        onChange={(e) => {
                            onChange({
                                ...videoInstruction,
                                caption: e.target.value
                            });
                        }}
                        placeholder="Descreva o vídeo"
                    />
                </div>
                
                {videoInstruction.videoUrl && (
                    <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">Visualização:</p>
                        <div className="relative rounded-md overflow-hidden bg-muted aspect-video">
                            <video 
                                src={videoInstruction.videoUrl} 
                                controls
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderContentForm = () => {
        switch (instruction.type) {
            case InstructionType.Text:
                return renderTextForm();
            case InstructionType.Image:
                return renderImageForm();
            case InstructionType.Video:
                return renderVideoForm();
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 pt-4">
            {!disableTypeChange && (
                <Tabs 
                    value={activeTab} 
                    onValueChange={handleTabChange}
                    className="w-full"
                >
                    <TabsList className="grid grid-cols-3 mb-4">
                        <TabsTrigger value={InstructionType.Image} className="flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            <span>Imagem</span>
                        </TabsTrigger>
                        <TabsTrigger value={InstructionType.Text} className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Texto</span>
                        </TabsTrigger>
                        <TabsTrigger value={InstructionType.Video} className="flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            <span>Vídeo</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            )}

            {disableTypeChange && (
                <div className="flex items-center gap-2 mb-4">
                    <div className="text-primary mr-2">
                        {instruction.type === InstructionType.Text && <FileText className="h-5 w-5" />}
                        {instruction.type === InstructionType.Image && <Image className="h-5 w-5" />}
                        {instruction.type === InstructionType.Video && <Video className="h-5 w-5" />}
                    </div>
                    <h3 className="text-base font-medium">
                        {instruction.type === InstructionType.Text && 'Instrução de Texto'}
                        {instruction.type === InstructionType.Image && 'Instrução com Imagem'}
                        {instruction.type === InstructionType.Video && 'Instrução com Vídeo'}
                    </h3>
                </div>
            )}

            {renderContentForm()}
        </div>
    );
} 