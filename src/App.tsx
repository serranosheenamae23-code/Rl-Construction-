/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useId, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  PhilippinePeso, 
  Coins, 
  LayoutDashboard, 
  Menu, 
  X,
  ShieldCheck,
  RefreshCw,
  HardHat,
  Bookmark,
  Bell,
  ChevronDown,
  Settings,
  AlertTriangle,
  FileText,
  Clock,
  Trash2,
  Briefcase,
  Compass,
  FileSpreadsheet,
  Calculator,
  ShieldAlert,
  Building,
  Cloud,
  Activity,
  History,
  Undo
} from 'lucide-react';

// Recovery library
import { logDeletion, logModification } from './lib/recovery';
import DataRecovery from './components/DataRecovery';

// Types and default data
import { ConstructionSite, Worker, AttendanceRecord, ExpenseRecord, ClientPayment, SupervisorFund, ClientReceipt, SupervisorLoan, SupervisorLoanPayment, WorkerLoan, AdditionalScopeItem, Announcement } from './types';
import { 
  INITIAL_SITES, 
  INITIAL_WORKERS, 
  INITIAL_ATTENDANCE, 
  INITIAL_EXPENSES, 
  INITIAL_CLIENT_PAYMENTS 
} from './data';

// Firebase core integration
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';

// Modular Sub-components
import Dashboard from './components/Dashboard';
import SitesManager from './components/SitesManager';
import ClientBilling from './components/ClientBilling';
import AttendancePayroll from './components/AttendancePayroll';
import SupervisorExpenses from './components/SupervisorExpenses';
import Reports from './components/Reports';
import { RLLogo } from './components/RLLogo';
import CompanyProfile from './components/CompanyProfile';
import ProjectMasterlist from './components/ProjectMasterlist';
import Estimation from './components/Estimation';
import DrawingsLayout from './components/DrawingsLayout';
import WorkspaceHub from './components/WorkspaceHub';
import LoginGateway from './components/LoginGateway';
import AdditionalScopeTracker from './components/AdditionalScopeTracker';

