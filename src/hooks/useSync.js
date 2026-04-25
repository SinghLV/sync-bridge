import { useState, useEffect } from 'react';
import { subscribeToIncidents } from '../services/cloudSync';
import { deduplicatePackets } from '../services/dataProcessor';

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
      setIncidents(prev => {
        const updated = deduplicatePackets(newBatch, prev);
        setIsSyncing(false);
        return updated;
      });
    });

    return () => unsubscribe && unsubscribe();
  }, [refreshTrigger]);

  return { incidents, isSyncing, setIncidents };
}
