import { useCallback } from 'react';

export const useToast = () => {
  const toast = useCallback((message: string) => {
    // TODO: Implement proper toast notification system
    console.log(message);
  }, []);

  return { toast };
};