export default function App() {
  const mainId = useId();
  
  // Real-time synchronization states
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [supervisorFunds, setSupervisorFunds] = useState<SupervisorFund[]>([]);
  const [receipts, setReceipts] = useState<ClientReceipt[]>([]);
  const [supervisorLoans, setSupervisorLoans] = useState<SupervisorLoan[]>([]);
  const [workerLoans, setWorkerLoans] = useState<WorkerLoan[]>([]);
  const [additionalScopes, setAdditionalScopes] = useState<AdditionalScopeItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Real-time Activity Log tracker state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [recycleBin, setRecycleBin] = useState<any[]>([]);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [liveToast, setLiveToast] = useState<any | null>(null);

  const [dbLoading, setDbLoading] = useState(true);

  // Editable Admin Passcode state with database persistence & localStorage fallback
  const [adminPasscode, setAdminPasscode] = useState<string>(() => {
    return localStorage.getItem('cs_admin_passcode') || '1111';
  });
  const [tempAdminCode, setTempAdminCode] = useState<string>(() => {
    return localStorage.getItem('cs_admin_passcode') || '1111';
  });
  const [passcodeSaved, setPasscodeSaved] = useState<boolean>(false);

  // Core authorization system and persistence
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('cs_is_logged_in') === 'true';
  });

  // CORE SIMULATED SECURITY SETTINGS
  const [currentRole, setCurrentRole] = useState<'Admin' | 'Site Supervisor' | 'Client'>(() => {
    const saved = localStorage.getItem('cs_current_role');
    return (saved as any) || 'Admin';
  });

  const [assignedSiteId, setAssignedSiteId] = useState<string>(() => {
    const saved = localStorage.getItem('cs_assigned_site_id');
    return saved || 'site-1';
  });

  // Current active navigation tab (Routing Default based on Role)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'masterlist' | 'estimation' | 'drawings' | 'sites' | 'attendance' | 'expenses' | 'reports' | 'profile' | 'workspace'>(() => {
    const savedRole = localStorage.getItem('cs_current_role') || 'Admin';
    if (savedRole === 'Site Supervisor') {
      return 'attendance';
    }
    return 'dashboard';
  });

  const [sitesSubTab, setSitesSubTab] = useState<'manager' | 'billing' | 'additionalScope'>('manager');

  // Real-time synchronization states for Google Sheets and Backup
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');

  // Trigger real-time sync when data changes and we have internet
  useEffect(() => {
    const token = localStorage.getItem('cs_ws_access_token');
    const isOnline = window.navigator.onLine;

    if (!token) {
      setSyncStatus('idle');
      return;
    }

    if (!isOnline) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    const delayDebounceFn = setTimeout(async () => {
      try {
        const { syncAllDataToWorkspace } = await import('./lib/workspace');
        await syncAllDataToWorkspace(token, {
          sites,
          attendance,
          expenses,
          payments,
          workers,
          receipts
        });
        setSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Real-time Google Sync failed:', error);
        setSyncStatus('error');
      }
    }, 4500); // 4.5 seconds of silence before writing in-place to Sheets & Drive

    return () => clearTimeout(delayDebounceFn);
  }, [sites, attendance, expenses, payments, workers, receipts]);

  // Online transition listener to retry/trigger sync instantly
  useEffect(() => {
    const handleOnline = () => {
      const token = localStorage.getItem('cs_ws_access_token');
      if (!token) return;

      setSyncStatus('syncing');
      import('./lib/workspace').then(async ({ syncAllDataToWorkspace }) => {
        try {
          await syncAllDataToWorkspace(token, {
            sites,
            attendance,
            expenses,
            payments,
            workers,
            receipts
          });
          setSyncStatus('synced');
          setLastSyncedTime(new Date().toLocaleTimeString());
        } catch (e) {
          setSyncStatus('error');
        }
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sites, attendance, expenses, payments, workers, receipts]);

  
  // Selected site for detailed managers view
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Allowed Tabs based on security role
  const allowedTabs = useMemo(() => {
    const allTabs = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'workspace', label: 'Google Sync', icon: Cloud },
      { id: 'masterlist', label: 'Project Masterlist', icon: FileSpreadsheet },
      { id: 'estimation', label: 'Fit-out Estimator', icon: Calculator },
      { id: 'drawings', label: 'Plan Design Tracker', icon: Compass },
      { id: 'sites', label: currentRole === 'Client' ? 'Project Budget' : 'Billings Ledger', icon: Building2 },
      { id: 'attendance', label: 'Labor', icon: Users },
      { id: 'expenses', label: 'Petty Cash', icon: Coins },
      { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'profile', label: 'Company Profile', icon: Building },
      { id: 'recovery', label: 'Data Recovery', icon: History },
    ];

    if (currentRole === 'Site Supervisor') {
      return allTabs.filter(tab => ['dashboard', 'sites', 'attendance', 'expenses'].includes(tab.id));
    } else if (currentRole === 'Client') {
      return allTabs.filter(tab => !['attendance', 'expenses', 'recovery'].includes(tab.id));
    }
    return allTabs;
  }, [currentRole]);

  // Log out sequence to clear local sessions
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('cs_is_logged_in');
    localStorage.removeItem('cs_current_role');
    localStorage.removeItem('cs_assigned_site_id');
    setCurrentRole('Admin');
    setAssignedSiteId('site-1');
  };

  const [notificationSettings, setNotificationSettings] = useState(() => {
    const saved = localStorage.getItem('cs_notif_settings');
    return saved ? JSON.parse(saved) : {
      payrollApproaching: true,
      paymentOverdue: true,
      budgetThreshold: true,
      thresholdPercentage: 90,
      supervisorLogin: true
    };
  });

  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('cs_read_notif_ids');
    return saved ? JSON.parse(saved) : [];
  });
  const [demoSeedingEnabled, setDemoSeedingEnabled] = useState<boolean>(() => {
    return localStorage.getItem('cs_seeding_disabled') === 'false';
  });

  const handleToggleSeeding = (enabled: boolean) => {
    setDemoSeedingEnabled(enabled);
    localStorage.setItem('cs_seeding_disabled', enabled ? 'false' : 'true');
  };

  const sessionStartTime = useMemo(() => Date.now(), []);

  // Real-time Firestore sync setup on component mount
  useEffect(() => {
    // 1. Connection check validation with a slight delay & retry to ensure robust connectivity detection
    const testConnection = async (retries = 2) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          if (retries > 0) {
            testConnection(retries - 1);
          } else {
            console.error("Please check your Firebase configuration.");
          }
        }
      }
    };
    testConnection();

    // 2. Real-time collection streams with auto-seeding on fresh empty database instances
    const unsubSites = onSnapshot(collection(db, 'sites'), (snapshot) => {
      const isSeedingDisabled = localStorage.getItem('cs_seeding_disabled') !== 'false';
      if (snapshot.empty) {
        if (!isSeedingDisabled) {
          INITIAL_SITES.forEach(async (s) => {
            try {
              await setDoc(doc(db, 'sites', s.id), s);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `sites/${s.id}`);
            }
          });
        } else {
          setSites([]);
        }
      } else {
        const list: ConstructionSite[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as ConstructionSite);
        });
        setSites(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sites');
    });

    const unsubWorkers = onSnapshot(collection(db, 'workers'), (snapshot) => {
      const isSeedingDisabled = localStorage.getItem('cs_seeding_disabled') !== 'false';
      if (snapshot.empty) {
        if (!isSeedingDisabled) {
          INITIAL_WORKERS.forEach(async (w) => {
            try {
              await setDoc(doc(db, 'workers', w.id), w);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `workers/${w.id}`);
            }
          });
        } else {
          setWorkers([]);
        }
      } else {
        const list: Worker[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Worker);
        });
        setWorkers(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'workers');
    });

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const isSeedingDisabled = localStorage.getItem('cs_seeding_disabled') !== 'false';
      if (snapshot.empty) {
        if (!isSeedingDisabled) {
          INITIAL_ATTENDANCE.forEach(async (a) => {
            try {
              await setDoc(doc(db, 'attendance', a.id), a);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `attendance/${a.id}`);
            }
          });
        } else {
          setAttendance([]);
        }
      } else {
        const list: AttendanceRecord[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as AttendanceRecord);
        });
        setAttendance(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'attendance');
    });

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const isSeedingDisabled = localStorage.getItem('cs_seeding_disabled') !== 'false';
      if (snapshot.empty) {
        if (!isSeedingDisabled) {
          INITIAL_EXPENSES.forEach(async (e) => {
            try {
              await setDoc(doc(db, 'expenses', e.id), e);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `expenses/${e.id}`);
            }
          });
        } else {
          setExpenses([]);
        }
      } else {
        const list: ExpenseRecord[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as ExpenseRecord);
        });
        setExpenses(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'expenses');
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const isSeedingDisabled = localStorage.getItem('cs_seeding_disabled') !== 'false';
      if (snapshot.empty) {
        if (!isSeedingDisabled) {
          INITIAL_CLIENT_PAYMENTS.forEach(async (p) => {
            try {
              await setDoc(doc(db, 'payments', p.id), p);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `payments/${p.id}`);
            }
          });
        } else {
          setPayments([]);
        }
      } else {
        const list: ClientPayment[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as ClientPayment);
        });
        setPayments(list);
      }
      setDbLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'payments');
    });

    const unsubSupervisorFunds = onSnapshot(collection(db, 'supervisor_funds'), (snapshot) => {
      const list: SupervisorFund[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as SupervisorFund);
      });
      setSupervisorFunds(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'supervisor_funds');
    });

    const unsubReceipts = onSnapshot(collection(db, 'ereceipts'), (snapshot) => {
      const list: ClientReceipt[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as ClientReceipt);
      });
      setReceipts(list);
    }, (error) => {
      console.error("Firestore ereceipts listener failed, falling back to local storage", error);
      const saved = localStorage.getItem('cs_e_receipts');
      if (saved) {
        setReceipts(JSON.parse(saved));
      }
      handleFirestoreError(error, OperationType.GET, 'ereceipts');
    });

    const unsubSupervisorLoans = onSnapshot(collection(db, 'supervisor_loans'), (snapshot) => {
      const list: SupervisorLoan[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as SupervisorLoan);
      });
      setSupervisorLoans(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'supervisor_loans');
    });

    const unsubWorkerLoans = onSnapshot(collection(db, 'worker_loans'), (snapshot) => {
      const list: WorkerLoan[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as WorkerLoan);
      });
      setWorkerLoans(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'worker_loans');
    });

    const unsubAdditionalScopes = onSnapshot(collection(db, 'additional_scopes'), (snapshot) => {
      const list: AdditionalScopeItem[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as AdditionalScopeItem);
      });
      setAdditionalScopes(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'additional_scopes');
    });

    // Sync admin passcode configuration from settings collection
    const unsubAdminConfig = onSnapshot(doc(db, 'settings', 'admin_config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.adminPasscode) {
          setAdminPasscode(data.adminPasscode);
          localStorage.setItem('cs_admin_passcode', data.adminPasscode);
        }
      }
    }, (error) => {
      console.warn("Firestore admin config listener failed", error);
    });

    // Sync announcements from settings/announcements document
    const unsubAnnouncements = onSnapshot(doc(db, 'settings', 'announcements'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.list)) {
          setAnnouncements(data.list);
        } else {
          setAnnouncements([]);
        }
      } else {
        const isSeedingDisabled = localStorage.getItem('cs_seeding_disabled') !== 'false';
        if (isSeedingDisabled) {
          setAnnouncements([]);
        } else {
          const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
            {
              id: 'ann-1',
              title: '🛡️ Mandatory Site Safety Standards Update',
              content: 'All Site Supervisors must guarantee that every local craftsman and subcontractor is equipped with certified hard hats and reflective safety vests prior to entering the workspace.',
              date: '2026-06-11',
              category: 'Safety',
              pinned: true,
              createdBy: 'System Admin'
            },
            {
              id: 'ann-2',
              title: '📅 15th Merit-Based Payroll Processing Schedule',
              content: 'The 15th-of-the-month cut-off is approaching. Please ensure all manual attendance discrepancies are encoded of the active labor list.',
              date: '2026-06-10',
              category: 'Payroll',
              pinned: false,
              createdBy: 'HR Department'
            },
            {
              id: 'ann-3',
              title: '✨ Welcome to RL Construction Supervisor Hub',
              content: 'Authorized personnel can now track crew birthdays (201 Profile), check billing milestone accomplishments, and coordinate out-of-contract variations.',
              date: '2026-06-08',
              category: 'General',
              pinned: false,
              createdBy: 'Management'
            }
          ];
          setDoc(doc(db, 'settings', 'announcements'), { list: DEFAULT_ANNOUNCEMENTS })
            .then(() => setAnnouncements(DEFAULT_ANNOUNCEMENTS))
            .catch((err) => console.warn("Failed to seed default announcements", err));
        }
      }
    }, (error) => {
      console.warn("Firestore announcements listener failed", error);
    });

    const unsubActivityLogs = onSnapshot(collection(db, 'activity_logs'), (snapshot) => {
      const list: any[] = [];
      let latestNewLog: any = null;
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const log = change.doc.data();
          const logTime = new Date(log.timestamp).getTime();
          // Log is fresh since component mounted
          if (logTime > sessionStartTime - 3000) {
            latestNewLog = log;
          }
        }
      });

      snapshot.forEach((docRef) => {
        list.push(docRef.data());
      });

      // Sort newest first
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivityLogs(list);

      if (latestNewLog) {
        setLiveToast(latestNewLog);
        setHasNewActivity(true);
        const logIdToShow = latestNewLog.id;
        setTimeout(() => {
          setLiveToast((prev: any) => {
            if (prev && prev.id === logIdToShow) {
              return null;
            }
            return prev;
          });
        }, 6000);
      }
    }, (error) => {
      console.warn("Firestore activity logs listener failed", error);
    });

    const unsubRecycleBin = onSnapshot(collection(db, 'recycle_bin'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docRef) => {
        list.push({ id: docRef.id, ...docRef.data() });
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecycleBin(list);
    }, (error) => {
      console.warn("Firestore recycle bin listener failed", error);
    });

    return () => {
      unsubSites();
      unsubWorkers();
      unsubAttendance();
      unsubExpenses();
      unsubPayments();
      unsubSupervisorFunds();
      unsubReceipts();
      unsubSupervisorLoans();
      unsubWorkerLoans();
      unsubAdditionalScopes();
      unsubAdminConfig();
      unsubAnnouncements();
      unsubActivityLogs();
      unsubRecycleBin();
    };
  }, []);

  // Sync temp admin passcode when the centralized synced admin passcode updates
  useEffect(() => {
    setTempAdminCode(adminPasscode);
  }, [adminPasscode]);

  // Sync remaining device-specific options to local storage
  useEffect(() => {
    localStorage.setItem('cs_current_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('cs_assigned_site_id', assignedSiteId);
  }, [assignedSiteId]);

  useEffect(() => {
    localStorage.setItem('cs_notif_settings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  useEffect(() => {
    localStorage.setItem('cs_read_notif_ids', JSON.stringify(readNotifIds));
  }, [readNotifIds]);

  // Real-time Event Logger to record site supervisor and admin transactions
  const logActivity = async (
    actionType: 'login' | 'attendance' | 'expense' | 'loan' | 'receipt' | 'billing' | 'additional_scope',
    actionDescription: string,
    forceUserRole?: 'Admin' | 'Site Supervisor' | 'Client'
  ) => {
    const role = forceUserRole || currentRole;
    
    // Determine site specific variables
    const activeSiteRef = (role === 'Site Supervisor') ? assignedSiteId : selectedSiteId || 'all';
    const project = sites.find(s => s.id === activeSiteRef);
    const supervisorNameVal = project ? project.supervisorName : 'Representative';
    
    let userName = 'Secretariat Office';
    if (role === 'Site Supervisor') {
      userName = `Supervisor ${supervisorNameVal}`;
    } else if (role === 'Admin') {
      userName = 'Admin Contractor';
    } else if (role === 'Client') {
      userName = project ? `Client: ${project.clientName}` : 'Client Representative';
    }

    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const logItem = {
      id: logId,
      timestamp: new Date().toISOString(),
      userRole: role,
      siteId: activeSiteRef || 'all',
      userName,
      actionType,
      actionDescription
    };

    try {
      await setDoc(doc(db, 'activity_logs', logId), logItem);
    } catch (e) {
      console.warn("Could not log activity in Firestore:", e);
    }
  };

  // ---------------------------------------------------------------------------
  // STATE MODIFIERS (FIRESTORE BASED WRITES)
  // ---------------------------------------------------------------------------

  // Update Admin Passcode
  const handleUpdateAdminPasscode = async (newCode: string) => {
    setAdminPasscode(newCode);
    localStorage.setItem('cs_admin_passcode', newCode);
    try {
      await setDoc(doc(db, 'settings', 'admin_config'), { adminPasscode: newCode });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/admin_config');
    }
  };

  // Register a new Supervisor Loan
  const handleAddSupervisorLoan = async (loan: Omit<SupervisorLoan, 'id'>) => {
    const id = `sv-loan-${Date.now()}`;
    const newItem: SupervisorLoan = { ...loan, id, payments: loan.payments || [] };
    try {
      await setDoc(doc(db, 'supervisor_loans', id), newItem);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `supervisor_loans/${id}`);
    }
  };

  // Update Supervisor Loan (e.g., adding a payment or updating values)
  const handleUpdateSupervisorLoan = async (id: string, updates: Partial<SupervisorLoan>) => {
    try {
      await setDoc(doc(db, 'supervisor_loans', id), updates, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `supervisor_loans/${id}`);
    }
  };

  // Delete Supervisor Loan entry
  const handleDeleteSupervisorLoan = async (id: string) => {
    try {
      const backup = supervisorLoans.find(item => item.id === id);
      if (backup) {
        await logDeletion('supervisor_loans', id, backup, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Deleted finance loan record for Supervisor "${backup.supervisorName}" of ₱${backup.totalAmount.toLocaleString()}`);
      }
      await deleteDoc(doc(db, 'supervisor_loans', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `supervisor_loans/${id}`);
    }
  };

  // Register a new Worker Loan
  const handleAddWorkerLoan = async (loan: Omit<WorkerLoan, 'id'>) => {
    const id = `wk-loan-${Date.now()}`;
    const newItem: WorkerLoan = { ...loan, id, payments: loan.payments || [] };
    try {
      await setDoc(doc(db, 'worker_loans', id), newItem);
      const s = sites.find(item => item.id === loan.siteId);
      logActivity('loan', `Granted and logged financial advance of ₱${loan.totalAmount.toLocaleString()} to worker "${loan.workerName}" at "${s?.name || 'site'}"`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `worker_loans/${id}`);
    }
  };

  // Update Worker Loan (e.g. adding payment or updating values)
  const handleUpdateWorkerLoan = async (id: string, updates: Partial<WorkerLoan>) => {
    try {
      const previous = workerLoans.find(l => l.id === id);
      if (previous) {
        const updated = { ...previous, ...updates };
        await logModification('worker_loans', id, previous, updated, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Updated financial loan for Worker "${previous.workerName}"`);
      }
      await setDoc(doc(db, 'worker_loans', id), updates, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `worker_loans/${id}`);
    }
  };

  // Delete Worker Loan entry
  const handleDeleteWorkerLoan = async (id: string) => {
    try {
      const backup = workerLoans.find(item => item.id === id);
      if (backup) {
        await logDeletion('worker_loans', id, backup, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Deleted finance loan record for Worker "${backup.workerName}" of ₱${backup.totalAmount.toLocaleString()}`);
      }
      await deleteDoc(doc(db, 'worker_loans', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `worker_loans/${id}`);
    }
  };

  // Register a new Additional Scope of Work
  const handleAddAdditionalScope = async (scope: Omit<AdditionalScopeItem, 'id'>) => {
    const id = `scope-item-${Date.now()}`;
    const newItem: AdditionalScopeItem = { ...scope, id };
    try {
      await setDoc(doc(db, 'additional_scopes', id), newItem);
      const s = sites.find(item => item.id === scope.siteId);
      logActivity('additional_scope', `Added out-of-contract Additional Scope variation order valued at ₱${scope.amount.toLocaleString()} ("${scope.description}") under "${s?.name || 'project'}"`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `additional_scopes/${id}`);
    }
  };

  // Delete Additional Scope of Work
  const handleDeleteAdditionalScope = async (id: string) => {
    try {
      const backup = additionalScopes.find(item => item.id === id);
      if (backup) {
        await logDeletion('additional_scopes', id, backup, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Deleted additional work scope "${backup.description}" valued at ₱${backup.amount.toLocaleString()}`);
      }
      await deleteDoc(doc(db, 'additional_scopes', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `additional_scopes/${id}`);
    }
  };

  // Add a new Construction Site
  const handleAddSite = async (site: Omit<ConstructionSite, 'id'>) => {
    const id = `site-${Date.now()}`;
    const newItem: ConstructionSite = { ...site, id };
    try {
      await setDoc(doc(db, 'sites', id), newItem);
      setSelectedSiteId(id); // auto select newly added site locally
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sites/${id}`);
    }
  };

  // Update Construction Site status
  const handleUpdateSiteStatus = async (siteId: string, status: ConstructionSite['status']) => {
    await handleUpdateSite(siteId, { status });
  };

  // Delete a site file
  const handleDeleteSite = async (siteId: string) => {
    try {
      const backup = sites.find(s => s.id === siteId);
      if (backup) {
        await logDeletion('sites', siteId, backup, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Deleted construction site "${backup.name}" in ${backup.location}`);
      }
      await deleteDoc(doc(db, 'sites', siteId));
      if (selectedSiteId === siteId) {
        setSelectedSiteId(null);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `sites/${siteId}`);
    }
  };

  // Add a new Worker roster profile
  const handleAddWorker = async (worker: Omit<Worker, 'id'>) => {
    const id = `w-${Date.now()}`;
    const newItem: Worker = { ...worker, id };
    try {
      await setDoc(doc(db, 'workers', id), newItem);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `workers/${id}`);
    }
  };

  // CENTRALIZED ANNOUNCEMENT UPDATE SYSTEM
  const handleSaveAnnouncements = async (updatedList: Announcement[]) => {
    try {
      await setDoc(doc(db, 'settings', 'announcements'), { list: updatedList });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/announcements');
    }
  };

  // Update an existing Worker profile details
  const handleUpdateWorker = async (workerId: string, updates: Partial<Worker>) => {
    const workerToUpdate = workers.find(w => w.id === workerId);
    if (workerToUpdate) {
      try {
        const updated = { ...workerToUpdate, ...updates };
        await logModification('workers', workerId, workerToUpdate, updated, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Updated profile of Worker "${workerToUpdate.name}"`);
        await setDoc(doc(db, 'workers', workerId), updated);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `workers/${workerId}`);
      }
    }
  };

  // Toggle worker status
  const handleToggleWorkerActive = async (workerId: string) => {
    const workerToToggle = workers.find(w => w.id === workerId);
    if (workerToToggle) {
      try {
        const updated = { ...workerToToggle, active: !workerToToggle.active };
        await logModification('workers', workerId, workerToToggle, updated, 'serranosheenamae23@gmail.com', 'Manager/Admin', `${workerToToggle.active ? 'Suspended/Deactivated' : 'Reactivated'} Worker "${workerToToggle.name}"`);
        await setDoc(doc(db, 'workers', workerId), updated);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `workers/${workerId}`);
      }
    }
  };

  // Delete worker from system
  const handleDeleteWorker = async (workerId: string) => {
    try {
      const backup = workers.find(w => w.id === workerId);
      if (backup) {
        await logDeletion('workers', workerId, backup, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Deleted worker roster profile "${backup.name}" (${backup.role})`);
      }
      await deleteDoc(doc(db, 'workers', workerId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `workers/${workerId}`);
    }
  };

  // Record Attendance shifts dynamically (Bulk upload or Single upload supported)
  const handleUpdateAttendance = async (newRecords: Omit<AttendanceRecord, 'id'>[]) => {
    newRecords.forEach(async (rec) => {
      const existingRecord = attendance.find(
        (item) => item.date === rec.date && item.workerId === rec.workerId
      );
      const id = existingRecord ? existingRecord.id : `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      try {
        await setDoc(doc(db, 'attendance', id), {
          ...rec,
          id,
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `attendance/${id}`);
      }
    });
    if (newRecords.length > 0) {
      const s = sites.find(item => item.id === newRecords[0].siteId);
      logActivity('attendance', `Logged daily attendance mark sheets for ${newRecords.length} worker shifts under "${s ? s.name : 'assigned project'}"`);
    }
  };

  // Add site supervisor petty cash expense
  const handleAddExpense = async (expense: Omit<ExpenseRecord, 'id'>) => {
    const id = `exp-${Date.now()}`;
    try {
      await setDoc(doc(db, 'expenses', id), { ...expense, id });
      const s = sites.find(item => item.id === expense.siteId);
      logActivity('expense', `Encoded new field voucher for expense: ₱${expense.amount.toLocaleString()} ("${expense.category}: ${expense.description}") for "${s?.name || 'project'}"`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `expenses/${id}`);
    }
  };

  // Toggle reimbursement statement
  const handleToggleReimbursed = async (expenseId: string) => {
    const expenseToToggle = expenses.find(e => e.id === expenseId);
    if (expenseToToggle) {
      try {
        await setDoc(doc(db, 'expenses', expenseId), { ...expenseToToggle, reimbursed: !expenseToToggle.reimbursed });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `expenses/${expenseId}`);
      }
    }
  };

  // Clear/Delete field expense
  const handleDeleteExpense = async (expenseId: string) => {
    const backup = expenses.find(e => e.id === expenseId);
    try {
      if (backup) {
        await logDeletion('expenses', expenseId, backup, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Deleted petty cash expense for "${backup.category}: ${backup.description}" of ₱${backup.amount.toLocaleString()}`);
      }
      await deleteDoc(doc(db, 'expenses', expenseId));
      if (backup) {
        const s = sites.find(item => item.id === backup.siteId);
        logActivity('expense', `Voided/Removed supervisor field expense of ₱${backup.amount.toLocaleString()} ("${backup.category}") from "${s?.name || 'project'}" records`);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `expenses/${expenseId}`);
    }
  };

  // Update Construction Site with partial fields (status, progress, reports)
  const handleUpdateSite = async (siteId: string, updates: Partial<ConstructionSite>) => {
    const siteToUpdate = sites.find(s => s.id === siteId);
    if (siteToUpdate) {
      try {
        const updated = { ...siteToUpdate, ...updates };
        await logModification('sites', siteId, siteToUpdate, updated, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Updated site details for "${siteToUpdate.name}"`);
        await setDoc(doc(db, 'sites', siteId), updated);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `sites/${siteId}`);
      }
    }
  };

  // Add a brand new supervision mobilization/support fund allocation
  const handleAddSupervisorFund = async (fund: Omit<SupervisorFund, 'id'>) => {
    const id = `fund-${Date.now()}`;
    try {
      await setDoc(doc(db, 'supervisor_funds', id), { ...fund, id });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `supervisor_funds/${id}`);
    }
  };

  // Clear/cancel a supervisor fund allocation record
  const handleDeleteSupervisorFund = async (fundId: string) => {
    try {
      const backup = supervisorFunds.find(item => item.id === fundId);
      if (backup) {
        await logDeletion('supervisor_funds', fundId, backup, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Deleted supervisor fund allocation of ₱${backup.amount.toLocaleString()} given by ${backup.givenBy}`);
      }
      await deleteDoc(doc(db, 'supervisor_funds', fundId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `supervisor_funds/${fundId}`);
    }
  };

  // Log client receipts received
  const handleAddClientPayment = async (payment: Omit<ClientPayment, 'id'>) => {
    const id = `pay-${Date.now()}`;
    try {
      await setDoc(doc(db, 'payments', id), { ...payment, id });
      const s = sites.find(item => item.id === payment.siteId);
      logActivity('billing', `Issued new client billing statement of ₱${payment.amount.toLocaleString()} for milestone: "${payment.milestone}" under "${s?.name || 'portfolio'}"`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `payments/${id}`);
    }
  };

  // Remove client milestone payments received
  const handleDeleteClientPayment = async (paymentId: string) => {
    const backup = payments.find(p => p.id === paymentId);
    try {
      if (backup) {
        await logDeletion('payments', paymentId, backup, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Deleted client billing statement of ₱${backup.amount.toLocaleString()} for milestone "${backup.milestone}"`);
      }
      await deleteDoc(doc(db, 'payments', paymentId));
      if (backup) {
        logActivity('billing', `Voided/Deleted Client Billing Milestone of ₱${backup.amount.toLocaleString()} (${backup.milestone})`);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `payments/${paymentId}`);
    }
  };

  // Add client e-receipt
  const handleAddClientReceipt = async (receipt: Omit<ClientReceipt, 'id'>) => {
    const id = `rec-${Date.now()}`;
    const newItem: ClientReceipt = { ...receipt, id };
    try {
      await setDoc(doc(db, 'ereceipts', id), newItem);
      const s = sites.find(item => item.id === receipt.siteId);
      logActivity('receipt', `Encoded Official E-Receipt #${receipt.receiptNumber} representing client payment of ₱${receipt.amount.toLocaleString()} for "${s?.name || 'portfolio'}"`);
    } catch (e) {
      console.error("Firestore write receipt error", e);
      const updated = [...receipts, newItem];
      localStorage.setItem('cs_e_receipts', JSON.stringify(updated));
      setReceipts(updated);
      handleFirestoreError(e, OperationType.WRITE, `ereceipts/${id}`);
    }
  };

  // Delete/void client e-receipt
  const handleDeleteClientReceipt = async (receiptId: string) => {
    const backup = receipts.find(r => r.id === receiptId);
    try {
      if (backup) {
        await logDeletion('ereceipts', receiptId, backup, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Deleted client e-receipt #${backup.receiptNumber} representing payment of ₱${backup.amount.toLocaleString()}`);
      }
      await deleteDoc(doc(db, 'ereceipts', receiptId));
      if (backup) {
        logActivity('receipt', `Voided/Cancelled Official Client E-Receipt #${backup.receiptNumber} valued at ₱${backup.amount.toLocaleString()}`);
      }
    } catch (e) {
      console.error("Firestore delete receipt error", e);
      const updated = receipts.filter(r => r.id !== receiptId);
      localStorage.setItem('cs_e_receipts', JSON.stringify(updated));
      setReceipts(updated);
      handleFirestoreError(e, OperationType.DELETE, `ereceipts/${receiptId}`);
    }
  };

  // Update client milestone payment details (with photos/expenses)
  const handleUpdateClientPayment = async (updatedPayment: ClientPayment) => {
    try {
      const previous = payments.find(p => p.id === updatedPayment.id);
      if (previous) {
        await logModification('payments', updatedPayment.id, previous, updatedPayment, 'serranosheenamae23@gmail.com', 'Manager/Admin', `Updated client billing statement for milestone "${updatedPayment.milestone}"`);
      }
      await setDoc(doc(db, 'payments', updatedPayment.id), updatedPayment);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `payments/${updatedPayment.id}`);
    }
  };

  // Navigate & filter assistant
  const navigateToSite = (tabId: string, siteId?: string) => {
    setActiveTab(tabId as any);
    if (siteId) {
      setSelectedSiteId(siteId);
    }
  };

  // Trigger cache reset to initial state (for resetting data cleanly across all devices)
  const handleDebugResetToDefault = async () => {
    if (confirm("Reset application? This will rollback workspace to sample database logs across all connected devices.")) {
      setDbLoading(true);
      try {
        localStorage.setItem('cs_seeding_disabled', 'false');
        setDemoSeedingEnabled(true);
        // Clear local memory states first
        setSelectedSiteId(null);
        setSites([]);
        setWorkers([]);
        setAttendance([]);
        setExpenses([]);
        setPayments([]);
        setSupervisorFunds([]);

        for (const s of sites) {
          await deleteDoc(doc(db, 'sites', s.id));
        }
        for (const w of workers) {
          await deleteDoc(doc(db, 'workers', w.id));
        }
        for (const a of attendance) {
          await deleteDoc(doc(db, 'attendance', a.id));
        }
        for (const e of expenses) {
          await deleteDoc(doc(db, 'expenses', e.id));
        }
        for (const p of payments) {
          await deleteDoc(doc(db, 'payments', p.id));
        }
        for (const f of supervisorFunds) {
          await deleteDoc(doc(db, 'supervisor_funds', f.id));
        }
        setActiveTab('dashboard');
      } catch (err) {
        console.error("Error resetting data: ", err);
      } finally {
        setDbLoading(false);
      }
    }
  };

  // Completely erase all database entries across all connected devices (leaving a pristine blank-slate workspace)
  const handleWipeAllData = async () => {
    if (confirm("🚨 WARNING: Are you sure you want to completely erase all data in this application? This will delete all sites, laborers, attendance cards, expenses, and payments with NO default demo seed, giving you a completely clean, fresh canvas. This cannot be undone.")) {
      setDbLoading(true);
      try {
        localStorage.setItem('cs_seeding_disabled', 'true');
        setDemoSeedingEnabled(false);
        setSelectedSiteId(null);
        setSites([]);
        setWorkers([]);
        setAttendance([]);
        setExpenses([]);
        setPayments([]);
        setSupervisorFunds([]);
        
        for (const s of sites) {
          await deleteDoc(doc(db, 'sites', s.id));
        }
        for (const w of workers) {
          await deleteDoc(doc(db, 'workers', w.id));
        }
        for (const a of attendance) {
          await deleteDoc(doc(db, 'attendance', a.id));
        }
        for (const e of expenses) {
          await deleteDoc(doc(db, 'expenses', e.id));
        }
        for (const p of payments) {
          await deleteDoc(doc(db, 'payments', p.id));
        }
        for (const f of supervisorFunds) {
          await deleteDoc(doc(db, 'supervisor_funds', f.id));
        }
        setActiveTab('dashboard');
      } catch (err) {
        console.error("Error wiping all data: ", err);
      } finally {
        setDbLoading(false);
      }
    }
  };


  // Dynamic Real-time Calculations for the construction Alert System
  const computedNotifications = useMemo(() => {
    const list: any[] = [];

    // 1. Approaching payroll alerts
    if (notificationSettings.payrollApproaching) {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0: Sunday, 6: Sat
      if (dayOfWeek >= 4) { // Thu, Fri, Sat
        list.push({
          id: 'notif-payroll-urgent',
          type: 'payroll',
          title: 'Urgent: Payroll Deadline',
          message: 'Weekly supervisor attendance logs and shift rates must be verified by Saturday EOD.',
          date: 'Daily Cycle',
          siteId: undefined,
        });
      } else {
        list.push({
          id: 'notif-payroll-info',
          type: 'payroll',
          title: 'Payroll Prep Cycle Active',
          message: 'Confirm active laborer roles and rates on active sites to prepare Saturday payroll.',
          date: 'Routine',
          siteId: undefined,
        });
      }
    }

    // 2. Overdue client billing payments
    if (notificationSettings.paymentOverdue) {
      sites.forEach(site => {
        const totalPaid = payments.filter(p => p.siteId === site.id).reduce((sum, p) => sum + p.amount, 0);
        const outstanding = site.projectValue - totalPaid;
        if (outstanding > 15000 && (site.status === 'active' || site.status === 'completed')) {
          list.push({
            id: `notif-bill-${site.id}`,
            type: 'payment_overdue',
            title: 'Overdue Client Payment Alert',
            message: `Outstanding contract billing of ₱${outstanding.toLocaleString()} is pending for ${site.name} (Client: ${site.clientName}).`,
            date: site.startDate,
            siteId: site.id,
          });
        }
      });
    }

    // 3. Exceeded predefined budget limit alerts
    if (notificationSettings.budgetThreshold) {
      sites.forEach(site => {
        const labor = attendance.filter(a => a.siteId === site.id).reduce((sum, a) => sum + a.wageEarned, 0);
        const supervisor = expenses.filter(e => e.siteId === site.id).reduce((sum, e) => sum + e.amount, 0);
        const spent = labor + supervisor;

        const percentageUsed = (spent / site.budgetLimit) * 100;
        if (percentageUsed >= notificationSettings.thresholdPercentage) {
          list.push({
            id: `notif-budget-${site.id}`,
            type: 'budget_threshold',
            title: 'Critical Site Budget Threshold Exceeded',
            message: `${site.name} has crossed ${percentageUsed.toFixed(0)}% of internal target spending limit (₱${spent.toLocaleString()} spent vs ₱${site.budgetLimit.toLocaleString()} limit).`,
            date: 'Today',
            siteId: site.id,
          });
        }
      });
    }

    // 4. Site supervisor log in alert
    if (notificationSettings.supervisorLogin) {
      if (currentRole === 'Admin') {
        // Find supervisor logins from the live activityLogs
        const supervisorLogins = activityLogs.filter(log => log.actionType === 'login' && log.userRole === 'Site Supervisor');
        supervisorLogins.slice(0, 15).forEach(log => {
          list.push({
            id: `notif-supervisor-login-${log.id}`,
            type: 'supervisor_login',
            title: 'Site Supervisor Logged In',
            message: log.actionDescription,
            date: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            siteId: log.siteId,
          });
        });
      } else if (currentRole === 'Site Supervisor') {
        const activeSiteObj = sites.find(s => s.id === assignedSiteId);
        list.push({
          id: 'notif-supervisor-login',
          type: 'supervisor_login',
          title: 'Site Supervisor Logged In',
          message: `Supervisor ${activeSiteObj?.supervisorName || 'Primary'} is active on "${activeSiteObj?.name || 'Assigned Site'}" with supervisor workspace clearance.`,
          date: 'Just Now',
          siteId: assignedSiteId,
        });
      }
    }

    // Role-based filtering to hide sensitive notifications
    return list.filter(n => {
      if (currentRole === 'Site Supervisor') {
        // Site Supervisors must not see overdue payment alerts (Client billing is confidential)
        if (n.type === 'payment_overdue') return false;
        // Site Supervisors must not see general payroll audit or calculation alerts
        if (n.type === 'payroll') return false;
        // Site Supervisors must only see notifications belonging to their assigned site
        if (n.siteId !== undefined && n.siteId !== assignedSiteId) return false;
      } else if (currentRole === 'Client') {
        // Clients must only see billing notifications for their own site
        if (n.siteId !== undefined && n.siteId !== assignedSiteId) return false;
        // Clients should never see payroll, internal budget, or supervisor activity alerts
        if (n.type === 'payroll' || n.type === 'budget_threshold' || n.type === 'supervisor_login') return false;
      }
      return true;
    });
  }, [sites, payments, attendance, expenses, notificationSettings, currentRole, assignedSiteId, activityLogs]);

  // Find how many notifications are currently unread by the user
  const unreadCount = computedNotifications.filter(n => !readNotifIds.includes(n.id)).length;

  const handleToggleReadNotif = (id: string) => {
    setReadNotifIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleMarkAllNotificationsRead = () => {
    const allIds = computedNotifications.map(n => n.id);
    setReadNotifIds(allIds);
  };

  if (dbLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-4 font-sans text-neutral-200">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-yellow-500/10 border-t-yellow-500 animate-spin" />
        </div>
        <p className="text-[10px] tracking-widest uppercase text-yellow-500 font-mono font-bold animate-pulse">Initializing Multi-Device DB Sync...</p>
      </div>
    );
  }

  // Mandatory Authentication Gate Check
  if (!isLoggedIn) {
    return (
      <LoginGateway
        sites={sites}
        adminPasscode={adminPasscode}
        onLoginSuccess={(role, siteId) => {
          setCurrentRole(role);
          setAssignedSiteId(siteId);
          setIsLoggedIn(true);
          localStorage.setItem('cs_is_logged_in', 'true');
          localStorage.setItem('cs_current_role', role);
          localStorage.setItem('cs_assigned_site_id', siteId);
          if (role === 'Site Supervisor') {
            setActiveTab('attendance');
          } else {
            setActiveTab('dashboard');
          }
          
          // Log supervisor or admin access to the real-time stream
          const assignedSiteName = sites.find(s => s.id === siteId)?.name || 'all portfolios';
          const supervisorName = sites.find(s => s.id === siteId)?.supervisorName || 'Representative';
          const logName = role === 'Site Supervisor' ? `Supervisor ${supervisorName}` : (role === 'Admin' ? 'Admin Contractor' : 'Client');
          const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 4)}`;
          const msg = role === 'Site Supervisor' 
            ? `Site supervisor logged in and accessed work desk for: "${assignedSiteName}"` 
            : `System administrator logged in and loaded the master control deck.`;
          setDoc(doc(db, 'activity_logs', logId), {
            id: logId,
            timestamp: new Date().toISOString(),
            userRole: role,
            siteId: siteId,
            userName: logName,
            actionType: 'login',
            actionDescription: msg
          }).catch(e => console.warn("Access logging failed", e));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100" id={mainId}>
      {/* GLOBAL BANNER HEADER */}
      <header className="sticky top-0 z-40 bg-black text-white shadow-md select-none print:hidden border-b border-yellow-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            
            {/* Title / Logo */}
            <div className="flex items-center gap-2 py-1">
              <RLLogo className="h-10 sm:h-11 w-auto" />
              <div className="hidden lg:block border-l border-neutral-800 pl-3 py-1 ml-1">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold block leading-tight">Field Supervisor Portal</span>
                <span className="text-[8px] text-yellow-500/80 font-mono block">v2.1 LIVE</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-0.5 items-center">
              {allowedTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      active
                        ? 'bg-neutral-800 text-yellow-400 border-l-2 md:border-l-0 md:border-b-2 border-yellow-400 text-white'
                        : 'text-slate-404 hover:text-white hover:bg-neutral-800/40'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-yellow-400' : 'text-slate-405'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Header Right Actions */}
            <div className="hidden md:flex items-center gap-2.5">
              {currentRole !== 'Client' && (
                <>
                  <button
                    onClick={handleWipeAllData}
                    className="p-1 px-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 hover:border-rose-700 rounded-md text-[9px] text-rose-300 hover:text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer animate-fade-in"
                    title="Erase all data and start with an empty clean database"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400 animate-pulse" />
                    Clear All Data
                  </button>
                  <button
                    onClick={handleDebugResetToDefault}
                    className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-md text-[9px] text-slate-300 hover:text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Reset database to template demo data"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset Demo
                  </button>
                </>
              )}

              {syncStatus !== 'idle' && (
                <div 
                  className={`flex items-center gap-1.5 text-[9px] py-0.5 px-2.5 rounded-full font-bold border ${
                    syncStatus === 'syncing' ? 'text-yellow-400 bg-yellow-950/40 border-yellow-800/40' :
                    syncStatus === 'synced' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' :
                    syncStatus === 'offline' ? 'text-rose-400 bg-rose-950/40 border-rose-800/40' :
                    'text-red-400 bg-red-950/40 border-red-800/40'
                  } transition-all`}
                  title={lastSyncedTime ? `Last synced to Google at ${lastSyncedTime}` : 'Google Workspace Sync Status'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' : syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span>{syncStatus === 'syncing' ? 'SYNCING...' : syncStatus === 'synced' ? 'GOOGLE SYNCED' : syncStatus === 'offline' ? 'OFFLINE' : 'SYNC ERROR'}</span>
                </div>
              )}

              <div className="flex items-center gap-1 text-[9px] text-emerald-405 bg-emerald-950/40 border border-emerald-900/50 py-0.5 px-2 rounded-full font-semibold">
                <ShieldCheck className="w-3 h-3" />
                ACTIVE
              </div>
            </div>

            {/* Mobile menu trigger button */}
            <div className="md:hidden flex items-center gap-1.5">
              {currentRole !== 'Client' && (
                <>
                  <button
                    onClick={handleWipeAllData}
                    className="p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-350 rounded-md text-xs flex items-center gap-1 cursor-pointer"
                    title="Wipe All Data"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                  </button>
                  <button
                    onClick={handleDebugResetToDefault}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-md text-slate-400 text-xs flex items-center gap-1 cursor-pointer"
                    title="Reset Demo"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline bg-transparent border-0 cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 px-3 pt-1.5 pb-3 space-y-1 block shadow-inner">
            {allowedTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left flex items-center gap-2 py-1.5 px-2.5 rounded-md text-xs font-semibold cursor-pointer ${
                    active ? 'bg-neutral-800 text-yellow-405 border-l-3 border-yellow-500' : 'text-slate-404 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* SUB-HEADER: SIMULATED ROLES & NOTIFICATIONS STATUS BAR */}
      <div className="bg-neutral-900 text-slate-200 border-b border-neutral-800 px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 text-xs select-none shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-yellow-400 font-bold uppercase tracking-wider text-[10px] select-none">
            <ShieldCheck className="w-3.5 h-3.5" />
            Security Mode:
          </span>
          <div className="flex items-center gap-2">
            {currentRole === 'Admin' ? (
              <select
                value={currentRole}
                onChange={(e) => {
                  const role = e.target.value as any;
                  setCurrentRole(role);
                  if (role === 'Client' && (activeTab === 'attendance' || activeTab === 'expenses')) {
                    setActiveTab('dashboard');
                  }
                }}
                className="bg-black text-white border border-neutral-800 rounded-md text-xs px-2.5 py-1 font-semibold cursor-pointer focus:outline-hidden focus:border-yellow-400"
              >
                <option value="Admin">🛡️ Admin (Universal Privilege)</option>
                <option value="Site Supervisor">👷 Site Supervisor Role</option>
                <option value="Client">💼 Client Partner View</option>
              </select>
            ) : (
              <span className="bg-black/40 border border-neutral-800 text-slate-350 px-2.5 py-1 rounded text-xs select-none font-bold uppercase tracking-wide">
                {currentRole === 'Site Supervisor' ? '👷 Site Supervisor' : '💼 Client View'}
              </span>
            )}

            <button
              onClick={handleLogout}
              className="bg-rose-950 hover:bg-rose-900 text-rose-350 hover:text-white border border-rose-900 py-1 px-2.5 rounded-lg text-[10px] font-extrabold uppercase transition-all tracking-wider cursor-pointer"
              title="Sign out from the dashboard session"
            >
              Sign Out
            </button>
          </div>

          {currentRole !== 'Admin' && (
            <div className="flex items-center gap-1.5 pl-2">
              <span className="text-slate-400 font-medium">Assigned Site:</span>
              <select
                value={assignedSiteId}
                onChange={(e) => setAssignedSiteId(e.target.value)}
                className="bg-black text-yellow-400 border border-neutral-800 rounded-md text-xs px-2 py-1 font-mono font-bold cursor-pointer focus:outline-hidden focus:border-yellow-400"
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Dynamic Warning Notification bell menu */}
        <div className="flex items-center gap-3">
          {currentRole === 'Admin' && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-1 px-2 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10.5px] font-extrabold text-yellow-400 uppercase tracking-wider border border-yellow-500/35 bg-neutral-950/50"
              title="Change Admin Passcode & Alerts"
            >
              <Settings className="w-3.5 h-3.5 animate-spin-once" />
              <span>Passcode & Settings</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-[10px] text-yellow-500 bg-neutral-950 border border-neutral-800 py-0.5 px-2 rounded-full font-bold uppercase tracking-wide">
            {currentRole === 'Admin' ? 'FULL ROOT PRIVILEGES' : `${currentRole.toUpperCase()} SCOPE`}
          </div>

          {/* Live Activity Stream Trigger Banner */}
          <div className="relative">
            <button
              onClick={() => {
                setShowActivityPanel(!showActivityPanel);
                setHasNewActivity(false);
              }}
              className="relative p-1 px-2 hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold text-slate-300"
              title="Supervisor Real-time Action Feeds"
            >
              <div className="relative">
                <Activity className={`w-3.5 h-3.5 ${hasNewActivity ? 'text-yellow-400 font-bold animate-pulse' : 'text-slate-300'}`} />
                {hasNewActivity && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 rounded-full w-1.5 h-1.5 animate-ping" />
                )}
              </div>
              <span className="hidden sm:inline">Activity Feed</span>
              {hasNewActivity && (
                <span className="ml-1 bg-yellow-400 text-black text-[8px] font-extrabold px-1 py-0.2 rounded-full scale-90">LIVE</span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Live Activity Dropdown Panel */}
            {showActivityPanel && (
              <div className="absolute right-0 mt-2 z-50 w-[360px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 font-sans">
                <div className="p-3 bg-black flex items-center justify-between border-b border-slate-800">
                  <span className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 text-yellow-400">
                    <Activity className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                    Real-Time Activity Stream
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-green-500/15 border border-green-500/30 text-green-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                      <span className="w-1 h-1 rounded-full bg-green-400" />
                      Live Feed
                    </span>
                    <button
                      onClick={() => setShowActivityPanel(false)}
                      className="text-xs text-neutral-400 hover:text-white font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-900 bg-slate-950 select-none">
                  {activityLogs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs font-mono">
                      Waiting for supervisor operations...
                    </div>
                  ) : (
                    activityLogs.map((log: any) => {
                      // Determine event icon or color
                      let actionColor = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                      let label = 'Log';
                      if (log.actionType === 'login') {
                        actionColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                        label = 'Access';
                      } else if (log.actionType === 'attendance') {
                        actionColor = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
                        label = 'Crew Mark';
                      } else if (log.actionType === 'expense') {
                        actionColor = 'bg-red-500/10 text-red-400 border border-red-500/20';
                        label = 'Expense';
                      } else if (log.actionType === 'loan') {
                        actionColor = 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
                        label = 'Loan';
                      } else if (log.actionType === 'receipt' || log.actionType === 'billing') {
                        actionColor = 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
                        label = 'Billing';
                      } else if (log.actionType === 'additional_scope') {
                        actionColor = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30';
                        label = 'Scope';
                      }

                      // Format timestamp helper inline
                      const formatDiff = () => {
                        const diff = Date.now() - new Date(log.timestamp).getTime();
                        if (diff < 5000) return 'Just Now';
                        const secs = Math.floor(diff / 1000);
                        if (secs < 60) return `${secs}s ago`;
                        const mins = Math.floor(secs / 60);
                        if (mins < 60) return `${mins}m ago`;
                        const hrs = Math.floor(mins / 60);
                        if (hrs < 24) return `${hrs}h ago`;
                        return new Date(log.timestamp).toLocaleDateString();
                      };

                      return (
                        <div key={log.id} className="p-3 hover:bg-slate-900/60 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-200 truncate max-w-[200px]">
                              {log.userName}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${actionColor}`}>
                                {label}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {formatDiff()}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                            {log.actionDescription}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Notifications Trigger Banner */}
          <div className="relative">
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative p-1 px-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold text-slate-300"
              title="Site Intelligence Alerts"
            >
              <div className="relative">
                <Bell className="w-3.5 h-3.5 text-slate-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full text-[8.5px] font-bold w-4 h-4 flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Alerts</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifPanel && (
              <div className="absolute right-0 mt-2 z-50 w-[310px] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800">
                <div className="p-3 bg-black text-white flex items-center justify-between border-b border-yellow-500">
                  <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5 text-yellow-405" />
                    Alert Stream ({unreadCount})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded animate-spin-once"
                      title="Alert Settings"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowNotifPanel(false)}
                      className="text-xs hover:text-slate-300 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                  {computedNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-405 text-xs">
                      No matching alerts triggered currently.
                    </div>
                  ) : (
                    computedNotifications.map((n) => {
                      const isRead = readNotifIds.includes(n.id);
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleToggleReadNotif(n.id)}
                          className={`p-3 text-[11px] hover:bg-slate-50 transition-colors cursor-pointer flex gap-2.5 items-start ${
                            !isRead ? 'bg-yellow-50/50 border-l-2 border-yellow-500' : ''
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {n.type === 'budget_threshold' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-505" />
                            ) : n.type === 'payment_overdue' ? (
                              <PhilippinePeso className="w-3.5 h-3.5 text-yellow-600" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            )}
                          </div>
                          
                          <div className="space-y-0.5 flex-1">
                            <span className="font-bold text-slate-900 block leading-tight">{n.title}</span>
                            <span className="text-slate-505 block leading-normal">{n.message}</span>
                            <span className="text-[10px] text-slate-400 font-medium block font-mono">{n.date}</span>
                          </div>

                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${!isRead ? 'bg-yellow-500' : 'bg-transparent'}`} />
                        </div>
                      );
                    })
                  )}
                </div>

                {computedNotifications.length > 0 && (
                  <div className="p-2 border-t bg-slate-50 flex items-center justify-between text-[10px] font-bold">
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      className="text-slate-600 hover:text-slate-950 px-2 py-1 hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                    <button
                      onClick={() => {
                        setReadNotifIds([]);
                      }}
                      className="text-slate-505 hover:text-slate-800 px-2 py-1 hover:underline cursor-pointer"
                    >
                      Reset status
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NOTIFICATION PREFERENCES SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div
            className="bg-white rounded-2xl w-full max-w-sm border border-slate-150 p-5 space-y-4 shadow-xl text-slate-950"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-slate-500" />
                Alert Preferences
              </span>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-705 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-705">
                <input
                  type="checkbox"
                  checked={notificationSettings.payrollApproaching}
                  onChange={(e) => setNotificationSettings((prev: any) => ({ ...prev, payrollApproaching: e.target.checked }))}
                  className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500 mt-0.5"
                />
                <div>
                  <span className="block text-slate-800">Payroll Deadlines</span>
                  <p className="text-[10px] font-normal text-slate-400">Trigger alerts when weekly supervisor payroll deadlines approach</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-705">
                <input
                  type="checkbox"
                  checked={notificationSettings.paymentOverdue}
                  onChange={(e) => setNotificationSettings((prev: any) => ({ ...prev, paymentOverdue: e.target.checked }))}
                  className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500 mt-0.5"
                />
                <div>
                  <span className="block text-slate-800">Unpaid Client Balances</span>
                  <p className="text-[10px] font-normal text-slate-400">Notify when project billings have outstanding value &gt; ₱15k</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-705">
                <input
                  type="checkbox"
                  checked={notificationSettings.budgetThreshold}
                  onChange={(e) => setNotificationSettings((prev: any) => ({ ...prev, budgetThreshold: e.target.checked }))}
                  className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500 mt-0.5"
                />
                <div>
                  <span className="block text-slate-800">Site Budget Exceedance Margins</span>
                  <p className="text-[10px] font-normal text-slate-400">Flag sites with internal target costs exceeding safety margins</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-705">
                <input
                  type="checkbox"
                  checked={notificationSettings.supervisorLogin}
                  onChange={(e) => setNotificationSettings((prev: any) => ({ ...prev, supervisorLogin: e.target.checked }))}
                  className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500 mt-0.5"
                />
                <div>
                  <span className="block text-slate-800">Site Supervisor Login Activity</span>
                  <p className="text-[10px] font-normal text-slate-400">Receive alerts when a site supervisor logs in or accesses the workspace</p>
                </div>
              </label>

              {notificationSettings.budgetThreshold && (
                <div className="space-y-1 block border-t pt-2.5">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex justify-between">
                    <span>Trigger Threshold Margin:</span>
                    <span className="text-yellow-600 font-mono">{notificationSettings.thresholdPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="120"
                    step="5"
                    value={notificationSettings.thresholdPercentage}
                    onChange={(e) => setNotificationSettings((prev: any) => ({ ...prev, thresholdPercentage: Number(e.target.value) }))}
                    className="w-full text-yellow-500 accent-yellow-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
                  />
                  <p className="text-[9px] text-slate-400">Notify when total costs exceed this % of internal budget limit.</p>
                </div>
              )}
            </div>

            {currentRole === 'Admin' && (
              <div className="border-t pt-3.5 space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 block">
                  🛡️ Administrator Passcode Settings
                </span>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 block">
                    Security Passcode PIN
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={10}
                      value={tempAdminCode}
                      onChange={(e) => setTempAdminCode(e.target.value)}
                      placeholder="e.g., 1111"
                      className="flex-1 bg-amber-50/20 border border-amber-200 focus:border-amber-500 font-mono font-bold text-sm rounded-lg px-2.5 py-1 text-slate-850 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (tempAdminCode.trim()) {
                          await handleUpdateAdminPasscode(tempAdminCode.trim());
                          setPasscodeSaved(true);
                          setTimeout(() => setPasscodeSaved(false), 2500);
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider rounded-lg px-3 py-1 cursor-pointer transition-colors"
                    >
                      Update
                    </button>
                  </div>
                  {passcodeSaved && (
                    <p className="text-[10px] text-emerald-600 font-bold animate-pulse mt-1">
                      ✓ Passcode updated & database synced!
                    </p>
                  )}
                </div>

                <div className="space-y-2.5 pt-2.5 border-t border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 block">
                    📂 Environment Data Mode
                  </span>
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={demoSeedingEnabled}
                      onChange={(e) => handleToggleSeeding(e.target.checked)}
                      className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500 mt-0.5"
                    />
                    <div>
                      <span className="block text-slate-800">Enable Demo Seeding</span>
                      <p className="text-[10px] font-normal text-slate-400">
                        When disabled (highly recommended), the database starts completely empty for production, ensuring no placeholder items are visible to you or your site supervisors.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {currentRole !== 'Client' && (
              <div className="border-t pt-3.5 space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-600 block">
                  🛠️ Developer & Supervisor Tools
                </span>
                <p className="text-[9px] text-slate-500 leading-snug">
                  Manage the shared database records. These operations affect all synced devices.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleWipeAllData}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-2.5 rounded-lg text-[10px] select-none transition-colors cursor-pointer flex items-center justify-center gap-1"
                    title="Clear All App Data"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Wipe Clean
                  </button>
                  <button
                    onClick={handleDebugResetToDefault}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 font-bold py-1.5 px-2.5 rounded-lg text-[10px] select-none transition-colors cursor-pointer flex items-center justify-center gap-1"
                    title="Load Default Demo Seeding"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Demo
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold py-2 rounded-xl text-xs select-none transition-colors cursor-pointer"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

      {/* CORE FRAME CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        
        {/* Dynamic renders on selected view tab */}
        {activeTab === 'dashboard' && (
          <Dashboard 
            sites={sites} 
            workers={workers} 
            attendance={attendance} 
            expenses={expenses} 
            payments={payments}
            onNavigate={navigateToSite}
            currentRole={currentRole}
            assignedSiteId={assignedSiteId}
            announcements={announcements}
            onSaveAnnouncements={handleSaveAnnouncements}
          />
        )}

        {activeTab === 'sites' && (
          <div className="space-y-4">
            {/* Sites view switcher segment */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 print:hidden overflow-x-auto scrollbar-none">
              <div className="bg-slate-200/60 p-1 rounded-xl flex min-w-max gap-1 border border-slate-200/80">
                <button
                  onClick={() => setSitesSubTab('manager')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sitesSubTab === 'manager'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Project Files & Field Ledger
                </button>
                <button
                  onClick={() => setSitesSubTab('billing')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sitesSubTab === 'billing'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Client Invoices & master billing
                </button>
                <button
                  onClick={() => setSitesSubTab('additionalScope')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sitesSubTab === 'additionalScope'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Approved Additional Scope
                </button>
              </div>
            </div>

            {sitesSubTab === 'manager' ? (
              <SitesManager
                sites={sites}
                attendance={attendance}
                expenses={expenses}
                payments={payments}
                onAddSite={handleAddSite}
                onUpdateSiteStatus={handleUpdateSiteStatus}
                onUpdateSite={handleUpdateSite}
                onAddClientPayment={handleAddClientPayment}
                onDeleteClientPayment={handleDeleteClientPayment}
                onUpdateClientPayment={handleUpdateClientPayment}
                onDeleteSite={handleDeleteSite}
                selectedSiteId={selectedSiteId}
                setSelectedSiteId={setSelectedSiteId}
                currentRole={currentRole}
                assignedSiteId={assignedSiteId}
                onDeleteExpense={handleDeleteExpense}
                receipts={receipts}
                onToggleReimburse={handleToggleReimbursed}
                additionalScopes={additionalScopes}
              />
            ) : sitesSubTab === 'billing' ? (
              <ClientBilling
                sites={sites}
                payments={payments}
                onAddClientPayment={handleAddClientPayment}
                onDeleteClientPayment={handleDeleteClientPayment}
                onUpdateClientPayment={handleUpdateClientPayment}
                currentRole={currentRole}
                assignedSiteId={assignedSiteId}
                receipts={receipts}
                onAddClientReceipt={handleAddClientReceipt}
                onDeleteClientReceipt={handleDeleteClientReceipt}
              />
            ) : (
              <AdditionalScopeTracker
                sites={sites}
                additionalScopes={additionalScopes}
                onAddAdditionalScope={handleAddAdditionalScope}
                onDeleteAdditionalScope={handleDeleteAdditionalScope}
                currentRole={currentRole}
                assignedSiteId={assignedSiteId}
              />
            )}
          </div>
        )}

        {activeTab === 'masterlist' && (
          <ProjectMasterlist
            sites={sites}
            payments={payments}
            attendance={attendance}
            expenses={expenses}
            workers={workers}
            additionalScopes={additionalScopes}
            onUpdateSite={handleUpdateSite}
          />
        )}

        {activeTab === 'estimation' && (
          <Estimation
            sites={sites}
            additionalScopes={additionalScopes}
          />
        )}

        {activeTab === 'drawings' && (
          <DrawingsLayout />
        )}

        {activeTab === 'workspace' && (
          <WorkspaceHub
            sites={sites}
            attendance={attendance}
            expenses={expenses}
            payments={payments}
            workers={workers}
            receipts={receipts}
            currentRole={currentRole}
          />
        )}

        {activeTab === 'profile' && (
          <CompanyProfile
            workers={workers}
            sites={sites}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendancePayroll
            workers={workers}
            sites={sites}
            attendance={attendance}
            onAddWorker={handleAddWorker}
            onUpdateWorker={handleUpdateWorker}
            onDeleteWorker={handleDeleteWorker}
            onUpdateAttendance={handleUpdateAttendance}
            onToggleWorkerActive={handleToggleWorkerActive}
            currentRole={currentRole}
            assignedSiteId={assignedSiteId}
            supervisorLoans={supervisorLoans}
            onAddSupervisorLoan={handleAddSupervisorLoan}
            onUpdateSupervisorLoan={handleUpdateSupervisorLoan}
            onDeleteSupervisorLoan={handleDeleteSupervisorLoan}
            workerLoans={workerLoans}
            onAddWorkerLoan={handleAddWorkerLoan}
            onUpdateWorkerLoan={handleUpdateWorkerLoan}
            onDeleteWorkerLoan={handleDeleteWorkerLoan}
          />
        )}

        {activeTab === 'expenses' && (
          <SupervisorExpenses
            expenses={expenses}
            sites={sites}
            onAddExpense={handleAddExpense}
            onToggleReimbursed={handleToggleReimbursed}
            onDeleteExpense={handleDeleteExpense}
            currentRole={currentRole}
            assignedSiteId={assignedSiteId}
            supervisorFunds={supervisorFunds}
            onAddSupervisorFund={handleAddSupervisorFund}
            onDeleteSupervisorFund={handleDeleteSupervisorFund}
          />
        )}

        {activeTab === 'reports' && (
          <Reports
            sites={sites}
            workers={workers}
            attendance={attendance}
            expenses={expenses}
            payments={payments}
            currentRole={currentRole}
            assignedSiteId={assignedSiteId}
          />
        )}

        {activeTab === 'recovery' && (
          <DataRecovery
            recycleBin={recycleBin}
            currentUserEmail="serranosheenamae23@gmail.com"
            onActivityLog={(type, desc) => logActivity(type as any, desc)}
          />
        )}

      </main>

      <footer className="bg-black text-slate-450 text-xs py-6 mt-12 border-t border-yellow-500 print:hidden select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4.5 h-4.5 text-yellow-400" />
            <span>© 2026 RL CONSTRUCTION Supervisor Hub. All Rights Reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 font-medium">
            <span>Offline-First Ledger Storage Enabled</span>
            <span>•</span>
            <span>Local Sync Active</span>
          </div>
        </div>
      </footer>

      {/* Real-time Dynamic Toast Notification popup */}
      {liveToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-950 border-2 border-yellow-500 rounded-2xl shadow-2xl p-4 text-slate-100 flex items-start gap-3 shadow-yellow-500/10 transition-all duration-300 transform translate-y-0 opacity-100">
          <div className="bg-yellow-500 text-black rounded-lg p-2 flex-shrink-0 animate-pulse">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-yellow-400">Live Workspace Action</span>
              <span className="text-[9px] text-slate-500">Just Now</span>
            </div>
            <h4 className="text-xs font-bold text-white mb-0.5 truncate">{liveToast.userName}</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-mono break-words">{liveToast.actionDescription}</p>
          </div>
          <button 
            onClick={() => setLiveToast(null)} 
            className="text-slate-400 hover:text-white text-xs font-bold px-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
