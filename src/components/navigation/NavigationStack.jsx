import { createContext, useContext, useEffect, useRef } from 'react';

const NavigationStackContext = createContext(null);

export const useNavigationStack = () => {
  const context = useContext(NavigationStackContext);
  if (!context) {
    throw new Error('useNavigationStack must be used within NavigationStackProvider');
  }
  return context;
};

export const NavigationStackProvider = ({ children }) => {
  const stackRef = useRef({
    Dashboard: [],
    Agents: [],
    Knowledge: [],
    CallHistory: [],
  });

  const ROOT_PAGES = new Set(['Dashboard', 'Agents', 'Knowledge', 'CallHistory']);

  // Track navigation by page
  const pushToStack = (rootPage, path, scrollY = 0) => {
    if (!ROOT_PAGES.has(rootPage)) return;

    const stack = stackRef.current[rootPage] || [];
    
    // If it's a new path, add it
    if (!stack.some(item => item.path === path)) {
      stack.push({ path, scrollY, timestamp: Date.now() });
    }

    stackRef.current[rootPage] = stack;
  };

  // Get navigation depth for back button logic
  const getNavigationDepth = (currentPage) => {
    if (!ROOT_PAGES.has(currentPage)) return 1; // Sub-page, can go back

    const stack = stackRef.current[currentPage] || [];
    return stack.length > 1 ? stack.length : 0; // 0 = root, > 0 = nested
  };

  // Restore scroll position for a page
  const getScrollPosition = (rootPage, path) => {
    const stack = stackRef.current[rootPage] || [];
    const item = stack.find(s => s.path === path);
    return item?.scrollY || 0;
  };

  // Pop from stack when navigating away
  const popFromStack = (rootPage) => {
    if (!ROOT_PAGES.has(rootPage)) return;
    const stack = stackRef.current[rootPage] || [];
    if (stack.length > 0) {
      stack.pop();
    }
  };

  // Reset stack for a tab (when re-tapping)
  const resetStack = (rootPage) => {
    if (ROOT_PAGES.has(rootPage)) {
      stackRef.current[rootPage] = [];
    }
  };

  // Get current path for a tab
  const getCurrentPath = (rootPage) => {
    const stack = stackRef.current[rootPage] || [];
    if (stack.length === 0) return null;
    return stack[stack.length - 1].path;
  };

  return (
    <NavigationStackContext.Provider
      value={{
        pushToStack,
        popFromStack,
        resetStack,
        getNavigationDepth,
        getScrollPosition,
        getCurrentPath,
        stack: stackRef.current,
      }}
    >
      {children}
    </NavigationStackContext.Provider>
  );
};