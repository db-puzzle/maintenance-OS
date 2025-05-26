"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check } from "lucide-react";
import { Link } from "@inertiajs/react";
import { type ReactNode } from "react";
import { type BreadcrumbItem } from "@/types";
import { useState } from "react";

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
    showEditButton?: boolean;
    defaultActiveTab?: string;
}

export default function ShowLayout({
    title,
    subtitle,
    breadcrumbs,
    editRoute,
    backRoute,
    tabs,
    children,
    showEditButton = true,
    defaultActiveTab,
}: ShowLayoutProps) {
    const [activeTab, setActiveTab] = useState(defaultActiveTab || (tabs ? tabs[0].id : ''));

    return (
        <div className="bg-background pt-4 md:pt-6">
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
                        <Button variant="outline" asChild>
                            <Link href={backRoute}>Voltar</Link>
                        </Button>
                        {showEditButton && (
                            <Button asChild>
                                <Link href={editRoute}>Editar</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            {/* Nav */}
            <div className="container mx-auto lg:px-6 px-4 py-6">
                {tabs ? (
                    <div className="space-y-4">
                        {/* Mobile Select */}
                        <div className="md:hidden">
                            <Select value={activeTab} onValueChange={setActiveTab}>
                                <SelectTrigger className="w-full">
                                    <SelectValue>
                                        {tabs.find(tab => tab.id === activeTab)?.label}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {tabs.map((tab) => (
                                        <SelectItem 
                                            key={tab.id} 
                                            value={tab.id}
                                            className="flex items-center gap-2"
                                        >
                                            <div className="w-4">
                                                {activeTab === tab.id && (
                                                    <Check className="h-4 w-4" />
                                                )}
                                            </div>
                                            {tab.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Desktop Tabs */}
                        <div className="hidden md:block">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="justify-start">
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
                            </Tabs>
                        </div>
                        {/* Tab Content - Shown for both mobile and desktop */}
                        <div className="mt-4">
                            {tabs.map((tab) => (
                                <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
                                    {tab.content}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
} 