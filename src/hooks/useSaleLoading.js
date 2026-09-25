import { useEffect, useState } from 'react';
import { setSaleLoadingActive, subscribeSaleLoading } from '../lib/saleLoading';

export default function useSaleLoading() {
  const [isApiLoading, setIsApiLoading] = useState(false);

  useEffect(() => {
    setSaleLoadingActive(true);
    const unsubscribe = subscribeSaleLoading(setIsApiLoading);
    return () => {
      unsubscribe();
      setSaleLoadingActive(false);
    };
  }, []);

  return isApiLoading;
}
