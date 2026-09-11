import React, { useState, useMemo } from 'react';
import { 
  Building, User, Briefcase, MapPin, 
  Upload, CheckCircle, ChevronRight, ChevronLeft, Loader2, FileText
} from 'lucide-react';
import { AuthRole } from './AuthScreens';
import { authService } from '../lib/auth-service';

const AFRICAN_COUNTRIES = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon", "Central African Republic",
  "Chad", "Comoros", "Congo, Democratic Republic of the", "Congo, Republic of the", "Côte d'Ivoire", "Djibouti", "Egypt",
  "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Kenya",
  "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia",
  "Niger", "Nigeria", "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone", "Somalia", "South Africa",
  "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe"
];

const MOCK_REGIONS: Record<string, string[]> = {
  "Zimbabwe": ["Harare", "Bulawayo", "Manicaland", "Mashonaland Central", "Mashonaland East", "Mashonaland West", "Masvingo", "Matabeleland North", "Matabeleland South", "Midlands"],
  "Zambia": ["Central", "Copperbelt", "Eastern", "Luapula", "Lusaka", "Muchinga", "Northern", "North-Western", "Southern", "Western"],
  "South Africa": ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"],
  "Kenya": ["Central", "Coast", "Eastern", "Nairobi", "North Eastern", "Nyanza", "Rift Valley", "Western"],
  "Nigeria": ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"]
};

interface FormState {
  country: string;
  province: string;
  district: string;
  city: string;
  [key: string]: any;
}

