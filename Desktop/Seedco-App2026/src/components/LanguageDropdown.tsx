import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { LanguageKey } from '../lib/i18n';

const languageOptions = [
  { code: "EN", name: "English" },
  { code: "FR", name: "Français" },
  { code: "PT", name: "Português" },
  { code: "SW", name: "Kiswahili" },
  { code: "HA", name: "Hausa" },
  { code: "YO", name: "Yorùbá" },
  { code: "IG", name: "Igbo" },
  { code: "AM", name: "Amharic" },
  { code: "ZU", name: "isiZulu" },
  { code: "XH", name: "isiXhosa" },
  { code: "SN", name: "Shona" },
  { code: "ND", name: "Ndebele" },
  { code: "AR", name: "Arabic" }
];

export function LanguageDropdown({ 
  language, 
  setLanguage 
}: { 
  language: LanguageKey, 
  setLanguage: (lang: LanguageKey) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = languageOptions.find(l => l.code === language) || languageOptions[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors border border-white/20"
      >
        <Globe className="w-4 h-4 text-white" />
        <span className="text-xs font-bold text-white uppercase">{currentLang.code}</span>
        <ChevronDown className="w-3 h-3 text-white/70" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 max-h-64 overflow-y-auto" style={{ zIndex: 9999 }}>
          {languageOptions.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code as LanguageKey);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                language === lang.code 
                  ? "bg-[#0B7A4B]/10 text-[#0B7A4B] font-bold" 
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
