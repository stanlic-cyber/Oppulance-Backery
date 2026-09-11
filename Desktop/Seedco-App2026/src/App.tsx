import { useState, useEffect, useCallback, useRef } from "react";
import { AuthScreens, AuthRole } from "./components/AuthScreens";
import { KYCPortal } from "./components/KYCPortal";
import { Dashboard } from "./components/Dashboard";
import { SeedCoPartnerDashboard } from "./components/SeedCoPartnerDashboard";
import { AgroDealerDashboard } from "./components/AgroDealerDashboard";
import { DistributorDashboard } from "./components/DistributorDashboard";
import { AgriculturalOfficerDashboard } from "./components/AgriculturalOfficerDashboard";
import { StakeholderRegistrationForm } from "./components/StakeholderRegistrationForm";
import { PendingApprovalScreen } from "./components/PendingApprovalScreen";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";
import { authService } from "./lib/auth-service";
import { Loader2, MapPin } from "lucide-react";
import { LocationProvider, useLocation } from "./lib/LocationContext";

function LocationPrompt({ onComplete }: { onComplete: () => void }) {
  const { location, requestLocation, setLocationManually } = useLocation();
  const [manual, setManual] = useState(false);
  const autoRequestStarted = useRef(false);
  const [country, setCountry] = useState("Zimbabwe");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");

  const handleAllow = () => {
    requestLocation();
  };

  useEffect(() => {
    if (!manual && !autoRequestStarted.current && !location.country && !location.loading) {
      autoRequestStarted.current = true;
      void requestLocation();
    }
  }, [manual, location.country, location.loading, requestLocation]);

  useEffect(() => {
    const resolvedLocation = Boolean(location.country);

    if (!manual && !location.loading && resolvedLocation) {
      onComplete();
    }
  }, [location.country, location.loading, manual, onComplete]);

  const handleManualSave = () => {
    setLocationManually({ country, province, district, loading: false, error: null });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-[#22C55E]/10 text-[#22C55E] rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Location Required</h3>
          <p className="text-slate-500 mt-2 text-sm">
            NeuroCrop AI uses real-time location data to provide region-specific weather, disease alerts, and market insights.
          </p>
        </div>

        {location.error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {location.error}
          </div>
        )}

        {!manual ? (
          <div className="space-y-3">
            <button
              onClick={handleAllow}
              disabled={location.loading}
              className="w-full py-3 bg-[#0B7A4B] text-white rounded-xl font-bold hover:bg-[#09603a] transition-colors flex items-center justify-center disabled:opacity-70"
            >
              {location.loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {location.loading ? "Detecting..." : "Allow Location Access"}
            </button>
            <button
              onClick={() => setManual(true)}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Set Location Manually
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <select aria-label="Country" title="Country" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]" value={country} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCountry(e.target.value)}>
                <option value="Zimbabwe">Zimbabwe</option>
                <option value="South Africa">South Africa</option>
                <option value="Zambia">Zambia</option>
                <option value="Kenya">Kenya</option>
                <option value="Nigeria">Nigeria</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Province / State</label>
              <input type="text" placeholder="e.g. Mashonaland Central" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]" value={province} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProvince(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
              <input type="text" placeholder="e.g. Mazowe" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]" value={district} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDistrict(e.target.value)} />
            </div>
            <div className="flex space-x-3 pt-2">
              <button onClick={() => setManual(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">Back</button>
              <button onClick={handleManualSave} className="flex-1 py-3 bg-[#0B7A4B] text-white rounded-xl font-bold hover:bg-[#09603a]">Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MainApp() {
  const [currentView, setCurrentView] = useState<"auth" | "kyc" | "dashboard" | "registration" | "pending_approval">("auth");
  const [hasKyc, setHasKyc] = useState(false);
  const [loggedInAccountType, setLoggedInAccountType] = useState<AuthRole>("farmer");
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [globalError, setGlobalError] = useState<{title: string, message: string} | null>(null);
  const [authInitialView, setAuthInitialView] = useState<"splash" | "portal_choice" | "login" | "signup" | "forgot_password">("splash");
  const [needsLocationPrompt, setNeedsLocationPrompt] = useState(false);
  const { location, requestLocation } = useLocation();

  useEffect(() => {
    // Clear KYC on reload to force user to verify since requested
    localStorage.removeItem("nc_hasKyc");
    setHasKyc(false);
  }, []);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setIsAppLoading(true);
      setGlobalError(null);

      if (user) {
        const role = user.role as AuthRole;
        setLoggedInAccountType(role);

        const hasResolvedLocation = Boolean(
          location.country || location.province || location.district || location.ward || location.village
        );

        const locationPromptPending = localStorage.getItem("nc_location_prompt_pending") === "true";

        if (!hasResolvedLocation && !location.loading && locationPromptPending) {
          setNeedsLocationPrompt(true);
        } else {
          setNeedsLocationPrompt(false);
        }

        setCurrentView("dashboard");
        setIsAppLoading(false);
      } else {
        setCurrentView("auth");
        setNeedsLocationPrompt(false);
        setIsAppLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const closeLocationPrompt = useCallback(() => {
    localStorage.removeItem("nc_location_prompt_pending");
    setNeedsLocationPrompt(false);
    setCurrentView("dashboard");
  }, []);

  const handleLoginSuccess = (accountType: AuthRole, status?: string) => {
    setIsAppLoading(true);
    setLoggedInAccountType(accountType);
    setNeedsLocationPrompt(false);
    setCurrentView("dashboard");
    setIsAppLoading(false);
    void requestLocation();
  };

  const handleSignupSuccess = (accountType: AuthRole, status?: string) => {
    setIsAppLoading(true);
    setLoggedInAccountType(accountType);
    localStorage.setItem("nc_location_prompt_pending", "true");
    setNeedsLocationPrompt(true);
    setCurrentView("dashboard");
    setIsAppLoading(false);
  };

  const handleRegistrationComplete = () => {
    setCurrentView("dashboard");
  };

  const handleKycComplete = () => {
    localStorage.setItem("nc_hasKyc", "true");
    setHasKyc(true);
    setCurrentView("dashboard");
  };

  const handleLogout = async () => {
    setIsAppLoading(true);
    try {
      await authService.signOut();
    } catch (e) {
      // ignore
    }
    setCurrentView("auth");
    setIsAppLoading(false);
  };

  const handleEditProfile = () => {
    setCurrentView("kyc");
  };

  if (isAppLoading) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0B3D2E] text-white">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#22C55E] mb-4" />
          <p className="text-lg font-medium text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative mx-auto min-h-218.5 w-full max-w-100.5 overflow-x-hidden bg-white ${currentView !== "auth" ? "app-content-compact" : ""}`}>
      {needsLocationPrompt && currentView !== "auth" && (
        <LocationPrompt onComplete={closeLocationPrompt} />
      )}
      
      {globalError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-red-600 mb-2">{globalError.title}</h3>
            <p className="text-slate-600 mb-6">{globalError.message}</p>
            <div className="flex flex-col space-y-3">
              {globalError.title === "Account Not Found" && (
                <button 
                  onClick={() => {
                    setGlobalError(null);
                    setAuthInitialView("portal_choice");
                  }}
                  className="w-full bg-[#0B7A4B] text-white py-3 rounded-xl font-bold hover:bg-[#09603a] transition-colors"
                >
                  Go to Sign Up
                </button>
              )}
              <button 
                onClick={() => setGlobalError(null)}
                className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === "auth" && (
        <AuthScreens 
          onLogin={handleLoginSuccess} 
          onSignup={handleSignupSuccess} 
          initialView={authInitialView}
        />
      )}
      {currentView === "kyc" && !needsLocationPrompt && (
        <KYCPortal 
          onComplete={handleKycComplete} 
          onCancel={() => setCurrentView(hasKyc ? "dashboard" : "auth")} 
        />
      )}
      {currentView === "registration" && !needsLocationPrompt && (
        <StakeholderRegistrationForm
          role={loggedInAccountType}
          onComplete={handleRegistrationComplete}
          onLogout={handleLogout}
        />
      )}
      {currentView === "pending_approval" && !needsLocationPrompt && (
        <PendingApprovalScreen onLogout={handleLogout} />
      )}
      {currentView === "dashboard" && !needsLocationPrompt && loggedInAccountType === "farmer" && (
        <Dashboard onLogout={handleLogout} onEditProfile={handleEditProfile} />
      )}
      {currentView === "dashboard" && !needsLocationPrompt && loggedInAccountType === "seedco_partner" && (
        <SeedCoPartnerDashboard onLogout={handleLogout} />
      )}
      {currentView === "dashboard" && !needsLocationPrompt && loggedInAccountType === "agro_dealer" && (
        <AgroDealerDashboard onLogout={handleLogout} />
      )}
      {currentView === "dashboard" && !needsLocationPrompt && loggedInAccountType === "distributor" && (
        <DistributorDashboard onLogout={handleLogout} />
      )}
      {currentView === "dashboard" && !needsLocationPrompt && loggedInAccountType === "agricultural_officer" && (
        <AgriculturalOfficerDashboard onLogout={handleLogout} />
      )}
      {currentView === "dashboard" && !needsLocationPrompt && loggedInAccountType === "super_admin" && (
        <SuperAdminDashboard onLogout={handleLogout} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LocationProvider>
      <MainApp />
    </LocationProvider>
  );
}
