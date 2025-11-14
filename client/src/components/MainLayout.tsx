import { Link, useLocation } from "wouter";
import { APP_TITLE } from "@/const";
import { Button } from "@/components/ui/button";
import { BarChart3, Network } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  
  const tabs = [
    { path: "/", label: "Simulation", icon: BarChart3 },
    { path: "/portfolio-construction", label: "Portfolio Construction", icon: Network },
  ];
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with tabs */}
      <header className="border-b border-border bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-lg font-semibold text-foreground">{APP_TITLE}</h1>
            
            <nav className="flex gap-2">
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
                      {tab.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
