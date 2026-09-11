import { useState, useEffect } from 'react';

export function useInstitutionalMetrics() {
  const [data, setData] = useState<{
    nationalYieldForecast: number;
    varietyAdoption: { name: string; percentage: number }[];
    isLoading: boolean;
  }>({
    nationalYieldForecast: 0,
    varietyAdoption: [],
    isLoading: true,
  });

  useEffect(() => {
    // Mock network delay
    const timer = setTimeout(() => {
      setData({
        nationalYieldForecast: 4.2, // t/ha
        varietyAdoption: [
          { name: 'SC 727', percentage: 40 },
          { name: 'SC 719', percentage: 30 },
          { name: 'SC 633', percentage: 20 },
          { name: 'SC 529', percentage: 10 },
        ],
        isLoading: false,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return data;
}
