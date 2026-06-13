import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';

// Google Scopes needed for application
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive'
];

const provider = new GoogleAuthProvider();
GOOGLE_SCOPES.forEach(scope => provider.addScope(scope));

// Enable select account screen every time to avoid user lock-in
provider.setCustomParameters({
  prompt: 'select_account'
});

// Cache variables
let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Listen to Auth State Changes
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Retrieve persisted workspace token from localStorage if present
        const persistedToken = localStorage.getItem('cs_ws_access_token');
        if (persistedToken) {
          cachedAccessToken = persistedToken;
          if (onAuthSuccess) onAuthSuccess(user, persistedToken);
        } else {
          // If the user signed in but token was cleared, let standard flow trigger
          if (!isSigningIn) {
            if (onAuthFailure) onAuthFailure();
          }
        }
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('cs_ws_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google (retrieve credentials)
export const signInWithGoogleWorkspace = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth Access Token from sign-in response.');
    }
    cachedAccessToken = credential.accessToken;
    // Persist to localStorage to prevent automatic logout on page refreshes
    localStorage.setItem('cs_ws_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Workspace login error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Get current Access Token
export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken || localStorage.getItem('cs_ws_access_token');
};

// Sign out / Disconnect
export const disconnectGoogleWorkspace = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('cs_ws_access_token');
};

// Google Drive API: Create a Folder
export const createGoogleDriveFolder = async (token: string, folderName: string): Promise<string> => {
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Failed to create Google Drive folder: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.id;
};

// Google Drive API: List files in general or optionally filter by folder
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink?: string;
  createdTime: string;
  size?: string;
}

export const listGoogleDriveFiles = async (token: string, folderId?: string): Promise<GoogleDriveFile[]> => {
  let query = "trashed = false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  // we fetch files with fields required to show links and details
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&pageSize=30&fields=files(id,name,mimeType,webViewLink,iconLink,createdTime,size)`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Drive error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.files || [];
};

// Google Drive API: Multipart File Upload
export const uploadFileToGoogleDrive = async (
  token: string,
  fileName: string,
  content: string,
  mimeType: string = 'text/plain',
  parentId?: string
): Promise<{ id: string; webViewLink: string }> => {
  const boundary = 'RL_CONSTRUCTION_BOUNDARY_MULTIPART';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: parentId ? [parentId] : undefined,
  };

  const multipartBody = 
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Upload error: ${err.error?.message || response.statusText}`);
  }

  return response.json();
};

