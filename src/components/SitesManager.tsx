/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  User, 
  Phone, 
  Plus, 
  Coins,
  Search, 
  Sparkles,
  PhilippinePeso, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  PiggyBank,
  CheckCircle2,
  Receipt,
  Download,
  Trash2,
  Image as ImageIcon,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Camera,
  UploadCloud,
  X,
  Edit
} from 'lucide-react';
import { ConstructionSite, ClientPayment, AttendanceRecord, ExpenseRecord, UserRole, ClientReceipt, AdditionalScopeItem } from '../types';
import { 
  getSiteLaborCost, 
  getSiteSupervisorCost, 
  getSiteTotalCost, 
  getSiteClientPayments, 
  getSiteClientBalance, 
  formatCurrency 
} from '../utils';

interface SitesManagerProps {
  sites: ConstructionSite[];
  attendance: AttendanceRecord[];
  expenses: ExpenseRecord[];
  payments: ClientPayment[];
  onAddSite: (site: Omit<ConstructionSite, 'id'>) => void;
  onUpdateSiteStatus: (siteId: string, status: ConstructionSite['status']) => void;
  onUpdateSite?: (siteId: string, updates: Partial<ConstructionSite>) => void;
  onAddClientPayment: (payment: Omit<ClientPayment, 'id'>) => void;
  onDeleteClientPayment: (paymentId: string) => void;
  onUpdateClientPayment?: (payment: ClientPayment) => void;
  onDeleteSite: (siteId: string) => void;
  selectedSiteId: string | null;
  setSelectedSiteId: (siteId: string | null) => void;
  currentRole?: UserRole;
  assignedSiteId?: string;
  onDeleteExpense?: (expenseId: string) => void;
  receipts?: ClientReceipt[];
  onToggleReimburse?: (expenseId: string) => void;
  additionalScopes?: AdditionalScopeItem[];
}

