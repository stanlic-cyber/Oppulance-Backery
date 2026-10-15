import React, { useState, useRef, useEffect } from "react";
import { 
  Home, ShoppingCart, TrendingUp, User, Store, LogOut,
  MapPin, Search, ChevronRight, Package, Bell, FileText, Settings, BadgeAlert, Camera, X, Loader2
} from "lucide-react";
import { LanguageDropdown } from "./LanguageDropdown";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { LanguageKey } from "../lib/i18n";
import { useLocation } from "../lib/LocationContext";
import { useNearbyBusinesses, useMarketPrices } from "../lib/LiveDataService";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function AgroDealerDashboard({ onLogout }: { onLogout: () => void }) {
  const [language, setLanguage] = useLocalStorage("nc_language", "EN") as [LanguageKey, (val: LanguageKey) => void];
  const [activeTab, setActiveTab] = useState<"home" | "inventory" | "market" | "me">("home");
  
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  
  const profilePicRef = useRef<HTMLInputElement>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { location } = useLocation();
  const { data: nearbyFarmers, loading: farmersLoading, error: farmersError } = useNearbyBusinesses('market');
  const { data: marketPrices, loading: marketLoading, error: marketError } = useMarketPrices();

  const locationDisplay = location.village || location.ward || location.district || location.province || location.country || "Locating...";

  const handleActionClick = (title: string) => {
    setModalTitle(title);
    setShowModal(true);
  };

  const renderHome = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-[#0B7A4B] text-white p-6 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-white/80 text-sm font-medium">NeuroSeedco Retail</p>
            <h1 className="text-2xl font-bold">Storefront</h1>
            <div className="flex items-center text-white/70 text-xs mt-1">
              <MapPin className="w-3 h-3 mr-1 shrink-0" />
              <span className="line-clamp-1">{locationDisplay}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageDropdown language={language} setLanguage={setLanguage} />
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
          <p className="text-sm text-white/90">No dealer data has been added yet.</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center"><p className="text-sm text-slate-500">No dealer records are available yet.</p></div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm sticky top-0 z-10">
        {showSearch ? (
          <div className="w-full flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input 
              type="text" 
              autoFocus
              placeholder="Search inventory..." 
              className="flex-1 bg-transparent border-none text-sm outline-none text-slate-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button aria-label="Close inventory search" title="Close inventory search" onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="ml-2 p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div>
              <h2 className="font-bold text-lg text-slate-900">Inventory</h2>
              <p className="text-xs text-slate-500">Stock & reorders</p>
            </div>
            <button aria-label="Open inventory search" title="Open inventory search" onClick={() => setShowSearch(true)} className="bg-[#0B7A4B] text-white p-2 rounded-full shadow-sm">
              <Search className="w-4 h-4"/>
            </button>
          </>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Categories */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-2">
           {['All', 'Seeds', 'Fertilizer', 'Chemicals', 'Tools'].map((cat, i) => (
             <button 
               key={i} 
               onClick={() => setSelectedCategory(cat)}
               className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${selectedCategory === cat ? 'bg-[#0B7A4B] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
             >
               {cat}
             </button>
           ))}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center"><p className="text-sm text-slate-500">No inventory has been added yet.</p></div>
      </div>
    </div>
  );

  const renderMarket = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm sticky top-0 z-10">
        <div>
          <h2 className="font-bold text-lg text-slate-900">Market</h2>
          <p className="text-xs text-slate-500">Sales & insights</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Live Market Prices */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-slate-900">Live Crop Prices</h3>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">Live</span>
          </div>
          {marketLoading ? (
            <div className="flex flex-col items-center justify-center h-24 space-y-2">
              <Loader2 className="w-5 h-5 text-[#0B7A4B] animate-spin" />
              <p className="text-xs text-slate-500">Searching global markets...</p>
            </div>
          ) : marketError ? (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs text-center border border-red-100">
              {marketError}
            </div>
          ) : marketPrices && marketPrices.length > 0 ? (
            <div className="space-y-3">
              {marketPrices.map((price, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{price.crop}</h4>
                    {price.source && <p className="text-[10px] text-slate-500">Source: {price.source}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#0B7A4B]">{price.price}</p>
                    <span className={`text-[10px] font-bold ${price.trend === 'up' ? 'text-emerald-600' : price.trend === 'down' ? 'text-red-600' : 'text-slate-500'}`}>
                      {price.trend.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <p className="text-xs text-slate-500 text-center py-4">No market data available for {locationDisplay}.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center"><p className="text-sm text-slate-500">No sales forecast or inventory intelligence is available yet.</p></div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-bold text-sm text-slate-900 mb-2">Nearby Farmers Map</h3>
          <div className="w-full h-48 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative z-0">
            {location.latitude && location.longitude ? (
               <MapContainer 
                 center={[location.latitude, location.longitude]} 
                 zoom={11} 
                 style={{ height: '100%', width: '100%', zIndex: 0 }}
                 zoomControl={false}
                 attributionControl={false}
               >
                 <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                 <MapUpdater center={[location.latitude, location.longitude]} />
                 
                 {/* Dealer Marker */}
                 <Marker position={[location.latitude, location.longitude]}>
                   <Popup><p className="font-bold text-xs">Your Store</p></Popup>
                 </Marker>

                 {Array.isArray(nearbyFarmers) && nearbyFarmers.map((farmer: any, index: number) => {
                   const latitude = Number(farmer.latitude ?? farmer.lat);
                   const longitude = Number(farmer.longitude ?? farmer.lng ?? farmer.lon);
                   if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
                   return <Marker key={farmer.id || index} position={[latitude, longitude]}><Popup><p className="font-bold text-xs">{farmer.name || "Nearby farmer"}</p><p className="text-xs">{farmer.crop || "Farmer location"}</p></Popup></Marker>;
                 })}
               </MapContainer>
            ) : (
               <div className="flex flex-col items-center justify-center h-full space-y-2">
                 <Loader2 className="w-6 h-6 animate-spin text-[#0B7A4B]" />
                 <p className="text-xs text-slate-500">Initializing GIS...</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMe = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-white p-6 border-b border-slate-200 shadow-sm text-center relative">
        <div className="relative inline-block">
          <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center shadow-inner overflow-hidden border-2 border-white">
            {profilePicUrl ? (
              <img src={profilePicUrl} className="w-full h-full object-cover" alt="Profile" />
            ) : (
              <div className="w-full h-full bg-[#0B7A4B]/20 flex items-center justify-center text-2xl font-bold text-[#0B7A4B]">NS</div>
            )}
          </div>
          <button aria-label="Choose profile image" title="Choose profile image" onClick={() => profilePicRef.current?.click()} className="absolute bottom-4 right-0 w-7 h-7 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm text-slate-600 hover:text-[#0B7A4B] transition-colors">
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
        <input aria-label="Profile picture upload" title="Profile picture upload" type="file" ref={profilePicRef} accept="image/*" className="hidden" onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setProfilePicUrl(URL.createObjectURL(e.target.files[0]));
          }
        }} />
        <h2 className="text-2xl font-bold text-slate-900">AgroDealer Co.</h2>
        <p className="text-sm text-slate-500 mt-1 flex items-center justify-center"><MapPin className="w-3 h-3 mr-1" /> {locationDisplay} Branch</p>
        <div className="mt-4 inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
          <BadgeAlert className="w-3 h-3" />
          <span>Licensed Dealer</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            <button onClick={() => handleActionClick('Business Reports')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-slate-700 text-sm">Business Reports</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => handleActionClick('Notifications')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-slate-700 text-sm">Notifications</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => handleActionClick('Settings')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-medium text-slate-700 text-sm">Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        <button onClick={onLogout} className="w-full bg-white border border-red-200 text-red-600 py-4 rounded-2xl font-bold shadow-sm hover:bg-red-50 flex items-center justify-center transition-colors">
          <LogOut className="w-5 h-5 mr-2" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative h-screen w-full bg-slate-50 flex flex-col overflow-hidden font-sans">
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {activeTab === "home" && renderHome()}
        {activeTab === "inventory" && renderInventory()}
        {activeTab === "market" && renderMarket()}
        {activeTab === "me" && renderMe()}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-between items-center z-50">
        <button 
          onClick={() => setActiveTab("home")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "home" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "home" ? "bg-[#0B7A4B]/10" : ""}`}>
            <Home className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab("inventory")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "inventory" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "inventory" ? "bg-[#0B7A4B]/10" : ""}`}>
            <ShoppingCart className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Inventory</span>
        </button>
        <button 
          onClick={() => setActiveTab("market")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "market" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "market" ? "bg-[#0B7A4B]/10" : ""}`}>
            <TrendingUp className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Market</span>
        </button>
        <button 
          onClick={() => setActiveTab("me")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "me" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "me" ? "bg-[#0B7A4B]/10" : ""}`}>
            <User className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Me</span>
        </button>
      </div>

      {/* Action Modal */}
      {showModal && (
        <div className="absolute inset-0 z-100 flex items-end sm:items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="bg-white w-full max-w-md rounded-3xl rounded-b-none sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 relative z-10 pb-safe">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 text-lg">{modalTitle}</h2>
              <button aria-label="Close report modal" title="Close report modal" onClick={() => setShowModal(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {modalTitle === 'Business Reports' && (
                <p className="text-sm text-slate-500">No business reports are available yet.</p>
              )}
              {modalTitle === 'Notifications' && (
                <p className="text-sm text-slate-500">No notifications are available yet.</p>
              )}
              {modalTitle === 'Settings' && (
                <div className="space-y-4 text-sm">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                    <span className="font-medium text-slate-700">Push Notifications</span>
                    <div className="w-10 h-6 bg-[#0B7A4B] rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                    <span className="font-medium text-slate-700">Auto-Reorder Alerts</span>
                    <div className="w-10 h-6 bg-[#0B7A4B] rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                </div>
              )}
              {!['Business Reports', 'Notifications', 'Settings'].includes(modalTitle) && !modalTitle.startsWith('Read Report:') && (
                <p className="text-slate-600 text-sm">
                  This feature is currently under development. Please check back later.
                </p>
              )}
              {modalTitle.startsWith('Read Report:') && (
                <div className="space-y-4 text-sm text-slate-700">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="h-4 bg-slate-200 rounded w-full animate-pulse mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-4/6 animate-pulse mb-4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full animate-pulse mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse mb-2"></div>
                    <p className="text-xs text-slate-500 mt-4 italic">Document content loaded. Simulated view for demonstration.</p>
                  </div>
                  <button onClick={() => setModalTitle('Business Reports')} className="text-[#0B7A4B] font-bold text-xs flex items-center hover:underline">
                    &larr; Back to Reports
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
