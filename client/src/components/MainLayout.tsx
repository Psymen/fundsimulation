import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { APP_TITLE } from "@/const";
import { Button } from "@/components/ui/button";
import { BarChart3, Network, TrendingUp, DollarSign, ShieldAlert, Sun, Moon } from "lucide-react";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import ParametersSummaryBar from "@/components/ParametersSummaryBar";
import { useTheme } from "@/contexts/ThemeContext";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  // Keyboard shortcut: T to toggle theme
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        toggleTheme?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTheme]);

  const tabs = [
    { path: "/", label: "Simulation", icon: BarChart3 },
    { path: "/portfolio-construction", label: "Portfolio", icon: Network },
    { path: "/power-law", label: "Power Law", icon: TrendingUp },
    { path: "/fund-economics", label: "Economics", icon: DollarSign },
    { path: "/stress-test", label: "Stress Test", icon: ShieldAlert },
  ];

  // Show parameters summary bar on all views except home
  const showParametersBar = location !== "/";
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with tabs */}
      <header className="border-b border-border bg-background shadow-sm sticky top-0 z-50">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-lg font-semibold text-foreground">{APP_TITLE}</h1>
            
            <div className="flex items-center gap-2">
              <nav className="flex gap-2 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = location === tab.path;

                  return (
                    <Link key={tab.path} href={tab.path}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        className="gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden md:inline">{tab.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </nav>

              <div className="w-px h-6 bg-border hidden md:block" />

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode (T)`}
                className="h-8 w-8 p-0"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Parameters Summary Bar - shown on all non-home views */}
      {showParametersBar && <ParametersSummaryBar />}

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal />
    </div>
  );
}
