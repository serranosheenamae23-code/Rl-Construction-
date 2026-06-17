/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  PhilippinePeso, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  ShieldCheck,
  FileSpreadsheet,
  Percent,
  Calendar,
  Megaphone,
  Pin,
  Plus,
  Trash2,
  Edit2,
  Save,
  Bell
} from 'lucide-react';
import { ConstructionSite, Worker, AttendanceRecord, ExpenseRecord, ClientPayment, UserRole, Announcement } from '../types';
import { 
  getSiteLaborCost, 
  getSiteSupervisorCost, 
  getSiteTotalCost, 
  getSiteClientPayments, 
  getSiteClientBalance, 
  formatCurrency 
} from '../utils';

interface DashboardProps {
  sites: ConstructionSite[];
  workers: Worker[];
  attendance: AttendanceRecord[];
  expenses: ExpenseRecord[];
  payments: ClientPayment[];
  onNavigate: (tabId: string, siteId?: string) => void;
  currentRole?: UserRole;
  assignedSiteId?: string;
  announcements?: Announcement[];
  onSaveAnnouncements?: (list: Announcement[]) => void;
}

// Cute Tear-off Calendar indicator component
function CuteCalendarDate({ 
  dayName, 
  monthName, 
  dateNum, 
  yearNum 
}: { 
  dayName: string, 
  monthName: string, 
  dateNum: number, 
  yearNum: number 
}) {
  return (
    <div className="flex items-center gap-2.5 bg-gradient-to-r from-amber-50 to-amber-100/30 border border-amber-200/50 rounded-xl px-3 py-1.5 shadow-2xs transition-all hover:shadow-xs shrink-0 select-none">
      {/* Tear-off calendar sheet effect */}
      <div className="relative w-11 h-12 bg-white border border-rose-200 rounded-lg overflow-hidden flex flex-col justify-between text-center shrink-0 shadow-3xs">
        <div className="bg-rose-500 text-white text-[6.5px] font-black py-0.5 uppercase tracking-widest leading-none">
          {monthName.substring(0, 3)}
        </div>
        <div className="text-[17px] font-black text-slate-800 leading-none pb-0.5 tracking-tighter">
          {dateNum}
        </div>
        <div className="text-[6px] font-black text-rose-500/70 uppercase tracking-widest pb-0.5 bg-rose-50/50 border-t border-rose-100/50">
          {dayName.substring(0, 3)}
        </div>
        {/* Ring holes for realistic tear-off calendar sheet */}
        <div className="absolute top-[8px] left-[5px] w-1 h-1 rounded-full bg-slate-100 border border-slate-300 pointer-events-none" />
        <div className="absolute top-[8px] right-[5px] w-1 h-1 rounded-full bg-slate-100 border border-slate-300 pointer-events-none" />
      </div>
      <div>
        <p className="text-[8px] uppercase tracking-widest font-black text-amber-705/90 flex items-center gap-1 leading-none">
          ✨ Good Day!
        </p>
        <p className="text-xs font-black text-slate-800 mt-0.5 whitespace-nowrap">
          {dayName}, {monthName} {dateNum}
        </p>
        <p className="text-[8px] text-amber-600/90 font-mono font-bold leading-none mt-0.5">
          Year {yearNum}
        </p>
      </div>
    </div>
  );
}

