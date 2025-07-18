import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string;
    description: string;
    variant?: 'default' | 'destructive';
    className?: string;
}

export function StatCard({
    title,
    value,
    description,
    variant = 'default',
    className
}: StatCardProps) {
    return (
        <Card className={cn(className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className={cn(
                    "text-2xl font-bold",
                    variant === 'destructive' && "text-destructive"
                )}>
                    {value}
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                    {description}
                </CardDescription>
            </CardContent>
        </Card>
    );
} 