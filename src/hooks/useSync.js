import { useState, useEffect } from 'react';
import { subscribeToIncidents } from '../services/cloudSync';

/**
 * Custom hook for professional synchronization management.
 * Handles real-time updates and deduplication.
 */
export function useSync(refreshTrigger) {
  const [incidents, setIncidents] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsSyncing(true);
    const unsubscribe = subscribeToIncidents((newBatch) => {
      setIncidents(newBatch);
      setIsSyncing(false);
    });

    return () => unsubscribe && unsubscribe();
  }, [refreshTrigger]);

  return { incidents, isSyncing, setIncidents };
}
