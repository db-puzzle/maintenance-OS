import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    primaryButtonText: string;
    primaryButtonAction: () => void;
    secondaryButtonText?: string;
    secondaryButtonAction?: () => void;
    primaryButtonClassName?: string;
    secondaryButtonClassName?: string;
}

export default function EmptyCard({
    icon: Icon,
    title,
    description,
    primaryButtonText,
    primaryButtonAction,
    secondaryButtonText,
    secondaryButtonAction,
    primaryButtonClassName = "w-full md:w-auto",
    secondaryButtonClassName = "w-full md:w-auto"
}: EmptyCardProps) {
    return (
        <Card>
            <CardContent>
                <section className="bg-background py-6 md:px-6 px-4">
                    <div className="w-full flex flex-col items-center gap-6 p-6 rounded-lg">
                        <div className="w-12 h-12 flex items-center justify-center rounded-md bg-card border shadow-sm p-2">
                            <Icon className="h-6 w-6 text-foreground" />
                        </div>

                        <div className="flex flex-col items-center gap-2 text-center">
                            <h2 className="text-lg md:text-xl font-semibold text-foreground">
                                {title}
                            </h2>
                            <p className="text-sm text-muted-foreground leading-5">
                                {description}
                            </p>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-center gap-3 w-full">
                            <Button
                                className={primaryButtonClassName}
                                onClick={primaryButtonAction}
                            >
                                {primaryButtonText}
                            </Button>
                            {secondaryButtonText && secondaryButtonAction && (
                                <Button
                                    variant="outline"
                                    className={secondaryButtonClassName}
                                    onClick={secondaryButtonAction}
                                >
                                    {secondaryButtonText}
                                </Button>
                            )}
                        </div>
                    </div>
                </section>
            </CardContent>
        </Card>
    );
} 