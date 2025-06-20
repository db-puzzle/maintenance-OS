'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, Download, MoreHorizontal, Plus, Search } from 'lucide-react';
import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { NavMain } from '@/components/pro-blocks/application/nav-main';
import { NavUser } from '@/components/pro-blocks/application/nav-user';
import { TeamSwitcher } from '@/components/pro-blocks/application/team-switcher';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarInset,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { GalleryVerticalEnd, Home, Mail, Settings2, Store, Users } from 'lucide-react';

const dateRange = {
    from: new Date(2024, 0, 1), // January 1, 2024
    to: new Date(2024, 6, 31), // December 31, 2024
};

const statsData = {
    revenue: {
        value: 40199.05,
        change: 15.11,
        trend: 'up',
    },
    totalOrders: {
        value: 1789,
        change: 25.66,
        trend: 'up',
    },
    newOrders: {
        value: 341,
        change: 11.23,
        trend: 'up',
    },
    refunds: {
        value: 11,
        change: -4.51,
        trend: 'down',
    },
};

const chartData = [
    { month: 'January', current: 186, previous: 80 },
    { month: 'February', current: 305, previous: 200 },
    { month: 'March', current: 237, previous: 120 },
    { month: 'April', current: 73, previous: 190 },
    { month: 'May', current: 209, previous: 130 },
    { month: 'June', current: 214, previous: 140 },
];

const data = {
    user: {
        name: 'shadcn',
        email: 'm@example.com',
        avatar: 'https://github.com/shadcn.png',
    },
    navMain: [
        {
            title: 'Home',
            url: '#',
            icon: Home,
            items: [],
        },
        {
            title: 'Store',
            url: '#',
            icon: Store,
            isActive: true,
            items: [
                {
                    title: 'Products',
                    url: '#products',
                },
                {
                    title: 'Orders',
                    url: '#orders',
                    isActive: true,
                },
                {
                    title: 'Subscriptions',
                    url: '#subscriptions',
                },
                {
                    title: 'Customers',
                    url: '#customers',
                },
                {
                    title: 'Discounts',
                    url: '#discounts',
                },
            ],
        },
        {
            title: 'Email',
            url: '#',
            icon: Mail,
            items: [],
        },
        {
            title: 'Affiliates',
            url: '#',
            icon: Users,
            items: [],
        },
        {
            title: 'Settings',
            url: '#',
            icon: Settings2,
            items: [],
        },
    ],
    teams: [
        {
            name: 'Acme Inc',
            logo: GalleryVerticalEnd,
            plan: 'Free',
        },
    ],
};

const chartConfig = {
    current: {
        label: 'Chosen Period',
        color: 'hsl(var(--chart-1))',
    },
    previous: {
        label: 'Last Period',
        color: 'hsl(var(--chart-2))',
    },
} satisfies ChartConfig;

const tableData = [
    {
        id: '#2999',
        status: 'Paid',
        customer: {
            name: 'Josh Adams',
            email: 'josh.adams@example.com',
            avatar: 'https://github.com/shadcn.png',
        },
        product: 'Figma UI kit',
        revenue: 199.0,
    },
    {
        id: '#3000',
        status: 'Refunded',
        customer: {
            name: 'Sarah Miller',
            email: 'sarah.m@example.com',
            avatar: 'https://github.com/shadcn.png',
        },
        product: 'Website Template',
        revenue: 149.0,
    },
    {
        id: '#3001',
        status: 'Paid',
        customer: {
            name: 'James Wilson',
            email: 'j.wilson@example.com',
        },
        product: 'Premium Icons Pack',
        revenue: 79.0,
    },
    {
        id: '#3002',
        status: 'Chargeback',
        customer: {
            name: 'Emily Chen',
            email: 'emily.chen@example.com',
            avatar: 'https://github.com/shadcn.png',
        },
        product: 'Annual Subscription',
        revenue: 299.0,
    },
    {
        id: '#3003',
        status: 'Paid',
        customer: {
            name: 'Michael Brown',
            email: 'm.brown@example.com',
            avatar: 'https://github.com/shadcn.png',
        },
        product: 'UI Component Library',
        revenue: 159.0,
    },
    {
        id: '#3004',
        status: 'Paid',
        customer: {
            name: 'Lisa Anderson',
            email: 'l.anderson@example.com',
        },
        product: 'Design System',
        revenue: 249.0,
    },
    {
        id: '#3005',
        status: 'Refunded',
        customer: {
            name: 'David Park',
            email: 'd.park@example.com',
        },
        product: 'Mobile App UI Kit',
        revenue: 189.0,
    },
    {
        id: '#3006',
        status: 'Paid',
        customer: {
            name: 'Rachel Green',
            email: 'r.green@example.com',
            avatar: 'https://github.com/shadcn.png',
        },
        product: 'Wireframe Kit',
        revenue: 129.0,
    },
];

