import { PhoneFrame } from "./DeviceFrame";
import farmerBg from "../assets/images/nc_farmer_bg_1781830600804.jpg";
import { Leaf, ArrowRight } from "lucide-react";

export function LoginScreen() {
  return (
    <PhoneFrame theme="dark">
      <div className="absolute inset-0 z-0">
        <img
          src={farmerBg}
          alt="African farmer in maize field"
          className="w-full h-full object-cover object-top"
        />
        {/* Modern dark green gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#022A1E] via-[#022A1E]/80 to-transparent mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#022A1E] via-[#022A1E]/90 to-black/20" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col justify-end p-8 pb-12 font-sans">
        <div className="mb-auto mt-16 flex items-center justify-center space-x-2">
          <div className="bg-emerald-500/20 p-2.5 rounded-2xl border border-emerald-400/30 backdrop-blur-xl">
            <Leaf className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-white font-display font-bold text-2xl tracking-tight leading-none">NeuroSeedco</h1>
            <p className="text-emerald-400/80 text-[10px] font-semibold tracking-widest uppercase mt-0.5">AI Intelligence</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-white font-display text-4xl font-semibold leading-tight">
              Autonomous<br />
              <span className="text-emerald-400">Agricultural</span><br />
              Network
            </h2>
            <p className="text-emerald-50/70 text-sm font-medium leading-relaxed max-w-[240px]">
              Empowering farmers with AI-driven insights for a sustainable future.
            </p>
          </div>

          <div className="pt-6 space-y-4">
            <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#022A1E] font-semibold py-4 rounded-2xl transition-all flex items-center justify-center space-x-2 group shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
              <span>Create Account</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold py-4 rounded-2xl backdrop-blur-md transition-all">
              Login to Account
            </button>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
