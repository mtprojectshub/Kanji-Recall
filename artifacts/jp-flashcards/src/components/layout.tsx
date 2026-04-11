import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Search, Home as HomeIcon, PlusCircle, BarChart2, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: HomeIcon },
    { href: "/upload", label: "Add Words", icon: PlusCircle },
    { href: "/cards", label: "Vocabulary", icon: Search },
    { href: "/stats", label: "Stats", icon: BarChart2 },
  ];

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-64 p-4 text-sidebar-foreground">
      <div className="flex items-center gap-3 px-2 mb-8 mt-4">
        <div className="bg-primary text-primary-foreground w-8 h-8 rounded flex items-center justify-center font-bold text-lg font-serif">
          花
        </div>
        <span className="font-serif text-xl font-semibold tracking-wide">Hana SRS</span>
      </div>
      
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
              location === item.href
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground"
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] w-full bg-background font-serif text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b bg-background flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground w-6 h-6 rounded flex items-center justify-center font-bold text-sm">
            花
          </div>
          <span className="font-serif font-semibold">Hana SRS</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 md:p-8 p-4 pt-20 md:pt-8 w-full max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  );
}