// Announcements & Updates Bulletin Board (Metallic Brand Aesthetics)
function AnnouncementsSection({
  announcements,
  onSaveAnnouncements,
  currentRole
}: {
  announcements: Announcement[];
  onSaveAnnouncements: (list: Announcement[]) => void;
  currentRole: UserRole;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Announcement['category']>('General');
  const [pinned, setPinned] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      date: new Date().toISOString().split('T')[0],
      category,
      pinned,
      createdBy: 'Admin / HR'
    };

    onSaveAnnouncements([newAnn, ...announcements]);
    setTitle('');
    setContent('');
    setCategory('General');
    setPinned(false);
    setShowAddForm(false);
  };

  const handleStartEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setContent(ann.content);
    setCategory(ann.category);
    setPinned(!!ann.pinned);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !editingId) return;

    const updated = announcements.map(ann => {
      if (ann.id === editingId) {
        return {
          ...ann,
          title: title.trim(),
          content: content.trim(),
          category,
          pinned
        };
      }
      return ann;
    });

    onSaveAnnouncements(updated);
    setEditingId(null);
    setTitle('');
    setContent('');
    setCategory('General');
    setPinned(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      onSaveAnnouncements(announcements.filter(ann => ann.id !== id));
    }
  };

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const getCategoryStyles = (cat: Announcement['category']) => {
    switch (cat) {
      case 'Safety':
        return 'bg-rose-500/10 text-rose-450 border border-rose-500/20';
      case 'Payroll':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Urgent':
        return 'bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse';
      case 'Holiday':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'Staff':
        return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
      default:
        return 'bg-amber-500/10 text-[#E5C060] border border-amber-500/25';
    }
  };

  const canEdit = currentRole === 'Admin';

  return (
    <div className="bg-[#181c24] text-slate-100 rounded-2xl shadow-md border-t-4 border-[#e5c060] overflow-hidden" id="announcements-circular-board">
      <div className="bg-black/45 px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#E5C060] to-[#C4932D] p-0.5 shadow-md flex items-center justify-center shrink-0">
            <Megaphone className="w-4.5 h-4.5 text-slate-950" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-[#E5C060] flex items-center gap-1.5 font-sans">
              RL CON BULLETIN BOARD
            </h2>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">
              Live updates, safety briefs, & project announcements
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setIsEditing(!isEditing);
              setShowAddForm(false);
              setEditingId(null);
            }}
            className="px-2.5 py-1 bg-slate-850 hover:bg-slate-800 text-xs font-bold text-[#E5C060] hover:text-white rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            id="manage-btn"
          >
            {isEditing ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Done</span>
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5 text-[#E5C060]" />
                <span>Manage</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="p-5">
        {canEdit && isEditing && (
          <div className="mb-6 bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#E5C060] flex items-center gap-1.5">
                {editingId ? '✍️ Edit Announcement' : '✨ Create New Announcement'}
              </span>
              {!editingId && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-[#E5C060] text-[10px] font-bold rounded uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {showAddForm ? 'Close sandbox' : '+ Open Portal'}
                </button>
              )}
            </div>

            {(showAddForm || editingId) && (
              <form onSubmit={editingId ? handleSaveEdit : handleAdd} className="space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                      Headline Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Concrete Pouring Schedule"
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#E5C060] font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                      Hub Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#E5C060] font-bold"
                    >
                      <option value="General">📋 General Info</option>
                      <option value="Safety">🛡️ Safety Guideline</option>
                      <option value="Payroll">📅 Payroll Notice</option>
                      <option value="Urgent">🚨 Urgent Update</option>
                      <option value="Holiday">🎉 Holiday Advisory</option>
                      <option value="Staff">👷 Personnel Circular</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                    Full Content Details
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter announcement text or specific on-site instructions..."
                    rows={3}
                    className="w-full bg-slate-850 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#E5C060] font-medium resize-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-300 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pinned}
                      onChange={(e) => setPinned(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-slate-800"
                    />
                    <span className="flex items-center gap-1">
                      <Pin className="w-3.5 h-3.5 text-amber-400" />
                      Pin to Peak of Board
                    </span>
                  </label>

                  <div className="flex gap-2">
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setTitle('');
                          setContent('');
                          setCategory('General');
                          setPinned(false);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-350 font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-lg transition-all flex items-center gap-1 shadow-md cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingId ? 'Save Edits' : 'Publish Broadcast'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {sortedAnnouncements.length === 0 ? (
          <div className="text-center py-8 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
            <Megaphone className="w-8 h-8 text-slate-600 mx-auto opacity-50 mb-2" />
            <p className="text-xs font-bold text-slate-400">Clear skies! No announcements listed right now.</p>
            {canEdit && (
              <p className="text-[10px] text-slate-500 mt-1">
                Click 'Manage' to load your first bulletin post.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {sortedAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className={`p-4 rounded-xl relative transition-all border ${
                  ann.pinned
                    ? 'bg-gradient-to-r from-amber-950/15 to-transparent border-amber-500/25 shadow-xs'
                    : 'bg-slate-900/30 border-slate-800 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md ${getCategoryStyles(ann.category)}`}>
                        {ann.category}
                      </span>
                      {ann.pinned && (
                        <span className="inline-flex items-center gap-0.5 text-[8.5px] text-amber-400 font-black tracking-wider uppercase font-mono px-1 py-0.1 bg-amber-500/5 rounded border border-amber-500/10">
                          <Pin className="w-2.5 h-2.5 fill-amber-405 shrink-0 text-amber-400" />
                          PINNED UPDATE
                        </span>
                      )}
                    </div>
                    <h3 className="text-[12.5px] font-extrabold text-slate-100 flex items-center gap-1.5 leading-snug">
                      {ann.title}
                    </h3>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[9px] font-mono font-bold text-slate-500 block">
                      Posted: {ann.date}
                    </span>
                    <span className="text-[8.5px] font-bold text-amber-500/80 block">
                      By: {ann.createdBy || 'RL Management'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mt-2.5 whitespace-pre-wrap font-medium">
                  {ann.content}
                </p>

                {canEdit && isEditing && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-lg">
                    <button
                      onClick={() => handleStartEdit(ann)}
                      title="Edit Post"
                      className="p-1 hover:bg-slate-800 rounded text-[#E5C060] transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      title="Delete Post"
                      className="p-1 hover:bg-slate-800 rounded text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({
  sites,
  workers,
  attendance,
  expenses,
  payments,
  onNavigate,
  currentRole = 'Admin',
  assignedSiteId = '',
  announcements = [],
  onSaveAnnouncements = () => {},
}: DashboardProps) {
  const containerId = useId();

  const today = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayName = days[today.getDay()];
  const monthName = months[today.getMonth()];
  const dateNum = today.getDate();
  const yearNum = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const birthdayWorkers = workers.filter(worker => {
    if (!worker.birthday) return false;
    // Format YYYY-MM-DD
    const parts = worker.birthday.split('-');
    if (parts.length === 3) {
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      return m === todayMonth && d === todayDay;
    }
    // Try other formats
    try {
      const d = new Date(worker.birthday);
      return !isNaN(d.getTime()) && (d.getMonth() + 1 === todayMonth) && (d.getDate() === todayDay);
    } catch (e) {
      return false;
    }
  });

  // Filter lists based on role and site assignment
  const isFiltered = currentRole !== 'Admin' && !!assignedSiteId;
  const filteredSites = isFiltered ? sites.filter(s => s.id === assignedSiteId) : sites;
  const filteredSiteIds = new Set(filteredSites.map(s => s.id));

  const filteredWorkers = isFiltered 
    ? workers.filter(w => w.assignedSiteId === assignedSiteId) 
    : workers.filter(w => sites.some(s => s.id === w.assignedSiteId));

  const filteredAttendance = isFiltered 
    ? attendance.filter(a => filteredSiteIds.has(a.siteId) && sites.some(s => s.id === a.siteId)) 
    : attendance.filter(a => sites.some(s => s.id === a.siteId));

  const filteredExpenses = isFiltered 
    ? expenses.filter(e => filteredSiteIds.has(e.siteId) && sites.some(s => s.id === e.siteId)) 
    : expenses.filter(e => sites.some(s => s.id === e.siteId));

  const filteredPayments = isFiltered 
    ? payments.filter(p => filteredSiteIds.has(p.siteId) && sites.some(s => s.id === p.siteId)) 
    : payments.filter(p => sites.some(s => s.id === p.siteId));

  // Calculations
  const activeSites = filteredSites.filter((s) => s.status === 'active');
  const activeWorkersCount = filteredWorkers.filter((w) => w.active).length;

  const totalProjectValue = filteredSites.reduce((sum, s) => sum + s.projectValue, 0);
  const totalClientPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstandingBalance = Math.max(0, totalProjectValue - totalClientPayments);

  // Spendings
  const totalLaborCost = filteredAttendance.reduce((sum, a) => sum + a.wageEarned, 0);
  const totalSupervisorCost = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSiteExpenses = totalLaborCost + totalSupervisorCost;

  // Key Performance Indicators Calculations
  const netProfitAmount = totalProjectValue - totalSiteExpenses;
  const netProfitMarginPercent = totalProjectValue > 0 ? (netProfitAmount / totalProjectValue) * 100 : 0;

  // Timeline Schedule Variance estimation
  const timelineSites = filteredSites.filter(s => s.status !== 'planning');
  let cumulativeVarianceDays = 0;
  let aheadCount = 0;
  let behindCount = 0;
  let onTimeCount = 0;

  timelineSites.forEach(site => {
    if (site.status === 'completed') {
      onTimeCount++;
      return;
    }
    
    // Calculate elapsed time from project start date
    const start = site.startDate ? new Date(site.startDate) : new Date();
    const today = new Date();
    const elapsedMs = today.getTime() - start.getTime();
    const elapsedDays = Math.max(1, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
    
    // Landmark standard project fit-out cycle is set as 90 days.
    const standardProjectCycleDays = 90;
    const progressPercent = site.progress || 0;
    
    // Expected days elapsed to reach current progressPercent linearly
    const expectedElapsedDaysForProgress = (progressPercent / 100) * standardProjectCycleDays;
    
    // Deviation calculation
    const siteVariance = expectedElapsedDaysForProgress - elapsedDays;
    cumulativeVarianceDays += siteVariance;
    
    if (siteVariance > 2) {
      aheadCount++;
    } else if (siteVariance < -2) {
      behindCount++;
    } else {
      onTimeCount++;
    }
  });

  const avgTimelineVarianceDays = timelineSites.length > 0 
    ? cumulativeVarianceDays / timelineSites.length 
    : 0;

  // Budget warnings
  const warningsCount = filteredSites.filter((site) => {
    const cost = getSiteTotalCost(site.id, filteredAttendance, filteredExpenses);
    return cost > site.budgetLimit;
  }).length;

  // Let's analyze expenses by category
  const categoryTotals = filteredExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const categories = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value,
    color: 
      name === 'Fuel' ? 'bg-yellow-500' :
      name === 'Tea & Meals' ? 'bg-emerald-500' :
      name === 'Urgent Material' ? 'bg-rose-500' :
      name === 'Small Tools' ? 'bg-indigo-500' :
      name === 'Local Transport' ? 'bg-sky-500' :
      name === 'Worker Advance' ? 'bg-yellow-500' : 'bg-slate-400',
  })).sort((a, b) => b.value - a.value);

  if (currentRole === 'Site Supervisor') {
    const assignedSite = sites.find(s => s.id === assignedSiteId);
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
        id={containerId}
      >
        {/* Supervisor Welcome Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <CuteCalendarDate dayName={dayName} monthName={monthName} dateNum={dateNum} yearNum={yearNum} />
            <div>
              <span className="inline-flex items-center gap-1 bg-amber-400/10 text-amber-800 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider mb-1 border border-amber-200/50">
                👷 AUTHORIZED SITE SUPERVISOR CONSOLE
              </span>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Supervisor Dashboard</h1>
              <p className="text-xs text-slate-500">Authorized encoding portal & running expenses tracker.</p>
            </div>
          </div>
          <div className="flex flex-col items-start lg:items-end">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Assigned Project:</span>
            <span className="text-xs font-black text-amber-600 font-mono tracking-wide bg-amber-50 px-2 py-0.5 rounded border border-amber-100 mt-1">
              📍 {assignedSite?.name || 'On Site Liaison'}
            </span>
          </div>
        </div>

        {/* Birthday corner for personnel */}
        <div className="bg-gradient-to-r from-amber-500/5 via-rose-500/5 to-indigo-500/5 border border-pink-100/60 rounded-xl p-4 shadow-xs relative overflow-hidden">
          <div className="absolute right-4 -top-6 w-20 h-20 rounded-full bg-pink-100 opacity-40 blur-xl pointer-events-none" />
          <div className="absolute left-1/3 -bottom-6 w-16 h-16 rounded-full bg-amber-100 opacity-50 blur-xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center text-lg shadow-2xs shrink-0 select-none">
                {birthdayWorkers.length > 0 ? '🎂' : '🍃'}
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-pink-700 tracking-wider flex items-center gap-1">
                  <span>🎈 RL Crew Birthday Corner (201 Profile) 🎈</span>
                </h3>
                {birthdayWorkers.length > 0 ? (
                  <p className="text-[11.5px] text-slate-700 mt-0.5 font-medium leading-relaxed">
                    We are celebrating a birthday today! Let's send greetings to:{' '}
                    {birthdayWorkers.map((w) => (
                      <span key={w.id} className="font-extrabold text-pink-900 bg-white/70 border border-pink-200 rounded-md px-2 py-0.5 mx-0.5 inline-block text-[11px] font-sans">
                        🎉 {w.name} ({w.role})
                      </span>
                    ))} 🥳🎁✨
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5 font-medium leading-normal">
                    No 201 employee birthdays today ({monthName} {dateNum}). Working hard, building dreams! 👷🛠️ Let's check back tomorrow!
                  </p>
                )}
              </div>
            </div>
            
            {birthdayWorkers.length > 0 ? (
              <div className="bg-rose-500 text-white text-[9px] font-black font-mono px-3 py-1.5 rounded-lg border border-rose-600 shadow-2xs self-start sm:self-center uppercase tracking-widest animate-pulse whitespace-nowrap">
                🎁 CELEBRATING TODAY!
              </div>
            ) : (
              <div className="bg-slate-100 text-slate-400 text-[8.5px] font-bold font-mono px-2.5 py-1 rounded-md border border-slate-200 self-start sm:self-center uppercase tracking-wider whitespace-nowrap">
                ✨ No birthdays today
              </div>
            )}
          </div>
        </div>

        {/* Realtime Bulletin Board for site policies, safety drills & updates */}
        <AnnouncementsSection 
          announcements={announcements} 
          onSaveAnnouncements={onSaveAnnouncements} 
          currentRole={currentRole} 
        />

        {/* Assigned Site Overview & Running Expenses Meter */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Running Expenses Summary Card */}
          <div className="lg:col-span-2 bg-slate-950 text-white p-6 rounded-2xl border border-slate-900 relative overflow-hidden flex flex-col justify-between shadow-lg">
            {/* Ambient indicator background */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(245,158,11,0.08),transparent_100%)] pointer-events-none" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                  Site Current Running Expenses
                </span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">
                  Realtime Synced
                </span>
              </div>
              
              <div className="py-2">
                <p className="text-sm font-semibold text-slate-400">Total Site Expenditure Encoded:</p>
                <p className="text-4xl font-extrabold text-amber-400 tracking-tight font-mono mt-1">
                  {formatCurrency(totalSiteExpenses)}
                </p>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Real-time calculations based on hours worked by active crew and supervisor cash logs recorded for this site.
                </p>
              </div>

              {/* Cost Breakdown Progress Bars */}
              <div className="space-y-3.5 pt-2 border-t border-white/5">
                {/* Labor Expenses */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">👷 Labor Wages Paid:</span>
                    <span className="text-slate-200 font-mono">{formatCurrency(totalLaborCost)}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full" 
                      style={{ width: `${totalSiteExpenses > 0 ? (totalLaborCost / totalSiteExpenses) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 uppercase tracking-widest font-mono">
                    <span>Labor Shifts Matrix</span>
                    <span>{totalSiteExpenses > 0 ? ((totalLaborCost / totalSiteExpenses) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>

                {/* Material Allowance Expenses */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">🪙 Supervisor Material Allowance:</span>
                    <span className="text-slate-200 font-mono">{formatCurrency(totalSupervisorCost)}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-400 h-full rounded-full" 
                      style={{ width: `${totalSiteExpenses > 0 ? (totalSupervisorCost / totalSiteExpenses) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 uppercase tracking-widest font-mono">
                    <span>Cash Claims Filed</span>
                    <span>{totalSiteExpenses > 0 ? ((totalSupervisorCost / totalSiteExpenses) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-5 border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10.5px] text-slate-400 relative z-10 font-medium">
              <span>Location: <strong className="text-slate-200">{assignedSite?.location || 'Muntinlupa'}</strong></span>
              <span>Project Budget Cap Limit: <strong className="text-amber-400">{formatCurrency(assignedSite?.budgetLimit || 0)}</strong></span>
            </div>
          </div>

          {/* Quick Encoding Actions Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block font-mono">
                QUICK ACCESS ENCODERS
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">
                As the site representative, you hold encoding permissions to log crew attendance shifts and claim transport/material receipts.
              </p>
              
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={() => onNavigate('attendance')}
                  className="w-full text-left bg-emerald-50 hover:bg-emerald-100/75 text-emerald-800 p-3.5 rounded-xl border border-emerald-100 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="pointer-events-none">
                    <p className="text-xs font-extrabold uppercase tracking-wide">👷 Daily Labor Attendance</p>
                    <p className="text-[9.5px] text-emerald-600 mt-0.5">Submit active daily shifts & extra hours</p>
                  </div>
                  <span className="text-emerald-600 font-bold text-sm">→</span>
                </button>

                <button
                  onClick={() => onNavigate('expenses')}
                  className="w-full text-left bg-amber-50 hover:bg-amber-100/75 text-amber-800 p-3.5 rounded-xl border border-amber-200/50 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="pointer-events-none">
                    <p className="text-xs font-extrabold uppercase tracking-wide">🪙 File Material Allowance spending</p>
                    <p className="text-[9.5px] text-amber-600 mt-0.5">Log fuel, tea & meals, or small tools</p>
                  </div>
                  <span className="text-amber-600 font-bold text-sm">→</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-[10px] text-slate-500 leading-snug mt-4 font-sans">
              🛡️ **Strict Scope Filter Active**: You are restricted to viewing and encoding for <strong>{assignedSite?.name}</strong>. Rate changes require CEO approvals.
            </div>
          </div>
        </div>

        {/* Recent logs breakdown on the active site for the supervisor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent petty cash logs list */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <span className="text-[10.5px] font-black text-slate-900 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 block font-sans">
              📋 Your Site Material Allowance Line Items
            </span>
            <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto pr-1">
              {filteredExpenses.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center italic">No material allowance items logged for this site yet.</p>
              ) : (
                filteredExpenses.map((exp) => (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-extrabold text-slate-800">{exp.description}</p>
                      <p className="text-[9.5px] text-slate-455 mt-0.5">{exp.date} • {exp.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-slate-900">{formatCurrency(exp.amount)}</p>
                      <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                        exp.reimbursed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {exp.reimbursed ? 'Reimbursed' : 'Claim Pending'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Attendance Logs List */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <span className="text-[10.5px] font-black text-slate-900 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 block font-sans">
              📅 Recent Attendance Logs
            </span>
            <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto pr-1">
              {filteredAttendance.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center italic">No attendance shift cards recorded yet.</p>
              ) : (
                filteredAttendance.slice(0, 8).map((att) => {
                  const workerName = workers.find(w => w.id === att.workerId)?.name || 'Laborer';
                  return (
                    <div key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-extrabold text-slate-800">{workerName}</p>
                        <p className="text-[9.5px] text-slate-455 mt-0.5 font-mono">
                          {att.date} • {att.status} ({att.status === 'Present' ? '8 hrs' : att.status === 'Half-Day' ? '4 hrs' : '0 hrs'})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-emerald-600">{formatCurrency(att.wageEarned)}</p>
                        <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full uppercase bg-slate-100 text-slate-650">
                          {att.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      id={containerId}
    >
      {/* Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <CuteCalendarDate dayName={dayName} monthName={monthName} dateNum={dateNum} yearNum={yearNum} />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 uppercase">Dashboard Overview</h1>
            <p className="text-xs text-slate-500">Real-time tracking of active sites, labor payroll budgets, and client receipts.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-[10px] uppercase font-mono tracking-wider text-slate-600 font-semibold self-start lg:self-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Offline Ledger Secure
        </div>
      </div>

      {/* Birthday corner for personnel */}
      <div className="bg-gradient-to-r from-amber-500/5 via-rose-500/5 to-indigo-500/5 border border-pink-100/60 rounded-xl p-4 shadow-xs relative overflow-hidden">
        <div className="absolute right-4 -top-6 w-20 h-20 rounded-full bg-pink-100 opacity-40 blur-xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-6 w-16 h-16 rounded-full bg-amber-100 opacity-50 blur-xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center text-lg shadow-2xs shrink-0 select-none">
              {birthdayWorkers.length > 0 ? '🎂' : '🍃'}
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-pink-700 tracking-wider flex items-center gap-1">
                <span>🎈 RL Crew Birthday Corner (201 Profile) 🎈</span>
              </h3>
              {birthdayWorkers.length > 0 ? (
                <p className="text-[11.5px] text-slate-700 mt-0.5 font-medium leading-relaxed">
                  We are celebrating a birthday today! Let's send greetings to:{' '}
                  {birthdayWorkers.map((w) => (
                    <span key={w.id} className="font-extrabold text-pink-900 bg-white/70 border border-pink-200 rounded-md px-2 py-0.5 mx-0.5 inline-block text-[11px] font-sans">
                      🎉 {w.name} ({w.role})
                    </span>
                  ))} 🥳🎁✨
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5 font-medium leading-normal">
                  No 201 employee birthdays today ({monthName} {dateNum}). Working hard, building dreams! 👷🛠️ Let's check back tomorrow!
                </p>
              )}
            </div>
          </div>
          
          {birthdayWorkers.length > 0 ? (
            <div className="bg-rose-500 text-white text-[9px] font-black font-mono px-3 py-1.5 rounded-lg border border-rose-600 shadow-2xs self-start sm:self-center uppercase tracking-widest animate-pulse whitespace-nowrap">
              🎁 CELEBRATING TODAY!
            </div>
          ) : (
            <div className="bg-slate-100 text-slate-400 text-[8.5px] font-bold font-mono px-2.5 py-1 rounded-md border border-slate-200 self-start sm:self-center uppercase tracking-wider whitespace-nowrap">
              ✨ No birthdays today
            </div>
          )}
        </div>
      </div>

      {/* Realtime Bulletin Board for site policies, safety drills & updates */}
      <AnnouncementsSection 
        announcements={announcements} 
        onSaveAnnouncements={onSaveAnnouncements} 
        currentRole={currentRole} 
      />



      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Sites */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:bg-slate-50/20">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Active Sites</span>
            <div className="text-sky-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{activeSites.length}</p>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Total {sites.length} registered</p>
            </div>
            <button 
              onClick={() => onNavigate('sites')}
              className="text-[10px] uppercase tracking-wider text-sky-600 hover:text-sky-850 font-bold flex items-center gap-0.5 group cursor-pointer"
            >
              Manage
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Roster & Crew */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:bg-slate-50/20">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Roster & Crew</span>
            <div className="text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{activeWorkersCount}</p>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Workers active today</p>
            </div>
            <button 
              onClick={() => onNavigate('attendance')}
              className="text-[10px] uppercase tracking-wider text-emerald-600 hover:text-emerald-850 font-bold flex items-center gap-0.5 group cursor-pointer"
            >
              Attendance
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Expenses Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:bg-slate-50/20 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Daily Expenditures</span>
            <div className="text-yellow-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">{formatCurrency(totalSiteExpenses)}</p>
            <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono whitespace-nowrap overflow-hidden">
              <span className="bg-yellow-50 text-yellow-850 px-1 rounded border border-yellow-200/50">
                Labor: {formatCurrency(totalLaborCost)}
              </span>
              <span className="bg-sky-50 text-sky-850 px-1 rounded border border-sky-200/50">
                Petty: {formatCurrency(totalSupervisorCost)}
              </span>
            </div>
          </div>
          {warningsCount > 0 && (
            <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-rose-50 text-rose-750 px-1 py-0.5 rounded-sm border border-rose-100 text-[8px] font-bold uppercase tracking-wider">
              <AlertTriangle className="w-2.5 h-2.5 text-rose-650" />
              {warningsCount} Warning
            </div>
          )}
        </div>

        {/* Card 4: Client Payments */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:bg-slate-50/20">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Client Payments</span>
            <div className="text-indigo-600">
              <PhilippinePeso className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-black text-indigo-650 tracking-tight font-mono">{formatCurrency(totalClientPayments)}</p>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">
                Pending: <span className="font-bold text-rose-600">{formatCurrency(totalOutstandingBalance)}</span>
              </p>
            </div>
            <button 
              onClick={() => onNavigate('sites')}
              className="text-[10px] uppercase tracking-wider text-indigo-600 hover:text-indigo-850 font-bold flex items-center gap-0.5 group cursor-pointer"
            >
              Collect
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Construction Sites Progress comparison */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            Budget Utilization & Client Billings
          </h2>
          
          <div className="space-y-4">
            {filteredSites.map((site) => {
              const actualCost = getSiteTotalCost(site.id, filteredAttendance, filteredExpenses);
              const paymentsReceived = getSiteClientPayments(site.id, filteredPayments);
              
              // Percentages
              const budgetPercent = Math.min(100, (actualCost / site.budgetLimit) * 100);
              const billingPercent = Math.min(100, (paymentsReceived / site.projectValue) * 100);
              const isOverBudget = actualCost > site.budgetLimit;

              return (
                <div key={site.id} className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50/50 transition-colors bg-slate-50/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-2.5">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">{site.name}</h3>
                      <p className="text-[10px] text-slate-405 font-mono truncate max-w-xs">{site.location}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full uppercase tracking-wider border ${
                        site.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        site.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-slate-150 text-slate-650 border-slate-250'
                      }`}>
                        {site.status}
                      </span>
                      {currentRole !== 'Client' ? (
                        <button
                          onClick={() => onNavigate('sites', site.id)}
                          className="text-[9px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-sm transition-colors cursor-pointer"
                        >
                          Manage
                        </button>
                      ) : (
                        <span className="text-[8px] font-black tracking-wider uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                          PROJECT ASSOCIATED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Budget vs Expenses Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Expenses vs Budget:</span>
                        <span className={`font-mono font-bold ${isOverBudget ? 'text-rose-600' : 'text-slate-700'}`}>
                          {formatCurrency(actualCost)} / {formatCurrency(site.budgetLimit)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/50">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${budgetPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-slate-400">
                        <span>L: {formatCurrency(getSiteLaborCost(site.id, filteredAttendance))} | P: {formatCurrency(getSiteSupervisorCost(site.id, filteredExpenses))}</span>
                        <span className={`font-semibold ${isOverBudget ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                          {budgetPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Milestone billings vs Received */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Collected vs Value:</span>
                        <span className="font-mono font-bold text-slate-705">
                          {formatCurrency(paymentsReceived)} / {formatCurrency(site.projectValue)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div 
                          className="h-full bg-indigo-550 rounded-full transition-all duration-500"
                          style={{ width: `${billingPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-slate-400">
                        <span>Balance: {formatCurrency(getSiteClientBalance(site, payments))}</span>
                        <span className="font-semibold text-indigo-600 font-bold">
                          {billingPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Site Supervisor Expense Breakdown */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <Clock className="w-3.5 h-3.5 text-yellow-500" />
            Supervisor Cash Log
          </h2>
          <p className="text-[11px] text-slate-400 mb-3">Supervisor petty spending categories across site vouchers.</p>

          <div className="flex-1 space-y-3">
            {categories.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-300">
                <ShieldCheck className="w-10 h-10 stroke-1 mb-1.5 text-slate-200" />
                <p className="text-xs font-bold text-slate-405">No expenses logged</p>
                <p className="text-[10px] text-slate-400">Voucher receipts are empty.</p>
              </div>
            ) : (
              categories.map((cat, index) => {
                const percent = (cat.value / totalSupervisorCost) * 100;
                return (
                  <div key={index} className="space-y-1 bg-slate-50/50 p-1.5 rounded border border-slate-150/70">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                        <span className="font-bold text-slate-700 uppercase text-[10px]">{cat.name}</span>
                      </div>
                      <span className="font-mono text-slate-900 font-bold">{formatCurrency(cat.value)}</span>
                    </div>
                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${cat.color}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-right text-[8px] font-mono text-slate-400">
                      {percent.toFixed(1)}% of petty cash
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[11px] font-medium text-slate-650">
            <span>UNREIMBURSED PETTY CLAIMS:</span>
            <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 text-[11px]">
              {formatCurrency(expenses.filter(e => !e.reimbursed).reduce((s, e) => s + e.amount, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* ARTISTIC COMPANY ORGANIZATIONAL CHART (CEO, Secretary, Site Supervisor) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-yellow-500" />
            RL Design & Construction Executive Chart
          </h2>
          <p className="text-[11px] text-slate-500">Corporate leadership structure and supervising directory hierarchy.</p>
        </div>

        {/* Artistic Chart Flow Chart */}
        <div className="relative p-6 bg-slate-950 rounded-2xl border border-slate-900 overflow-hidden min-h-[340px] flex flex-col justify-between">
          {/* Subtle design grids */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
          
          {/* Top Layer: Co-Executives */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-0.5 rounded-2xl shadow-xl transform hover:scale-[1.02] transition-transform duration-300">
              <div className="bg-neutral-950 px-5 py-4 rounded-[14px] text-center w-[220px] space-y-1">
                <span className="bg-yellow-400/20 text-yellow-400 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full font-mono">
                  CHIEF EXECUTIVE (CEO)
                </span>
                <h3 className="text-white text-sm font-black tracking-tight select-all">Ronald C. Famorca</h3>
                <p className="text-[9.5px] text-slate-400">Founder & Principal Contractor</p>
                <div className="text-[8px] font-mono font-bold text-emerald-400 flex items-center justify-center gap-1 pt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  FOUNDER EXECUTIVE
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-0.5 rounded-2xl shadow-xl transform hover:scale-[1.02] transition-transform duration-300">
              <div className="bg-neutral-950 px-5 py-4 rounded-[14px] text-center w-[220px] space-y-1">
                <span className="bg-yellow-400/20 text-yellow-400 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full font-mono">
                  CEO & HEAD OF HR
                </span>
                <h3 className="text-white text-sm font-black tracking-tight select-all">Ericka Famorca</h3>
                <p className="text-[9.5px] text-slate-400">People Strategy & HR Director</p>
                <div className="text-[8px] font-mono font-bold text-emerald-400 flex items-center justify-center gap-1 pt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  BOARD EXECUTIVE
                </div>
              </div>
            </div>
          </div>

          {/* Connected SVG lines */}
          <div className="absolute inset-0 pointer-events-none hidden md:block">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Lines from CEO to Corporate Secretary */}
              <path d="M 384, 85 L 192, 180" stroke="#facc15" strokeWidth="1.5" strokeDasharray="3,3" fill="none" opacity="0.4" />
              {/* Lines from CEO to Site Liaison */}
              <path d="M 384, 85 L 384, 180" stroke="#facc15" strokeWidth="1.5" strokeDasharray="3,3" fill="none" opacity="0.4" />
              {/* Lines from CEO to Design Lead */}
              <path d="M 384, 85 L 576, 180" stroke="#facc15" strokeWidth="1.5" strokeDasharray="3,3" fill="none" opacity="0.4" />
            </svg>
          </div>

          {/* Middle & Bottom Layer: Secretary & Site Specialists */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 md:pt-4">
            
            {/* Left: Secretary */}
            <div className="flex flex-col items-center">
              <div className="bg-gradient-to-b from-indigo-500/30 to-indigo-700/10 p-0.5 rounded-2xl border border-indigo-500/20 shadow-lg w-[200px] hover:border-indigo-500/40 transition-colors">
                <div className="bg-neutral-900/90 px-4 py-4 rounded-[14px] text-center space-y-1">
                  <span className="bg-indigo-950/80 text-indigo-400 text-[8.5px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full font-mono">
                    CORPORATE SECRETARY
                  </span>
                  <h4 className="text-white text-xs font-black tracking-tight select-all">Sheena Mae Serrano</h4>
                  <p className="text-[9px] text-slate-400">Head of Office & Receivables</p>
                  <div className="text-[8px] font-mono text-indigo-400 pt-1">Finance & Client Billings</div>
                </div>
              </div>
            </div>

            {/* Middle: Site supervisor / engineer */}
            <div className="flex flex-col items-center">
              <div className="bg-gradient-to-b from-emerald-500/30 to-emerald-700/10 p-0.5 rounded-2xl border border-emerald-500/20 shadow-lg w-[200px] hover:border-emerald-500/40 transition-colors">
                <div className="bg-neutral-900/90 px-4 py-4 rounded-[14px] text-center space-y-1">
                  <span className="bg-emerald-950/80 text-emerald-405 text-[8.5px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full font-mono">
                    SITE SUPERVISOR
                  </span>
                  <h4 className="text-white text-xs font-black tracking-tight select-all">Primary Project Supervisor</h4>
                  <p className="text-[9px] text-slate-400">Engineering fit-out & safety coordinator</p>
                  <div className="text-[8px] font-mono text-emerald-400 pt-1">On-Site Logistics active</div>
                </div>
              </div>
            </div>

            {/* Right: Design Supervisor */}
            <div className="flex flex-col items-center">
              <div className="bg-gradient-to-b from-yellow-500/20 to-yellow-700/10 p-0.5 rounded-2xl border border-yellow-500/20 shadow-lg w-[200px] hover:border-yellow-500/40 transition-colors">
                <div className="bg-neutral-900/90 px-4 py-4 rounded-[14px] text-center space-y-1">
                  <span className="bg-yellow-950/80 text-yellow-550 text-[8.5px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full font-mono">
                    PLAN & DRAWING SPECIALIST
                  </span>
                  <h4 className="text-white text-xs font-black tracking-tight">Design & Blueprint Coordinator</h4>
                  <p className="text-[9px] text-slate-400">Architecture plan & draft approvals</p>
                  <div className="text-[8px] font-mono text-yellow-405 pt-1">Client layouts ledger</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Quick Access Helper Alert */}
      <div className="bg-black text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-neutral-800">
        <div className="space-y-0.5 text-center sm:text-left">
          <h3 className="font-bold text-sm text-yellow-400 uppercase tracking-wider">Local Site-Supervisor Workspace Mode</h3>
          <p className="text-[11px] text-slate-400 max-w-md">Wages and advances logged in this device are stored locally to prevent losing data during remote field shifts with weak network coverage.</p>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          <button 
            onClick={() => onNavigate('expenses')}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer uppercase tracking-wider text-[10px]"
          >
            Petty Expenses
          </button>
          <button 
            onClick={() => onNavigate('attendance')}
            className="bg-white hover:bg-slate-100 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer uppercase tracking-wider text-[10px]"
          >
            Daily Attendance
          </button>
        </div>
      </div>
    </motion.div>
  );
}
