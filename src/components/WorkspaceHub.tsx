import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Database, 
  FileSpreadsheet, 
  FileUp, 
  FolderOpen, 
  HelpCircle, 
  LogOut, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Loader2, 
  ArrowUpRight,
  FolderPlus,
  FileCheck2,
  Lock
} from 'lucide-react';
import { 
  initWorkspaceAuth, 
  signInWithGoogleWorkspace, 
  disconnectGoogleWorkspace,
  exportToGoogleSheets,
  createGoogleDriveFolder,
  listGoogleDriveFiles,
  uploadFileToGoogleDrive,
  GoogleDriveFile
} from '../lib/workspace';
import { ConstructionSite, AttendanceRecord, ExpenseRecord, ClientPayment, Worker, ClientReceipt, UserRole } from '../types';

interface WorkspaceHubProps {
  sites: ConstructionSite[];
  attendance: AttendanceRecord[];
  expenses: ExpenseRecord[];
  payments: ClientPayment[];
  workers: Worker[];
  receipts: ClientReceipt[];
  currentRole: UserRole;
}

export default function WorkspaceHub({
  sites,
  attendance,
  expenses,
  payments,
  workers,
  receipts,
  currentRole
}: WorkspaceHubProps) {
  // Authentication status states
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Google Drive & Sheets interaction states
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [workspaceFolderId, setWorkspaceFolderId] = useState<string | null>(() => {
    return localStorage.getItem('cs_ws_folder_id');
  });
  
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exportingSheetType, setExportingSheetType] = useState<string | null>(null);
  
  // Custom file creation state
  const [uploadFileName, setUploadFileName] = useState('site_blueprint_report_memo.txt');
  const [uploadFileContent, setUploadFileContent] = useState('Project Layout: \nRL Construction site fit-out specifications...');
  const [uploadFileType, setUploadFileType] = useState('text/plain');

  // Status feedback alerts
  const [alert, setAlert] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    url?: string;
    urlLabel?: string;
  } | null>(null);

  // Auto load auth status
  useEffect(() => {
    const unsubscribe = initWorkspaceAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAlert({
          message: `Connected successfully as ${currentUser.email || 'Google User'}. APIs initialized.`,
          type: 'success'
        });
        loadFiles(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch file directory from Google Drive
  const loadFiles = async (currentTok?: string | null) => {
    const activeToken = currentTok || token;
    if (!activeToken) return;
    setLoadingFiles(true);
    try {
      // Load within Workspace folder if available, else general files
      const files = await listGoogleDriveFiles(activeToken, workspaceFolderId || undefined);
      setDriveFiles(files);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Run Login Flow
  const handleSignIn = async () => {
    setIsConnecting(true);
    setAlert(null);
    try {
      const res = await signInWithGoogleWorkspace();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setAlert({
          message: `OAuth successfully authorized. Google Drive and Google Sheets access tokens ready.`,
          type: 'success'
        });
        // Query files
        loadFiles(res.accessToken);
      }
    } catch (err: any) {
      setAlert({
        message: `Sign in connection declined: ${err.message || 'Verification rejected.'}`,
        type: 'error'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Run Sign Out Flow
  const handleDisconnect = async () => {
    try {
      await disconnectGoogleWorkspace();
      setUser(null);
      setToken(null);
      setDriveFiles([]);
      setAlert({
        message: 'Google Cloud Workspace connection revoked successfully.',
        type: 'info'
      });
    } catch (err: any) {
      setAlert({
        message: `Failed to disconnect cleanly: ${err.message}`,
        type: 'error'
      });
    }
  };

  // Format monetary currency standard
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(val);
  };

  // Google Sheets exports definitions
  const handleExportSheets = async (type: 'portfolio' | 'vouchers' | 'payroll' | 'receipts') => {
    if (!token) {
      setAlert({ message: 'Authentication required. Click the "Sign in with Google" button above.', type: 'error' });
      return;
    }
    
    setExportingSheetType(type);
    setAlert(null);
    
    try {
      let title = '';
      let headers: string[] = [];
      let rows: any[][] = [];

      if (type === 'portfolio') {
        title = `RL_Construction_Portfolio_Master_${new Date().toISOString().split('T')[0]}`;
        headers = ['Project ID', 'Construction Site', 'Location Scope', 'Supervisor In-Charge', 'Active Workers Count', 'Contract TC Price', 'Budget Expense Threshold', 'Project Schedule Progress', 'Current Health Status', 'Project Commencement Date'];
        rows = sites.map(si => {
          const siteWorkers = workers.filter(w => w.assignedSiteId === si.id || w.assignedSiteIds?.includes(si.id)).length;
          return [
            si.id,
            si.name,
            si.location,
            si.supervisorName,
            siteWorkers,
            si.projectValue,
            si.budgetLimit,
            `${si.progress || 0}%`,
            si.status.toUpperCase(),
            si.startDate
          ];
        });
      } else if (type === 'vouchers') {
        title = `RL_Construction_Vouchers_Expense_Ledger_${new Date().toISOString().split('T')[0]}`;
        headers = ['Voucher Reference ID', 'Date Logged', 'Construction Site', 'Cost Code Category', 'Description', 'Supervisor Accountable', 'Authorized Amount (PHP)', 'Payout Schedule Status', 'Internal Notes'];
        rows = expenses.map(ex => {
          const siteName = sites.find(s => s.id === ex.siteId)?.name || 'Multi-site General';
          return [
            ex.id,
            ex.date,
            siteName,
            ex.category,
            ex.description,
            ex.supervisorName,
            ex.amount,
            ex.reimbursed ? 'VERIFIED & SETTLED' : 'PENDING AUDIT',
            'Field Voucher Log'
          ];
        });
      } else if (type === 'payroll') {
        title = `RL_Construction_Daily_Wages_Payroll_${new Date().toISOString().split('T')[0]}`;
        headers = ['Employee/Worker ID', 'Full Name', 'Designated Trade', 'Assigned Default Site', 'Total Days worked', 'Aggregated Wages Earned (PHP)', 'Contact Phone No', 'Hired Date Status'];
        
        // aggregate attendance per worker
        rows = workers.map(w => {
          const workerShifts = attendance.filter(at => at.workerId === w.id);
          const totalEarned = workerShifts.reduce((s, at) => s + (at.wageEarned || 0), 0);
          const daysJoined = workerShifts.filter(at => at.status !== 'Absent').length;
          const assignedSite = sites.find(s => s.id === w.assignedSiteId)?.name || 'Auxiliary Crew';
          return [
            w.id,
            w.name,
            w.role,
            assignedSite,
            daysJoined,
            totalEarned,
            w.phone || 'N/A',
            w.dateHired || 'N/A'
          ];
        });
      } else if (type === 'receipts') {
        title = `RL_Construction_Client_EReceipts_Log_${new Date().toISOString().split('T')[0]}`;
        headers = ['e-Receipt No', 'Issue Date', 'Client / Payer Name', 'Allocated Site Project', 'Gross Received Amount (PHP)', 'Endorsement Method', 'Designated Milestone Objective', 'Authorized Receiver', 'Internal Notes'];
        rows = receipts.map(rc => {
          const siteName = sites.find(s => s.id === rc.siteId)?.name || 'Direct Equity';
          return [
            rc.receiptNumber,
            rc.date,
            rc.clientName,
            siteName,
            rc.amount,
            rc.paymentMethod,
            rc.milestoneAndPurpose,
            rc.receivedBy,
            rc.notes || 'Proceeds cleared'
          ];
        });
      }

      const sheetInfo = await exportToGoogleSheets(token, title, headers, rows);
      setAlert({
        message: `Successfully generated Google Sheet: "${title}" in your Google Drive!`,
        type: 'success',
        url: sheetInfo.url,
        urlLabel: 'Open Google Sheet'
      });
      loadFiles(token);
    } catch (err: any) {
      setAlert({
        message: `Failed to export sheet data: ${err.message || err}`,
        type: 'error'
      });
    } finally {
      setExportingSheetType(null);
    }
  };

  // Initialize designated folder in Drive
  const handleCreateSuiteFolder = async () => {
    if (!token) return;
    setCreatingFolder(true);
    setAlert(null);
    try {
      const folderId = await createGoogleDriveFolder(token, 'RL Construction Suite Folders');
      setWorkspaceFolderId(folderId);
      localStorage.setItem('cs_ws_folder_id', folderId);
      setAlert({
        message: 'Dedicated "RL Construction Suite Folders" successfully provisioned in Google Drive to hold your corporate exports.',
        type: 'success'
      });
      loadFiles(token);
    } catch (err: any) {
      setAlert({
        message: `Folder creation error: ${err.message || err}`,
        type: 'error'
      });
    } finally {
      setCreatingFolder(false);
    }
  };

  // Upload custom formatted doc or template blueprint file
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setAlert({ message: 'Authorization required.', type: 'error' });
      return;
    }
    setUploading(true);
    setAlert(null);
    try {
      const result = await uploadFileToGoogleDrive(
        token, 
        uploadFileName, 
        uploadFileContent, 
        uploadFileType, 
        workspaceFolderId || undefined
      );
      setAlert({
        message: `Successfully uploaded "${uploadFileName}" to Google Drive in multipart format!`,
        type: 'success',
        url: result.webViewLink,
        urlLabel: 'View in Drive'
      });
      
      // Clear values & refresh
      setUploadFileName('site_blueprint_report_memo.txt');
      setUploadFileContent('Project Layout: \nRL Construction site fit-out specifications...');
      loadFiles(token);
    } catch (err: any) {
      setAlert({
        message: `Upload error: ${err.message || err}`,
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Title Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-150 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Cloud className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Google Workspace Sync Station</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-normal">
            Securely link your Google Workspace account with permission to automatically generate spreadsheets on Google Sheets and orchestrate blueprint archives dynamically on Google Drive.
          </p>
        </div>

        <div>
          {!user ? (
            <button
              onClick={handleSignIn}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <svg className="w-4 h-4 text-white fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.74 0 3.3.64 4.5 1.725l2.435-2.435C17.655 1.8 15.135 1 12.24 1c-5.522 0-10 4.478-10 10s4.478 10 10 10c5.783 0 9.6-4.065 9.6-9.765 0-.64-.06-1.28-.182-1.95H12.24z"/>
                </svg>
              )}
              <span>Connect Google Account</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-xl">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-7 h-7 rounded-full border border-slate-300" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                    {user.email ? user.email[0] : 'G'}
                  </div>
                )}
                <div className="text-left leading-none">
                  <p className="text-[11px] font-bold text-slate-800">{user.displayName || 'OAuth Account'}</p>
                  <p className="text-[9px] text-slate-450 mt-0.5 leading-none">{user.email || 'Authorised Client'}</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                title="Disconnect Workspace Auth"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alert Feedback Banner */}
      {alert && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold ${
          alert.type === 'success' ? 'bg-emerald-50/55 border-emerald-150 text-emerald-800' :
          alert.type === 'error' ? 'bg-rose-50/50 border-rose-150 text-rose-800' :
          'bg-indigo-50/40 border-indigo-150 text-indigo-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{alert.message}</span>
          </div>
          {alert.url && (
            <a
              href={alert.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-slate-350 text-slate-800 rounded font-bold transition-all shadow-2xs shrink-0 self-start sm:self-center"
            >
              <span>{alert.urlLabel || 'Open Link'}</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500" />
            </a>
          )}
        </div>
      )}

      {/* If not connected, present a beautiful onboarding dashboard */}
      {!user && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4 shadow-3xs">
          <Database className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">Synchronization Offline</h3>
            <p className="text-xs text-slate-450 leading-relaxed max-w-sm mx-auto">
              Please click the authorization trigger button above to log into your Google workspace. Once authenticated, we will provision a direct live-mesh syncing bridge!
            </p>
          </div>
          <div className="flex items-center justify-center p-2.5 bg-yellow-50 text-yellow-800 text-[10px] rounded-lg max-w-xs mx-auto border border-yellow-150 font-bold">
            <Lock className="w-3.5 h-3.5 mr-1.5 text-yellow-600 shrink-0" />
            Tokens are retained in-memory only & conform to high-security standards.
          </div>
        </div>
      )}

      {user && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Google Sheets Panel */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-150 shadow-3xs flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Live Syncing Spreadsheet Generators
                </h3>
                <p className="text-[10px] text-slate-400">Instantly generate structured workbooks on Google Sheets</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Option 1: Projects Masterlist */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 hover:bg-slate-100/30 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-widest leading-none block w-fit">Projects portfolio</span>
                  <h4 className="font-bold text-slate-800 text-[11.5px] leading-tight">Project Sites Master List</h4>
                  <p className="text-[10px] text-slate-450 leading-normal">
                    Exports all construction active sites, contract values, target budgets, completion progress percentages, and current statuses.
                  </p>
                </div>
                <button
                  onClick={() => handleExportSheets('portfolio')}
                  disabled={exportingSheetType !== null}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-[10.5px] font-extrabold uppercase rounded-lg transition-colors cursor-pointer"
                >
                  {exportingSheetType === 'portfolio' ? (
                    <Loader2 className="w-3 h-3 animate-spin text-white" />
                  ) : (
                    <FileCheck2 className="w-3.5 h-3.5" />
                  )}
                  <span>Export Projects Portfolio</span>
                </button>
              </div>

              {/* Option 2: Supervisor Expenses Ledger */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 hover:bg-slate-100/30 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-widest leading-none block w-fit">Expenses statement</span>
                  <h4 className="font-bold text-slate-800 text-[11.5px] leading-tight">Supervisor Expenses ledger</h4>
                  <p className="text-[10px] text-slate-450 leading-normal">
                    Funnels supervisor personal petty cash claim vouchers, descriptions, dates, amounts, categories, and verification tags.
                  </p>
                </div>
                <button
                  onClick={() => handleExportSheets('vouchers')}
                  disabled={exportingSheetType !== null}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-[10.5px] font-extrabold uppercase rounded-lg transition-colors cursor-pointer"
                >
                  {exportingSheetType === 'vouchers' ? (
                    <Loader2 className="w-3 h-3 animate-spin text-white" />
                  ) : (
                    <FileCheck2 className="w-3.5 h-3.5" />
                  )}
                  <span>Export Expense Ledger</span>
                </button>
              </div>

              {/* Option 3: Employee Attendance & Payroll */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 hover:bg-slate-100/30 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-widest leading-none block w-fit">Payroll stats</span>
                  <h4 className="font-bold text-slate-800 text-[11.5px] leading-tight">Crew Attendance & Wages</h4>
                  <p className="text-[10px] text-slate-450 leading-normal">
                    Compiles worker designations, days worked, daily wage rates, total aggregate wages earned, phone numbers, and hiring status logs.
                  </p>
                </div>
                <button
                  onClick={() => handleExportSheets('payroll')}
                  disabled={exportingSheetType !== null}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-[10.5px] font-extrabold uppercase rounded-lg transition-colors cursor-pointer"
                >
                  {exportingSheetType === 'payroll' ? (
                    <Loader2 className="w-3 h-3 animate-spin text-white" />
                  ) : (
                    <FileCheck2 className="w-3.5 h-3.5" />
                  )}
                  <span>Export Attendance Sheets</span>
                </button>
              </div>

              {/* Option 4: Client Official E-Receipts Registry */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 hover:bg-slate-100/30 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-widest leading-none block w-fit">Official e-receipts</span>
                  <h4 className="font-bold text-slate-800 text-[11.5px] leading-tight">Official Client Receipts Log</h4>
                  <p className="text-[10px] text-slate-450 leading-normal">
                    Pulls client payment logs, receipt numbers, dates, payment methods, target milestones, and authorized company receivers.
                  </p>
                </div>
                <button
                  onClick={() => handleExportSheets('receipts')}
                  disabled={exportingSheetType !== null}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-[10.5px] font-extrabold uppercase rounded-lg transition-colors cursor-pointer"
                >
                  {exportingSheetType === 'receipts' ? (
                    <Loader2 className="w-3 h-3 animate-spin text-white" />
                  ) : (
                    <FileCheck2 className="w-3.5 h-3.5" />
                  )}
                  <span>Export Client Receipts Ledger</span>
                </button>
              </div>

            </div>
          </div>

          {/* Right Column: Google Drive Panel & Blueprint Drawer */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Folder Setup & File List */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-3xs flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-indigo-600" />
                    Google Drive Blueprint Vault
                  </h3>
                  <p className="text-[10px] text-slate-400">Manage, organize, and inspect uploaded workspace materials</p>
                </div>
                
                <button 
                  onClick={() => loadFiles()} 
                  disabled={loadingFiles}
                  className="p-1 hover:bg-slate-100 text-slate-500 rounded transition-colors cursor-pointer"
                  title="List and audit recent Drive entries"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
              </div>

              {/* Workspace Folder Setup Section */}
              {!workspaceFolderId ? (
                <div className="p-3.5 bg-yellow-50 text-indigo-950 rounded-xl border border-yellow-150 flex flex-col sm:flex-row items-center gap-3">
                  <div className="text-left space-y-1 flex-1">
                    <p className="text-[10.5px] font-bold text-yellow-805 uppercase tracking-wide leading-none">Clean Structuring Recommended</p>
                    <p className="text-[9.5px] text-slate-600 leading-normal">
                      Establish a dedicated Google Drive folder specifically titled <strong className="text-slate-800">&quot;RL Construction Suite Folders&quot;</strong> to bundle workbooks clean of clutter.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateSuiteFolder}
                    disabled={creatingFolder}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    {creatingFolder ? (
                      <Loader2 className="w-3 h-3 animate-spin text-white" />
                    ) : (
                      <FolderPlus className="w-3.5 h-3.5" />
                    )}
                    <span>Init Suite Folder</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[10px] text-emerald-800 flex items-center justify-between font-mono">
                  <span>✓ Dedicated Folder Active: {workspaceFolderId}</span>
                  <button
                    onClick={() => {
                      localStorage.removeItem('cs_ws_folder_id');
                      setWorkspaceFolderId(null);
                    }}
                    className="text-[9px] underline hover:text-rose-600 cursor-pointer font-bold uppercase"
                  >
                    Reset Link
                  </button>
                </div>
              )}

              {/* Files Log Scroll */}
              <div className="max-h-[170px] overflow-y-auto space-y-1.5 pr-1.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block leading-none">Drive Directory Log ({driveFiles.length})</span>
                
                {loadingFiles ? (
                  <div className="h-28 flex items-center justify-center text-xs text-slate-500 font-semibold gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    Loading file hierarchy...
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="h-28 flex flex-col items-center justify-center text-center text-slate-400 text-[11px] p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Cloud className="w-6 h-6 text-slate-300 mb-1 stroke-1" />
                    No logged documents found under this workspace scope. Use spreadsheet creation or file uploading below.
                  </div>
                ) : (
                  driveFiles.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100 hover:bg-slate-100/50 transition-colors text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {f.iconLink ? (
                          <img src={f.iconLink} alt="" className="w-3.5 h-3.5 shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded bg-slate-200" />
                        )}
                        <span className="font-semibold text-slate-750 truncate max-w-[170px]" title={f.name}>{f.name}</span>
                      </div>
                      <a
                        href={f.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-slate-200 text-indigo-600 rounded transition-all inline-flex items-center"
                        title="Open file in a new tab"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upload Document / Memo Form */}
            <form onSubmit={handleUploadFile} className="bg-white p-5 rounded-2xl border border-slate-150 shadow-3xs flex flex-col space-y-3">
              <div className="pb-1 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-indigo-600" />
                  Save Drawing Memo to Google Drive
                </h3>
                <p className="text-[10px] text-slate-400">Publish blueprint specifications, layout coordinates or reports directly</p>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-650">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wide text-slate-450 block">File Name *</label>
                  <input
                    type="text"
                    required
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    placeholder="site_blueprint_report_memo.txt"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs select-auto focus:bg-white focus:outline-indigo-600 focus:border-indigo-600 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wide text-slate-450 block">Document Body Contents *</label>
                  <textarea
                    required
                    rows={3}
                    value={uploadFileContent}
                    onChange={(e) => setUploadFileContent(e.target.value)}
                    placeholder="Enter specs, drawing coordinates, estimates..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-indigo-600 focus:border-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[10.5px] font-extrabold uppercase rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <FileUp className="w-3.5 h-3.5" />
                  )}
                  <span>Publish Document to Drive</span>
                </button>
              </div>
            </form>

          </div>

        </div>
      )}

    </div>
  );
}
