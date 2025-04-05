"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EllipsisVertical } from "lucide-react";
import { Link } from "@inertiajs/react";
import { type ReactNode } from "react";
import { type BreadcrumbItem } from "@/types";

interface Tab {
    id: string;
    label: string;
    content: ReactNode;
}

interface ShowLayoutProps {
    title: string;
    subtitle?: string | ReactNode;
    breadcrumbs: BreadcrumbItem[];
    editRoute: string;
    backRoute: string;
    tabs: Tab[];
    children?: ReactNode;
}

export default function ShowLayout({
    title,
    subtitle,
    breadcrumbs,
    editRoute,
    backRoute,
    tabs,
    children,
}: ShowLayoutProps) {
    return (
        <div className="bg-background border-b border-border pt-4 md:pt-6">
            <div className="container mx-auto lg:px-6 px-4 flex flex-col gap-6">
                {/* Main content */}
                <div className="flex justify-between md:items-center gap-6 md:flex-row flex-col">
                    <div className="space-y-2">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-sm lg:text-base text-muted-foreground">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {/* Buttons */}
                    <div className="flex gap-2 justify-end flex-row-reverse md:flex-row">
                        <div className="lg:hidden">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <EllipsisVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href={editRoute}>Editar</Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <Button variant="outline" className="hidden lg:inline-flex" asChild>
                            <Link href={editRoute}>Editar</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={backRoute}>Voltar</Link>
                        </Button>
                    </div>
                </div>
            </div>
            {/* Nav */}
            <div className="container mx-auto lg:px-6 px-4 py-6">
                {tabs ? (
                    <Tabs defaultValue={tabs[0].id} className="w-full">
                        <TabsList className="flex w-fit">
                            {tabs.map((tab) => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id}
                                    className="font-medium px-4 py-2 data-[state=active]:font-extrabold"
                                >
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {tabs.map((tab) => (
                            <TabsContent key={tab.id} value={tab.id}>
                                {tab.content}
                            </TabsContent>
                        ))}
                    </Tabs>
                ) : (
                    children
                )}
            </div>
        </div>
    );
} 