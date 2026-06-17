/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Receipt, 
  Calendar, 
  Plus, 
  Search, 
  PhilippinePeso, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  MapPin, 
  Coins, 
  FileText,
  Clock,
  ThumbsUp,
  CreditCard,
  Trash2,
  ListFilter,
  User,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { ExpenseRecord, ConstructionSite, UserRole, SupervisorFund } from '../types';
import { formatCurrency } from '../utils';

interface SupervisorExpensesProps {
  expenses: ExpenseRecord[];
  sites: ConstructionSite[];
  onAddExpense: (expense: Omit<ExpenseRecord, 'id'>) => void;
  onToggleReimbursed: (expenseId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  currentRole?: UserRole;
  assignedSiteId?: string;
  supervisorFunds?: SupervisorFund[];
  onAddSupervisorFund?: (fund: Omit<SupervisorFund, 'id'>) => void;
  onDeleteSupervisorFund?: (fundId: string) => void;
}

export default function SupervisorExpenses({
  expenses,
  sites,
  onAddExpense,
  onToggleReimbursed,
  onDeleteExpense,
  currentRole = 'Admin',
  assignedSiteId = '',
  supervisorFunds = [],
  onAddSupervisorFund,
  onDeleteSupervisorFund,
}: SupervisorExpensesProps) {
  const containerId = useId();
  // Filter States
  const [siteFilter, setSiteFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [reimbursementFilter, setReimbursementFilter] = useState('all'); // all, reimbursed, pending

  // Full Screen State
  const [isFullScreenView, setIsFullScreenView] = useState(false);
  const [fullSearch, setFullSearch] = useState('');
  const [fullSite, setFullSite] = useState('all');
  const [fullCategory, setFullCategory] = useState('all');
  const [fullStatus, setFullStatus] = useState('all');

  // Switch between Claims Ledger and Fund Allocations Ledger
  const [ledgerSubTab, setLedgerSubTab] = useState<'claims' | 'allocations'>('claims');

  // New Expense form state
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expenseSiteId, setExpenseSiteId] = useState<string>(
    currentRole === 'Admin' ? (sites[0]?.id || '') : assignedSiteId
  );
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseRecord['category']>('Fuel');
  const [expenseDesc, setExpenseDesc] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<number>(50);
  const [expenseMethod, setExpenseMethod] = useState<ExpenseRecord['paymentMethod']>('Petty Cash');

  // New Fund form state
  const [fundDate, setFundDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fundSiteId, setFundSiteId] = useState<string>(
    currentRole === 'Admin' ? (sites[0]?.id || '') : assignedSiteId
  );
  const [fundAmount, setFundAmount] = useState<number>(5000);
  const [fundNotes, setFundNotes] = useState<string>('');
  const [fundGivenBy, setFundGivenBy] = useState<string>('Admin / Owner');

  const [formError, setFormError] = useState('');
  const [fundFormError, setFundFormError] = useState('');
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRecord | null>(null);
  const [fundToDelete, setFundToDelete] = useState<SupervisorFund | null>(null);

  // Submit Expense Handler
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseSiteId || !expenseDesc || expenseAmount <= 0) {
      setFormError('Please select a construction site, write an item description, and enter an amount > 0.');
      return;
    }

    const selectedSite = sites.find(s => s.id === expenseSiteId);
    const supervisorToSave = supervisorName.trim() || selectedSite?.supervisorName || 'Site Supervisor';

    onAddExpense({
      date: expenseDate,
      siteId: expenseSiteId,
      supervisorName: supervisorToSave,
      category: expenseCategory,
      description: expenseDesc,
      amount: Number(expenseAmount),
      paymentMethod: expenseMethod,
      reimbursed: false,
    });

