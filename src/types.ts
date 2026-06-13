/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConstructionSite {
  id: string;
  name: string;
  location: string;
  supervisorName: string;
  projectValue: number; // Agreed contract value from client
  budgetLimit: number;  // Internal target expense budget
  clientName: string;
  clientPhone: string;
  clientEmail?: string;  // Added client contact email
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  startDate: string;
  endDate?: string;      // Added project target completion/end date
  progress?: number;     // 0-100% completion progress
  progressReport?: string; // Narrative field status update
  supervisorPasscode?: string; // Passcode created by admin
  commissionAmount?: number;   // Custom referral fee commission (for personnel that refer)
  commissionPersonnel?: string; // Name of referrer personnel
}

export interface Worker {
  id: string;
  name: string;
  role: 'Mason' | 'Laborer' | 'Carpenter' | 'Welder' | 'Electrician' | 'Operator' | 'Supervisor' | 'Foreman' | 'Admin' | 'Secretary' | 'Intern' | 'Skilled Worker';
  dailyRate: number; // Daily wage in PHP (default/common construction rate)
  assignedSiteId: string; // Current default construction site
  assignedSiteIds?: string[]; // Multiple sites managed by site supervisors
  phone: string;
  active: boolean;
  status?: 'active' | 'terminated' | 'awol';
  overtimeHours?: number;
  customDays?: number;
  cashAdvance?: number;
  loanPayment?: number;
  corpo?: number;
  cashbond?: number;
  uniformSafetyShoes?: number;
  transportationLoan?: number;

  // New 201 File attributes:
  address?: string;
  birthday?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  dateHired?: string;
  employmentStatus?: 'Regular' | 'Probationary' | 'Project-based' | 'Intern' | 'Contractor';
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  workerId: string;
  siteId: string;
  status: 'Present' | 'Absent' | 'Half-Day';
  wageEarned: number; // Stored wage for that day, calculated as dailyRate * multiplier (1 or 0 or 0.5)
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  siteId: string;
  supervisorName: string;
  category: 'Fuel' | 'Tea & Meals' | 'Urgent Material' | 'Small Tools' | 'Local Transport' | 'Worker Advance' | 'Material Allowance' | 'Site Supervisor Fund' | 'Consolidated Expense' | 'Other';
  description: string;
  amount: number;
  paymentMethod: 'Petty Cash' | 'Supervisor Card' | 'Supervisor Personal Out-of-pocket';
  reimbursed: boolean;
}

export interface MilestoneExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  supervisorName: string;
}

export interface ClientPayment {
  id: string;
  date: string; // YYYY-MM-DD
  siteId: string;
  amount: number;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Cheque' | 'Other';
  milestone: string; // Description of milestone e.g. "Foundation Complete", "First Floor Slab", etc.
  notes?: string;
  photos?: string[]; // Array of base64 images/urls
  expenses?: MilestoneExpense[]; // Supervisor milestone expenses logged directly inside this milestone
  
  // Custom billing & invoicing tracking fields
  billingReference?: string; // e.g. Billing Statement #01, #02
  billingStage?: 'Down Payment' | 'Progress Billing' | 'Variation Order' | 'Retention Release';
  status?: 'Draft' | 'Pending Approval' | 'Partially Paid' | 'Paid in Full' | 'Overdue';
  accomplishmentRate?: number; // e.g. 25, 50, 75 (% completed)
  taxRate?: number; // e.g. 12 (%)
  withholdingRate?: number; // e.g. 5 (%)
  grossAmount?: number;
  taxAmount?: number;
  withholdingAmount?: number;
  attachments?: { name: string; size: string; data: string; dateUploaded: string }[];
}

export type UserRole = 'Admin' | 'Site Supervisor' | 'Client' | 'Secretary';

export interface AppNotification {
  id: string;
  type: 'payroll' | 'payment_overdue' | 'budget_threshold' | 'supervisor_login';
  title: string;
  message: string;
  date: string;
  siteId?: string;
  read: boolean;
}

export interface NotificationSettings {
  payrollApproaching: boolean;
  paymentOverdue: boolean;
  budgetThreshold: boolean;
  thresholdPercentage: number; // e.g. 80, 90, 100 for percentage
  supervisorLogin: boolean;
}

export interface SupervisorFund {
  id: string;
  date: string; // YYYY-MM-DD
  siteId: string;
  supervisorName: string;
  amount: number;
  notes?: string;
  givenBy: string; // "Admin", "HR", "Boss", etc.
}

export interface ClientReceipt {
  id: string;
  receiptNumber: string; // e.g. REC-2026-001
  date: string; // YYYY-MM-DD
  siteId: string;
  clientName: string;
  amount: number;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Cheque' | 'GCash' | 'Maya' | 'Other';
  milestoneAndPurpose: string;
  receivedBy: string;
  notes?: string;
  issuedAt?: string;
}

export interface SupervisorLoanPayment {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: 'Cash' | 'Cheque' | 'Salary Deduction' | 'GCash' | 'Maya' | 'Other';
  reference?: string;
  receivedBy?: string;
  notes?: string;
  isConsolidated?: boolean;
  consoStartDate?: string;
  consoEndDate?: string;
  numPaymentsMade?: number;
}

export interface SupervisorLoan {
  id: string;
  supervisorId: string;
  supervisorName: string;
  siteId: string;
  totalAmount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  payments: SupervisorLoanPayment[];
}

export interface WorkerLoanPayment {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: 'Cash' | 'Cheque' | 'Salary Deduction' | 'GCash' | 'Maya' | 'Other';
  reference?: string;
  receivedBy?: string;
  notes?: string;
  isConsolidated?: boolean;
  consoStartDate?: string;
  consoEndDate?: string;
  numPaymentsMade?: number;
}

export interface WorkerLoan {
  id: string;
  workerId: string;
  workerName: string;
  siteId: string;
  totalAmount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  payments: WorkerLoanPayment[];
}

export interface AdditionalScopeItem {
  id: string;
  siteId: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  approvedBy?: string;
  notes?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  category: 'General' | 'Urgent' | 'Staff' | 'Payroll' | 'Holiday' | 'Safety';
  pinned?: boolean;
  createdBy?: string;
}

export interface ProgressActivity {
  activity: string;
  comments: string;
  photos?: string;
}

export interface ProgressDelay {
  description: string;
  dateTime: string;
  photos?: string;
}

export interface ProgressDesignIssue {
  description: string;
  location: string;
  drawing: string;
  photos?: string;
}

export interface ProgressHistoryEntry {
  date: string;
  progressPercent: number;
}

export interface SiteProgressReport {
  id: string;
  siteId: string;
  formNumber: string;
  organisation: string;
  project: string;
  team: string;
  templateId: string;
  templateVersion: string;
  formCreated: string;
  startDate: string;
  endDate: string;
  worksCompletedDesc: string;
  progressPercent: number;
  activities: ProgressActivity[];
  delays: ProgressDelay[];
  designIssues: ProgressDesignIssue[];
  managerComments: string;
  managerName: string;
  signatureData?: string;
  history: ProgressHistoryEntry[];
}


