import { createContext, useContext, useState, useCallback } from 'react';

const UserContext = createContext(null);

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('anijelia-history') || '{}');
  } catch { return {}; }
}

function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem('anijelia-watchlist') || '[]');
  } catch { return []; }
}

export function UserProvider({ children }) {
  const [history, setHistory] = useState(getHistory);
  const [watchlist, setWatchlist] = useState(getWatchlist);

  const updateProgress = useCallback((id, key, currentTime, duration) => {
    const progress = duration > 0 ? currentTime / duration : 0;
    setHistory(prev => {
      const next = {
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          [key]: {
            currentTime,
            progress,
            lastWatched: new Date().toISOString(),
          }
        }
      };
      localStorage.setItem('anijelia-history', JSON.stringify(next));
      return next;
    });
  }, []);

  const getProgress = useCallback((id, key) => {
    const h = getHistory();
    return h?.[id]?.[key] || null;
  }, []);

  const removeHistory = useCallback((id, key) => {
    setHistory(prev => {
      const next = { ...prev };
      if (key && next[id]) {
        delete next[id][key];
        if (Object.keys(next[id]).length === 0) delete next[id];
      } else {
        delete next[id];
      }
      localStorage.setItem('anijelia-history', JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleWatchlist = useCallback((item) => {
    setWatchlist(prev => {
      const exists = prev.find(w => w.id === item.id);
      const next = exists ? prev.filter(w => w.id !== item.id) : [...prev, item];
      localStorage.setItem('anijelia-watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  const isInWatchlist = useCallback((id) => {
    return watchlist.some(w => w.id === id);
  }, [watchlist]);

  return (
    <UserContext.Provider value={{
      history,
      watchlist,
      updateProgress,
      getProgress,
      removeHistory,
      toggleWatchlist,
      isInWatchlist,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
