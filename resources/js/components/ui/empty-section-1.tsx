"use client"

import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"
import { Link } from "@inertiajs/react"

interface EmptySection1Props {
    title: string;
    description: string;
    icon?: LucideIcon;
    primaryButtonText?: string;
    secondaryButtonText?: string;
    primaryButtonLink?: string;
    secondaryButtonLink?: string;
    showDashedBorder?: boolean;
}

export function EmptySection1({ 
    title, 
    description, 
    icon: Icon = Inbox,
    primaryButtonText = "Create new",
    secondaryButtonText = "Learn more",
    primaryButtonLink,
    secondaryButtonLink,
    showDashedBorder = true
}: EmptySection1Props) {
    return (
        <section className="bg-background py-6 md:px-6 px-4">  
            <div className={`w-full flex flex-col items-center gap-6 p-6 rounded-lg ${showDashedBorder ? 'border border-dashed' : ''}`}> 
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
                    {primaryButtonLink && (
                        <Link href={primaryButtonLink} className="w-full md:w-auto">
                            <Button className="w-full">{primaryButtonText}</Button>
                        </Link>
                    )}
                    {secondaryButtonLink && (
                        <Link href={secondaryButtonLink} className="w-full md:w-auto">
                            <Button variant="outline" className="w-full">{secondaryButtonText}</Button>
                        </Link>
                    )}
                </div>
            </div>
        </section>
    )
}