// Google Sheets API: Create and Populate tabular values
export const exportToGoogleSheets = async (
  token: string,
  spreadsheetTitle: string,
  headers: string[],
  rows: any[][]
): Promise<{ id: string; url: string }> => {
  // 1. Create empty spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: spreadsheetTitle
      }
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(`Sheets creation failure: ${err.error?.message || createRes.statusText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // 2. Populate values using Update API
  const range = 'Sheet1!A1';
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [headers, ...rows]
      })
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(`Sheets content feeding failure: ${err.error?.message || updateRes.statusText}`);
  }

  return { id: spreadsheetId, url: spreadsheetUrl };
};

// Google Sheets API: Sync or Update sheet in-place without duplicating file
export const syncSheetDataToGoogle = async (
  token: string,
  localStorageKey: string,
  title: string,
  headers: string[],
  rows: any[][],
  parentId?: string
): Promise<string> => {
  let spreadsheetId = localStorage.getItem(localStorageKey);
  
  if (spreadsheetId) {
    try {
      // 1. Clear existing workbook cells first to clean out previous legacy rows
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:Z5000:clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // 2. PUT latest rows
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: 'Sheet1!A1',
            majorDimension: 'ROWS',
            values: [headers, ...rows]
          })
        }
      );
      
      if (updateRes.ok) {
        return spreadsheetId;
      }
    } catch (e) {
      console.warn("Failed to update spreadsheet in-place, rewriting a fresh one", e);
    }
  }

  // Fallback to fresh sheets creation if it does not exist or was deleted
  const exportResult = await exportToGoogleSheets(token, title, headers, rows);
  localStorage.setItem(localStorageKey, exportResult.id);

  // If we have a folder ID, move the newly created file into the parent folder
  if (parentId) {
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${exportResult.id}?addParents=${parentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (e) {
      console.warn("Failed to set parent folder of new spreadsheet", e);
    }
  }

  return exportResult.id;
};

// Google Drive API: Update JSON Backup in-place or upload fresh version
export const syncBackupFileToGoogleDrive = async (
  token: string,
  fileName: string,
  content: string,
  parentId?: string
): Promise<string> => {
  const fileId = localStorage.getItem('cs_ws_backup_file_id');
  
  if (fileId) {
    try {
      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: content
      });
      
      if (response.ok) {
        return fileId;
      }
    } catch (e) {
      console.warn("Failed to patch drive file, uploading fresh backup", e);
    }
  }

  const result = await uploadFileToGoogleDrive(token, fileName, content, 'application/json', parentId);
  localStorage.setItem('cs_ws_backup_file_id', result.id);
  return result.id;
};

// Master Function to orchestrate live synchronization of all tables and backups
export const syncAllDataToWorkspace = async (
  token: string,
  data: {
    sites: any[];
    attendance: any[];
    expenses: any[];
    payments: any[];
    workers: any[];
    receipts: any[];
  },
  folderId?: string
) => {
  const folderToUse = folderId || localStorage.getItem('cs_ws_folder_id') || undefined;

  // 1. Prepare Portfolio Sheets
  const portfolioHeaders = ['Project ID', 'Construction Site', 'Location Scope', 'Supervisor In-Charge', 'Active Workers Count', 'Contract TC Price', 'Budget Expense Threshold', 'Project Schedule Progress', 'Current Health Status', 'Project Commencement Date'];
  const portfolioRows = data.sites.map(si => {
    const siteWorkers = data.workers.filter(w => w.assignedSiteId === si.id || w.assignedSiteIds?.includes(si.id)).length;
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

  // 2. Prepare Expenses Sheets
  const expenseHeaders = ['Voucher Reference ID', 'Date Logged', 'Construction Site', 'Cost Code Category', 'Description', 'Supervisor Accountable', 'Authorized Amount (PHP)', 'Payout Schedule Status', 'Internal Notes'];
  const expenseRows = data.expenses.map(ex => {
    const siteName = data.sites.find(s => s.id === ex.siteId)?.name || 'Multi-site General';
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

  // 3. Prepare Payroll/Wages Sheets
  const wageHeaders = ['Employee/Worker ID', 'Full Name', 'Designated Trade', 'Assigned Default Site', 'Total Days worked', 'Aggregated Wages Earned (PHP)', 'Contact Phone No', 'Hired Date Status'];
  const wageRows = data.workers.map(w => {
    const workerShifts = data.attendance.filter(at => at.workerId === w.id);
    const totalEarned = workerShifts.reduce((s, at) => s + (at.wageEarned || 0), 0);
    const daysJoined = workerShifts.filter(at => at.status !== 'Absent').length;
    const assignedSite = data.sites.find(s => s.id === w.assignedSiteId)?.name || 'Auxiliary Crew';
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

  // 4. Prepare Client Official Receipts Sheet
  const receiptsHeaders = ['e-Receipt No', 'Issue Date', 'Client / Payer Name', 'Allocated Site Project', 'Gross Received Amount (PHP)', 'Endorsement Method', 'Designated Milestone Objective', 'Authorized Receiver', 'Internal Notes'];
  const receiptsRows = data.receipts.map(rc => {
    const siteName = data.sites.find(s => s.id === rc.siteId)?.name || 'Direct Equity';
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

  // Trigger Sheet Sync in parallel for high speed
  const [portfolioId, expenseId, wageId, receiptId] = await Promise.all([
    syncSheetDataToGoogle(token, 'cs_sync_sheet_portfolio', 'RL_Sites_Master_Ledger', portfolioHeaders, portfolioRows, folderToUse),
    syncSheetDataToGoogle(token, 'cs_sync_sheet_expenses', 'RL_Expenses_Voucher_Ledger', expenseHeaders, expenseRows, folderToUse),
    syncSheetDataToGoogle(token, 'cs_sync_sheet_payroll', 'RL_Payroll_Daily_Wages', wageHeaders, wageRows, folderToUse),
    syncSheetDataToGoogle(token, 'cs_sync_sheet_receipts', 'RL_Client_Payments_Ledger', receiptsHeaders, receiptsRows, folderToUse)
  ]);

  // 5. Generate and sync the full combined JSON database Backup
  const backupObject = {
    backupTimestamp: new Date().toISOString(),
    ownerEmail: auth.currentUser?.email || 'N/A',
    databaseState: {
      sites: data.sites,
      attendance: data.attendance,
      expenses: data.expenses,
      payments: data.payments,
      workers: data.workers,
      receipts: data.receipts
    }
  };

  const backupId = await syncBackupFileToGoogleDrive(
    token,
    'RL_Construction_Data_Backup.json',
    JSON.stringify(backupObject, null, 2),
    folderToUse
  );

  return {
    portfolioId,
    expenseId,
    wageId,
    receiptId,
    backupId,
    folderId: folderToUse
  };
};