export function Dashboard1() {
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: dateRange.from,
        to: dateRange.to,
    });

    const [selectedProduct, setSelectedProduct] = React.useState('All');
    const [timeframe, setTimeframe] = React.useState('Daily');
    const [orderStatus, setOrderStatus] = React.useState('All orders');

    return (
        <div className="min-h-screen">
            <SidebarProvider>
                <Sidebar collapsible="icon">
                    <SidebarHeader>
                        <TeamSwitcher teams={data.teams} />
                    </SidebarHeader>
                    <SidebarContent>
                        <NavMain items={data.navMain} />
                    </SidebarContent>
                    <SidebarFooter>
                        <NavUser user={data.user} />
                    </SidebarFooter>
                    <SidebarRail />
                </Sidebar>

                <SidebarInset className="flex-1 overflow-hidden">
                    <div className="bg-background h-full overflow-auto">
                        <header>
                            <div className="border-border flex h-12 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 md:h-16 md:px-6">
                                <SidebarTrigger className="-ml-1" />
                                <Separator orientation="vertical" className="mr-2 h-4" />
                                <Breadcrumb>
                                    <BreadcrumbList>
                                        <BreadcrumbItem>
                                            <BreadcrumbLink href="#settings">Store</BreadcrumbLink>
                                        </BreadcrumbItem>
                                        <BreadcrumbSeparator />
                                        <BreadcrumbItem>
                                            <BreadcrumbPage>Orders</BreadcrumbPage>
                                        </BreadcrumbItem>
                                    </BreadcrumbList>
                                </Breadcrumb>
                            </div>

                            {/* Header */}
                            <div className="border-border flex flex-col border-b px-4 py-4 md:px-6 md:py-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Orders</h1>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="max-w-[36px] md:max-w-none">
                                            <Search /> <span className="hidden md:block">Search</span>
                                        </Button>
                                        <Button className="max-w-[36px] md:max-w-none">
                                            <Plus /> <span className="hidden md:block">New</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {/* Main content container */}
                        <div className="flex flex-col gap-6 p-4 md:p-6">
                            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                                <div className="flex items-center gap-2">
                                    <div className={cn('grid gap-2')}>
                                        <Popover>
                                            <PopoverTrigger asChild className="max-w-[300px]">
                                                <Button
                                                    id="date"
                                                    variant={'outline'}
                                                    className={cn('w-[300px] justify-start text-left font-normal', !date && 'text-muted-foreground')}
                                                >
                                                    <CalendarIcon />
                                                    {date?.from ? (
                                                        date.to ? (
                                                            <>
                                                                {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                                                            </>
                                                        ) : (
                                                            format(date.from, 'LLL dd, y')
                                                        )
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    initialFocus
                                                    mode="range"
                                                    defaultMonth={date?.from}
                                                    selected={date}
                                                    onSelect={setDate}
                                                    numberOfMonths={2}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline">
                                                Products: {selectedProduct === 'All' ? 'All' : selectedProduct}
                                                <ChevronDown />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56">
                                            <DropdownMenuLabel>Filter Products</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuRadioGroup value={selectedProduct} onValueChange={setSelectedProduct}>
                                                <DropdownMenuRadioItem value="All">All</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="Digital">Digital</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="Physical">Physical</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="Subscription">Subscription</DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline">
                                                {timeframe === 'daily' ? 'Daily' : 'Monthly'}
                                                <ChevronDown />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56">
                                            <DropdownMenuLabel>Time Period</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuRadioGroup value={timeframe} onValueChange={setTimeframe}>
                                                <DropdownMenuRadioItem value="Daily">Daily</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="Monthly">Monthly</DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2 lg:flex lg:flex-row lg:gap-6">
                                <div className="flex flex-1 flex-col gap-2">
                                    <p className="text-muted-foreground flex justify-between text-sm font-medium">
                                        Revenue
                                        <span className={`${statsData.revenue.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                            {statsData.revenue.change > 0 ? '+' : ''}
                                            {statsData.revenue.change}%
                                        </span>
                                    </p>
                                    <p className="text-xl font-semibold md:text-3xl">
                                        $
                                        {statsData.revenue.value.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </p>
                                </div>
                                <Separator orientation="vertical" className="hidden h-16! lg:block" />
                                <div className="flex flex-1 flex-col gap-2">
                                    <p className="text-muted-foreground flex justify-between text-sm font-medium">
                                        Total orders
                                        <span className={`${statsData.totalOrders.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                            {statsData.totalOrders.change > 0 ? '+' : ''}
                                            {statsData.totalOrders.change}%
                                        </span>
                                    </p>
                                    <p className="text-xl font-semibold md:text-3xl">{statsData.totalOrders.value.toLocaleString()}</p>
                                </div>
                                <Separator orientation="vertical" className="hidden h-16! lg:block" />
                                <div className="flex flex-1 flex-col gap-2">
                                    <p className="text-muted-foreground flex justify-between text-sm font-medium">
                                        New orders
                                        <span className={`${statsData.newOrders.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                            {statsData.newOrders.change > 0 ? '+' : ''}
                                            {statsData.newOrders.change}%
                                        </span>
                                    </p>
                                    <p className="text-xl font-semibold md:text-3xl">{statsData.newOrders.value.toLocaleString()}</p>
                                </div>
                                <Separator orientation="vertical" className="hidden h-16! lg:block" />
                                <div className="flex flex-1 flex-col gap-2">
                                    <p className="text-muted-foreground flex justify-between text-sm font-medium">
                                        Refunds
                                        <span className={`${statsData.refunds.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                            {statsData.refunds.change > 0 ? '+' : ''}
                                            {statsData.refunds.change}%
                                        </span>
                                    </p>
                                    <p className="text-xl font-semibold md:text-3xl">{statsData.refunds.value.toLocaleString()}</p>
                                </div>
                            </div>

                            <ChartContainer config={chartConfig} className="max-h-[280px] w-full">
                                <AreaChart
                                    data={chartData}
                                    margin={{
                                        left: 12,
                                        right: 12,
                                    }}
                                >
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => value.slice(0, 3)}
                                    />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <defs>
                                        <linearGradient id="fillPrevious" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.1} />
                                        </linearGradient>
                                        <linearGradient id="fillCurrent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        dataKey="previous"
                                        type="natural"
                                        fill="url(#fillPrevious)"
                                        fillOpacity={0.4}
                                        stroke="var(--color-chart-2)"
                                        stackId="a"
                                    />
                                    <Area
                                        dataKey="current"
                                        type="natural"
                                        fill="url(#fillCurrent)"
                                        fillOpacity={0.4}
                                        stroke="var(--color-chart-1)"
                                        stackId="a"
                                    />
                                </AreaChart>
                            </ChartContainer>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                                    <div className="relative w-full md:w-[300px]">
                                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                        <Input placeholder="Search orders" className="pl-8" />
                                    </div>
                                    <div className="flex gap-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline">
                                                    Status: {orderStatus}
                                                    <ChevronDown />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-56">
                                                <DropdownMenuLabel>Order Status</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuRadioGroup value={orderStatus} onValueChange={setOrderStatus}>
                                                    <DropdownMenuRadioItem value="All orders">All orders</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="Paid">Paid</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="Refunded">Refunded</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="Chargeback">Chargeback</DropdownMenuRadioItem>
                                                </DropdownMenuRadioGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button variant="outline">
                                            <Download />
                                            Export
                                        </Button>
                                    </div>
                                </div>

                                {/* Updated table container */}
                                <div className="relative overflow-hidden rounded-lg border">
                                    <div className="overflow-auto">
                                        <div className="min-w-[1000px]">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[40px]">
                                                            <Checkbox />
                                                        </TableHead>
                                                        <TableHead className="w-[100px]">#</TableHead>
                                                        <TableHead className="w-[120px]">Status</TableHead>
                                                        <TableHead className="w-[300px]">Customer</TableHead>
                                                        <TableHead className="w-[250px]">Product</TableHead>
                                                        <TableHead className="w-[120px] text-right">Revenue</TableHead>
                                                        <TableHead className="w-[70px]"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {tableData.map((row) => (
                                                        <TableRow key={row.id}>
                                                            <TableCell>
                                                                <Checkbox />
                                                            </TableCell>
                                                            <TableCell className="font-medium">{row.id}</TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant={
                                                                        row.status === 'Paid'
                                                                            ? 'default'
                                                                            : row.status === 'Refunded' || row.status === 'Chargeback'
                                                                              ? 'outline'
                                                                              : 'secondary'
                                                                    }
                                                                    className={
                                                                        row.status === 'Paid'
                                                                            ? 'bg-green-600/10 text-green-600 hover:bg-green-50/80'
                                                                            : ''
                                                                    }
                                                                >
                                                                    {row.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar>
                                                                        <AvatarImage src={row.customer.avatar} alt={row.customer.name} />
                                                                        <AvatarFallback>
                                                                            {row.customer.name
                                                                                .split(' ')
                                                                                .map((n) => n[0])
                                                                                .join('')}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div>
                                                                        <p className="font-medium">{row.customer.name}</p>
                                                                        <p className="text-muted-foreground">{row.customer.email}</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{row.product}</TableCell>
                                                            <TableCell className="text-right">${row.revenue.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon">
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem>Refund payment</DropdownMenuItem>
                                                                        <DropdownMenuItem>Re-send receipt</DropdownMenuItem>
                                                                        <DropdownMenuItem>Share online receipt</DropdownMenuItem>
                                                                        <DropdownMenuItem>Generate invoice</DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-end">
                                    <Pagination className="hidden justify-end md:flex">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious href="#" />
                                            </PaginationItem>
                                            <PaginationItem>
                                                <PaginationLink href="#">1</PaginationLink>
                                            </PaginationItem>
                                            <PaginationItem>
                                                <PaginationLink href="#" isActive>
                                                    2
                                                </PaginationLink>
                                            </PaginationItem>
                                            <PaginationItem>
                                                <PaginationLink href="#">3</PaginationLink>
                                            </PaginationItem>
                                            <PaginationItem>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                            <PaginationItem>
                                                <PaginationNext href="#" />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                    <div className="flex items-center justify-end space-x-2 md:hidden">
                                        <Button variant="outline">Previous</Button>
                                        <Button variant="outline">Next</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}
