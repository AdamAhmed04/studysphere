import { useEffect } from 'react';
import { presenceService } from '../services/presenceService';

export const usePresence = (userId: string | undefined, enabled: boolean = true) => {
  useEffect(() => {
    if (!userId || !enabled) return;

    presenceService.startHeartbeat();

    return () => {
      presenceService.stopHeartbeat();
    };
  }, [userId, enabled]);

  return {
    setOnline: () => presenceService.setOnline(),
    setOffline: () => presenceService.setOffline()
  };
};
