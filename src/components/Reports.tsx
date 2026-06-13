import React, { useState, useId, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Calendar, 
  Clock, 
  PhilippinePeso, 
  Building2, 
  Users, 
  Coins, 
  Download, 
  Filter, 
  TrendingUp, 
  PieChart, 
  ClipboardCheck, 
  ChevronRight,
  ArrowRight,
  Printer
} from 'lucide-react';
import { ConstructionSite, Worker, AttendanceRecord, ExpenseRecord, ClientPayment, UserRole } from '../types';
import { formatCurrency } from '../utils';
import ProgressReport from './ProgressReport';

interface ReportsProps {
  sites: ConstructionSite[];
  workers: Worker[];
  attendance: AttendanceRecord[];
  expenses: ExpenseRecord[];
  payments: ClientPayment[];
  currentRole: UserRole;
  assignedSiteId: string; // Used for Site Supervisors and Clients
}

export default function Reports({
  sites,
  workers,
  attendance,
  expenses,
  payments,
  currentRole,
  assignedSiteId,
}: ReportsProps) {
  const compId = useId();

  // Selected site filter
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>(() => {
    if (currentRole === 'Admin') return 'all';
    return assignedSiteId;
  });

  // Date range filters - Defaulting to last 30 days of data or current season
  const [startDate, setStartDate] = useState<string>('2026-05-01');
  const [endDate, setEndDate] = useState<string>('2026-05-31');

  // Search filter for employees
  const [employeeSearch, setEmployeeSearch] = useState<string>('');

  // Active sub-report view
  const [activeReportTab, setActiveReportTab] = useState<'payroll' | 'attendance' | 'expenses' | 'billing' | 'weekly' | 'progress'>('progress');

  // Generate list of weekly periods based on existing records
  const getWeeklyPeriods = () => {
    const dates = new Set<string>();
    
    // Collect all dates from attendance
    attendance.forEach(rec => {
      if (rec.date) dates.add(rec.date);
    });
    
    // Collect all dates from expenses
    expenses.forEach(rec => {
      if (rec.date) dates.add(rec.date);
    });

    const weeksMap = new Map<string, { start: string; end: string }>();

    dates.forEach(dateStr => {
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return;
        
        // Find Monday of that week
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d.setDate(diff));
        
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        const key = `${startStr}_${endStr}`;
        
        weeksMap.set(key, { start: startStr, end: endStr });
      } catch (err) {
        // ignore
      }
    });

    // Convert to sorted list (newest first)
    const sortedWeeks = Array.from(weeksMap.values()).sort((a, b) => b.start.localeCompare(a.start));
    
    // If no weeks, generate some recent ones
    if (sortedWeeks.length === 0) {
      const today = new Date();
      for (let i = 0; i < 4; i++) {
        const d = new Date();
        d.setDate(today.getDate() - (i * 7));
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d.setDate(diff));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        sortedWeeks.push({
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        });
      }
    }

    return sortedWeeks;
  };

  const weeklyPeriods = getWeeklyPeriods();
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(() => {
    if (weeklyPeriods.length > 0) {
      return `${weeklyPeriods[0].start}_${weeklyPeriods[0].end}`;
    }
    return '';
  });

  const handleWeekChange = (weekKey: string) => {
    setSelectedWeekKey(weekKey);
    if (weekKey && weekKey !== 'custom') {
      const [start, end] = weekKey.split('_');
      setStartDate(start);
      setEndDate(end);
    }
  };

  useEffect(() => {
    if (activeReportTab === 'weekly' && selectedWeekKey) {
      const [start, end] = selectedWeekKey.split('_');
      setStartDate(start);
      setEndDate(end);
    }
  }, [activeReportTab, selectedWeekKey]);

  // Helper: Filter records based on selected site and date range
  const filterBySiteAndDate = (recordDate: string, recordSiteId: string) => {
    // Site boundary based on role
    const effectiveSite = currentRole === 'Admin' ? selectedSiteFilter : assignedSiteId;
    const matchesSite = effectiveSite === 'all' || recordSiteId === effectiveSite;
    
    // Date boundary
    const matchesDate = (!startDate || recordDate >= startDate) && (!endDate || recordDate <= endDate);
    
    return matchesSite && matchesDate;
  };

  // Resolve active sites available to current user
  const visibleSites = currentRole === 'Admin' 
    ? sites 
    : sites.filter(s => s.id === assignedSiteId);

  const activeSiteObj = sites.find(s => s.id === (currentRole === 'Admin' ? selectedSiteFilter : assignedSiteId));

  // 1. REPORT: Monthly payroll costs per site
  const getMonthlyPayrollReport = () => {
    const monthlyWages: Record<string, Record<string, number>> = {}; // siteId -> { '2026-05': amount }
    
    attendance.forEach(rec => {
      if (filterBySiteAndDate(rec.date, rec.siteId)) {
        const month = rec.date.substring(0, 7); // YYYY-MM
        if (!monthlyWages[rec.siteId]) {
          monthlyWages[rec.siteId] = {};
        }
        monthlyWages[rec.siteId][month] = (monthlyWages[rec.siteId][month] || 0) + rec.wageEarned;
      }
    });

    // Flatten to list
    const reportList: Array<{
      id: string;
      siteName: string;
      month: string;
      totalCost: number;
      attendanceCount: number;
    }> = [];

    Object.entries(monthlyWages).forEach(([siteId, months]) => {
      const site = sites.find(s => s.id === siteId);
      if (!site) return;
      
      Object.entries(months).forEach(([month, totalCost]) => {
        // Count attendance days
        const attCount = attendance.filter(a => 
          a.siteId === siteId && 
          a.date.substring(0, 7) === month &&
          filterBySiteAndDate(a.date, a.siteId)
        ).length;

        reportList.push({
          id: `${siteId}-${month}`,
          siteName: site.name,
          month,
          totalCost,
          attendanceCount: attCount,
        });
      });
    });

    return reportList.sort((a, b) => b.month.localeCompare(a.month) || b.totalCost - a.totalCost);
  };

  // 2. REPORT: Attendance summaries per employee per site
  const getAttendanceEmployeeSummary = () => {
    const workerStats: Record<string, {
      workerId: string;
      workerName: string;
      role: string;
      siteId: string;
      siteName: string;
      presentCount: number;
      absentCount: number;
      halfDayCount: number;
      totalWages: number;
    }> = {};

    attendance.forEach(rec => {
      if (filterBySiteAndDate(rec.date, rec.siteId)) {
        const worker = workers.find(w => w.id === rec.workerId);
        if (!worker) return;

        const uniqueKey = `${rec.workerId}-${rec.siteId}`;
        
        if (!workerStats[uniqueKey]) {
          const site = sites.find(s => s.id === rec.siteId);
          workerStats[uniqueKey] = {
            workerId: rec.workerId,
            workerName: worker.name,
            role: worker.role,
            siteId: rec.siteId,
            siteName: site ? site.name : 'Unknown Site',
            presentCount: 0,
            absentCount: 0,
            halfDayCount: 0,
            totalWages: 0,
          };
        }

        if (rec.status === 'Present') {
          workerStats[uniqueKey].presentCount += 1;
        } else if (rec.status === 'Absent') {
          workerStats[uniqueKey].absentCount += 1;
        } else if (rec.status === 'Half-Day') {
          workerStats[uniqueKey].halfDayCount += 1;
        }
        
        workerStats[uniqueKey].totalWages += rec.wageEarned;
      }
    });

    return Object.values(workerStats).filter(item => {
      if (!employeeSearch) return true;
      return item.workerName.toLowerCase().includes(employeeSearch.toLowerCase()) || 
             item.role.toLowerCase().includes(employeeSearch.toLowerCase());
    });
  };

  // 3. REPORT: Daily and overall expenses per site, categorized by type
  const getExpensesBreakdownReport = () => {
    // Categorized statistics
    const breakdown: Record<string, number> = {
      'Fuel': 0,
      'Tea & Meals': 0,
      'Urgent Material': 0,
      'Small Tools': 0,
      'Local Transport': 0,
      'Worker Advance': 0,
      'Consolidated Expense': 0,
      'Other': 0,
      'Labor Wages': 0, // Injected as labor wages cost
    };

    let totalPettyCash = 0;
    let totalLaborWages = 0;

    // Filter relevant petty cash expenses
    expenses.forEach(exp => {
      const associatedSite = sites.find(s => s.id === exp.siteId);
      if (!associatedSite) return;

      if (filterBySiteAndDate(exp.date, exp.siteId)) {
        breakdown[exp.category] = (breakdown[exp.category] || 0) + exp.amount;
        totalPettyCash += exp.amount;
      }
    });

    // Filter relevant labor wages
    attendance.forEach(att => {
      const associatedSite = sites.find(s => s.id === att.siteId);
      if (!associatedSite) return;

      if (filterBySiteAndDate(att.date, att.siteId)) {
        breakdown['Labor Wages'] += att.wageEarned;
        totalLaborWages += att.wageEarned;
      }
    });

    const categoriesList = Object.entries(breakdown)
      .map(([name, value]) => ({
        name,
        value,
        color: 
          name === 'Fuel' ? 'bg-yellow-500' :
          name === 'Tea & Meals' ? 'bg-emerald-500' :
          name === 'Urgent Material' ? 'bg-rose-500' :
          name === 'Small Tools' ? 'bg-indigo-500' :
          name === 'Local Transport' ? 'bg-sky-500' :
          name === 'Worker Advance' ? 'bg-yellow-500' :
          name === 'Labor Wages' ? 'bg-slate-900 border border-yellow-500' : 'bg-slate-400',
        barColor: 
          name === 'Fuel' ? 'bg-yellow-400' :
          name === 'Tea & Meals' ? 'bg-emerald-400' :
          name === 'Urgent Material' ? 'bg-rose-400' :
          name === 'Small Tools' ? 'bg-indigo-400' :
          name === 'Local Transport' ? 'bg-sky-400' :
          name === 'Worker Advance' ? 'bg-yellow-400' :
          name === 'Labor Wages' ? 'bg-slate-800' : 'bg-slate-400',
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // Group expenses by daily timeline
    const dailySpend: Record<string, { date: string; petty: number; labor: number }> = {};
    
    expenses.forEach(exp => {
      if (filterBySiteAndDate(exp.date, exp.siteId)) {
        if (!dailySpend[exp.date]) dailySpend[exp.date] = { date: exp.date, petty: 0, labor: 0 };
        dailySpend[exp.date].petty += exp.amount;
      }
    });

    attendance.forEach(att => {
      if (filterBySiteAndDate(att.date, att.siteId)) {
        if (!dailySpend[att.date]) dailySpend[att.date] = { date: att.date, petty: 0, labor: 0 };
        dailySpend[att.date].labor += att.wageEarned;
      }
    });

    const dailyTrends = Object.values(dailySpend).sort((a, b) => b.date.localeCompare(a.date));

    return {
      categoriesList,
      totalPettyCash,
      totalLaborWages,
      overallTotal: totalPettyCash + totalLaborWages,
      dailyTrends,
    };
  };

  // 4. REPORT: Client payment history and outstanding balances
  const getClientPaymentsReport = () => {
    const reportList: Array<{
      siteId: string;
      siteName: string;
      clientName: string;
      contractValue: number;
      paidAmount: number;
      outstandingBalance: number;
      paymentCount: number;
    }> = [];

    // Filter sites visible to supervisor or client
    const targetSites = currentRole === 'Admin' 
      ? (selectedSiteFilter === 'all' ? sites : sites.filter(s => s.id === selectedSiteFilter))
      : sites.filter(s => s.id === assignedSiteId);

    targetSites.forEach(site => {
      // Find payments on this site matching date filters
      const sitePayments = payments.filter(p => p.siteId === site.id && (!startDate || p.date >= startDate) && (!endDate || p.date <= endDate));
      const paid = sitePayments.reduce((s, p) => s + p.amount, 0);
      const outstanding = Math.max(0, site.projectValue - payments.filter(p => p.siteId === site.id).reduce((s, p) => s + p.amount, 0));

      reportList.push({
        siteId: site.id,
        siteName: site.name,
        clientName: site.clientName,
        contractValue: site.projectValue,
        paidAmount: paid,
        outstandingBalance: outstanding,
        paymentCount: sitePayments.length,
      });
    });

    // Detail ledger payments
    const ledgerPayments = payments.filter(p => {
      const siteBound = currentRole === 'Admin' 
        ? (selectedSiteFilter === 'all' || p.siteId === selectedSiteFilter)
        : p.siteId === assignedSiteId;
      return siteBound && (!startDate || p.date >= startDate) && (!endDate || p.date <= endDate);
    }).sort((a, b) => b.date.localeCompare(a.date));

    return {
      summaries: reportList,
      ledger: ledgerPayments,
    };
  };

  // 5. REPORT: Weekly labor and expenses summary for manager sign-off
  const getWeeklySummaryReport = () => {
    // Collect all unique workers active in this period and site
    const workerSummary: Record<string, {
      workerId: string;
      name: string;
      role: string;
      dailyRate: number;
      daysPresent: number;
      daysHalfDay: number;
      totalWages: number;
    }> = {};

    attendance.forEach(rec => {
      if (filterBySiteAndDate(rec.date, rec.siteId)) {
        const worker = workers.find(w => w.id === rec.workerId);
        if (!worker) return;

        if (!workerSummary[rec.workerId]) {
          workerSummary[rec.workerId] = {
            workerId: rec.workerId,
            name: worker.name,
            role: worker.role,
            dailyRate: worker.dailyRate,
            daysPresent: 0,
            daysHalfDay: 0,
            totalWages: 0,
          };
        }

        if (rec.status === 'Present') {
          workerSummary[rec.workerId].daysPresent += 1;
        } else if (rec.status === 'Half-Day') {
          workerSummary[rec.workerId].daysHalfDay += 1;
        }
        
        workerSummary[rec.workerId].totalWages += rec.wageEarned;
      }
    });

    const laborList = Object.values(workerSummary).sort((a, b) => a.name.localeCompare(b.name));
    const totalLaborCost = laborList.reduce((sum, w) => sum + w.totalWages, 0);

    // Collect expenses for this week and site
    const siteExpensesList = expenses.filter(exp => 
      filterBySiteAndDate(exp.date, exp.siteId)
    ).sort((a, b) => a.date.localeCompare(b.date));
    
    const totalExpensesCost = siteExpensesList.reduce((sum, exp) => sum + exp.amount, 0);

    return {
      laborList,
      totalLaborCost,
      siteExpensesList,
      totalExpensesCost,
      grandTotal: totalLaborCost + totalExpensesCost
    };
  };

  // Calculations for display
  const monthlyPayrollReport = getMonthlyPayrollReport();
  const attendanceEmployeeSummary = getAttendanceEmployeeSummary();
  const expensesReport = getExpensesBreakdownReport();
  const billingReport = getClientPaymentsReport();
  const weeklySummaryReport = getWeeklySummaryReport();

  return (
    <div className="space-y-5" id={compId}>
      {/* Title block with High-Density style */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 uppercase">Reports & Analytics Portal</h1>
            <p className="text-xs text-slate-500">
              Audit site expenditures, monthly wages, worker milestones, and cash collections securely.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono tracking-wider bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-700 uppercase font-black">
              Role: {currentRole}
            </span>
            <button
              onClick={() => window.print()}
              className="bg-black hover:bg-neutral-900 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors border border-neutral-800 select-none print:hidden"
            >
              <Download className="w-3.5 h-3.5 text-yellow-400" />
              Print Report
            </button>
          </div>
        </div>
      </div>

      {/* FILTER PANEL CARD */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-1.5 pb-2 mb-3 border-b border-slate-100">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <h2 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Report Parameters & Filter</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Site Filter - Only Admin gets to select. Supervisor & Client are hardlocked */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Workplace / Site</label>
            {currentRole === 'Admin' ? (
              <select
                value={selectedSiteFilter}
                onChange={(e) => setSelectedSiteFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-xs rounded-md px-2 py-1.5 text-slate-900 font-semibold cursor-pointer"
              >
                <option value="all">ALL REGISTERED SITES</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-slate-100 border border-slate-200 text-xs rounded-md px-2.5 py-1.5 text-slate-800 font-black">
                {activeSiteObj?.name || 'Assigned Site'}
              </div>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Date Range: From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-xs rounded-md px-2.5 py-1.5 text-slate-900 font-medium"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Date Range: To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-xs rounded-md px-2.5 py-1.5 text-slate-900 font-medium"
            />
          </div>

          {/* Quick Shortcuts */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Interval Presets</label>
            <div className="flex gap-1">
              <button 
                onClick={() => { setStartDate('2026-05-01'); setEndDate('2026-05-31'); }}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded text-[9px] uppercase tracking-tight border border-slate-200"
              >
                May 2026
              </button>
              <button 
                onClick={() => { setStartDate('2026-04-01'); setEndDate('2026-05-31'); }}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded text-[9px] uppercase tracking-tight border border-slate-200"
              >
                Last 60 Days
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* REPORT SUBNAV TABS */}
      <div className="bg-white p-1 rounded-lg border border-slate-200 flex flex-nowrap overflow-x-auto gap-0.5 print:hidden select-none">
        {[
          { id: 'progress', label: 'Progress Reports', icon: TrendingUp, description: 'percentage & charts' },
          { id: 'payroll', label: 'Monthly Payroll', icon: Calendar, description: 'wages per site' },
          { id: 'attendance', label: 'Crew Attendance', icon: Users, description: 'employee summaries' },
          { id: 'expenses', label: 'Site Expenses', icon: Coins, description: 'categories & trends' },
          { id: 'billing', label: 'Client Billings', icon: PhilippinePeso, description: 'payment statuses' },
          { id: 'weekly', label: 'Weekly Summary', icon: ClipboardCheck, description: 'manager sign-off' },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          
          // Clients are restricted from viewing payroll, attendance, and weekly summaries containing wages
          if (currentRole === 'Client' && (tab.id === 'payroll' || tab.id === 'attendance' || tab.id === 'weekly')) {
            return null;
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={`flex-1 min-w-[120px] px-3 py-1.5 rounded-md text-left transition-all cursor-pointer ${
                isActive 
                  ? 'bg-black text-white shadow-md border-b-2 border-yellow-500' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-yellow-400' : 'text-slate-400'}`} />
                <span className="text-xs font-black uppercase tracking-wider">{tab.label}</span>
              </div>
              <p className="text-[8px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide truncate">{tab.description}</p>
            </button>
          );
        })}
      </div>

      {/* REPORT DISPLAY PANELS */}
      <div className="space-y-4">
        
        {/* REPORT 1: MONTHLY PAYROLL REPORT */}
        {activeReportTab === 'payroll' && currentRole !== 'Client' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">Report Output #01</span>
                <h3 className="font-bold text-slate-950 text-sm flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-sky-500" />
                  Monthly Payroll Cost Statement
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                Interval: {startDate || '*'} to {endDate || '*'}
              </span>
            </div>

            {/* Quick Chart Graph of Monthly Wages */}
            {monthlyPayrollReport.length > 0 && (
              <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col gap-2">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Monthly Payroll Cost Comparisons</span>
                
                {/* Visual grid using dynamic custom widths */}
                <div className="space-y-2 mt-1">
                  {monthlyPayrollReport.slice(0, 5).map((row, idx) => {
                    const maxCost = Math.max(...monthlyPayrollReport.map(r => r.totalCost));
                    const widthPercent = maxCost > 0 ? (row.totalCost / maxCost) * 100 : 0;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-700 w-24 truncate font-mono">{row.month} • {row.siteName.split(' ')[0]}</span>
                        <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                          <div 
                            className="h-full bg-slate-800 rounded transition-all duration-500 border-r-2 border-yellow-500"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-900 w-16 text-right">{formatCurrency(row.totalCost)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 font-bold text-[10px]">Site Location name</th>
                    <th className="px-4 py-2 font-bold text-[10px] text-center">Filing Month</th>
                    <th className="px-4 py-2 font-bold text-[10px] text-center">Crew Shifts Logged</th>
                    <th className="px-4 py-2 font-bold text-[10px] text-right">Total Wage Expenditure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyPayrollReport.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-bold uppercase text-[10px]">
                        No payroll history recorded in this range.
                      </td>
                    </tr>
                  ) : (
                    monthlyPayrollReport.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-950">{row.siteName}</td>
                        <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-600">{row.month}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600 font-bold">{row.attendanceCount} days</td>
                        <td className="px-4 py-2.5 text-right font-mono font-black text-slate-900 bg-slate-50/40">
                          {formatCurrency(row.totalCost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold uppercase text-slate-500">
              <span>Total Statement Wage Sum:</span>
              <span className="font-mono text-xs font-black text-slate-900 bg-white px-2 py-0.5 border border-slate-200 rounded">
                {formatCurrency(monthlyPayrollReport.reduce((s, r) => s + r.totalCost, 0))}
              </span>
            </div>
          </div>
        )}

        {/* REPORT 2: CREW ATTENDANCE SUMMARY */}
        {activeReportTab === 'attendance' && currentRole !== 'Client' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">Report Output #02</span>
                <h3 className="font-bold text-slate-950 text-sm flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-500" />
                  Employee Attendance & Wage Milestone
                </h3>
              </div>
              
              {/* Employee search input bar */}
              <div className="relative w-full sm:w-64 max-w-xs print:hidden">
                <input
                  type="text"
                  placeholder="Search crew worker, role..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-xs rounded-lg pl-3 pr-2 py-1 text-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 font-bold text-[10px]">Crew Worker Name</th>
                    <th className="px-4 py-2 font-bold text-[10px]">Trade / Role</th>
                    <th className="px-4 py-2 font-bold text-[10px]">Assigned Site</th>
                    <th className="px-4 py-2 font-bold text-[10px] text-center">Present</th>
                    <th className="px-4 py-2 font-bold text-[10px] text-center">Half-Day</th>
                    <th className="px-4 py-2 font-bold text-[10px] text-center">Absent</th>
                    <th className="px-4 py-2 font-bold text-[10px] text-center">Total Hours</th>
                    <th className="px-4 py-2 font-bold text-[10px] text-right">Wages Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceEmployeeSummary.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-bold uppercase text-[10px]">
                        No attendance matching database search metrics.
                      </td>
                    </tr>
                  ) : (
                    attendanceEmployeeSummary.map((row, idx) => {
                      // Wage multiplier logic: Present (8h), Half-Day (4H)
                      const totalHrs = (row.presentCount * 8) + (row.halfDayCount * 4);
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-bold text-slate-950">{row.workerName}</td>
                          <td className="px-4 py-2 text-slate-600 font-medium">{row.role}</td>
                          <td className="px-4 py-2 text-slate-650 max-w-[150px] truncate">{row.siteName}</td>
                          <td className="px-4 py-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 font-black font-mono">
                              {row.presentCount}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {row.halfDayCount > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-yellow-50 border border-yellow-105 text-yellow-850 font-black font-mono">
                                {row.halfDayCount}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {row.absentCount > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-500 font-medium font-mono">
                                {row.absentCount}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-2 text-center font-mono font-bold text-slate-600">
                            {totalHrs} hrs
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-black text-slate-900 bg-slate-50/40">
                            {formatCurrency(row.totalWages)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-indigo-50 border-t border-indigo-150 text-[10px] font-bold text-indigo-700 text-right uppercase">
              Sum of Wages in search segment: <span className="font-mono font-black text-xs text-indigo-900 ml-1 bg-white border border-indigo-200 py-0.5 px-2.5 rounded">
                {formatCurrency(attendanceEmployeeSummary.reduce((s, w) => s + w.totalWages, 0))}
              </span>
            </div>
          </div>
        )}

        {/* REPORT 3: DAILY AND OVERALL EXPENSES BY TYPE */}
        {activeReportTab === 'expenses' && (
          <div className="space-y-4">
            
            {/* Split cards overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Box 1: Core totals */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Statement Expenses sum</span>
                <p className="text-2xl font-black text-slate-900 mt-2 font-mono">{formatCurrency(expensesReport.overallTotal)}</p>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-slate-900 w-full rounded" />
                </div>
                <div className="flex justify-between text-[10px] mt-2 font-bold uppercase text-slate-500">
                  <span>Petty voucher ratio:</span>
                  <span className="font-mono">
                    {expensesReport.overallTotal > 0 ? ((expensesReport.totalPettyCash / expensesReport.overallTotal) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>

              {/* Box 2: Petty cash sum */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Supervisor Cash spent</span>
                <p className="text-2xl font-black text-yellow-600 mt-2 font-mono">{formatCurrency(expensesReport.totalPettyCash)}</p>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
                  <div 
                    className="h-full bg-yellow-400 rounded" 
                    style={{ width: `${expensesReport.overallTotal > 0 ? (expensesReport.totalPettyCash / expensesReport.overallTotal) * 105 : 0}%` }}
                  />
                </div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block mt-1.5 font-mono">
                  Fuel, Urgent Materials, Meals
                </span>
              </div>

              {/* Box 3: Wages sum */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Labor Wages processed</span>
                <p className="text-2xl font-black text-sky-600 mt-2 font-mono">{formatCurrency(expensesReport.totalLaborWages)}</p>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
                  <div 
                    className="h-full bg-sky-500 rounded" 
                    style={{ width: `${expensesReport.overallTotal > 0 ? (expensesReport.totalLaborWages / expensesReport.overallTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block mt-1.5 font-mono">
                  Calculated and matched shifts
                </span>
              </div>

            </div>

            {/* Visual categories breakdown panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest pb-2 mb-3 border-b border-slate-100">
                Expenditures Categorized Comparison
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual Bar representation */}
                <div className="space-y-3 justify-center flex flex-col">
                  {expensesReport.categoriesList.map((cat, idx) => {
                    const ratio = expensesReport.overallTotal > 0 ? (cat.value / expensesReport.overallTotal) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5 text-[10px]">
                            <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                            {cat.name}
                          </span>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(cat.value)} ({ratio.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                          <div 
                            className={`h-[100%] rounded-full ${cat.barColor}`}
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Daily Cost Log list */}
                <div className="flex flex-col border-l border-slate-200 pl-6 h-[250px] overflow-y-auto">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide mb-2">Daily Expenditure Timeline</span>
                  <div className="space-y-2">
                    {expensesReport.dailyTrends.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-6 uppercase font-bold">No timeline spendings</p>
                    ) : (
                      expensesReport.dailyTrends.map((day, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 border border-slate-200 rounded text-xs hover:bg-slate-100">
                          <span className="font-mono font-black text-slate-700">{day.date}</span>
                          <div className="flex items-center gap-2 text-right">
                            <span className="text-[9px] font-mono text-slate-400">
                              P: {formatCurrency(day.petty)} | L: {formatCurrency(day.labor)}
                            </span>
                            <span className="font-mono font-black text-slate-900">{formatCurrency(day.petty + day.labor)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* REPORT 4: CLIENT BILLINGS LEDGER */}
        {activeReportTab === 'billing' && (
          <div className="space-y-4">
            
            {/* Status bars for each active site */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest pb-2 mb-3 border-b border-slate-100">
                Project Funding Progress Ledger
              </span>

              <div className="space-y-4">
                {billingReport.summaries.map((sm, idx) => {
                  const payRatio = sm.contractValue > 0 ? (sm.paidAmount / sm.contractValue) * 100 : 0;
                  return (
                    <div key={idx} className="p-3 rounded border border-slate-200 bg-slate-50/30">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs uppercase">{sm.siteName}</h4>
                          <p className="text-[10px] text-slate-400 uppercase tracking-tight">Client: {sm.clientName}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-xs text-slate-900">{formatCurrency(sm.paidAmount)}</span>
                          <span className="text-[10px] font-medium text-slate-405"> / {formatCurrency(sm.contractValue)}</span>
                        </div>
                      </div>

                      {/* Progress meter */}
                      <div className="h-2 bg-slate-150 rounded-full overflow-hidden border border-slate-200/50">
                        <div 
                          className="h-full bg-slate-900 border-r-2 border-yellow-500"
                          style={{ width: `${payRatio}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                        <span>Paid count: {sm.paymentCount} transactions</span>
                        <span className="font-black text-rose-600">Outstanding Due: {formatCurrency(sm.outstandingBalance)} ({ (100 - payRatio).toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chronological client payments statement */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 border-b border-slate-200 bg-slate-50">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">Milestones & Receipts</span>
                <h3 className="font-bold text-slate-950 text-xs uppercase">Collection Transaction ledger</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-2 font-bold text-[10px]">Date Sent</th>
                      <th className="px-4 py-2 font-bold text-[10px]">Site Project</th>
                      <th className="px-4 py-2 font-bold text-[10px]">Milestone Achieved / Notes</th>
                      <th className="px-4 py-2 font-bold text-[10px]">Method</th>
                      <th className="px-4 py-2 font-bold text-[10px] text-right">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billingReport.ledger.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-bold uppercase text-[10px]">
                          No client milestone receipts matching date filters.
                        </td>
                      </tr>
                    ) : (
                      billingReport.ledger.map((ld, idx) => {
                        const site = sites.find(s => s.id === ld.siteId);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-mono font-bold text-slate-600">{ld.date}</td>
                            <td className="px-4 py-2 font-bold text-slate-950 max-w-[150px] truncate">{site ? site.name : 'Unknown'}</td>
                            <td className="px-4 py-2 text-slate-600">
                              <span className="font-semibold block">{ld.milestone}</span>
                              {ld.notes && <span className="text-[10px] text-slate-400 italic block">{ld.notes}</span>}
                            </td>
                            <td className="px-4 py-2 font-medium text-slate-650">{ld.paymentMethod}</td>
                            <td className="px-4 py-2 text-right font-mono font-black text-emerald-700 bg-emerald-50/20">
                              {formatCurrency(ld.amount)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold uppercase text-slate-500">
                <span>Sum of received funds in list range:</span>
                <span className="font-mono text-xs font-black text-emerald-700 bg-white px-2 py-0.5 border border-slate-200 rounded">
                  {formatCurrency(billingReport.ledger.reduce((s, k) => s + k.amount, 0))}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* REPORT 5: WEEKLY SUMMARY FOR MANAGER SIGN-OFF */}
        {activeReportTab === 'weekly' && currentRole !== 'Client' && (
          <div className="space-y-6">
            {/* Interactive Week/Site select bar - strictly hidden in print */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Choose Weekly Statement Period</span>
                  <select
                    value={selectedWeekKey}
                    onChange={(e) => handleWeekChange(e.target.value)}
                    className="bg-white border border-slate-250 rounded-lg text-xs px-3 py-2 font-bold text-slate-900 cursor-pointer focus:outline-hidden focus:border-yellow-500"
                  >
                    {weeklyPeriods.map((wp, idx) => (
                      <option key={idx} value={`${wp.start}_${wp.end}`}>
                        Week of {wp.start} to {wp.end}
                      </option>
                    ))}
                    <option value="custom">-- Custom Selection (Adjust global filter) --</option>
                  </select>
                </div>
                
                <div className="text-xs text-slate-500 mt-4 md:mt-2">
                  <span className="font-semibold block">Quick Sign-off Mode:</span>
                  Filter a specific site in the parameters above to isolate that project's operational report.
                </div>
              </div>
              
              <button
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-lg flex items-center gap-2 transition-colors border border-slate-950 shadow-sm self-start md:self-auto cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                Process Print Sign-off
              </button>
            </div>

            {/* THE PRINTABLE WORK SHEET CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs print:shadow-none print:border-none print:p-0 flex flex-col space-y-6 max-w-4xl mx-auto font-sans relative">
              
              {/* Paper Watermark Accent (decorative, non-slop, clean business style) */}
              <div className="absolute top-8 right-8 text-right select-none opacity-20 pointer-events-none">
                <span className="text-[10px] font-black font-mono tracking-widest uppercase block text-slate-400">RL Builders & Co.</span>
                <span className="text-[8px] font-bold text-slate-300 block font-mono">Form ref: RL-OPS-WSR-04</span>
              </div>

              {/* Corporate Letterhead Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-slate-900 font-extrabold text-xl tracking-tight uppercase block font-sans">
                    RL BUILDERS & CO.
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">
                    Commercial Fit-out & Construction Engineering Services
                  </span>
                  <span className="text-[9.5px] text-slate-450 block font-sans font-medium">
                    Corporate Office: Muntinlupa City, Metro Manila • Contact: +63 917 555 1234
                  </span>
                </div>
                
                <div className="text-right space-y-1">
                  <span className="inline-block bg-slate-900 text-white text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded">
                    Operational Outflow Statement
                  </span>
                  <p className="text-[11px] text-slate-600 font-serif font-black italic block mt-1">
                    Week: {startDate} to {endDate}
                  </p>
                </div>
              </div>

              {/* Document Metadata Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Target Work Site</span>
                  <span className="font-black text-slate-900 block mt-0.5 uppercase">
                    {activeSiteObj?.name || 'ALL ACTIVE SITES'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Site Location</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">
                    {activeSiteObj?.location || 'Regional Project Area'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Site Liaison (Supervisor)</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">
                    {activeSiteObj?.supervisorName || 'Unassigned Representative'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Statement Date</span>
                  <span className="font-mono font-bold text-slate-800 block mt-0.5">
                    {new Date().toISOString().split('T')[0]}
                  </span>
                </div>
              </div>

              {/* SECTION A: WEEKLY CREW LABOR WAGES SUMMARY */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 bg-slate-50 px-2 py-1 rounded">
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800 block" />
                    Section A: Crew Weekly Labor Attendance Wages
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">
                    Count: {weeklySummaryReport.laborList.length} Active Crew Members
                  </span>
                </div>

                <div className="overflow-hidden border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-mono">
                      <tr>
                        <th className="px-3 py-2 font-black text-[10px]">Worker Name</th>
                        <th className="px-3 py-2 font-black text-[10px]">Role</th>
                        <th className="px-3 py-2 font-black text-[10px] text-right">Daily Rate</th>
                        <th className="px-3 py-2 font-black text-[10px] text-center">Standard Shift days</th>
                        <th className="px-3 py-2 font-black text-[10px] text-right">Base Weekly Wages</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {weeklySummaryReport.laborList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 italic text-xs">
                            No active labor shifts recorded in this weekly interval.
                          </td>
                        </tr>
                      ) : (
                        weeklySummaryReport.laborList.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-bold text-slate-905">{row.name}</td>
                            <td className="px-3 py-2 text-slate-600 font-medium">{row.role}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700">{formatCurrency(row.dailyRate)}</td>
                            <td className="px-3 py-2 text-center font-bold text-slate-800 font-mono">
                              {row.daysPresent + (row.daysHalfDay * 0.5)} days ({row.daysPresent} Present, {row.daysHalfDay} Half-Day)
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-black text-slate-900">
                              {formatCurrency(row.totalWages)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-semibold border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-right font-bold text-slate-700 uppercase tracking-wider text-[9.5px]">
                          Subtotal Crew Wages Paid:
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-black text-slate-900 text-sm bg-slate-100/50">
                          {formatCurrency(weeklySummaryReport.totalLaborCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* SECTION B: WEEKLY SITE PETTY CASH DISBURSEMENTS SUMMARY */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 bg-slate-50 px-2 py-1 rounded">
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800 block" />
                    Section B: Authorized Petty Cash Site Disbursements
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">
                    Count: {weeklySummaryReport.siteExpensesList.length} Site Vouchers
                  </span>
                </div>

                <div className="overflow-hidden border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-mono">
                      <tr>
                        <th className="px-3 py-2 font-black text-[10px]">Filing Date</th>
                        <th className="px-3 py-2 font-black text-[10px]">Particulars / Vendor Item Description</th>
                        <th className="px-3 py-2 font-black text-[10px]">Expense Category</th>
                        <th className="px-3 py-2 font-black text-[10px]">Handled By / Supervisor</th>
                        <th className="px-3 py-2 font-black text-[10px] text-right">Voucher Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {weeklySummaryReport.siteExpensesList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 italic text-xs">
                            No site petty cash expenses logged during this weekly interval.
                          </td>
                        </tr>
                      ) : (
                        weeklySummaryReport.siteExpensesList.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-bold text-slate-705">{row.date}</td>
                            <td className="px-3 py-2 text-slate-900 font-bold whitespace-normal">
                              {row.description}
                            </td>
                            <td className="px-3 py-2 text-slate-600 font-medium font-sans">
                              <span className="inline-block px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-bold">
                                {row.category}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-650 font-medium">{row.supervisorName}</td>
                            <td className="px-3 py-2 text-right font-mono font-black text-slate-905">
                              {formatCurrency(row.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-semibold border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-right font-bold text-slate-700 uppercase tracking-wider text-[9.5px]">
                          Subtotal Operational Petty Cash:
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-black text-slate-900 text-sm bg-slate-100/50">
                          {formatCurrency(weeklySummaryReport.totalExpensesCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* SECTION C: COMBINED SUMMARY & CERTIFICATION */}
              <div className="pt-2">
                <div className="border border-slate-300 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 font-sans shadow-xs">
                  {/* Item 1 */}
                  <div className="p-4 bg-slate-50 text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Crew Wages (A)</span>
                    <span className="text-lg font-mono font-black text-slate-900 block">
                      {formatCurrency(weeklySummaryReport.totalLaborCost)}
                    </span>
                  </div>

                  {/* Item 2 */}
                  <div className="p-4 bg-slate-50 text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Site Petty Cash (B)</span>
                    <span className="text-lg font-mono font-black text-slate-900 block">
                      {formatCurrency(weeklySummaryReport.totalExpensesCost)}
                    </span>
                  </div>

                  {/* Item 3 */}
                  <div className="p-4 bg-slate-950 text-center text-white space-y-1 flex flex-col justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Grand Total Disbursement (A + B)</span>
                    <span className="text-xl font-mono font-extrabold text-amber-400 block mt-1">
                      {formatCurrency(weeklySummaryReport.grandTotal)}
                    </span>
                  </div>
                </div>

                <p className="text-[9.5px] text-slate-400 italic mt-3 text-center leading-relaxed font-sans font-semibold">
                  Notice: This document is an official weekly operation cost tracker synthesized directly from the authorized RL Builders field databases. Any manual alterations on physical print copies are invalid and subject to CEO administrative audit.
                </p>
              </div>

              {/* SECTION D: THREE-TIER MANAGER SIGN-OFF SIGNATURE LINES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 pb-3 text-xs font-sans print:pt-12">
                {/* Sign-off box 1 */}
                <div className="space-y-4 text-center">
                  <div className="h-10 border-b border-dashed border-slate-300 w-4/5 mx-auto flex items-end justify-center">
                    {/* Placeholder space for actual supervisor signature */}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-slate-900 uppercase">
                      {activeSiteObj?.supervisorName || 'Site Supervisor'}
                    </p>
                    <p className="text-[9px] font-bold uppercase text-slate-405 tracking-wider font-mono">
                      Prepared By: Site Liaison
                    </p>
                    <p className="text-[9.5px] text-slate-500">Date: ________________________</p>
                  </div>
                </div>

                {/* Sign-off box 2 */}
                <div className="space-y-4 text-center">
                  <div className="h-10 border-b border-dashed border-slate-300 w-4/5 mx-auto flex items-end justify-center">
                    {/* Placeholder space for actual senior secretary signature */}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-slate-900 uppercase">
                      HEAD OFFICE SECRETARY / COMPTROLLER
                    </p>
                    <p className="text-[9px] font-bold uppercase text-slate-405 tracking-wider font-mono">
                      Verified By: Comptroller Desk
                    </p>
                    <p className="text-[9.5px] text-slate-500">Date: ________________________</p>
                  </div>
                </div>

                {/* Sign-off box 3 */}
                <div className="space-y-4 text-center">
                  <div className="h-10 border-b border-dashed border-slate-300 w-4/5 mx-auto flex items-end justify-center">
                    {/* Placeholder space for CEO/Managing Director signature */}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-slate-900 uppercase">
                      CHIEF GENERAL MANAGER / ADMIN PM
                    </p>
                    <p className="text-[9px] font-bold uppercase text-slate-450 tracking-wider font-mono">
                      Approved By: Project Director (CEO)
                    </p>
                    <p className="text-[9.5px] text-slate-500">Date: ________________________</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeReportTab === 'progress' && (
          <ProgressReport
            sites={sites}
            currentRole={currentRole}
            assignedSiteId={assignedSiteId}
          />
        )}

      </div>
    </div>
  );
}
