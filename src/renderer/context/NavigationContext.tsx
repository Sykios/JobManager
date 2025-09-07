import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export type PageType = 'dashboard' | 'applications' | 'new-application' | 'application-detail' | 'application-edit' | 'companies' | 'company-detail' | 'contacts' | 'contact-detail' | 'files' | 'calendar' | 'reminders' | 'settings';

export interface NavigationEntry {
  page: PageType;
  state?: any;
  timestamp: number;
}

interface NavigationState {
  history: NavigationEntry[];
  currentIndex: number;
}

interface NavigationContextType {
  currentPage: PageType;
  pageState: any;
  canGoBack: boolean;
  navigate: (page: PageType, state?: any) => void;
  goBack: () => void;
  clearHistory: () => void;
}

type NavigationAction = 
  | { type: 'NAVIGATE'; payload: { page: PageType; state?: any } }
  | { type: 'GO_BACK' }
  | { type: 'CLEAR_HISTORY' };

const initialState: NavigationState = {
  history: [{ page: 'dashboard', timestamp: Date.now() }],
  currentIndex: 0,
};

function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'NAVIGATE': {
      const { page, state: pageState } = action.payload;
      
      // Don't add to history if navigating to the same page with the same state
      const currentEntry = state.history[state.currentIndex];
      if (currentEntry && currentEntry.page === page && 
          JSON.stringify(currentEntry.state) === JSON.stringify(pageState)) {
        return state;
      }

      // Remove any entries after current index (forward history)
      const newHistory = state.history.slice(0, state.currentIndex + 1);
      
      // Add new entry
      newHistory.push({
        page,
        state: pageState,
        timestamp: Date.now(),
      });

      // Limit history size to prevent memory issues
      const maxHistorySize = 50;
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return {
          history: newHistory,
          currentIndex: newHistory.length - 1,
        };
      }

      return {
        history: newHistory,
        currentIndex: newHistory.length - 1,
      };
    }

    case 'GO_BACK': {
      if (state.currentIndex > 0) {
        return {
          ...state,
          currentIndex: state.currentIndex - 1,
        };
      }
      return state;
    }

    case 'CLEAR_HISTORY': {
      return initialState;
    }

    default:
      return state;
  }
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(navigationReducer, initialState);

  const currentEntry = state.history[state.currentIndex];
  const currentPage = currentEntry?.page || 'dashboard';
  const pageState = currentEntry?.state;
  const canGoBack = state.currentIndex > 0;

  const navigate = (page: PageType, state?: any) => {
    dispatch({ type: 'NAVIGATE', payload: { page, state } });
  };

  const goBack = () => {
    if (canGoBack) {
      dispatch({ type: 'GO_BACK' });
    }
  };

  const clearHistory = () => {
    dispatch({ type: 'CLEAR_HISTORY' });
  };

  return (
    <NavigationContext.Provider
      value={{
        currentPage,
        pageState,
        canGoBack,
        navigate,
        goBack,
        clearHistory,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
