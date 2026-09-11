import React, { useState } from "react";
import { 
  MapPin, 
  User, 
  ShieldCheck,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Upload,
  ArrowLeft
} from "lucide-react";
import { cn } from "../lib/utils";

import { SeedCoAPI, FarmerProfile } from "../lib/api";

const AFRICA_DATA: Record<string, { code: string, provinces: Record<string, string[]> }> = {
  "Zimbabwe": {
    code: "+263",
    provinces: {
      "Harare": ["Harare Urban", "Chitungwiza", "Epworth", "Ruwa"],
      "Bulawayo": ["Bulawayo Urban"],
      "Manicaland": ["Mutare", "Chimanimani", "Chipinge", "Makoni", "Buhera", "Mutasa", "Nyanga"],
      "Mashonaland Central": ["Bindura", "Muzarabani", "Guruve", "Mt Darwin", "Mazowe", "Rushinga", "Shamva", "Mbire"],
      "Mashonaland East": ["Marondera", "Goromonzi", "Murehwa", "Mutoko", "Mudzi", "Seke", "Chikomba", "Wedza", "UMP"],
      "Mashonaland West": ["Chinhoyi", "Hurungwe", "Zvimba", "Makonde", "Chegutu", "Kadoma", "Sanya", "Mhondoro-Ngezi", "Kariba"],
      "Masvingo": ["Masvingo", "Bikita", "Chiredzi", "Chivi", "Gutu", "Mwenezi", "Zaka"],
      "Matabeleland North": ["Lupane", "Hwange", "Binga", "Bubi", "Nkayi", "Umguza", "Tsholotsho"],
      "Matabeleland South": ["Gwanda", "Beitbridge", "Bulilima", "Mangwe", "Insiza", "Matobo", "Umzingwane"],
      "Midlands": ["Gweru", "Kwekwe", "Gokwe North", "Gokwe South", "Mberengwa", "Shurugwi", "Zvishavane", "Chirumhanzu"]
    }
  },
  "South Africa": {
    code: "+27",
    provinces: {
      "Gauteng": ["City of Johannesburg", "City of Tshwane", "Ekurhuleni", "Sedibeng", "West Rand"],
      "KwaZulu-Natal": ["eThekwini", "Umgungundlovu", "Uthukela", "Zululand", "King Cetshwayo", "Amajuba", "Harry Gwala"],
      "Western Cape": ["City of Cape Town", "West Coast", "Cape Winelands", "Overberg", "Eden", "Central Karoo"],
      "Eastern Cape": ["Buffalo City", "Nelson Mandela Bay", "Sarah Baartman", "OR Tambo", "Chris Hani"],
      "Free State": ["Mangaung", "Xhariep", "Lejweleputswa", "Thabo Mofutsanyana", "Fezile Dabi"]
    }
  },
  "Zambia": {
    code: "+260",
    provinces: {
      "Lusaka": ["Lusaka", "Chilanga", "Chongwe", "Kafue", "Luangwa", "Rufunsa"],
      "Copperbelt": ["Ndola", "Kitwe", "Chingola", "Mufulira", "Luanshya", "Kalulushi", "Chililabombwe", "Mpongwe"],
      "Southern": ["Livingstone", "Choma", "Mazabuka", "Monze", "Kalomo", "Namwala", "Pemba"],
      "Central": ["Kabwe", "Kapiri Mposhi", "Mkushi", "Serenje", "Chibombo", "Mumbwa"]
    }
  },
  "Kenya": {
    code: "+254",
    provinces: {
      "Nairobi": ["Westlands", "Dagoretti", "Lang'ata", "Kibra", "Roysambu", "Makadara", "Kamukunji", "Starehe", "Mathare"],
      "Central": ["Kiambu", "Murang'a", "Nyeri", "Kirinyaga", "Nyandarua"],
      "Rift Valley": ["Nakuru", "Uasin Gishu", "Kericho", "Bomet", "Nandi", "Trans Nzoia", "Baringo", "Narok", "Kajiado"],
      "Coast": ["Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta"]
    }
  },
  "Nigeria": {
    code: "+234",
    provinces: {
      "Lagos": ["Ikeja", "Badagry", "Epe", "Ikorodu", "Lagos Island"],
      "Kano": ["Kano Municipal", "Dala", "Gwale", "Tarauni", "Nassarawa"],
      "Oyo": ["Ibadan North", "Ibadan South-West", "Egbeda", "Ogbomosho North"],
      "Rivers": ["Port Harcourt", "Obio-Akpor", "Eleme", "Bonny"]
    }
  },
  "Malawi": {
    code: "+265",
    provinces: {
      "Central": ["Lilongwe", "Dedza", "Dowa", "Kasungu", "Mchinji", "Nkhotakota", "Ntcheu", "Ntchisi", "Salima"],
      "Northern": ["Mzuzu", "Chitipa", "Karonga", "Likoma", "Mzimba", "Nkhata Bay", "Rumphi"],
      "Southern": ["Blantyre", "Balaka", "Chikwawa", "Chiradzulu", "Machinga", "Mangochi", "Mulanje", "Mwanza", "Neno", "Nsanje", "Phalombe", "Thyolo", "Zomba"]
    }
  },
  "Other": {
    code: "+",
    provinces: {
      "Other": ["Other"]
    }
  }
};

