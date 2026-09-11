import { cn } from "../lib/utils";
import type { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
  className?: string;
  theme?: "dark" | "light";
}

export function PhoneFrame({ children, className, theme = "light" }: PhoneFrameProps) {
  return (
    <div className={cn(
      "relative mx-auto rounded-[3rem] border-[8px] sm:border-[14px] shadow-2xl overflow-hidden w-[320px] h-[640px] sm:w-[375px] sm:h-[812px] flex-shrink-0 group",
      theme === "dark" ? "border-gray-900 bg-gray-950" : "border-gray-50 bg-white",
      className
    )}>
      {/* Notch */}
      <div className="absolute top-0 inset-x-0 w-[120px] sm:w-[150px] h-[25px] sm:h-[30px] bg-black rounded-b-[1.5rem] left-1/2 -translate-x-1/2 z-50 flex items-center justify-center">
        <div className="w-12 h-1 bg-gray-800 rounded-full"></div>
        <div className="w-2 h-2 ml-2 bg-blue-900/40 rounded-full border border-blue-900/30"></div>
      </div>
      
      {/* Content */}
      <div className="w-full h-full overflow-hidden relative font-sans">
        {children}
      </div>
    </div>
  );
}

export function BrowserFrame({ children, className }: PhoneFrameProps) {
  return (
    <div className={cn(
      "relative mx-auto rounded-xl border border-gray-200/50 shadow-2xl overflow-hidden w-full lg:w-[1024px] h-[768px] bg-white flex-shrink-0 flex flex-col",
      className
    )}>
      {/* Browser Header */}
      <div className="h-12 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200/50 flex items-center px-4 space-x-4 shrink-0 z-50 relative">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
        </div>
        <div className="flex-1 mx-4 max-w-xl bg-white border border-gray-200 rounded-md h-7 flex items-center px-3 justify-center text-xs text-gray-500 shadow-sm font-medium">
          <span className="opacity-50">🔒</span>
          <span className="ml-2">app.neurocrop.ai</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="w-full flex-1 overflow-hidden relative font-sans bg-gray-50/50">
        {children}
      </div>
    </div>
  );
}
