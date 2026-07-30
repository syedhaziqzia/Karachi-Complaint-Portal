import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ReportingContext = createContext(undefined);

/**
 * Tracks whether the user is currently in the middle of a report flow
 * (step 1–3 in NakshaScreen). Used by the tab navigator to block
 * navigation away and show a confirmation prompt instead.
 *
 * Also holds a `resetReportRef` callback that NakshaScreen registers,
 * so the tab navigator can force-reset the reporting flow remotely.
 */
export const ReportingProvider = ({ children }) => {
  const [isReporting, setIsReporting] = useState(false);
  const resetReportRef = useRef(null);

  const startReporting = useCallback(() => setIsReporting(true), []);
  const stopReporting  = useCallback(() => setIsReporting(false), []);

  // NakshaScreen calls this to register its handleReset function
  const registerResetHandler = useCallback((handler) => {
    resetReportRef.current = handler;
  }, []);

  // Tab navigator calls this to force-reset the report flow
  const forceResetReport = useCallback(() => {
    if (resetReportRef.current) {
      resetReportRef.current();
    }
    setIsReporting(false);
  }, []);

  return (
    <ReportingContext.Provider value={{
      isReporting,
      startReporting,
      stopReporting,
      registerResetHandler,
      forceResetReport,
    }}>
      {children}
    </ReportingContext.Provider>
  );
};

export const useReporting = () => {
  const ctx = useContext(ReportingContext);
  if (!ctx) throw new Error('useReporting must be used within a ReportingProvider');
  return ctx;
};
