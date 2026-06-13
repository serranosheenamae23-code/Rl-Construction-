/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Calendar, 
  PlusCircle, 
  Check, 
  X, 
  PhilippinePeso, 
  Clock, 
  UserPlus, 
  FileText, 
  TrendingUp, 
  Search,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Printer,
  Trash2,
  UploadCloud,
  ArrowUpDown,
  Download,
  ShieldAlert,
  Coins
} from 'lucide-react';
import { Worker, AttendanceRecord, ConstructionSite, UserRole, SupervisorLoan, SupervisorLoanPayment, WorkerLoan, WorkerLoanPayment } from '../types';
import { formatCurrency, formatPDFCurrency } from '../utils';
import { ImportAttendance } from './ImportAttendance';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { logDeletion } from '../lib/recovery';

// Draws the RL CON logo and structured metadata header for payroll and payslips
const drawPDFHeaderWithLogo = (doc: jsPDF, title: string, subtitle: string, isLandscape: boolean = false) => {
  const pageWidth = isLandscape ? 297 : 210;
  
  // 1. Brushed Dark Luxury Banner (matching the beautiful RL CON brushed logo theme)
  doc.setFillColor(24, 28, 36); 
  doc.rect(0, 0, pageWidth, 38, 'F');
  
  // 2. Draw RL CON Vector Logo (Gold and White)
  const logoX = 14;
  const logoY = 4;
  
  // Gold Accent Color for frame stroke and RL letters
  doc.setDrawColor(229, 192, 96); // Metallic Gold #E5C060
  doc.setLineWidth(1.2);
  
  // House structural path: Underline line, left vertical, overhang, roof slants, inset, dropdown vertical tail
  doc.line(logoX + 48, logoY + 19, logoX + 3.5, logoY + 19); // base underline
  doc.line(logoX + 3.5, logoY + 19, logoX + 3.5, logoY + 10.5); // left wall
  doc.line(logoX + 3.5, logoY + 10.5, logoX + 0.5, logoY + 10.5); // left overhang
  doc.line(logoX + 0.5, logoY + 10.5, logoX + 13.5, logoY + 3.5); // peak left
  doc.line(logoX + 13.5, logoY + 3.5, logoX + 26.5, logoY + 10.5); // peak right
  doc.line(logoX + 26.5, logoY + 10.5, logoX + 24.0, logoY + 10.5); // inset step
  doc.line(logoX + 24.0, logoY + 10.5, logoX + 24.0, logoY + 13.5); // dropdown tail

  // Draw the "RL" Text in Gold Metallic
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(229, 192, 96); // Gold (#E5C060)
  doc.text('RL', logoX + 7, logoY + 16.5);
  
  // Draw the "CON" Text in Crisp White for luxury contrast
  doc.setTextColor(255, 255, 255);
  doc.text('CON', logoX + 15, logoY + 16.5);
  
  // Subtitle "BUILD | DESIGN | LANDSCAPE" centered below the design
  doc.setTextColor(156, 163, 175); // gray-400
  doc.setFontSize(5);
  doc.setFont('Helvetica', 'bold');
  doc.text('BUILD | DESIGN | LANDSCAPE', logoX + 18, logoY + 24);
  
  // 3. Document Category title on the right side
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), pageWidth - 14, 15, { align: 'right' });
  
  // 4. Detailed Period & Site Metadata
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(subtitle, pageWidth - 14, 22, { align: 'right' });
  
  // Elegant gold border line acting as baseline border
  doc.setDrawColor(229, 192, 96);
  doc.setLineWidth(1.2);
  doc.line(0, 38, pageWidth, 38);
};

interface AttendancePayrollProps {
  workers: Worker[];
  sites: ConstructionSite[];
  attendance: AttendanceRecord[];
  onAddWorker: (worker: Omit<Worker, 'id'>) => void;
  onUpdateWorker?: (workerId: string, updates: Partial<Worker>) => void;
  onDeleteWorker: (workerId: string) => void;
  onUpdateAttendance: (records: Omit<AttendanceRecord, 'id'>[]) => void;
  onToggleWorkerActive: (workerId: string) => void;
  currentRole?: UserRole;
  assignedSiteId?: string;
  supervisorLoans?: SupervisorLoan[];
  onAddSupervisorLoan?: (loan: Omit<SupervisorLoan, 'id'>) => void;
  onUpdateSupervisorLoan?: (loanId: string, updates: Partial<SupervisorLoan>) => void;
  onDeleteSupervisorLoan?: (loanId: string) => void;
  workerLoans?: WorkerLoan[];
  onAddWorkerLoan?: (loan: Omit<WorkerLoan, 'id'>) => Promise<void>;
  onUpdateWorkerLoan?: (loanId: string, updates: Partial<WorkerLoan>) => Promise<void>;
  onDeleteWorkerLoan?: (loanId: string) => Promise<void>;
}

// Generate weekly choices starting from the current date (where each week is Sunday to Saturday)
const generateWeeklyChoices = () => {
  const choices: { key: string; label: string; startStr: string; endStr: string }[] = [];
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday... 6 is Saturday
  const currentSunday = new Date(today);
  currentSunday.setDate(today.getDate() - currentDay); // Go back to Sunday

  const formatDateLocal = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDisplayRange = (start: Date, end: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = months[start.getMonth()];
    const startDay = start.getDate();
    const startYear = start.getFullYear();
    const endMonth = months[end.getMonth()];
    const endDay = end.getDate();
    const endYear = end.getFullYear();
    
    if (startYear === endYear) {
      if (startMonth === endMonth) {
        return `${startMonth} ${startDay} - ${endDay}, ${startYear}`;
      }
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
    }
    return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
  };

  for (let i = 0; i < 15; i++) {
    const weekStart = new Date(currentSunday);
    weekStart.setDate(currentSunday.getDate() - (i * 7));
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const startStr = formatDateLocal(weekStart);
    const endStr = formatDateLocal(weekEnd);
    
    choices.push({
      key: `${startStr}_${endStr}`,
      label: formatDisplayRange(weekStart, weekEnd) + (i === 0 ? ' (Current Week)' : ''),
      startStr,
      endStr,
    });
  }
  return choices;
};

