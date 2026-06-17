import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Briefcase, 
  Phone, 
  Calendar, 
  Upload, 
  Download, 
  Printer, 
  RotateCw, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  FileCheck,
  Search,
  BookOpen
} from 'lucide-react';
import { RLLogo } from './RLLogo';
import { jsPDF } from 'jspdf';

// High-fidelity replica logo matching the user's uploaded Safety First logo image
export const SafetyFirstLogo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Solid green base circle */}
    <circle cx="50" cy="50" r="46" fill="#15803D" stroke="#15803D" strokeWidth="1" />
    {/* Inner white circle */}
    <circle cx="50" cy="50" r="28" fill="#FFFFFF" />
    {/* Thick Green Cross */}
    <rect x="44" y="28" width="12" height="44" fill="#15803D" />
    <rect x="28" y="44" width="44" height="12" fill="#15803D" />
    
    {/* Lateral dots */}
    <circle cx="12" cy="50" r="3" fill="#FFFFFF" />
    <circle cx="88" cy="50" r="3" fill="#FFFFFF" />
    
    {/* Wrapped Curved Texts along natural text paths */}
    <defs>
      <path id="curve-text-top" d="M 18,50 A 32,32 0 1,1 82,50" fill="none" />
      <path id="curve-text-bottom" d="M 82,50 A 32,32 0 1,1 18,50" fill="none" />
    </defs>
    
    <text fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.8">
      <textPath href="#curve-text-top" startOffset="50%" textAnchor="middle">
        SAFETY FIRST
      </textPath>
    </text>
    <text fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.8">
      <textPath href="#curve-text-bottom" startOffset="50%" textAnchor="middle">
        SAFETY FIRST
      </textPath>
    </text>
  </svg>
);

interface EmployeeID {
  id: string;
  name: string;
  position: string;
  contactNumber: string;
  dateHired: string;
  employeeCode: string;
  photoUrl: string; // Base64 or Preset
  emergencyName: string;
  emergencyPhone: string;
  bloodType: string;
  terms: string[];
  bgStyle: 'blueprint' | 'crane' | 'residential' | 'none';
}

