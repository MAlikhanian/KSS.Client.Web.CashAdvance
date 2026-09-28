'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

// localStorage-backed selection of the "current" fund, mirroring
// person-context. Lets the static /view and /update pages know which fund to
// open without an id in the path — set by clicking a row on the funds list.
const FUND_SELECTION_KEY = 'cash-advance-fund-selection';

function loadStoredFundId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(FUND_SELECTION_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveStoredFundId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) window.localStorage.setItem(FUND_SELECTION_KEY, id);
    else window.localStorage.removeItem(FUND_SELECTION_KEY);
  } catch {}
}

interface FundContextType {
  selectedFundId: string;
  setSelectedFundId: (id: string) => void;
  clearSelection: () => void;
}

const FundContext = createContext<FundContextType | undefined>(undefined);

export function FundProvider({ children }: { children: ReactNode }) {
  const [selectedFundId, setSelectedFundIdState] = useState('');

  // Hydrate from localStorage AFTER mount — the lazy initializer can't read
  // window during SSR.
  useEffect(() => {
    const stored = loadStoredFundId();
    if (stored) setSelectedFundIdState(stored);
  }, []);

  const setSelectedFundId = useCallback((id: string) => {
    setSelectedFundIdState(id);
    saveStoredFundId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFundId('');
  }, [setSelectedFundId]);

  return (
    <FundContext.Provider value={{ selectedFundId, setSelectedFundId, clearSelection }}>
      {children}
    </FundContext.Provider>
  );
}

export function useFundContext() {
  const context = useContext(FundContext);
  if (context === undefined) {
    throw new Error('useFundContext must be used within a FundProvider');
  }
  return context;
}