const SEEDCO_CATALOG = {
  "Maize": ["SC 301", "SC 303", "SC 403", "SC 419", "SC 437", "SC 513", "SC 529", "SC 543", "SC 555", "SC 608", "SC 633", "SC 643", "SC 649", "SC 659", "SC 719", "SC 727", "SC 740", "Other"],
  "Soya Beans": ["SC Safari", "SC Sequel", "SC Serenade", "SC Spike", "SC Squire", "SC Status", "Other"],
  "Wheat": ["SC Nduna", "SC Select", "SC Smart", "SC Sahari", "Other"],
  "Sorghum": ["SC Sila", "SC Xhosa", "SC Sabi", "Sugargraze", "Other"],
  "Sugar Beans": ["SC Bounty", "SC Wenera", "Other"],
  "Cowpeas": ["SC Mung", "Other"],
  "Other": ["Other"]
};

export function KYCPortal({ onComplete, onCancel }: { onComplete?: () => void, onCancel?: () => void }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState<FarmerProfile>({
    fullName: "",
    phone: "",
    gender: "",
    district: "",
    province: "",
    country: "",
    farmName: "",
    farmSize: "",
    gpsLocation: "",
    mainCrop: "",
    seedVariety: "",
    plantingDate: "",
    irrigation: "",
    soilType: "",
    expectedRainfall: "",
    experience: "",
    idType: "",
    idDocument: ""
  });

  React.useEffect(() => {
    const saved = localStorage.getItem("nc_profileData");
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    
    setIsSubmitting(true);
    try {
      localStorage.setItem("nc_profileData", JSON.stringify(formData));
      await SeedCoAPI.syncProfile(formData);
      setSuccess(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 1500);
    } catch (e) {
      // simulate error handling
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center animate-in zoom-in slide-in-from-bottom-8 duration-500">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sync Complete</h2>
          <p className="text-gray-500 mb-6 font-medium">Your profile is synchronized with the NeuroSeedco Intelligence Platform.</p>
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-emerald-600 text-white px-4 py-4 shadow-md sticky top-0 z-50">
        <div className="flex items-center justify-between mb-4">
          <button 
            type="button" 
            onClick={onCancel}
            className="p-1.5 hover:bg-emerald-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg text-center absolute left-1/2 -translate-x-1/2">Farmer Registration</h1>
          <div className="w-8" /> {/* spacer for centering */}
        </div>
        <div className="flex justify-between">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center flex-1 relative">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors relative z-10", step >= i ? "bg-white text-emerald-600 border-white" : "bg-emerald-700/50 text-emerald-200 border-transparent")}>
                {i}
              </div>
              <span className={cn("text-[10px] mt-1 font-medium", step >= i ? "text-white" : "text-emerald-200")}>
                {i === 1 ? "Personal" : i === 2 ? "Farm" : i === 3 ? "Extra" : "Identity"}
              </span>
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center space-x-2 mb-4">
                  <User className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-gray-800">Personal Data</h2>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" placeholder="John Doe" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Country</label>
                  <select name="country" value={formData.country} onChange={(e) => {
                    const country = e.target.value;
                    const countryData = AFRICA_DATA[country];
                    const firstProv = countryData ? Object.keys(countryData.provinces)[0] : "";
                    const firstDist = countryData && firstProv ? countryData.provinces[firstProv][0] : "";
                    
                    setFormData({
                      ...formData,
                      country,
                      province: firstProv,
                      district: firstDist
                    });
                  }} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                    <option value="">Select Country</option>
                    {Object.keys(AFRICA_DATA).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <div className="flex space-x-2">
                    <span className="flex items-center justify-center bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700">
                      {formData.country ? AFRICA_DATA[formData.country]?.code || "+" : "+"}
                    </span>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" placeholder="77 123 4567" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Province</label>
                    <select name="province" value={formData.province} onChange={(e) => {
                       const prov = e.target.value;
                       const countryData = AFRICA_DATA[formData.country];
                       const firstDist = countryData && countryData.provinces[prov] ? countryData.provinces[prov][0] : "";
                       
                       setFormData({
                         ...formData,
                         province: prov,
                         district: firstDist
                       });
                    }} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                      <option value="">Select Province</option>
                      {formData.country && AFRICA_DATA[formData.country] && Object.keys(AFRICA_DATA[formData.country].provinces).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">District</label>
                    <select name="district" value={formData.district} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                      <option value="">Select District</option>
                      {formData.country && formData.province && AFRICA_DATA[formData.country]?.provinces[formData.province] && AFRICA_DATA[formData.country].provinces[formData.province].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center space-x-2 mb-4">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-gray-800">Farm Information</h2>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Farm Name</label>
                  <input type="text" name="farmName" value={formData.farmName} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" placeholder="Green Valley Farm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Farm Size (Hectares)</label>
                  <input type="number" name="farmSize" value={formData.farmSize} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" placeholder="50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">GPS Location</label>
                  <div className="flex space-x-2">
                    <input type="text" name="gpsLocation" value={formData.gpsLocation} onChange={handleChange} required className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" placeholder="-17.8248, 31.0530" />
                    <button type="button" onClick={() => {
                      if ("geolocation" in navigator) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => setFormData({...formData, gpsLocation: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`}),
                          (error) => alert(`Error getting location: ${error.message}`)
                        );
                      } else {
                        alert("Geolocation is not supported by your browser");
                      }
                    }} className="bg-emerald-100 text-emerald-700 p-3 rounded-xl border border-emerald-200 hover:bg-emerald-200 transition-colors" title="Get Current Location">
                      <MapPin className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Main Crop</label>
                  <select name="mainCrop" value={formData.mainCrop} onChange={(e) => {
                    const newCrop = e.target.value;
                    const varieties = SEEDCO_CATALOG[newCrop as keyof typeof SEEDCO_CATALOG] || [];
                    setFormData({
                      ...formData, 
                      mainCrop: newCrop, 
                      seedVariety: varieties.length > 0 ? varieties[0] : "" 
                    });
                  }} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                    <option value="">Select Crop</option>
                    {Object.keys(SEEDCO_CATALOG).map(crop => (
                      <option key={crop} value={crop}>{crop}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Seed Variety Used</label>
                  <select name="seedVariety" value={formData.seedVariety} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                    <option value="">Select Variety</option>
                    {(SEEDCO_CATALOG[formData.mainCrop as keyof typeof SEEDCO_CATALOG] || []).map(variety => (
                      <option key={variety} value={variety}>{variety}</option>
                    ))}
                    {!SEEDCO_CATALOG[formData.mainCrop as keyof typeof SEEDCO_CATALOG] && (
                      <option value="" disabled>Please select a crop first</option>
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Planting Date</label>
                  <input type="date" name="plantingDate" value={formData.plantingDate} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center space-x-2 mb-4">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-gray-800">Additional Profile</h2>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Irrigation Available</label>
                  <select name="irrigation" value={formData.irrigation} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                    <option value="">Select option</option>
                    <option value="Yes">Yes (Center Pivot/Drip/Overhead)</option>
                    <option value="No">No (Rain-fed only)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Soil Type</label>
                  <select name="soilType" value={formData.soilType} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                    <option value="">Select Soil Type</option>
                    <option value="Clay">Clay</option>
                    <option value="Sandy">Sandy</option>
                    <option value="Loam">Loam</option>
                    <option value="Silt">Silt</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Expected Rainfall (mm/year)</label>
                  <input type="number" name="expectedRainfall" value={formData.expectedRainfall} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" placeholder="800" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Farming Experience (Years)</label>
                  <input type="number" name="experience" value={formData.experience} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" placeholder="10" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center space-x-2 mb-4">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-gray-800">Identity Verification</h2>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Document Type</label>
                  <select name="idType" value={formData.idType} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                    <option value="">Select ID Type</option>
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver's License">Driver's License</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Upload Document</label>
                  <div className="w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl px-4 py-8 flex flex-col items-center justify-center relative hover:bg-gray-100 transition-colors cursor-pointer group">
                    <Upload className="w-8 h-8 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-gray-700">Tap to upload proof of identity</span>
                    <span className="text-xs text-gray-500 mt-1">Clear photo of {formData.idType || 'document'}</span>
                    <input type="file" accept="image/*" required={!formData.idDocument} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFormData({...formData, idDocument: e.target.files[0].name });
                      }
                    }} />
                    {formData.idDocument && (
                       <div className="mt-4 px-4 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center">
                         <CheckCircle2 className="w-3 h-3 mr-1" />
                         {formData.idDocument}
                       </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-6 border-t border-gray-100 mt-6">
              {step > 1 && (
                <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                  Back
                </button>
              )}
              <button disabled={isSubmitting} type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2">
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>{step < 4 ? "Next Step" : "Sync Profile"}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