export default function SitesManager({
  sites,
  attendance,
  expenses,
  payments,
  onAddSite,
  onUpdateSiteStatus,
  onUpdateSite,
  onAddClientPayment,
  onDeleteClientPayment,
  onUpdateClientPayment,
  onDeleteSite,
  selectedSiteId,
  setSelectedSiteId,
  currentRole = 'Admin',
  assignedSiteId = '',
  onDeleteExpense,
  receipts = [],
  onToggleReimburse,
  additionalScopes = [],
}: SitesManagerProps) {
  // Navigation states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const containerId = useId();

  // Add Project Forms State
  const [newSite, setNewSite] = useState({
    name: '',
    location: '',
    supervisorName: '',
    projectValue: 50000,
    budgetLimit: 40000,
    clientName: '',
    clientPhone: '',
    status: 'active' as ConstructionSite['status'],
    startDate: new Date().toISOString().split('T')[0],
    supervisorPasscode: '2222',
  });

  // Client Payment Form State
  const [newPayment, setNewPayment] = useState({
    amount: 5000,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer' as ClientPayment['paymentMethod'],
    milestone: '',
    notes: '',
  });

  // Form error states
  const [siteFormError, setSiteFormError] = useState('');
  const [paymentFormError, setPaymentFormError] = useState('');

  // Overrides based on user role
  const userSites = currentRole === 'Admin' 
    ? sites 
    : sites.filter(s => s.id === assignedSiteId);

  // Filtering sites
  const filteredSites = userSites.filter((site) => {
    const matchesSearch = 
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.supervisorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Selected site data
  const activeSite = userSites.find((s) => s.id === selectedSiteId) || userSites[0] || null;

  // Local project progress states
  const [localProgress, setLocalProgress] = useState<number>(0);
  const [localReport, setLocalReport] = useState<string>('');
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [progressSuccessMsg, setProgressSuccessMsg] = useState('');

  // Edit Site setup parameters states
  const [showEditSiteModal, setShowEditSiteModal] = useState(false);
  const [editSiteData, setEditSiteData] = useState<Partial<ConstructionSite>>({});

  useEffect(() => {
    if (activeSite) {
      setLocalProgress(activeSite.progress || 0);
      setLocalReport(activeSite.progressReport || '');
      setProgressSuccessMsg('');
    }
  }, [activeSite?.id]);

  const handleSaveProgress = async () => {
    if (!activeSite || !onUpdateSite) return;
    setIsUpdatingProgress(true);
    try {
      await onUpdateSite(activeSite.id, {
        progress: localProgress,
        progressReport: localReport
      });
      setProgressSuccessMsg('Project progress and field report logged successfully!');
      setTimeout(() => setProgressSuccessMsg(''), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Add site handler
  const handleCreateSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite.name || !newSite.location || !newSite.supervisorName || !newSite.clientName) {
      setSiteFormError('Please enter all required text fields.');
      return;
    }
    if (newSite.budgetLimit > newSite.projectValue) {
      setSiteFormError('Warning: The target budget limit should typically be less than the total project contract value.');
      return;
    }
    onAddSite(newSite);
    setNewSite({
      name: '',
      location: '',
      supervisorName: '',
      projectValue: 50000,
      budgetLimit: 40000,
      clientName: '',
      clientPhone: '',
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      supervisorPasscode: '2222',
    });
    setSiteFormError('');
    setShowAddSiteModal(false);
  };

  // Add client payment handler
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSite) return;
    if (newPayment.amount <= 0 || !newPayment.milestone) {
      setPaymentFormError('Please provide a positive payment amount and milestone description.');
      return;
    }
    onAddClientPayment({
      siteId: activeSite.id,
      amount: Number(newPayment.amount),
      date: newPayment.date,
      paymentMethod: newPayment.paymentMethod,
      milestone: newPayment.milestone,
      notes: newPayment.notes,
    });
    // Reset payment input
    setNewPayment({
      amount: 5000,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      milestone: '',
      notes: '',
    });
    setPaymentFormError('');
  };

  // States for expanded milestone payment in the ledger
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  
  // State for image viewer modal
  const [activePreviewPhoto, setActivePreviewPhoto] = useState<string | null>(null);

  // States for the inline milestone expense form
  const [milestoneExpDesc, setMilestoneExpDesc] = useState('');
  const [milestoneExpAmount, setMilestoneExpAmount] = useState<number>(0);
  const [milestoneExpCategory, setMilestoneExpCategory] = useState('Urgent Material');
  const [milestoneExpDate, setMilestoneExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [milestoneExpSupervisor, setMilestoneExpSupervisor] = useState('');
  const [milestoneExpenseToDelete, setMilestoneExpenseToDelete] = useState<{ paymentId: string; expenseId: string; description: string; amount: number } | null>(null);

  // Photos preset options
  const PHOTO_PRESETS = [
    { name: 'Excavation & Ground', url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=85' },
    { name: 'Concrete & Structure', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=85' },
    { name: 'Materials Delivery', url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=600&q=85' },
    { name: 'Site Supervisor Check', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=85' },
  ];

  // File Upload Helper
  const handleFileChange = (paymentId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const targetPayment = payments.find(p => p.id === paymentId);
      if (targetPayment) {
        const currentPhotos = targetPayment.photos || [];
        const updatedPayment = {
          ...targetPayment,
          photos: [...currentPhotos, base64String]
        };
        if (onUpdateClientPayment) {
          onUpdateClientPayment(updatedPayment);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Preset Image selection handler
  const handleAddPresetPhoto = (paymentId: string, url: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (targetPayment) {
      const currentPhotos = targetPayment.photos || [];
      const updatedPayment = {
        ...targetPayment,
        photos: [...currentPhotos, url]
      };
      if (onUpdateClientPayment) {
        onUpdateClientPayment(updatedPayment);
      }
    }
  };

  // Delete Image photo
  const handleDeletePhoto = (paymentId: string, photoIndex: number) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (targetPayment) {
      const currentPhotos = targetPayment.photos || [];
      const updatedPhotos = currentPhotos.filter((_, idx) => idx !== photoIndex);
      const updatedPayment = {
        ...targetPayment,
        photos: updatedPhotos
      };
      if (onUpdateClientPayment) {
        onUpdateClientPayment(updatedPayment);
      }
    }
  };

  // Add Expense to Milestone
  const handleAddMilestoneExpense = (paymentId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneExpDesc || milestoneExpAmount <= 0) {
      alert('Please enter a valid description and a positive amount.');
      return;
    }

    const targetPayment = payments.find(p => p.id === paymentId);
    if (targetPayment) {
      const currentExpenses = targetPayment.expenses || [];
      const newMilestoneExp = {
        id: `m-exp-${Date.now()}`,
        date: milestoneExpDate,
        description: milestoneExpDesc,
        amount: Number(milestoneExpAmount),
        category: milestoneExpCategory,
        supervisorName: milestoneExpSupervisor || activeSite?.supervisorName || 'Site Supervisor'
      };

      const updatedPayment = {
        ...targetPayment,
        expenses: [...currentExpenses, newMilestoneExp]
      };

      if (onUpdateClientPayment) {
        onUpdateClientPayment(updatedPayment);
      }

      // Reset fields
      setMilestoneExpDesc('');
      setMilestoneExpAmount(0);
      setMilestoneExpDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Delete Expense from Milestone
  const handleDeleteMilestoneExpense = (paymentId: string, expenseId: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (targetPayment) {
      const currentExpenses = targetPayment.expenses || [];
      const updatedExpenses = currentExpenses.filter(e => e.id !== expenseId);
      const updatedPayment = {
        ...targetPayment,
        expenses: updatedExpenses
      };
      if (onUpdateClientPayment) {
        onUpdateClientPayment(updatedPayment);
      }
    }
  };

  // Detailed calculations for active selected site
  const selLaborCost = activeSite ? getSiteLaborCost(activeSite.id, attendance) : 0;
  const selSupervisorCost = activeSite ? getSiteSupervisorCost(activeSite.id, expenses) : 0;
  const selTotalCost = activeSite ? getSiteTotalCost(activeSite.id, attendance, expenses) : 0;
  const selClientPaid = activeSite ? getSiteClientPayments(activeSite.id, payments) : 0;
  const selClientBalance = activeSite ? getSiteClientBalance(activeSite, payments) : 0;
  
  // Specific list items for auditing
  const sitePayments = activeSite ? payments.filter(p => p.siteId === activeSite.id) : [];
  const siteExpenses = activeSite ? expenses.filter(e => e.siteId === activeSite.id) : [];
  const siteReceipts = activeSite ? receipts.filter(r => r.siteId === activeSite.id) : [];
  
  // Site workers daily wages calculated
  const siteAttendance = activeSite ? attendance.filter(a => a.siteId === activeSite.id) : [];

  // Site Additional scope calculations for the Net Income equation
  const siteAdditionalScopeAmount = (activeSite && additionalScopes)
    ? additionalScopes.filter(item => item.siteId === activeSite.id).reduce((sum, item) => sum + item.amount, 0)
    : 0;
  const siteAdditionalScopeItemsCount = (activeSite && additionalScopes)
    ? additionalScopes.filter(item => item.siteId === activeSite.id).length
    : 0;
  const netIncome = activeSite 
    ? (activeSite.projectValue + siteAdditionalScopeAmount) - selTotalCost
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id={containerId}>
      {/* LEFT COLUMN: Site Directory & List (4 cols) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-slate-500" />
              Construction Sites
            </h2>
            {currentRole !== 'Client' && (
              <button
                onClick={() => setShowAddSiteModal(true)}
                className="bg-black hover:bg-neutral-900 border border-neutral-850 text-white rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-yellow-400" />
                Add Site
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by site name, supervisor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-xs rounded-lg pl-8 pr-2.5 py-1.5 text-slate-900 font-medium"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-md border border-slate-200">
            {['all', 'active', 'completed', 'on-hold'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`flex-1 py-1 rounded-sm text-[9px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                  statusFilter === tab 
                    ? 'bg-black text-yellow-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Site directory deck */}
        <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
          {filteredSites.length === 0 ? (
            <div className="bg-white p-6 rounded-xl text-center border border-slate-200 text-slate-400 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No sites found</p>
              <p className="text-[10px] text-slate-400">Match raw supervisor names or register new ones</p>
            </div>
          ) : (
            filteredSites.map((site) => {
              const active = activeSite?.id === site.id;
              const totalCost = getSiteTotalCost(site.id, attendance, expenses);
              const isOver = totalCost > site.budgetLimit;

              return (
                <div
                  key={site.id}
                  onClick={() => setSelectedSiteId(site.id)}
                  className={`p-3 rounded-xl cursor-pointer text-left border transition-all ${
                    active 
                      ? 'bg-yellow-50/60 border-yellow-400 shadow-sm ring-1 ring-yellow-400' 
                      : 'bg-white hover:bg-slate-50/50 border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-xs line-clamp-1 uppercase tracking-tight">{site.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className={`px-1 rounded-sm text-[8px] font-bold tracking-wider uppercase border ${
                        site.status === 'active' ? 'bg-emerald-55 text-emerald-800 border-emerald-250/50' :
                        site.status === 'completed' ? 'bg-sky-55 text-sky-800 border-sky-250/50' :
                        'bg-slate-150 text-slate-650 border-slate-250/50'
                      }`}>
                        {site.status}
                      </span>
                      {currentRole === 'Admin' && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to completely delete construction site "${site.name}"? This will unassign associated logs.`)) {
                              onDeleteSite(site.id);
                              if (activeSite?.id === site.id) {
                                setSelectedSiteId(null);
                              }
                            }
                          }}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-all cursor-pointer"
                          title="Delete Construction Site"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-55" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-2">
                    <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
                    <span className="truncate font-medium">{site.location}</span>
                  </div>

                  {/* High level visual budget meter */}
                  <div className="space-y-1 mt-2 pb-0.5">
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>Spent: {formatCurrency(totalCost)}</span>
                      <span className={isOver ? 'text-rose-600 font-bold' : 'font-medium'}>
                        Max: {formatCurrency(site.budgetLimit)}
                      </span>
                    </div>
                    <div className="h-1 bg-slate-150 rounded-full overflow-hidden border border-slate-200/40">
                      <div 
                        className={`h-full rounded-full ${isOver ? 'bg-rose-500' : 'bg-sky-505'}`}
                        style={{ width: `${Math.min(100, (totalCost / site.budgetLimit) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Site File Details (8 cols) */}
      <div className="lg:col-span-8">
        {activeSite ? (
          <motion.div
            key={activeSite.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Header Plate */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-slate-900">{activeSite.name}</h1>
                    {currentRole !== 'Client' ? (
                      <select
                        value={activeSite.status}
                        onChange={(e) => onUpdateSiteStatus(activeSite.id, e.target.value as ConstructionSite['status'])}
                        className="bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-wider rounded px-2 py-0.5 text-slate-700 focus:outline-hidden cursor-pointer focus:border-slate-300"
                      >
                        <option value="planning">PLANNING</option>
                        <option value="active">ACTIVE</option>
                        <option value="completed">COMPLETED</option>
                        <option value="on-hold">ON HOLD</option>
                      </select>
                    ) : (
                      <span className="bg-black text-yellow-505 text-[9px] font-bold uppercase tracking-wider rounded px-2 py-0.5 select-none font-mono">
                        {activeSite.status} BOUND
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {activeSite.location}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {(currentRole === 'Admin' || currentRole === 'Secretary') && (
                    <button
                      onClick={() => {
                        setEditSiteData(activeSite);
                        setShowEditSiteModal(true);
                      }}
                      className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 hover:text-slate-800 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5"
                      title="Edit project site parameters and info"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Site Info</span>
                    </button>
                  )}
                  {currentRole === 'Admin' && (
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this construction site? This will unassign associated logs.")) {
                          onDeleteSite(activeSite.id);
                          setSelectedSiteId(null);
                        }
                      }}
                      className="p-2 border border-rose-100 hover:bg-rose-50 rounded-xl text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                      title="Delete site ledger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Core site contacts info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400">Site Supervisor:</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-sky-500" />
                    {activeSite.supervisorName}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400">Client / Developer:</span>
                  <p className="font-semibold text-slate-800 truncate">{activeSite.clientName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400">Client Phone:</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {activeSite.clientPhone || 'No contact saved'}
                  </p>
                </div>
              </div>
            </div>

            {/* Site Financial Scorecard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>Contract Value</span>
                  <PhilippinePeso className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(activeSite.projectValue)}</p>
                <span className="text-[10px] text-slate-400">Agreed project invoice</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>Total Spent-to-date</span>
                  <TrendingUp className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(selTotalCost)}</p>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Labor: {formatCurrency(selLaborCost)}</span>
                  <span>Petty: {formatCurrency(selSupervisorCost)}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>Collected Receipts</span>
                  <PiggyBank className="w-4 h-4 text-sky-500" />
                </div>
                <p className="text-xl font-bold text-slate-900 text-sky-600">{formatCurrency(selClientPaid)}</p>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Balance:</span>
                  <span className="font-bold text-yellow-700">{formatCurrency(selClientBalance)}</span>
                </div>
              </div>
            </div>

            {/* Project Progress and Field Report */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Project Work Progress & Narrative Field Report
                </span>
                {activeSite.progress !== undefined && (
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-600">
                    Latest Sync: {activeSite.progress}% Complete
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left Column: Progress Slider / Metric */}
                <div className="md:col-span-4 space-y-3 flex flex-col justify-center">
                  <span className="text-xs font-semibold text-slate-500 block">Accomplishment Percentage:</span>
                  <div className="flex items-center gap-3">
                    {currentRole !== 'Client' ? (
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={localProgress}
                        onChange={(e) => setLocalProgress(Number(e.target.value))}
                        className="flex-1 accent-yellow-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                      />
                    ) : (
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-yellow-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${localProgress}%` }}
                        />
                      </div>
                    )}
                    <span className="text-sm font-mono font-bold text-slate-800 whitespace-nowrap">{localProgress}%</span>
                  </div>
                  
                  {currentRole !== 'Client' && (
                    <div className="flex flex-wrap gap-1">
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setLocalProgress(pct)}
                          className="text-[9px] px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 border rounded font-mono text-slate-600 cursor-pointer"
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Narrative Status Report */}
                <div className="md:col-span-8 space-y-2">
                  <span className="text-xs font-semibold text-slate-500 block">Field Status / Materials Update:</span>
                  {currentRole !== 'Client' ? (
                    <textarea
                      value={localReport}
                      onChange={(e) => setLocalReport(e.target.value)}
                      placeholder="Write current milestone achievements, site situation reports, structural milestones met, or pending constraints..."
                      rows={3}
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-slate-305 placeholder-slate-400"
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl min-h-[72px] text-xs text-slate-600 leading-relaxed italic">
                      {localReport.trim() ? localReport : "No detailed status report has been uploaded yet for this billing cycle."}
                    </div>
                  )}
                </div>
              </div>

              {currentRole !== 'Client' && (
                <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                  <p className="text-[10px] text-slate-400">
                    * Saved updates reflect in client notifications and invoice calculations across authorized dashboards.
                  </p>
                  <div className="flex items-center gap-3">
                    {progressSuccessMsg && (
                      <span className="text-[10px] text-emerald-600 font-medium animate-fade-in">
                        ✓ {progressSuccessMsg}
                      </span>
                    )}
                    <button
                      onClick={handleSaveProgress}
                      disabled={isUpdatingProgress}
                      className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold tracking-wider uppercase text-[10px] px-4 py-2 rounded-xl border border-yellow-400 hover:shadow-xs transition-all cursor-pointer disabled:bg-slate-200 disabled:border-slate-200 disabled:text-slate-400"
                    >
                      {isUpdatingProgress ? "Saving..." : "Save Status & Report"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Site Income Ledger Formulas and Net Income Section */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-yellow-500">Site Profit & Income Ledger</h3>
                    <p className="text-[10px] text-slate-400">Total Contract Price (TCP) + Additional Works - Expenses</p>
                  </div>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold py-0.5 px-2 rounded-full border border-emerald-500/20 uppercase tracking-wider animate-pulse">
                  Ledger Statement
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                {/* 1. Total Contract Price (TCP) */}
                <div className="p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block">Total Contract Price (TCP)</span>
                  <p className="text-sm sm:text-base font-black text-white">{formatCurrency(activeSite.projectValue)}</p>
                  <span className="text-[8.5px] text-slate-500 block">Initial agreed contract amount</span>
                </div>

                {/* 2. Additional Scope of Work */}
                <div className="p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block">Additional Scope of Work</span>
                  <p className="text-sm sm:text-base font-black text-yellow-400">+{formatCurrency(siteAdditionalScopeAmount)}</p>
                  <span className="text-[8.5px] text-slate-500 block">({siteAdditionalScopeItemsCount} custom design extension logs)</span>
                </div>

                {/* 3. Total Expenses */}
                <div className="p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block">Total Expenses</span>
                  <p className="text-sm sm:text-base font-black text-rose-400">-{formatCurrency(selTotalCost)}</p>
                  <div className="text-[8.5px] text-slate-500 flex justify-between gap-1 leading-none">
                    <span>Labor: {formatCurrency(selLaborCost)}</span>
                    <span>Petty: {formatCurrency(selSupervisorCost)}</span>
                  </div>
                </div>

                {/* 4. Net Income Result */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wide block">Net Profit / Income</span>
                  <p className={`text-base sm:text-lg font-black font-mono ${netIncome >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                    {formatCurrency(netIncome)}
                  </p>
                  <span className={`text-[8.5px] font-semibold block ${netIncome >= 0 ? "text-slate-400" : "text-rose-400 animate-pulse"}`}>
                    {netIncome >= 0 ? "✓ Positive margin yield" : "⚠ Negative project deficit"}
                  </span>
                </div>
              </div>

              {/* Formula String bar */}
              <div className="bg-black/40 p-3 rounded-xl border border-slate-800/80 text-[10px] text-slate-400 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="font-mono leading-relaxed text-center md:text-left">
                  <span className="font-bold text-yellow-500 uppercase mr-1">Formula & Math:</span>
                  <span className="text-slate-300">
                    TCP (<strong className="text-white">{formatCurrency(activeSite.projectValue)}</strong>)
                    {' + '}
                    Additional Scope (<strong className="text-yellow-400">{formatCurrency(siteAdditionalScopeAmount)}</strong>)
                    {' - '}
                    Total Expenses (<strong className="text-rose-400">{formatCurrency(selTotalCost)}</strong>)
                    {' = '}
                    Net Income (<strong className={netIncome >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{formatCurrency(netIncome)}</strong>)
                  </span>
                </div>
                <div className="text-[9.5px] text-slate-500 shrink-0 text-center uppercase tracking-wider font-extrabold">
                  {activeSite.name} Ledger Calculations
                </div>
              </div>
            </div>

            {/* Twin Split Panel: Per-Site Expenses Audit & Client Payment Milestone Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Box 1: Client Milestone Payments received */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-950 text-sm flex items-center gap-1.5">
                    <Receipt className="w-4 font-normal text-sky-600" />
                    Milestone Ledger
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                    Received: {formatCurrency(selClientPaid)}
                  </span>
                </div>

                {/* Received List */}
                <div className="flex-1 min-h-[160px] max-h-[500px] overflow-y-auto space-y-2 pr-1">
                  {sitePayments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-1">
                      <PiggyBank className="w-8 h-8 text-slate-300 stroke-1" />
                      <p className="text-xs font-semibold">No milestones billed</p>
                      <p className="text-[10px] text-slate-400">Record payments below as milestones are reached</p>
                    </div>
                  ) : (
                    sitePayments.map((p) => (
                      <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors space-y-3">
                        {/* Milestone info header */}
                        <div 
                          onClick={() => setExpandedPaymentId(expandedPaymentId === p.id ? null : p.id)}
                          className="flex justify-between items-start gap-3 cursor-pointer select-none"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {expandedPaymentId === p.id ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              )}
                              <p className="text-xs font-semibold text-slate-800 truncate">{p.milestone}</p>
                            </div>
                            <div className="flex items-center flex-wrap gap-1.5 text-[9px] text-slate-400 leading-none">
                              <span>{p.date}</span>
                              <span>•</span>
                              <span>{p.paymentMethod}</span>
                              {p.photos && p.photos.length > 0 && (
                                <span className="bg-sky-50 text-sky-700 px-1 py-0.5 rounded font-black font-mono">
                                  📸 {p.photos.length} Photo{p.photos.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {p.expenses && p.expenses.length > 0 && (
                                <span className="bg-yellow-50 text-yellow-850 px-1 py-0.5 rounded font-black font-mono">
                                  💸 {p.expenses.length} Expense{p.expenses.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            {p.notes && <p className="text-[10px] italic text-slate-500 mt-1 truncate">"{p.notes}"</p>}
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs font-bold text-slate-900">{formatCurrency(p.amount)}</span>
                            {currentRole !== 'Client' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to completely remove client billing milestone payment of ${formatCurrency(p.amount)} for milestone "${p.milestone}"?`)) {
                                    onDeleteClientPayment(p.id);
                                  }
                                }}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-all cursor-pointer"
                                title="Remove Payment Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Details */}
                        {expandedPaymentId === p.id && (
                          <div className="pt-3 border-t border-slate-200/60 space-y-4 text-xs">
                            {/* Photos section */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-950 uppercase tracking-wider">
                                <span className="flex items-center gap-1">
                                  <Camera className="w-3.5 h-3.5 text-sky-600" />
                                  Milestone Attachment Gallery
                                </span>
                                <span className="text-[9px] font-normal text-slate-400 normal-case">Click preview to enlarge</span>
                              </div>

                              {/* Photo Grid */}
                              {(!p.photos || p.photos.length === 0) ? (
                                <div className="p-4 rounded-lg border border-dashed border-slate-200 text-center bg-white text-slate-400 text-[10px]">
                                  No visual progress photos annexed to this milestone yet.
                                </div>
                              ) : (
                                <div className="grid grid-cols-4 gap-2">
                                  {p.photos.map((ph, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-slate-200 bg-slate-100">
                                      <img 
                                        src={ph} 
                                        alt={`Milestone thumbnail ${idx + 1}`} 
                                        className="w-full h-full object-cover cursor-zoom-in"
                                        referrerPolicy="no-referrer"
                                        onClick={() => setActivePreviewPhoto(ph)}
                                      />
                                      {/* Delete button */}
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePhoto(p.id, idx)}
                                        className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white p-1 rounded-full transition-colors cursor-pointer"
                                        title="Delete photo"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Form to append photo */}
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-semibold text-slate-500">Append Progress Image:</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {/* Custom Real File Upload button */}
                                  <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all border border-slate-200 text-center select-none">
                                    <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                                    Upload Local File
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => handleFileChange(p.id, e)} 
                                    />
                                  </label>
                                  
                                  {/* Presets dropdown/quick picker */}
                                  <div className="relative">
                                    <select
                                      defaultValue=""
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleAddPresetPhoto(p.id, e.target.value);
                                          e.target.value = ""; // Reset
                                        }
                                      }}
                                      className="w-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold uppercase rounded-lg px-2 py-1.5 cursor-pointer"
                                    >
                                      <option value="" disabled>Select Stock Photo...</option>
                                      {PHOTO_PRESETS.map((pst, pIdx) => (
                                        <option key={pIdx} value={pst.url}>
                                          {pst.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Milestone Expenses ledger block */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-950 uppercase tracking-wider">
                                <span className="flex items-center gap-1 text-yellow-700">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  Supervisor Milestone Receipts
                                </span>
                                <span className="text-[10px] font-bold text-slate-600 font-mono">
                                  Total: {formatCurrency(p.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0)}
                                </span>
                              </div>

                              {/* Expense log list */}
                              {(!p.expenses || p.expenses.length === 0) ? (
                                <div className="p-3 text-center bg-white rounded-lg border border-slate-100 text-[10px] text-slate-400">
                                  No supervisor field expenses logged under this milestone.
                                </div>
                              ) : (
                                <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-100 max-h-[140px] overflow-y-auto">
                                  {p.expenses.map((me) => (
                                    <div key={me.id} className="flex justify-between items-center p-1.5 hover:bg-slate-50 rounded text-[10px] border-b border-slate-50 last:border-0">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                          <span className="font-semibold text-slate-700 truncate">{me.description}</span>
                                          <span className="text-[8px] bg-yellow-50 text-yellow-800 px-1 rounded uppercase font-bold shrink-0">{me.category}</span>
                                        </div>
                                        <p className="text-[8px] text-slate-400 font-mono">{me.date} by {me.supervisorName}</p>
                                      </div>
                                      <div className="flex items-center gap-1.5 pl-2 shrink-0">
                                        <span className="font-bold text-slate-900 font-mono">{formatCurrency(me.amount)}</span>
                                        <button
                                          type="button"
                                          onClick={() => setMilestoneExpenseToDelete({ paymentId: p.id, expenseId: me.id, description: me.description, amount: me.amount })}
                                          className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                                          title="Delete expense entry"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Form to log/input milestone expense */}
                              <form 
                                onSubmit={(e) => handleAddMilestoneExpense(p.id, e)}
                                className="bg-yellow-50/50 p-3 rounded-lg border border-yellow-200/50 space-y-2"
                              >
                                <span className="text-[10px] font-bold text-yellow-800 block uppercase tracking-wider">
                                  Lodge Field Supervisor Expense
                                </span>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-0.5">
                                    <label className="text-[9px] font-semibold text-slate-500">Amount (₱)</label>
                                    <input 
                                      type="number"
                                      min="1"
                                      required
                                      placeholder="0"
                                      value={milestoneExpAmount || ''}
                                      onChange={(e) => setMilestoneExpAmount(Number(e.target.value))}
                                      className="w-full bg-white border border-slate-200 text-xs rounded px-2 py-1 text-slate-950 font-mono"
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <label className="text-[9px] font-semibold text-slate-500">Expense Category</label>
                                    <select
                                      value={milestoneExpCategory}
                                      onChange={(e) => setMilestoneExpCategory(e.target.value)}
                                      className="w-full bg-white border border-slate-200 text-xs rounded px-1.5 py-1 text-slate-950 cursor-pointer"
                                    >
                                      <option value="Urgent Material">Urgent Material</option>
                                      <option value="Fuel">Fuel / Gas</option>
                                      <option value="Tea & Meals">Tea & Meals</option>
                                      <option value="Small Tools">Small Tools</option>
                                      <option value="Local Transport">Local Transport</option>
                                      <option value="Worker Advance">Worker Advance</option>
                                      <option value="Other">Other</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="space-y-0.5">
                                  <label className="text-[9px] font-semibold text-slate-500">Description</label>
                                  <input 
                                    type="text"
                                    required
                                    placeholder="e.g. bought structural tie wire"
                                    value={milestoneExpDesc}
                                    onChange={(e) => setMilestoneExpDesc(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-xs rounded px-2 py-1 text-slate-950"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-0.5">
                                    <label className="text-[9px] font-semibold text-slate-500">Supervisor Name</label>
                                    <input 
                                      type="text"
                                      placeholder={activeSite?.supervisorName || "Supervisor"}
                                      value={milestoneExpSupervisor}
                                      onChange={(e) => setMilestoneExpSupervisor(e.target.value)}
                                      className="w-full bg-white border border-slate-200 text-xs rounded px-2 py-1 text-slate-950"
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <label className="text-[9px] font-semibold text-slate-500">Log Date</label>
                                    <input 
                                      type="date"
                                      value={milestoneExpDate}
                                      onChange={(e) => setMilestoneExpDate(e.target.value)}
                                      className="w-full bg-white border border-slate-200 text-xs rounded px-2 py-1 text-slate-950"
                                    />
                                  </div>
                                </div>

                                <button
                                  type="submit"
                                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold uppercase text-[9px] tracking-wider py-1.5 rounded transition-colors cursor-pointer"
                                >
                                  Submit & Link Expense to Milestone
                                </button>
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Form to log client payment info - Admin Only */}
                {currentRole === 'Admin' ? (
                  <form onSubmit={handleRecordPayment} className="pt-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-[11px] font-bold text-slate-950 uppercase tracking-wider">Log Client Milestone Receipt</h4>
                    
                    {paymentFormError && (
                      <div className="p-2 bg-rose-50 text-rose-600 border border-rose-150 rounded-lg text-[10px] font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {paymentFormError}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">Amount Recd (₱)</label>
                        <input
                          type="number"
                          min="1"
                          value={newPayment.amount}
                          onChange={(e) => setNewPayment(prev => ({ ...prev, amount: Number(e.target.value) }))}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:outline-hidden text-xs rounded-lg px-2.5 py-1.5 text-slate-950 font-mono"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">Receipt Date</label>
                        <input
                          type="date"
                          value={newPayment.date}
                          onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:outline-hidden text-xs rounded-lg px-2 py-1 text-slate-950"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">Milestone / Title</label>
                        <input
                          type="text"
                          placeholder="e.g., Concrete Foundation Done"
                          value={newPayment.milestone}
                          onChange={(e) => setNewPayment(prev => ({ ...prev, milestone: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:outline-hidden text-xs rounded-lg px-2.5 py-1.5 text-slate-950"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">Method</label>
                        <select
                          value={newPayment.paymentMethod}
                          onChange={(e) => setNewPayment(prev => ({ ...prev, paymentMethod: e.target.value as ClientPayment['paymentMethod'] }))}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:outline-hidden text-xs rounded-lg px-2 py-1 text-slate-950 cursor-pointer"
                        >
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      Log Milestone Receipt
                    </button>
                  </form>
                ) : (
                  <div className="pt-4 border-t border-slate-100 p-4 bg-slate-50 rounded-xl text-center space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">🔒 Administrative Billing Shield</p>
                    <p className="text-[9px] text-slate-400">Milestone receipt logs are system-locked for non-administrators.</p>
                  </div>
                )}
              </div>

              {/* Box 2: Total Site Expenses - Logged supervisors vs worker payroll */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col space-y-4">
                <h3 className="font-bold text-slate-950 text-sm flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-rose-500" />
                  Per-Site Expenses & Receipts Audit
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                    <span className="text-[10px] text-rose-700 font-semibold block uppercase">Total Labor Payroll</span>
                    <p className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(selLaborCost)}</p>
                    <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">{siteAttendance.length} individual shifts logs</span>
                  </div>

                  <div className="p-3 bg-yellow-50/60 rounded-xl border border-yellow-200">
                    <span className="text-[10px] text-yellow-700 font-semibold block uppercase">Supervisor Petty Cash</span>
                    <p className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(selSupervisorCost)}</p>
                    <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">{siteExpenses.length} field vouchers</span>
                  </div>

                  <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-150">
                    <span className="text-[10px] text-sky-700 font-semibold block uppercase">Logged Receipts</span>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {formatCurrency(siteReceipts.reduce((sum, r) => sum + r.amount, 0))}
                    </p>
                    <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">{siteReceipts.length} client receipts</span>
                  </div>
                </div>

                <div className="flex-1 space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  <h4 className="text-[11px] font-bold text-slate-900">Voucher, Wages & Receipts Audit Stream</h4>
                  
                  {siteAttendance.length === 0 && siteExpenses.length === 0 && siteReceipts.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
                      No expense logs or client receipts computed for this construction site yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Logged Official E-Receipts */}
                      {siteReceipts.map((rec) => (
                        <div key={rec.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs p-3 rounded-lg bg-sky-50/20 border border-sky-150/40 gap-2">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-1.5 flex-row">
                              <span className="text-[9px] uppercase font-bold tracking-wider px-1 bg-sky-100 text-sky-850 rounded">logged e-receipt</span>
                              <span className="font-semibold text-sky-700 text-[11px] font-mono">{rec.receiptNumber}</span>
                            </div>
                            <span className="font-semibold text-slate-800 block text-xs">{rec.milestoneAndPurpose}</span>
                            <div className="flex items-center flex-wrap gap-2 text-[9px] text-slate-400 font-mono">
                              <span>Client: <strong className="text-slate-700">{rec.clientName}</strong></span>
                              <span>•</span>
                              <span>Issued: {rec.date}</span>
                              <span>•</span>
                              <span>Recv By: {rec.receivedBy}</span>
                            </div>
                            {rec.notes && (
                              <p className="text-[9px] text-slate-405 italic font-medium truncate max-w-md">Notes: &quot;{rec.notes}&quot;</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                            <span className="font-bold text-emerald-700 font-mono text-sm">+{formatCurrency(rec.amount)}</span>
                          </div>
                        </div>
                      ))}

                      {/* Mixed recent registers */}
                      {siteExpenses.map((exp) => (
                        <div key={exp.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs p-3 rounded-lg bg-yellow-50/30 border border-yellow-150/50 gap-2">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="text-[9px] uppercase font-bold tracking-wider px-1 bg-yellow-100 text-yellow-850 rounded">supervisor</span>
                              <span className="font-semibold text-yellow-805 text-[11px] font-mono">{exp.category}</span>
                            </div>
                            <span className="font-semibold text-slate-800 block text-xs">{exp.description}</span>
                            <div className="flex items-center flex-wrap gap-2 text-[9px] text-slate-400 font-mono">
                              <span>{exp.date} by {exp.supervisorName}</span>
                              <span>•</span>
                              <span>{exp.paymentMethod}</span>
                            </div>

                            {/* Verification Badge & Toggle Action */}
                            <div className="flex items-center flex-wrap gap-1.5 pt-1">
                              {exp.reimbursed ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-150">
                                  ✓ Verified by Admin/Sec
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-150 animate-pulse">
                                  ⚠ Pending Verification
                                </span>
                              )}
                              {(currentRole === 'Admin' || currentRole === 'Secretary') && onToggleReimburse && (
                                <button
                                  onClick={() => onToggleReimburse(exp.id)}
                                  className="text-[8px] font-bold uppercase text-indigo-700 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                  title="Toggle verification status of expense log"
                                >
                                  {exp.reimbursed ? 'Mark as Unverified' : 'Approve & Verify'}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                            <span className="font-bold text-slate-900 font-mono text-sm">{formatCurrency(exp.amount)}</span>
                            {currentRole !== 'Client' && onDeleteExpense && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to completely delete supervisor expense: "${exp.description}"?`)) {
                                    onDeleteExpense(exp.id);
                                  }
                                }}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-all cursor-pointer"
                                title="Delete Expense Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {siteAttendance.filter(a => a.wageEarned > 0).slice(0, 10).map((att) => (
                        <div key={att.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-emerald-50/30 border border-emerald-100/60">
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider px-1 bg-emerald-50 text-emerald-800 rounded mr-1.5">crew wage</span>
                            <span className="font-medium text-slate-705">Worker Attendance Ledger Shift</span>
                            <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{att.date} • status: {att.status}</p>
                          </div>
                          <span className="font-semibold text-slate-900 font-mono">{formatCurrency(att.wageEarned)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
            <Building2 className="w-16 h-16 mx-auto stroke-1 text-slate-350 mb-4" />
            <h3 className="text-lg font-bold">No Active Site Ledger Selected</h3>
            <p className="text-sm max-w-sm mx-auto mt-2">Pick an existing construction project from the left panel, or append a fresh workplace registry to kick off details.</p>
          </div>
        )}
      </div>

      {/* MODAL WINDOW: Create Construction Site File */}
      <AnimatePresence>
        {showAddSiteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddSiteModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Content Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 relative z-10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sky-600" />
                  Register Construction Site
                </h3>
                <button
                  onClick={() => setShowAddSiteModal(false)}
                  className="p-1 rounded-md hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {siteFormError && (
                <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {siteFormError}
                </div>
              )}

              <form onSubmit={handleCreateSite} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Project / Site Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Oakridge Office Wing"
                    value={newSite.name}
                    onChange={(e) => setNewSite(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Site Location / Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Block 4, Expressway Sector C"
                    value={newSite.location}
                    onChange={(e) => setNewSite(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Site Supervisor Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Richard Vance"
                      value={newSite.supervisorName}
                      onChange={(e) => setNewSite(prev => ({ ...prev, supervisorName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Start Date</label>
                    <input
                      type="date"
                      value={newSite.startDate}
                      onChange={(e) => setNewSite(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Contract Value (Client Paid Max) *</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={newSite.projectValue}
                      onChange={(e) => setNewSite(prev => ({ ...prev, projectValue: Number(e.target.value) }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Max Expense Budget Limit *</label>
                    <input
                      type="number"
                      required
                      min="500"
                      value={newSite.budgetLimit}
                      onChange={(e) => setNewSite(prev => ({ ...prev, budgetLimit: Number(e.target.value) }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Client / Developer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Sarah Johnson"
                      value={newSite.clientName}
                      onChange={(e) => setNewSite(prev => ({ ...prev, clientName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Client Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g., +1-555-8811"
                      value={newSite.clientPhone}
                      onChange={(e) => setNewSite(prev => ({ ...prev, clientPhone: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 flex justify-between">
                    <span>Supervisor Access Passcode *</span>
                    <span className="text-[10px] text-amber-600 font-semibold italic">Created by admin, checked on login</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g., 2222"
                    value={newSite.supervisorPasscode}
                    onChange={(e) => setNewSite(prev => ({ ...prev, supervisorPasscode: e.target.value }))}
                    className="w-full bg-amber-50/30 border border-amber-200 focus:border-amber-500 font-bold focus:outline-hidden text-sm rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>

                <div className="flex gap-2 pt-4 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddSiteModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    Register Site File
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Image Preview Modal */}
      <AnimatePresence>
        {activePreviewPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setActivePreviewPhoto(null)}
          >
            <div className="absolute top-4 right-4 text-white text-xs font-mono uppercase tracking-widest flex items-center gap-2 cursor-pointer bg-neutral-900/80 px-3 py-1.5 rounded-full border border-neutral-800">
              <span>Close / Click Backdrop</span>
              <X className="w-4 h-4" />
            </div>
            
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center"
            >
              <img 
                src={activePreviewPhoto} 
                alt="Milestone evidence high resolution details"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-neutral-800/60"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION DIALOG: Custom Delete Milestone Expense Modal with Yes/No */}
      <AnimatePresence>
        {milestoneExpenseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMilestoneExpenseToDelete(null)}
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
                  Delete Milestone Expense?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Are you sure you want to completely delete the milestone expense of <strong className="text-slate-900">{formatCurrency(milestoneExpenseToDelete.amount)}</strong>?
                </p>
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-[10px] text-slate-400 font-medium text-left">
                  <strong>Description:</strong> {milestoneExpenseToDelete.description}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setMilestoneExpenseToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  No, Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteMilestoneExpense(milestoneExpenseToDelete.paymentId, milestoneExpenseToDelete.expenseId);
                    setMilestoneExpenseToDelete(null);
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

      {/* Dynamic Modal Form to Edit Project Site */}
      <AnimatePresence>
        {showEditSiteModal && activeSite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditSiteModal(false)}
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full p-6 relative z-10 space-y-4 font-sans text-xs"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Edit className="w-5 h-5 text-yellow-500" />
                  Edit Project Files Setup
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditSiteModal(false)}
                  className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (onUpdateSite) {
                    await onUpdateSite(activeSite.id, {
                      name: editSiteData.name,
                      location: editSiteData.location,
                      supervisorName: editSiteData.supervisorName,
                      projectValue: Number(editSiteData.projectValue) || 0,
                      budgetLimit: Number(editSiteData.budgetLimit) || 0,
                      clientName: editSiteData.clientName,
                      clientPhone: editSiteData.clientPhone,
                      startDate: editSiteData.startDate,
                      supervisorPasscode: editSiteData.supervisorPasscode,
                    });
                  }
                  setShowEditSiteModal(false);
                }}
                className="space-y-4 text-left"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Project Site Name *</label>
                    <input
                      type="text"
                      required
                      value={editSiteData.name || ''}
                      onChange={(e) => setEditSiteData({ ...editSiteData, name: e.target.value })}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-yellow-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Location Address Scope *</label>
                    <input
                      type="text"
                      required
                      value={editSiteData.location || ''}
                      onChange={(e) => setEditSiteData({ ...editSiteData, location: e.target.value })}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Site Supervisor Assigned</label>
                    <input
                      type="text"
                      required
                      value={editSiteData.supervisorName || ''}
                      onChange={(e) => setEditSiteData({ ...editSiteData, supervisorName: e.target.value })}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Project Commencement Date</label>
                    <input
                      type="date"
                      value={editSiteData.startDate || ''}
                      onChange={(e) => setEditSiteData({ ...editSiteData, startDate: e.target.value })}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Total Contract Value (TCP, ₱) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editSiteData.projectValue || 0}
                      onChange={(e) => setEditSiteData({ ...editSiteData, projectValue: Number(e.target.value) })}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Internal Expense Budget (₱) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editSiteData.budgetLimit || 0}
                      onChange={(e) => setEditSiteData({ ...editSiteData, budgetLimit: Number(e.target.value) })}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 font-mono font-bold text-rose-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Client / Developer Name *</label>
                    <input
                      type="text"
                      required
                      value={editSiteData.clientName || ''}
                      onChange={(e) => setEditSiteData({ ...editSiteData, clientName: e.target.value })}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 font-semibold"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Client Phone Number</label>
                    <input
                      type="text"
                      value={editSiteData.clientPhone || ''}
                      onChange={(e) => setEditSiteData({ ...editSiteData, clientPhone: e.target.value })}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 font-mono"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 flex justify-between">
                      <span>Supervisor Access Passcode *</span>
                      <span className="text-[9px] text-amber-600 font-bold italic lowercase font-sans">Created by Admin</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={editSiteData.supervisorPasscode || ''}
                      onChange={(e) => setEditSiteData({ ...editSiteData, supervisorPasscode: e.target.value })}
                      className="w-full bg-amber-50/20 border border-amber-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowEditSiteModal(false)}
                    className="px-4 py-2 border rounded-xl hover:bg-slate-50 cursor-pointer font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black rounded-xl border border-yellow-450 cursor-pointer shadow-xs"
                  >
                    Save Site Changes
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
