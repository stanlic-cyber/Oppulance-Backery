import React from 'react';
import { useFarmerIntelligence } from '../hooks/useFarmerIntelligence';
import { ExecutiveInsights } from './ExecutiveInsights';
import { D3Heatmap } from './D3Heatmaps';
import { ActionCenter } from './ActionCenter';
import { Users, Sprout, Loader2 } from 'lucide-react';

export function ExecutiveHome() {
  const farmerData = useFarmerIntelligence();

  // Mock data for heatmaps
  const droughtData = [
    { x: 'North', y: 'Soil Temp', value: 80 }, { x: 'North', y: 'Moisture', value: 20 },
    { x: 'South', y: 'Soil Temp', value: 40 }, { x: 'South', y: 'Moisture', value: 60 },
    { x: 'East', y: 'Soil Temp', value: 50 }, { x: 'East', y: 'Moisture', value: 50 },
    { x: 'West', y: 'Soil Temp', value: 90 }, { x: 'West', y: 'Moisture', value: 10 },
  ];

  const pestData = [
    { x: 'North', y: 'Armyworm', value: 30 }, { x: 'North', y: 'Locust', value: 10 },
    { x: 'South', y: 'Armyworm', value: 70 }, { x: 'South', y: 'Locust', value: 20 },
    { x: 'East', y: 'Armyworm', value: 50 }, { x: 'East', y: 'Locust', value: 80 },
    { x: 'West', y: 'Armyworm', value: 40 }, { x: 'West', y: 'Locust', value: 50 },
  ];

  if (farmerData.isLoading) {
    return (
        <div className="flex flex-col items-center justify-center p-20 text-emerald-700">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="font-bold">Syncing Corporate Intelligence...</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        
        {/* Farmer Module Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 flex items-center justify-between col-span-1">
          <div>
             <p className="text-sm font-bold text-gray-500 mb-1">Total Registered</p>
             <h3 className="text-3xl font-extrabold text-[#075e54]">{farmerData.totalFarmers.toLocaleString()}</h3>
          </div>
          <div className="bg-emerald-50 p-3 rounded-full"><Users className="w-6 h-6 text-emerald-600" /></div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 flex items-center justify-between col-span-1">
          <div>
             <p className="text-sm font-bold text-gray-500 mb-1">Active Farmers</p>
             <h3 className="text-3xl font-extrabold text-blue-600">{farmerData.activeFarmers.toLocaleString()}</h3>
          </div>
          <div className="bg-blue-50 p-3 rounded-full"><Users className="w-6 h-6 text-blue-600" /></div>
        </div>

        {/* Crop Module Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 flex items-center justify-between col-span-1">
          <div className="w-full">
             <p className="text-sm font-bold text-gray-500 mb-2">Crop Distribution</p>
             <div className="flex w-full h-8 rounded-lg overflow-hidden shrink-0">
                {farmerData.cropDistribution.map((crop, i) => (
                    <div key={i} style={{ width: `${crop.value}%`, backgroundColor: crop.color }} className="h-full group relative cursor-pointer flex items-center justify-center transition-all hover:brightness-110">
                        {crop.value > 15 && <span className="text-[10px] text-white font-bold px-1 whitespace-nowrap overflow-hidden">{crop.name}</span>}
                        <div className="absolute -top-8 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {crop.name}: {crop.value}%
                        </div>
                    </div>
                ))}
             </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExecutiveInsights data={farmerData} />
        <ActionCenter />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <D3Heatmap data={droughtData} colorRange={['#fef3c7', '#dc2626']} title="Climate: Drought Risk Index" subtitle="Risk severity based on moisture & temp" />
        <D3Heatmap data={pestData} colorRange={['#ecfdf5', '#047857']} title="Climate: Pest Outbreak Heatmap" subtitle="Active threat zones by region" />
      </div>
      
    </div>
  );
}
