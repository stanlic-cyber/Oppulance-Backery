import React, { useState, useRef, useEffect } from "react";
import { 
  Home, Truck, Map as MapIcon, User, Tractor, LogOut,
  Navigation, Search, ChevronRight, Bell, Settings, FileText, MapPin, Camera, X
} from "lucide-react";
import { LanguageDropdown } from "./LanguageDropdown";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { LanguageKey } from "../lib/i18n";
import { useLocation } from "../lib/LocationContext";
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export function DistributorDashboard({ onLogout }: { onLogout: () => void }) {
  const [language, setLanguage] = useLocalStorage("nc_language", "EN") as [LanguageKey, (val: LanguageKey) => void];
  const [activeTab, setActiveTab] = useState<"home" | "logistics" | "routes" | "me">("home");

  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  
  const profilePicRef = useRef<HTMLInputElement>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { location } = useLocation();
  const locationDisplay = location.province || location.country || "Locating...";

  const handleActionClick = (title: string) => {
    setModalTitle(title);
    setShowModal(true);
  };

  const renderHome = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-[#0B7A4B] text-white p-6 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-white/80 text-sm font-medium">NeuroSeedco Logistics</p>
            <h1 className="text-2xl font-bold">Delivery Command</h1>
            <div className="flex items-center text-white/70 text-xs mt-1">
              <MapPin className="w-3 h-3 mr-1 shrink-0" />
              <span className="line-clamp-1">{locationDisplay} Region</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageDropdown language={language} setLanguage={setLanguage} />
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Tractor className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
          <p className="text-sm text-white/90">No distribution data has been added yet.</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center"><p className="text-sm text-slate-500">No distribution records are available yet.</p></div>
      </div>
    </div>
  );

  const renderLogistics = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm sticky top-0 z-10">
        <div>
          <h2 className="font-bold text-lg text-slate-900">Logistics</h2>
          <p className="text-xs text-slate-500">Fleet & inventory flow</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center"><p className="text-sm text-slate-500">No logistics intelligence is available yet.</p></div>
      </div>
    </div>
  );

  const renderRoutes = () => (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm sticky top-0 z-10">
        {showSearch ? (
          <div className="w-full flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input 
              type="text" 
              autoFocus
              placeholder="Search routes or vehicles..." 
              className="flex-1 bg-transparent border-none text-sm outline-none text-slate-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button aria-label="Close routes search" title="Close routes search" onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="ml-2 p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div>
              <h2 className="font-bold text-lg text-slate-900">Routes</h2>
              <p className="text-xs text-slate-500">Live fleet tracking</p>
            </div>
            <button aria-label="Open routes search" title="Open routes search" onClick={() => setShowSearch(true)} className="bg-[#0B7A4B] text-white p-2 rounded-full shadow-sm">
              <Search className="w-4 h-4"/>
            </button>
          </>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Real Live Map */}
        <div className="w-full h-[26rem] bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-inner relative z-0">
             <MapContainer
               center={[20, 0]}
               zoom={2}
               minZoom={2}
               maxZoom={19}
               style={{ height: '100%', width: '100%', zIndex: 0 }}
               zoomControl={true}
               attributionControl={true}
             >
               <LayersControl position="topright">
                 <LayersControl.BaseLayer checked name="Satellite">
                   <TileLayer
                     url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                     attribution="Tiles &copy; Esri"
                     maxZoom={19}
                   />
                 </LayersControl.BaseLayer>
                 <LayersControl.BaseLayer name="Street map">
                   <TileLayer
                     url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                     attribution="&copy; OpenStreetMap contributors"
                     maxZoom={19}
                   />
                 </LayersControl.BaseLayer>
               </LayersControl>
               {location.latitude && location.longitude && (
                 <Marker position={[location.latitude, location.longitude]}>
                   <Popup><div className="text-center"><p className="font-bold text-slate-900">Live device location</p><p className="text-xs text-slate-500">{locationDisplay}</p></div></Popup>
                 </Marker>
               )}
             </MapContainer>
        </div>

        <h3 className="font-bold text-slate-900 ml-1 mt-6">Active Deliveries</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            <p className="p-6 text-sm text-slate-500 text-center">No active deliveries are available yet.</p>
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
              <Truck className="w-10 h-10 text-slate-400" />
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
        <h2 className="text-2xl font-bold text-slate-900">Distributor Pro</h2>
        <p className="text-sm text-slate-500 mt-1 flex items-center justify-center"><MapPin className="w-3 h-3 mr-1" /> {locationDisplay} Hub</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            <button onClick={() => handleActionClick('Reports')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-slate-700 text-sm">Reports</span>
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
        {activeTab === "logistics" && renderLogistics()}
        {activeTab === "routes" && renderRoutes()}
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
          onClick={() => setActiveTab("logistics")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "logistics" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "logistics" ? "bg-[#0B7A4B]/10" : ""}`}>
            <Truck className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Logistics</span>
        </button>
        <button 
          onClick={() => setActiveTab("routes")} 
          className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === "routes" ? "text-[#0B7A4B]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "routes" ? "bg-[#0B7A4B]/10" : ""}`}>
            <MapIcon className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold mt-1">Routes</span>
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
              {modalTitle === 'Reports' && (
                <p className="text-sm text-slate-500">No reports are available yet.</p>
              )}
              {modalTitle === 'Notifications' && (
                <p className="text-sm text-slate-500">No notifications are available yet.</p>
              )}
              {modalTitle === 'Settings' && (
                <div className="space-y-4 text-sm">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                    <span className="font-medium text-slate-700">Live GPS Tracking Alerts</span>
                    <div className="w-10 h-6 bg-[#0B7A4B] rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                    <span className="font-medium text-slate-700">Driver Shift Notifications</span>
                    <div className="w-10 h-6 bg-[#0B7A4B] rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                </div>
              )}
              {!['Reports', 'Notifications', 'Settings'].includes(modalTitle) && !modalTitle.startsWith('Read Report:') && (
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
                  <button onClick={() => setModalTitle('Reports')} className="text-[#0B7A4B] font-bold text-xs flex items-center hover:underline">
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
