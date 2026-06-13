/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building, 
  MapPin, 
  Calendar, 
  Upload, 
  Users, 
  Award, 
  Network, 
  FolderGit2, 
  Plus, 
  DollarSign, 
  Briefcase, 
  ShieldAlert,
  Home
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { Worker, ConstructionSite } from '../types';

interface CompletedProject {
  id: string;
  name: string;
  location: string;
  value: number;
  dateFinished: string;
  photoUrl: string; // Base64 or standard asset url
}

interface CompanyProfileProps {
  workers: Worker[];
  sites: ConstructionSite[];
}

export default function CompanyProfile({ workers, sites }: CompanyProfileProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'projects' | 'chart'>('profile');
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleDetail, setSelectedRoleDetail] = useState<'ceo' | 'secretary' | 'supervisor' | null>('ceo');

  // Completed Project Form state:
  const [showAddProject, setShowAddProject] = useState(false);
  const [projName, setProjName] = useState('');
  const [projLoc, setProjLoc] = useState('');
  const [projVal, setProjVal] = useState<number>(350000);
  const [projDate, setProjDate] = useState('2025-11-20');
  const [projPhoto, setProjPhoto] = useState('');

  // Real-time Completed Projects Sync
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'completed_projects'), (snapshot) => {
      const list: CompletedProject[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as CompletedProject);
      });
      setCompletedProjects(list);
      setLoading(false);
    }, (error) => {
      console.error(error);
      const saved = localStorage.getItem('cs_completed_projects');
      if (saved) {
        setCompletedProjects(JSON.parse(saved));
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const saveToFirestoreOrLocal = async (items: CompletedProject[], singleItem?: CompletedProject) => {
    if (singleItem) {
      try {
        await setDoc(doc(db, 'completed_projects', singleItem.id), singleItem);
      } catch (e) {
        console.error("Firestore writing error, falling back locally", e);
        localStorage.setItem('cs_completed_projects', JSON.stringify(items));
        setCompletedProjects(items);
      }
    } else {
      localStorage.setItem('cs_completed_projects', JSON.stringify(items));
      setCompletedProjects(items);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProjPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName || !projLoc) return;

    // Default template image if empty
    const defaultPhoto = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3D%22www.w3.org%22 viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%2327272a%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23fbbf24%22%20font-family%3D%22sans-serif%22%20font-size%3D%2220%22%3ERL%20CONSTRUCTION%3C%2Ftext%3E%3C%2Fsvg%3E';

    const newProj: CompletedProject = {
      id: `comp-proj-${Date.now()}`,
      name: projName,
      location: projLoc,
      value: Number(projVal),
      dateFinished: projDate,
      photoUrl: projPhoto || defaultPhoto
    };

    const updated = [...completedProjects, newProj];
    await saveToFirestoreOrLocal(updated, newProj);

    setProjName('');
    setProjLoc('');
    setProjVal(350000);
    setProjPhoto('');
    setShowAddProject(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Get workforce classifications for Org Chart
  const supervisorsList = workers.filter(w => w.role.toLowerCase() === 'supervisor' && w.active);
  const secretariesList = workers.filter(w => w.role.toLowerCase() === 'secretary' && w.active);
  const internWorkersList = workers.filter(w => w.role.toLowerCase() === 'intern' && w.active);
  const skilledWorkersList = workers.filter(w => ['mason', 'carpenter', 'welder', 'electrician', 'operator', 'foreman', 'skilled worker'].includes(w.role.toLowerCase()) && w.active);

  return (
    <div className="space-y-6 font-sans">
      {/* Visual Navigation Subtab Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
            <Building className="w-5 h-5 text-yellow-500" />
            RL Construction Profile
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Block 25 Lot 14, Tierra Vista, Cavite. Managing excellence in structural projects.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {[
            { id: 'profile', label: 'Overview', icon: Home },
            { id: 'projects', label: 'Finished Projects', icon: FolderGit2 },
            { id: 'chart', label: 'Organisational Chart', icon: Network },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-905 bg-slate-900 border border-slate-800 text-yellow-400'
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* OVERVIEW SECTION */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-6"
          >
            <div className="md:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest block border-b pb-2">
                🏠 Corporate Profile & Infrastructure
              </span>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Established as Cavite's premier specialist builder, RL Design and Construction delivers high-grade interior fit-outs, residential structural masonry, and turn-key commercial renovations. Our operations combine exact engineering estimates, synced multi-device field monitoring, and state-of-the-art cost control.
              </p>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Principal Contractor</span>
                  <p className="text-sm font-extrabold text-slate-800 mt-0.5">Ronald C. Famorca</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Chief Financial Officer</span>
                  <p className="text-sm font-extrabold text-slate-800 mt-0.5">Sheena Mae D. Serrano</p>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl p-4 bg-yellow-500/5 flex gap-3 text-xs leading-normal">
                <ShieldAlert className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-slate-800 block uppercase">Quality standard certified code</span>
                  <p className="text-slate-600 font-medium">
                    Our structural concrete formulations, architectural layout frameworks, and utility wiring systems strictly adhere to the National Building Code of the Philippines.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 bg-slate-900 p-6 rounded-2xl text-slate-300 flex flex-col justify-between items-center border border-neutral-800 shadow-xl relative text-center">
              <div className="space-y-2 mt-4">
                <Award className="w-12 h-12 text-yellow-400 mx-auto" />
                <h3 className="text-lg font-black text-white uppercase tracking-wide">Signature of Craftsmanship</h3>
                <p className="text-[10px] text-neutral-400 leading-normal max-w-xs uppercase tracking-wider font-semibold">
                  Zero delays • Complete transparency • Standard Philippine Code Compliant
                </p>
              </div>
              <p className="text-[9px] font-mono text-stone-500 border-t border-neutral-800 pt-3 w-full uppercase">
                RL Est. 2021 | Cavite Province
              </p>
            </div>
          </motion.div>
        )}

        {/* FINISHED PROJECTS SECTION */}
        {activeTab === 'projects' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white p-5 rounded-xl border border-slate-150 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                💼 Finished Portfolio Showcase ({completedProjects.length} Registered Structures)
              </span>

              <button
                onClick={() => setShowAddProject(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-xl border border-yellow-400 cursor-pointer"
              >
                Upload Finished Project Memory
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedProjects.length > 0 ? (
                completedProjects.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-md transition-all">
                    {/* Responsive image container */}
                    <div className="h-44 w-full relative bg-slate-900 border-b">
                      <img 
                        src={p.photoUrl} 
                        alt={p.name} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2.5 right-2.5 bg-yellow-500 text-slate-950 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded font-mono">
                        CONCLUDED
                      </div>
                    </div>

                    <div className="p-4 space-y-2 font-sans">
                      <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                      <div className="text-[10px] text-slate-400 font-semibold space-y-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {p.location}
                        </div>
                        <div className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          concluded: {p.dateFinished}
                        </div>
                        <div className="flex items-center gap-1 font-mono text-emerald-600 font-bold">
                          <DollarSign className="w-3 h-3 text-emerald-500" />
                          valuation: {formatCurrency(p.value)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 bg-white rounded-2xl border text-slate-400 italic font-medium">
                  No completed project memory showcases uploaded yet. Click Upload above to construct showcase.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* COMPREHENSIVE ORGANISATIONAL CHART DEVELOPMENT */}
        {activeTab === 'chart' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 overflow-x-auto min-w-[720px] pb-10"
          >
            <div className="text-center font-sans space-y-1 border-b pb-4">
              <span className="text-[9px] bg-yellow-500/10 text-yellow-700 px-2.5 py-0.5 rounded font-extrabold uppercase tracking-widest font-mono">
                RL DESIGN & CONSTRUCTION ADMINISTRATION HIERARCHY
              </span>
              <h3 className="text-xl font-black text-slate-900 uppercase">Interactive Company Structure & Access Guild</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Direct structural connections guiding authorities, communication channels, and secure system access permissions.
              </p>
            </div>

            {/* Legend & Hint info panel */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 font-sans text-xs">
              <p className="text-[10px] font-medium leading-relaxed">
                💡 <strong>Interactive Chart:</strong> Click on any role block card in the layout below to inspect their structural roles, contact options, exact system access scopes, and duty rules.
              </p>
              <div className="flex gap-2 text-[9px] font-bold">
                <span className="px-2 py-1 bg-slate-900 text-white rounded">CEO / Admin</span>
                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded border border-amber-200">Secretary</span>
                <span className="px-2 py-1 bg-yellow-405 bg-yellow-500 text-slate-950 rounded">Site Supervisor</span>
              </div>
            </div>

            {/* Tree Layout Rendering */}
            <div className="flex flex-col items-center space-y-6 py-4 font-sans text-xs">
              {/* LEVEL 1: CEO Co-Leadership Block */}
              <div className="flex flex-col items-center relative w-full">
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-xl">
                  {/* Co-Founder Ronald */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRoleDetail('ceo')}
                    className={`cursor-pointer text-center w-64 rounded-2xl p-4 shadow-md transition-all select-none border-b-4 ${
                      selectedRoleDetail === 'ceo'
                        ? 'bg-slate-950 text-white ring-4 ring-yellow-400 border-yellow-500'
                        : 'bg-slate-900 text-white border-yellow-500/60 opacity-95'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-850 pb-1.5 mb-2">
                      <span className="text-[7.5px] uppercase tracking-widest font-mono font-black text-yellow-400">Level 1 • Co-Founder CEO</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <p className="text-sm font-black tracking-wide">Ronald C. Famorca</p>
                    <p className="text-[9.5px] text-slate-300 block font-bold font-mono">Chief Executive Officer</p>
                    <p className="text-[8.5px] text-yellow-500 font-semibold italic mt-1 font-sans">Founder & Principal Contractor</p>
                  </motion.div>

                  {/* Co-Executive Ericka */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRoleDetail('ceo_ericka')}
                    className={`cursor-pointer text-center w-64 rounded-2xl p-4 shadow-md transition-all select-none border-b-4 ${
                      selectedRoleDetail === 'ceo_ericka'
                        ? 'bg-slate-950 text-white ring-4 ring-yellow-400 border-yellow-500'
                        : 'bg-slate-900 text-white border-yellow-500/60 opacity-95'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-850 pb-1.5 mb-2">
                      <span className="text-[7.5px] uppercase tracking-widest font-mono font-black text-yellow-400">Level 1 • CEO & HR HEAD</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <p className="text-sm font-black tracking-wide">Ericka Famorca</p>
                    <p className="text-[9.5px] text-slate-300 block font-bold font-mono">CEO & Head of HR</p>
                    <p className="text-[8.5px] text-yellow-500 font-semibold italic mt-1 font-sans">Business Partner & People Specialist</p>
                  </motion.div>
                </div>
                {/* Vertical Connector Line */}
                <div className="w-0.5 h-6 bg-slate-300 mt-3" />
              </div>

              {/* LEVEL 2: Corporate Secretary (Sheena Mae D. Serrano) */}
              <div className="flex flex-col items-center relative">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRoleDetail('secretary')}
                  className={`cursor-pointer text-center w-64 rounded-2xl p-4 shadow-sm transition-all select-none border-b-4 ${
                    selectedRoleDetail === 'secretary'
                      ? 'bg-amber-100 border-amber-500 text-slate-950 ring-4 ring-yellow-400'
                      : 'bg-amber-50 border-amber-300 text-slate-900 opacity-95'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-1.5 mb-2">
                    <span className="text-[7.5px] uppercase tracking-widest font-mono font-black text-amber-700 font-sans font-extrabold">Level 2 • Admin Audit</span>
                    <span className="text-[8px] font-bold text-amber-600 font-mono">FINANCES</span>
                  </div>
                  <p className="text-sm font-black tracking-wide">Sheena Mae D. Serrano</p>
                  <p className="text-[9.5px] text-amber-900 block font-bold font-mono">Corporate Secretary / Assistant</p>
                  <p className="text-[8.5px] text-slate-500 font-semibold italic mt-1 font-sans">Lead Financial Controller</p>
                </motion.div>
                {/* Branch line split */}
                <div className="w-0.5 h-6 bg-slate-300 mt-2" />
                <div className="hidden sm:block w-[450px] h-0.5 bg-slate-300" />
              </div>

              {/* LEVEL 3: Site Supervisors & Field Leaders */}
              <div className="flex justify-around bg-slate-50/50 p-5 rounded-2xl border border-dashed border-slate-200 max-w-4xl w-full gap-4">
                
                {/* Branch Left: Registered Secretaries assisting administrative functions */}
                <div className="space-y-3 flex-1 flex flex-col items-center">
                  <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 font-extrabold rounded text-[8px] uppercase tracking-wider font-sans">
                    🏛️ Administrative Staff
                  </span>
                  <div className="space-y-1.5 w-full max-w-[190px]">
                    {secretariesList.length > 0 ? (
                      secretariesList.map(s => (
                        <div key={s.id} className="bg-white border rounded-xl p-2 text-center shadow-xs font-semibold text-slate-800 text-[11px]">
                          {s.name}
                        </div>
                      ))
                    ) : (
                      <div 
                        onClick={() => setSelectedRoleDetail('secretary')}
                        className="text-[10px] bg-white border border-dashed rounded-xl p-2.5 text-center text-slate-400 italic cursor-pointer hover:border-amber-400"
                      >
                        Sheena Mae D. Serrano (Lead)
                      </div>
                    )}
                  </div>
                </div>

                {/* Branch Center: Project Site Supervisors (Dynamic supervisors active) */}
                <div className="space-y-3 flex-2 flex flex-col items-center border-l border-r px-4 border-slate-150">
                  <span className="inline-block px-2.5 py-1 bg-yellow-50 border border-yellow-200 text-yellow-800 font-extrabold rounded text-[8px] uppercase tracking-wider font-sans">
                    👷 Site Supervisor & Safety
                  </span>
                  <div className="flex flex-wrap justify-center gap-2 max-w-[340px]">
                    {supervisorsList.length > 0 ? (
                      supervisorsList.map(sup => {
                        const supervisorSite = sites.find(s => s.id === sup.assignedSiteId);
                        return (
                          <div 
                            key={sup.id} 
                            onClick={() => setSelectedRoleDetail('supervisor')}
                            className="bg-slate-900 cursor-pointer text-yellow-400 p-2 text-center rounded-xl font-bold font-mono text-[10px] w-36 shadow-xs border border-slate-800 hover:ring-2 hover:ring-yellow-400/50"
                          >
                            <p>{sup.name}</p>
                            {supervisorSite && <p className="text-[7.5px] text-slate-400 uppercase font-sans mt-0.5">{supervisorSite.name}</p>}
                          </div>
                        );
                      })
                    ) : (
                      <div className="space-y-1.5">
                        <div 
                          onClick={() => setSelectedRoleDetail('supervisor')}
                          className="bg-slate-900 cursor-pointer text-yellow-400 p-2 text-center rounded-xl font-bold font-mono text-[10px] w-36 shadow-xs hover:ring-2 hover:ring-yellow-400/50"
                        >
                          Richard Vance
                        </div>
                        <div 
                          onClick={() => setSelectedRoleDetail('supervisor')}
                          className="bg-slate-900 cursor-pointer text-yellow-400 p-2 text-center rounded-xl font-bold font-mono text-[10px] w-36 shadow-xs hover:ring-2 hover:ring-yellow-400/50"
                        >
                          Arjun Mehta
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Branch Right: Workforce Interns / Junior Staff */}
                <div className="space-y-3 flex-1 flex flex-col items-center animate-fade-in">
                  <span className="inline-block px-2 py-0.5 bg-rose-50 border border-rose-150 text-rose-700 font-extrabold rounded text-[8px] uppercase tracking-wider font-sans">
                    🎓 Workforce Interns
                  </span>
                  <div className="space-y-1.5 w-full max-w-[190px]">
                    {internWorkersList.length > 0 ? (
                      internWorkersList.map(i => (
                        <div key={i.id} className="bg-white border border-rose-100 rounded-xl p-2 text-center text-[11px] font-semibold text-slate-800">
                          {i.name}
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] bg-white border border-dashed rounded-xl p-2.5 text-center text-slate-400 italic">
                        No active interns assigned.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* LEVEL 4: Skilled Workforce (Mason, Carpenter, Welder etc.) */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-5 bg-slate-300" />
                <span className="inline-block px-3 py-1 bg-slate-100 border text-slate-600 font-extrabold rounded-full text-[9px] uppercase tracking-widest font-mono">
                  🧱 Skilled Construction Guild ({skilledWorkersList.length} Builder active)
                </span>
                <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-4xl text-[10px] font-semibold text-slate-600">
                  {skilledWorkersList.map(wk => (
                    <span key={wk.id} className="bg-white border rounded-lg px-2.5 py-1.5 shadow-xs hover:border-yellow-400 transition-colors font-sans">
                      {wk.name} <strong className="text-yellow-600 uppercase text-[8px] font-black font-sans">[{wk.role}]</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* DYNAMIC ROLE DETAIL INSPECTOR BOX */}
            <AnimatePresence mode="wait">
              {selectedRoleDetail && (
                <motion.div
                  key={selectedRoleDetail}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="p-5 rounded-2xl border bg-slate-50 border-slate-200/80 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono font-black uppercase text-slate-500 block tracking-wider bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-sm w-fit">
                        Clearance & Role Directives Inspector
                      </span>
                      <h4 className="text-base font-black text-slate-900 uppercase">
                        {selectedRoleDetail === 'ceo' && "Ronald C. Famorca — Chief Executive Officer (Founder)"}
                        {selectedRoleDetail === 'ceo_ericka' && "Ericka Famorca — CEO & Head of HR (Admin Access)"}
                        {selectedRoleDetail === 'secretary' && "Sheena Mae D. Serrano — Corporate Secretary / Accountant"}
                        {selectedRoleDetail === 'supervisor' && "Project Site Supervisors & Safety Captains"}
                      </h4>
                    </div>
                    <button 
                      onClick={() => setSelectedRoleDetail(null)}
                      className="text-slate-500 hover:text-slate-800 font-bold p-1 bg-slate-200 rounded-lg hover:bg-slate-300 cursor-pointer"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
                    {/* Left: Clearance Description */}
                    <div className="md:col-span-4 bg-white p-4 rounded-xl border space-y-2.5 shadow-2xs">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest font-mono">General Office Status</span>
                      <div>
                        <p className="text-xs font-black text-slate-800">
                          {(selectedRoleDetail === 'ceo' || selectedRoleDetail === 'ceo_ericka') && "Supreme Operations Architect"}
                          {selectedRoleDetail === 'secretary' && "Lead Operational Auditor"}
                          {selectedRoleDetail === 'supervisor' && "Field Duty Officers"}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-medium">
                          {selectedRoleDetail === 'ceo' && "Holds absolute administrative overrides over estimation sheets, cash flows, user registries, master lists, agreements, and dynamic databases."}
                          {selectedRoleDetail === 'ceo_ericka' && "Oversees corporate Human Resources, recruitment standards, executive leadership strategies, workforce payroll audit, and system compliance."}
                          {selectedRoleDetail === 'secretary' && "Leads administrative corporate back-office flows, processes client payments milestones, updates drawing pipelines, and records documents."}
                          {selectedRoleDetail === 'supervisor' && "Manages site-level builder attendance registries, locks in daily timesheets, processes field petty cash logs, and views respective run metrics."}
                        </p>
                      </div>

                      <div className="border-t pt-2.5 space-y-1">
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase font-mono">System Authentication Level</p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${(selectedRoleDetail === 'ceo' || selectedRoleDetail === 'ceo_ericka') ? 'bg-red-600' : selectedRoleDetail === 'secretary' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <span className="font-extrabold text-slate-800 text-[10px] font-mono uppercase">
                            {(selectedRoleDetail === 'ceo' || selectedRoleDetail === 'ceo_ericka') && "LEVEL 4: FULL SYSTEM UNRESTRICTED"}
                            {selectedRoleDetail === 'secretary' && "LEVEL 3: SECURE ADMINISTRATION CONTROLS"}
                            {selectedRoleDetail === 'supervisor' && "LEVEL 2: SITE ENCODE & EXPENSES VIEW ONLY"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Specific Access Matrix permissions list */}
                    <div className="md:col-span-8 bg-white p-4 rounded-xl border space-y-3 shadow-2xs">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest font-mono">Permissions Matrix Rules</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
                        
                        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-start gap-2">
                          <span className="text-emerald-700 font-bold block text-sm">✓</span>
                          <div>
                            <strong className="text-emerald-900 font-extrabold uppercase block">Read/View Permissions:</strong>
                            <p className="text-slate-500 mt-0.5 leading-normal font-medium">
                              {(selectedRoleDetail === 'ceo' || selectedRoleDetail === 'ceo_ericka') && "Unconditional access across all sites, cash flow logs, masterlists, completed archives, blueprints and Google Sheets."}
                              {selectedRoleDetail === 'secretary' && "All visual reports, project lists, drawings blueprint pipeline, loan reports, and payroll records."}
                              {selectedRoleDetail === 'supervisor' && "Views internal payroll calculations only for active builders, site expenses ledger, and the financial limit running metrics for their respective site."}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100 flex items-start gap-2">
                          <span className="text-orange-700 font-bold block text-sm">🛠️</span>
                          <div>
                            <strong className="text-orange-900 font-extrabold uppercase block">Write/Encoding Scope:</strong>
                            <p className="text-slate-500 mt-0.5 leading-normal font-medium">
                              {(selectedRoleDetail === 'ceo' || selectedRoleDetail === 'ceo_ericka') && "Set up projects, define baseline scopes, adjust daily rate parameters, modify loan status values, write custom estimates and sign final layouts."}
                              {selectedRoleDetail === 'secretary' && "Register files and legal agreements, tracking payments received, updating layout project steps, and modifying employee details."}
                              {selectedRoleDetail === 'supervisor' && "Strictly restricted to onsite functions: encoding builder attendance matrices, logging petty cash category expenses, and registering loan notes."}
                            </p>
                          </div>
                        </div>

                      </div>

                      {/* Summary message */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border text-[9.5px] font-semibold text-slate-500 select-none">
                        🚨 <strong>Governance Check:</strong> All administrative login sessions maintain persistent state signatures to prevent on-site data contamination. Logout sessions instantly clear keys.
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload project memory modal */}
      <AnimatePresence>
        {showAddProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddProject(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 relative z-10 max-w-md w-full border shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Conclude & Log Completed Project
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddProject(false)}
                  className="p-1 hover:bg-slate-50 text-slate-400 rounded"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500">Project / Building Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Serrano Townhouse Fitout"
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500">Location Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Santiago, General Trias, Cavite"
                    value={projLoc}
                    onChange={(e) => setProjLoc(e.target.value)}
                    className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500">Project Budget TCP (₱) *</label>
                    <input
                      type="number"
                      required
                      min="10000"
                      value={projVal}
                      onChange={(e) => setProjVal(Number(e.target.value))}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500">Conclusion Date finished</label>
                    <input
                      type="date"
                      value={projDate}
                      onChange={(e) => setProjDate(e.target.value)}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1 p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <label className="text-[10px] font-extrabold uppercase text-slate-700 block">Upload Project Image Photograph *</label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="cursor-pointer bg-white text-slate-700 hover:bg-slate-50 border rounded-lg border-slate-300 font-bold px-4 py-2 transition-all flex items-center gap-1.5 select-none">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Photo Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                    </label>
                    <span className="text-[9px] text-slate-400">
                      {projPhoto ? "✓ Photo Processed successfully" : "Select complete build photograph"}
                    </span>
                  </div>

                  {projPhoto && (
                    <div className="mt-3 border rounded overflow-hidden h-24 relative bg-black">
                      <img src={projPhoto} alt="Upload preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddProject(false)}
                    className="px-4 py-2 border rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-yellow-500 hover:bg-yellow-605 text-slate-950 font-bold rounded-xl border border-yellow-400 cursor-pointer"
                  >
                    Save Showroom Project
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
