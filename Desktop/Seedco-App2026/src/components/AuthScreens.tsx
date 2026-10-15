import React, { useState, useEffect } from "react";
import farmerBg from "../assets/images/ai_farmer_bg_1782187527443.jpg";
import { 
  Leaf, Brain, Lock, User, Building, Sprout, 
  CheckCircle2, ChevronLeft, Eye, EyeOff, Loader2, Globe, Fingerprint, 
  MapPin, Store, Tractor, CloudRain, TrendingUp, Network, Mail, ChevronDown, Shield
} from "lucide-react";
import { cn } from "../lib/utils";
import { t, LanguageKey } from "../lib/i18n";
import { authService, UserProfile } from "../lib/auth-service";

function useLocalStorage(key: string, initialValue: string) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? item : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValueSave = (val: string | ((val: string) => string)) => {
    try {
      const valueToStore = val instanceof Function ? val(value) : val;
      setValue(valueToStore);
      if (valueToStore) {
        window.localStorage.setItem(key, valueToStore);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch (error) {}
  };

  return [value, setValueSave] as const;
}

export type AuthRole = "farmer" | "seedco_partner" | "agro_dealer" | "distributor" | "agricultural_officer" | "super_admin";

export function AuthScreens({ onLogin, onSignup, initialView = "splash" }: { onLogin?: (accountType: AuthRole, status?: string) => void; onSignup?: (accountType: AuthRole, status?: string) => void; initialView?: "splash" | "portal_choice" | "login" | "signup" | "forgot_password" }) {
  const [view, setView] = useState<"splash" | "portal_choice" | "login" | "signup" | "forgot_password">(initialView);
  
  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const [selectedPortal, setSelectedPortal] = useState<AuthRole | null>(null);
  const [language, setLanguage] = useLocalStorage("nc_language", "EN") as [LanguageKey, (val: LanguageKey) => void];
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  
  // Login State
  const [loginEmail, setLoginEmail] = useLocalStorage("nc_loginEmail", "");
  const [loginPassword, setLoginPassword] = useLocalStorage("nc_loginPassword", "");
  const [loginErrors, setLoginErrors] = useState<{ email?: string, password?: string }>({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useLocalStorage("nc_rememberMe", "false");
  
  // Signup State
  const [signupData, setSignupData] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string;
    nationalId?: string;
    farmDetails?: string;
    businessName?: string;
    licenseNumber?: string;
    companyName?: string;
    distributorId?: string;
    governmentId?: string;
    officerNumber?: string;
    position?: string;
  }>({});
  
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  
  // Forgot Password
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [needsAccount, setNeedsAccount] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    setNeedsAccount(false);
    const errors: { email?: string, password?: string } = {};
    if (!loginEmail) errors.email = "Email/Phone is required";
    if (!loginPassword) errors.password = "Password is required";
    
    // Role-specific email validation
    if (loginEmail) {
      if (selectedPortal === "seedco_partner" && loginEmail.length < 3) {
        setErrorMessage("Access Denied: Invalid email.");
        return;
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      return;
    }
    
    setLoginErrors({});
    setIsSubmitting(true);
    
    try {
      const user = await authService.signIn(loginEmail, loginPassword, selectedPortal || undefined);
      
      setIsSubmitting(false);
      setSuccessMessage("Authentication successful");
      setLoginEmail("");
      setLoginPassword("");
      
      if (onLogin) {
        onLogin(selectedPortal || user.role, user.status);
      }
      
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setErrorMessage("Account not found.");
        setNeedsAccount(true);
      } else if (err.code === "auth/wrong-password") {
        setErrorMessage("Incorrect email or password.");
      } else {
        setErrorMessage(err.message || "Authentication failed. Please check your credentials.");
      }
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    
    const errors: Record<string, string> = {};
    
    if (!signupData.email) {
      errors.email = "Required";
    } else if (!/^\S+@\S+\.\S+$/.test(signupData.email)) {
      errors.email = "Invalid email";
    }

    if (!signupData.password) {
      errors.password = "Required";
    } else if (signupData.password.length < 8) {
      errors.password = "Min 8 chars";
    }
    
    if (Object.keys(errors).length > 0) {
      setSignupErrors(errors);
      return;
    }

    if (!selectedPortal) {
      setErrorMessage("Please select a portal before creating your account.");
      return;
    }
    
    setSignupErrors({});
    setIsSubmitting(true);
    
    try {
      const user = await authService.signUp({
        email: signupData.email,
        firstName: signupData.firstName || signupData.businessName || signupData.companyName || "",
        lastName: signupData.lastName || "",
        phone: signupData.phone || "",
        role: selectedPortal,
        businessDetails: {
          nationalId: signupData.nationalId || "",
          farmDetails: signupData.farmDetails || "",
          licenseNumber: signupData.licenseNumber || "",
          distributorId: signupData.distributorId || "",
          governmentId: signupData.governmentId || "",
          officerNumber: signupData.officerNumber || ""
        }
      }, signupData.password!);
      
      setIsSubmitting(false);
      
      setSuccessMessage("Account created successfully. Redirecting...");
      setSignupData({});
      if (onSignup && selectedPortal) onSignup(selectedPortal, user.status);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setErrorMessage("Email already exists.");
      } else {
        setErrorMessage(err.message || "Registration failed. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  const renderSignupPassword = () => (
    <div className="relative">
      <input
        type={showSignupPassword ? "text" : "password"}
        placeholder="Create Password"
        value={signupData.password || ""}
        onChange={e => setSignupData({ ...signupData, password: e.target.value })}
        className={cn(inputBase, "pr-12", signupErrors.password ? inputError : inputNormal)}
      />
      <button
        type="button"
        aria-label={showSignupPassword ? "Hide password" : "Show password"}
        onClick={() => setShowSignupPassword(!showSignupPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-white font-semibold text-xs hover:text-[#22C55E]"
      >
        {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        <span>{showSignupPassword ? "Hide" : "Show"}</span>
      </button>
      {signupErrors.password && <p className="text-red-400 text-xs mt-1">{signupErrors.password}</p>}
    </div>
  );

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setResetError("");
    if (!resetEmail) {
      setResetError("Email or phone is required");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Simulate password reset email
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsSubmitting(false);
      setSuccessMessage("Reset instructions sent");
      setResetEmail("");
    } catch(err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || "Failed to send reset email");
    }
  };

  const handleSocialLogin = async (provider: "google" | "biometric") => {
    if (provider === "biometric") {
      setIsBiometricLoading(true);
      setTimeout(() => {
        setIsBiometricLoading(false);
        setErrorMessage("Biometrics not configured in this environment.");
      }, 1500);
      return;
    }
    
    if (provider === "google") {
      setIsGoogleLoading(true);
      setErrorMessage("");
      setNeedsAccount(false);

      try {
        if (!selectedPortal) {
          throw new Error("Please select a portal before continuing with Google.");
        }

        const user = await authService.signInWithGoogle(selectedPortal);
        setSuccessMessage(view === "signup" ? "Google account created. Redirecting..." : "Google authentication successful");
        if (view === "signup") {
          onSignup?.(selectedPortal, user.status);
        } else {
          onLogin?.(selectedPortal, user.status);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Google authentication failed. Please try again.");
      } finally {
        setIsGoogleLoading(false);
      }
    }
  };

  const resetMessages = () => {
    setSuccessMessage("");
    setErrorMessage("");
    setLoginErrors({});
    setSignupErrors({});
    setResetError("");
  };


  const navigateTo = (newView: "splash" | "portal_choice" | "login" | "signup" | "forgot_password") => {
    resetMessages();
    setView(newView);
    if (newView === "splash") {
      setSelectedPortal(null);
    }
  };

  const selectPortal = (role: AuthRole) => {
    setSelectedPortal(role);
    navigateTo("portal_choice");
  };

  const inputBase = "w-full pl-11 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white text-sm placeholder-white/50 focus:bg-white/15 focus:ring-2 focus:ring-[#22C55E]/50 outline-none transition-all backdrop-blur-md";
  const inputNormal = "border-white/20 focus:border-[#22C55E]";
  const inputError = "border-red-400 focus:ring-red-500/50 focus:border-red-400 bg-red-900/30";

  const languageOptions = [
    { code: "EN", name: "English" },
    { code: "FR", name: "Français" },
    { code: "PT", name: "Português" },
    { code: "SW", name: "Swahili" },
    { code: "HA", name: "Hausa" },
    { code: "YO", name: "Yoruba" },
    { code: "IG", name: "Igbo" },
    { code: "AM", name: "Amharic" },
    { code: "ZU", name: "Zulu" },
    { code: "XH", name: "Xhosa" },
    { code: "SN", name: "Shona" },
    { code: "ND", name: "Ndebele" },
    { code: "AR", name: "Arabic" }
  ];

  const displayLang = languageOptions.find(l => l.code === language)?.name || "English";

  const portals = [
    { id: "farmer", icon: Sprout, title: "Farmer", desc: "Independent & contracted farmers" },
    { id: "seedco_partner", icon: Building, title: "SeedCo Partner", desc: "Executive intelligence access" },
    { id: "agro_dealer", icon: Store, title: "Agro Dealer", desc: "Retail management portal" },
    { id: "distributor", icon: Tractor, title: "Distributor", desc: "Logistics command center" },
    { id: "agricultural_officer", icon: MapPin, title: "Agricultural Officer", desc: "Government intelligence" },
    { id: "super_admin", icon: Shield, title: "Super Admin", desc: "Platform management & analytics" }
  ] as const;

  const currentPortalConfig = portals.find(p => p.id === selectedPortal);

  return (
    <div className="relative min-h-dvh w-full flex flex-col font-sans selection:bg-[#22C55E]/30 overflow-x-hidden overflow-y-auto">
      {/* Background Image with Dark Green Overlay */}
      <div className="absolute inset-0 z-0 bg-black">
        <img
          src={farmerBg}
          alt="African farmer in AI fields"
          className="w-full h-full object-cover opacity-80 blur-[2px]"
        />
        {/* Dark Green Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-[#0B3D2E]/60 via-[#145A32]/70 to-[#0B3D2E]/90" />
      </div>

      {/* Navigation Navbar - Left Aligned */}
      <div className="relative z-50 p-6 flex justify-between items-start w-full max-w-lg mx-auto">
        <div className="relative">
          {view !== "splash" && (
            <button 
              onClick={() => {
                if (view === "login" || view === "signup") navigateTo("portal_choice");
                else if (view === "forgot_password") navigateTo("login");
                else navigateTo("splash");
              }}
              aria-label="Back"
              title="Back"
              className="flex items-center justify-center text-white hover:text-white/90 transition-colors bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/20 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center w-full px-6 pt-4 pb-12">
        
<div className="w-full max-w-2xl lg:max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col h-full">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center justify-center text-center mb-12 mt-8">
             <div className="relative flex items-center justify-center w-24 h-24 mb-6">
               <Brain className="absolute w-14 h-14 text-white" strokeWidth={1.5} />
               <Leaf className="absolute w-8 h-8 text-[#22C55E] z-10 -ml-2 mb-3" fill="currentColor" />
             </div>
             <h1 className="text-white font-display font-semibold text-[32px] leading-tight tracking-tight mb-3">
               {t[language].authAppTitle?.replace("Crop AI", "") || "NeuroSeedco "}<span className="text-[#22C55E]">Crop AI</span>
             </h1>
             <p className="text-white/90 text-[15px] font-medium tracking-wide max-w-70">
               {t[language].authAppSubtitle}
             </p>
          </div>

          {/* Splash View Buttons */}
          {view === "splash" && (
            <div className="space-y-3 w-full mt-auto mb-4">
              <h3 className="text-white/80 font-medium mb-4 text-center">Select your portal to continue</h3>
              {portals.map((portal) => (
                <button 
                  key={portal.id}
                  onClick={() => selectPortal(portal.id)} 
                  className="w-full flex items-center justify-between p-4 cursor-pointer bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-2xl transition-all backdrop-blur-md transform hover:-translate-y-0.5 group"
                >
                  <div className="flex items-center space-x-4 text-left">
                    <div className="w-10 h-10 rounded-full bg-[#22C55E]/20 flex items-center justify-center text-[#22C55E] group-hover:bg-[#22C55E] group-hover:text-white transition-colors">
                      <portal.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-[15px]">{portal.title}</div>
                      <div className="text-white/60 text-[12px] mt-0.5">{portal.desc}</div>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 opacity-50 rotate-180" />
                </button>
              ))}
            </div>
          )}

          {/* Forms Container (Glassmorphism card) */}
          {view !== "splash" && (
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 sm:p-8 rounded-3xl shadow-2xl mt-auto">
              
              {/* Portal Choice */}
              {view === "portal_choice" && (
                <div>
                  <div className="flex items-center justify-center mb-6 text-[#22C55E]">
                     {currentPortalConfig && <currentPortalConfig.icon className="w-10 h-10" />}
                  </div>
                  <h2 className="text-2xl font-semibold text-white mb-2 text-center">{currentPortalConfig?.title || "Portal"}</h2>
                  <p className="text-white/70 text-center mb-8 text-sm">{currentPortalConfig?.desc}</p>

                  <div className="space-y-4">
                    <button 
                      onClick={() => navigateTo("login")} 
                      className="w-full cursor-pointer bg-[#22C55E] hover:bg-[#16a34a] text-white font-semibold text-lg py-4 rounded-2xl transition-all shadow-[0_4px_20px_-5px_rgba(34,197,94,0.5)] transform hover:-translate-y-0.5"
                    >
                      Login
                    </button>
                    <button 
                      onClick={() => navigateTo("signup")} 
                      className="w-full cursor-pointer bg-transparent hover:bg-white/5 text-white border border-white/20 font-semibold text-lg py-4 rounded-2xl transition-all backdrop-blur-md transform hover:-translate-y-0.5"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              )}

              {/* Login Form */}
              {view === "login" && (
                <div>
                  <div className="flex items-center justify-center mb-6 text-[#22C55E]">
                     {currentPortalConfig && <currentPortalConfig.icon className="w-10 h-10" />}
                  </div>
                  <h2 className="text-2xl font-semibold text-white mb-2 text-center">{currentPortalConfig?.title || "Login"}</h2>
                  <p className="text-white/70 text-center mb-6 text-sm">{currentPortalConfig?.desc}</p>
                  
                  {successMessage && (
                    <div className="mb-6 bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] px-4 py-3 rounded-2xl flex items-center space-x-3">
                       <CheckCircle2 className="w-5 h-5 shrink-0" />
                       <p className="text-sm font-medium">{successMessage}</p>
                    </div>
                  )}
                  {errorMessage && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl flex flex-col space-y-3">
                       <div className="flex items-center space-x-3">
                          <p className="text-sm font-medium">{errorMessage}</p>
                       </div>
                       {needsAccount && (
                         <button 
                           onClick={() => navigateTo("signup")}
                           className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors border border-white/10 text-center w-full cursor-pointer"
                         >
                           Create an Account
                         </button>
                       )}
                    </div>
                  )}
                  {Object.keys(signupErrors).length > 0 && !signupErrors.password && (
                    <p className="mb-6 text-sm text-red-400">Please complete the required fields before creating the account.</p>
                  )}
                  
                  <form className="space-y-4" onSubmit={handleLogin}>
                    <div className="space-y-1.5">
                      <div className="relative">
                        <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                        <input 
                          type="text" 
                          placeholder={
                            selectedPortal === "farmer" ? "Phone Number or Email" : 
                            "Email Address"
                          } 
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className={cn(inputBase, loginErrors.email ? inputError : inputNormal)}
                        />
                      </div>
                      {loginErrors.email && <p className="text-red-400 text-xs mt-1 px-1">{loginErrors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <div className="relative">
                        <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                        <input 
                          type={showLoginPassword ? "text" : "password"}
                          placeholder={t[language].authPassword || t[language].password} 
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className={cn(inputBase, "pr-12", loginErrors.password ? inputError : inputNormal)}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white cursor-pointer"
                        >
                          {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 pb-4">
                       <label className="flex items-center space-x-2 cursor-pointer group">
                          <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center transition-colors", rememberMe === "true" ? "bg-[#22C55E] border-[#22C55E]" : "border-white/30 bg-white/5 group-hover:border-white/50")}>
                            {rememberMe === "true" && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className="text-sm text-white/80 hover:text-white transition-colors">{t[language].authRememberMe || "Remember Me"}</span>
                          <input type="checkbox" className="hidden" checked={rememberMe === "true"} onChange={(e) => setRememberMe(e.target.checked ? "true" : "false")} />
                       </label>
                       <button type="button" onClick={() => navigateTo("forgot_password")} className="text-sm font-medium text-white hover:text-white/80 cursor-pointer">{t[language].authForgotPassword || t[language].forgotPassword}</button>
                    </div>

                    <button 
                      disabled={isSubmitting || isGoogleLoading || isBiometricLoading}
                      className="w-full cursor-pointer bg-[#22C55E] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold text-lg py-4 rounded-2xl transition-all flex items-center justify-center shadow-lg"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (t[language].authLogin || t[language].login)}
                    </button>
                  </form>

                  <div className="mt-6 flex items-center space-x-4">
                    <div className="h-px bg-white/20 flex-1"></div>
                    <span className="text-xs text-white/60 uppercase tracking-wider font-semibold">{t[language].authOrContinueWith || t[language].orContinueWith}</span>
                    <div className="h-px bg-white/20 flex-1"></div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => handleSocialLogin('google')}
                      disabled={isSubmitting || isGoogleLoading}
                      className="flex items-center justify-center py-3.5 bg-white hover:bg-gray-50 text-slate-900 rounded-2xl font-semibold text-sm transition-all cursor-pointer shadow-sm"
                    >
                      {isGoogleLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-800" /> : (
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      )}
                      {t[language].authGoogle || "Google"}
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleSocialLogin('biometric')}
                      disabled={isSubmitting || isBiometricLoading}
                      className="flex items-center justify-center py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-semibold text-sm border border-white/20 transition-all backdrop-blur-md cursor-pointer"
                    >
                      {isBiometricLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#22C55E]" /> : <Fingerprint className="w-5 h-5 mr-2 text-[#22C55E]" />}
                      {t[language].authBiometric || "Biometric"}
                    </button>
                  </div>
                  
                  <p className="mt-8 text-center text-sm text-white/70">
                    {t[language].authDontHaveAccount || t[language].noAccount} <button onClick={() => navigateTo('signup')} className="text-white hover:text-[#22C55E] font-semibold ml-1 cursor-pointer transition-colors">{t[language].authCreateAccount || t[language].createAccount}</button>
                  </p>
                </div>
              )}

              {/* Signup Form */}
              {view === "signup" && (
                <div>
                  <div className="flex items-center justify-center mb-6 text-[#22C55E]">
                     {currentPortalConfig && <currentPortalConfig.icon className="w-10 h-10" />}
                  </div>
                  <h2 className="text-2xl font-semibold text-white mb-2 text-center">
                    {selectedPortal === "farmer" ? "Create Account" : "Request Access"}
                  </h2>
                  <p className="text-white/80 text-sm mb-6 text-center">
                    {selectedPortal === "farmer" 
                      ? "Join the agricultural intelligence network" 
                      : "Submit your details for verification"}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleSocialLogin("google")}
                    disabled={isSubmitting || isGoogleLoading}
                    className="w-full flex items-center justify-center py-3.5 bg-white hover:bg-gray-50 text-slate-900 rounded-2xl font-semibold text-sm transition-all cursor-pointer shadow-sm mb-6"
                  >
                    {isGoogleLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-800" /> : <span className="mr-2 font-bold text-base">G</span>}
                    {t[language].authGoogle || "Continue with Google"}
                  </button>

                  {successMessage && (
                    <div className="mb-6 bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] px-4 py-3 rounded-2xl flex items-center space-x-3">
                       <CheckCircle2 className="w-5 h-5 shrink-0" />
                       <p className="text-sm font-medium">{successMessage}</p>
                    </div>
                  )}
                  {errorMessage && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl flex items-center space-x-3">
                       <p className="text-sm font-medium">{errorMessage}</p>
                    </div>
                  )}

                  <form className="space-y-4" onSubmit={handleSignup}>
                    {selectedPortal === "farmer" && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" placeholder="First Name" value={signupData.firstName || ''} onChange={e => setSignupData({...signupData, firstName: e.target.value})} className={inputBase} />
                          <input type="text" placeholder="Last Name" value={signupData.lastName || ''} onChange={e => setSignupData({...signupData, lastName: e.target.value})} className={inputBase} />
                        </div>
                        <input type="email" placeholder="Email Address" value={signupData.email || ''} onChange={e => setSignupData({...signupData, email: e.target.value})} className={inputBase} />
                        <input type="tel" placeholder="Phone Number" value={signupData.phone || ''} onChange={e => setSignupData({...signupData, phone: e.target.value})} className={inputBase} />
                        <input type="text" placeholder="National ID" value={signupData.nationalId || ''} onChange={e => setSignupData({...signupData, nationalId: e.target.value})} className={inputBase} />
                        <input type="text" placeholder="Farm Details" value={signupData.farmDetails || ''} onChange={e => setSignupData({...signupData, farmDetails: e.target.value})} className={inputBase} />
                        {renderSignupPassword()}
                      </>
                    )}
                    
                    {selectedPortal === "agro_dealer" && (
                      <>
                        <input type="text" placeholder="Business Name" value={signupData.businessName || ''} onChange={e => setSignupData({...signupData, businessName: e.target.value})} className={inputBase} />
                        <input type="text" placeholder="Dealer License Number" value={signupData.licenseNumber || ''} onChange={e => setSignupData({...signupData, licenseNumber: e.target.value})} className={inputBase} />
                        <input type="email" placeholder="Email Address" value={signupData.email || ''} onChange={e => setSignupData({...signupData, email: e.target.value})} className={inputBase} />
                        {renderSignupPassword()}
                      </>
                    )}

                    {selectedPortal === "distributor" && (
                      <>
                        <input type="text" placeholder="Company Name" value={signupData.companyName || ''} onChange={e => setSignupData({...signupData, companyName: e.target.value})} className={inputBase} />
                        <input type="text" placeholder="Distributor ID" value={signupData.distributorId || ''} onChange={e => setSignupData({...signupData, distributorId: e.target.value})} className={inputBase} />
                        <input type="email" placeholder="Email Address" value={signupData.email || ''} onChange={e => setSignupData({...signupData, email: e.target.value})} className={inputBase} />
                        {renderSignupPassword()}
                      </>
                    )}

                    {selectedPortal === "agricultural_officer" && (
                      <>
                        <input type="text" placeholder="Government ID" value={signupData.governmentId || ''} onChange={e => setSignupData({...signupData, governmentId: e.target.value})} className={inputBase} />
                        <input type="text" placeholder="Officer Number" value={signupData.officerNumber || ''} onChange={e => setSignupData({...signupData, officerNumber: e.target.value})} className={inputBase} />
                        <input type="email" placeholder="Email Address" value={signupData.email || ''} onChange={e => setSignupData({...signupData, email: e.target.value})} className={inputBase} />
                        {renderSignupPassword()}
                      </>
                    )}

                    {selectedPortal === "seedco_partner" && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" placeholder="First Name" value={signupData.firstName || ''} onChange={e => setSignupData({...signupData, firstName: e.target.value})} className={inputBase} />
                          <input type="text" placeholder="Last Name" value={signupData.lastName || ''} onChange={e => setSignupData({...signupData, lastName: e.target.value})} className={inputBase} />
                        </div>
                        <input type="text" placeholder="Partner Name or Organisation" value={signupData.businessName || ''} onChange={e => setSignupData({...signupData, businessName: e.target.value})} className={inputBase} />
                        <input type="text" placeholder="Position" value={signupData.position || ''} onChange={e => setSignupData({...signupData, position: e.target.value})} className={inputBase} />
                        <input type="email" placeholder="Email Address" value={signupData.email || ''} onChange={e => setSignupData({...signupData, email: e.target.value})} className={inputBase} />
                        {renderSignupPassword()}
                      </>
                    )}

                    {selectedPortal === "super_admin" && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" placeholder="First Name" value={signupData.firstName || ''} onChange={e => setSignupData({...signupData, firstName: e.target.value})} className={inputBase} />
                          <input type="text" placeholder="Last Name" value={signupData.lastName || ''} onChange={e => setSignupData({...signupData, lastName: e.target.value})} className={inputBase} />
                        </div>
                        <input type="email" placeholder="Email Address" value={signupData.email || ''} onChange={e => setSignupData({...signupData, email: e.target.value})} className={inputBase} />
                        {renderSignupPassword()}
                      </>
                    )}

                    <button 
                      disabled={isSubmitting}
                      className="w-full cursor-pointer bg-[#22C55E] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold text-lg py-4 rounded-2xl transition-all shadow-lg mt-4 flex justify-center items-center"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Create Account"}
                    </button>
                  </form>
                  
                  <p className="mt-8 text-center text-sm text-white/70">
                    {t[language].authAlreadyHaveAccount || t[language].haveAccount} <button onClick={() => navigateTo('login')} className="text-white hover:text-[#22C55E] font-semibold ml-1 cursor-pointer transition-colors">{t[language].authLoginInside || "Login inside"}</button>
                  </p>
                </div>
              )}

              {/* Forgot Password Form */}
              {view === "forgot_password" && (
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-2">{t[language].authResetPassword || t[language].resetPassword}</h2>
                  <p className="text-white/80 text-sm mb-6">{t[language].authResetPrompt || t[language].resetInstructions}</p>

                  <form className="space-y-4" onSubmit={handleResetPassword}>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                      <input 
                        type="text" 
                        placeholder={t[language].authPhoneOrEmail || "Email or Phone number"} 
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className={cn(inputBase, "pl-12")}
                      />
                    </div>
                    
                    <button 
                      disabled={isSubmitting}
                      className="w-full cursor-pointer bg-[#22C55E] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold text-lg py-4 rounded-2xl transition-all shadow-lg mt-4 flex justify-center items-center"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (t[language].authSendInstructions || "Send Instructions")}
                    </button>
                  </form>
                  
                  <p className="mt-8 text-center text-sm text-white/70">
                    {t[language].authRememberPassword || "Remember your password?"} <button onClick={() => navigateTo('login')} className="text-white hover:text-[#22C55E] font-semibold ml-1 cursor-pointer transition-colors">{t[language].authReturnToLogin || t[language].returnToLogin}</button>
                  </p>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* Footer text */}
      {view === "splash" && (
        <div className="relative z-10 w-full px-6 pb-8 text-center mt-auto">
           <p className="text-white/80 text-xs font-medium max-w-sm mx-auto">
             {t[language].authFooterText || "Empowering farmers with AI-driven insights for better decisions."}
           </p>
        </div>
      )}

    </div>
  );
}
