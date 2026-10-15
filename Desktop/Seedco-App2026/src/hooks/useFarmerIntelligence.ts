import { useState, useEffect } from 'react';

export function useFarmerIntelligence() {
  const [data, setData] = useState<{
    totalFarmers: number;
    activeFarmers: number;
    cropDistribution: { name: string; value: number; color: string }[];
    isLoading: boolean;
  }>({
    totalFarmers: 0,
    activeFarmers: 0,
    cropDistribution: [],
    isLoading: true,
  });

  useEffect(() => {
    // Mock network delay
    const timer = setTimeout(() => {
      setData({
        totalFarmers: 12450,
        activeFarmers: 9820,
        cropDistribution: [
          { name: 'Maize (White)', value: 45, color: '#22c55e' },
          { name: 'Soya Beans', value: 25, color: '#eab308' },
          { name: 'Wheat', value: 20, color: '#f59e0b' },
          { name: 'Sorghum', value: 10, color: '#f43f5e' },
        ],
        isLoading: false,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return data;
}