    // Reset some inputs
    setExpenseDesc('');
    setExpenseAmount(50);
    setFormError('');
  };

  // Submit Fund Handler
  const handleSubmitFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundSiteId || fundAmount <= 0) {
      setFundFormError('Please select a construction site & enter an amount > 0.');
      return;
    }

    if (!onAddSupervisorFund) return;

    const selectedSite = sites.find(s => s.id === fundSiteId);
    const supervisorToSave = selectedSite?.supervisorName || 'Site Supervisor';

    onAddSupervisorFund({
      date: fundDate,
      siteId: fundSiteId,
      supervisorName: supervisorToSave,
      amount: Number(fundAmount),
      notes: fundNotes.trim() || 'Urgent site budget mobilization allowance',
      givenBy: fundGivenBy,
    });

    setFundAmount(5000);
    setFundNotes('');
    setFundFormError('');
  };

  const effectiveSiteFilter = currentRole === 'Admin' ? siteFilter : assignedSiteId;

  // Filter Expense Records
  const filteredExpenses = expenses.filter((exp) => {
    // Exclude expenses that are pinned to unknown/deleted sites
    const associatedSite = sites.find(s => s.id === exp.siteId);
    if (!associatedSite) return false;

    const matchesSite = effectiveSiteFilter === 'all' || exp.siteId === effectiveSiteFilter;
    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
    
    let matchesReimbursed = true;
    if (reimbursementFilter === 'reimbursed') matchesReimbursed = exp.reimbursed;
    if (reimbursementFilter === 'pending') matchesReimbursed = !exp.reimbursed;

    return matchesSite && matchesCategory && matchesReimbursed;
  });

  // Filter Fund Allocations
  const filteredFunds = supervisorFunds.filter((fund) => {
    const associatedSite = sites.find(s => s.id === fund.siteId);
    if (!associatedSite) return false;

    const matchesSite = effectiveSiteFilter === 'all' || fund.siteId === effectiveSiteFilter;
    return matchesSite;
  });

  // Financial Stats of filtered claims
  const totalClaimsSum = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalReimbursedSum = filteredExpenses.filter(e => e.reimbursed).reduce((sum, e) => sum + e.amount, 0);
  const totalPendingSum = filteredExpenses.filter(e => !e.reimbursed).reduce((sum, e) => sum + e.amount, 0);

  // Cash received & remaining balance calculations (Petty Cash specific)
  const totalCashAllocatedSum = filteredFunds.reduce((sum, f) => sum + f.amount, 0);
  const totalPettySpendSum = filteredExpenses
    .filter(e => e.paymentMethod === 'Petty Cash')
    .reduce((sum, e) => sum + e.amount, 0);
  const pettyCashBalance = totalCashAllocatedSum - totalPettySpendSum;

  // Full Screen Filtered Expense Claims Calculations
  const fullScreenFiltered = expenses.filter((exp) => {
    const associatedSite = sites.find(s => s.id === exp.siteId);
    if (!associatedSite) return false;

    const matchesSite = fullSite === 'all' || exp.siteId === fullSite;
    const matchesCategory = fullCategory === 'all' || exp.category === fullCategory;
    
    let matchesStatus = true;
    if (fullStatus === 'reimbursed') matchesStatus = exp.reimbursed;
    if (fullStatus === 'pending') matchesStatus = !exp.reimbursed;

    const searchStr = `${exp.description} ${exp.supervisorName} ${exp.paymentMethod} ${exp.category} ${associatedSite.name}`.toLowerCase();
    const matchesSearch = searchStr.includes(fullSearch.toLowerCase());

    return matchesSite && matchesCategory && matchesStatus && matchesSearch;
  });

  const fullScreenTotalAmount = fullScreenFiltered.reduce((sum, e) => sum + e.amount, 0);
  const fullScreenPaidAmount = fullScreenFiltered.filter(e => e.reimbursed).reduce((sum, e) => sum + e.amount, 0);
  const fullScreenPendingAmount = fullScreenFiltered.filter(e => !e.reimbursed).reduce((sum, e) => sum + e.amount, 0);

  // Auto-fill supervisor name based on site selection
  const handleSiteChange = (siteId: string) => {
    setExpenseSiteId(siteId);
    const siteObj = sites.find(s => s.id === siteId);
    if (siteObj) {
      setSupervisorName(siteObj.supervisorName);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id={containerId}>
      
      {/* LEFT COLUMN: Field Supervisor Logger Forms Column (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        
        {/* FORM 1: Supervisor Cash Voucher filing */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-150">
            <Coins className="w-4 h-4 text-amber-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Supervisor Cash & Material Allowance Voucher</h2>
          </div>
          <p className="text-[11px] text-slate-400">Site supervisors can file quick receipts for fuel, tea, materials, or small tools directly below.</p>

          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700 font-bold uppercase tracking-wide flex items-center gap-2 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitExpense} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Date Logged</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-xs rounded-lg px-2.5 py-1 text-slate-900 font-medium font-mono"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Target Site</label>
                {currentRole === 'Admin' ? (
                  <select
                    value={expenseSiteId}
                    onChange={(e) => handleSiteChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-xs rounded-lg px-2 py-1 text-slate-900 cursor-pointer font-medium"
                  >
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full bg-slate-100 border border-slate-150 text-xs rounded-lg px-2.5 py-1.5 text-slate-800 font-bold select-none truncate">
                    {sites.find(s => s.id === assignedSiteId)?.name || 'N/A'}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-0.5 block">
              <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Filing Supervisor Name</label>
              <input
                type="text"
                placeholder="Supervisor on site"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-xs rounded-lg px-2.5 py-1.5 text-slate-900 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as ExpenseRecord['category'])}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-xs rounded-lg px-2 py-1 text-slate-900 cursor-pointer font-medium"
                >
                  <option value="Fuel">Fuel / Gas</option>
                  <option value="Tea & Meals">Tea & Meals</option>
                  <option value="Urgent Material">Urgent Material</option>
                  <option value="Small Tools">Small Tools</option>
                  <option value="Local Transport">Local Transport</option>
                  <option value="Worker Advance">Worker Advance</option>
                  <option value="Material Allowance">Material Allowance</option>
                  <option value="Site Supervisor Fund">Site Supervisor Fund</option>
                  <option value="Consolidated Expense">Consolidated Expense</option>
                  <option value="Other">Other Expenses</option>
                </select>
              </div>

              <div className="space-y-0.5">
                <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Payment Option</label>
                <select
                  value={expenseMethod}
                  onChange={(e) => setExpenseMethod(e.target.value as ExpenseRecord['paymentMethod'])}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-xs rounded-lg px-2 py-1 text-slate-900 cursor-pointer font-medium"
                >
                  <option value="Petty Cash">Company Material Allowance</option>
                  <option value="Supervisor Card">Supervisor Company Card</option>
                  <option value="Supervisor Personal Out-of-pocket">Supervisor Out-of-pocket (Personal)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 block">
              <label className="text-xs font-semibold text-slate-600">Spent Value (₱)</label>
              <input
                type="number"
                min="0.1"
                step="0.01"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-xs rounded-xl px-3 py-2 text-slate-900 font-mono"
              />
            </div>

            <div className="space-y-0.5 block">
              <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Item Description / Remarks</label>
              <input
                type="text"
                placeholder="e.g. Bought matching PVC pipes, 12 liters diesel"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-xs rounded-lg px-2.5 py-1.5 text-slate-900 font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 select-none transition-all cursor-pointer shadow-3xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field Expense Receipt
            </button>
          </form>
        </div>

        {/* FORM 2 (Admin Only): Allocate Supervisor Funds and Material Allowance */}
        {currentRole === 'Admin' && onAddSupervisorFund && (
          <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-250 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Allocate Supervisor Fund</h2>
              </div>
              <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 rounded uppercase">
                Admin Privilege
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Fund disbursements logged here will augment the supervisor's petty cash spending limit for the site.</p>

            {fundFormError && (
              <div className="p-2 bg-rose-50 border border-rose-100 rounded text-[9px] text-rose-700 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                <span>{fundFormError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitFund} className="space-y-2.5 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Disbursement Date</label>
                  <input
                    type="date"
                    value={fundDate}
                    onChange={(e) => setFundDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-[11px] rounded p-1.5 font-mono"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Target Site</label>
                  <select
                    value={fundSiteId}
                    onChange={(e) => setFundSiteId(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-[11px] rounded p-1.5"
                  >
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Allowance Value (₱)</label>
                  <input
                    type="number"
                    min="10"
                    step="100"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 text-[11px] rounded p-1.5 font-mono"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Disbursed By</label>
                  <select
                    value={fundGivenBy}
                    onChange={(e) => setFundGivenBy(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-[11px] rounded p-1.5"
                  >
                    <option value="Admin / HR">Admin / HR Officer</option>
                    <option value="Ronald C. Famorca (Contractor)">Ronald C. Famorca (Boss)</option>
                    <option value="Sheena Mae D. Serrano (Secretary)">Sheena Mae D. Serrano</option>
                  </select>
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Allocation Purpose / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Initial mobilization allowance, site hardware purchase fund"
                  value={fundNotes}
                  onChange={(e) => setFundNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-[11px] rounded p-1.5 font-medium text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Disburse Supervisor Fund
              </button>
            </form>
          </div>
        )}

        {/* Informative advice */}
        <div className="bg-black text-white rounded-2xl p-4 text-xs space-y-2 border border-neutral-800">
          <p className="font-bold flex items-center gap-1.5 text-yellow-405">
            <ThumbsUp className="w-4 h-4 text-yellow-400 shrink-0" />
            Field Reimbursement Guide
          </p>
          <p className="text-slate-300 leading-relaxed text-[11px]">When Site Supervisors spend personal money out-of-pocket on emergency fittings, the manager can mark them as paid/reimbursed in the adjacent ledger stream to balance balances instantly.</p>
        </div>
      </div>

      {/* RIGHT COLUMN: Field Expense Directory & Reimbursement tracker (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* PREMIUM PETTY CASH BALANCE SCORECARD */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-center shadow-2xs">
            <span className="text-[9px] text-slate-400 block font-medium uppercase tracking-wider">Site Total Spent</span>
            <p className="text-sm font-bold text-slate-800 font-mono mt-1">{formatCurrency(totalClaimsSum)}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-center shadow-2xs">
            <span className="text-[9px] text-emerald-600 block font-bold uppercase tracking-wider">Claims Settled</span>
            <p className="text-sm font-bold text-emerald-600 font-mono mt-1">{formatCurrency(totalReimbursedSum)}</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-center shadow-2xs">
            <span className="text-[9px] text-indigo-600 block font-bold uppercase tracking-wider">Supervisor Funds Given</span>
            <p className="text-sm font-bold text-indigo-700 font-mono mt-1">{formatCurrency(totalCashAllocatedSum)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-150 p-3.5 rounded-xl text-center shadow-3xs">
            <span className="text-[9px] text-emerald-800 block font-bold uppercase tracking-wider">Remaining Balance</span>
            <p className={`text-sm font-black font-mono mt-1 ${pettyCashBalance < 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-700'}`}>
              {formatCurrency(pettyCashBalance)}
            </p>
          </div>
        </div>

        {/* Directory Controls & Switcher tabs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <h3 className="font-bold text-slate-950 text-sm flex items-center gap-1.5 flex-wrap justify-between w-full sm:w-auto">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                Material Allowance Desk
              </span>
              <button
                type="button"
                onClick={() => setIsFullScreenView(true)}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase text-[10px] rounded-lg flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all ml-auto sm:ml-2"
                title="Open interactive full-screen listing directory"
              >
                🖥️ Full Screen Tracker
              </button>
            </h3>

             {/* Micro Filters row */}
            <div className="flex flex-wrap gap-2">
              {currentRole === 'Admin' ? (
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-150 text-[11px] rounded-lg px-2.5 py-1 text-slate-800 focus:outline-hidden"
                >
                  <option value="all">All construction sites</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <span className="bg-black text-yellow-400 text-[10px] font-bold uppercase rounded px-2.5 py-1 font-mono select-none">
                  {sites.find(s => s.id === assignedSiteId)?.name || 'YOUR SITE'}
                </span>
              )}

              {ledgerSubTab === 'claims' && (
                <select
                  value={reimbursementFilter}
                  onChange={(e) => setReimbursementFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-150 text-[11px] rounded-lg px-2.5 py-1 text-slate-800 focus:outline-hidden"
                >
                  <option value="all">All statuses</option>
                  <option value="reimbursed">Paid / Settled</option>
                  <option value="pending">Claim Pending</option>
                </select>
              )}
            </div>
          </div>

          {/* Tab Switchers: Claims vs Allocations */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setLedgerSubTab('claims')}
              className={`pb-2 px-4 text-xs font-bold transition-all border-b-2 hover:text-indigo-600 cursor-pointer ${
                ledgerSubTab === 'claims'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400'
              }`}
            >
              Field Expense Claims ({filteredExpenses.length})
            </button>
            <button
              onClick={() => setLedgerSubTab('allocations')}
              className={`pb-2 px-4 text-xs font-bold transition-all border-b-2 hover:text-indigo-600 cursor-pointer ${
                ledgerSubTab === 'allocations'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400'
              }`}
            >
              Allowance Allocations ({filteredFunds.length})
            </button>
          </div>

          {/* VIEW TAB 1: CLAIMS LEDGER */}
          {ledgerSubTab === 'claims' ? (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredExpenses.length === 0 ? (
                <div className="p-12 text-center text-slate-400 border border-dashed border-slate-150 rounded-xl bg-slate-50/50">
                  <Receipt className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No petty claims match search criteria</p>
                  <p className="text-[10px] text-slate-400">File a claim using the entry card on the left panel</p>
                </div>
              ) : (
                filteredExpenses.map((exp) => {
                  const associatedSite = sites.find(s => s.id === exp.siteId);
                  return (
                    <div key={exp.id} className="p-4 bg-slate-50/70 border border-slate-100 hover:bg-slate-100/50 rounded-xl transition-all space-y-3">
                      
                      <div className="flex gap-3 justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[9px] uppercase tracking-wider font-bold bg-yellow-50 text-yellow-850 px-1.5 py-0.5 rounded mr-2 border border-yellow-200">
                            {exp.category}
                          </span>
                          
                          {/* Site tag */}
                          <span className="text-[10px] text-slate-400 font-semibold">{associatedSite?.name || 'Unknown site'}</span>
                          <h4 className="font-semibold text-slate-900 text-xs mt-1.5">{exp.description}</h4>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-900 font-mono">{formatCurrency(exp.amount)}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{exp.date}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-150/50 text-[11px]">
                        <div className="flex flex-wrap items-center gap-2 text-slate-500">
                          <span>Supervisor: <strong className="text-slate-800">{exp.supervisorName}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            {exp.paymentMethod}
                          </span>
                        </div>

                        {/* Reimbursement Actions */}
                        <div className="flex items-center gap-2 justify-end">
                          {currentRole === 'Admin' ? (
                            <button
                              onClick={() => onToggleReimbursed(exp.id)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                                exp.reimbursed
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100'
                              }`}
                            >
                              {exp.reimbursed ? 'Paid / Settled' : 'Unpaid Claim'}
                            </button>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide border select-none ${
                                exp.reimbursed
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {exp.reimbursed ? 'Paid / Settled' : 'Unpaid Claim'}
                            </span>
                          )}

                          {currentRole !== 'Client' && (
                            <button
                              onClick={() => setExpenseToDelete(exp)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                              title="Delete Claim record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* VIEW TAB 2: ALLOCATIONS LEDGER */
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredFunds.length === 0 ? (
                <div className="p-12 text-center text-slate-400 border border-dashed border-slate-150 rounded-xl bg-slate-50/50">
                  <Coins className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No supervisor allocations / support funds logged</p>
                  <p className="text-[10px] text-slate-400">Admin can disburse support funds using the form panel on the left</p>
                </div>
              ) : (
                filteredFunds.map((fund) => {
                  const associatedSite = sites.find(s => s.id === fund.siteId);
                  return (
                    <div key={fund.id} className="p-4 bg-emerald-50/20 border border-emerald-100/60 rounded-xl transition-all space-y-3">
                      
                      <div className="flex gap-3 justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[9px] uppercase tracking-wider font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded mr-2 border border-emerald-250">
                            Support Fund / Allowance
                          </span>
                          
                          <span className="text-[10px] text-slate-400 font-semibold">{associatedSite?.name || 'Unknown site'}</span>
                          <h4 className="font-semibold text-slate-900 text-xs mt-1.5">{fund.notes || 'Disbursed Supervisor support allowance'}</h4>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold text-emerald-700 font-mono">+{formatCurrency(fund.amount)}</p>
                          <p className="text-[9px] text-slate-450 mt-0.5 font-mono">{fund.date}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-emerald-150/40 text-[11px]">
                        <div className="flex flex-wrap items-center gap-2 text-slate-500">
                          <span>Disbursed To: <strong className="text-slate-800">{fund.supervisorName}</strong></span>
                          <span>•</span>
                          <span>Given By: <strong className="text-indigo-800 font-bold">{fund.givenBy}</strong></span>
                        </div>

                        {currentRole === 'Admin' && onDeleteSupervisorFund && (
                          <button
                            onClick={() => setFundToDelete(fund)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                            title="Delete Fund allocation record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>

      {/* CONFIRMATION DIALOG: Custom Delete Expense Modal */}
      <AnimatePresence>
        {expenseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpenseToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs text-left"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 relative z-10 space-y-4 text-center text-left"
            >
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Expense Record?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Are you sure you want to completely delete the expense claim of <strong className="text-slate-900">{formatCurrency(expenseToDelete.amount)}</strong>?
                </p>
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-[10px] text-slate-400 font-medium text-left">
                  <strong>Description:</strong> {expenseToDelete.description}
                  <br />
                  <strong>Site:</strong> {sites.find(s => s.id === expenseToDelete.siteId)?.name || 'Unknown site'}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setExpenseToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  No, Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteExpense(expenseToDelete.id);
                    setExpenseToDelete(null);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors shadow-2xs"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION DIALOG: Custom Delete Supervisor Fund Modal */}
      <AnimatePresence>
        {fundToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFundToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 relative z-10 space-y-4 text-center text-left"
            >
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Fund Allocation?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Are you sure you want to delete this disbursement of <strong className="text-slate-900">{formatCurrency(fundToDelete.amount)}</strong>? This will decrease the supervisor available balance limit.
                </p>
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-[10px] text-slate-400 font-medium text-left">
                  <strong>Notes:</strong> {fundToDelete.notes}
                  <br />
                  <strong>Site:</strong> {sites.find(s => s.id === fundToDelete.siteId)?.name || 'Unknown site'}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setFundToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  No, Cancel
                </button>
                <button
                  onClick={() => {
                    if (onDeleteSupervisorFund && fundToDelete) {
                      onDeleteSupervisorFund(fundToDelete.id);
                    }
                    setFundToDelete(null);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors shadow-2xs"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ESC key listener for full screen exit */}
      {(() => {
        React.useEffect(() => {
          const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              setIsFullScreenView(false);
            }
          };
          window.addEventListener('keydown', handleKeyDown);
          return () => window.removeEventListener('keydown', handleKeyDown);
        }, []);
        return null;
      })()}

      {/* FULL SCREEN INTERACTIVE LISTING WORKSPACE: checking & tracking material allowance */}
      <AnimatePresence>
        {isFullScreenView && (
          <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-4 md:p-6 text-left">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-slate-900 border border-slate-800 text-white w-full h-full max-w-7xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header block with Dark Premium vibe */}
              <div className="p-6 bg-slate-955 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    Material Allowance Auditor Board
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium font-sans">Immersive full-screen active workspace to track, verify, and filter encoded supervisor field expenditures</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const headers = ["Date", "Site Name", "Category", "Description", "Supervisor", "Payment Method", "Amount (PHP)", "Reimbursed"];
                      const rows = fullScreenFiltered.map(exp => {
                        const siteObj = sites.find(s => s.id === exp.siteId);
                        return [
                          exp.date,
                          siteObj ? siteObj.name.replace(/,/g, '') : 'Unknown Site',
                          exp.category,
                          exp.description.replace(/,/g, ''),
                          exp.supervisorName,
                          exp.paymentMethod,
                          exp.amount,
                          exp.reimbursed ? 'Paid' : 'Unpaid'
                        ];
                      });
                      const csvContent = "data:text/csv;charset=utf-8," 
                        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `Material_Allowance_Report_${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    📥 Export Filtered CSV
                  </button>
                  <button
                    onClick={() => setIsFullScreenView(false)}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-sm font-sans"
                  >
                    ✕ Close Panel
                  </button>
                </div>
              </div>

              {/* KPI Scorecard Cards inside Workspace */}
              <div className="px-6 py-4 bg-slate-950/40 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-850">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider font-sans">Entries Counted</span>
                  <p className="text-base font-black text-yellow-400 font-mono mt-0.5">{fullScreenFiltered.length} Claim items</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider font-sans">Selected Total Value</span>
                  <p className="text-base font-black text-white font-mono mt-0.5">₱{fullScreenTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left">
                  <span className="text-[9px] text-emerald-500 block font-bold uppercase tracking-wider font-sans">Paid / Reimbursement Total</span>
                  <p className="text-base font-black text-emerald-400 font-mono mt-0.5">₱{fullScreenPaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left">
                  <span className="text-[9px] text-yellow-500 block font-bold uppercase tracking-wider font-sans">Verification Outstanding</span>
                  <p className="text-base font-black text-yellow-500 font-mono mt-0.5">₱{fullScreenPendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Advanced Interactive Control Deck */}
              <div className="p-6 bg-slate-900 border-b border-slate-850 grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Site selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450 block font-sans">Site/Project Filtering</label>
                  {currentRole === 'Admin' ? (
                    <select
                      value={fullSite}
                      onChange={(e) => setFullSite(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-100 focus:border-yellow-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="all">All Project Sites (Active)</option>
                      {sites.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full bg-slate-955 border border-slate-800 text-xs rounded-lg px-3 py-2 text-yellow-400 font-bold font-mono">
                      {sites.find(s => s.id === assignedSiteId)?.name || 'YOUR SITE'}
                    </div>
                  )}
                </div>

                {/* Category selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-455 block font-sans">Allowance Category</label>
                  <select
                    value={fullCategory}
                    onChange={(e) => setFullCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-100 focus:border-yellow-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">All Expense Categories</option>
                    <option value="Fuel">Fuel & Transport</option>
                    <option value="Tea & Meals">Emergency Tea & Meals</option>
                    <option value="Small Tools">Small Hand Tools & Hardware</option>
                    <option value="Materials">Direct Construction Materials</option>
                    <option value="Emergency Relief">Labor Cash Advance / Emergency</option>
                    <option value="Others">General / Miscellaneous</option>
                  </select>
                </div>

                {/* Reimbursed Status selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-455 block font-sans">Billing Settlement Status</label>
                  <select
                    value={fullStatus}
                    onChange={(e) => setFullStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-100 focus:border-yellow-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">All Settlement Classes</option>
                    <option value="reimbursed">Paid & Settled</option>
                    <option value="pending">Claim Pending / Unpaid</option>
                  </select>
                </div>

                {/* Search query box */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-455 block font-sans">Search Key terms</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search description, supervisor, card..."
                      value={fullSearch}
                      onChange={(e) => setFullSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg pl-9 pr-3 py-2 text-slate-100 focus:border-yellow-500 focus:outline-hidden placeholder-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Printable Table Section */}
              <div className="flex-1 overflow-auto bg-slate-950">
                <table className="w-full text-xs text-slate-300 text-left">
                  <thead>
                    <tr className="bg-slate-950 sticky top-0 border-b border-slate-850 text-[9px] font-black uppercase text-slate-450 tracking-wider">
                      <th className="p-4">Spent Date</th>
                      <th className="p-4">Site Designation</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Encoded Description</th>
                      <th className="p-4">Logged By / Supervisor</th>
                      <th className="p-4">Payment Method</th>
                      <th className="p-4 text-right">Amount (₱)</th>
                      <th className="p-4 text-center">Settlement Status</th>
                      {currentRole !== 'Client' && <th className="p-4 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-medium">
                    {fullScreenFiltered.length > 0 ? (
                      fullScreenFiltered.map((exp) => {
                        const siteObj = sites.find(s => s.id === exp.siteId);
                        return (
                          <tr key={exp.id} className="hover:bg-slate-900/40">
                            <td className="p-4 font-mono font-bold text-[11px] text-slate-500 whitespace-nowrap">
                              {exp.date}
                            </td>
                            <td className="p-4 font-bold text-slate-200">
                              {siteObj ? siteObj.name : 'Deleted Site'}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className="font-mono text-[9px] uppercase tracking-wider font-bold bg-yellow-500/10 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/20">
                                {exp.category}
                              </span>
                            </td>
                            <td className="p-4 text-slate-100 max-w-sm break-words">
                              {exp.description}
                            </td>
                            <td className="p-4 text-slate-300">
                              {exp.supervisorName}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className="flex items-center gap-1 text-[11.5px] text-slate-400">
                                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                                {exp.paymentMethod}
                              </span>
                            </td>
                            <td className="p-4 font-mono font-bold text-emerald-400 text-right whitespace-nowrap">
                              ₱{exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              {currentRole === 'Admin' ? (
                                <button
                                  type="button"
                                  onClick={() => onToggleReimbursed(exp.id)}
                                  className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer border ${
                                    exp.reimbursed
                                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                      : 'bg-rose-950/60 text-rose-450 border-rose-800'
                                  }`}
                                >
                                  {exp.reimbursed ? 'Paid & Settled' : 'Claim Pending'}
                                </button>
                              ) : (
                                <span
                                  className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border inline-flex items-center justify-center gap-1 select-none ${
                                    exp.reimbursed
                                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900'
                                      : 'bg-slate-900 text-slate-500 border-slate-800'
                                  }`}
                                >
                                  {exp.reimbursed ? 'Paid & Settled' : 'Claim Pending'}
                                </span>
                              )}
                            </td>
                            {currentRole !== 'Client' && (
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => setExpenseToDelete(exp)}
                                  className="p-1 hover:bg-rose-950 text-slate-500 hover:text-rose-450 rounded-md transition-colors cursor-pointer"
                                  title="Delete claim record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={currentRole === 'Client' ? 8 : 9} className="p-16 text-center text-slate-500 italic">
                          No material allowance expenditures match the current search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Fullscreen view Footer info */}
              <div className="p-4 bg-slate-950 text-[10px] text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-850">
                <span>Logged as: <strong className="text-slate-350">{currentRole} Workspace</strong></span>
                <span>Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono">ESC</kbd> or click Close to return</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
