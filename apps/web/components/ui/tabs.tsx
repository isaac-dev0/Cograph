"use client";

import { createContext, useContext, useState } from "react";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
  children: React.ReactNode;
  className?: string;
  /** Uncontrolled: starting tab. Use when the parent doesn't need to control the active tab. */
  defaultValue?: string;
  /** Controlled: current active tab. Must be paired with onValueChange. */
  value?: string;
  /** Controlled: called when the user clicks a different tab. */
  onValueChange?: (value: string) => void;
}

/**
 * Tabs container. Supports both controlled and uncontrolled usage:
 *
 * Uncontrolled (simpler — parent doesn't manage state):
 *   <Tabs defaultValue="overview">...</Tabs>
 *
 * Controlled (parent manages which tab is active):
 *   <Tabs value={activeTab} onValueChange={setActiveTab}>...</Tabs>
 */
export function Tabs({ defaultValue = "", value, onValueChange, children, className }: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultValue);

  const isControlled = value !== undefined;
  const activeTab = isControlled ? value : internalTab;

  const setActiveTab = (next: string) => {
    if (isControlled) {
      onValueChange?.(next);
    } else {
      setInternalTab(next);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className = "" }: TabsListProps) {
  return (
    <div className={`flex gap-1 border-b border-border ${className}`}>
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className = "" }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 text-sm font-medium transition-colors
        ${
          isActive
            ? "text-foreground border-b-2 border-primary -mb-[1px]"
            : "text-muted-foreground hover:text-foreground"
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = "" }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  const { activeTab } = context;

  if (activeTab !== value) return null;

  return <div className={`animate-fade-in ${className}`}>{children}</div>;
}
