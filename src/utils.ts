/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConstructionSite, Worker, AttendanceRecord, ExpenseRecord, ClientPayment } from './types';

// Labor Cost per site (Sum of wages earned from attendance records)
export function getSiteLaborCost(siteId: string, attendance: AttendanceRecord[]): number {
  return attendance
    .filter((record) => record.siteId === siteId)
    .reduce((sum, record) => sum + record.wageEarned, 0);
}

// Supervisor Expense Cost per site
export function getSiteSupervisorCost(siteId: string, expenses: ExpenseRecord[]): number {
  return expenses
    .filter((record) => record.siteId === siteId)
    .reduce((sum, record) => sum + record.amount, 0);
}

// Total expenses (Labor + Supervisor) for a site
export function getSiteTotalCost(siteId: string, attendance: AttendanceRecord[], expenses: ExpenseRecord[]): number {
  return getSiteLaborCost(siteId, attendance) + getSiteSupervisorCost(siteId, expenses);
}

// Total payments received from client per site
export function getSiteClientPayments(siteId: string, payments: ClientPayment[]): number {
  return payments
    .filter((payment) => payment.siteId === siteId)
    .reduce((sum, payment) => sum + payment.amount, 0);
}

// Outstanding payment due from client
export function getSiteClientBalance(site: ConstructionSite, payments: ClientPayment[]): number {
  const totalPaid = getSiteClientPayments(site.id, payments);
  return Math.max(0, site.projectValue - totalPaid);
}

// Format numbers as currency style (e.g. ₱1,240.50)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format numbers as currency style for PDF export, avoiding Unicode character glitches (e.g. Php 1,240.00 or -Php 1,240.00)
export function formatPDFCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formattedVal = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absVal);
  return isNegative ? `-Php ${formattedVal}` : `Php ${formattedVal}`;
}

