/**
 * ParametersContext - Shared state for portfolio parameters across all views
 * Ensures consistency when users navigate between different analysis views
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import type { PortfolioParameters } from "@/types/simulation";
import { DEFAULT_PARAMETERS } from "@/lib/defaults";

interface ParametersContextType {
  parameters: PortfolioParameters;
  updateParameters: (partial: Partial<PortfolioParameters>) => void;
  resetParameters: () => void;
}

const ParametersContext = createContext<ParametersContextType | undefined>(undefined);

export function ParametersProvider({ children }: { children: React.ReactNode }) {
  const [parameters, setParameters] = useState<PortfolioParameters>(DEFAULT_PARAMETERS);

  const updateParameters = useCallback((partial: Partial<PortfolioParameters>) => {
    setParameters((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetParameters = useCallback(() => {
    setParameters(DEFAULT_PARAMETERS);
  }, []);

  return (
    <ParametersContext.Provider
      value={{ parameters, updateParameters, resetParameters }}
    >
      {children}
    </ParametersContext.Provider>
  );
}

export function useParameters() {
  const context = useContext(ParametersContext);
  if (!context) {
    throw new Error("useParameters must be used within a ParametersProvider");
  }
  return context;
}
