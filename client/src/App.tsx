import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ParametersProvider } from "./contexts/ParametersContext";
import Home from "./pages/Home";
import PortfolioConstruction from "./pages/PortfolioConstruction";
import PowerLawExplorer from "./pages/PowerLawExplorer";
import FundEconomics from "./pages/FundEconomics";
import ScenarioStressTest from "./pages/ScenarioStressTest";
import MainLayout from "./components/MainLayout";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/portfolio-construction"} component={PortfolioConstruction} />
        <Route path={"/power-law"} component={PowerLawExplorer} />
        <Route path={"/fund-economics"} component={FundEconomics} />
        <Route path={"/stress-test"} component={ScenarioStressTest} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <ParametersProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ParametersProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