export function StakeholderRegistrationForm({ role, onComplete, onLogout }: { role: AuthRole, onComplete: () => void, onLogout: () => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormState>({
    country: '', province: '', district: '', city: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const getFormSteps = () => {
    switch(role) {
      case 'seedco_partner':
        return [
          { id: 1, title: 'Location', fields: ['country', 'province', 'district'] },
          { id: 2, title: 'Personal Info', fields: ['fullName', 'employeeId', 'department', 'position', 'branch', 'phone', 'email'] },
          { id: 3, title: 'Professional', fields: ['experience', 'responsibilityArea', 'regionsManaged'] },
          { id: 4, title: 'Documents', fields: ['employeeIdCard', 'profilePhoto'] }
        ];
      case 'agro_dealer':
        return [
          { id: 1, title: 'Location', fields: ['country', 'province', 'district', 'city'] },
          { id: 2, title: 'Business Info', fields: ['businessName', 'regNumber', 'licenseNumber', 'physicalAddress'] },
          { id: 3, title: 'Owner Details', fields: ['ownerName', 'phone', 'email', 'productsSold', 'yearsInOp'] },
          { id: 4, title: 'Documents', fields: ['businessLicense', 'storePhoto', 'regCert'] }
        ];
      case 'distributor':
        return [
          { id: 1, title: 'Location', fields: ['country', 'province', 'district'] },
          { id: 2, title: 'Company Info', fields: ['companyName', 'distributorId', 'regNumber'] },
          { id: 3, title: 'Contact & Ops', fields: ['contactName', 'position', 'phone', 'email', 'warehouseCap', 'fleetSize', 'regionsServed'] },
          { id: 4, title: 'Documents', fields: ['regCert', 'opLicense'] }
        ];
      case 'agricultural_officer':
        return [
          { id: 1, title: 'Location', fields: ['country', 'province', 'district'] },
          { id: 2, title: 'Personal Info', fields: ['fullName', 'officerNumber', 'department', 'position'] },
          { id: 3, title: 'Government', fields: ['ministry', 'workStation', 'coverageArea', 'govEmail', 'phone'] },
          { id: 4, title: 'Documents', fields: ['govCard', 'appointmentLetter', 'profilePhoto'] }
        ];
      default:
        return [];
    }
  };

  const steps = getFormSteps();
  const totalSteps = steps.length;
  const calculateProgress = () => {
    let filled = 0;
    let total = 0;
    steps.forEach(s => {
      s.fields.forEach(f => {
        total++;
        if (formData[f] && formData[f].toString().trim() !== '') filled++;
      });
    });
    if (total === 0) return 0;
    const percent = (filled / total) * 100;
    
    if (percent === 100) return 100;
    if (percent >= 75) return 75;
    if (percent >= 50) return 50;
    if (percent >= 25) return 25;
    return 0;
  };

  const progress = calculateProgress();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error("No user found");

      await authService.updateProfile(user.uid, {
        country: formData.country,
        province: formData.province,
        district: formData.district,
        status: "pending_approval",
        businessDetails: {
          ...user.businessDetails,
          ...formData,
          verified: false
        }
      });

      onComplete();
    } catch (err) {
      setError("Failed to submit profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  const renderLocationFields = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
        <select 
          value={formData.country} 
          onChange={(e) => updateForm('country', e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#0B7A4B] focus:border-[#0B7A4B] outline-none"
        >
          <option value="">Select Country</option>
          {AFRICAN_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Province/Region</label>
        <select 
          value={formData.province} 
          onChange={(e) => updateForm('province', e.target.value)}
          disabled={!formData.country}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#0B7A4B] focus:border-[#0B7A4B] outline-none disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">Select Province/Region</option>
          {(MOCK_REGIONS[formData.country] || ["Region 1", "Region 2", "Region 3"]).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
        <input 
          type="text" 
          value={formData.district || ''} 
          onChange={(e) => updateForm('district', e.target.value)}
          placeholder="Enter district name"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#0B7A4B] focus:border-[#0B7A4B] outline-none"
        />
      </div>
      {role === 'agro_dealer' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">City/Town</label>
          <input 
            type="text" 
            value={formData.city || ''} 
            onChange={(e) => updateForm('city', e.target.value)}
            placeholder="Enter city or town"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#0B7A4B] focus:border-[#0B7A4B] outline-none"
          />
        </div>
      )}
    </div>
  );

  const renderInputField = (key: string, label: string, type = "text", placeholder = "") => (
    <div key={key}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input 
        type={type} 
        value={formData[key] || ''} 
        onChange={(e) => updateForm(key, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#0B7A4B] focus:border-[#0B7A4B] outline-none"
      />
    </div>
  );

  const renderUploadField = (key: string, label: string) => {
    const isUploaded = !!formData[key];
    return (
      <div 
        key={key} 
        onClick={() => updateForm(key, 'uploaded')}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer group ${isUploaded ? 'border-[#0B7A4B] bg-[#0B7A4B]/5' : 'border-slate-300 hover:border-[#0B7A4B] bg-slate-50'}`}
      >
        {isUploaded ? (
          <CheckCircle className="w-8 h-8 text-[#0B7A4B] mx-auto mb-3" />
        ) : (
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3 group-hover:text-[#0B7A4B]" />
        )}
        <p className={`text-sm font-medium ${isUploaded ? 'text-[#0B7A4B]' : 'text-slate-900'}`}>{label}</p>
        <p className="text-xs text-slate-500 mt-1">
          {isUploaded ? 'Uploaded successfully' : 'Click to upload document'}
        </p>
      </div>
    );
  };

  const renderRoleSpecificFields = () => {
    const currentStepFields = steps[step - 1].fields;
    
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
        {currentStepFields.map(field => {
          if (['country', 'province', 'district', 'city'].includes(field)) return null; // Handled in renderLocationFields
          
          const uploadFields = ['employeeIdCard', 'profilePhoto', 'businessLicense', 'storePhoto', 'regCert', 'opLicense', 'govCard', 'appointmentLetter'];
          if (uploadFields.includes(field)) {
            const labels: Record<string, string> = {
              employeeIdCard: "Employee ID Card", profilePhoto: "Profile Photo", businessLicense: "Business License",
              storePhoto: "Store Photo", regCert: "Registration Certificate", opLicense: "Operating License",
              govCard: "Government ID", appointmentLetter: "Appointment Letter"
            };
            return renderUploadField(field, labels[field]);
          }

          const labels: Record<string, string> = {
            fullName: "Full Name", employeeId: "Employee ID", department: "Department", position: "Position", branch: "Branch/Office",
            phone: "Phone Number", email: "Email Address", experience: "Years of Experience", responsibilityArea: "Area of Responsibility",
            regionsManaged: "Regions Managed", businessName: "Business Name", regNumber: "Registration Number", licenseNumber: "License Number",
            physicalAddress: "Physical Address", ownerName: "Owner Full Name", productsSold: "Products Sold", yearsInOp: "Years in Operation",
            companyName: "Company Name", distributorId: "Distributor ID", contactName: "Contact Person", warehouseCap: "Warehouse Capacity",
            fleetSize: "Fleet Size", regionsServed: "Regions Served", officerNumber: "Officer Number", ministry: "Ministry", workStation: "Work Station",
            coverageArea: "Coverage Area", govEmail: "Government Email"
          };
          
          return renderInputField(field, labels[field] || field, field.toLowerCase().includes('email') ? 'email' : 'text');
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-[#0B7A4B]/20">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar */}
        <div className="w-full md:w-1/3 bg-slate-900 p-8 text-white">
          <div className="flex items-center space-x-2 mb-10">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#4ade80]" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Profile Setup</span>
          </div>
          
          <h2 className="text-xl font-bold mb-2">Stakeholder Registration</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Please complete your mandatory profile to access the {role.replace('_', ' ')} dashboard.
          </p>

          <div className="space-y-6">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-start">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 z-10 shrink-0 ${step > s.id ? 'bg-[#4ade80] text-slate-900' : step === s.id ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                  {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
                </div>
                <div>
                  <h4 className={`text-sm font-semibold ${step >= s.id ? 'text-white' : 'text-slate-500'}`}>{s.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{s.fields.length} fields</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12">
             <div className="flex justify-between items-end mb-2">
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completion</span>
               <span className="text-lg font-bold text-white">{progress}%</span>
             </div>
             <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#4ade80] transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
             </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="w-full md:w-2/3 p-8 flex flex-col h-[600px] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{steps[step-1].title}</h3>
            <button onClick={onLogout} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Sign Out</button>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center">
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div className="flex-1">
            {step === 1 ? renderLocationFields() : renderRoleSpecificFields()}
          </div>

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
            <button 
              onClick={() => setStep(prev => Math.max(1, prev - 1))}
              disabled={step === 1}
              className="flex items-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </button>
            
            {step < totalSteps ? (
              <button 
                onClick={() => setStep(prev => Math.min(totalSteps, prev + 1))}
                className="flex items-center px-6 py-2.5 bg-[#0B7A4B] text-white rounded-lg text-sm font-medium hover:bg-[#09663E] transition-all shadow-sm shadow-[#0B7A4B]/20"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || progress !== 100}
                className="flex items-center px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Submit Profile</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
