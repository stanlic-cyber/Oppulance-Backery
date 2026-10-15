// Mock API Client for Seed Co Intelligence Platform Integration

export interface FarmerProfile {
  fullName: string;
  phone: string;
  gender: string;
  district: string;
  province: string;
  country: string;
  farmName: string;
  farmSize: string;
  gpsLocation: string;
  mainCrop: string;
  seedVariety: string;
  plantingDate: string;
  irrigation: string;
  soilType: string;
  expectedRainfall: string;
  experience: string;
  idType?: string;
  idDocument?: string;
}

export const SeedCoAPI = {
  syncProfile: async (profile: FarmerProfile): Promise<{ success: boolean; id: string }> => {
    console.log("[Seed Co DB Sync] Syncing farmer profile...", profile);
    return new Promise((resolve) => setTimeout(() => resolve({ success: true, id: "nc_" + Date.now() }), 1500));
  },
  
  logAction: async (actionType: string, data: any): Promise<boolean> => {
    console.log(`[Seed Co DB Sync] Logging action: ${actionType}`, data);
    return new Promise((resolve) => setTimeout(() => resolve(true), 500));
  },
  
  queryAI: async (query: string, language: string = "EN"): Promise<string> => {
    console.log(`[SeedCo AI] Processing query: ${query} in ${language}`);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, language }),
      });
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      return data.reply;
    } catch (error) {
      console.error(error);
      return "I'm having trouble reaching the AI server. Please try again later.";
    }
  },
  
  uploadCropImage: async (imageUri: string, location: string): Promise<{ health: string; issue?: string; confidence: number }> => {
    console.log(`[Seed Co DB Sync] Uploading crop image for health scan... GPS: ${location}`);
    await SeedCoAPI.logAction("crop_health_scan", { location, timestamp: Date.now() });
    return new Promise((resolve) => setTimeout(() => resolve({ health: 'Sick', issue: 'Maize Leaf Blight', confidence: 0.92 }), 2000));
  }
};