export default function AttendancePayroll({
  workers,
  sites,
  attendance,
  onAddWorker,
  onUpdateWorker,
  onDeleteWorker,
  onUpdateAttendance,
  onToggleWorkerActive,
  currentRole = 'Admin',
  assignedSiteId = '',
  supervisorLoans = [],
  onAddSupervisorLoan,
  onUpdateSupervisorLoan,
  onDeleteSupervisorLoan,
  workerLoans = [],
  onAddWorkerLoan,
  onUpdateWorkerLoan,
  onDeleteWorkerLoan,
}: AttendancePayrollProps) {
  const containerId = useId();
  // Internal Tab selector
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'roster' | 'payroll' | 'cashbond' | 'workers201' | 'supervisorLoans' | 'workerLoans'>('attendance');
  
  // Show / Hide Bulk Import panel
  const [showImportPanel, setShowImportPanel] = useState(false);
  
  // Roster Filter & Search States
  const [rosterSearch, setRosterSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');

  // Attendance Dates States
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceSiteFilter, setAttendanceSiteFilter] = useState<string>(
    currentRole === 'Admin' ? 'all' : assignedSiteId
  );

  // Payroll Range States
  const [payrollWorkerId, setPayrollWorkerId] = useState<string>('all');
  const [payrollPeriod, setPayrollPeriod] = useState<'all' | '7days' | 'month' | 'weekly' | 'custom'>('weekly');
  const weeklyChoices = useMemo(() => generateWeeklyChoices(), []);
  const [selectedWeeklyRange, setSelectedWeeklyRange] = useState<string>(() => {
    return weeklyChoices[0]?.key || '';
  });
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [payrollSiteFilter, setPayrollSiteFilter] = useState<string>(
    currentRole === 'Admin' ? 'all' : assignedSiteId
  );
  const [payrollSearch, setPayrollSearch] = useState('');
  const [payrollSortField, setPayrollSortField] = useState<'name' | 'site' | 'netPay'>('name');
  const [payrollSortOrder, setPayrollSortOrder] = useState<'asc' | 'desc'>('asc');
  const [payrollMode, setPayrollMode] = useState<'matrix' | 'loans'>('matrix');

  // State for allocating multi-site workers
  const [workerSiteAllocations, setWorkerSiteAllocations] = useState<Record<string, { mode: 'split' | 'single', singleSiteId?: string }>>({});

  // Synchronized registered loans state from Firestore & registration states
  const [allLoans, setAllLoans] = useState<any[]>([]);
  const [showRegisterLoanModal, setShowRegisterLoanModal] = useState(false);
  const [regWorkerId, setRegWorkerId] = useState('');
  const [regLoanType, setRegLoanType] = useState<'company_loan' | 'cash_advance' | 'transportation_loan'>('company_loan');
  const [regAmount, setRegAmount] = useState<string>('');
  const [regNotes, setRegNotes] = useState('');
  const [regError, setRegError] = useState('');

  // States & handlers for clearing weekly cash advances
  const [showClearAdvancesModal, setShowClearAdvancesModal] = useState(false);
  const [isClearingAdvances, setIsClearingAdvances] = useState(false);

  const handleClearWeeklyAdvances = async () => {
    setIsClearingAdvances(true);
    try {
      // 1. Reset worker's cashAdvance field to 0 for all workers that currently have a cash advance
      const workersToReset = workers.filter(w => (w.cashAdvance || 0) > 0);
      for (const w of workersToReset) {
        if (onUpdateWorker) {
          await onUpdateWorker(w.id, { cashAdvance: 0 });
        }
      }

      // 2. Clear all records from the 'loans' Firestore collection of type 'cash_advance'
      const cashAdvanceLoans = allLoans.filter(l => l.type === 'cash_advance');
      for (const l of cashAdvanceLoans) {
        await logDeletion('loans', l.id, l, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Cleared petty cash advance loan of ₱${l.amount.toLocaleString()} for Worker: "${l.workerName}"`);
        await deleteDoc(doc(db, 'loans', l.id));
      }

      setShowClearAdvancesModal(false);
    } catch (err) {
      console.error("Error clearing weekly cash advances:", err);
    } finally {
      setIsClearingAdvances(false);
    }
  };

  // Supervisor Loans and Ledger UI States
  const [svLoanSearch, setSvLoanSearch] = useState('');
  const [showAddSvLoanModal, setShowAddSvLoanModal] = useState(false);
  const [selectedSvLoan, setSelectedSvLoan] = useState<SupervisorLoan | null>(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  // Construction Worker Loans and Ledger UI States
  const [wkLoanSearch, setWkLoanSearch] = useState('');
  const [showAddWkLoanModal, setShowAddWkLoanModal] = useState(false);
  const [selectedWkLoan, setSelectedWkLoan] = useState<WorkerLoan | null>(null);
  const [showAddWkPaymentModal, setShowAddWkPaymentModal] = useState(false);

  // Form states for registering new Supervisor Loan
  const [svLoanSupervisorId, setSvLoanSupervisorId] = useState('');
  const [svLoanSiteId, setSvLoanSiteId] = useState('');
  const [svLoanTotalAmount, setSvLoanTotalAmount] = useState('');
  const [svLoanDate, setSvLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [svLoanNotes, setSvLoanNotes] = useState('');
  const [svLoanError, setSvLoanError] = useState('');

  // Form states for registering new Worker Loan
  const [wkLoanWorkerId, setWkLoanWorkerId] = useState('');
  const [wkLoanSiteId, setWkLoanSiteId] = useState('');
  const [wkLoanTotalAmount, setWkLoanTotalAmount] = useState('');
  const [wkLoanDate, setWkLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [wkLoanNotes, setWkLoanNotes] = useState('');
  const [wkLoanError, setWkLoanError] = useState('');

  // Form states for registering a new worker installment payment
  const [wkPayAmount, setWkPayAmount] = useState('');
  const [wkPayDate, setWkPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [wkPayMethod, setWkPayMethod] = useState<'Cash' | 'Cheque' | 'Salary Deduction' | 'GCash' | 'Maya' | 'Other'>('Cash');
  const [wkPayReference, setWkPayReference] = useState('');
  const [wkPayReceivedBy, setWkPayReceivedBy] = useState('');
  const [wkPayNotes, setWkPayNotes] = useState('');
  const [wkPayError, setWkPayError] = useState('');
  const [wkPayIsConsolidated, setWkPayIsConsolidated] = useState(false);
  const [wkPayConsoStartDate, setWkPayConsoStartDate] = useState('');
  const [wkPayConsoEndDate, setWkPayConsoEndDate] = useState('');
  const [wkPayNumPaymentsMade, setWkPayNumPaymentsMade] = useState('');

  // Form states for registering a new installment payment
  const [svPayAmount, setSvPayAmount] = useState('');
  const [svPayDate, setSvPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [svPayMethod, setSvPayMethod] = useState<'Cash' | 'Cheque' | 'Salary Deduction' | 'GCash' | 'Maya' | 'Other'>('Cash');
  const [svPayReference, setSvPayReference] = useState('');
  const [svPayReceivedBy, setSvPayReceivedBy] = useState('');
  const [svPayNotes, setSvPayNotes] = useState('');
  const [svPayError, setSvPayError] = useState('');
  const [svPayIsConsolidated, setSvPayIsConsolidated] = useState(false);
  const [svPayConsoStartDate, setSvPayConsoStartDate] = useState('');
  const [svPayConsoEndDate, setSvPayConsoEndDate] = useState('');
  const [svPayNumPaymentsMade, setSvPayNumPaymentsMade] = useState('');

  useEffect(() => {
    const unsubLoans = onSnapshot(collection(db, 'loans'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setAllLoans(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'loans');
    });
    return () => unsubLoans();
  }, []);

  const handleRegisterNewLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regWorkerId || !regAmount || parseFloat(regAmount) <= 0) {
      setRegError('Please select a worker and enter a valid positive loan amount.');
      return;
    }
    try {
      const loanAmount = parseFloat(regAmount) || 0;
      await addDoc(collection(db, 'loans'), {
        workerId: regWorkerId,
        type: regLoanType,
        amount: loanAmount,
        date: new Date().toISOString().split('T')[0],
        notes: regNotes,
      });

      // Also update the worker's own aggregate balances for deductions
      const targetWorker = workers.find(w => w.id === regWorkerId);
      if (targetWorker && onUpdateWorker) {
        if (regLoanType === 'cash_advance') {
          const currentVal = targetWorker.cashAdvance || 0;
          onUpdateWorker(regWorkerId, { cashAdvance: currentVal + loanAmount });
        } else if (regLoanType === 'company_loan') {
          const currentVal = targetWorker.loanPayment || 0;
          onUpdateWorker(regWorkerId, { loanPayment: currentVal + loanAmount });
        } else if (regLoanType === 'transportation_loan') {
          const currentVal = targetWorker.transportationLoan || 0;
          onUpdateWorker(regWorkerId, { transportationLoan: currentVal + loanAmount });
        }
      }

      setRegWorkerId('');
      setRegAmount('');
      setRegNotes('');
      setRegError('');
      setShowRegisterLoanModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'loans');
      setRegError('Error saving loan/advance record.');
    }
  };

  // Supervisor Loan submit Handlers
  const handleCreateSvLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!svLoanSupervisorId) {
      setSvLoanError('Please select a site supervisor');
      return;
    }
    if (!svLoanSiteId) {
      setSvLoanError('Please select an active construction site');
      return;
    }
    const amt = parseFloat(svLoanTotalAmount);
    if (!amt || amt <= 0 || isNaN(amt)) {
      setSvLoanError('Please enter a valid positive loan amount');
      return;
    }
    const foundWorker = workers.find(w => w.id === svLoanSupervisorId);
    if (!foundWorker) {
      setSvLoanError("Selected supervisor wasn't found");
      return;
    }

    if (onAddSupervisorLoan) {
      await onAddSupervisorLoan({
        supervisorId: svLoanSupervisorId,
        supervisorName: foundWorker.name,
        siteId: svLoanSiteId,
        totalAmount: amt,
        date: svLoanDate,
        notes: svLoanNotes,
        payments: []
      });
    }

    // Reset Form
    setSvLoanSupervisorId('');
    setSvLoanSiteId('');
    setSvLoanTotalAmount('');
    setSvLoanNotes('');
    setSvLoanError('');
    setShowAddSvLoanModal(false);
  };

  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSvLoan) return;
    const amt = parseFloat(svPayAmount);
    if (!amt || amt <= 0 || isNaN(amt)) {
      setSvPayError('Please enter a valid payment amount');
      return;
    }

    const newPayment: SupervisorLoanPayment = {
      id: `sv-pay-${Date.now()}`,
      date: svPayDate,
      amount: amt,
      paymentMethod: svPayMethod,
      reference: svPayReference.trim(),
      receivedBy: svPayReceivedBy.trim(),
      notes: svPayNotes.trim(),
      isConsolidated: svPayIsConsolidated,
      consoStartDate: svPayIsConsolidated ? svPayConsoStartDate : undefined,
      consoEndDate: svPayIsConsolidated ? svPayConsoEndDate : undefined,
      numPaymentsMade: svPayIsConsolidated ? parseInt(svPayNumPaymentsMade) || undefined : undefined
    };

    const currentPayments = selectedSvLoan.payments || [];
    const updatedPayments = [...currentPayments, newPayment];

    if (onUpdateSupervisorLoan) {
      await onUpdateSupervisorLoan(selectedSvLoan.id, {
        payments: updatedPayments
      });
      // Update selectedSvLoan locally too
      setSelectedSvLoan({
        ...selectedSvLoan,
        payments: updatedPayments
      });
    }

    // Reset form
    setSvPayAmount('');
    setSvPayReference('');
    setSvPayReceivedBy('');
    setSvPayNotes('');
    setSvPayError('');
    setSvPayIsConsolidated(false);
    setSvPayConsoStartDate('');
    setSvPayConsoEndDate('');
    setSvPayNumPaymentsMade('');
    setShowAddPaymentModal(false);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedSvLoan) return;
    if (!window.confirm("Are you sure you want to remove this payment record?")) return;

    const currentPayments = selectedSvLoan.payments || [];
    const updatedPayments = currentPayments.filter(p => p.id !== paymentId);

    if (onUpdateSupervisorLoan) {
      await onUpdateSupervisorLoan(selectedSvLoan.id, {
        payments: updatedPayments
      });
      setSelectedSvLoan({
        ...selectedSvLoan,
        payments: updatedPayments
      });
    }
  };

  // Register a new Worker Loan
  const handleRegisterNewWkLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setWkLoanError('');
    if (!wkLoanWorkerId) {
      setWkLoanError('Please select a construction worker.');
      return;
    }
    const amt = parseFloat(wkLoanTotalAmount);
    if (isNaN(amt) || amt <= 0) {
      setWkLoanError('Please enter a valid loan amount greater than zero.');
      return;
    }

    const workerObj = workers.find(w => w.id === wkLoanWorkerId);
    if (!workerObj) {
      setWkLoanError('Worker not found');
      return;
    }

    if (onAddWorkerLoan) {
      await onAddWorkerLoan({
        workerId: wkLoanWorkerId,
        workerName: workerObj.name,
        siteId: wkLoanSiteId || workerObj.assignedSiteId || sites[0]?.id || '',
        totalAmount: amt,
        date: wkLoanDate,
        notes: wkLoanNotes.trim(),
        payments: []
      });
    }

    // Reset Form
    setWkLoanWorkerId('');
    setWkLoanSiteId('');
    setWkLoanTotalAmount('');
    setWkLoanNotes('');
    setWkLoanError('');
    setShowAddWkLoanModal(false);
  };

  // Submit Worker Repayment
  const handleAddWkPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWkLoan) return;
    const amt = parseFloat(wkPayAmount);
    if (!amt || amt <= 0 || isNaN(amt)) {
      setWkPayError('Please enter a valid payment amount');
      return;
    }

    const newPayment: WorkerLoanPayment = {
      id: `wk-pay-${Date.now()}`,
      date: wkPayDate,
      amount: amt,
      paymentMethod: wkPayMethod,
      reference: wkPayReference.trim(),
      receivedBy: wkPayReceivedBy.trim(),
      notes: wkPayNotes.trim(),
      isConsolidated: wkPayIsConsolidated,
      consoStartDate: wkPayIsConsolidated ? wkPayConsoStartDate : undefined,
      consoEndDate: wkPayIsConsolidated ? wkPayConsoEndDate : undefined,
      numPaymentsMade: wkPayIsConsolidated ? parseInt(wkPayNumPaymentsMade) || undefined : undefined
    };

    const currentPayments = selectedWkLoan.payments || [];
    const updatedPayments = [...currentPayments, newPayment];

    if (onUpdateWorkerLoan) {
      await onUpdateWorkerLoan(selectedWkLoan.id, {
        payments: updatedPayments
      });
      setSelectedWkLoan({
        ...selectedWkLoan,
        payments: updatedPayments
      });
    }

    // Reset Form
    setWkPayAmount('');
    setWkPayReference('');
    setWkPayReceivedBy('');
    setWkPayNotes('');
    setWkPayError('');
    setWkPayIsConsolidated(false);
    setWkPayConsoStartDate('');
    setWkPayConsoEndDate('');
    setWkPayNumPaymentsMade('');
    setShowAddWkPaymentModal(false);
  };

  // Delete Individual Worker Payment
  const handleDeleteWkPayment = async (paymentId: string) => {
    if (!selectedWkLoan) return;
    if (!window.confirm("Are you sure you want to remove this payment record?")) return;

    const currentPayments = selectedWkLoan.payments || [];
    const updatedPayments = currentPayments.filter(p => p.id !== paymentId);

    if (onUpdateWorkerLoan) {
      await onUpdateWorkerLoan(selectedWkLoan.id, {
        payments: updatedPayments
      });
      setSelectedWkLoan({
        ...selectedWkLoan,
        payments: updatedPayments
      });
    }
  };

  // Add Worker Form States
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerRole, setWorkerRole] = useState<Worker['role']>('Laborer');
  const [workerRate, setWorkerRate] = useState<number>(120);
  const [workerSiteId, setWorkerSiteId] = useState<string>(
    currentRole === 'Admin' ? (sites[0]?.id || '') : assignedSiteId
  );
  const [workerSiteIds, setWorkerSiteIds] = useState<string[]>([]);
  
  // 201 Profile States
  const [workerAddress, setWorkerAddress] = useState('');
  const [workerBirthday, setWorkerBirthday] = useState('');
  const [workerEmergName, setWorkerEmergName] = useState('');
  const [workerEmergPhone, setWorkerEmergPhone] = useState('');
  const [workerDateHired, setWorkerDateHired] = useState(new Date().toISOString().split('T')[0]);
  const [workerEmpStatus, setWorkerEmpStatus] = useState<Worker['employmentStatus']>('Project-based');

  // Print Slip Dialog State
  const [selectedSlipWorker, setSelectedSlipWorker] = useState<Worker | null>(null);
  const [selected201Worker, setSelected201Worker] = useState<Worker | null>(null);

  // Admin Payroll Variable Editing States
  const [editingWorkerPayroll, setEditingWorkerPayroll] = useState<Worker | null>(null);
  const [editOvertimeHours, setEditOvertimeHours] = useState<string>('0');
  const [editUseCustomDays, setEditUseCustomDays] = useState<boolean>(false);
  const [editCustomDays, setEditCustomDays] = useState<string>('');
  const [editCashAdvance, setEditCashAdvance] = useState<string>('0');
  const [editLoanPayment, setEditLoanPayment] = useState<string>('0');
  const [editTransportationLoan, setEditTransportationLoan] = useState<string>('0');
  const [editCorpo, setEditCorpo] = useState<string>('0');
  const [editCashbond, setEditCashbond] = useState<string>('100');
  const [editUniformSafetyShoes, setEditUniformSafetyShoes] = useState<string>('0');

  const handleOpenEditPayroll = (worker: Worker) => {
    setEditingWorkerPayroll(worker);
    setEditOvertimeHours(String(worker.overtimeHours || 0));
    const hasCustomDays = worker.customDays !== undefined && worker.customDays !== null;
    setEditUseCustomDays(hasCustomDays);
    setEditCustomDays(hasCustomDays ? String(worker.customDays) : '');
    setEditCashAdvance(String(worker.cashAdvance || 0));
    setEditLoanPayment(String(worker.loanPayment || 0));
    setEditTransportationLoan(String(worker.transportationLoan || 0));
    setEditCorpo(String(worker.corpo || 0));
    const isExcludedFromCashbond = ['Supervisor', 'Admin', 'Secretary'].includes(worker.role);
    setEditCashbond(String(worker.cashbond !== undefined ? worker.cashbond : (isExcludedFromCashbond ? 0 : 100))); // default cashbond is 100 (0 for supervisor, admin, secretary)
    setEditUniformSafetyShoes(String(worker.uniformSafetyShoes || 0));
  };

  const handleSavePayrollEdits = () => {
    if (!editingWorkerPayroll || !onUpdateWorker) return;
    onUpdateWorker(editingWorkerPayroll.id, {
      overtimeHours: parseFloat(editOvertimeHours) || 0,
      customDays: editUseCustomDays ? (parseFloat(editCustomDays) || 0) : null,
      cashAdvance: parseFloat(editCashAdvance) || 0,
      loanPayment: parseFloat(editLoanPayment) || 0,
      transportationLoan: parseFloat(editTransportationLoan) || 0,
      corpo: parseFloat(editCorpo) || 0,
      cashbond: parseFloat(editCashbond) || 0,
      uniformSafetyShoes: parseFloat(editUniformSafetyShoes) || 0,
    });
    setEditingWorkerPayroll(null);
  };

  // Delete Worker Custom Confirmation State
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  // Error States
  const [workerError, setWorkerError] = useState('');

  // Effective Filters based on Roles
  const effectiveSiteFilter = currentRole === 'Admin' ? siteFilter : assignedSiteId;
  const effectiveAttendanceSiteFilter = currentRole === 'Admin' ? attendanceSiteFilter : assignedSiteId;
  const effectivePayrollSiteFilter = currentRole === 'Admin' ? payrollSiteFilter : assignedSiteId;

  // ---------------------------------------------------------------------------
  // ATTENDANCE HANDLING
  // ---------------------------------------------------------------------------
  // Filter active workers for the chosen site (or all)
  const eligibleWorkersForAttendance = workers.filter((worker) => {
    if (!worker.active) return false;
    if (effectiveAttendanceSiteFilter === 'all') return true;
    return worker.assignedSiteId === effectiveAttendanceSiteFilter || 
           (worker.assignedSiteIds && worker.assignedSiteIds.includes(effectiveAttendanceSiteFilter));
  });

  // Get current state of attendance on this specific date
  const getAttendanceForDateAndWorker = (workerId: string): AttendanceRecord | undefined => {
    return attendance.find(a => a.date === attendanceDate && a.workerId === workerId);
  };

  // Bulk save current attendance state modifications
  const handleToggleAttendance = (worker: Worker, status: 'Present' | 'Absent' | 'Half-Day') => {
    const existing = getAttendanceForDateAndWorker(worker.id);
    const supervisorSiteIds = worker.assignedSiteIds || [];
    let siteToUse = worker.assignedSiteId;
    if (existing) {
      siteToUse = existing.siteId;
    } else if (effectiveAttendanceSiteFilter !== 'all') {
      siteToUse = effectiveAttendanceSiteFilter;
    } else if (supervisorSiteIds.length > 0) {
      siteToUse = supervisorSiteIds[0];
    }

    // Determine wages
    let multiplier = 0;
    if (status === 'Present') multiplier = 1;
    if (status === 'Half-Day') multiplier = 0.5;

    const wage = worker.dailyRate * multiplier;

    onUpdateAttendance([{
      date: attendanceDate,
      workerId: worker.id,
      siteId: siteToUse,
      status,
      wageEarned: wage,
    }]);
  };

  // Change assign site for a single day's attendance
  const handleChangeAttendanceSite = (worker: Worker, siteId: string) => {
    const existing = getAttendanceForDateAndWorker(worker.id);
    const status = existing ? existing.status : 'Present'; // default to present if they setting site
    let multiplier = 0;
    if (status === 'Present') multiplier = 1;
    if (status === 'Half-Day') multiplier = 0.5;

    onUpdateAttendance([{
      date: attendanceDate,
      workerId: worker.id,
      siteId: siteId,
      status,
      wageEarned: worker.dailyRate * multiplier,
    }]);
  };

  // ---------------------------------------------------------------------------
  // ROSTER CONFIGURATION
  // ---------------------------------------------------------------------------
  const handleAddNewWorker = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isSupervisor = workerRole === 'Supervisor';
    const finalSiteId = isSupervisor && workerSiteIds.length > 0 ? workerSiteIds[0] : workerSiteId;
    
    if (!workerName || !workerRate || !finalSiteId) {
      setWorkerError('Please enter a valid worker name, daily rate, and construction site assignments.');
      return;
    }
    
    onAddWorker({
      name: workerName,
      phone: workerPhone,
      role: workerRole,
      dailyRate: Number(workerRate),
      assignedSiteId: finalSiteId,
      assignedSiteIds: isSupervisor ? workerSiteIds : [finalSiteId],
      active: true,
      status: 'active',
      address: workerAddress,
      birthday: workerBirthday,
      emergencyContactName: workerEmergName,
      emergencyContactPhone: workerEmergPhone,
      dateHired: workerDateHired,
      employmentStatus: workerEmpStatus,
    });
    
    setWorkerName('');
    setWorkerPhone('');
    setWorkerRate(120);
    setWorkerSiteIds([]);
    setWorkerAddress('');
    setWorkerBirthday('');
    setWorkerEmergName('');
    setWorkerEmergPhone('');
    setWorkerDateHired(new Date().toISOString().split('T')[0]);
    setWorkerEmpStatus('Project-based');
    setWorkerError('');
    setShowAddWorkerModal(false);
  };

  const filteredRoster = workers.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(rosterSearch.toLowerCase()) || 
                          w.role.toLowerCase().includes(rosterSearch.toLowerCase());
    const matchesSite = effectiveSiteFilter === 'all' || 
                        w.assignedSiteId === effectiveSiteFilter ||
                        (w.assignedSiteIds && w.assignedSiteIds.includes(effectiveSiteFilter));
    return matchesSearch && matchesSite;
  });

  const isDateInPayrollPeriod = (dateStr: string) => {
    if (payrollPeriod === '7days') {
      const recordDate = new Date(dateStr);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const recordMidnight = new Date(recordDate);
      recordMidnight.setHours(0, 0, 0, 0);
      return recordMidnight >= sevenDaysAgo;
    }
    if (payrollPeriod === 'month') {
      const recordDate = new Date(dateStr);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const recordMidnight = new Date(recordDate);
      recordMidnight.setHours(0, 0, 0, 0);
      return recordMidnight >= startOfMonth;
    }
    if (payrollPeriod === 'weekly') {
      if (!selectedWeeklyRange) return true;
      const [start, end] = selectedWeeklyRange.split('_');
      return dateStr >= start && dateStr <= end;
    }
    if (payrollPeriod === 'custom') {
      if (!customStartDate || !customEndDate) return true;
      return dateStr >= customStartDate && dateStr <= customEndDate;
    }
    return true; // 'all'
  };

  // Helper to find raw shifts logged per site for a worker in the selected period
  const getWorkerShiftsBySite = (worker: Worker) => {
    const workerRecords = attendance.filter((a) => {
      if (a.workerId !== worker.id) return false;
      return isDateInPayrollPeriod(a.date);
    });

    const siteShifts: Record<string, { isPresent: number; isHalf: number; totalRawDays: number; records: AttendanceRecord[] }> = {};
    
    workerRecords.forEach(r => {
      if (r.status === 'Present' || r.status === 'Half-Day') {
        const sId = r.siteId || worker.assignedSiteId || 'unassigned';
        if (!siteShifts[sId]) {
          siteShifts[sId] = { isPresent: 0, isHalf: 0, totalRawDays: 0, records: [] };
        }
        if (r.status === 'Present') siteShifts[sId].isPresent += 1;
        if (r.status === 'Half-Day') siteShifts[sId].isHalf += 1;
        siteShifts[sId].totalRawDays += r.status === 'Present' ? 1 : 0.5;
        siteShifts[sId].records.push(r);
      }
    });

    return siteShifts;
  };

  // ---------------------------------------------------------------------------
  // PAYROLL CALCULATOR
  // ---------------------------------------------------------------------------
  const calculatePayrollSummary = (worker: Worker) => {
    // Filter attendance for this worker inside selected period
    const workerRecords = attendance.filter((a) => {
      if (a.workerId !== worker.id) return false;
      return isDateInPayrollPeriod(a.date);
    });

    const daysPresent = workerRecords.filter(r => r.status === 'Present').length;
    const daysHalf = workerRecords.filter(r => r.status === 'Half-Day').length;
    const daysAbsent = workerRecords.filter(r => r.status === 'Absent').length;

    // Default dynamic days worked = Present days + 0.5 * Half days
    const computedDays = daysPresent + (0.5 * daysHalf);
    const daysWorked = (worker.customDays !== undefined && worker.customDays !== null) ? worker.customDays : computedDays;

    // Overtime pay formula: rate * number of overtime * 0.125
    const overtimeHours = worker.overtimeHours || 0;
    const overtimePay = worker.dailyRate * overtimeHours * 0.125;

    // Gross Salary = rate multiplied by number of days then add overtime
    const grossSalary = (worker.dailyRate * daysWorked) + overtimePay;

    // Deductions (encoded by Admin)
    const cashAdvance = worker.cashAdvance || 0;
    const loanPayment = worker.loanPayment || 0;
    const transportationLoan = worker.transportationLoan || 0;
    const corpo = worker.corpo || 0;
    const isExcludedFromCashbondSummary = ['Supervisor', 'Admin', 'Secretary'].includes(worker.role);
    const cashbond = worker.cashbond !== undefined ? worker.cashbond : (isExcludedFromCashbondSummary ? 0 : 100); // default cash bond deduction of 100 (0 for supervisor, admin, secretary)
    const uniformSafetyShoes = worker.uniformSafetyShoes || 0;

    const totalDeduction = cashAdvance + loanPayment + transportationLoan + corpo + cashbond + uniformSafetyShoes;

    // Net Salary = gross salary minus total deduction
    const netSalary = grossSalary - totalDeduction;

    return {
      daysPresent,
      daysHalf,
      daysAbsent,
      daysWorked,
      overtimeHours,
      overtimePay,
      grossSalary,
      cashAdvance,
      loanPayment,
      transportationLoan,
      corpo,
      cashbond,
      uniformSafetyShoes,
      totalDeduction,
      netSalary,
      records: workerRecords,
      totalWages: grossSalary, // gross salary alias for compatibility
      deductions: totalDeduction, // total deduction alias for compatibility
      taxes: 0, // no longer needed but kept for structural compatibility
      netPay: netSalary, // net wages/salary alias for compatibility
    };
  };

  // Print Detailed Unified Report Modal
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);

  const togglePayrollSort = (field: 'name' | 'site' | 'netPay') => {
    if (payrollSortField === field) {
      setPayrollSortOrder(payrollSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPayrollSortField(field);
      setPayrollSortOrder('desc'); // Default to descending order for wages/numbers
    }
  };

  // Filter and sort the payroll workers list based on multi-site allocation settings
  const unfilteredPayrollAllocated = workers.flatMap((worker): any => {
    if (worker.status === 'terminated' || worker.status === 'awol') {
      return [];
    }
    const origSummary = calculatePayrollSummary(worker);
    const shiftsMap = getWorkerShiftsBySite(worker);
    const workedSiteIds = Object.keys(shiftsMap);

    // If zero attendance records or single-site worker, keep as un-split
    if (workedSiteIds.length <= 1) {
      const soloSiteId = workedSiteIds[0] || worker.assignedSiteId || 'unassigned';
      let siteName = 'Unassigned Site';
      if (worker.role === 'Supervisor' && worker.assignedSiteIds && worker.assignedSiteIds.length > 0) {
        const names = worker.assignedSiteIds
          .map(id => sites.find(s => s.id === id)?.name)
          .filter(Boolean);
        if (names.length > 0) siteName = names.join(', ');
      } else {
        const assignedSite = sites.find(s => s.id === soloSiteId);
        if (assignedSite) siteName = assignedSite.name;
      }

      return [{
        id: `${worker.id}_solo`,
        worker,
        siteId: soloSiteId,
        siteName,
        summary: origSummary,
        isSplit: false,
        allocationMode: 'single' as const,
        workedSiteDetails: workedSiteIds.map(sId => ({ siteId: sId, days: shiftsMap[sId].totalRawDays }))
      }];
    }

    // It's a multi-site worker! Check allocation preference
    const allocationPref = workerSiteAllocations[worker.id];
    const mode = allocationPref?.mode || 'split'; // Default to "split" per user guidelines
    const singleSiteId = allocationPref?.singleSiteId || workedSiteIds[0];

    if (mode === 'single') {
      const siteName = sites.find(s => s.id === singleSiteId)?.name || 'Unassigned Site';
      return [{
        id: `${worker.id}_allocated_single`,
        worker,
        siteId: singleSiteId,
        siteName,
        summary: origSummary,
        isSplit: false,
        allocationMode: 'single' as const,
        workedSiteDetails: workedSiteIds.map(sId => ({ siteId: sId, days: shiftsMap[sId].totalRawDays }))
      }];
    }

    // mode === 'split': project splits proportionately
    const totalRawDaysWorked = Object.values(shiftsMap).reduce((sum, item) => sum + item.totalRawDays, 0);

    return workedSiteIds.map(sId => {
      const siteRawDays = shiftsMap[sId].totalRawDays;
      const proportion = totalRawDaysWorked > 0 ? (siteRawDays / totalRawDaysWorked) : (1 / workedSiteIds.length);

      const siteDaysWorked = origSummary.daysWorked * proportion;
      const siteOvertimeHours = origSummary.overtimeHours * proportion;
      const siteOvertimePay = origSummary.overtimePay * proportion;
      const siteGrossSalary = origSummary.grossSalary * proportion;

      const siteCashAdvance = origSummary.cashAdvance * proportion;
      const siteLoanPayment = origSummary.loanPayment * proportion;
      const siteTransportationLoan = origSummary.transportationLoan * proportion;
      const siteCorpo = origSummary.corpo * proportion;
      const siteCashbond = origSummary.cashbond * proportion;
      const siteUniformSafetyShoes = origSummary.uniformSafetyShoes * proportion;

      const siteTotalDeduction = siteCashAdvance + siteLoanPayment + siteTransportationLoan + siteCorpo + siteCashbond + siteUniformSafetyShoes;
      const siteNetSalary = siteGrossSalary - siteTotalDeduction;

      const matchedSiteName = sites.find(s => s.id === sId)?.name || 'Unassigned Site';

      return {
        id: `${worker.id}_split_${sId}`,
        worker,
        siteId: sId,
        siteName: `${matchedSiteName} (Share)`,
        summary: {
          ...origSummary,
          daysWorked: siteDaysWorked,
          overtimeHours: siteOvertimeHours,
          overtimePay: siteOvertimePay,
          grossSalary: siteGrossSalary,
          cashAdvance: siteCashAdvance,
          loanPayment: siteLoanPayment,
          transportationLoan: siteTransportationLoan,
          corpo: siteCorpo,
          cashbond: siteCashbond,
          uniformSafetyShoes: siteUniformSafetyShoes,
          totalDeduction: siteTotalDeduction,
          netSalary: siteNetSalary,
          totalWages: siteGrossSalary,
          deductions: siteTotalDeduction,
          netPay: siteNetSalary,
        },
        isSplit: true,
        allocationMode: 'split' as const,
        workedSiteDetails: workedSiteIds.map(id => ({ siteId: id, days: shiftsMap[id].totalRawDays }))
      };
    });
  }) as any[];

  const payrollWorkersData = unfilteredPayrollAllocated.filter(item => {
    if (effectivePayrollSiteFilter !== 'all' && item.siteId !== effectivePayrollSiteFilter) {
      return false;
    }
    if (payrollSearch) {
      const q = payrollSearch.toLowerCase().trim();
      return item.worker.name.toLowerCase().includes(q) || item.worker.role.toLowerCase().includes(q);
    }
    return true;
  });

  const sortedPayrollWorkersData = [...payrollWorkersData].sort((a, b) => {
    let valueA: any;
    let valueB: any;

    if (payrollSortField === 'name') {
      valueA = a.worker.name.toLowerCase();
      valueB = b.worker.name.toLowerCase();
    } else if (payrollSortField === 'site') {
      valueA = a.siteName.toLowerCase();
      valueB = b.siteName.toLowerCase();
    } else if (payrollSortField === 'netPay') {
      valueA = a.summary.netPay;
      valueB = b.summary.netPay;
    } else {
      return 0;
    }

    if (valueA < valueB) return payrollSortOrder === 'asc' ? -1 : 1;
    if (valueA > valueB) return payrollSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const grandTotalGross = sortedPayrollWorkersData.reduce((sum, item) => sum + item.summary.totalWages, 0);
  const grandTotalDeductions = sortedPayrollWorkersData.reduce((sum, item) => sum + item.summary.deductions, 0);
  const grandTotalTaxes = sortedPayrollWorkersData.reduce((sum, item) => sum + item.summary.taxes, 0);
  const grandTotalNet = sortedPayrollWorkersData.reduce((sum, item) => sum + item.summary.netPay, 0);

  const getPayrollPeriodLabel = () => {
    if (payrollPeriod === 'weekly') {
      const match = weeklyChoices.find(c => c.key === selectedWeeklyRange);
      return match ? `Weekly Period (${match.label})` : 'Weekly Period';
    }
    if (payrollPeriod === 'custom') {
      return `Custom Period (${customStartDate} to ${customEndDate})`;
    }
    if (payrollPeriod === 'month') {
      return 'This Month To Date';
    }
    if (payrollPeriod === '7days') {
      return 'Last 7 Days Shifts';
    }
    return 'All Historical Logs';
  };

  // Filtered workers specifically for the PDF and Print layout context (excluding Site Supervisor, Admin, Secretary)
  const pdfEligibleWorkers = sortedPayrollWorkersData.filter(
    item => {
      const statusValue = item.worker.status || (item.worker.active ? 'active' : 'terminated');
      return (
        item.worker.role !== 'Supervisor' &&
        item.worker.role !== 'Admin' &&
        item.worker.role !== 'Secretary' &&
        statusValue === 'active'
      );
    }
  );

  const pdfGrandTotalGross = pdfEligibleWorkers.reduce((sum, item) => sum + item.summary.totalWages, 0);
  const pdfGrandTotalDeductions = pdfEligibleWorkers.reduce((sum, item) => sum + item.summary.deductions, 0);
  const pdfGrandTotalTaxes = pdfEligibleWorkers.reduce((sum, item) => sum + item.summary.taxes, 0);
  const pdfGrandTotalNet = pdfEligibleWorkers.reduce((sum, item) => sum + item.summary.netPay, 0);

  const handleExportToCSV = () => {
    const supervisors = sortedPayrollWorkersData.filter(item => item.worker.role === 'Supervisor');
    const constructionWorkers = sortedPayrollWorkersData.filter(item => item.worker.role !== 'Supervisor');

    const headers = [
      'Employee Name', 
      'Role', 
      'Assigned Default Site', 
      'Daily Wages Scale', 
      'Shifts Present', 
      'Shifts Half-Day', 
      'Shifts Absent', 
      'Gross Wages Earned', 
      'Deductions (2%)', 
      'Taxes (5%)', 
      'Net Wages Payout'
    ];
    
    const mapItemToRow = (item: typeof sortedPayrollWorkersData[0]) => [
      `"${item.worker.name.replace(/"/g, '""')}"`,
      `"${item.worker.role}"`,
      `"${item.siteName.replace(/"/g, '""')}"`,
      item.worker.dailyRate,
      item.summary.daysPresent,
      item.summary.daysHalf,
      item.summary.daysAbsent,
      item.summary.totalWages,
      item.summary.deductions,
      item.summary.taxes,
      item.summary.netPay
    ];
    
    const lines: string[] = [];

    // Branded Title block
    lines.push('"RL DESIGN & CONSTRUCTION - CONSOLIDATED MASTER PAYROLL LEDGER"');
    lines.push(`"Period: ${getPayrollPeriodLabel()}"`);
    lines.push(`"Generated on: ${new Date().toISOString().split('T')[0]}"`);
    lines.push(''); // blank row

    // Section 1: SITE SUPERVISORS
    lines.push('"I. PROJECT SITE SUPERVISOR STAFF PAYROLL"');
    lines.push(headers.join(','));
    if (supervisors.length > 0) {
      supervisors.forEach(item => {
        lines.push(mapItemToRow(item).join(','));
      });
      // Subtotal for Site Supervisors
      const superWages = supervisors.reduce((sum, item) => sum + item.summary.totalWages, 0);
      const superDeductions = supervisors.reduce((sum, item) => sum + item.summary.deductions, 0);
      const superTaxes = supervisors.reduce((sum, item) => sum + item.summary.taxes, 0);
      const superNet = supervisors.reduce((sum, item) => sum + item.summary.netPay, 0);
      lines.push(`,,,,"Subtotal Site Supervisors",,,,${superWages},${superDeductions},${superTaxes},${superNet}`);
    } else {
      lines.push('"No Active Site Supervisor records found in this selected period."');
    }
    lines.push(''); // blank row

    // Section 2: CONSTRUCTION WORKERS
    lines.push('"II. STANDARD CONSTRUCTION WORKERS & FIELD SPECIALISTS"');
    lines.push(headers.join(','));
    if (constructionWorkers.length > 0) {
      constructionWorkers.forEach(item => {
        lines.push(mapItemToRow(item).join(','));
      });
      // Subtotal for Construction Workers
      const workerWages = constructionWorkers.reduce((sum, item) => sum + item.summary.totalWages, 0);
      const workerDeductions = constructionWorkers.reduce((sum, item) => sum + item.summary.deductions, 0);
      const workerTaxes = constructionWorkers.reduce((sum, item) => sum + item.summary.taxes, 0);
      const workerNet = constructionWorkers.reduce((sum, item) => sum + item.summary.netPay, 0);
      lines.push(`,,,,"Subtotal Construction Workers",,,,${workerWages},${workerDeductions},${workerTaxes},${workerNet}`);
    } else {
      lines.push('"No Active Construction Worker records found in this selected period."');
    }
    lines.push(''); // blank row

    // Overall Grand Totals Block
    lines.push('"III. OVERALL GRAND COMBINED PAYROLL SUMMARY"');
    lines.push(`,,,,"GRAND TOTAL OVERALL",,,,${grandTotalGross},${grandTotalDeductions},${grandTotalTaxes},${grandTotalNet}`);

    const csvContent = "\uFEFF" + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Consolidated_Payroll_Report_${payrollPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Use landscape A4 to fit columns beautifully
    
    const rangeText = getPayrollPeriodLabel();
    const siteText = payrollSiteFilter === 'all' ? 'All Registered Sites Combined' : (sites.find(s => s.id === payrollSiteFilter)?.name || 'Filtered Site');
    const subtitle = `Period: ${rangeText}   |   Site Filter: ${siteText}   |   Generated: ${new Date().toISOString().split('T')[0]}`;

    // Draw luxury branded logo header
    drawPDFHeaderWithLogo(doc, 'CONSOLIDATED MASTER PAYROLL LEDGER', subtitle, true);
    
    // Exclude supervisors, admin, and secretary from PDF export per core requirement
    const supervisors: typeof sortedPayrollWorkersData = [];
    const constructionWorkers = pdfEligibleWorkers;

    // Defining headers for autotable
    const tableHeaders = [
      ['Employee Name', 'Role/Designation', 'Primary Site', 'Daily Rate', 'Days', 'OT Pay', 'Gross Salary', 'Cash Adv.', 'Loan Pay', 'Corpo', 'Cash Bond', 'Uniform', 'Total Ded.', 'Net Salary']
    ];
    
    // Helper mapper to generate beautiful formatted display rows
    const mapItemToPDFRow = (item: typeof sortedPayrollWorkersData[0]) => [
      item.worker.name + (item.isSplit ? ' (Split)' : ''),
      item.worker.role,
      item.siteName,
      formatPDFCurrency(item.worker.dailyRate),
      `${item.summary.daysWorked % 1 === 0 ? item.summary.daysWorked.toFixed(0) : item.summary.daysWorked.toFixed(1)} d`,
      formatPDFCurrency(item.summary.overtimePay),
      formatPDFCurrency(item.summary.grossSalary),
      formatPDFCurrency(item.summary.cashAdvance),
      formatPDFCurrency(item.summary.loanPayment),
      formatPDFCurrency(item.summary.corpo || 0),
      formatPDFCurrency(item.summary.cashbond || 0),
      formatPDFCurrency(item.summary.uniformSafetyShoes || 0),
      formatPDFCurrency(item.summary.totalDeduction),
      formatPDFCurrency(item.summary.netSalary)
    ];

    let currentY = 44;

    // =================================*********
    // SECTION 1: SITE SUPERVISORS
    // =================================*********
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // deep slate
    doc.text('I. PROJECT SITE SUPERVISOR STAFF PAYROLL', 14, currentY);
    currentY += 4.5;

    if (supervisors.length > 0) {
      const supervisorRows = supervisors.map(mapItemToPDFRow);
      autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        head: tableHeaders,
        body: supervisorRows,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59], // Dark Slate gray header
          textColor: [255, 255, 255],
          fontSize: 6.5,
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { fontStyle: 'bold', fontSize: 6.2, cellWidth: 34 },
          1: { fontSize: 6.2, cellWidth: 24 },
          2: { fontSize: 6.2, cellWidth: 24 },
          3: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          4: { halign: 'center', fontSize: 6.2, cellWidth: 11 },
          5: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          6: { halign: 'center', fontSize: 6.2, cellWidth: 19 },
          7: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          8: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          9: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          10: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          11: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          12: { halign: 'center', textColor: [225, 29, 72], fontSize: 6.2, cellWidth: 17 }, // rose-600 Imposed center alignment
          13: { halign: 'center', fontStyle: 'bold', textColor: [49, 46, 129], fontSize: 6.5, cellWidth: 21 }, // indigo-950 Imposed center alignment
        },
        styles: {
          cellPadding: 1.2,
          valign: 'middle',
        },
        didParseCell: (data) => {
          if (data.section === 'head') {
            if ([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(data.column.index)) {
              data.cell.styles.halign = 'center';
            }
          }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('No site supervisors were processed in the selected date filters.', 16, currentY + 3);
      currentY += 12;
    }

    // =================================*********
    // SECTION 2: STANDARDIZED BUILDERS & WORKERS
    // =================================*********
    // Push section to a new page if we are getting close to bottom on page 1
    if (currentY > 165) {
      doc.addPage();
      currentY = 25;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('II. STANDARD CONSTRUCTION WORKERS & FIELD SPECIALISTS', 14, currentY);
    currentY += 4.5;

    if (constructionWorkers.length > 0) {
      const workerRows = constructionWorkers.map(mapItemToPDFRow);
      autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        head: tableHeaders,
        body: workerRows,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59], // Dark Slate gray header
          textColor: [255, 255, 255],
          fontSize: 6.5,
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { fontStyle: 'bold', fontSize: 6.2, cellWidth: 34 },
          1: { fontSize: 6.2, cellWidth: 24 },
          2: { fontSize: 6.2, cellWidth: 24 },
          3: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          4: { halign: 'center', fontSize: 6.2, cellWidth: 11 },
          5: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          6: { halign: 'center', fontSize: 6.2, cellWidth: 19 },
          7: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          8: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          9: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          10: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          11: { halign: 'center', fontSize: 6.2, cellWidth: 17 },
          12: { halign: 'center', textColor: [225, 29, 72], fontSize: 6.2, cellWidth: 17 }, // rose-600 Imposed center alignment
          13: { halign: 'center', fontStyle: 'bold', textColor: [49, 46, 129], fontSize: 6.5, cellWidth: 21 }, // indigo-950 Imposed center alignment
        },
        styles: {
          cellPadding: 1.2,
          valign: 'middle',
        },
        didParseCell: (data) => {
          if (data.section === 'head') {
            if ([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(data.column.index)) {
              data.cell.styles.halign = 'center';
            }
          }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    } else {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('No active craft builder/labor construction workers processed during this period.', 16, currentY + 3);
      currentY += 12;
    }

    // CHECK FOR VERTICAL SPACE BEFORE GRAND TOTALS BOX
    if (currentY > 165) {
      doc.addPage();
      currentY = 25;
    }

    // Aggregated Grand Totals block inside PDF
    doc.setFillColor(248, 250, 252); // slate-50 background
    doc.rect(14, currentY, 269, 18, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200 border
    doc.rect(14, currentY, 269, 18, 'S');
    
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('Helvetica', 'bold');
    
    doc.text('GRAND TOTAL GROSS:', 18, currentY + 5);
    doc.text('AGGREGATED OVERTIME PAY:', 85, currentY + 5);
    doc.text('TOTAL DEBIT DEDUCTIONS:', 155, currentY + 5);
    doc.text('UNIFIED MASTER NET PAYROLL:', 222, currentY + 5);
    
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    const aggregateOTPay = pdfEligibleWorkers.reduce((sum, item) => sum + item.summary.overtimePay, 0);
    doc.text(formatPDFCurrency(pdfGrandTotalGross), 18, currentY + 11);
    
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(formatPDFCurrency(aggregateOTPay), 85, currentY + 11);
    
    doc.setTextColor(220, 38, 38); // red-600
    doc.text(formatPDFCurrency(pdfGrandTotalDeductions), 155, currentY + 11);
    
    doc.setTextColor(49, 46, 129); // indigo-950
    doc.setFontSize(10.5);
    doc.setFont('Helvetica', 'bold');
    doc.text(formatPDFCurrency(pdfGrandTotalNet), 222, currentY + 11);
    
    // Sign-off verification blocks
    const sigY = currentY + 24;
    if (sigY < 192) { 
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('Helvetica', 'normal');
      
      doc.setDrawColor(203, 213, 225); // slate-300 lines
      
      // 1. Prepared by (Sheena Mae D. Serrano)
      doc.line(18, sigY + 8, 80, sigY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('SHEENA MAE D. SERRANO', 18, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Prepared by: Secretary', 18, sigY + 15);
      
      // 2. Audited by (Ericka Famorca)
      doc.line(110, sigY + 8, 172, sigY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('ERICKA FAMORCA', 110, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Audited by: CEO & HR Head', 110, sigY + 15);
      
      // 3. Approved by (Ronald C. Famorca)
      doc.line(200, sigY + 8, 262, sigY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('RONALD C. FAMORCA', 200, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Approved by: CEO', 200, sigY + 15);
    }
    
    doc.save(`Consolidated_Payroll_Report_${payrollPeriod}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportWorkerSlipToPDF = (worker: Worker) => {
    const detail = calculatePayrollSummary(worker);
    const defaultSiteName = sites.find(s => s.id === worker.assignedSiteId)?.name || 'Multiple Sites';
    
    const doc = new jsPDF('p', 'mm', 'a4'); // Elegant full-page A4
    
    const periodName = getPayrollPeriodLabel().toUpperCase();
    const subtitle = `Period: ${periodName}   |   Voucher: #SLIP-${worker.id.substring(0, 6).toUpperCase()}   |   Generated: ${new Date().toLocaleDateString()}`;

    // Draw luxury branded logo header
    drawPDFHeaderWithLogo(doc, 'OFFICIAL WORK VOUCHER & PAY SLIP', subtitle, false);

    // Sidebar/Details block (Subtle layout card)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, 46, 182, 38, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(14, 46, 182, 38, 'S');

    // Left Details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(worker.name, 20, 54);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Designation:`, 20, 61);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(worker.role, 48, 61);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Contact Phone:`, 20, 68);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(worker.phone || 'N/A', 48, 68);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Assigned Site:`, 20, 75);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(defaultSiteName, 48, 75);

    // Right Details of Card
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Daily Rate Scale:`, 115, 54);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${formatPDFCurrency(worker.dailyRate)} / day`, 152, 54);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Accumulated Days Worked:`, 115, 61);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${detail.daysWorked} days`, 165, 61);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Overtime Hours Accrued:`, 115, 68);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${detail.overtimeHours} hrs`, 165, 68);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Shift Records:`, 115, 75);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${detail.records.length} logged marks`, 165, 75);

    // ----------------------------------------------------
    // Section Breakdown: EARNINGS & COMPENSATIONS
    // ----------------------------------------------------
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('I. COMPENSATIVE GROSS EARNINGS', 16, 96);
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, 99, 196, 99);

    // Earnings Table List
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    
    doc.text('1. Base Work Wages (Daily Rate * Days Worked):', 20, 106);
    doc.setFont('Helvetica', 'bold');
    doc.text(formatPDFCurrency(worker.dailyRate * detail.daysWorked), 150, 106);
    
    doc.setFont('Helvetica', 'normal');
    doc.text(`2. Overtime Pay (Hours: ${detail.overtimeHours} x Rate x 0.125 multiplier):`, 20, 113);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(formatPDFCurrency(detail.overtimePay), 150, 113);
    
    // Total Earnings Subtotal
    doc.setDrawColor(241, 245, 249);
    doc.line(20, 118, 190, 118);
    
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('UNADJUSTED GROSS SALARY:', 20, 124);
    doc.text(formatPDFCurrency(detail.grossSalary), 150, 124);

    // ----------------------------------------------------
    // Section Breakdown: ITEMIZED DEDUCTIONS
    // ----------------------------------------------------
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text('II. ITEMIZED DEBITS & ADMIN DEDUCTIONS', 16, 138);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 141, 196, 141);

    // Items
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(220, 38, 38); // red-600

    doc.text('1. Cash Advance:', 20, 147);
    doc.setFont('Helvetica', 'bold');
    doc.text(formatPDFCurrency(detail.cashAdvance), 150, 147);

    doc.setFont('Helvetica', 'normal');
    doc.text('2. Company Loan Payment:', 20, 153);
    doc.setFont('Helvetica', 'bold');
    doc.text(formatPDFCurrency(detail.loanPayment), 150, 153);

    doc.setFont('Helvetica', 'normal');
    doc.text('3. Transportation Fuel / Operations Loan:', 20, 159);
    doc.setFont('Helvetica', 'bold');
    doc.text(formatPDFCurrency(detail.transportationLoan), 150, 159);

    doc.setFont('Helvetica', 'normal');
    doc.text('4. Corpo Deduction:', 20, 165);
    doc.setFont('Helvetica', 'bold');
    doc.text(formatPDFCurrency(detail.corpo || 0), 150, 165);

    doc.setFont('Helvetica', 'normal');
    doc.text('5. Cash Bond Deduction:', 20, 171);
    doc.setFont('Helvetica', 'bold');
    doc.text(formatPDFCurrency(detail.cashbond || 0), 150, 171);

    doc.setFont('Helvetica', 'normal');
    doc.text('6. Uniform & Shoes / Other Utang:', 20, 177);
    doc.setFont('Helvetica', 'bold');
    doc.text(formatPDFCurrency(detail.uniformSafetyShoes || 0), 150, 177);

    // Total Deductions line
    doc.setDrawColor(241, 245, 249);
    doc.line(20, 182, 190, 182);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(185, 28, 28); // red-750
    doc.text('TOTAL DEBIT DEDUCTIONS:', 20, 188);
    doc.text(formatPDFCurrency(detail.totalDeduction), 150, 188);

    // ----------------------------------------------------
    // III. TOTAL NET PAYOUT SUM
    // ----------------------------------------------------
    doc.setFillColor(238, 242, 255); // indigo-50 banner card
    doc.rect(14, 196, 182, 16, 'F');
    doc.setDrawColor(199, 210, 254); // indigo-200 border
    doc.rect(14, 196, 182, 16, 'S');

    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(49, 46, 129); // indigo-900
    doc.text('NET SALARY TAKE-HOME PAYOUT:', 20, 206);
    doc.setFontSize(14);
    doc.text(formatPDFCurrency(detail.netSalary), 148, 206);

    // Footnote
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('Helvetica', 'italic');
    doc.text('This payroll slip represents an officially audited site work statement. Hand signature verifies actual receipt of cash/payout.', 16, 222);

    // ----------------------------------------------------
    // IV. SIGN-OFFS AND APPROVAL LINES (A4 Perfect Spacing!)
    // ----------------------------------------------------
    const sigY = 236;
    doc.setDrawColor(148, 163, 184); // slate-400
    
    // 1. Prepared by (Sheena Mae D. Serrano)
    doc.line(16, sigY + 12, 66, sigY + 12);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('SHEENA MAE D. SERRANO', 16, sigY + 16);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Prepared by: Secretary', 16, sigY + 20);

    // 2. Audited by (Ericka H. Famorca)
    doc.line(80, sigY + 12, 130, sigY + 12);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('ERICKA H. FAMORCA', 80, sigY + 16);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Audited by', 80, sigY + 20);

    // 3. Approved by (Ronald C. Famorca)
    doc.line(144, sigY + 12, 194, sigY + 12);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('RONALD C. FAMORCA', 144, sigY + 16);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Approved by', 144, sigY + 20);

    // Hand Signature line for the employee
    doc.line(16, sigY + 36, 90, sigY + 36);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(worker.name.toUpperCase(), 16, sigY + 40);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Receiver / Employee Hand Signature & Date', 16, sigY + 44);

    doc.save(`Payslip_${worker.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportLoansPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4 is perfect for tabular ledger tracking reports
    
    const siteText = payrollSiteFilter === 'all' ? 'All Operational Sites' : (sites.find(s => s.id === payrollSiteFilter)?.name || 'Filtered Site');
    const subtitle = `Site Filter: ${siteText}   |   Current Register Date: ${new Date().toISOString().split('T')[0]}   |   System: Admin Ledger Hub`;

    // Draw luxury branded logo header
    drawPDFHeaderWithLogo(doc, 'DEBT & ADVANCES REGISTER LEDGER', subtitle, true);
    
    // Define table headers
    const headers = [
      ['Employee Name', 'Role / Designation', 'Primary Operational Site', 'Cash Advance Balance', 'Company Loan Balance', 'Transportation Loan', 'Total Outstanding Liabilities']
    ];
    
    // Filter active workers for loans context
    const loanRows = sortedPayrollWorkersData.map(item => {
      const ca = item.summary.cashAdvance;
      const lp = item.summary.loanPayment;
      const tl = item.summary.transportationLoan;
      const totalLiabilities = ca + lp + tl;
      return [
        item.worker.name,
        item.worker.role,
        item.siteName,
        formatPDFCurrency(ca),
        formatPDFCurrency(lp),
        formatPDFCurrency(tl),
        formatPDFCurrency(totalLiabilities)
      ];
    });
    
    autoTable(doc, {
      startY: 44,
      head: headers,
      body: loanRows,
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85], // slate-700
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold', fontSize: 8.5, cellWidth: 45 },
        1: { fontSize: 8, cellWidth: 35 },
        2: { fontSize: 8.5, cellWidth: 45 },
        3: { halign: 'center', fontSize: 8.5, textColor: [185, 28, 28], cellWidth: 32 }, // red-700
        4: { halign: 'center', fontSize: 8.5, textColor: [185, 28, 28], cellWidth: 32 },
        5: { halign: 'center', fontSize: 8.5, textColor: [185, 28, 28], cellWidth: 32 },
        6: { halign: 'center', fontStyle: 'bold', fontSize: 9, textColor: [127, 29, 29], cellWidth: 35 } // deep dark red
      },
      styles: {
        cellPadding: 2.5,
        valign: 'middle',
      },
      didParseCell: (data) => {
        if (data.section === 'head' && [3, 4, 5, 6].includes(data.column.index)) {
          data.cell.styles.halign = 'center';
        }
      }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 120;
    
    // Cumulative Summary Cards in PDF
    const sumCA = sortedPayrollWorkersData.reduce((sum, item) => sum + item.summary.cashAdvance, 0);
    const sumLP = sortedPayrollWorkersData.reduce((sum, item) => sum + item.summary.loanPayment, 0);
    const sumTL = sortedPayrollWorkersData.reduce((sum, item) => sum + item.summary.transportationLoan, 0);
    const sumAllLiabilities = sumCA + sumLP + sumTL;
    
    doc.setFillColor(254, 242, 242); // red-50 background for liabilities
    doc.rect(14, finalY + 4, 269, 18, 'F');
    doc.setDrawColor(252, 165, 165); // red-200 border
    doc.rect(14, finalY + 4, 269, 18, 'S');
    
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28); // red-700
    doc.setFont('Helvetica', 'bold');
    
    doc.text('TOTAL ACTIVE CASH ADVANCE:', 18, finalY + 9);
    doc.text('TOTAL ACTIVE COMPANY LOANS:', 85, finalY + 9);
    doc.text('TOTAL ACTIVE TRANSPORTATION:', 152, finalY + 9);
    doc.text('AGGREGATE LIABILITY LEDGER BALANCE:', 218, finalY + 9);
    
    doc.setFontSize(9.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatPDFCurrency(sumCA), 18, finalY + 15);
    doc.text(formatPDFCurrency(sumLP), 85, finalY + 15);
    doc.text(formatPDFCurrency(sumTL), 152, finalY + 15);
    
    doc.setTextColor(153, 27, 27); // deep red-800
    doc.setFontSize(10.5);
    doc.text(formatPDFCurrency(sumAllLiabilities), 218, finalY + 15);
    
    // Signatures / Audit section (matching layout in Master Payroll)
    const sigY = finalY + 28;
    if (sigY < 185) {
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('Helvetica', 'normal');
      
      doc.setDrawColor(203, 213, 225); // slate-300 lines
      
      // 1. Prepared by (Sheena Mae D. Serrano)
      doc.line(18, sigY + 8, 80, sigY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('SHEENA MAE D. SERRANO', 18, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Prepared by: Secretary', 18, sigY + 15);
      
      // 2. Audited by (Ericka H. Famorca)
      doc.line(110, sigY + 8, 172, sigY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('ERICKA H. FAMORCA', 110, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Audited by', 110, sigY + 15);
      
      // 3. Approved by (Ronald C. Famorca)
      doc.line(200, sigY + 8, 262, sigY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('RONALD C. FAMORCA', 200, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Approved by', 200, sigY + 15);
    }
    
    doc.save(`Operational_Adv_and_Loans_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportSupervisorPaymentsPDF = (loan: SupervisorLoan) => {
    const doc = new jsPDF('p', 'mm', 'a4'); // portrait A4 (210 x 297 mm)
    
    // Header design
    doc.setFillColor(15, 23, 42); // slate-900 header block
    doc.rect(0, 0, 210, 38, 'F');
    
    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(250, 204, 21); // bright yellow
    doc.text('FAMORCA - SITE SUPERVISOR LOAN STATEMENT', 14, 15);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(226, 232, 240); // Slate-200
    doc.text(`Official Repayment Ledger Statement  |  Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 21);
    doc.text('This serves as a binding statement of logged installment payments and remaining liability balance.', 14, 25);
    
    // Project Metadata Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, 44, 182, 36, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(14, 44, 182, 36, 'S');
    
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    
    // Metadata Details
    const associatedSite = sites.find(s => s.id === loan.siteId)?.name || 'N/A';
    doc.text('BORROWER DETAILS:', 18, 51);
    doc.text('FINANCIAL SUMMARY:', 110, 51);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // slate-600
    doc.setFontSize(8.5);
    
    doc.text(`Name: ${loan.supervisorName}`, 18, 57);
    doc.text(`Assigned Project: ${associatedSite}`, 18, 62);
    doc.text(`Original Date: ${loan.date}`, 18, 67);
    if (loan.notes) {
      doc.text(`Loan Notes: ${loan.notes.slice(0, 50)}${loan.notes.length > 50 ? '...' : ''}`, 18, 72);
    }
    
    const totalPaymentsAmt = (loan.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const balance = loan.totalAmount - totalPaymentsAmt;
    doc.text(`Total Original Loan: PHP ${loan.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 110, 57);
    doc.text(`Total Repayments Made: PHP ${totalPaymentsAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 110, 62);
    
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`REMAINING BALANCE: PHP ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 110, 69);
    
    // Payments Table Title
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('REPAYMENTS AND INSTALLMENT HISTORY', 14, 91);
    
    // Prepare table data
    const tableBody = (loan.payments || []).map((p, index) => [
      `#${index + 1}`,
      p.date,
      p.paymentMethod,
      p.reference || 'N/A',
      p.receivedBy || 'N/A',
      p.isConsolidated 
        ? `${p.notes || ''} [CONSOLIDATED EXCEL: ${p.consoStartDate} to ${p.consoEndDate}, No. of payments: ${p.numPaymentsMade}]`.trim() 
        : (p.notes || ''),
      `PHP ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);
    
    if (tableBody.length === 0) {
      tableBody.push([
        '-', 'No transactions found', '-', '-', '-', '-', 'PHP 0.00'
      ]);
    }
    
    // Render AutoTable
    autoTable(doc, {
      startY: 96,
      head: [['#', 'Payment Date', 'Payment Method', 'Reference Key', 'Received By', 'Remarks/Notes', 'Amount Paid']],
      body: tableBody,
      headStyles: {
        fillColor: [15, 23, 42], // slate-900
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 32 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 35 },
        6: { halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] } // green for repay
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        valign: 'middle'
      }
    });
    
    const finalTableY = (doc as any).lastAutoTable.finalY || 120;
    
    // Signature lines
    const sigY = finalTableY + 24;
    if (sigY < 270) {
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('Helvetica', 'normal');
      doc.setDrawColor(203, 213, 225); // slate-300 lines
      
      // 1. Prepared by
      doc.line(14, sigY + 8, 70, sigY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('SHEENA MAE D. SERRANO', 14, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Prepared by: Secretary', 14, sigY + 15);
      
      // 2. Borrower acknowledgement signature
      doc.line(110, sigY + 8, 166, sigY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(loan.supervisorName.toUpperCase(), 110, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Borrower Signature/Acknowledgment', 110, sigY + 15);
    }
    
    doc.save(`Supervisor_Repayments_Statement_${loan.supervisorName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportAllSupervisorLoansPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // A4 Landscape
    
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 38, 'F');
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(250, 204, 21); // bright yellow
    doc.text('FAMORCA - SITE SUPERVISOR CONSOLIDATED LOAN TRACKER', 14, 15);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(226, 232, 240);
    doc.text(`Consolidated Active Balances Report | Generated on ${new Date().toLocaleDateString()}`, 14, 23);
    
    const rows = supervisorLoans.map((loan, idx) => {
      const siteName = sites.find(s => s.id === loan.siteId)?.name || 'N/A';
      const totalPaid = (loan.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const bal = loan.totalAmount - totalPaid;
      return [
        `#${idx + 1}`,
        loan.supervisorName,
        siteName,
        loan.date,
        `PHP ${loan.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `PHP ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `PHP ${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    if (rows.length === 0) {
      rows.push([
        '-', 'No active supervisor loan entries found', '-', '-', 'PHP 0.00', 'PHP 0.00', 'PHP 0.00'
      ]);
    }

    autoTable(doc, {
      startY: 44,
      head: [['ID', 'Supervisor Name', 'Assigned Site', 'Date Logged', 'Original Loan Amt', 'Total Repayments', 'Net Outstanding Balance']],
      body: rows,
      headStyles: {
        fillColor: [15, 23, 42],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] }
      }
    });

    doc.save(`Supervisor_Consolidated_Loans_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportWorkerPaymentsPDF = (loan: WorkerLoan) => {
    const doc = new jsPDF('p', 'mm', 'a4'); // portrait A4 (210 x 297 mm)
    
    // Header design
    doc.setFillColor(15, 23, 42); // slate-900 header block
    doc.rect(0, 0, 210, 38, 'F');
    
    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(250, 204, 21); // bright yellow
    doc.text('FAMORCA - CONSTRUCTION WORKER LOAN STATEMENT', 14, 15);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(226, 232, 240); // Slate-200
    doc.text(`Official Repayment Ledger Statement  |  Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 21);
    doc.text('This serves as a binding statement of logged installment payments and remaining liability balance.', 14, 25);
    
    // Project Metadata Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, 44, 182, 36, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(14, 44, 182, 36, 'S');
    
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    
    // Metadata Details
    const associatedSite = sites.find(s => s.id === loan.siteId)?.name || 'N/A';
    doc.text('BORROWER DETAILS:', 18, 51);
    doc.text('FINANCIAL SUMMARY:', 110, 51);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // slate-600
    doc.setFontSize(8.5);
    
    doc.text(`Name: ${loan.workerName}`, 18, 57);
    doc.text(`Assigned Project: ${associatedSite}`, 18, 62);
    doc.text(`Original Date: ${loan.date}`, 18, 67);
    if (loan.notes) {
      doc.text(`Loan Notes: ${loan.notes.slice(0, 50)}${loan.notes.length > 50 ? '...' : ''}`, 18, 72);
    }
    
    const totalPaymentsAmt = (loan.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const balance = loan.totalAmount - totalPaymentsAmt;
    doc.text(`Total Original Loan: PHP ${loan.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 110, 57);
    doc.text(`Total Repayments Made: PHP ${totalPaymentsAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 110, 62);
    
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`REMAINING BALANCE: PHP ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 110, 69);
    
    // Payments Table Title
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('REPAYMENTS AND INSTALLMENT HISTORY', 14, 91);
    
    // Prepare table data
    const tableBody = (loan.payments || []).map((p, index) => [
      `#${index + 1}`,
      p.date,
      p.paymentMethod,
      p.reference || 'N/A',
      p.receivedBy || 'N/A',
      p.isConsolidated 
        ? `${p.notes || ''} [CONSOLIDATED EXCEL: ${p.consoStartDate} to ${p.consoEndDate}, No. of payments: ${p.numPaymentsMade}]`.trim() 
        : (p.notes || ''),
      `PHP ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);
    
    if (tableBody.length === 0) {
      tableBody.push([
        '-', 'No transactions found', '-', '-', '-', '-', 'PHP 0.00'
      ]);
    }
    
    // Render AutoTable
    autoTable(doc, {
      startY: 96,
      head: [['#', 'Payment Date', 'Payment Method', 'Reference Key', 'Received By', 'Remarks/Notes', 'Amount Paid']],
      body: tableBody,
      headStyles: {
        fillColor: [15, 23, 42], // slate-900
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 32 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 35 },
        6: { halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] } // green for repay
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        valign: 'middle'
      }
    });
    
    const finalTableY = (doc as any).lastAutoTable.finalY || 120;
    
    // Signature lines
    const sigY = finalTableY + 24;
    if (sigY < 270) {
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('Helvetica', 'normal');
      doc.setDrawColor(203, 213, 225); // slate-300 lines
      
      // 1. Prepared by
      doc.line(14, sigY + 8, 70, sigY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('SHEENA MAE D. SERRANO', 14, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Prepared by: Secretary', 14, sigY + 15);
      
      // 2. Borrower acknowledgement signature
      doc.line(110, sigY + 8, 166, sigY + 8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(loan.workerName.toUpperCase(), 110, sigY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Borrower Signature/Acknowledgment', 110, sigY + 15);
    }
    
    doc.save(`Worker_Repayments_Statement_${loan.workerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportAllWorkerLoansPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // A4 Landscape
    
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 38, 'F');
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(250, 204, 21); // bright yellow
    doc.text('FAMORCA - CONSTRUCTION WORKER CONSOLIDATED LOAN TRACKER', 14, 15);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(226, 232, 240);
    doc.text(`Consolidated Active Balances Report | Generated on ${new Date().toLocaleDateString()}`, 14, 23);
    
    const rows = workerLoans.map((loan, idx) => {
      const siteName = sites.find(s => s.id === loan.siteId)?.name || 'N/A';
      const totalPaid = (loan.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const bal = loan.totalAmount - totalPaid;
      return [
        `#${idx + 1}`,
        loan.workerName,
        siteName,
        loan.date,
        `PHP ${loan.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `PHP ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `PHP ${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    if (rows.length === 0) {
      rows.push([
        '-', 'No active worker loan entries found', '-', '-', 'PHP 0.00', 'PHP 0.00', 'PHP 0.00'
      ]);
    }

    autoTable(doc, {
      startY: 44,
      head: [['ID', 'Worker Name', 'Assigned Site', 'Date Logged', 'Original Loan Amt', 'Total Repayments', 'Net Outstanding Balance']],
      body: rows,
      headStyles: {
        fillColor: [15, 23, 42],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] }
      }
    });

    doc.save(`Workers_Consolidated_Loans_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };


  return (
    <div className="space-y-6" id={containerId}>
       {/* Tab Selector Nav Header */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg w-full md:w-auto border border-slate-200">
          <button
            onClick={() => setActiveSubTab('attendance')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'attendance'
                ? 'bg-black text-yellow-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Check-In Attendance
          </button>
          
          <button
            onClick={() => setActiveSubTab('roster')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'roster'
                ? 'bg-black text-yellow-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Staff & Worker Pool
          </button>

          <button
            onClick={() => setActiveSubTab('payroll')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'payroll'
                ? 'bg-black text-yellow-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
            }`}
          >
            <PhilippinePeso className="w-3.5 h-3.5" />
            Automatic Payroll
          </button>

          <button
            onClick={() => setActiveSubTab('cashbond')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'cashbond'
                ? 'bg-black text-yellow-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Worker Cashbond
          </button>

          <button
            onClick={() => setActiveSubTab('workers201')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'workers201'
                ? 'bg-black text-yellow-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            201 Core Directory
          </button>

          <button
            onClick={() => setActiveSubTab('supervisorLoans')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'supervisorLoans'
                ? 'bg-black text-yellow-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
            }`}
          >
            <PhilippinePeso className="w-3.5 h-3.5" />
            Supervisor Loans & Pay
          </button>

          <button
            onClick={() => setActiveSubTab('workerLoans')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'workerLoans'
                ? 'bg-black text-yellow-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Worker Loans & Sheet
          </button>
        </div>

        {activeSubTab === 'roster' && currentRole !== 'Site Supervisor' && (
          <button
            onClick={() => setShowAddWorkerModal(true)}
            className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-slate-700"
          >
            <UserPlus className="w-4 h-4 text-emerald-500" />
            Register Worker
          </button>
        )}

        {activeSubTab === 'attendance' && (
          <button
            onClick={() => setShowImportPanel(!showImportPanel)}
            className={`w-full md:w-auto rounded-lg px-3.5 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
              showImportPanel 
                ? 'bg-yellow-400 border-yellow-500 text-slate-900 shadow-xs font-black'
                : 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-yellow-400'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            {showImportPanel ? 'Hide Bulk Importer' : 'Bulk Import Attendance'}
          </button>
        )}
      </div>

      {/* ---------------------------------------------------------------------------
          TAB 1: ATTENDANCE LEDGER ENTRY (BULK LOGS)
          --------------------------------------------------------------------------- */}
      {activeSubTab === 'attendance' && showImportPanel && (
        <div className="mb-2">
          <ImportAttendance 
            workers={workers}
            sites={sites}
            defaultDate={attendanceDate}
            defaultSiteId={attendanceSiteFilter}
            onImportComplete={(newRecords) => {
              onUpdateAttendance(newRecords);
            }}
            onClose={() => setShowImportPanel(false)}
          />
        </div>
      )}

      {activeSubTab === 'attendance' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Booking Date</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg text-xs px-3 py-1.5 font-semibold text-slate-900 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Primary Working Site</label>
                {currentRole === 'Admin' ? (
                  <select
                    value={attendanceSiteFilter}
                    onChange={(e) => setAttendanceSiteFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg text-xs px-3 py-1.5 font-semibold text-slate-900 cursor-pointer focus:outline-hidden focus:border-sky-500"
                  >
                    <option value="all">All Sites Roster</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-block bg-black text-yellow-400 rounded-lg text-xs px-3 py-1.5 font-mono font-bold select-none">
                    {sites.find(s => s.id === assignedSiteId)?.name || 'YOUR SITE'} BOUND
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 text-left sm:text-right max-w-xs">
              Note: Changes update wages immediately. Daily rates and half-rates route labor budgets into construction project ledgers.
            </p>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="p-3">Worker Name</th>
                  <th className="p-3">Designation / Role</th>
                  <th className="p-3">Standard Daily Rate</th>
                  <th className="p-3">Assign Site (For Today)</th>
                  <th className="p-3 text-center">Status Action Log</th>
                  <th className="p-3 text-right">Today's Wage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eligibleWorkersForAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400">
                      No active workers listed on this site. Log roster workers in the Staff Pool first.
                    </td>
                  </tr>
                ) : (
                  eligibleWorkersForAttendance.map((worker) => {
                    const record = getAttendanceForDateAndWorker(worker.id);
                    const status = record?.status || null;
                    const assignedSite = record?.siteId || worker.assignedSiteId;
                    
                    return (
                      <tr key={worker.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">{worker.name}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-sm">
                            {worker.role}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600">{formatCurrency(worker.dailyRate)} / day</td>
                        
                        {/* Selector of which site they worked on today */}
                        <td className="p-3">
                          <select
                            value={assignedSite}
                            onChange={(e) => handleChangeAttendanceSite(worker, e.target.value)}
                            className="bg-transparent border border-slate-200 rounded px-1.5 py-1 text-[11px] font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:border-slate-300"
                          >
                            {sites.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>

                        {/* Status buttons */}
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5 max-w-[280px] mx-auto">
                            <button
                              onClick={() => handleToggleAttendance(worker, 'Present')}
                              className={`flex-1 py-1 px-2.5 rounded text-[10px] font-bold uppercase transition-all tracking-wide cursor-pointer flex items-center justify-center gap-1 ${
                                status === 'Present'
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              Present
                            </button>

                            <button
                              onClick={() => handleToggleAttendance(worker, 'Half-Day')}
                              className={`flex-1 py-1 px-2.5 rounded text-[10px] font-bold uppercase transition-all tracking-wide cursor-pointer flex items-center justify-center gap-1 ${
                                status === 'Half-Day'
                                  ? 'bg-yellow-400 text-slate-900 font-semibold shadow-xs'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              Half-Day
                            </button>

                            <button
                              onClick={() => handleToggleAttendance(worker, 'Absent')}
                              className={`flex-1 py-1 px-2.5 rounded text-[10px] font-bold uppercase transition-all tracking-wide cursor-pointer flex items-center justify-center gap-1 ${
                                status === 'Absent'
                                  ? 'bg-rose-500 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                              }`}
                            >
                              <X className="w-3 h-3" />
                              Absent
                            </button>
                          </div>
                        </td>

                        {/* Current daily wage */}
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(record ? record.wageEarned : 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ---------------------------------------------------------------------------
          TAB 2: ROSTER WORKER DIRECTORY
          --------------------------------------------------------------------------- */}
      {activeSubTab === 'roster' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-slate-950 text-sm">Roster Directory & Core wage settings</h3>
            
            {/* Roster query filters */}
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search workers, masonry, laborers..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-1.5 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-hidden"
              >
                <option value="all">All Sites default</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoster.map((worker) => {
              const defaultSite = sites.find(s => s.id === worker.assignedSiteId);
              return (
                <div key={worker.id} className="p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-slate-50/50 transition-all shadow-2xs space-y-3 relative overflow-hidden">
                  
                  {/* Decorative tag for role */}
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-sm tracking-wide bg-slate-100 text-slate-600">
                    {worker.role}
                  </span>

                  <div className="space-y-0.5">
                    <h4 className="font-bold text-slate-900 text-sm">{worker.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{worker.phone || 'No phone'}</p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Default Placement:</span>
                      <span className="font-medium text-slate-800 line-clamp-1 truncate max-w-[150px]">{defaultSite?.name || 'Unassigned'}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Day Scale Wage:</span>
                      <span className="font-bold text-slate-900 font-mono">{formatCurrency(worker.dailyRate)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setSelected201Worker(worker)}
                      className="p-1 px-2 border border-slate-200 hover:bg-slate-100/60 text-slate-700 rounded-md transition-colors cursor-pointer text-[10px] font-bold uppercase flex items-center gap-1"
                      title="Inspect worker 201 office profile folder"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      201 Folder
                    </button>
                    
                    {currentRole !== 'Site Supervisor' && onUpdateWorker && (
                      <div className="flex-1">
                        <select
                          value={worker.status || (worker.active ? 'active' : 'terminated')}
                          onChange={async (e) => {
                            const newStatus = e.target.value as 'active' | 'terminated' | 'awol';
                            await onUpdateWorker(worker.id, { 
                              status: newStatus, 
                              active: newStatus === 'active' 
                            });
                          }}
                          className={`w-full py-1 px-2 rounded-md text-[10px] font-extrabold uppercase transition-all cursor-pointer border focus:outline-hidden text-center ${
                            (worker.status || (worker.active ? 'active' : 'terminated')) === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : (worker.status || (worker.active ? 'active' : 'terminated')) === 'awol'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-150'
                          }`}
                        >
                          <option value="active">🟢 Active</option>
                          <option value="terminated">🔴 Terminated</option>
                          <option value="awol">🟡 AWOL</option>
                        </select>
                      </div>
                    )}

                    {currentRole !== 'Site Supervisor' && (
                      <button
                        onClick={() => setWorkerToDelete(worker)}
                        className="p-1 px-2 border border-rose-100 hover:bg-rose-50 text-rose-500 rounded-md transition-colors cursor-pointer"
                        title="Remove worker completely from pool"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ---------------------------------------------------------------------------
          TAB 3: PAYROLL CALCULATOR & SLIPS ENGINE
          --------------------------------------------------------------------------- */}
      {activeSubTab === 'payroll' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-5"
        >
          {/* Controls & Quick Filters bar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-indigo-500" />
                Labor & Payroll Ledger Generator
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">Generate work wage records, taxes, contributions, and consolidated reports.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search input to filter workers */}
              <div className="space-y-1 min-w-[160px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Search Employee</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or role..."
                    value={payrollSearch}
                    onChange={(e) => setPayrollSearch(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg text-xs pl-8 pr-2.5 py-1.5 font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-500 w-full md:w-44"
                  />
                </div>
              </div>

              {/* Site selector dropdown filter (All sites / Single site) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Work Site</label>
                {currentRole === 'Admin' ? (
                  <select
                    value={payrollSiteFilter}
                    onChange={(e) => setPayrollSiteFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg text-xs px-3 py-1.5 font-bold text-slate-900 cursor-pointer focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="all">📁 All Sites Combined</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>📍 {s.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-block bg-slate-900 text-yellow-400 rounded-lg text-xs px-3 py-1.5 font-mono font-bold select-none">
                    {sites.find(s => s.id === assignedSiteId)?.name || 'YOUR SITE'} BOUND
                  </span>
                )}
              </div>

              {/* Period selection dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cycle Duration</label>
                <select
                  value={payrollPeriod}
                  onChange={(e) => setPayrollPeriod(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg text-xs px-3 py-1.5 font-bold text-slate-900 cursor-pointer focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="weekly">📅 Weekly Payroll Cycles</option>
                  <option value="month">This Month To Date</option>
                  <option value="7days">Rolling Last 7 Days</option>
                  <option value="custom">🛠️ Custom Date Range</option>
                  <option value="all">All Available History</option>
                </select>
              </div>

              {/* Dynamic Week selection dropdown when 'weekly' is active */}
              {payrollPeriod === 'weekly' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Select Pay Week</label>
                  <div className="flex gap-2 items-center">
                    <select
                      value={selectedWeeklyRange}
                      onChange={(e) => setSelectedWeeklyRange(e.target.value)}
                      className="bg-indigo-50 border border-indigo-200 rounded-lg text-xs px-3 py-1.5 font-bold text-indigo-955 cursor-pointer focus:outline-hidden focus:border-indigo-500"
                    >
                      {weeklyChoices.map(c => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    {onUpdateWorker && (
                      <button
                        type="button"
                        onClick={() => setShowClearAdvancesModal(true)}
                        className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer select-none transition-colors shrink-0"
                        title="Clear and reset all encoded weekly cash advances for this cycle"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        Clear Advances
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Custom start/end date picker when 'custom' is active */}
              {payrollPeriod === 'custom' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 font-semibold text-slate-950 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 font-semibold text-slate-950 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              {/* Actions: CSV, PDF and PRINT */}
              <div className="space-y-1 self-end flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                <button
                  onClick={handleExportToCSV}
                  disabled={sortedPayrollWorkersData.length === 0}
                  className="flex-1 md:flex-none justify-center bg-slate-900 hover:bg-black disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer select-none transition-colors border border-slate-800"
                  title="Export current master report to CSV file"
                >
                  <Download className="w-3.5 h-3.5 text-yellow-400" />
                  Excel/CSV
                </button>

                <button
                  onClick={handleExportToPDF}
                  disabled={sortedPayrollWorkersData.length === 0}
                  className="flex-1 md:flex-none justify-center bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer select-none transition-all shadow-2xs border border-red-700"
                  title="Download consolidated master PDF report directly"
                >
                  <FileText className="w-3.5 h-3.5 text-white" />
                  Download PDF
                </button>

                <button
                  onClick={() => setShowPrintReportModal(true)}
                  disabled={sortedPayrollWorkersData.length === 0}
                  className="flex-1 md:flex-none justify-center bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 text-indigo-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer select-none transition-colors border border-indigo-200"
                  title="Open print review for PDF print exports"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Preview
                </button>
              </div>
            </div>
          </div>

          {/* Sub-modes within payroll tab (Admin-exclusive toggle): Standard Matrix vs. Loans Tracker */}
          {currentRole === 'Admin' && (
            <div className="flex bg-slate-100 p-1 rounded-xl self-start w-fit border border-slate-200">
              <button
                onClick={() => setPayrollMode('matrix')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  payrollMode === 'matrix'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                <PhilippinePeso className="w-3.5 h-3.5 text-emerald-500" />
                Wages & Payroll Matrix
              </button>
              <button
                onClick={() => setPayrollMode('loans')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  payrollMode === 'loans'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                Loans & Advances Registry (Admin Tracker)
              </button>
            </div>
          )}

          {payrollMode === 'matrix' && (
            <>
              {/* Overall Multi-Site Worker Audit and Allocation Choice Panel */}
              {(() => {
                const multiSiteWorkersInfo = workers.map(worker => {
                  const shiftsMap = getWorkerShiftsBySite(worker);
                  const workedSiteIds = Object.keys(shiftsMap);
                  if (workedSiteIds.length <= 1) return null;
                  return { worker, workedSiteIds, shiftsMap };
                }).filter((x): x is NonNullable<typeof x> => x !== null);

                return (
                  <div className="space-y-4">
                    {multiSiteWorkersInfo.length > 0 ? (
                      <div className="bg-amber-50/45 border border-amber-200/80 p-5 rounded-xl space-y-4 shadow-3xs">
                        <div className="flex items-start gap-3">
                          <div className="bg-amber-100 p-1.5 rounded-lg text-amber-800">
                            <ShieldAlert className="w-5 h-5 shrink-0" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                              Multi-Site Duty Allocation Manager ({multiSiteWorkersInfo.length} Worker{multiSiteWorkersInfo.length > 1 ? 's' : ''} Detected)
                            </h4>
                            <p className="text-[10px] text-slate-600 font-medium">
                              The following employees have registered attendance on more than one project site in this pay cycle context. Attribute their payroll to split proportions or allocate standard single-site cost of your preference so individual site-expenses are shouldered accurately.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {multiSiteWorkersInfo.map(({ worker, workedSiteIds, shiftsMap }) => {
                            const allocation = workerSiteAllocations[worker.id] || { mode: 'split' };
                            const totalDaysVal = Object.values(shiftsMap).reduce((sum, item) => sum + item.totalRawDays, 0);

                            return (
                              <div 
                                key={worker.id} 
                                className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-3.5 shadow-2xs hover:border-indigo-300 transition-all"
                              >
                                <div>
                                  <span className="font-extrabold text-slate-900 text-sm block leading-snug">{worker.name}</span>
                                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block mt-0.5">{worker.role}</span>
                                </div>

                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block pb-1 border-b border-slate-100">
                                    Logged Activity ({totalDaysVal.toFixed(1)} Days Total Summary)
                                  </span>
                                  <div className="space-y-1">
                                    {workedSiteIds.map(sId => {
                                      const detail = shiftsMap[sId];
                                      const siteName = sites.find(s => s.id === sId)?.name || 'Unassigned Site';
                                      return (
                                        <div key={sId} className="flex justify-between items-center text-[10px] font-bold text-slate-700">
                                          <span className="truncate pr-2">📍 {siteName}</span>
                                          <span className="font-mono bg-indigo-50/60 text-indigo-700 px-1.5 py-0.5 rounded-sm shrink-0">
                                            {detail.totalRawDays.toFixed(1)} d ({detail.isPresent}p, {detail.isHalf}h)
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">
                                    weekly ledger attribution
                                  </label>
                                  
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setWorkerSiteAllocations(prev => ({
                                          ...prev,
                                          [worker.id]: { mode: 'split' }
                                        }));
                                      }}
                                      className={`px-2 py-1.5 text-[10px] font-extrabold rounded-lg cursor-pointer select-none text-center border transition-all ${
                                        allocation.mode === 'split'
                                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      🥞 Split Proportional
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setWorkerSiteAllocations(prev => ({
                                          ...prev,
                                          [worker.id]: { mode: 'single', singleSiteId: workedSiteIds[0] }
                                        }));
                                      }}
                                      className={`px-2 py-1.5 text-[10px] font-extrabold rounded-lg cursor-pointer select-none text-center border transition-all ${
                                        allocation.mode === 'single'
                                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      🎨 Single Site 100%
                                    </button>
                                  </div>

                                  {allocation.mode === 'single' && (
                                    <div className="pt-1.5">
                                      <select
                                        value={allocation.singleSiteId || workedSiteIds[0]}
                                        onChange={(e) => {
                                          setWorkerSiteAllocations(prev => ({
                                            ...prev,
                                            [worker.id]: { mode: 'single', singleSiteId: e.target.value }
                                          }));
                                        }}
                                        className="w-full bg-white border border-slate-200 rounded-lg text-[10px] px-2 py-1.5 font-bold text-slate-800 cursor-pointer focus:outline-hidden focus:border-indigo-500"
                                      >
                                        {workedSiteIds.map(sId => {
                                          const siteName = sites.find(s => s.id === sId)?.name || 'Unassigned Site';
                                          return (
                                            <option key={sId} value={sId}>Charge entirely to: {siteName}</option>
                                          );
                                        })}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50/65 border border-slate-200/50 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Unified Period Audit: No multiple site worker split assignments detected in the selected period.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Master Continuous Ledger Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-100/80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th 
                        className="p-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                        onClick={() => togglePayrollSort('name')}
                      >
                        <div className="flex items-center gap-1.5">
                          Site Supervisor / Construction Worker
                          <ArrowUpDown className={`w-3 h-3 ${payrollSortField === 'name' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`} />
                        </div>
                      </th>
                      <th 
                        className="p-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                        onClick={() => togglePayrollSort('site')}
                      >
                        <div className="flex items-center gap-1.5">
                          Assigned Site
                          <ArrowUpDown className={`w-3 h-3 ${payrollSortField === 'site' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`} />
                        </div>
                      </th>
                      <th className="p-3 text-right">Daily Rate</th>
                      <th className="p-3 text-center">Days Worked</th>
                      <th className="p-3 text-center">OT Hours</th>
                      <th className="p-3 text-right text-indigo-600 whitespace-nowrap">OT Pay</th>
                      <th className="p-3 text-right">Gross Salary</th>
                      <th className="p-3 text-right text-rose-500 whitespace-nowrap">Cash Adv.</th>
                      <th className="p-3 text-right text-rose-500 whitespace-nowrap">Co. Loan</th>
                      <th className="p-3 text-right text-rose-500 whitespace-nowrap">Trans. Loan</th>
                      <th className="p-3 text-right text-rose-500 whitespace-nowrap">Corpo</th>
                      <th className="p-3 text-right text-rose-500 whitespace-nowrap">Cash Bond</th>
                      <th className="p-3 text-right text-rose-500 whitespace-nowrap">Uniform & Shoes</th>
                      <th className="p-3 text-right text-rose-600 font-bold">Total Ded.</th>
                      <th 
                        className="p-3 text-right cursor-pointer select-none hover:bg-indigo-50/50 transition-colors text-indigo-900 font-bold"
                        onClick={() => togglePayrollSort('netPay')}
                      >
                        <div className="flex items-center gap-1 justify-end">
                          Net Salary Payout
                          <ArrowUpDown className={`w-3 h-3 ${payrollSortField === 'netPay' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`} />
                        </div>
                      </th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedPayrollWorkersData.length === 0 ? (
                      <tr>
                        <td colSpan={16} className="text-center p-8 text-slate-400 font-medium">
                          No active employee wage calculations match the current filters or search query.
                        </td>
                      </tr>
                    ) : (
                      sortedPayrollWorkersData.map((item) => {
                        const { worker, summary, siteName, isSplit } = item;
                        const isOverridden = worker.customDays !== undefined && worker.customDays !== null;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block leading-snug">
                                {worker.name}
                                {isSplit && (
                                  <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded-xs text-[8px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                    Split Share
                                  </span>
                                )}
                              </span>
                              <span className="text-[9px] uppercase tracking-wide text-slate-400 font-bold">{worker.role}</span>
                            </td>
                            <td className="p-3 font-semibold text-slate-700">
                              {siteName}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-500">{formatCurrency(worker.dailyRate)}</td>
                            <td className="p-3 text-center font-bold font-mono text-emerald-600">
                              <span>{summary.daysWorked % 1 === 0 ? summary.daysWorked.toFixed(0) : summary.daysWorked.toFixed(1)} d</span>
                              {isOverridden && (
                                <span className="ml-1 text-[8px] bg-indigo-100 text-indigo-800 font-bold px-1 rounded-sm select-none" title="Manually edited number of days">
                                  Manual
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold font-mono text-yellow-600">
                              {summary.overtimeHours} hrs
                            </td>
                            <td className="p-3 text-right font-semibold font-mono text-indigo-600">
                              {formatCurrency(summary.overtimePay)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-700">
                              {formatCurrency(summary.grossSalary)}
                            </td>
                            <td className="p-3 text-right font-mono text-rose-600">
                              {summary.cashAdvance > 0 ? `${formatCurrency(summary.cashAdvance)}` : '—'}
                            </td>
                            <td className="p-3 text-right font-mono text-rose-600">
                              {summary.loanPayment > 0 ? `${formatCurrency(summary.loanPayment)}` : '—'}
                            </td>
                            <td className="p-3 text-right font-mono text-rose-600">
                              {summary.transportationLoan > 0 ? `${formatCurrency(summary.transportationLoan)}` : '—'}
                            </td>
                            <td className="p-3 text-right font-mono text-rose-600">
                              {summary.corpo && summary.corpo > 0 ? `${formatCurrency(summary.corpo)}` : '—'}
                            </td>
                            <td className="p-3 text-right font-mono text-rose-600">
                              {summary.cashbond && summary.cashbond > 0 ? `${formatCurrency(summary.cashbond)}` : '—'}
                            </td>
                            <td className="p-3 text-right font-mono text-rose-600">
                              {summary.uniformSafetyShoes && summary.uniformSafetyShoes > 0 ? `${formatCurrency(summary.uniformSafetyShoes)}` : '—'}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-rose-700 bg-rose-50/5">
                              {formatCurrency(summary.totalDeduction)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-indigo-900 bg-indigo-50/20">
                              {formatCurrency(summary.netSalary)}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedSlipWorker(worker)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg px-2.5 py-1 text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title="Print worker voucher"
                                >
                                  <Printer className="w-3 h-3" />
                                  Slip
                                </button>
                                
                                {currentRole === 'Admin' && (
                                  <button
                                    onClick={() => handleOpenEditPayroll(worker)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg px-2.5 py-1 text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Encode overtime & admin deductions"
                                  >
                                    <PhilippinePeso className="w-3 h-3 text-yellow-300" />
                                    Encode
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Aggregated Totals Footer Section */}
              <div className="bg-indigo-950 text-white rounded-xl p-5 border border-indigo-900 grid grid-cols-2 md:grid-cols-4 gap-6 font-mono shadow-xs mt-4 animate-fade-in">
                <div className="space-y-1.5 border-r border-indigo-800/40 pr-4 last:border-0">
                  <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Grand Gross Labor Wages</span>
                  <span className="text-sm md:text-lg font-black tracking-tight block">{formatCurrency(grandTotalGross)}</span>
                </div>
                <div className="space-y-1.5 border-r border-indigo-800/40 pr-4 last:border-0">
                  <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Total Deductions</span>
                  <span className="text-sm md:text-lg font-black tracking-tight text-rose-300 block">{formatCurrency(grandTotalDeductions)}</span>
                </div>
                <div className="space-y-1.5 border-r border-indigo-800/40 pr-4 last:border-0">
                  <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Aggregated Overtime Pay</span>
                  <span className="text-sm md:text-lg font-black tracking-tight text-emerald-300 block">
                    {formatCurrency(sortedPayrollWorkersData.reduce((sum, item) => sum + item.summary.overtimePay, 0))}
                  </span>
                </div>
                <div className="space-y-1.5 pr-4 last:border-0">
                  <span className="text-[10px] text-yellow-300 font-bold uppercase tracking-wider block">Unified Multi-Site Net Payroll</span>
                  <span className="text-sm md:text-lg font-extrabold tracking-tight text-yellow-400 block">{formatCurrency(grandTotalNet)}</span>
                </div>
              </div>
            </>
          )}

          {payrollMode === 'loans' && (
            <div className="space-y-5 animate-fade-in print:p-0">
              {/* Debt KPIs Block */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-rose-50/40 p-3.5 rounded-xl border border-rose-100/60 shadow-2xs space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Active Cash Advances</span>
                  <span className="text-sm md:text-lg font-black tracking-tight text-rose-700 block">
                    {formatCurrency(sortedPayrollWorkersData.reduce((sum, item) => sum + item.summary.cashAdvance, 0))}
                  </span>
                </div>
                <div className="bg-rose-50/40 p-3.5 rounded-xl border border-rose-100/60 shadow-2xs space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Outstanding Company Loans</span>
                  <span className="text-sm md:text-lg font-black tracking-tight text-rose-700 block">
                    {formatCurrency(sortedPayrollWorkersData.reduce((sum, item) => sum + item.summary.loanPayment, 0))}
                  </span>
                </div>
                <div className="bg-rose-50/40 p-3.5 rounded-xl border border-rose-100/60 shadow-2xs space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Transportation/Fuel Loans</span>
                  <span className="text-sm md:text-lg font-black tracking-tight text-rose-700 block">
                    {formatCurrency(sortedPayrollWorkersData.reduce((sum, item) => sum + item.summary.transportationLoan, 0))}
                  </span>
                </div>
                <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-rose-300 font-bold block">Aggregate Unpaid Liabilities</span>
                  <span className="text-sm md:text-lg font-black tracking-tight text-rose-400 block">
                    {formatCurrency(
                      sortedPayrollWorkersData.reduce((sum, item) => {
                        const s = item.summary;
                        return sum + s.cashAdvance + s.loanPayment + s.transportationLoan;
                      }, 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Sub-header actions for loans */}
              <div className="flex items-center justify-between border-b pb-2">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Employee Loan Directory</h4>
                  <p className="text-[10px] text-slate-500 font-medium font-mono">Real-time ledger entries representing current unpaid balances.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRegisterLoanModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg px-2.5 py-1.5 text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Register dynamic new loan or advance"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-white" />
                    Register New Loan
                  </button>
                  <button
                    onClick={handleExportLoansPDF}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg px-2.5 py-1.5 text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Export the list of loans directly as PDF"
                  >
                    <FileText className="w-3.5 h-3.5 text-white" />
                    Download Loans PDF
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg px-2.5 py-1.5 text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Send current ledger list to printer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Ledger
                  </button>
                </div>
              </div>

              {/* Loans ledger table */}
              <div className="overflow-x-auto rounded-xl border border-rose-250">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-rose-50/20 border-b border-rose-100/50 text-rose-900 font-semibold uppercase text-[10px] tracking-wider font-mono">
                      <th className="p-3">Site Supervisor / Construction Worker</th>
                      <th className="p-3">Assigned Site</th>
                      <th className="p-3 text-right">Cash Advance Tracking</th>
                      <th className="p-3 text-right">Company Loan Tracking</th>
                      <th className="p-3 text-right">Transportation Loan</th>
                      <th className="p-3 text-right text-rose-700 font-bold">Total Outstanding</th>
                      <th className="p-3 text-center">Encode Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50/45">
                    {sortedPayrollWorkersData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-slate-400 font-medium whitespace-nowrap">
                          No matching employee loan context in this query or filter parameter.
                        </td>
                      </tr>
                    ) : (
                      sortedPayrollWorkersData.map((item) => {
                        const { worker, summary, siteName } = item;
                        // Calculate registered loans totals
                        const caReg = allLoans.filter(l => l.workerId === worker.id && l.type === 'cash_advance').reduce((sum, l) => sum + l.amount, 0) || worker.cashAdvance || 0;
                        const caPaid = summary.cashAdvance;
                        const caBal = Math.max(0, caReg - caPaid);

                        const coReg = allLoans.filter(l => l.workerId === worker.id && l.type === 'company_loan').reduce((sum, l) => sum + l.amount, 0) || worker.loanPayment || 0;
                        const coPaid = summary.loanPayment;
                        const coBal = Math.max(0, coReg - coPaid);

                        const trReg = allLoans.filter(l => l.workerId === worker.id && l.type === 'transportation_loan').reduce((sum, l) => sum + l.amount, 0) || worker.transportationLoan || 0;
                        const trPaid = summary.transportationLoan;
                        const trBal = Math.max(0, trReg - trPaid);

                        const grandReg = caReg + coReg + trReg;
                        const grandPaid = caPaid + coPaid + trPaid;
                        const grandBal = caBal + coBal + trBal;

                        return (
                          <tr key={item.id} className="hover:bg-rose-50/10 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block leading-snug">
                                {worker.name}
                                {item.isSplit && (
                                  <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded-xs text-[8px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                    Split Share
                                  </span>
                                )}
                              </span>
                              <span className={`inline-block px-1 rounded text-[8px] font-mono font-bold uppercase ${
                                worker.role.toLowerCase().includes('supervisor') 
                                  ? 'bg-amber-100 text-amber-900' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {worker.role}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-700">
                              {siteName}
                            </td>
                            <td className="p-3 text-right text-slate-900 font-medium">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-400 block" title="Initial principal balance">P: {formatCurrency(caReg)}</span>
                                <span className="text-[10px] text-rose-500 block" title="Paid under current week payroll">-Paid: {formatCurrency(caPaid)}</span>
                                <span className="text-xs font-bold text-emerald-700 block" title="Net remainder balance">Bal: {formatCurrency(caBal)}</span>
                              </div>
                            </td>
                            <td className="p-3 text-right text-slate-900 font-medium">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-400 block" title="Initial principal balance">P: {formatCurrency(coReg)}</span>
                                <span className="text-[10px] text-rose-500 block" title="Paid under current week payroll">-Paid: {formatCurrency(coPaid)}</span>
                                <span className="text-xs font-bold text-emerald-700 block" title="Net remainder balance">Bal: {formatCurrency(coBal)}</span>
                              </div>
                            </td>
                            <td className="p-3 text-right text-slate-900 font-medium">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-400 block" title="Initial principal balance">P: {formatCurrency(trReg)}</span>
                                <span className="text-[10px] text-rose-500 block" title="Paid under current week payroll">-Paid: {formatCurrency(trPaid)}</span>
                                <span className="text-xs font-bold text-emerald-700 block" title="Net remainder balance">Bal: {formatCurrency(trBal)}</span>
                              </div>
                            </td>
                            <td className="p-3 text-right font-mono text-rose-900 bg-rose-50/10">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 block">TP: {formatCurrency(grandReg)}</span>
                                <span className="text-[10px] text-rose-600 block">-TtPd: {formatCurrency(grandPaid)}</span>
                                <span className="text-xs font-black text-rose-700 block">Out: {formatCurrency(grandBal)}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleOpenEditPayroll(worker)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg px-2.5 py-1 text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                title="Adjust/Encode outstanding loans directly"
                              >
                                <PhilippinePeso className="w-3 h-3 text-yellow-300" />
                                Modify Debt
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ---------------------------------------------------------------------------
          TAB 4: WORKERS SECURITY CASHBOND FUNDS LEDGER
          --------------------------------------------------------------------------- */}
      {activeSubTab === 'cashbond' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-1.5">
                <TrendingUp className="w-5 h-5 text-yellow-500" />
                Workers Security Cashbond Ledger
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Accumulating ₱100.00 per-attendance deductions for all non-supervisor active roster builders.
              </p>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-mono bg-yellow-400/10 text-yellow-800 font-extrabold px-3 py-1.5 rounded border border-yellow-200 uppercase tracking-wider block">
                Standard Deduction Rate: ₱100.00 / Present Day
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-[10px] text-white uppercase tracking-wider font-extrabold font-mono border-b">
                  <th className="p-3">Worker Name</th>
                  <th className="p-3">Role Designation</th>
                  <th className="p-3">Primary Assigned Site</th>
                  <th className="p-3 text-center">Worked Cycles</th>
                  <th className="p-3 text-right">Deduction / Rate</th>
                  <th className="p-3 text-right">Total Accumulated Fund</th>
                  <th className="p-3 text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-705">
                {workers.filter(w => w.role !== 'Supervisor').map((worker) => {
                  const defaultSite = sites.find(s => s.id === worker.assignedSiteId);
                  
                  // Compute worked attendance days (cycles) from records
                  const presentCount = attendance.filter(a => a.workerId === worker.id && a.status === 'Present').length;
                  const halfCount = attendance.filter(a => a.workerId === worker.id && a.status === 'Half-Day').length;
                  const presentDays = presentCount + (0.5 * halfCount);
                  const estimatedCashbond = presentDays * 105; // standard sample default estimator
                  
                  // Use worker's cashbond value if overridden, otherwise fallback to estimated
                  const accumulatedFund = worker.cashbond !== undefined ? worker.cashbond : estimatedCashbond;

                  return (
                    <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{worker.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded">
                          {worker.role}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-500">{defaultSite?.name || 'Unassigned Depot'}</td>
                      <td className="p-3 text-center font-mono font-semibold">{presentDays} days</td>
                      <td className="p-3 text-right font-mono text-stone-500">₱100.00</td>
                      <td className="p-3 text-right font-mono font-black text-emerald-600">{formatCurrency(accumulatedFund)}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            const val = window.prompt(`Adjust Security Cashbond Reserve for ${worker.name}:`, String(accumulatedFund));
                            if (val !== null && !isNaN(Number(val))) {
                              onUpdateWorker && onUpdateWorker(worker.id, { cashbond: Number(val) });
                            }
                          }}
                          className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer rounded font-bold uppercase transition-all border border-slate-200"
                        >
                          Adjust Fund
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* TAB 5: 201 PERSONNEL DIRECTORY & CORE FILE SYSTEM */}
      {activeSubTab === 'workers201' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-yellow-500" />
                201 Corporate Personnel Registry
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Official centralized directory of hires, residential addresses, emergency contacts, and status classifications.
              </p>
            </div>
            
            {/* Search filter indicator */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or role..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-1.5 focus:outline-hidden focus:border-yellow-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-900 font-black text-[10px] uppercase tracking-wider text-neutral-300">
                  <th className="p-3">Employee Name</th>
                  <th className="p-3">Designation / Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date Hired</th>
                  <th className="p-3">Residential Address</th>
                  <th className="p-3">Emergency Contact</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRoster.length > 0 ? (
                  filteredRoster.map((worker) => {
                    const statusVal = worker.employmentStatus || 'Project-based';
                    return (
                      <tr key={worker.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900 text-sm">{worker.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{worker.phone || 'No phone digit'}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-850 rounded font-bold text-[9px] uppercase tracking-wider">
                            {worker.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider ${
                            statusVal === 'Regular' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            statusVal === 'Probationary' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            statusVal === 'Project-based' ? 'bg-yellow-50 text-yellow-800 border border-yellow-250' :
                            'bg-slate-100 text-slate-650'
                          }`}>
                            {statusVal}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{worker.dateHired || '2021-04-12'}</td>
                        <td className="p-3 text-slate-500 max-w-xs truncate" title={worker.address || 'On file'}>
                          {worker.address || 'Cavite Province, Ph'}
                        </td>
                        <td className="p-3">
                          <div className="text-slate-800 text-[11px] font-bold">{worker.emergencyContactName || 'Ronald Famorca'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{worker.emergencyContactPhone || '+63-917-555-4011'}</div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelected201Worker(worker)}
                            className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 font-black uppercase text-[9px] rounded-lg text-slate-950 flex items-center gap-1 mx-auto cursor-pointer border border-yellow-400 shadow-sm"
                            title="Open official 201 file"
                          >
                            <FileText className="w-3 h-3" />
                            View 201 Folder
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-400 italic font-medium">
                      No matching 201 personnel records found. Choose 'Add Worker' or clear search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* TAB 6: SITE SUPERVISORS FINANCE LOANS & REPAYMENTS DIRECTORY */}
      {activeSubTab === 'supervisorLoans' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6 text-left"
        >
          {/* Header Dashboard section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-1.5">
                <PhilippinePeso className="w-5 h-5 text-yellow-500" />
                Site Supervisor Debt & Payments Ledger
              </h3>
              <p className="text-[11px] text-slate-500 font-medium pb-0.5">
                Track, process, and audit long-term supervisor liabilities with itemized installment history records.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportAllSupervisorLoansPDF}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-yellow-400 font-extrabold uppercase text-[10px] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Consolidated PDF
              </button>
              
              {currentRole !== 'Site Supervisor' && (
                <button
                  type="button"
                  onClick={() => {
                    const firstSuper = workers.find(w => w.role === 'Supervisor' || w.role === 'Foreman');
                    if (firstSuper) setSvLoanSupervisorId(firstSuper.id);
                    setSvLoanSiteId(sites[0]?.id || '');
                    setSvLoanDate(new Date().toISOString().split('T')[0]);
                    setSvLoanTotalAmount('');
                    setSvLoanNotes('');
                    setSvLoanError('');
                    setShowAddSvLoanModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black uppercase text-[10px] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm border border-yellow-400 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Register New Supervisor Loan
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left side: Loans Directory List */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Supervisor Loan Registry</h4>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {currentRole === 'Site Supervisor' 
                    ? supervisorLoans.filter(l => l.siteId === assignedSiteId).length 
                    : supervisorLoans.length} logged
                </span>
              </div>

              {currentRole !== 'Site Supervisor' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search supervisor name..."
                    value={svLoanSearch}
                    onChange={(e) => setSvLoanSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-1.5 focus:outline-hidden focus:border-yellow-500"
                  />
                </div>
              )}

              {/* Loans List */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {(() => {
                  const filtered = supervisorLoans.filter(loan => {
                    if (currentRole === 'Site Supervisor' && loan.siteId !== assignedSiteId) {
                      return false;
                    }
                    if (svLoanSearch.trim()) {
                      return loan.supervisorName.toLowerCase().includes(svLoanSearch.toLowerCase());
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center p-8 text-slate-400 italic font-medium text-xs">
                        No supervisor loan records found.
                      </div>
                    );
                  }

                  return filtered.map((loan) => {
                    const totalPaymentsAmt = (loan.payments || []).reduce((sum, p) => sum + p.amount, 0);
                    const outstanding = loan.totalAmount - totalPaymentsAmt;
                    const siteName = sites.find(s => s.id === loan.siteId)?.name || 'N/A';
                    const isSelected = selectedSvLoan?.id === loan.id;

                    return (
                      <div
                        key={loan.id}
                        onClick={() => setSelectedSvLoan(loan)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer text-left space-y-2.5 relative overflow-hidden ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className={`font-black text-xs uppercase tracking-tight ${isSelected ? 'text-yellow-400' : 'text-slate-900'}`}>
                              {loan.supervisorName}
                            </div>
                            <div className={`text-[10px] font-bold ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                              Site: {siteName}
                            </div>
                          </div>
                          {currentRole !== 'Site Supervisor' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Are you sure you want to delete this Entire Loan Record along with its payments history? This is permanent.")) {
                                  if (onDeleteSupervisorLoan) onDeleteSupervisorLoan(loan.id);
                                  if (isSelected) setSelectedSvLoan(null);
                                }
                              }}
                              className={`p-1 rounded-lg hover:bg-red-500 hover:text-white transition-colors cursor-pointer ${
                                isSelected ? 'text-slate-400 hover:text-white' : 'text-slate-450 hover:bg-red-50'
                              }`}
                              title="Delete Entire Loan and ledger history"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100/10">
                          <div>
                            <div className="text-[10px] uppercase text-slate-400 font-bold">Orig. Debt</div>
                            <div className="text-xs font-mono font-extrabold">
                              ₱{loan.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-slate-400 font-bold">Outstanding</div>
                            <div className={`text-xs font-mono font-extrabold ${outstanding > 0 ? 'text-red-550' : 'text-emerald-500'}`}>
                              ₱{outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-1">
                          <span>Logged: {loan.date}</span>
                          <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                            outstanding <= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/10 text-yellow-600'
                          }`}>
                            {outstanding <= 0 ? 'FULLY PAID' : `${loan.payments?.length || 0} installments`}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right side: Detailed payments list and ledger info */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between min-h-[460px]">
              {selectedSvLoan ? (
                <div className="space-y-6 text-left">
                  {/* Ledger Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="px-2.5 py-0.5 bg-slate-900 text-yellow-400 text-[9px] font-black tracking-widest uppercase rounded-md mb-1 inline-block">
                        Active Account Ledger
                      </span>
                      <h4 className="font-black text-slate-900 text-base uppercase">
                        {selectedSvLoan.supervisorName}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold font-mono">
                        Loan Ref: {selectedSvLoan.id} | Date Logged: {selectedSvLoan.date}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleExportSupervisorPaymentsPDF(selectedSvLoan)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Export Ledger PDF
                      </button>

                      {currentRole !== 'Site Supervisor' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSvPayAmount('');
                            setSvPayReference('');
                            setSvPayReceivedBy('');
                            setSvPayNotes('');
                            setSvPayError('');
                            setSvPayDate(new Date().toISOString().split('T')[0]);
                            setShowAddPaymentModal(true);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-yellow-400" />
                          Apply Payment
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Financial Balance Summary Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                    <div className="text-left space-y-0.5 font-sans">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Original Principal</div>
                      <div className="text-sm font-mono font-black text-slate-800">
                        ₱{selectedSvLoan.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    
                    <div className="text-left space-y-0.5 font-sans">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Total Repayments</div>
                      <div className="text-sm font-mono font-black text-emerald-600">
                        ₱{(selectedSvLoan.payments || []).reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="text-left space-y-0.5 font-sans">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Current Balance</div>
                      <div className={`text-sm font-mono font-black ${
                        (selectedSvLoan.totalAmount - (selectedSvLoan.payments || []).reduce((sum, p) => sum + p.amount, 0)) > 0 
                          ? 'text-red-600' : 'text-emerald-700'
                      }`}>
                        ₱{(selectedSvLoan.totalAmount - (selectedSvLoan.payments || []).reduce((sum, p) => sum + p.amount, 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Payments list table */}
                  <div className="space-y-2 text-left font-sans">
                    <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Repayment Installments Ledger</h5>
                    
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead>
                          <tr className="bg-slate-900 text-white font-black text-[9px] uppercase tracking-wider">
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Method</th>
                            <th className="p-2.5">Reference</th>
                            <th className="p-2.5">Recorded By</th>
                            <th className="p-2.5">Notes</th>
                            <th className="p-2.5 text-right">Amount</th>
                            {currentRole !== 'Site Supervisor' && <th className="p-2.5 text-center">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium bg-white">
                          {selectedSvLoan.payments?.length > 0 ? (
                            selectedSvLoan.payments.map((pay) => (
                              <tr key={pay.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-mono text-[11px] font-semibold text-slate-500 whitespace-nowrap">{pay.date}</td>
                                <td className="p-2.5 text-slate-600">
                                  <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-800 rounded font-black text-[9px] uppercase tracking-wide">
                                    {pay.paymentMethod}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono text-[10px] text-slate-400">{pay.reference || '-'}</td>
                                <td className="p-2.5 text-slate-600 font-semibold">{pay.receivedBy || '-'}</td>
                                <td className="p-2.5 text-slate-450 max-w-[150px] text-[11px] italic" title={pay.notes}>
                                  <div className="truncate break-all">{pay.notes || '-'}</div>
                                  {pay.isConsolidated && (
                                    <div className="mt-1 text-[9px] not-italic font-black text-amber-800 bg-amber-50/80 rounded border border-amber-200/50 px-1.5 py-0.5 space-y-0.5 block max-w-max">
                                      <div className="uppercase tracking-wider">Excel Consolidated Record</div>
                                      <div>Range: {pay.consoStartDate} to {pay.consoEndDate}</div>
                                      <div>Total Payments: {pay.numPaymentsMade} items</div>
                                    </div>
                                  )}
                                </td>
                                <td className="p-2.5 font-mono text-emerald-600 font-black text-right whitespace-nowrap">
                                  + ₱{pay.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                {currentRole !== 'Site Supervisor' && (
                                  <td className="p-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePayment(pay.id)}
                                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-650 rounded transition-colors cursor-pointer"
                                      title="Remove dynamic payment item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={currentRole === 'Site Supervisor' ? 6 : 7} className="p-8 text-center text-slate-400 italic">
                                No repayments logged against this supervisor's loan yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                  <ShieldAlert className="w-10 h-10 text-slate-300" />
                  <p className="font-bold text-xs">No Supervisor Selected</p>
                  <p className="text-[10px] text-slate-500 font-medium text-center max-w-xs leading-relaxed">Select an active supervisor record from the left directory column to load their detailed installment ledger history.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 7: CONSTRUCTION WORKERS FINANCE LOANS & REPAYMENTS DIRECTORY */}
      {activeSubTab === 'workerLoans' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6 text-left"
        >
          {/* Header Dashboard section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-yellow-500" />
                Construction Worker Debt & Payments Ledger
              </h3>
              <p className="text-[11px] text-slate-500 font-medium pb-0.5">
                Track, process, and audit long-term worker liabilities with itemized installment history records.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportAllWorkerLoansPDF}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-yellow-400 font-extrabold uppercase text-[10px] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Consolidated PDF
              </button>
              
              {currentRole !== 'Site Supervisor' && (
                <button
                  type="button"
                  onClick={() => {
                    const firstWk = workers.find(w => w.role !== 'Supervisor' && w.role !== 'Admin' && w.role !== 'Secretary');
                    if (firstWk) setWkLoanWorkerId(firstWk.id);
                    setWkLoanSiteId(sites[0]?.id || '');
                    setWkLoanDate(new Date().toISOString().split('T')[0]);
                    setWkLoanTotalAmount('');
                    setWkLoanNotes('');
                    setWkLoanError('');
                    setShowAddWkLoanModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black uppercase text-[10px] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm border border-yellow-400 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Register New Worker Loan
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left side: Loans Directory List */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">Worker Loan Registry</h4>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {currentRole === 'Site Supervisor' 
                    ? workerLoans.filter(l => l.siteId === assignedSiteId).length 
                    : workerLoans.length} logged
                </span>
              </div>

              {currentRole !== 'Site Supervisor' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search worker name..."
                    value={wkLoanSearch}
                    onChange={(e) => setWkLoanSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-1.5 focus:outline-hidden focus:border-yellow-500"
                  />
                </div>
              )}

              {/* Loans List */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {(() => {
                  const filtered = workerLoans.filter(loan => {
                    if (currentRole === 'Site Supervisor' && loan.siteId !== assignedSiteId) {
                      return false;
                    }
                    if (wkLoanSearch.trim()) {
                      return loan.workerName.toLowerCase().includes(wkLoanSearch.toLowerCase());
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center p-8 text-slate-400 italic font-medium text-xs">
                        No worker loan records found.
                      </div>
                    );
                  }

                  return filtered.map((loan) => {
                    const totalPaymentsAmt = (loan.payments || []).reduce((sum, p) => sum + p.amount, 0);
                    const outstanding = loan.totalAmount - totalPaymentsAmt;
                    const siteName = sites.find(s => s.id === loan.siteId)?.name || 'N/A';
                    const isSelected = selectedWkLoan?.id === loan.id;

                    return (
                      <div
                        key={loan.id}
                        onClick={() => setSelectedWkLoan(loan)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer text-left space-y-2.5 relative overflow-hidden ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className={`font-black text-xs uppercase tracking-tight ${isSelected ? 'text-yellow-400' : 'text-slate-900'}`}>
                              {loan.workerName}
                            </div>
                            <div className={`text-[10px] font-bold ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                              Site: {siteName}
                            </div>
                          </div>
                          {currentRole !== 'Site Supervisor' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Are you sure you want to delete this Entire Loan Record along with its payments history? This is permanent.")) {
                                  if (onDeleteWorkerLoan) onDeleteWorkerLoan(loan.id);
                                  if (isSelected) setSelectedWkLoan(null);
                                }
                              }}
                              className={`p-1 rounded-lg hover:bg-red-500 hover:text-white transition-colors cursor-pointer ${
                                isSelected ? 'text-slate-400 hover:text-white' : 'text-slate-450 hover:bg-red-50'
                              }`}
                              title="Delete Entire Loan and ledger history"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100/10">
                          <div>
                            <div className="text-[10px] uppercase text-slate-400 font-bold">Orig. Debt</div>
                            <div className="text-xs font-mono font-extrabold">
                              ₱{loan.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-slate-400 font-bold">Outstanding</div>
                            <div className={`text-xs font-mono font-extrabold ${outstanding > 0 ? 'text-red-550' : 'text-emerald-500'}`}>
                              ₱{outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-1">
                          <span>Logged: {loan.date}</span>
                          <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                            outstanding <= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/10 text-yellow-600'
                          }`}>
                            {outstanding <= 0 ? 'FULLY PAID' : `${loan.payments?.length || 0} installments`}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right side: Detailed payments list and ledger info */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between min-h-[460px]">
              {selectedWkLoan ? (
                <div className="space-y-6 text-left">
                  {/* Ledger Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="px-2.5 py-0.5 bg-slate-900 text-yellow-400 text-[9px] font-black tracking-widest uppercase rounded-md mb-1 inline-block">
                        Active Account Ledger
                      </span>
                      <h4 className="font-black text-slate-900 text-base uppercase">
                        {selectedWkLoan.workerName}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold font-mono">
                        Loan Ref: {selectedWkLoan.id} | Date Logged: {selectedWkLoan.date}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleExportWorkerPaymentsPDF(selectedWkLoan)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Export Ledger PDF
                      </button>

                      {currentRole !== 'Site Supervisor' && (
                        <button
                          type="button"
                          onClick={() => {
                            setWkPayAmount('');
                            setWkPayReference('');
                            setWkPayReceivedBy('');
                            setWkPayNotes('');
                            setWkPayError('');
                            setWkPayDate(new Date().toISOString().split('T')[0]);
                            setWkPayIsConsolidated(false);
                            setWkPayConsoStartDate('');
                            setWkPayConsoEndDate('');
                            setWkPayNumPaymentsMade('');
                            setShowAddWkPaymentModal(true);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-yellow-400" />
                          Apply Payment
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Financial Balance Summary Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                    <div className="text-left space-y-0.5 font-sans">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Original Principal</div>
                      <div className="text-sm font-mono font-black text-slate-800">
                        ₱{selectedWkLoan.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    
                    <div className="text-left space-y-0.5 font-sans">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Total Repayments</div>
                      <div className="text-sm font-mono font-black text-emerald-600 font-bold">
                        ₱{(selectedWkLoan.payments || []).reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="text-left space-y-0.5 font-sans">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Current Balance</div>
                      <div className={`text-sm font-mono font-black ${
                        (selectedWkLoan.totalAmount - (selectedWkLoan.payments || []).reduce((sum, p) => sum + p.amount, 0)) > 0 
                          ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'
                      }`}>
                        ₱{(selectedWkLoan.totalAmount - (selectedWkLoan.payments || []).reduce((sum, p) => sum + p.amount, 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Payments list table */}
                  <div className="space-y-2 text-left font-sans">
                    <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Repayment Installments Ledger</h5>
                    
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead>
                          <tr className="bg-slate-900 text-white font-black text-[9px] uppercase tracking-wider">
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Method</th>
                            <th className="p-2.5">Reference</th>
                            <th className="p-2.5">Recorded By</th>
                            <th className="p-2.5">Notes</th>
                            <th className="p-2.5 text-right">Amount</th>
                            {currentRole !== 'Site Supervisor' && <th className="p-2.5 text-center">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium bg-white">
                          {selectedWkLoan.payments?.length > 0 ? (
                            selectedWkLoan.payments.map((pay) => (
                              <tr key={pay.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-mono text-[11px] font-semibold text-slate-500 whitespace-nowrap">{pay.date}</td>
                                <td className="p-2.5 text-slate-600">
                                  <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-800 rounded font-black text-[9px] uppercase tracking-wide">
                                    {pay.paymentMethod}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono text-[10px] text-slate-400">{pay.reference || '-'}</td>
                                <td className="p-2.5 text-slate-600 font-semibold">{pay.receivedBy || '-'}</td>
                                <td className="p-2.5 text-slate-455 max-w-[150px] text-[11px] italic" title={pay.notes}>
                                  <div className="truncate break-all">{pay.notes || '-'}</div>
                                  {pay.isConsolidated && (
                                    <div className="mt-1 text-[9px] not-italic font-black text-amber-800 bg-amber-50/80 rounded border border-amber-200/50 px-1.5 py-0.5 space-y-0.5 block max-w-max">
                                      <div className="uppercase tracking-wider">Excel Consolidated Record</div>
                                      <div>Range: {pay.consoStartDate} to {pay.consoEndDate}</div>
                                      <div>Total Payments: {pay.numPaymentsMade} items</div>
                                    </div>
                                  )}
                                </td>
                                <td className="p-2.5 font-mono text-emerald-600 font-black text-right whitespace-nowrap">
                                  + ₱{pay.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                {currentRole !== 'Site Supervisor' && (
                                  <td className="p-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteWkPayment(pay.id)}
                                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-650 rounded transition-colors cursor-pointer"
                                      title="Remove dynamic payment item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={currentRole === 'Site Supervisor' ? 6 : 7} className="p-8 text-center text-slate-400 italic">
                                No repayments logged against this worker's loan yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                  <ShieldAlert className="w-10 h-10 text-slate-300" />
                  <p className="font-bold text-xs">No Worker Selected</p>
                  <p className="text-[10px] text-slate-500 font-medium text-center max-w-xs leading-relaxed">Select an active worker record from the left directory column to load their detailed installment ledger history.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {selected201Worker && (
          <WorkerFolder201Modal 
            selected201Worker={selected201Worker} 
            setSelected201Worker={setSelected201Worker} 
            onUpdateWorker={onUpdateWorker}
            sites={sites}
            currentRole={currentRole}
          />
        )}
      </AnimatePresence>

      {/* MODAL WINDOW: Register New Loan */}
      <AnimatePresence>
        {showRegisterLoanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRegisterLoanModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 relative z-10 space-y-4 text-left"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-600" />
                  Register New Debt / Loan
                </h3>
                <button
                  onClick={() => setShowRegisterLoanModal(false)}
                  className="p-1 rounded-md hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {regError && (
                <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 animate-bounce" />
                  {regError}
                </div>
              )}

              <form onSubmit={handleRegisterNewLoan} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Target Employee</label>
                  <select
                    value={regWorkerId}
                    onChange={(e) => setRegWorkerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-150 transition-all cursor-pointer outline-none"
                    required
                  >
                    <option value="">-- Select Site Supervisor or Construction Worker --</option>
                    {[...workers].sort((a,b) => a.name.localeCompare(b.name)).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Liability type</label>
                  <select
                    value={regLoanType}
                    onChange={(e) => setRegLoanType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-150 transition-all cursor-pointer outline-none"
                    required
                  >
                    <option value="company_loan">Company Loan</option>
                    <option value="cash_advance">Cash Advance</option>
                    <option value="transportation_loan">Transportation Loan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Principal Debt Amount (₱)</label>
                  <input
                    type="number"
                    step="any"
                    value={regAmount}
                    onChange={(e) => setRegAmount(e.target.value)}
                    placeholder="Enter outstanding principal amount, e.g. 5000"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-150 outline-none transition-all"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Administrative remarks / notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={regNotes}
                    onChange={(e) => setRegNotes(e.target.value)}
                    placeholder="e.g. Approved safety shoes loan or cash advance for tools..."
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-indigo-150 outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-md select-none"
                >
                  Confirm & Write Loan Record
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW: Create Roster Worker */}
      <AnimatePresence>
        {showAddWorkerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddWorkerModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-xl w-full p-6 relative z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  Register Staff Profile
                </h3>
                <button
                  onClick={() => setShowAddWorkerModal(false)}
                  className="p-1 rounded-md hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {workerError && (
                <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-xl text-xs flex items-center gap-2 font-medium animate-pulse">
                  <AlertCircle className="w-4 h-4" />
                  {workerError}
                </div>
              )}

              <form onSubmit={handleAddNewWorker} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Full Worker Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Samuel Jackson"
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Designation / Role *</label>
                    <select
                      value={workerRole}
                      onChange={(e) => setWorkerRole(e.target.value as Worker['role'])}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-sm rounded-xl px-2 py-2 text-slate-900 cursor-pointer"
                    >
                      <option value="Laborer">Laborer</option>
                      <option value="Mason">Mason</option>
                      <option value="Carpenter">Carpenter</option>
                      <option value="Welder">Welder</option>
                      <option value="Electrician">Electrician</option>
                      <option value="Operator">Heavy Equipment Operator</option>
                      <option value="Supervisor">Site Supervisor</option>
                      <option value="Foreman">Workforce Foreman</option>
                      <option value="Admin">Admin</option>
                      <option value="Secretary">Secretary</option>
                      <option value="Intern">Intern</option>
                      <option value="Skilled Worker">Skilled Worker</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Daily Rate (₱ / day) *</label>
                    <input
                      type="number"
                      required
                      min="50"
                      value={workerRate}
                      onChange={(e) => setWorkerRate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                {workerRole === 'Supervisor' && currentRole === 'Admin' ? (
                  <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="text-xs font-semibold text-slate-605 text-slate-700 block">Supervised Construction Sites (Multiple) *</label>
                    <div className="max-h-28 overflow-y-auto space-y-1.5 pt-1 text-xs">
                      {sites.map(s => {
                        const isChecked = workerSiteIds.includes(s.id);
                        return (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer py-0.5 select-none hover:bg-slate-100 px-1 rounded transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setWorkerSiteIds([...workerSiteIds, s.id]);
                                } else {
                                  setWorkerSiteIds(workerSiteIds.filter(id => id !== s.id));
                                }
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-555 cursor-pointer"
                            />
                            <span className="text-slate-700 font-medium">{s.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400">Select all sites that this supervisor handles.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Default Assigned Site *</label>
                    {currentRole === 'Admin' ? (
                      <select
                        value={workerSiteId}
                        onChange={(e) => setWorkerSiteId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-sm rounded-xl px-2 py-2 text-slate-900 cursor-pointer"
                      >
                        <option value="" disabled>Select site ledger...</option>
                        {sites.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="bg-slate-100 border border-slate-200 text-slate-700 p-2.5 rounded-xl text-xs font-mono font-bold select-none">
                        {sites.find(s => s.id === assignedSiteId)?.name || 'YOUR SITE'} ASSIGNED
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Phone Contact Number</label>
                    <input
                      type="text"
                      placeholder="e.g., +63-917-555-0199"
                      value={workerPhone}
                      onChange={(e) => setWorkerPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Employment Status *</label>
                    <select
                      value={workerEmpStatus}
                      onChange={(e) => setWorkerEmpStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-sm rounded-xl px-2.5 py-2 text-slate-900 cursor-pointer text-slate-700"
                    >
                      <option value="Project-based">Project-based</option>
                      <option value="Regular">Regular</option>
                      <option value="Probationary">Probationary</option>
                      <option value="Intern">Intern</option>
                      <option value="Contractor">Contractor Services</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Residential Permanent Address *</label>
                  <input
                    type="text"
                    placeholder="Block 25 Lot 14, Tierra Vista, Cavite"
                    value={workerAddress}
                    onChange={(e) => setWorkerAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Worker Birthday</label>
                    <input
                      type="date"
                      value={workerBirthday}
                      onChange={(e) => setWorkerBirthday(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Official Date Hired</label>
                    <input
                      type="date"
                      value={workerDateHired}
                      onChange={(e) => setWorkerDateHired(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-150 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🚨 Emergency Contact Person details</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-505 text-slate-500">Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sheena Mae Serrano"
                        value={workerEmergName}
                        onChange={(e) => setWorkerEmergName(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-xs rounded-lg px-2.5 py-1.5 text-slate-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-505 text-slate-500">Contact Number</label>
                      <input
                        type="text"
                        placeholder="e.g. +63-917-555-4011"
                        value={workerEmergPhone}
                        onChange={(e) => setWorkerEmergPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:outline-hidden text-xs rounded-lg px-2.5 py-1.5 text-slate-800 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddWorkerModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Register Worker Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW: Encode Payroll & Deductions */}
      <AnimatePresence>
        {editingWorkerPayroll && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingWorkerPayroll(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 relative z-10 space-y-4 flex flex-col max-h-[90vh] overflow-y-auto text-slate-800"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-2">
                  <PhilippinePeso className="w-5 h-5 text-yellow-500" />
                  Encode Payroll Variables
                </h3>
                <button
                  onClick={() => setEditingWorkerPayroll(null)}
                  className="p-1 rounded-md hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Employee:</span>
                  <span className="font-bold text-slate-800 block">{editingWorkerPayroll.name}</span>
                  <span className="text-indigo-600 font-semibold">{editingWorkerPayroll.role}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Wage Scale:</span>
                  <span className="font-mono font-bold text-slate-800 text-sm block">{formatCurrency(editingWorkerPayroll.dailyRate)} / day</span>
                </div>
              </div>

              <div className="space-y-3">
                {/* 1. Days Worked Configuration */}
                <div className="space-y-2 p-3 bg-indigo-50/20 border border-indigo-100/50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editUseCustomDays}
                        onChange={(e) => {
                          setEditUseCustomDays(e.target.checked);
                          if (e.target.checked && !editCustomDays) {
                            // Prepopulate with computed attendance scale
                            const normalSummary = calculatePayrollSummary(editingWorkerPayroll);
                            setEditCustomDays(String(normalSummary.daysWorked));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-550 cursor-pointer"
                      />
                      <span>Override Number of Days Worked</span>
                    </label>
                  </div>
                  
                  {editUseCustomDays ? (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Custom Days Worked</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editCustomDays}
                        onChange={(e) => setEditCustomDays(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-hidden text-xs font-mono rounded-xl px-3 py-2 text-slate-900"
                        placeholder="e.g. 15"
                      />
                      <p className="text-[10px] text-slate-400">Enter the exact manual number of days worked (including fractions, e.g. 12.5).</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 font-medium">Currently using automatic attendance count: <strong className="font-bold text-indigo-900 font-mono">{calculatePayrollSummary(editingWorkerPayroll).daysWorked} days</strong></p>
                  )}
                </div>

                {/* 2. Overtime Hours */}
                <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <label className="text-xs font-bold text-slate-705 text-slate-700 block">Overtime Hours (OT)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editOvertimeHours}
                      onChange={(e) => setEditOvertimeHours(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-hidden text-xs font-mono rounded-xl pl-3 pr-16 py-2 text-slate-900"
                      placeholder="e.g. 8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] uppercase font-bold text-slate-400">Hours</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Overtime Pay formula is: <code className="bg-indigo-50 px-1 rounded-sm text-indigo-700 font-bold">dailyRate * Hours * 0.125</code></p>
                </div>

                {/* 3. Deductions Panel (to be encoded by Admin) */}
                <div className="space-y-3 pb-2 pt-2 border-t border-dashed border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-rose-600">
                    Admin Managed Deductions (₱)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Cash Advance</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editCashAdvance}
                        onChange={(e) => setEditCashAdvance(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-hidden text-xs font-mono rounded-xl px-3 py-1.5 text-slate-905 text-slate-800"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Loan Payment</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editLoanPayment}
                        onChange={(e) => setEditLoanPayment(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-hidden text-xs font-mono rounded-xl px-3 py-1.5 text-slate-905 text-slate-800"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Corpo Deduction</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editCorpo}
                        onChange={(e) => setEditCorpo(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-hidden text-xs font-mono rounded-xl px-3 py-1.5 text-slate-900 text-slate-800"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Cash Bond</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editCashbond}
                        onChange={(e) => setEditCashbond(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-hidden text-xs font-mono rounded-xl px-3 py-1.5 text-slate-900 text-slate-800"
                        placeholder="100.00"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Uniform & Shoes / Other Utang</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editUniformSafetyShoes}
                        onChange={(e) => setEditUniformSafetyShoes(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-hidden text-xs font-mono rounded-xl px-3 py-1.5 text-slate-900 text-slate-800"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Transportation Loan</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editTransportationLoan}
                        onChange={(e) => setEditTransportationLoan(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-hidden text-xs font-mono rounded-xl px-3 py-1.5 text-slate-905 text-slate-800"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t justify-end">
                <button
                  type="button"
                  onClick={() => setEditingWorkerPayroll(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-850 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePayrollEdits}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Save Payroll Variables
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW: Professional Pay Slip Voucher */}
      <AnimatePresence>
        {selectedSlipWorker && (() => {
          const detail = calculatePayrollSummary(selectedSlipWorker);
          const defaultSiteName = sites.find(s => s.id === selectedSlipWorker.assignedSiteId)?.name || 'Multiple Sites';
          
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSlipWorker(null)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-xl max-w-md w-full relative z-10 overflow-hidden border border-slate-100 flex flex-col"
              >
                {/* Header visual banner */}
                <div className="bg-indigo-900 text-white p-5 text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-300">Construction Supervisor Hub</p>
                  <h3 className="text-lg font-bold">Worker Attendance Pay Slip</h3>
                  <p className="text-[10px] text-slate-350 mt-1">Generated: {new Date().toISOString().split('T')[0]}</p>
                </div>

                {/* Printable receipt slip */}
                <div className="p-6 space-y-4 text-xs select-text">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-3">
                    <div className="space-y-0.5">
                      <p className="text-slate-400">Issued To:</p>
                      <p className="font-bold text-slate-900 text-sm leading-tight">{selectedSlipWorker.name}</p>
                      <p className="text-slate-500">{selectedSlipWorker.role} Roster</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-slate-400">Project placement:</p>
                      <p className="font-semibold text-slate-800 line-clamp-1 max-w-[160px]">{defaultSiteName}</p>
                      <p className="font-mono text-slate-400">Scale: {formatCurrency(selectedSlipWorker.dailyRate)}/day</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-slate-400">Shift Earnings breakdown ({getPayrollPeriodLabel()})</p>

                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
                      <div className="flex justify-between">
                        <span>Days Worked Count:</span>
                        <span className="font-bold text-slate-900">{detail.daysWorked} days</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Overtime Hours (OT):</span>
                        <span className="font-bold text-slate-900">{detail.overtimeHours} hours</span>
                      </div>

                      <div className="flex justify-between text-indigo-700">
                        <span>Overtime Remuneration:</span>
                        <span className="font-bold">{formatCurrency(detail.overtimePay)}</span>
                      </div>

                      <div className="flex justify-between pb-1.5 border-b border-dashed border-slate-200">
                        <span>Gross Salary:</span>
                        <span className="font-bold text-slate-950 font-black">{formatCurrency(detail.grossSalary)}</span>
                      </div>

                      <div className="text-[9px] uppercase tracking-wider text-rose-500 font-bold block pt-1">
                        Deductions (Encoded by Admin):
                      </div>

                      <div className="flex justify-between text-rose-600 pl-2">
                        <span>1. Cash Advance:</span>
                        <span>{formatCurrency(detail.cashAdvance)}</span>
                      </div>

                      <div className="flex justify-between text-rose-600 pl-2">
                        <span>2. Company Loan Payment:</span>
                        <span>{formatCurrency(detail.loanPayment)}</span>
                      </div>

                      <div className="flex justify-between text-rose-600 pl-2">
                        <span>3. Transportation Loan:</span>
                        <span>{formatCurrency(detail.transportationLoan)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex justify-between items-center text-slate-900 font-mono">
                    <span className="font-bold text-xs uppercase tracking-wide text-indigo-900">Total Net Payout:</span>
                    <span className="font-bold text-lg text-indigo-900">{formatCurrency(detail.netSalary)}</span>
                  </div>

                  <div className="pt-4 border-t border-dashed border-slate-200 text-[10px] text-slate-400 leading-relaxed text-center space-y-3">
                    <p>I hereby acknowledge receipts of wages as detailed on this electronic ledger of work shift records.</p>
                    
                    <div className="grid grid-cols-2 gap-4 pt-6 text-center">
                      <div className="space-y-1">
                        <div className="h-0.5 bg-slate-300 w-3/4 mx-auto" />
                        <p>Site Manager Signature</p>
                      </div>
                      <div className="space-y-1">
                        <div className="h-0.5 bg-slate-300 w-3/4 mx-auto" />
                        <p>Worker Hand Signature</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Printer className="w-4 h-4 text-slate-300" />
                    Print Voucher
                  </button>

                  <button
                    onClick={() => handleExportWorkerSlipToPDF(selectedSlipWorker)}
                    className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs border border-red-800"
                    title="Directly download PDF receipt"
                  >
                    <Download className="w-4 h-4 text-white" />
                    Download PDF
                  </button>

                  <button
                    onClick={() => setSelectedSlipWorker(null)}
                    className="flex-1 border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 py-2 rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    Done / Close
                  </button>
                </div>

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* MODAL WINDOW: Unified Master Payroll Report Print Preview */}
      <AnimatePresence>
        {showPrintReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrintReportModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs print:hidden"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-4xl w-full relative z-10 overflow-hidden border border-slate-100 flex flex-col my-8 print:my-0 print:shadow-none print:border-0"
            >
              {/* Report Header for print style */}
              <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:bg-transparent print:text-black print:p-0 print:border-b-2 print:border-slate-800 print:pb-4">
                <div>
                  <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <PhilippinePeso className="w-5 h-5 text-yellow-400 print:hidden" />
                    Consolidated Multi-Site Payroll Report
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 print:text-slate-600 flex items-center gap-1.5 flex-wrap">
                    <span>Period range: <strong className="text-white print:text-black">{getPayrollPeriodLabel()}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>Site: <strong className="text-white print:text-black">{
                      payrollSiteFilter === 'all' ? 'All Sites Combined' : (sites.find(s => s.id === payrollSiteFilter)?.name || 'Filtered Site')
                    }</strong></span>
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs space-y-0.5 font-mono">
                  <p className="text-slate-400 print:text-slate-500">Run Date: {new Date().toISOString().split('T')[0]}</p>
                  <p className="text-emerald-400 font-bold print:text-emerald-600 uppercase tracking-wider text-[10px]">Company-Wide Audited Book</p>
                </div>
              </div>

              {/* Pre-print scrollable content */}
              <div className="p-6 overflow-y-auto max-h-[60vh] print:max-h-none print:p-0 select-text">
                <table className="w-full text-left text-[11px] border-collapse" id="payroll-print-table">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-350 text-slate-500 font-bold uppercase text-[9px] tracking-wider print:bg-slate-100">
                      <th className="p-2 sm:p-3">Worker / Crew</th>
                      <th className="p-2 sm:p-3">Designation</th>
                      <th className="p-2 sm:p-3">Primary Site</th>
                      <th className="p-2 sm:p-3 text-right font-semibold">Rate</th>
                      <th className="p-2 sm:p-3 text-center">Days Worked</th>
                      <th className="p-2 sm:p-3 text-center">OT Hours</th>
                      <th className="p-2 sm:p-3 text-right">OT Pay</th>
                      <th className="p-2 sm:p-3 text-right font-semibold">Gross Salary</th>
                      <th className="p-2 sm:p-3 text-right text-rose-700">Deductions</th>
                      <th className="p-2 sm:p-3 text-right font-black text-indigo-950 bg-slate-50">Net Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pdfEligibleWorkers.map(({ worker, summary, siteName }) => (
                      <tr key={worker.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                        <td className="p-2 sm:p-3 font-semibold text-slate-900 print:text-black text-xs">{worker.name}</td>
                        <td className="p-2 sm:p-3 font-mono text-slate-600 text-[10px]">{worker.role}</td>
                        <td className="p-2 sm:p-3 font-medium text-slate-700">{siteName}</td>
                        <td className="p-2 sm:p-3 text-right font-mono text-slate-500">{formatCurrency(worker.dailyRate)}</td>
                        <td className="p-2 sm:p-3 text-center font-bold text-slate-850">{summary.daysWorked} d</td>
                        <td className="p-2 sm:p-3 text-center font-bold text-slate-800">{summary.overtimeHours} hrs</td>
                        <td className="p-2 sm:p-3 text-right font-mono text-indigo-700">{formatCurrency(summary.overtimePay)}</td>
                        <td className="p-2 sm:p-3 text-right font-mono font-semibold">{formatCurrency(summary.grossSalary)}</td>
                        <td className="p-2 sm:p-3 text-right font-mono text-rose-700">{formatCurrency(summary.totalDeduction)}</td>
                        <td className="p-2 sm:p-3 text-right font-mono font-bold text-indigo-900 bg-indigo-50/10">{formatCurrency(summary.netSalary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Print Sign-off Summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-mono bg-slate-900 text-white rounded-xl p-4 mt-6 print:bg-transparent print:text-black print:border-t-2 print:border-slate-800 print:rounded-none print:mt-12">
                  <div className="space-y-1 print:border-r print:border-slate-250 print:pr-2">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Total Gross Wages</p>
                    <p className="text-xs sm:text-sm font-black">{formatCurrency(pdfGrandTotalGross)}</p>
                  </div>
                  <div className="space-y-1 print:border-r print:border-slate-255 print:pr-2">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Total Deductions</p>
                    <p className="text-xs sm:text-sm font-black text-rose-400 print:text-black">{formatCurrency(pdfGrandTotalDeductions)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-yellow-300 font-bold uppercase tracking-wider print:text-black">Consolidated Net payroll</p>
                    <p className="text-xs sm:text-sm font-extrabold text-yellow-300 print:text-black">{formatCurrency(pdfGrandTotalNet)}</p>
                  </div>
                </div>

                {/* Signature and Approval Line (for auditing) */}
                <div className="hidden print:grid grid-cols-3 gap-8 mt-20 text-center text-xs">
                  <div className="space-y-1.5">
                    <div className="border-b border-slate-400 h-6" />
                    <p className="font-semibold text-slate-600">Prepared By: Roster Clerk</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="border-b border-slate-400 h-6" />
                    <p className="font-semibold text-slate-600">Audited By: HR Manager</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="border-b border-slate-400 h-6" />
                    <p className="font-semibold text-slate-600">Approved For Release</p>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-150 flex justify-end gap-2.5 print:hidden">
                <button
                  onClick={handleExportToPDF}
                  className="bg-red-700 hover:bg-red-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors border border-red-800"
                  title="Download consolidated PDF immediately"
                >
                  <Download className="w-4 h-4 text-white" />
                  Download PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print Master Page
                </button>
                <button
                  onClick={() => setShowPrintReportModal(false)}
                  className="bg-white border border-slate-200 hover:bg-slate-100 font-bold px-4 py-2 rounded-xl text-xs text-slate-600 transition-all cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION DIALOG: Custom Delete Worker Modal with Yes/No */}
      <AnimatePresence>
        {workerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWorkerToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 relative z-10 space-y-4 text-center"
            >
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Employee Profile?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Are you sure you want to completely remove <strong className="text-slate-900">{workerToDelete.name}</strong> from the roster?
                </p>
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-[10px] text-slate-400 font-medium text-left">
                  ⚠️ Work logging records and history calculations are preserved, but the worker will be permanently unassigned from active sites.
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setWorkerToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  No, Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteWorker(workerToDelete.id);
                    setWorkerToDelete(null);
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

      {/* CONFIRMATION DIALOG: Clear Weekly Cash Advances */}
      <AnimatePresence>
        {showClearAdvancesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearAdvancesModal(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full relative z-10 overflow-hidden border border-slate-100 p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="bg-rose-100 p-2.5 rounded-xl text-rose-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-6">
                    Clear Weekly Cash Advances?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Are you sure you want to permanently clear and reset the registered cash advances for all labor personnel to **0 PHP**? This is an irreversible weekly administrative action.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200/60 p-3 rounded-xl text-[11px] text-amber-850 font-semibold leading-relaxed">
                🚨 **Warning**: This resets the current stored cash advance fields on worker rosters to zero and deletes temporary weekly registered advance items from the central database.
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearAdvancesModal(false)}
                  disabled={isClearingAdvances}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearWeeklyAdvances}
                  disabled={isClearingAdvances}
                  className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  {isClearingAdvances ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Wipe Cash Advances
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW: Create Supervisor Loan */}
      <AnimatePresence>
        {showAddSvLoanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddSvLoanModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full relative z-10 flex flex-col overflow-hidden text-left"
            >
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-yellow-450 flex items-center gap-2">
                    <PhilippinePeso className="w-5 h-5 text-yellow-500" />
                    Register Supervisor Loan
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono">FAMORCA BUILDERS FINANCIAL SUITE</p>
                </div>
                <button
                  onClick={() => setShowAddSvLoanModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSvLoanSubmit} className="p-6 space-y-4 font-sans text-xs">
                {svLoanError && (
                  <div className="p-3 bg-red-50 text-red-650 rounded-xl border border-red-155 font-bold leading-relaxed">
                    ⚠️ {svLoanError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Select Site Supervisor / Foreman</label>
                  <select
                    value={svLoanSupervisorId}
                    onChange={(e) => setSvLoanSupervisorId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:border-yellow-500"
                    required
                  >
                    <option value="">-- Choose active leader profile --</option>
                    {workers
                      .filter(w => w.role === 'Supervisor' || w.role === 'Foreman')
                      .map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                      ))
                    }
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Placement Construction Site</label>
                  <select
                    value={svLoanSiteId}
                    onChange={(e) => setSvLoanSiteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:border-yellow-500"
                    required
                  >
                    <option value="">-- Choose operational project site --</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Principal Debt Amount (₱)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 15000"
                      value={svLoanTotalAmount}
                      onChange={(e) => setSvLoanTotalAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-extrabold font-mono focus:border-yellow-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Date of Release</label>
                    <input
                      type="date"
                      value={svLoanDate}
                      onChange={(e) => setSvLoanDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold font-mono focus:border-yellow-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Private Assessment Remarks / Notes</label>
                  <textarea
                    placeholder="Enter details of approval, tenure duration or terms here..."
                    value={svLoanNotes}
                    onChange={(e) => setSvLoanNotes(e.target.value)}
                    rows={2.5}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-yellow-500"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddSvLoanModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl cursor-pointer text-center"
                  >
                    No, Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 border border-amber-450 text-slate-950 font-black py-3 rounded-xl cursor-pointer text-center shadow-xs"
                  >
                    Yes, Approve & Post Loan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW: Add Installment Payment Repayment */}
      <AnimatePresence>
        {showAddPaymentModal && selectedSvLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddPaymentModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full relative z-10 flex flex-col overflow-hidden text-left"
            >
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-green-400 flex items-center gap-2">
                    <PlusCircle className="w-5 h-5" />
                    Record Repayment Item
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono">FOR {selectedSvLoan.supervisorName.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => setShowAddPaymentModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddPaymentSubmit} className="p-6 space-y-4 font-sans text-xs">
                {svPayError && (
                  <div className="p-3 bg-red-50 text-red-655 rounded-xl border border-red-155 font-bold leading-relaxed">
                    ⚠️ {svPayError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Payment Date</label>
                    <input
                      type="date"
                      value={svPayDate}
                      onChange={(e) => setSvPayDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold font-mono focus:border-yellow-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Repayment Amount (₱)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 1500"
                      value={svPayAmount}
                      onChange={(e) => setSvPayAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-extrabold font-mono focus:border-yellow-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Payment Method / Gateway</label>
                  <select
                    value={svPayMethod}
                    onChange={(e) => setSvPayMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:border-yellow-500"
                    required
                  >
                    <option value="Cash">Cash (Direct Hand-over)</option>
                    <option value="Salary Deduction">Salary Deduction (Payroll Holdback)</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="GCash">GCash E-Wallet</option>
                    <option value="Maya">Maya E-Wallet</option>
                    <option value="Other">Other Mode of Remittance</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Reference # / Check ID</label>
                    <input
                      type="text"
                      placeholder="e.g. TXN-91283"
                      value={svPayReference}
                      onChange={(e) => setSvPayReference(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold font-mono focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Received By (Officer Name)</label>
                    <input
                      type="text"
                      placeholder="Sheena Mae Serrano"
                      value={svPayReceivedBy}
                      onChange={(e) => setSvPayReceivedBy(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:border-yellow-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 py-1 bg-slate-50 px-3 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      id="svPayIsConsolidated"
                      checked={svPayIsConsolidated}
                      onChange={(e) => setSvPayIsConsolidated(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-slate-300 text-yellow-500 focus:ring-yellow-500 cursor-pointer"
                    />
                    <label htmlFor="svPayIsConsolidated" className="text-[10px] font-black uppercase text-slate-700 cursor-pointer select-none">
                      Consolidated Payment (e.g. from Excel)
                    </label>
                  </div>

                  {svPayIsConsolidated && (
                    <div className="p-3 bg-yellow-50/50 rounded-xl border border-yellow-150 space-y-3">
                      <p className="text-[9px] font-extrabold text-slate-600 uppercase tracking-wider">Excel Consolidation Range Details</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-400 block">Date Range - From</label>
                          <input
                            type="text"
                            placeholder="e.g. November 2025"
                            value={svPayConsoStartDate}
                            onChange={(e) => setSvPayConsoStartDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 font-bold focus:border-yellow-500 text-xs"
                            required={svPayIsConsolidated}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-400 block">Date Range - To</label>
                          <input
                            type="text"
                            placeholder="e.g. Feb 2026"
                            value={svPayConsoEndDate}
                            onChange={(e) => setSvPayConsoEndDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 font-bold focus:border-yellow-500 text-xs"
                            required={svPayIsConsolidated}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400 block">No. of Payments Made</label>
                        <input
                          type="number"
                          placeholder="e.g. 4"
                          value={svPayNumPaymentsMade}
                          onChange={(e) => setSvPayNumPaymentsMade(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 font-extrabold focus:border-yellow-500 font-mono text-xs"
                          required={svPayIsConsolidated}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Installment Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Partial repayment for Week 1"
                    value={svPayNotes}
                    onChange={(e) => setSvPayNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-yellow-500"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddPaymentModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl cursor-pointer text-center"
                  >
                    No, Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl cursor-pointer text-center shadow-xs"
                  >
                    Post Repayment Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW: Register New Worker Loan */}
      <AnimatePresence>
        {showAddWkLoanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddWkLoanModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 relative z-10 space-y-4 text-left font-sans text-xs"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-yellow-500" />
                  Register Worker Loan
                </h3>
                <button
                  onClick={() => setShowAddWkLoanModal(false)}
                  className="p-1 rounded-md hover:bg-slate-150 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {wkLoanError && (
                <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 animate-bounce" />
                  {wkLoanError}
                </div>
              )}

              <form onSubmit={handleRegisterNewWkLoan} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Target Construction Worker</label>
                  <select
                    value={wkLoanWorkerId}
                    onChange={(e) => setWkLoanWorkerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 transition-all outline-none"
                    required
                  >
                    <option value="">-- Choose Construction Worker --</option>
                    {workers
                      .filter(w => w.role !== 'Supervisor' && w.role !== 'Admin' && w.role !== 'Secretary')
                      .sort((a,b) => a.name.localeCompare(b.name))
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} [{w.role || 'Laborer'}]
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Assigned Project Site</label>
                  <select
                    value={wkLoanSiteId}
                    onChange={(e) => setWkLoanSiteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 transition-all outline-none"
                    required
                  >
                    <option value="">-- Choose Project --</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Date of Issuance</label>
                    <input
                      type="date"
                      value={wkLoanDate}
                      onChange={(e) => setWkLoanDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold font-mono focus:border-yellow-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Loan Amount (₱)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 5000"
                      value={wkLoanTotalAmount}
                      onChange={(e) => setWkLoanTotalAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-850 font-extrabold font-mono focus:border-yellow-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Ledger Remarks / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Backpayment for tools, medical aid..."
                    value={wkLoanNotes}
                    onChange={(e) => setWkLoanNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-yellow-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black py-2.5 rounded-xl uppercase tracking-wider text-[10px] transition-colors cursor-pointer shadow-md"
                >
                  Confirm & Write Loan
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW: Add Worker Installment Payment Repayment */}
      <AnimatePresence>
        {showAddWkPaymentModal && selectedWkLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddWkPaymentModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full relative z-10 flex flex-col overflow-hidden text-left font-sans text-xs"
            >
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-green-400 flex items-center gap-2">
                    <PlusCircle className="w-5 h-5" />
                    Record Repayment Item
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono">FOR WORKER: {selectedWkLoan.workerName.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => setShowAddWkPaymentModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddWkPaymentSubmit} className="p-6 space-y-4">
                {wkPayError && (
                  <div className="p-3 bg-red-50 text-red-655 rounded-xl border border-red-155 font-bold leading-relaxed">
                    ⚠️ {wkPayError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Payment Date</label>
                    <input
                      type="date"
                      value={wkPayDate}
                      onChange={(e) => setWkPayDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold font-mono focus:border-yellow-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Repayment Amount (₱)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 1000"
                      value={wkPayAmount}
                      onChange={(e) => setWkPayAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-extrabold font-mono focus:border-yellow-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Payment Method / Gateway</label>
                  <select
                    value={wkPayMethod}
                    onChange={(e) => setWkPayMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:border-yellow-500"
                    required
                  >
                    <option value="Cash">Cash (Direct Hand-over)</option>
                    <option value="Salary Deduction">Salary Deduction (Payroll Holdback)</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="GCash">GCash E-Wallet</option>
                    <option value="Maya">Maya E-Wallet</option>
                    <option value="Other">Other Mode of Remittance</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Reference # / Check ID</label>
                    <input
                      type="text"
                      placeholder="e.g. TXN-11002"
                      value={wkPayReference}
                      onChange={(e) => setWkPayReference(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold font-mono focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Received By (Officer Name)</label>
                    <input
                      type="text"
                      placeholder="Sheena Mae Serrano"
                      value={wkPayReceivedBy}
                      onChange={(e) => setWkPayReceivedBy(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:border-yellow-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 py-1 bg-slate-50 px-3 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      id="wkPayIsConsolidated"
                      checked={wkPayIsConsolidated}
                      onChange={(e) => setWkPayIsConsolidated(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-slate-300 text-yellow-500 focus:ring-yellow-500 cursor-pointer"
                    />
                    <label htmlFor="wkPayIsConsolidated" className="text-[10px] font-black uppercase text-slate-700 cursor-pointer select-none">
                      Consolidated Payment (e.g. from Excel)
                    </label>
                  </div>

                  {wkPayIsConsolidated && (
                    <div className="p-3 bg-yellow-50/50 rounded-xl border border-yellow-150 space-y-3">
                      <p className="text-[9px] font-extrabold text-slate-600 uppercase tracking-wider">Excel Consolidation Range Details</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-400 block">Date Range - From</label>
                          <input
                            type="text"
                            placeholder="e.g. November 2025"
                            value={wkPayConsoStartDate}
                            onChange={(e) => setWkPayConsoStartDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 font-bold focus:border-yellow-500 text-xs"
                            required={wkPayIsConsolidated}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-400 block">Date Range - To</label>
                          <input
                            type="text"
                            placeholder="e.g. Feb 2026"
                            value={wkPayConsoEndDate}
                            onChange={(e) => setWkPayConsoEndDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 font-bold focus:border-yellow-500 text-xs"
                            required={wkPayIsConsolidated}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400 block">No. of Payments Made</label>
                        <input
                          type="number"
                          placeholder="e.g. 5"
                          value={wkPayNumPaymentsMade}
                          onChange={(e) => setWkPayNumPaymentsMade(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 font-extrabold focus:border-yellow-500 font-mono text-xs"
                          required={wkPayIsConsolidated}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Installment Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Partial repayment for Week 1"
                    value={wkPayNotes}
                    onChange={(e) => setWkPayNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-yellow-500"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddWkPaymentModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl cursor-pointer text-center"
                  >
                    No, Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl cursor-pointer text-center shadow-xs"
                  >
                    Post Repayment Entry
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

// =========================================================================
// MODAL WINDOW: 201 Worker Profile Folder
// =========================================================================
function WorkerFolder201Modal({ 
  selected201Worker, 
  setSelected201Worker,
  onUpdateWorker,
  sites = [],
  currentRole = 'Admin'
}: { 
  selected201Worker: Worker | null, 
  setSelected201Worker: (w: Worker | null) => void,
  onUpdateWorker?: (workerId: string, updates: Partial<Worker>) => void,
  sites?: ConstructionSite[],
  currentRole?: string
}) {
  if (!selected201Worker) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Worker>>({});

  useEffect(() => {
    if (selected201Worker) {
      setFormData(selected201Worker);
      setIsEditing(false);
    }
  }, [selected201Worker?.id]);

  const handleSave = async () => {
    if (onUpdateWorker) {
      await onUpdateWorker(selected201Worker.id, formData);
      setSelected201Worker({ ...selected201Worker, ...formData });
      setIsEditing(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelected201Worker(null)}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl border-t-8 border-yellow-500 max-w-lg w-full p-6 relative z-10 space-y-5"
        >
          {/* Manila Folder Tab Styling */}
          <div className="flex items-center justify-between border-b pb-3 font-sans">
            <div className="space-y-1">
              <span className="text-[9px] bg-yellow-400/15 text-yellow-800 px-2 py-0.5 rounded font-extrabold uppercase tracking-widest font-mono">
                Official 201 Office File • RL Construction
              </span>
              <h3 className="text-base font-black text-slate-900 uppercase">
                {selected201Worker.name}
              </h3>
            </div>
            <button
              onClick={() => setSelected201Worker(null)}
              className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          </div>

          {/* 201 Contents */}
          {isEditing ? (
            <div className="space-y-3.5 text-xs font-sans text-slate-700 max-h-[50vh] overflow-y-auto pr-1 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Employee Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-yellow-500 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Daily rate (₱)</label>
                  <input
                    type="number"
                    value={formData.dailyRate || 0}
                    onChange={(e) => setFormData({ ...formData, dailyRate: Number(e.target.value) })}
                    className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Designation / Role</label>
                  <select
                    value={formData.role || 'Laborer'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer text-slate-700 font-semibold"
                  >
                    <option value="Mason">Mason</option>
                    <option value="Laborer font-medium">Laborer</option>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Welder">Welder</option>
                    <option value="Electrician">Electrician</option>
                    <option value="Operator">Operator</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Foreman">Foreman</option>
                    <option value="Admin">Admin</option>
                    <option value="Secretary">Secretary</option>
                    <option value="Intern">Intern</option>
                    <option value="Skilled Worker">Skilled Worker</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Placement Site</label>
                  <select
                    value={formData.assignedSiteId || ''}
                    onChange={(e) => setFormData({ ...formData, assignedSiteId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer text-slate-700"
                  >
                    <option value="">Unassigned</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Residential Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Status Class</label>
                  <select
                    value={formData.employmentStatus || 'Project-based'}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer font-bold"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Probationary">Probationary</option>
                    <option value="Project-based">Project-based</option>
                    <option value="Intern">Intern</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Roster Status</label>
                  <select
                    value={formData.status || (formData.active ? 'active' : 'terminated')}
                    onChange={(e) => {
                      const newStatus = e.target.value as 'active' | 'terminated' | 'awol';
                      setFormData({ ...formData, status: newStatus, active: newStatus === 'active' });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer font-bold text-slate-700 focus:outline-hidden focus:border-yellow-500"
                  >
                    <option value="active">Active</option>
                    <option value="terminated">Terminated</option>
                    <option value="awol">AWOL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Official Date Hired</label>
                  <input
                    type="date"
                    value={formData.dateHired || ''}
                    onChange={(e) => setFormData({ ...formData, dateHired: e.target.value })}
                    className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Birthday</label>
                  <input
                    type="date"
                    value={formData.birthday || ''}
                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl space-y-2 text-left">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block font-mono">🚨 Primary Contact in Emergencies</span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="space-y-0.5">
                    <label className="text-slate-400 font-bold block">Contact Person</label>
                    <input
                      type="text"
                      value={formData.emergencyContactName || ''}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-slate-400 font-bold block">Contact Mobile</label>
                    <input
                      type="text"
                      value={formData.emergencyContactPhone || ''}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs font-sans text-slate-700 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Employment Role</span>
                  <p className="text-xs font-extrabold text-slate-900 mt-0.5 uppercase tracking-wide">{selected201Worker.role}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Daily rate</span>
                  <p className="text-xs font-bold text-slate-900 font-mono mt-0.5">₱{selected201Worker.dailyRate.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Residential Address</span>
                <p className="text-xs font-medium text-slate-800 mt-0.5">{selected201Worker.address || 'Block 25 Lot 14, Tierra Vista, Cavite (On file)'}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Contact Phone</span>
                  <p className="text-xs font-semibold text-slate-900 font-mono mt-0.5">{selected201Worker.phone || 'No active details'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status Class</span>
                  <p className="text-xs font-extrabold text-indigo-600 mt-0.5 uppercase tracking-wider">{selected201Worker.employmentStatus || 'Project-based'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Roster Status</span>
                  <p className={`text-xs font-black mt-0.5 uppercase tracking-wider ${
                    (selected201Worker.status || (selected201Worker.active ? 'active' : 'terminated')) === 'active'
                      ? 'text-emerald-600'
                      : (selected201Worker.status || (selected201Worker.active ? 'active' : 'terminated')) === 'awol'
                      ? 'text-amber-500'
                      : 'text-rose-600'
                  }`}>
                    {selected201Worker.status || (selected201Worker.active ? 'active' : 'terminated')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Official Date Hired</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5 font-mono">{selected201Worker.dateHired || '2021-04-12'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Birthday</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5 font-mono">{selected201Worker.birthday || '1992-07-20'}</p>
                </div>
              </div>

              {/* Emergency Details card */}
              <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl space-y-2 text-left">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block font-mono">🚨 Primary Contact in Emergencies</span>
                
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold block">Contact Person:</span>
                    <span className="text-slate-800 font-bold">{selected201Worker.emergencyContactName || 'Ronald C. Famorca'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block">Contact Mobile:</span>
                    <span className="text-slate-800 font-semibold font-mono">{selected201Worker.emergencyContactPhone || '+63-917-555-4011'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Operations */}
          <div className="flex flex-wrap gap-2 pt-3 border-t font-sans">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-[10px] tracking-wider px-4 py-2 rounded-xl border border-emerald-500 transition-all cursor-pointer shadow-xs flex-1 text-center"
                >
                  Save Profile Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex-1 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {(currentRole === 'Admin' || currentRole === 'Secretary') && (
                  <button
                    onClick={() => {
                      setFormData(selected201Worker);
                      setIsEditing(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[10px] tracking-wider px-4 py-2 rounded-xl border border-blue-500 transition-all cursor-pointer shadow-xs flex-1 text-center"
                  >
                    Edit Profile Details
                  </button>
                )}
                <button
                  onClick={() => {
                    const doc = new jsPDF('p', 'mm', 'letter');
                    
                    doc.setFillColor(15, 23, 42); // slate-900 background
                    doc.rect(0, 0, 216, 40, 'F');
                    
                    doc.setFillColor(234, 179, 8); // yellow-500 gold
                    doc.rect(16, 12, 10, 10, 'F');
                    doc.setFillColor(255, 255, 255);
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(7);
                    doc.text('RL', 19.5, 18.5);

                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(16);
                    doc.setTextColor(255, 255, 255);
                    doc.text('RL CONSTRUCTION', 30, 18);
                    
                    doc.setFont('Helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(234, 179, 8);
                    doc.text('Block 25 Lot 14, Tierra Vista, Santiago, General Trias, Cavite', 30, 24);
                    
                    doc.setFontSize(8);
                    doc.setTextColor(148, 163, 184);
                    doc.text('Official Employment 201 Core Directory Folder', 30, 30);

                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.setTextColor(15, 23, 42);
                    doc.text('EMPLOYEE COVENANT 201 PROFILE', 16, 55);

                    doc.setFont('Helvetica', 'normal');
                    doc.setFontSize(10);
                    let currY = 68;
                    const writeRow = (label: string, value: string) => {
                      doc.setFont('Helvetica', 'bold');
                      doc.text(label, 16, currY);
                      doc.setFont('Helvetica', 'normal');
                      doc.text(value, 60, currY);
                      currY += 8.5;
                    };

                    writeRow('Employee Name:', selected201Worker.name.toUpperCase());
                    writeRow('Operational Designation:', selected201Worker.role.toUpperCase());
                    writeRow('Standard Day Rate:', `PHP ${selected201Worker.dailyRate.toLocaleString()}`);
                    writeRow('Residential Coordinates:', selected201Worker.address || 'Cavite Province, Ph');
                    writeRow('Contact Phone:', selected201Worker.phone || 'No active details');
                    writeRow('Employment Status:', selected201Worker.employmentStatus || 'Project-based');
                    writeRow('Date Assigned roster:', selected201Worker.dateHired || '2021-04-12');
                    writeRow('Emergency Contact Person:', selected201Worker.emergencyContactName || 'Ronald C. Famorca');
                    writeRow('Emergency Contact Phone:', selected201Worker.emergencyContactPhone || '+63-917-555-4011');

                    doc.setDrawColor(203, 213, 225);
                    doc.line(16, currY + 15, 80, currY + 15);
                    doc.setFontSize(8.5);
                    doc.text('Affiant / Employee Signature', 16, currY + 20);

                    doc.line(125, currY + 15, 195, currY + 15);
                    doc.text('Authorized HR: Ronald Famorca', 125, currY + 20);

                    doc.save(`201_File_${selected201Worker.name.replace(/\s+/g, '_')}.pdf`);
                  }}
                  className="bg-slate-900 border border-slate-800 text-yellow-400 font-bold uppercase text-[10px] tracking-wider px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Folder
                </button>
                <button
                  onClick={() => setSelected201Worker(null)}
                  className="bg-white border text-slate-600 font-bold px-4 py-2 rounded-xl text-xs flex-1 transition-colors hover:bg-slate-50 cursor-pointer text-center font-bold"
                >
                  Close Folder
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
  );
}
