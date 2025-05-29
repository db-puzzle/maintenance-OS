import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { ChevronDown } from 'lucide-react'

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const [selectedTab, setSelectedTab] = React.useState<string>("")

  // Get the current active tab from children
  React.useEffect(() => {
    const activeTab = React.Children.toArray(children).find((child) => {
      if (React.isValidElement(child)) {
        const childProps = child.props as any
        if (childProps['data-state'] === 'active') {
          return true
        }
      }
      return false
    })
    if (React.isValidElement(activeTab)) {
      const activeTabProps = activeTab.props as any
      if (activeTabProps.value) {
        setSelectedTab(activeTabProps.value)
      }
    }
  }, [children])

  return (
    <>
      {/* Mobile dropdown */}
      <div className="grid grid-cols-1 sm:hidden">
        <select
          value={selectedTab}
          onChange={(e) => {
            const newValue = e.target.value
            // Trigger tab change programmatically
            const tabElement = document.querySelector(`[data-radix-collection-item][value="${newValue}"]`)
            if (tabElement instanceof HTMLElement) {
              tabElement.click()
            }
          }}
          aria-label="Select a tab"
          className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white dark:bg-gray-900 py-2 pl-3 pr-8 text-base text-gray-900 dark:text-gray-100 outline outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
        >
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              const childProps = child.props as any
              if (childProps.value) {
                return (
                  <option key={childProps.value} value={childProps.value}>
                    {childProps.children}
                  </option>
                )
              }
            }
            return null
          })}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-500"
        />
      </div>

      {/* Desktop tabs */}
      <div className="hidden sm:block">
        <div className="border-b border-t py-2 border-gray-200 dark:border-gray-800">
          <TabsPrimitive.List
            data-slot="tabs-list"
            className={cn(
              "flex space-x-4",
              className
            )}
            {...props}
          >
            {children}
          </TabsPrimitive.List>
        </div>
      </div>
    </>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
        "text-gray-500 hover:text-gray-700",
        "dark:text-gray-400 dark:hover:text-gray-300",
        "data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700",
        "dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-gray-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none mt-4", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
