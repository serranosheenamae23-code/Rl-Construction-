/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  MapPin, 
  User, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  FileSpreadsheet, 
  Building,
  Users,
  Calendar,
  Layers,
  Award,
  Settings,
  X,
  Mail,
  Phone,
  Save,
  Check,
  Percent
} from 'lucide-react';
import { ConstructionSite, ClientPayment, AttendanceRecord, ExpenseRecord, Worker, AdditionalScopeItem } from '../types';

interface ProjectMasterlistProps {
  sites: ConstructionSite[];
  payments: ClientPayment[];
  attendance: AttendanceRecord[];
  expenses: ExpenseRecord[];
  workers: Worker[];
  additionalScopes?: AdditionalScopeItem[];
  onUpdateSite?: (siteId: string, updates: Partial<ConstructionSite>) => Promise<void>;
}

export default function ProjectMasterlist({ 
  sites, 
  payments, 
  attendance, 
  expenses,
  workers = [],
  additionalScopes = [],
  onUpdateSite
}: ProjectMasterlistProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom config states
  const [editingSite, setEditingSite] = useState<ConstructionSite | null>(null);
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editCommissionAmount, setEditCommissionAmount] = useState<number | ''>('');
  const [editCommissionPersonnel, setEditCommissionPersonnel] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Local helper calculations
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getSiteRunningExpenses = (siteId: string) => {
    // 1. Labor cost
    const labor = attendance
      .filter((a) => a.siteId === siteId && a.status !== 'Absent')
      .reduce((sum, current) => sum + (current.wageEarned || 0), 0);

    // 2. Petty cash / Supervisor spent
    const petty = expenses
      .filter((e) => e.siteId === siteId)
      .reduce((sum, current) => sum + (current.amount || 0), 0);

    return labor + petty;
  };

  const getSiteClientPayments = (siteId: string) => {
    return payments
      .filter((p) => p.siteId === siteId && p.status !== 'Draft')
      .reduce((sum, current) => sum + (current.amount || 0), 0);
  };

  const getSiteAdditionalScopeSum = (siteId: string) => {
    return additionalScopes
      .filter((as) => as.siteId === siteId)
      .reduce((sum, current) => sum + (current.amount || 0), 0);
  };

  const getSiteAssignedWorkersCount = (siteId: string) => {
    return workers.filter((w) => w.assignedSiteId === siteId || w.assignedSiteIds?.includes(siteId)).length;
  };

  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.commissionPersonnel && s.commissionPersonnel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Global aggregate metrics
  const totalTCP = sites.reduce((sum, s) => sum + s.projectValue, 0);
  const totalAdditionalTCP = sites.reduce((sum, s) => sum + getSiteAdditionalScopeSum(s.id), 0);
  const totalExpenses = sites.reduce((sum, s) => sum + getSiteRunningExpenses(s.id), 0);
  const totalCollections = sites.reduce((sum, s) => sum + getSiteClientPayments(s.id), 0);
  const totalMargin = (totalTCP + totalAdditionalTCP) - totalExpenses;
  const totalCommission = sites.reduce((sum, s) => sum + (s.commissionAmount || 0), 0);

  const exportToSheetsCSV = () => {
    const headers = [
      'Project Site Name', 
      'Location Scope', 
      'Client Name', 
      'Client Contact', 
      'Client Email',
      'Start Date',
      'End Date',
      'Workers Count',
      'Base Contract Price (TCP)', 
      'Additional Scope TCP',
      'Total Project TCP (Base + Additional)',
      'Running Expenses (PHP)', 
      'Total Collected Client Payments', 
      'Computed Net Income & Margin',
      'Referral Personnel Name',
      'Referral Custom Commission'
    ];
    
    const rows = filteredSites.map(s => {
      const tcp = s.projectValue;
      const expensesVal = getSiteRunningExpenses(s.id);
      const addScopeTCP = getSiteAdditionalScopeSum(s.id);
      const totalProjectVal = tcp + addScopeTCP;
      const income = totalProjectVal - expensesVal;
      const workersAssignedCount = getSiteAssignedWorkersCount(s.id);
      
      return [
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.location.replace(/"/g, '""')}"`,
        `"${s.clientName.replace(/"/g, '""')}"`,
        `"${(s.clientPhone || '').replace(/"/g, '""')}"`,
        `"${(s.clientEmail || '').replace(/"/g, '""')}"`,
        `"${s.startDate || ''}"`,
        `"${s.endDate || ''}"`,
        workersAssignedCount,
        tcp,
        addScopeTCP,
        totalProjectVal,
        expensesVal,
        getSiteClientPayments(s.id),
        income,
        `"${(s.commissionPersonnel || '').replace(/"/g, '""')}"`,
        s.commissionAmount || 0
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'RL_Project_Comprehensive_Masterlist.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenEdit = (site: ConstructionSite) => {
    setEditingSite(site);
    setEditClientEmail(site.clientEmail || '');
    setEditEndDate(site.endDate || '');
    setEditCommissionAmount(site.commissionAmount !== undefined ? site.commissionAmount : '');
    setEditCommissionPersonnel(site.commissionPersonnel || '');
    setEditStartDate(site.startDate || '');
    setEditClientPhone(site.clientPhone || '');
  };

  const handleSaveSiteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite || !onUpdateSite) return;
    
    setIsSaving(true);
    try {
      await onUpdateSite(editingSite.id, {
        clientEmail: editClientEmail.trim(),
        endDate: editEndDate,
        commissionAmount: editCommissionAmount === '' ? 0 : Number(editCommissionAmount),
        commissionPersonnel: editCommissionPersonnel.trim(),
        startDate: editStartDate,
        clientPhone: editClientPhone.trim()
      });
      setEditingSite(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 id="masterlist-title" className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <Briefcase className="w-5 h-5 text-yellow-500" />
            Project Masterlist Ledger
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            RL Construction corporate dashboard tracking contract, timeline schedules, collections, and dual-source income margins.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:max-w-xl justify-end">
          <button
            id="csv-export-master"
            onClick={exportToSheetsCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-bold tracking-wider px-4 py-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-xs min-h-[38px]"
            title="Download fully structured CSV ledger spreadsheet for Excel or Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Google Sheets Export</span>
          </button>

          <div className="relative max-w-xs w-full">
            <input
              id="search-box-master"
              type="text"
              placeholder="Search Project, Client, Referrer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-yellow-500 min-h-[38px] text-slate-900 font-medium"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
          </div>
        </div>
      </div>

      {/* Corporate Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div id="summary-card-base" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Contract Base TCP</p>
          <p className="text-[15px] font-black text-slate-900 mt-1">{formatCurrency(totalTCP)}</p>
          <div className="text-[9px] text-slate-400 font-medium mt-1 leading-none">{sites.length} Active locations</div>
        </div>

        <div id="summary-card-additional" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-amber-600">Add'l Scope SOW TCP</p>
          <p className="text-[15px] font-black text-amber-700 mt-1">+{formatCurrency(totalAdditionalTCP)}</p>
          <div className="text-[9px] text-slate-400 font-medium mt-1 leading-none">Additional work agreements value</div>
        </div>

        <div id="summary-card-expenses" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Running Expenses</p>
          <p className="text-[15px] font-black text-rose-600 mt-1">{formatCurrency(totalExpenses)}</p>
          <div className="text-[9px] text-slate-400 mt-1 leading-none">Workforce wages & petty cash spent</div>
        </div>

        <div id="summary-card-commission" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs bg-amber-50/20">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block">Referred Commissions</p>
          <p className="text-[15px] font-black text-amber-800 mt-1">{formatCurrency(totalCommission)}</p>
          <div className="text-[9px] text-slate-400 mt-1 leading-none">Referral payouts with company referrers</div>
        </div>

        <div id="summary-card-income" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-1 sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Computed Net Income</p>
          <p className={`text-[15px] font-black mt-1 ${totalMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(totalMargin)}
          </p>
          <div className="text-[9px] text-slate-400 mt-1 leading-none flex items-center gap-1">
            {totalMargin >= 0 ? (
              <span className="text-emerald-600 font-bold flex items-center">
                <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> Profit Zone
              </span>
            ) : (
              <span className="text-rose-500 font-bold flex items-center">
                <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> Deficit Zone
              </span>
            )}
            estimated upon payout
          </div>
        </div>
      </div>

      {/* Main Ledger Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-[9px] uppercase tracking-wider font-extrabold text-neutral-300">
                <th className="p-3.5 pl-4 rounded-tl-xl">Project Location Schedule</th>
                <th className="p-3.5">Client Contact Credentials</th>
                <th className="p-3.5 text-center">Labor Assigned</th>
                <th className="p-3.5 text-right">Base TCP (₱)</th>
                <th className="p-3.5 text-right text-amber-500">Add'l Scope SOW (₱)</th>
                <th className="p-3.5 text-right text-rose-400 font-mono">Running Costs (₱)</th>
                <th className="p-3.5 text-right text-emerald-400">Collected Income (₱)</th>
                <th className="p-3.5 text-right">Total Net Income (₱)</th>
                <th className="p-3.5 text-left">Custom Referral Commission</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
              {filteredSites.length > 0 ? (
                filteredSites.map((site) => {
                  const expensesValue = getSiteRunningExpenses(site.id);
                  const collected = getSiteClientPayments(site.id);
                  const addScopeValue = getSiteAdditionalScopeSum(site.id);
                  const totalProjectRevenue = site.projectValue + addScopeValue;
                  const margin = totalProjectRevenue - expensesValue;
                  const marginPercent = totalProjectRevenue ? Math.round((margin / totalProjectRevenue) * 100) : 0;
                  const workersCount = getSiteAssignedWorkersCount(site.id);

                  return (
                    <tr key={site.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Project location schedule details */}
                      <td className="p-3.5 pl-4 max-w-[220px]">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 leading-snug">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{site.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-1 leading-none">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{site.location}</span>
                        </div>
                        
                        {/* Start & End Dates details */}
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-col gap-0.5 text-[9px] text-slate-450 font-semibold font-mono">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Start Date: <strong>{site.startDate || 'Unspecified'}</strong></span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-600">
                            <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Target End: <strong>{site.endDate || 'Ongoing / TBD'}</strong></span>
                          </div>
                        </div>
                      </td>

                      {/* Client contact parameters */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {site.clientName}
                        </div>
                        
                        {/* Phone & Email contact details */}
                        <div className="mt-1.5 space-y-0.5 font-mono text-[9px] text-slate-550">
                          <div className="flex items-center gap-1 text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{site.clientPhone || 'No contact'}</span>
                          </div>
                          {site.clientEmail && (
                            <div className="flex items-center gap-1 text-slate-500" title={site.clientEmail}>
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="max-w-[130px] truncate">{site.clientEmail}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Workers assigned headcount */}
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-lg ${
                          workersCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <Users className="w-3.5 h-3.5" />
                          <span>{workersCount} {workersCount === 1 ? 'Worker' : 'Workers'}</span>
                        </span>
                      </td>

                      {/* Base TCP */}
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(site.projectValue)}
                      </td>

                      {/* Additional scope TCP sum */}
                      <td className="p-3.5 text-right font-mono font-bold text-amber-700">
                        {addScopeValue > 0 ? `+${formatCurrency(addScopeValue)}` : '₱0.00'}
                      </td>

                      {/* Running Expenses costs (labor + petty cash) */}
                      <td className="p-3.5 text-right font-mono font-semibold text-rose-600">
                        {formatCurrency(expensesValue)}
                      </td>

                      {/* Client Payments Collected */}
                      <td className="p-3.5 text-right font-mono font-semibold text-emerald-600">
                        {formatCurrency(collected)}
                      </td>

                      {/* Total Net Income Margin: (Project Base TCP + Additional TCP) - Expenses */}
                      <td className="p-3.5 text-right">
                        <div className={`font-mono font-black ${margin >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                          {formatCurrency(margin)}
                        </div>
                        <div className={`text-[9px] font-semibold flex items-center justify-end gap-0.5 mt-0.5 ${margin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {margin >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          <span>{marginPercent}% Surplus</span>
                        </div>
                      </td>

                      {/* Referral custom commission */}
                      <td className="p-3.5 max-w-[150px]">
                        {site.commissionPersonnel ? (
                          <div className="space-y-1 bg-amber-50/40 p-1.5 rounded-lg border border-amber-100">
                            <div className="font-extrabold text-amber-900 flex items-center gap-1 uppercase text-[8px] tracking-wide">
                              <Award className="w-2.5 h-2.5 text-amber-600" />
                              <span>Referrer</span>
                            </div>
                            <p className="text-[10px] font-semibold text-slate-800 truncate" title={site.commissionPersonnel}>
                              {site.commissionPersonnel}
                            </p>
                            <p className="font-mono text-[10.5px] font-black text-amber-800">
                              {formatCurrency(site.commissionAmount || 0)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">No Commission</span>
                        )}
                      </td>

                      {/* Project state status badge */}
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg border ${
                          site.status === 'active' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          site.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          site.status === 'planning' ? 'bg-sky-100 text-sky-850 border-sky-200 animate-pulse' :
                          site.status === 'on-hold' ? 'bg-rose-100 text-rose-850 border-rose-200' :
                          'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {site.status}
                        </span>
                      </td>

                      {/* Configure actions modal pop */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleOpenEdit(site)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-200 text-center flex items-center justify-center mx-auto"
                          title="Configure Schedule, Contacts, and Referral Commission rewards"
                        >
                          <Settings className="w-4 h-4 text-slate-400 hover:text-slate-900" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="text-center p-16 text-slate-450 italic font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Briefcase className="w-8 h-8 text-slate-200" />
                      <p className="font-bold text-slate-600 mb-1">No matching project records found.</p>
                      <p className="text-[10px] text-slate-400 max-w-sm font-normal">Check search term filters or verify if project sites are listed under the Billings Ledger module.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Polish Configure referrals, dates, contact parameters overlay and modal */}
      <AnimatePresence>
        {editingSite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 text-left max-w-md w-full shadow-xl overflow-hidden"
            >
              {/* Modal header details element */}
              <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                <div>
                  <span className="text-[9px] uppercase font-extrabold text-yellow-500 tracking-wider font-mono">
                    Project Configuration Parameterizer
                  </span>
                  <h3 className="text-sm font-black uppercase mt-1 tracking-tight">
                    {editingSite.name}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingSite(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-450 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form panel container workspace */}
              <form onSubmit={handleSaveSiteConfig} className="p-6 space-y-4 text-xs font-medium text-slate-700">
                
                {/* Dates Schedule configuration details section */}
                <div className="space-y-3">
                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest border-b pb-1">
                    📅 Schedule Schedule Timeline
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Start Date</label>
                      <input
                        type="date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-yellow-500 focus:outline-hidden text-slate-800 font-mono text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Target End Date</label>
                      <input
                        type="date"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-yellow-500 focus:outline-hidden text-slate-800 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Client contacts config section */}
                <div className="space-y-3 pt-1">
                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest border-b pb-1">
                    👤 Client Representative Contact
                  </span>
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Contact Phone Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 09389027195"
                        value={editClientPhone}
                        onChange={(e) => setEditClientPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-yellow-500 focus:outline-hidden text-slate-900 font-mono text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Client E-Mail Address</label>
                      <input
                        type="email"
                        placeholder="e.g. representative@client.com"
                        value={editClientEmail}
                        onChange={(e) => setEditClientEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-yellow-500 focus:outline-hidden text-slate-950 text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Referral commission personnel section configuration */}
                <div className="space-y-3 pt-1">
                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest border-b pb-1">
                    🎁 Company Referrer Referral Fees
                  </span>
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Referrer Personnel name</label>
                      <input
                        type="text"
                        placeholder="e.g. Juan De La Cruz (marketing)"
                        value={editCommissionPersonnel}
                        onChange={(e) => setEditCommissionPersonnel(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-yellow-500 focus:outline-hidden text-slate-900"
                      />
                      <p className="text-[8.5px] text-slate-400 mt-0.5 font-sans leading-none">The staff or agent who referred the company to start this contract segment</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Referral Commission Share (₱)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold font-mono">₱</span>
                        <input
                          type="number"
                          placeholder="e.g. 15000"
                          value={editCommissionAmount}
                          onChange={(e) => setEditCommissionAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-3 py-1.5 focus:border-yellow-500 focus:outline-hidden font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit configure options actions */}
                <div className="pt-4 border-t flex justify-end gap-2 text-[10px] uppercase font-bold tracking-wider">
                  <button
                    type="button"
                    onClick={() => setEditingSite(null)}
                    className="px-4 py-2 hover:bg-slate-100 text-slate-500 rounded-lg cursor-pointer transition-colors"
                  >
                    Close Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-yellow-400 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? (
                      <span>Saving config...</span>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 text-yellow-500" />
                        <span>Save Configuration</span>
                      </>
                    )}
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