const PRESET_PHOTOS = [
  { name: 'Architect Female', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300' },
  { name: 'Engineer Male', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300' },
  { name: 'Supervisor Female', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300' },
  { name: 'Worker with Helmet', url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=300' },
  { name: 'Manager Male', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300' }
];

const PRESET_CONSTRUCTION_BGS = {
  blueprint: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600&auto=compress', // Skyscraper steel structure
  crane: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600',          // Active crane skyline
  residential: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600',    // Clean luxury residence render
  none: ''
};

export const CompanyIDGenerator: React.FC = () => {
  // Main form states
  const [name, setName] = useState('SHEENA MAE SERRANO');
  const [position, setPosition] = useState('Senior Project Architect');
  const [contactNumber, setContactNumber] = useState('+63 917 849 2038');
  const [dateHired, setDateHired] = useState('2024-06-15');
  const [employeeCode, setEmployeeCode] = useState('RL-2024-0089');
  const [photoUrl, setPhotoUrl] = useState(PRESET_PHOTOS[0].url);
  const [emergencyName, setEmergencyName] = useState('Engr. Arnel Serrano');
  const [emergencyPhone, setEmergencyPhone] = useState('+63 918 273 1192');
  const [bloodType, setBloodType] = useState('O+');
  const [bgStyle, setBgStyle] = useState<'blueprint' | 'crane' | 'residential' | 'none'>('residential');

  // Custom terms state
  const [terms, setTerms] = useState<string[]>([
    'This ID card is the property of RL CON. If found, please return to office.',
    'Must be worn visibly at all times within active construction site premises.',
    'Strict adherence to OSHA & RL Safety first policies is mandatory.',
    'ID card is non-transferable. Loss must be reported within 24 hours.',
    'In case of emergency please scan the QR code or notify site supervisor.'
  ]);
  const [newTerm, setNewTerm] = useState('');

  // ID cards listing / local saved state
  const [savedIds, setSavedIds] = useState<EmployeeID[]>(() => {
    const saved = localStorage.getItem('rl_saved_employee_ids');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync saved list to local storage
  useEffect(() => {
    localStorage.setItem('rl_saved_employee_ids', JSON.stringify(savedIds));
  }, [savedIds]);

  // Handle Photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick save to list
  const handleSaveToDatabase = () => {
    const newId: EmployeeID = {
      id: `emp-${Date.now()}`,
      name: name.toUpperCase(),
      position,
      contactNumber,
      dateHired,
      employeeCode: employeeCode || `RL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      photoUrl,
      emergencyName,
      emergencyPhone,
      bloodType,
      terms,
      bgStyle
    };

    // Check if employee code already exists to update or insert
    const existsIndex = savedIds.findIndex(item => item.employeeCode === newId.employeeCode);
    if (existsIndex >= 0) {
      const updated = [...savedIds];
      updated[existsIndex] = newId;
      setSavedIds(updated);
      showNotification('Employee ID updated in local records database.');
    } else {
      setSavedIds([newId, ...savedIds]);
      showNotification('New Employee ID card saved to digital archives.');
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Load a saved Employee ID
  const handleLoadEmployee = (emp: EmployeeID) => {
    setName(emp.name);
    setPosition(emp.position);
    setContactNumber(emp.contactNumber);
    setDateHired(emp.dateHired);
    setEmployeeCode(emp.employeeCode);
    setPhotoUrl(emp.photoUrl);
    setEmergencyName(emp.emergencyName);
    setEmergencyPhone(emp.emergencyPhone);
    setBloodType(emp.bloodType);
    setTerms(emp.terms);
    setBgStyle(emp.bgStyle);
    showNotification(`Loaded digital credentials of ${emp.name}`);
  };

  // Delete a saved Employee ID
  const handleDeleteEmployee = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this ID record from digital roster?')) {
      setSavedIds(savedIds.filter(emp => emp.id !== id));
      showNotification('Employee ID record removed successfully.');
    }
  };

  const addTerm = () => {
    if (newTerm.trim()) {
      setTerms([...terms, newTerm.trim()]);
      setNewTerm('');
    }
  };

  const removeTerm = (index: number) => {
    setTerms(terms.filter((_, i) => i !== index));
  };

  // Generate compiled QR payload url
  const qrDataStr = encodeURIComponent(
    `RL CON EMPLOYEE PROFILE\nCode: ${employeeCode}\nName: ${name}\nPosition: ${position}\nHired: ${dateHired}\nEmergency: ${emergencyName} (${emergencyPhone})`
  );
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrDataStr}&color=f59e0b&bgcolor=151719`;

  // Filter saved records
  const filteredRecords = savedIds.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Trigger print view formatted specifically for portrait sheet with Front + Back
  const handlePrintID = () => {
    window.print();
  };

  // Export beautiful double-sided printable PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait A4
    const pageW = doc.internal.pageSize.getWidth();
    
    // Coordinates
    const cardW = 54;  // Standard CR80 Dimensions (Credit card size in mm)
    const cardH = 86;
    
    const marginX = (pageW - cardW * 2) / 3; // side by side on one page
    const topY = 40;

    const fillCardStyle = (x: number, y: number) => {
      // Draw outer dark brushed metallic background
      doc.setFillColor(18, 20, 22); // slate-950 depth color
      doc.rect(x, y, cardW, cardH, 'F');
      
      // Draw a gold metallic accent border inside
      doc.setDrawColor(229, 192, 96);
      doc.setLineWidth(0.6);
      doc.rect(x + 1.5, y + 1.5, cardW - 3, cardH - 3, 'S');
      
      // Top punch hole simulation
      doc.setFillColor(15, 23, 42);
      doc.ellipse(x + cardW / 2, y + 4.5, 3.5, 1.2, 'F');
      doc.setDrawColor(229, 192, 96);
      doc.ellipse(x + cardW / 2, y + 4.5, 3.5, 1.2, 'S');
    };

    // --- FRONT SIDE RENDER---
    const fx = marginX;
    const fy = topY;
    fillCardStyle(fx, fy);

    // Front: Logo Stamp
    doc.setFontSize(5);
    doc.setTextColor(229, 192, 96);
    doc.setFont('Helvetica', 'bold');
    doc.text('RL CON', fx + cardW / 2 - 8, fy + 12);
    doc.setFontSize(3.5);
    doc.setTextColor(148, 163, 184);
    doc.text('BUILD • DESIGN • LANDSCAPE', fx + cardW / 2, fy + 15, { align: 'center' });

    // Profile photo placeholder / render circle
    const avatarX = fx + cardW / 2 - 12;
    const avatarY = fy + 19;
    doc.setDrawColor(229, 192, 96);
    doc.setLineWidth(0.5);
    doc.setFillColor(30, 41, 59);
    doc.rect(avatarX, avatarY, 24, 24, 'FD'); // profile framework

    // Name text
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    // split name to two lines if too long
    const cleanName = name.toUpperCase();
    const nameLines = doc.splitTextToSize(cleanName, cardW - 8);
    let nameOffset = 0;
    nameLines.forEach((line: string, i: number) => {
      doc.text(line, fx + cardW / 2, fy + 48 + (i * 3.5), { align: 'center' });
      nameOffset = i * 3.5;
    });

    // Position / Badge
    doc.setFillColor(229, 192, 96);
    doc.rect(fx + 6, fy + 52 + nameOffset, cardW - 12, 4.5, 'F');
    doc.setFontSize(4.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.text(position.toUpperCase(), fx + cardW / 2, fy + 55 + nameOffset, { align: 'center' });

    // Details Fields
    doc.setFontSize(4);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFont('Helvetica', 'normal');
    doc.text('EMPLOYEE ID NO:', fx + 5, fy + 61 + nameOffset);
    doc.text('CONTACT NO:', fx + 5, fy + 65 + nameOffset);
    doc.text('DATE HIRED:', fx + 5, fy + 69 + nameOffset);

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.text(employeeCode, fx + 26, fy + 61 + nameOffset);
    doc.text(contactNumber, fx + 26, fy + 65 + nameOffset);
    doc.text(dateHired, fx + 26, fy + 69 + nameOffset);

    // Safety Badge on bottom - high-fidelity matching the green circular logo
    doc.setFillColor(21, 128, 61); // Green (#15803D)
    doc.ellipse(fx + cardW - 8, fy + 77, 4.5, 4.5, 'F');
    doc.setFillColor(255, 255, 255);
    doc.ellipse(fx + cardW - 8, fy + 77, 2.8, 2.8, 'F');
    doc.setDrawColor(21, 128, 61);
    doc.setLineWidth(0.8);
    doc.line(fx + cardW - 9.2, fy + 77, fx + cardW - 6.8, fy + 77);
    doc.line(fx + cardW - 8, fy + 75.8, fx + cardW - 8, fy + 78.2);
    doc.setFontSize(2.2);
    doc.setTextColor(21, 128, 61);
    doc.setFont('Helvetica', 'bold');
    doc.text('SAFETY FIRST', fx + cardW - 8, fy + 83.2, { align: 'center' });


    // --- BACK SIDE RENDER ---
    const bx = marginX + cardW + marginX;
    const by = topY;
    fillCardStyle(bx, by);

    // Back: Title
    doc.setFontSize(5);
    doc.setTextColor(229, 192, 96);
    doc.setFont('Helvetica', 'bold');
    doc.text('TERMS AND CONDITIONS', bx + cardW / 2, by + 12, { align: 'center' });

    // Render terms lines
    doc.setFontSize(2.8);
    doc.setTextColor(203, 213, 225);
    doc.setFont('Helvetica', 'normal');
    let termY = by + 17;
    terms.slice(0, 5).forEach((term, idx) => {
      const bullet = `${idx + 1}. `;
      const textLines = doc.splitTextToSize(term, cardW - 10);
      doc.setTextColor(229, 192, 96);
      doc.text(bullet, bx + 5, termY);
      doc.setTextColor(203, 213, 225);
      textLines.forEach((tl: string, tIdx: number) => {
        doc.text(tl, bx + 7, termY + (tIdx * 2.5));
      });
      termY += (textLines.length * 2.5) + 0.8;
    });

    // Draw Emergency block & QR divider
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.2);
    doc.line(bx + 4, termY + 1, bx + cardW - 4, termY + 1);

    // Emergency text
    doc.setFontSize(3.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('Helvetica', 'normal');
    doc.text('Emergency Contact:', bx + 5, termY + 4);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${emergencyName} (${emergencyPhone})`, bx + 5, termY + 6.5);

    // Bottom brand safety standard and QR code representation
    doc.setDrawColor(229, 192, 96);
    doc.rect(bx + cardW - 17, by + cardYCoord(termY + 1.5), 12, 12, 'S');
    doc.setFontSize(2.5);
    doc.setTextColor(148, 163, 184);
    doc.text('SECURE QR ID', bx + cardW - 11, by + cardYCoord(termY + 14.5), { align: 'center' });

    doc.save(`Rl_Con_ID_${name.replace(/\s+/g, '_')}.pdf`);
  };

  const cardYCoord = (add: number) => {
    return Math.min(80, add) - 20;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0 print:m-0" id="rl-id-generator-tab-section">
      {/* Visual Header */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-neutral-800 shadow-2xl mb-8 relative overflow-hidden print:hidden">
        <div className="absolute inset-0 bg-radial-at-t from-yellow-500/5 via-slate-950/0 to-slate-950/0 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 text-[9px] font-black tracking-widest text-yellow-500 bg-yellow-950/40 border border-yellow-800/40 rounded-full uppercase leading-none">
                RL CON ARCHIVES
              </span>
              <span className="px-3 py-1 text-[9px] font-black tracking-widest text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded-full uppercase leading-none">
                GEN 2 ID PROTOCOL
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
              Automated Company <span className="text-yellow-500">ID Generator Suite</span>
            </h1>
            <p className="text-xs text-slate-400 mt-2 max-w-2xl font-medium">
              Create and preview custom, double-sided ID cards. Fully optimized with construction background watermark templates, embedded QR authorization, terms and conditions statement, and standard Safety-First emblem.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintID}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700/80 text-white rounded-xl text-xs font-black transition-all cursor-pointer border border-neutral-700"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              Print Hardware ID
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-yellow-500/10"
            >
              <Download className="w-4 h-4 text-slate-950 font-black" />
              Download Double PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block print:p-0 print:m-0">
        
        {/* Left Form Inputs: 5 Columns */}
        <div className="lg:col-span-5 space-y-6 print:hidden">
          
          {/* Quick Roster Archive / Database List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-yellow-600" />
                <h3 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider">
                  Employee Cards Archive
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-600 rounded-full font-mono">
                {savedIds.length} Total
              </span>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search archived credentials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:border-yellow-500 focus:outline-hidden font-medium"
              />
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => handleLoadEmployee(emp)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-slate-100 h-[50px] cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={emp.photoUrl}
                        alt=""
                        className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate leading-tight">
                          {emp.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-semibold truncate">
                          {emp.position} • <span className="font-mono text-[9px] text-yellow-600 font-medium">{emp.employeeCode}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteEmployee(emp.id, e)}
                      className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                      title="Delete ID record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                    {searchQuery ? 'No matched records' : 'No saved personnel IDs yet'}
                  </p>
                  <p className="text-[9px] text-slate-350 mt-1">
                    Fill the form below and click "Save Roster Data"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Core Input Fields Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-yellow-600" />
                <h3 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider">
                  Personal Details
                </h3>
              </div>
              <button
                onClick={handleSaveToDatabase}
                className="px-3 py-1 bg-slate-900 border border-slate-950 font-bold text-[10px] text-yellow-500 rounded-lg hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1"
              >
                <FileCheck className="w-3 h-3" />
                Save Roster Data
              </button>
            </div>

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-bold leading-tight flex items-center gap-1.5 animate-bounce">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                {successMsg}
              </div>
            )}

            {/* Input Inputs */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Employee Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl focus:border-yellow-500 focus:outline-hidden font-bold text-slate-850"
                      value={name}
                      onChange={(e) => setName(e.target.value.toUpperCase())}
                      placeholder="SHEENA MAE SERRANO"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Position/Role *</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl focus:border-yellow-500 focus:outline-hidden font-semibold text-slate-800"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="Senior Project Architect"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Contact Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl focus:border-yellow-500 focus:outline-hidden font-mono"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="+63 917 123 4567"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Date Hired</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl focus:border-yellow-500 focus:outline-hidden font-medium"
                      value={dateHired}
                      onChange={(e) => setDateHired(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Employee Code/ID No.</label>
                  <input
                    type="text"
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-xl focus:border-yellow-500 focus:outline-hidden font-mono text-slate-800 font-bold bg-slate-50/50"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="RL-2024-0089"
                  />
                </div>
              </div>

              {/* Photo Input options */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Employee Badge Photo</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg text-slate-700 font-bold text-[10px] transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Photo...
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {PRESET_PHOTOS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPhotoUrl(preset.url)}
                      className={`px-2 py-1.5 border text-[9px] font-bold rounded-lg transition-all cursor-pointer ${
                        photoUrl === preset.url
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-800 shadow-xs'
                          : 'border-slate-150 hover:bg-slate-50 text-slate-600 bg-white'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Theme Style */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Construction Background Watermark</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setBgStyle('blueprint')}
                    className={`py-1.5 px-2 border rounded-xl text-center text-[10px] font-extrabold tracking-wide uppercase transition-all ${
                      bgStyle === 'blueprint'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-800 font-black'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    🏙️ Blueprint
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgStyle('crane')}
                    className={`py-1.5 px-2 border rounded-xl text-center text-[10px] font-extrabold tracking-wide uppercase transition-all ${
                      bgStyle === 'crane'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-800 font-black'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    🏗️ Sky Crane
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgStyle('residential')}
                    className={`py-1.5 px-2 border rounded-xl text-center text-[10px] font-extrabold tracking-wide uppercase transition-all ${
                      bgStyle === 'residential'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-800 font-black'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    🏡 Residence
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgStyle('none')}
                    className={`py-1.5 px-2 border rounded-xl text-center text-[10px] font-extrabold tracking-wide uppercase transition-all ${
                      bgStyle === 'none'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-800 font-black'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    🚫 None
                  </button>
                </div>
              </div>

              {/* Emergency info */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Emergency Coordinates (Back Of ID)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-500">Contact Person</label>
                    <input
                      type="text"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-medium"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-500">Emergency Phone</label>
                    <input
                      type="text"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-slate-700 font-semibold"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Terms and conditions */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Terms & Conditions (Back of ID)</label>
                  <span className="text-[9px] text-slate-400 font-mono font-medium">{terms.length}/5 standard</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-100 p-2 rounded-lg bg-slate-50/50">
                  {terms.map((term, index) => (
                    <div key={index} className="flex items-start justify-between gap-1 text-[10px] text-slate-600 font-medium py-1 border-b border-slate-100 last:border-0">
                      <span className="flex-1">
                        <span className="font-extrabold text-yellow-600 mr-1">{index+1}.</span>
                        {term}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTerm(index)}
                        className="text-rose-500 hover:text-rose-700 p-0.5 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Add custom clause/rule..."
                    className="flex-1 text-[10px] px-2 py-1 border border-slate-200 rounded-lg font-medium"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTerm())}
                  />
                  <button
                    type="button"
                    onClick={addTerm}
                    className="px-2.5 bg-slate-100 border border-slate-250 hover:bg-slate-200 text-slate-700 rounded-lg text-xs flex items-center justify-center cursor-pointer font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Preview Side: 7 Columns */}
        <div className="lg:col-span-7 flex flex-col items-center justify-start gap-8 print:p-0 print:m-0">
          
          <div className="w-full text-center py-2 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center gap-1.5 text-xs text-slate-600 font-extrabold uppercase tracking-wide print:hidden shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Real-time CR80 dual-sided hardware preview
          </div>

          {/* Side-by-Side Flex Box */}
          <div className="flex flex-col md:flex-row flex-wrap items-center justify-center gap-8 w-full print:flex-row print:justify-start print:items-start print:gap-10 print:m-0 print:p-0">
            
            {/* FRONT SIDE CARD CONTAINER */}
            <div className="space-y-2 text-center print:m-0">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest print:hidden">
                📟 Front Side View
              </span>
              
              {/* Actual physical dimensions ID representation */}
              {/* standard ratio: 54mm x 86mm, approximately 320px x 510px */}
              <div 
                id="rl-construction-id-front"
                className="w-[315px] h-[500px] rounded-3xl bg-[#121416] p-4 text-white flex flex-col justify-between relative shadow-2xl overflow-hidden border-2 border-amber-500/20 ring-1 ring-black/40 print:shadow-none print:border-amber-500/30 print:m-0"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(0,0,0,0.4)',
                }}
              >
                {/* Transparent Construction Background Layer */}
                {bgStyle !== 'none' && PRESET_CONSTRUCTION_BGS[bgStyle] && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-25 mix-blend-luminosity"
                    style={{ 
                      backgroundImage: `url(${PRESET_CONSTRUCTION_BGS[bgStyle]})`,
                      filter: 'contrast(110%) brightness(120%)' 
                    }}
                  />
                )}
                {/* Metallic diagonal subtle lines gradient */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, #FFF 0, #FFF 1px, transparent 0, transparent 50%)',
                    backgroundSize: '12px 12px'
                  }}
                />

                {/* Micro-printed Gold Accent Frame inside */}
                <div className="absolute inset-2 border border-yellow-500/30 rounded-2xl pointer-events-none" />

                {/* Golden punch hole card slot */}
                <div className="z-10 flex justify-center mt-1">
                  <div className="w-12 h-2.5 rounded-full bg-slate-950 border border-yellow-500/30 shadow-inner" />
                </div>

                {/* Brand Logo Header */}
                <div className="z-10 flex flex-col items-center mt-3 scale-95 origin-top">
                  <RLLogo className="h-10 w-auto" />
                  <div className="text-[7.5px] font-bold text-slate-400/90 tracking-wider uppercase font-sans mt-0.5">
                    RL CON COMPANY ID
                  </div>
                </div>

                {/* Profile Picture Bezel with yellow neon glow constraint */}
                <div className="z-10 flex justify-center my-1 relative">
                  <div className="relative">
                    {/* Glowing gold bezel ring */}
                    <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-200 to-amber-500 opacity-60 blur-xs" />
                    {/* Core Frame image container */}
                    <div className="relative w-32 h-32 rounded-xl bg-slate-900 border-2 border-[#E5C060] overflow-hidden shadow-xl">
                      {photoUrl ? (
                        <img 
                          src={photoUrl} 
                          alt="Employee Badge" 
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                          <User className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle Info Plate */}
                <div className="z-10 text-center px-2 mt-1">
                  {/* Glowing Name strip */}
                  <h2 className="text-[17px] font-black text-white tracking-tight leading-tight uppercase font-sans drop-shadow-md">
                    {name || 'SHEENA MAE SERRANO'}
                  </h2>
                  
                  {/* Position gold accent badge */}
                  <div className="inline-block mt-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-[9.5px] tracking-widest px-4 py-1 rounded-md uppercase font-sans shadow-sm">
                    {position || 'Senior Project Architect'}
                  </div>
                </div>

                {/* Bottom Information details fields */}
                <div className="z-10 bg-slate-950/80 backdrop-blur-xs p-3 rounded-xl border border-slate-800/60 mx-1 mb-2">
                  <div className="grid grid-cols-12 gap-1 text-[9.5px] font-sans leading-relaxed">
                    <span className="col-span-5 text-slate-400/95 font-bold uppercase tracking-wider text-left">Emp ID No:</span>
                    <span className="col-span-7 font-mono font-bold text-yellow-400 text-left">{employeeCode || 'RL-2024-0089'}</span>
                    
                    <span className="col-span-5 text-slate-400/95 font-bold uppercase tracking-wider text-left">Contact No:</span>
                    <span className="col-span-7 font-semibold text-slate-200 text-left">{contactNumber || '+63 917 123 4567'}</span>
                    
                    <span className="col-span-5 text-slate-400/95 font-bold uppercase tracking-wider text-left">Date Hired:</span>
                    <span className="col-span-7 font-semibold text-slate-200 text-left">{dateHired || 'June 15, 2024'}</span>
                  </div>
                </div>

                {/* Footer and Safety Badge overlay */}
                <div className="z-10 flex items-center justify-between px-3 pb-3">
                  <div className="flex flex-col items-start leading-none text-left">
                    <span className="text-[7px] text-slate-500 uppercase font-black tracking-wider">Laminated and issued by</span>
                    <span className="text-[8.5px] text-slate-300 font-extrabold uppercase mt-0.5 tracking-tight font-mono">RL CON</span>
                  </div>
                  
                  {/* Standard Construction safety badge */}
                  <div className="flex items-center gap-1.5 bg-emerald-950/80 pl-1.5 pr-2.5 py-1 rounded-full border border-emerald-800/40">
                    <SafetyFirstLogo className="w-4 h-4" />
                    <span className="text-[8px] font-black text-emerald-400 tracking-wider">SAFETY FIRST</span>
                  </div>
                </div>

              </div>
            </div>

            {/* BACK SIDE CARD CONTAINER */}
            <div className="space-y-2 text-center print:m-0">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest print:hidden">
                📟 Back Side View
              </span>

              <div 
                id="rl-construction-id-back"
                className="w-[315px] h-[500px] rounded-3xl bg-[#121416] p-4 text-white flex flex-col justify-between relative shadow-2xl overflow-hidden border-2 border-amber-500/20 ring-1 ring-black/40 print:shadow-none print:border-amber-500/30 print:m-0"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(0,0,0,0.4)',
                }}
              >
                {/* Micro-printed Gold Accent Frame inside */}
                <div className="absolute inset-2 border border-yellow-500/30 rounded-2xl pointer-events-none" />

                {/* Golden punch hole card slot */}
                <div className="z-15 flex justify-center mt-1">
                  <div className="w-12 h-2.5 rounded-full bg-slate-950 border border-yellow-500/30 shadow-inner" />
                </div>

                {/* Dynamic back layout */}
                <div className="z-10 mt-3 px-1 text-center flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest border-b border-slate-800 pb-1.5 mt-1 font-mono">
                      Terms & Conditions
                    </h3>
                    
                    {/* Conditions lists */}
                    <ul className="text-left text-[8.5px] leading-relaxed text-slate-300 space-y-2 mt-3 px-2 font-medium">
                      {terms.slice(0, 5).map((term, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-yellow-500 font-extrabold font-mono">{idx + 1}.</span>
                          <span className="flex-1 text-[8.5px]">{term}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Secure QR authorization details and details */}
                  <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl mx-1 mb-2">
                    <div className="flex items-center gap-3">
                      
                      {/* Generated live QR component block */}
                      <div className="relative p-1.5 bg-slate-900 border border-amber-500/30 rounded-lg flex-shrink-0">
                        <img 
                          src={qrCodeUrl} 
                          alt="ID Security QR" 
                          className="w-16 h-16 object-contain rounded"
                        />
                      </div>

                      <div className="text-left text-[9px] font-sans leading-tight space-y-1">
                        <div>
                          <p className="text-[7.5px] text-slate-500 font-bold uppercase">If Found, please return to:</p>
                          <p className="text-slate-200 font-extrabold">RL CON Administrative Office</p>
                        </div>
                        <div>
                          <p className="text-[7.5px] text-slate-500 font-bold uppercase">EMERGENCY NOTIFICATION CONTACT:</p>
                          <p className="text-yellow-500 font-black">{emergencyName || 'Engr. Arnel Serrano'}</p>
                          <p className="text-slate-300 font-mono font-bold">{emergencyPhone || '+63 918 273 1192'}</p>
                        </div>
                        <div className="pt-0.5">
                          <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[7.5px] font-black text-slate-400 rounded uppercase font-mono tracking-wider">
                            SECURE ARCHIVE ENCRYPTED
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Footer and Safety first custom emblem */}
                <div className="z-10 flex items-center justify-between px-3 pb-3 border-t border-slate-800/40 pt-2 bg-slate-950/40 rounded-b-2xl">
                  
                  {/* Safety first center seal logo badge */}
                  <div className="flex items-center gap-2">
                    <SafetyFirstLogo className="w-8 h-8" />
                    <div className="text-left leading-none">
                      <p className="text-[9px] text-emerald-400 font-extrabold tracking-wider uppercase font-mono">Safety First</p>
                      <p className="text-[7.5px] text-slate-400 tracking-tight font-medium">Site Safety Standards</p>
                    </div>
                  </div>

                  <div className="text-right leading-none flex flex-col items-end">
                    <span className="text-[8px] text-amber-500/80 font-mono font-bold tracking-tight">RL SYSTEM SECURE</span>
                  </div>

                </div>

              </div>
            </div>

          </div>

          {/* Guidelines info callout */}
          <div className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-slate-600 font-medium print:hidden">
            <ShieldCheck className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-slate-800">Double-Sided PVC Printable Format</p>
              <p className="text-[11px] text-slate-505 mt-1 leading-relaxed">
                Both layout blocks conform to the ISO/IEC 7810 standard ID-1 format (85.60 mm × 53.98 mm). Scale to 100% when printing to ensure proper plastic casing fit on standard lanyards.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
