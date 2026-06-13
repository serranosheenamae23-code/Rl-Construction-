/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, 
  Building2, 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  Download, 
  Upload, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight, 
  Percent, 
  ShieldAlert, 
  Sparkles,
  PhilippinePeso,
  ChevronRight,
  FileSpreadsheet,
  X,
  CreditCard,
  FileCheck2,
  Paperclip,
  Edit,
  Eye
} from 'lucide-react';
import { ConstructionSite, ClientPayment, UserRole, ClientReceipt } from '../types';
import { formatCurrency, formatPDFCurrency } from '../utils';
import { jsPDF } from 'jspdf';

interface ClientBillingProps {
  sites: ConstructionSite[];
  payments: ClientPayment[];
  onAddClientPayment: (payment: Omit<ClientPayment, 'id'>) => void;
  onDeleteClientPayment: (paymentId: string) => void;
  onUpdateClientPayment: (updatedPayment: ClientPayment) => void;
  currentRole: UserRole;
  assignedSiteId: string;
  receipts: ClientReceipt[];
  onAddClientReceipt: (receipt: Omit<ClientReceipt, 'id'>) => void;
  onDeleteClientReceipt: (receiptId: string) => void;
}

export default function ClientBilling({
  sites,
  payments,
  onAddClientPayment,
  onDeleteClientPayment,
  onUpdateClientPayment,
  currentRole,
  assignedSiteId,
  receipts = [],
  onAddClientReceipt,
  onDeleteClientReceipt,
}: ClientBillingProps) {
  // Navigation level sub-section toggle
  const [activeSubsection, setActiveSubsection] = useState<'ledger' | 'ereceipts'>('ledger');

  // New E-Receipt states
  const [showAddReceiptModal, setShowAddReceiptModal] = useState(false);
  const [receiptNo, setReceiptNo] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptSiteId, setReceiptSiteId] = useState(sites.length > 0 ? sites[0].id : '');
  const [receiptClient, setReceiptClient] = useState('');
  const [receiptAmt, setReceiptAmt] = useState<string>('25000');
  const [receiptMethod, setReceiptMethod] = useState<'Bank Transfer' | 'Cash' | 'Cheque' | 'GCash' | 'Maya' | 'Other'>('Bank Transfer');
  const [receiptPurpose, setReceiptPurpose] = useState('');
  const [receiptReceiver, setReceiptReceiver] = useState('Ronald C. Famorca');
  const [receiptNotes, setReceiptNotes] = useState('');

  // Filters and Selection
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<string | null>(
    sites.length > 0 ? sites[0].id : null
  );

  // Modal Dialogs Control
  const [showAddBillingModal, setShowAddBillingModal] = useState(false);
  const [billingToDelete, setBillingToDelete] = useState<ClientPayment | null>(null);

  // Form states for adding/lodging a payment or billing statement
  const [formSiteId, setFormSiteId] = useState<string>(sites.length > 0 ? sites[0].id : '');

  // Synchronize initial select states once the real-time sites array finishes loading over the network
  React.useEffect(() => {
    if (sites.length > 0) {
      if (!selectedProjectForDetail) {
        setSelectedProjectForDetail(sites[0].id);
      }
      if (!receiptSiteId) {
        setReceiptSiteId(sites[0].id);
      }
      if (!formSiteId) {
        setFormSiteId(sites[0].id);
      }
    }
  }, [sites, selectedProjectForDetail, receiptSiteId, formSiteId]);
  const [formRefNumber, setFormRefNumber] = useState<string>('');
  const [formStage, setFormStage] = useState<ClientPayment['billingStage']>('Progress Billing');
  const [formStatus, setFormStatus] = useState<ClientPayment['status']>('Paid in Full');
  const [formMilestone, setFormMilestone] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formMethod, setFormMethod] = useState<ClientPayment['paymentMethod']>('Bank Transfer');
  const [formNotes, setFormNotes] = useState<string>('');
  
  // Custom Calculation options
  const [isAutoCalculated, setIsAutoCalculated] = useState<boolean>(true);
  const [formAccomplishment, setFormAccomplishment] = useState<number>(20);
  const [formInputAmount, setFormInputAmount] = useState<string>('50000');
  
  // Tax values
  const [formTaxRate, setFormTaxRate] = useState<number>(0); // e.g. 12% output VAT
  const [formWithholdingRate, setFormWithholdingRate] = useState<number>(0); // e.g. 2% or 5% withholding

  // Upload attachment placeholder
  const [formAttachments, setFormAttachments] = useState<{ name: string; size: string; data: string; dateUploaded: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState('');

  // Edit Billing Modal States
  const [showEditBillingModal, setShowEditBillingModal] = useState(false);
  const [editingBilling, setEditingBilling] = useState<ClientPayment | null>(null);

  const [editSiteId, setEditSiteId] = useState<string>('');
  const [editRefNumber, setEditRefNumber] = useState<string>('');
  const [editStage, setEditStage] = useState<ClientPayment['billingStage']>('Progress Billing');
  const [editStatus, setEditStatus] = useState<ClientPayment['status']>('Paid in Full');
  const [editMilestone, setEditMilestone] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editMethod, setEditMethod] = useState<ClientPayment['paymentMethod']>('Bank Transfer');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editIsAutoCalculated, setEditIsAutoCalculated] = useState<boolean>(true);
  const [editAccomplishment, setEditAccomplishment] = useState<number>(20);
  const [editInputAmount, setEditInputAmount] = useState<string>('50000');
  const [editTaxRate, setEditTaxRate] = useState<number>(0);
  const [editWithholdingRate, setEditWithholdingRate] = useState<number>(0);
  const [editAttachments, setEditAttachments] = useState<{ name: string; size: string; data: string; dateUploaded: string }[]>([]);
  const [editError, setEditError] = useState('');

  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [isEditDragging, setIsEditDragging] = useState(false);

  const handleOpenEditBilling = (pay: ClientPayment) => {
    setEditingBilling(pay);
    setEditSiteId(pay.siteId);
    setEditRefNumber(pay.billingReference || '');
    setEditStage(pay.billingStage || 'Progress Billing');
    setEditStatus(pay.status || 'Paid in Full');
    setEditMilestone(pay.milestone);
    setEditDate(pay.date);
    setEditMethod(pay.paymentMethod);
    setEditNotes(pay.notes || '');
    
    if (pay.accomplishmentRate !== undefined && pay.accomplishmentRate > 0) {
      setEditIsAutoCalculated(true);
      setEditAccomplishment(pay.accomplishmentRate);
    } else {
      setEditIsAutoCalculated(false);
      setEditAccomplishment(10);
    }
    setEditInputAmount(String(pay.grossAmount || pay.amount));
    setEditTaxRate(pay.taxRate || 0);
    setEditWithholdingRate(pay.withholdingRate || 0);
    setEditAttachments(pay.attachments || []);
    setEditError('');
    setShowEditBillingModal(true);
  };

  const activeEditSite = sites.find(s => s.id === editSiteId);
  const calculatedEditAmount = activeEditSite 
    ? Math.round(activeEditSite.projectValue * (editAccomplishment / 100))
    : 0;

  const displayEditAmount = editIsAutoCalculated ? calculatedEditAmount : Number(editInputAmount) || 0;

  const editTaxAmount = Math.round(displayEditAmount * (editTaxRate / 100));
  const editWithholdingAmount = Math.round(displayEditAmount * (editWithholdingRate / 100));
  const finalEditNetAmt = displayEditAmount + editTaxAmount - editWithholdingAmount;

  const processEditFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setEditAttachments(prev => [
          ...prev, 
          {
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            data: base64Data,
            dateUploaded: new Date().toISOString().split('T')[0]
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBilling) return;

    if (!editSiteId) {
      setEditError('Please select a construction site/project.');
      return;
    }
    if (!editRefNumber.trim()) {
      setEditError('Please enter a billing reference code.');
      return;
    }
    if (!editMilestone.trim()) {
      setEditError('Please provide a milestone scope description.');
      return;
    }

    const finalValue = editIsAutoCalculated ? calculatedEditAmount : Number(editInputAmount);
    if (isNaN(finalValue) || finalValue <= 0) {
      setEditError('Please enter a valid amount greater than ₱0.');
      return;
    }

    onUpdateClientPayment({
      ...editingBilling,
      date: editDate,
      siteId: editSiteId,
      amount: finalEditNetAmt,
      paymentMethod: editMethod,
      milestone: editMilestone,
      notes: editNotes,
      billingReference: editRefNumber,
      billingStage: editStage,
      status: editStatus,
      accomplishmentRate: editIsAutoCalculated ? editAccomplishment : undefined,
      taxRate: editTaxRate,
      withholdingRate: editWithholdingRate,
      grossAmount: finalValue,
      taxAmount: editTaxAmount,
      withholdingAmount: editWithholdingAmount,
      attachments: editAttachments
    });

    setShowEditBillingModal(false);
    setEditingBilling(null);
  };

  // Auto calculate amount when isAutoCalculated is true, or during project selection
  const activeSelectedSite = sites.find(s => s.id === formSiteId);
  const calculatedAmount = activeSelectedSite 
    ? Math.round(activeSelectedSite.projectValue * (formAccomplishment / 100))
    : 0;

  const displayAmount = isAutoCalculated ? calculatedAmount : Number(formInputAmount) || 0;

  // Calculate Taxes
  const taxAmount = Math.round(displayAmount * (formTaxRate / 100));
  const withholdingAmount = Math.round(displayAmount * (formWithholdingRate / 100));
  const finalNetAmt = displayAmount + taxAmount - withholdingAmount;

  // Filter accessible sites based on Role
  const allowedSites = sites.filter(s => currentRole === 'Admin' || s.id === assignedSiteId);
  const activeProjectDetail = sites.find(s => s.id === selectedProjectForDetail);

  // Global Multi-project stats
  const totalContractValue = allowedSites.reduce((sum, s) => sum + s.projectValue, 0);

  // Billed, collected and outstanding sums
  const getSiteBillingSums = (siteId: string) => {
    const sitePayments = payments.filter(p => p.siteId === siteId);
    
    // Billed amount = everything that is NOT draft
    const billed = sitePayments
      .filter(p => p.status !== 'Draft')
      .reduce((sum, p) => sum + p.amount, 0);

    // Collected amount = Paid in full + Partially paid ratio (we'll count actual received voucher sums)
    const collected = sitePayments
      .filter(p => p.status === 'Paid in Full' || p.status === 'Partially Paid')
      .reduce((sum, p) => sum + p.amount, 0);

    return { billed, collected };
  };

  const globalTotalCollected = allowedSites.reduce((sum, s) => {
    const { collected } = getSiteBillingSums(s.id);
    return sum + collected;
  }, 0);

  const globalOutstandingBalance = Math.max(0, totalContractValue - globalTotalCollected);

  // Filtered Payments list
  const filteredPayments = payments.filter(pay => {
    // Role filter
    if (currentRole !== 'Admin' && pay.siteId !== assignedSiteId) return false;
    
    // Project filter
    if (selectedSiteId !== 'all' && pay.siteId !== selectedSiteId) return false;

    // Stage filter
    if (selectedStageFilter !== 'all' && pay.billingStage !== selectedStageFilter) return false;

    // Status filter
    if (selectedStatusFilter !== 'all' && pay.status === selectedStatusFilter) return true;
    if (selectedStatusFilter !== 'all' && pay.status !== selectedStatusFilter) return false;

    return true;
  });

  // Unique reference helper for form
  const handleOpenAddBilling = (siteId: string) => {
    setFormSiteId(siteId);
    const sitePaymentsCount = payments.filter(p => p.siteId === siteId).length + 1;
    setFormRefNumber(`BS-${new Date().getFullYear().toString().slice(-2)}-${String(sitePaymentsCount).padStart(3, '0')}`);
    setFormMilestone(`Accomplishment Billing Milestone #${sitePaymentsCount}`);
    setFormAccomplishment(10);
    setFormInputAmount('30000');
    setFormTaxRate(0);
    setFormWithholdingRate(0);
    setFormNotes('');
    setFormAttachments([]);
    setFormError('');
    setShowAddBillingModal(true);
  };

  // Drag and drop attachment helper
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setFormAttachments(prev => [
          ...prev, 
          {
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            data: base64Data,
            dateUploaded: new Date().toISOString().split('T')[0]
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSiteId) {
      setFormError('Please select a construction site/project.');
      return;
    }
    if (!formRefNumber.trim()) {
      setFormError('Please enter a billing reference code.');
      return;
    }
    if (!formMilestone.trim()) {
      setFormError('Please provide a milestone scope description.');
      return;
    }

    const finalValue = isAutoCalculated ? calculatedAmount : Number(formInputAmount);
    if (isNaN(finalValue) || finalValue <= 0) {
      setFormError('Please enter a valid amount greater than ₱0.');
      return;
    }

    onAddClientPayment({
      date: formDate,
      siteId: formSiteId,
      amount: finalNetAmt,
      paymentMethod: formMethod,
      milestone: formMilestone,
      notes: formNotes || `Standard billing logged for reference ${formRefNumber}`,
      billingReference: formRefNumber,
      billingStage: formStage,
      status: formStatus,
      accomplishmentRate: formAccomplishment,
      taxRate: formTaxRate,
      withholdingRate: formWithholdingRate,
      grossAmount: finalValue,
      taxAmount: taxAmount,
      withholdingAmount: withholdingAmount,
      attachments: formAttachments
    });

    setShowAddBillingModal(false);
  };

  // Generate Individual PDF Billing Statement
  const handleExportStatementPDF = (pay: ClientPayment) => {
    const site = sites.find(s => s.id === pay.siteId);
    if (!site) return;

    const isDraft = pay.status === 'Draft';
    const doc = new jsPDF('p', 'mm', 'letter');
    
    // Theme palette: deep slate-950/charcoal black header matching the user's uploaded logo textured background background
    doc.setFillColor(24, 28, 36); // Charcoal Black
    doc.rect(0, 0, 216, 40, 'F');
    
    // Draw RL CON Vector Logo (Gold and White) matching the uploaded image exactly
    const logoX = 14;
    const logoY = 6;
    
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
    doc.setTextColor(255, 255, 255); // White for high luxury contrast
    doc.setFontSize(5);
    doc.setFont('Helvetica', 'bold');
    doc.text('BUILD | DESIGN | LANDSCAPE', logoX + 18, logoY + 24);

    // Draw an elegant gold metallic 4-pointed star at the bottom right corner of the logo block
    const starX = logoX + 47;
    const starY = logoY + 24;
    doc.setFillColor(229, 192, 96); // Metallic Gold #E5C060
    doc.triangle(starX, starY - 1.5, starX + 0.5, starY, starX - 0.5, starY, 'F');
    doc.triangle(starX, starY + 1.5, starX + 0.5, starY, starX - 0.5, starY, 'F');
    doc.triangle(starX - 1.5, starY, starX, starY + 0.5, starX, starY - 0.5, 'F');
    doc.triangle(starX + 1.5, starY, starX, starY + 0.5, starX, starY - 0.5, 'F');

    // Document right side title aligned perfectly
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(isDraft ? 'DRAFT INVOICE' : 'BILLING STATEMENT', 202, 13, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Reference: ${pay.billingReference || 'N/A'}`, 202, 18, { align: 'right' });
    doc.text(`Issued: ${pay.date}`, 202, 22, { align: 'right' });
    
    doc.setFontSize(7);
    doc.setTextColor(229, 192, 96); // Golden Touch
    doc.text('Block 25 Lot 14, Tierra Vista, Santiago, General Trias, Cavite', 202, 27, { align: 'right' });
    
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Standard Ledger Billing Audit Document | RL CONSTRUCTION', 202, 31, { align: 'right' });

    // Elegant gold border line acting as baseline border on the header
    doc.setDrawColor(229, 192, 96);
    doc.setLineWidth(1.2);
    doc.line(0, 40, 216, 40);

    // Grid divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(16, 48, 200, 48);

    // Project metadata
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('BILL TO CLIENT:', 16, 56);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Company/Client: ${site.clientName}`, 16, 62);
    doc.text(`Phone Contact: ${site.clientPhone}`, 16, 67);
    doc.text(`Project Site: ${site.name}`, 16, 72);
    doc.text(`Location: ${site.location}`, 16, 77);

    // Billing Breakdown right column
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('BILLING METRICS:', 125, 56);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Billing Stage: ${pay.billingStage || 'Progress Billing'}`, 125, 62);
    doc.text(`Recorded Accomplishment: ${pay.accomplishmentRate || 0}% Complete`, 125, 67);
    doc.text(`Payment Status: ${pay.status || 'Paid in Full'}`, 125, 72);
    doc.text(`Payment Option: ${pay.paymentMethod}`, 125, 77);

    // Statement item box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(16, 85, 184, 55, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.rect(16, 85, 184, 55, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text('Description of Accomplishment Scope & Materials Deliverable', 20, 93);
    doc.text('Subtotal Peso Amount', 150, 93);
    doc.line(16, 97, 200, 97);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(pay.milestone, 20, 105);
    
    const grossAmount = pay.grossAmount || pay.amount;
    doc.setFont('Helvetica', 'bold');
    doc.text(formatPDFCurrency(grossAmount), 150, 105);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.text('Total Cost Price (TCP):', 20, 115);
    doc.text(formatPDFCurrency(site.projectValue), 150, 115);

    doc.text(`Output VAT Component (${pay.taxRate || 0}%):`, 20, 122);
    doc.text(formatPDFCurrency(pay.taxAmount || 0), 150, 122);

    doc.text(`Withholding BIR Tax deduction (${pay.withholdingRate || 0}%):`, 20, 129);
    doc.text(formatPDFCurrency(pay.withholdingAmount || 0), 150, 129);

    // Total highlight
    doc.setFillColor(239, 246, 255); // blue-50 banner
    doc.rect(16, 145, 184, 15, 'F');
    doc.setDrawColor(191, 219, 254);
    doc.rect(16, 145, 184, 15, 'S');

    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(29, 78, 216); // blue-700
    doc.text(isDraft ? 'TOTAL DUE:' : 'TOTAL NET DUE / COLLECTED:', 22, 154);
    doc.text(formatPDFCurrency(pay.amount), 150, 154);

    // User Notes
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Auditing Voucher Notes:', 16, 175);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(pay.notes || 'No added remarks.', 16, 181, { maxWidth: 180 });

    // Signature Area
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Electronic ledger audit. Signed copies confirm receipt and milestone delivery endorsement.', 16, 215);

    doc.setDrawColor(203, 213, 225);
    doc.line(16, 245, 80, 245);
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Endorsed by: SHEENA MAE D. SERRANO', 16, 250);

    doc.line(130, 245, 194, 245);
    doc.setFont('Helvetica', 'bold');
    doc.text('Approved by: RONALD FAMORCA', 130, 250);

    doc.save(`Billing_Statement_${pay.billingReference || pay.id}_${pay.date}.pdf`);
  };

  // Generate consolidated project ledger of history
  const handleExportProjectLedgerPDF = (site: ConstructionSite) => {
    const sitePayments = payments.filter(p => p.siteId === site.id);
    const doc = new jsPDF('p', 'mm', 'letter');

    // Theme palette: deep slate-900/charcoal black header matching the user's uploaded logo background
    doc.setFillColor(24, 28, 36); // Charcoal Black
    doc.rect(0, 0, 216, 40, 'F');
    
    // Draw RL CON Vector Logo (Gold and White) matching the uploaded image
    const logoX = 14;
    const logoY = 6;
    
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
    doc.setTextColor(255, 255, 255); // White for high luxury contrast
    doc.setFontSize(5);
    doc.setFont('Helvetica', 'bold');
    doc.text('BUILD | DESIGN | LANDSCAPE', logoX + 18, logoY + 24);

    // Draw an elegant gold metallic star at the bottom right corner of the logo block
    const starX = logoX + 47;
    const starY = logoY + 24;
    doc.setFillColor(229, 192, 96); // Metallic Gold #E5C060
    doc.triangle(starX, starY - 1.5, starX + 0.5, starY, starX - 0.5, starY, 'F');
    doc.triangle(starX, starY + 1.5, starX + 0.5, starY, starX - 0.5, starY, 'F');
    doc.triangle(starX - 1.5, starY, starX, starY + 0.5, starX, starY - 0.5, 'F');
    doc.triangle(starX + 1.5, starY, starX, starY + 0.5, starX, starY - 0.5, 'F');

    // Document right side title aligned perfectly
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('PROJECT FINANCIAL LEDGER', 202, 13, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('PROJECT FINANCIAL SUMMARY & ACCOUNTS RECEIVABLE', 202, 18, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Auditor Suite`, 202, 22, { align: 'right' });
    
    doc.setFontSize(7);
    doc.setTextColor(229, 192, 96); // Golden Touch
    doc.text('Block 25 Lot 14, Tierra Vista, Santiago, General Trias, Cavite', 202, 27, { align: 'right' });

    // Elegant gold border line acting as baseline border on the header
    doc.setDrawColor(229, 192, 96);
    doc.setLineWidth(1.2);
    doc.line(0, 40, 216, 40);

    // Project Info Panel
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text('PROJECT OVERVIEW:', 16, 48);

    doc.setFontSize(9.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Project Name: ${site.name}`, 16, 54);
    doc.text(`Client Name: ${site.clientName}`, 16, 59);
    doc.text(`Location: ${site.location}`, 16, 64);
    doc.text(`Supervisor-in-charge: ${site.supervisorName}`, 16, 69);

    // Financial calculations box
    const totalContract = site.projectValue;
    const { billed, collected } = getSiteBillingSums(site.id);
    const outstanding = Math.max(0, totalContract - collected);
    const progressPercent = totalContract > 0 ? Math.round((collected / totalContract) * 100) : 0;

    doc.setFillColor(248, 250, 252);
    doc.rect(120, 44, 80, 32, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(120, 44, 80, 32, 'S');

    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Contract Value:`, 124, 50);
    doc.text(formatPDFCurrency(totalContract), 170, 50);

    doc.setTextColor(22, 101, 52); // green-800
    doc.text(`Total Collected to Date:`, 124, 56);
    doc.text(formatPDFCurrency(collected), 170, 56);

    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`Outstanding Accounts Recv:`, 124, 62);
    doc.text(formatPDFCurrency(outstanding), 170, 62);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Accomplishment Billing Ratio:`, 124, 68);
    doc.text(`${progressPercent}% Paid`, 170, 68);

    doc.line(16, 82, 200, 82);

    // Grid details Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('HISTORICAL MULTI-STAGE REVENUE LEDGER:', 16, 90);

    // Table rows
    let currentY = 100;
    
    doc.setFillColor(241, 245, 249);
    doc.rect(16, currentY, 184, 8, 'F');

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Date', 18, currentY + 5.5);
    doc.text('Ref Code', 38, currentY + 5.5);
    doc.text('Stage Category', 60, currentY + 5.5);
    doc.text('Milestone Title Tracker', 95, currentY + 5.5);
    doc.text('Status', 158, currentY + 5.5);
    doc.text('Net PHP Amount', 178, currentY + 5.5);

    currentY += 8;

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    if (sitePayments.length === 0) {
      doc.text('No formal billing statements logged for this project yet.', 20, currentY + 10);
    } else {
      sitePayments.forEach((p, index) => {
        // Draw alternate rows
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(16, currentY, 184, 8, 'F');
        }
        
        doc.text(p.date, 18, currentY + 5.5);
        doc.text(p.billingReference || 'N/A', 38, currentY + 5.5);
        doc.text(p.billingStage || 'Progress Billing', 60, currentY + 5.5);
        
        let labelMilestone = p.milestone;
        if (labelMilestone.length > 32) labelMilestone = labelMilestone.slice(0, 30) + '...';
        doc.text(labelMilestone, 95, currentY + 5.5);
        
        doc.text(p.status || 'Paid in Full', 158, currentY + 5.5);
        doc.setFont('Helvetica', 'bold');
        doc.text(formatPDFCurrency(p.amount), 178, currentY + 5.5);
        doc.setFont('Helvetica', 'normal');

        currentY += 8;
      });
    }

    // Footnote audit
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Note: This statement lists construction accomplishment claims processed by site and billing managers offline.', 16, currentY + 15);

    doc.save(`Project_Financial_Ledger_${site.name.replace(/\s+/g, '_')}.pdf`);
  };

  // Google Sheets/Excel CSV exports for Client Billings
  const exportBillingToSheets = () => {
    const headers = ['Receipt Ref/Invoice Ref', 'Target Project', 'Client', 'Billing Stage', 'Milestone Description', 'Endorsement Date', 'Method', 'Paid Status', 'Net Received (PHP)', 'Gross Amount', 'VAT Tax Amount', 'Withholding Amt'];
    
    const rows = payments.map(pay => {
      const site = sites.find(s => s.id === pay.siteId);
      return [
        `"${(pay.billingReference || `BS-${pay.id.slice(-4).toUpperCase()}`).replace(/"/g, '""')}"`,
        `"${(site ? site.name : 'Unknown').replace(/"/g, '""')}"`,
        `"${(site ? site.clientName : 'Unknown').replace(/"/g, '""')}"`,
        `"${(pay.billingStage || 'Progress').replace(/"/g, '""')}"`,
        `"${(pay.milestone || '').replace(/"/g, '""')}"`,
        `"${pay.date}"`,
        `"${pay.paymentMethod}"`,
        `"${pay.status || 'Paid'}"`,
        pay.amount,
        pay.grossAmount || pay.amount,
        pay.taxAmount || 0,
        pay.withholdingAmount || 0
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'RL_Client_Billings_GoogleSheets.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Google Sheets/Excel CSV exports for Official E-Receipts
  const exportReceiptsToSheets = () => {
    const headers = ['Official Receipt No', 'Paid Date', 'Payer/Client Name', 'Target Project Site', 'Net Amount Paid (PHP)', 'Payment Method', 'Milestone/Purpose', 'Received By', 'Internal Notes'];
    
    const rows = receipts.map(rec => {
      const site = sites.find(s => s.id === rec.siteId);
      return [
        `"${rec.receiptNumber.replace(/"/g, '""')}"`,
        `"${rec.date}"`,
        `"${rec.clientName.replace(/"/g, '""')}"`,
        `"${(site ? site.name : 'Unknown Site').replace(/"/g, '""')}"`,
        rec.amount,
        `"${rec.paymentMethod}"`,
        `"${rec.milestoneAndPurpose.replace(/"/g, '""')}"`,
        `"${rec.receivedBy.replace(/"/g, '""')}"`,
        `"${(rec.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'RL_Client_EReceipts_GoogleSheets.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save manual E-Receipt Form submission handler
  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNo || !receiptClient || !receiptSiteId || Number(receiptAmt) <= 0) {
      alert("Please fill in all required fields accurately.");
      return;
    }

    onAddClientReceipt({
      receiptNumber: receiptNo,
      date: receiptDate,
      siteId: receiptSiteId,
      clientName: receiptClient,
      amount: Number(receiptAmt),
      paymentMethod: receiptMethod,
      milestoneAndPurpose: receiptPurpose || 'General Contract Fit-Out Accomplishment Progress Contribution',
      receivedBy: receiptReceiver,
      notes: receiptNotes
    });

    // Reset fields
    setReceiptNo('');
    setReceiptClient('');
    setReceiptPurpose('');
    setReceiptNotes('');
    setShowAddReceiptModal(false);
  };

  // Print highly polished corporate Official E-Receipt PDF in LANDSCAPE orientation
  const handlePrintReceiptPDF = (rec: ClientReceipt) => {
    const site = sites.find(s => s.id === rec.siteId);
    const siteName = site ? site.name : 'Unknown Site Portfolio';
    
    // Changing 'p' (Portrait) to 'l' (Landscape), unit 'mm', size 'letter' (279.4 x 215.9 mm)
    const doc = new jsPDF('l', 'mm', 'letter');
    
    // Elegant Dark Luxury Banner (matching the beautiful RL CON gold-brushed brand theme)
    doc.setFillColor(24, 28, 36); // Deep charcoal black
    doc.rect(0, 0, 280, 40, 'F');
    
    // Draw RL CON Vector Logo (Gold and White)
    const logoX = 14;
    const logoY = 5;
    
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

    // Business Registration Address metadata on the right side - shifted right for landscape width
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(229, 192, 96); // Golden Touch
    doc.text('Block 25 Lot 14, Tierra Vista, Santiago, General Trias, Cavite', 265, 28, { align: 'right' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Official Business Representative Document', 265, 33, { align: 'right' });

    // Official E-Receipt Badge Box on the top right - shifted right for landscape width
    doc.setFillColor(229, 192, 96); // Metallic Gold
    doc.rect(208, 8, 57, 15, 'F');
    doc.setTextColor(15, 23, 42); // deep charcoal
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('OFFICIAL E-RECEIPT', 211, 14);
    doc.setFontSize(8.5);
    doc.text(rec.receiptNumber, 211, 19);

    // Elegant gold border line acting as baseline border on the header - full width
    doc.setDrawColor(229, 192, 96);
    doc.setLineWidth(1.2);
    doc.line(0, 40, 280, 40);
    
    // Main information block
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text('Receipt Reference:', 16, 48);
    doc.setFont('Helvetica', 'bold');
    doc.text(rec.receiptNumber, 62, 48);
    
    doc.setFont('Helvetica', 'normal');
    doc.text('Transaction date:', 16, 55);
    doc.setFont('Helvetica', 'bold');
    doc.text(rec.date, 62, 55);
    
    doc.setFont('Helvetica', 'normal');
    doc.text('Payer / Client Name:', 16, 62);
    doc.setFont('Helvetica', 'bold');
    doc.text(rec.clientName, 62, 62);
    
    doc.setFont('Helvetica', 'normal');
    doc.text('Target Site / Work Scope:', 16, 69);
    doc.setFont('Helvetica', 'bold');
    doc.text(siteName, 62, 69);

    doc.setFont('Helvetica', 'normal');
    doc.text('Payment Mode / Route:', 16, 76);
    doc.setFont('Helvetica', 'bold');
    doc.text(rec.paymentMethod, 62, 76);
    
    // Horizontal rule separator - stretched for landscape
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(16, 82, 264, 82);
    
    // Purpose / detailed description
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text('Payment Accomplishment Claim Cover / Purpose:', 18, 90);
    
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(rec.milestoneAndPurpose, 18, 97);
    
    if (rec.notes) {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Internal Ledger Notes: "${rec.notes}"`, 18, 105);
    }
    
    // Total gross display box - stretched for landscape layout
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(16, 115, 248, 25, 'FD');
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('TOTAL DEPOSITED SUM (PHP):', 22, 131);
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(formatPDFCurrency(rec.amount), 115, 131);
    
    // Authorized seal and signatures
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Issued & Received By Authorization Representative:', 16, 155);
    
    doc.setFont('Helvetica', 'bold');
    doc.text(rec.receivedBy, 16, 167);
    
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(16, 169, 85, 169);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Ronald Famorca (CEO) / Sheena Mae Serrano (Corporate Secretary)', 16, 173);
    
    doc.text('This document serves as formal online payment verification representation registered inside supervisor cloud engine.', 16, 188);
    
    doc.save(`Official_eReceipt_${rec.receiptNumber}.pdf`);
  };

  return (
    <div className="space-y-6">

      {/* TOP HEADER COMPONENT & OVERVIEW GRID */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-yellow-100 text-yellow-800 text-[10px] font-black tracking-widest uppercase py-0.5 px-2.5 rounded-full font-mono">
              Accounts Receivable
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
              <Coins className="w-5.5 h-5.5 text-yellow-500" />
              Client Billing & Payments
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Track contract values, monitor multi-stage project billings (Mobilization, Progress Billings relative to Accomplishment Rates, VOs, and Retention), and log incoming client revenue.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeSubsection === 'ledger' ? (
              <button
                onClick={exportBillingToSheets}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                title="Download Billings and Payments ledger spreadsheet for Excel/Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Ledger
              </button>
            ) : (
              <button
                onClick={exportReceiptsToSheets}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                title="Download E-Receipts spreadsheet logs for Excel/Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Receipts
              </button>
            )}

            {currentRole !== 'Client' && (
              activeSubsection === 'ledger' ? (
                <button
                  onClick={() => handleOpenAddBilling(sites.length > 0 ? sites[0].id : '')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Lodge Client Billing
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Generate a nice default receipt number
                    const nextNo = `OR-${new Date().getFullYear()}-${String(receipts.length + 1).padStart(4, '0')}`;
                    setReceiptNo(nextNo);
                    setShowAddReceiptModal(true);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors uppercase tracking-wider text-[10px]"
                >
                  <Plus className="w-4 h-4" />
                  Encode E-Receipt
                </button>
              )
            )}
          </div>
        </div>

        {/* FINANCIAL SUMMARY HIGHLIGHT CARDS (Company-Wide) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-xl space-y-1.5 relative overflow-hidden">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Contract Values</span>
            <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">{formatCurrency(totalContractValue)}</p>
            <span className="text-[10px] text-slate-400 font-medium block">
              Across {allowedSites.length} active construction project contracts
            </span>
            <div className="absolute right-2.5 bottom-2.5 opacity-10">
              <Building2 className="w-12 h-12 text-slate-900" />
            </div>
          </div>

          <div className="bg-emerald-50/40 border border-emerald-100 p-4.5 rounded-xl space-y-1.5 relative overflow-hidden">
            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Total Collected Revenue</span>
            <p className="text-2xl font-black text-emerald-700 font-mono tracking-tight">{formatCurrency(globalTotalCollected)}</p>
            <span className="text-[10px] text-emerald-600 font-semibold block">
              {totalContractValue > 0 ? Math.round((globalTotalCollected / totalContractValue) * 100) : 0}% Realized contract cash flow
            </span>
            <div className="absolute right-2.5 bottom-2.5 opacity-15">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
          </div>

          <div className="bg-rose-50/30 border border-rose-100 p-4.5 rounded-xl space-y-1.5 relative overflow-hidden">
            <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">Outstanding Account Balance</span>
            <p className="text-2xl font-black text-rose-700 font-mono tracking-tight">{formatCurrency(globalOutstandingBalance)}</p>
            <span className="text-[10px] text-rose-500 font-semibold block">
              Remaining receivables pending collection
            </span>
            <div className="absolute right-2.5 bottom-2.5 opacity-15">
              <Clock className="w-12 h-12 text-rose-600" />
            </div>
          </div>

        </div>
      </div>

      {/* SUBSECTION TABS PILLS */}
      <div className="bg-slate-200/50 p-1 rounded-xl inline-flex gap-1 border border-slate-200/60 print:hidden select-none mb-1">
        <button
          onClick={() => setActiveSubsection('ledger')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubsection === 'ledger' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-8a0'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          Invoice Statements & Ledger
        </button>
        <button
          onClick={() => setActiveSubsection('ereceipts')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubsection === 'ereceipts' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-505 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Official E-Receipts Registry
        </button>
      </div>

      {activeSubsection === 'ledger' ? (
        /* CORE SPLIT SCREEN LAYOUT */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: PROJECTS LIST & SUMMARY (5 cols) */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Building2 className="w-4.5 h-4.5 text-slate-400" />
                Active Project Portfolios
              </h2>
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold py-0.5 px-2 rounded-full">
                {allowedSites.length} Projects
              </span>
            </div>

            <div className="space-y-3">
              {allowedSites.map((site) => {
                const isSelected = selectedProjectForDetail === site.id;
                const { collected } = getSiteBillingSums(site.id);
                const outstanding = Math.max(0, site.projectValue - collected);
                const collectedPercent = site.projectValue > 0 ? Math.round((collected / site.projectValue) * 100) : 0;

                // Find latest accomplishment recorded in billing
                const latestBillingWithAccomplishment = payments
                  .filter(p => p.siteId === site.id && p.accomplishmentRate !== undefined)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const currentAccomplishment = latestBillingWithAccomplishment.length > 0
                  ? latestBillingWithAccomplishment[0].accomplishmentRate
                  : 0;

                return (
                  <div
                    key={site.id}
                    onClick={() => setSelectedProjectForDetail(site.id)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/10'
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2.5">
                      <div>
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                          {site.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {site.location}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                        site.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {site.status}
                      </span>
                    </div>

                    {/* Progress bars showing billed progress vs target contract value */}
                    <div className="space-y-3 mt-4">
                      {/* Accomplishment completion */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold">
                          <span className="text-slate-500">Physical Accomplishment Rate:</span>
                          <span className="text-slate-900 font-bold">{currentAccomplishment}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-yellow-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${currentAccomplishment || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Collections completed */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold">
                          <span className="text-slate-500 font-medium">Payment Collected Progress:</span>
                          <span className="text-slate-900 font-bold font-mono">{collectedPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${collectedPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lower financials tags row */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100/80 text-[10px]">
                      <div>
                        <span className="text-slate-400 font-medium block">Contract Sum</span>
                        <strong className="text-slate-700 font-semibold font-mono">{formatCurrency(site.projectValue)}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 font-medium block">Unpaid Balance</span>
                        <strong className="text-rose-600 font-semibold font-mono">{formatCurrency(outstanding)}</strong>
                      </div>
                    </div>

                    {/* Interactive Action toolbar */}
                    <div className="flex gap-2 justify-end mt-3 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportProjectLedgerPDF(site);
                        }}
                        className="p-1 px-2 border border-slate-200 rounded-md text-[10px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-1 transition-all"
                        title="Download full project financial ledger PDF report"
                      >
                        <Download className="w-3 h-3 text-slate-400" />
                        Ledger PDF
                      </button>

                      {currentRole !== 'Client' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddBilling(site.id);
                          }}
                          className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Lodge Billing
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: SELECTED PROJECT BILLING LEDGER HISTORY (7 cols) */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-4">
          {activeProjectDetail ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              
              {/* Ledger active title with total collections */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {activeProjectDetail.name} • Billing History
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Managing and auditing client milestones, statements, VAT, withholding and ledger attachments.
                  </p>
                </div>

                <div className="flex gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => handleExportProjectLedgerPDF(activeProjectDetail)}
                    className="p-1.5 text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    Export Project PDF
                  </button>
                </div>
              </div>

              {/* Live search or filter tags inside ledger */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    Filter Stage:
                  </div>
                  <select
                    value={selectedStageFilter}
                    onChange={(e) => setSelectedStageFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] font-medium text-slate-700"
                  >
                    <option value="all">All stages</option>
                    <option value="Down Payment">Mobilization / Down Pay</option>
                    <option value="Progress Billing">Accomplishment Progress</option>
                    <option value="Variation Order">Variation (VO)</option>
                    <option value="Retention Release">Retention Release</option>
                  </select>

                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] font-medium text-slate-700"
                  >
                    <option value="all">All statuses</option>
                    <option value="Paid in Full">Paid in Full</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Draft">Draft</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>

                <div className="text-[10px] text-slate-500 font-bold font-mono">
                  {payments.filter(p => p.siteId === activeProjectDetail.id).length} statements logged
                </div>
              </div>

              {/* Transactions stream list */}
              <div className="space-y-3.5 pr-1 max-h-[580px] overflow-y-auto">
                {payments.filter(p => p.siteId === activeProjectDetail.id).length === 0 ? (
                  <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-400">
                      No billing statements lodged for this project.
                    </p>
                    {currentRole !== 'Client' && (
                      <button
                        onClick={() => handleOpenAddBilling(activeProjectDetail.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-black"
                      >
                        Create first statement now &rarr;
                      </button>
                    )}
                  </div>
                ) : (
                  payments
                    .filter(p => p.siteId === activeProjectDetail.id)
                    .filter(p => selectedStageFilter === 'all' || p.billingStage === selectedStageFilter)
                    .filter(p => selectedStatusFilter === 'all' || p.status === selectedStatusFilter)
                    .map((pay) => {
                      const computedTax = pay.taxAmount || 0;
                      const computedWithholding = pay.withholdingAmount || 0;
                      const computedGross = pay.grossAmount || pay.amount;

                      return (
                        <div 
                          key={pay.id}
                          className="bg-white p-4.5 rounded-xl border border-slate-100 hover:border-slate-150 transition-all shadow-2xs space-y-3"
                        >
                          {/* Top row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dashed border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              {/* Stage Badge */}
                              <span className={`text-[9px] font-black uppercase tracking-wider py-0.5 px-2 rounded-md ${
                                pay.billingStage === 'Down Payment' ? 'bg-amber-100 text-amber-800' :
                                pay.billingStage === 'Retention Release' ? 'bg-indigo-100 text-indigo-800' :
                                pay.billingStage === 'Variation Order' ? 'bg-purple-100 text-purple-800' :
                                'bg-sky-100 text-sky-800'
                              }`}>
                                {pay.billingStage || 'Progress'}
                              </span>

                              <strong className="text-xs text-slate-800 font-mono tracking-tight">
                                {pay.billingReference || `BS-${pay.id.slice(-4).toUpperCase()}`}
                              </strong>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs">
                              {/* Status Tag */}
                              <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full ${
                                pay.status === 'Paid in Full' ? 'bg-emerald-100 text-emerald-800' :
                                pay.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-850' :
                                pay.status === 'Partially Paid' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                                pay.status === 'Overdue' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {pay.status || 'Paid'}
                              </span>

                              <span className="text-slate-400 font-medium text-[10px]">
                                {pay.date}
                              </span>
                            </div>
                          </div>

                          {/* Detail block */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                            <div className="sm:col-span-8 space-y-1.5 text-left">
                              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Milestone Endorsement Focus</span>
                              <p className="text-xs text-slate-900 font-bold leading-relaxed">{pay.milestone}</p>
                              {pay.notes && (
                                <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100/50 italic leading-normal">
                                  &quot;{pay.notes}&quot;
                                </p>
                              )}

                              {/* Physical Accomplishment rate percentage indicator */}
                              {pay.accomplishmentRate !== undefined && (
                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                                  <Percent className="w-3 h-3 text-slate-400" />
                                  <span>Tied to Progress Accomplishment Rate:</span>
                                  <strong className="text-slate-800 font-bold">{pay.accomplishmentRate}% Completed Project Work</strong>
                                </div>
                              )}
                            </div>

                            <div className="sm:col-span-4 bg-slate-50 p-2.5 rounded-lg border border-slate-150 flex flex-col justify-center text-right">
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide block">Net Collected / Due</span>
                              <p className="text-sm font-black text-indigo-900 font-mono tracking-tight mt-0.5">{formatCurrency(pay.amount)}</p>
                              
                              <div className="text-[9px] text-slate-400 mt-1 space-y-0.5 font-semibold font-mono border-t border-slate-200/80 pt-1">
                                <div>Gross: {formatCurrency(computedGross)}</div>
                                {computedTax > 0 && <div className="text-emerald-600">VAT (+): {formatCurrency(computedTax)}</div>}
                                {computedWithholding > 0 && <div className="text-rose-600">WHT (-): {formatCurrency(computedWithholding)}</div>}
                              </div>
                            </div>
                          </div>

                          {/* Attachments Section */}
                          {pay.attachments && pay.attachments.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider flex items-center gap-1 font-mono">
                                <Paperclip className="w-3 h-3" />
                                Filed Billing Documents ({pay.attachments.length})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {pay.attachments.map((file, fIdx) => (
                                  <a
                                    key={fIdx}
                                    href={file.data}
                                    download={file.name}
                                    className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-[10px] text-indigo-700 font-semibold flex items-center gap-1 transition-all"
                                    title={`Click to download/review filed transfer document: ${file.name} (${file.size})`}
                                  >
                                    <FileCheck2 className="w-3 h-3 text-emerald-600" />
                                    <span className="truncate max-w-[140px]">{file.name}</span>
                                    <span className="text-[9px] text-slate-400">({file.size})</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action footer */}
                          <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-slate-100">
                            <span className="text-[9px] text-slate-400 font-mono">Method: <strong className="text-slate-600">{pay.paymentMethod}</strong></span>
                            
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleOpenEditBilling(pay)}
                                className="p-1.5 border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 text-slate-500 rounded-md transition-all flex items-center gap-1 text-[10px] cursor-pointer font-semibold"
                                title="Check or Edit details before printing or generating PDF"
                              >
                                {currentRole === 'Client' ? (
                                  <>
                                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                                    Check / View Sheet
                                  </>
                                ) : (
                                  <>
                                    <Edit className="w-3.5 h-3.5 text-amber-500" />
                                    Check / Edit
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleExportStatementPDF(pay)}
                                className="p-1.5 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-md transition-all flex items-center gap-1 text-[10px] cursor-pointer"
                                title="Download professional accounting PDF statement copy"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Print PDF Statement
                              </button>

                              {currentRole !== 'Client' && (
                                <button
                                  onClick={() => setBillingToDelete(pay)}
                                  className="p-1.5 border border-rose-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                  title="Delete transaction entry completely"
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

            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-3 shadow-2xs">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-medium">Please select a construction project on the left to review billing histories.</p>
            </div>
          )}
        </div>

      </div>
      ) : (
        /* OFFICIAL E-RECEIPT WORKFLOW SECTION */
        <div className="space-y-5 animate-fade-in">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 uppercase tracking-wide">
                <FileText className="w-4 h-4 text-yellow-500" />
                Receipts General Ledger Register
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Verify official encoded manual receipts, filter and inspect deposit logs, and download PDF client clearance logs.
              </p>
            </div>
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Project Select:</span>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 font-semibold text-slate-800 focus:outline-hidden"
              >
                <option value="all">All Project Portfolios</option>
                {allowedSites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {receipts.filter(r => selectedSiteId === 'all' || r.siteId === selectedSiteId).length === 0 ? (
            <div className="bg-white py-14 rounded-2xl border border-slate-150 text-center space-y-3">
              <FileCheck2 className="w-12 h-12 text-slate-350 mx-auto stroke-1" />
              <p className="text-slate-500 font-bold text-xs">No Official E-Receipts Encoded Yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                Use the &quot;Encode E-Receipt&quot; button at the top header to manually register an official client payment receipt.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {receipts
                .filter(r => selectedSiteId === 'all' || r.siteId === selectedSiteId)
                .map((rec) => {
                  const site = sites.find(s => s.id === rec.siteId);
                  return (
                    <div 
                      key={rec.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 relative overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all space-y-4"
                    >
                      {/* Decorative yellow stripe */}
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-yellow-400" />
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase">Official Code</span>
                          <span className="bg-yellow-50 text-slate-900 text-[10px] font-black font-mono tracking-tight px-2 py-0.5 rounded border border-yellow-200">
                            {rec.receiptNumber}
                          </span>
                        </div>

                        <div className="space-y-1 text-left">
                          <span className="text-[9px] text-slate-405 font-extrabold uppercase tracking-widest block">Client Represented</span>
                          <strong className="text-slate-800 text-sm font-bold">{rec.clientName}</strong>
                          <span className="text-[10px] text-slate-450 block font-semibold truncate">Project: {site ? site.name : 'Unknown Site'}</span>
                        </div>

                        <div className="text-left bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-1">
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Purpose / Scope Cover</span>
                          <p className="text-[11px] text-slate-600 leading-snug font-semibold select-all line-clamp-2">
                            {rec.milestoneAndPurpose}
                          </p>
                        </div>

                        {rec.notes && (
                          <div className="text-left text-[10px] text-slate-500 italic bg-amber-50/20 p-2 border border-amber-100/50 rounded-lg">
                            &quot;{rec.notes}&quot;
                          </div>
                        )}

                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold font-mono pt-1">
                          <span>Paid On: {rec.date}</span>
                          <span>Channel: {rec.paymentMethod}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-dashed border-slate-150 flex items-center justify-between gap-1.5 mt-auto">
                        <div className="text-left">
                          <span className="text-[8px] text-slate-400 font-black block uppercase tracking-wider">Deposited Net Sum</span>
                          <span className="text-sm font-extrabold text-slate-900 font-mono tracking-tight">{formatCurrency(rec.amount)}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {currentRole !== 'Client' && (
                            <button
                              onClick={() => onDeleteClientReceipt(rec.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Void and delete receipt catalog"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handlePrintReceiptPDF(rec)}
                            className="bg-neutral-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                            title="Download PDF Copy"
                          >
                            <Download className="w-3 h-3 text-yellow-405" />
                            Print OR
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: LODGE / ADD CLIENT PAYMENT & BILLING DIALOG */}
      <AnimatePresence>
        {showAddBillingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddBillingModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 relative z-10 overflow-y-auto max-h-[90vh] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-base font-bold text-slate-950">
                    Lodge New Client Billing Ledger
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddBillingModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-4 text-left">
                
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Site select */}
                  <div className="col-span-2">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Target Project/Site Portfolio *
                    </label>
                    <select
                      value={formSiteId}
                      onChange={(e) => {
                        const sId = e.target.value;
                        setFormSiteId(sId);
                        const sitePaymentsCount = payments.filter(p => p.siteId === sId).length + 1;
                        setFormRefNumber(`BS-${new Date().getFullYear().toString().slice(-2)}-${String(sitePaymentsCount).padStart(3, '0')}`);
                        setFormMilestone(`Accomplishment Billing Milestone #${sitePaymentsCount}`);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 font-medium"
                    >
                      {sites.map(s => (
                        <option key={s.id} value={s.id}>{s.name} (Contract: {formatCurrency(s.projectValue)})</option>
                      ))}
                    </select>
                  </div>

                  {/* Billing Stage Category dropdown */}
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Billing Stage *
                    </label>
                    <select
                      value={formStage}
                      onChange={(e) => setFormStage(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 font-medium"
                    >
                      <option value="Down Payment">Down Payment / Mobilization</option>
                      <option value="Progress Billing">Accomplishment Progress Billing</option>
                      <option value="Variation Order">Variation / Change Order (VO)</option>
                      <option value="Retention Release">Retention Fee Release</option>
                    </select>
                  </div>

                  {/* Reference Number */}
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Billing Reference # *
                    </label>
                    <input
                      type="text"
                      required
                      value={formRefNumber}
                      onChange={(e) => setFormRefNumber(e.target.value)}
                      placeholder="e.g. BS-26-003"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500 font-bold"
                    />
                  </div>

                  {/* Date selection */}
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Receipt/Issue Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 font-medium"
                    />
                  </div>

                  {/* Payment Method dropdown */}
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Expected/Logged Option *
                    </label>
                    <select
                      value={formMethod}
                      onChange={(e) => setFormMethod(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 font-medium"
                    >
                      <option value="Bank Transfer">Bank Transfer (Checking)</option>
                      <option value="Cash">Cash Voucher</option>
                      <option value="Cheque">Physical Cheque</option>
                      <option value="Other">Other Routing</option>
                    </select>
                  </div>

                  {/* Current Status tag dropdown */}
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Billing Status Tag *
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 font-medium"
                    >
                      <option value="Paid in Full">Paid in Full (Settled)</option>
                      <option value="Pending Approval">Pending Approval / Review</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Overdue">Overdue Outstanding</option>
                      <option value="Draft">Draft Invoice</option>
                    </select>
                  </div>

                  {/* Form toggle: auto accomplishment vs manual */}
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Billing Input Mode
                    </label>
                    <div className="flex gap-2.5 mt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setIsAutoCalculated(true)}
                        className={`flex-1 py-2 px-1 rounded-lg border font-bold transition-all ${
                          isAutoCalculated
                            ? 'bg-yellow-50 border-yellow-300 text-yellow-800 shadow-3xs'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        Accomplishment %
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAutoCalculated(false)}
                        className={`flex-1 py-2 px-1 rounded-lg border font-bold transition-all ${
                          !isAutoCalculated
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-3xs'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        Manual Value
                      </button>
                    </div>
                  </div>
                </div>

                {/* Amount calculator box */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                      Base Valuation Calculator
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold italic">
                      Contract Sum: {activeSelectedSite ? formatCurrency(activeSelectedSite.projectValue) : '₱0'}
                    </span>
                  </div>

                  {isAutoCalculated ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-semibold">Accomplishment Completion Rate:</span>
                        <span className="text-yellow-600 font-black text-sm">{formAccomplishment}% of Contract</span>
                      </div>
                      <input 
                        type="range"
                        min="1"
                        max="100"
                        value={formAccomplishment}
                        onChange={(e) => setFormAccomplishment(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                      />
                      <div className="flex justify-between items-center text-xs bg-white border border-slate-100 p-2 rounded-lg mt-2">
                        <span className="text-slate-500 font-medium">Auto-Calculated Base Amount:</span>
                        <strong className="text-slate-800 font-bold font-mono">{formatCurrency(calculatedAmount)}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block">Enter manual base billing amount (PHP):</span>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold font-mono hover:cursor-default text-xs">₱</span>
                        <input
                          type="number"
                          value={formInputAmount}
                          onChange={(e) => setFormInputAmount(e.target.value)}
                          placeholder="e.g. 150000"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 pl-7 text-xs text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500 font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Taxes and Withholding breakdown */}
                  <div className="grid grid-cols-2 gap-3.5 pt-2.5 border-t border-slate-200/80">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                        Add Output VAT Component (%)
                      </label>
                      <select
                        value={formTaxRate}
                        onChange={(e) => setFormTaxRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-hidden"
                      >
                        <option value="0">0% (Vat Exempt / Pending)</option>
                        <option value="12">12% Standard Philippine VAT</option>
                      </select>
                      {taxAmount > 0 && (
                        <span className="text-[9px] text-emerald-600 font-bold block mt-1">
                          {formatCurrency(taxAmount)} VAT Sum
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                        Withholding Tax Deduction (%)
                      </label>
                      <select
                        value={formWithholdingRate}
                        onChange={(e) => setFormWithholdingRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-hidden"
                      >
                        <option value="0">0% (No withholding)</option>
                        <option value="1">1% Creditable income tax</option>
                        <option value="2">2% Philippine subcontractor WHT</option>
                        <option value="5">5% Government bidding WHT</option>
                      </select>
                      {withholdingAmount > 0 && (
                        <span className="text-[9px] text-rose-600 font-bold block mt-1">
                          {formatCurrency(withholdingAmount)} WHT Deduct
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Net Summary Output Block */}
                  <div className="bg-indigo-900 text-white p-3 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-indigo-200 font-bold uppercase tracking-wide block">
                        Net Statement Amount Due
                      </span>
                      <p className="text-[10px] text-indigo-300 font-medium">
                        Gross {formatCurrency(displayAmount)} with adjustments
                      </p>
                    </div>
                    <strong className="text-base font-black font-mono tracking-tight">
                      {formatCurrency(finalNetAmt)}
                    </strong>
                  </div>

                </div>

                {/* Scope Milestone and notes */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Accomplishment / Milestone Target Scope Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={formMilestone}
                      onChange={(e) => setFormMilestone(e.target.value)}
                      placeholder="e.g. Ground Floor Framework Cast & Column Curing"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Remarks / Notes Ledger Detail (Optional)
                    </label>
                    <textarea
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="e.g. Lodged client transfer approval document with signed certificate of completion from general surveyor"
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Attachment file uploader area */}
                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    Upload Accounting Attachments / Transfer Receipts (Optional)
                  </label>
                  
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4.5 text-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-50/20' 
                        : 'border-slate-200 hover:border-slate-350 bg-slate-50 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                    />
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-650 font-bold">Drag and drop documents here, or click to browse</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF statement sheets, signed accomplishment vouchers, or bank slip images</p>
                  </div>

                  {/* Render uploaded list preview */}
                  {formAttachments.length > 0 && (
                    <div className="space-y-1 bg-slate-100/50 p-2.5 rounded-lg border border-slate-150">
                      <span className="text-[9px] text-slate-450 font-bold block uppercase font-mono tracking-wider">
                        Files to be uploaded ({formAttachments.length})
                      </span>
                      {formAttachments.map((f, i) => (
                        <div key={i} className="flex justify-between items-center text-[11px] font-medium bg-white px-2 py-1 rounded border border-slate-100">
                          <span className="truncate max-w-[200px] text-slate-700">{f.name}</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span>{f.size}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormAttachments(prev => prev.filter((_, idx) => idx !== i));
                              }}
                              className="text-rose-500 hover:text-rose-700 font-bold p-0.5 rounded"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form submit footer */}
                <div className="flex gap-2.5 pt-3.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddBillingModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    Close / Go back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors shadow-2xs"
                  >
                    Record & Ledger Billing
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CHECK, AUDIT & EDIT ENCODED CLIENT BILLING LEDGER WITH LIVE PREVIEW */}
      <AnimatePresence>
        {showEditBillingModal && editingBilling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEditBillingModal(false);
                setEditingBilling(null);
              }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-5xl w-full p-6 relative z-10 overflow-y-auto max-h-[92vh] space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5">
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                    <Edit className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
                      Check, Audit & Edit Billing Ledger
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Verify computations, adjust milestone rates, and inspect the real-time sheet prior to printing or PDF generation</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditBillingModal(false);
                    setEditingBilling(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Two-Column split screen on desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                
                {/* COLUMN 1: FORM CONTROLS (Client gets a read-only screen) */}
                <div className="lg:col-span-12 xl:col-span-5 space-y-4 border-r border-slate-100 lg:pr-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-indigo-50/50 pb-1.5">
                    {currentRole === 'Client' ? 'Ledger Metadata Details' : 'Form Editor Controls'}
                  </span>

                  {currentRole === 'Client' ? (
                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3.5 text-xs font-semibold">
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg font-bold text-[11px] leading-relaxed">
                        ✨ <strong>Read-only Workspace:</strong> Clients have view-only check clearance. For modification queries, please coordinate with secretarial or project management officers.
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-450 block uppercase font-bold">Billing Reference</span>
                          <strong className="text-slate-800 font-mono">{editRefNumber}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block uppercase font-bold">Billing Date</span>
                          <strong className="text-slate-800">{editDate}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block uppercase font-bold">Billing Stage</span>
                          <strong className="text-slate-800">{editStage}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block uppercase font-bold">Payment Method</span>
                          <strong className="text-slate-800">{editMethod}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block uppercase font-bold">Ledger Status</span>
                          <strong className="text-indigo-700 font-bold">{editStatus}</strong>
                        </div>
                        {editIsAutoCalculated && (
                          <div>
                            <span className="text-[10px] text-slate-450 block uppercase font-bold">Accomplishment Link</span>
                            <strong className="text-slate-800">{editAccomplishment}% Rate</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleEditSubmit} className="space-y-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Site Selection */}
                        <div className="col-span-2">
                          <label className="text-[10px] font-extrabold text-slate-505 uppercase tracking-wider block mb-1">
                            Associated Project/Site *
                          </label>
                          <select
                            value={editSiteId}
                            onChange={(e) => setEditSiteId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-hidden font-semibold"
                          >
                            {sites.map(s => (
                              <option key={s.id} value={s.id}>{s.name} (Contract: {formatCurrency(s.projectValue)})</option>
                            ))}
                          </select>
                        </div>

                        {/* Reference code */}
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-505 uppercase tracking-wider block mb-0.5">
                            Billing Ref # *
                          </label>
                          <input
                            type="text"
                            required
                            value={editRefNumber}
                            onChange={(e) => setEditRefNumber(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 font-mono font-bold"
                          />
                        </div>

                        {/* Date */}
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-505 uppercase tracking-wider block mb-0.5">
                            Issue Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 font-semibold"
                          />
                        </div>

                        {/* Billing Stage Category */}
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-505 uppercase tracking-wider block mb-0.5">
                            Billing Stage *
                          </label>
                          <select
                            value={editStage}
                            onChange={(e) => setEditStage(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-hidden font-medium"
                          >
                            <option value="Down Payment">Down Payment / Mobilization</option>
                            <option value="Progress Billing">Accomplishment Progress</option>
                            <option value="Variation Order">Variation (VO)</option>
                            <option value="Retention Release">Retention Release</option>
                          </select>
                        </div>

                        {/* Method */}
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-505 uppercase tracking-wider block mb-0.5">
                            Payment Option *
                          </label>
                          <select
                            value={editMethod}
                            onChange={(e) => setEditMethod(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-hidden font-medium"
                          >
                            <option value="Bank Transfer">Bank Transfer (Checking)</option>
                            <option value="Cash">Cash Voucher</option>
                            <option value="Cheque">Physical Cheque</option>
                            <option value="Other">Other Routing</option>
                          </select>
                        </div>

                        {/* Status */}
                        <div className="col-span-2">
                          <label className="text-[10px] font-extrabold text-slate-505 uppercase tracking-wider block mb-0.5">
                            Billing Status Select *
                          </label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-hidden font-semibold"
                          >
                            <option value="Paid in Full">Paid in Full (Settled)</option>
                            <option value="Pending Approval">Pending Approval / Review</option>
                            <option value="Partially Paid">Partially Paid</option>
                            <option value="Overdue">Overdue Outstanding</option>
                            <option value="Draft">Draft Invoice</option>
                          </select>
                        </div>
                      </div>

                      {/* Mode toggler */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                          <span>Billing Valuation Mode</span>
                          <span className="text-slate-400 font-semibold italic">Contract: {activeEditSite ? formatCurrency(activeEditSite.projectValue) : '₱0'}</span>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setEditIsAutoCalculated(true)}
                            className={`flex-1 py-1.5 px-2 rounded-lg border font-bold transition-all text-[11px] cursor-pointer ${
                              editIsAutoCalculated
                                ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            Accomplishment %
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditIsAutoCalculated(false)}
                            className={`flex-1 py-1.5 px-2 rounded-lg border font-bold transition-all text-[11px] cursor-pointer ${
                              !editIsAutoCalculated
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            Manual Value Input
                          </button>
                        </div>

                        {editIsAutoCalculated ? (
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-600">Physical Accomplishment Rate:</span>
                              <span className="text-yellow-600 font-extrabold">{editAccomplishment}% of Contract</span>
                            </div>
                            <input 
                              type="range"
                              min="1"
                              max="100"
                              value={editAccomplishment}
                              onChange={(e) => setEditAccomplishment(Number(e.target.value))}
                              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />
                            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 font-mono font-medium">
                              <span>Estimated gross:</span>
                              <strong className="text-slate-700 font-bold">{formatCurrency(calculatedEditAmount)}</strong>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 block">Manual Base Amount (PHP) *</span>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono text-xs">₱</span>
                              <input
                                type="number"
                                required
                                value={editInputAmount}
                                onChange={(e) => setEditInputAmount(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 pl-6 text-xs text-slate-800 font-mono font-bold"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Adjust Taxes & VAT */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-2.5 border border-slate-150 rounded-xl text-xs">
                        <div>
                          <label className="text-[9px] font-extrabold text-slate-500 block uppercase mb-1">
                            Output VAT Option
                          </label>
                          <select
                            value={editTaxRate}
                            onChange={(e) => setEditTaxRate(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[11px]"
                          >
                            <option value="0">0% (VAT Exempt)</option>
                            <option value="12">12% Phil VAT</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-slate-500 block uppercase mb-1">
                            Subcon Subtraction
                          </label>
                          <select
                            value={editWithholdingRate}
                            onChange={(e) => setEditWithholdingRate(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[11px]"
                          >
                            <option value="0">0% (No withholding)</option>
                            <option value="1">1% Creditable Inc</option>
                            <option value="2">2% Subcontractor</option>
                            <option value="5">5% Gov't bidding</option>
                          </select>
                        </div>
                      </div>

                      {/* Milestone Title */}
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-505 uppercase tracking-wider block mb-0.5">
                          Milestone Scope Description *
                        </label>
                        <input
                          type="text"
                          required
                          value={editMilestone}
                          onChange={(e) => setEditMilestone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 font-bold"
                        />
                      </div>

                      {/* Notes remarks */}
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Audit Ledger Remarks / Diary Note
                        </label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800"
                        />
                      </div>

                      {/* File upload drag and drop for edits */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Filed Accounting Attachments (Optional)</label>
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsEditDragging(true); }}
                          onDragLeave={() => setIsEditDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsEditDragging(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              processEditFiles(e.dataTransfer.files);
                            }
                          }}
                          onClick={() => editFileInputRef.current?.click()}
                          className={`border border-dashed rounded-xl p-2.5 text-center cursor-pointer text-xs ${
                            isEditDragging ? 'border-amber-500 bg-amber-50/10' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                          }`}
                        >
                          <input 
                            type="file" 
                            ref={editFileInputRef} 
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                processEditFiles(e.target.files);
                              }
                            }}
                            className="hidden" 
                            multiple 
                            accept=".pdf,.png,.jpg,.jpeg" 
                          />
                          <Upload className="w-4 h-4 text-slate-400 mx-auto mb-0.5" />
                          <span className="text-[10px] font-bold text-slate-600 block">Click to append file attachments</span>
                        </div>

                        {editAttachments.length > 0 && (
                          <div className="bg-slate-50 p-2 border border-slate-150 rounded-lg space-y-1 max-h-[85px] overflow-y-auto">
                            {editAttachments.map((at, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[10px] bg-white p-1 rounded border border-slate-100 font-semibold text-slate-650">
                                <span className="truncate max-w-[150px]">{at.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditAttachments(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-rose-500 font-bold hover:text-rose-700"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Modal Control actions */}
                      <div className="flex gap-2.5 pt-3.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditBillingModal(false);
                            setEditingBilling(null);
                          }}
                          className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold py-2 rounded-xl text-xs cursor-pointer transition-colors"
                        >
                          Cancel / Back
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2 rounded-xl text-xs cursor-pointer transition-colors shadow-2xs uppercase tracking-wider text-[10px]"
                        >
                          Save & Update Ledger
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* COLUMN 2: GOLD-STANDARD LIVE AUDIT STATEMENT PDF SHEET PREVIEW */}
                <div className="lg:col-span-12 xl:col-span-7 bg-slate-900/5 p-4 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-center bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Auditor Sheet Live Check View</span>
                    <button
                      onClick={() => {
                        // Directly download the current finalized statement document
                        const mockPay: ClientPayment = {
                          id: editingBilling.id,
                          date: editDate,
                          siteId: editSiteId,
                          amount: finalEditNetAmt,
                          paymentMethod: editMethod,
                          milestone: editMilestone,
                          notes: editNotes,
                          billingReference: editRefNumber,
                          billingStage: editStage,
                          status: editStatus,
                          accomplishmentRate: editIsAutoCalculated ? editAccomplishment : undefined,
                          taxRate: editTaxRate,
                          withholdingRate: editWithholdingRate,
                          grossAmount: displayEditAmount,
                          taxAmount: editTaxAmount,
                          withholdingAmount: editWithholdingAmount,
                          attachments: editAttachments
                        };
                        handleExportStatementPDF(mockPay);
                      }}
                      className="bg-neutral-950 hover:bg-black text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      title="Download the updated statement immediately as PDF"
                    >
                      <Download className="w-3 h-3 text-yellow-400" />
                      Direct PDF Export
                    </button>
                  </div>

                  {/* PREVIEW CONTAINER SHEET (Aesthetic replication of the paper statement) */}
                  <div className="bg-white border border-slate-300 shadow-lg rounded-xl p-6 space-y-5 flex-1 select-none text-slate-800 relative overflow-hidden font-sans">
                    {/* Golden top tab */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-slate-800" />

                    {/* Logo & Corporate branding header */}
                    <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-900 text-yellow-500 font-bold text-[10px] flex items-center justify-center rounded uppercase font-mono">
                            RL
                          </div>
                          <span className="font-extrabold tracking-wider text-sm text-slate-900 uppercase">
                            RL CONSTRUCTION
                          </span>
                        </div>
                        <span className="text-[8px] text-slate-400 block mt-1 font-medium italic select-text text-left">
                          Block 25 Lot 14, Tierra Vista, Santiago, General Trias, Cavite
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[12px] font-black text-indigo-950 block">BILLING STATEMENT</span>
                        <span className="text-[9px] font-bold font-mono text-slate-500 block truncate max-w-[180px]">
                          Ref: {editRefNumber || 'BS-XX-XXX'}
                        </span>
                        <span className="text-[8px] text-slate-400 font-medium block">
                          Date: {editDate || '2026-XX-XX'}
                        </span>
                      </div>
                    </div>

                    {/* Meta section side-by-side */}
                    <div className="grid grid-cols-2 gap-4 text-xs select-text text-left">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider mb-1">
                          BILL TO CLIENT / RECIPIENT
                        </span>
                        {activeEditSite ? (
                          <div className="space-y-0.5 font-medium text-slate-650">
                            <div className="font-bold text-slate-900 text-[11px] truncate">{activeEditSite.clientName}</div>
                            <div className="truncate">Contact: {activeEditSite.clientPhone}</div>
                            <div className="truncate">Project: {activeEditSite.name}</div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">{activeEditSite.location}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No project selection</span>
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-slate-600">
                        <span className="text-[9px] text-indigo-800 font-bold block uppercase tracking-wider border-b border-indigo-100/50 pb-0.5">
                          STATEMENT AUDIT METRICS
                        </span>
                        <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[10px] font-bold text-slate-650">
                          <span className="text-slate-400 font-medium">Stage:</span>
                          <span className="text-slate-800 truncate text-right font-extrabold">{editStage}</span>
                          
                          <span className="text-slate-400 font-medium">Status:</span>
                          <span className={`text-[9px] font-black px-1 rounded text-right flex items-center justify-end ${
                            editStatus === 'Paid in Full' ? 'text-emerald-700' :
                            editStatus === 'Pending Approval' ? 'text-amber-700' : 'text-slate-700'
                          }`}>
                            ● {editStatus}
                          </span>
                          
                          <span className="text-slate-400 font-medium">Method:</span>
                          <span className="text-slate-800 truncate text-right">{editMethod}</span>
                          
                          {editIsAutoCalculated && (
                            <>
                              <span className="text-slate-400 font-medium">Accomplishment:</span>
                              <span className="text-slate-800 text-right font-extrabold">{editAccomplishment}% Rate</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown spreadsheet look */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <div className="bg-slate-100 p-2 font-bold text-slate-700 grid grid-cols-12 gap-2 text-left">
                        <div className="col-span-8">Description of Milestone Scope / Progress Claims</div>
                        <div className="col-span-4 text-right">Peso Amount</div>
                      </div>
                      <div className="p-3 bg-white grid grid-cols-12 gap-2 text-left border-b border-slate-100">
                        <div className="col-span-8 space-y-1">
                          <span className="font-extrabold text-slate-900 leading-tight block">
                            {editMilestone || 'Accomplishment milestone description...'}
                          </span>
                          <span className="text-[10px] text-slate-400 leading-normal block italic select-text text-left">
                            {editNotes ? `"${editNotes}"` : 'No custom remarks recorded.'}
                          </span>
                        </div>
                        <div className="col-span-4 text-right font-extrabold font-mono text-slate-900 self-center">
                          {formatCurrency(displayEditAmount)}
                        </div>
                      </div>

                      {/* Calculations breakdown block in sheet */}
                      <div className="p-3 bg-slate-50/70 border-b border-slate-100 flex flex-col space-y-1.5 font-semibold text-slate-650 select-text text-[11px] text-left">
                        <div className="flex justify-between font-medium">
                          <span>Subtotal Base:</span>
                          <span className="font-mono text-slate-500 font-bold">
                            {formatCurrency(displayEditAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-emerald-600 font-bold gap-2">
                          <span>Output VAT Component (+ {editTaxRate}%):</span>
                          <span className="font-mono">+{formatCurrency(editTaxAmount)}</span>
                        </div>
                        <div className="flex justify-between text-rose-600 font-bold gap-2">
                          <span>BIR Withholding Tax deduction (- {editWithholdingRate}%):</span>
                          <span className="font-mono">-{formatCurrency(editWithholdingAmount)}</span>
                        </div>
                      </div>

                      {/* Widescreen Highlight net total Banner */}
                      <div className="bg-blue-50 p-2.5 px-3 flex justify-between items-center text-blue-800">
                        <span className="font-bold text-[10px] uppercase tracking-wider block">TOTAL NET AMOUNT DUE:</span>
                        <strong className="text-sm font-black font-mono tracking-tight">{formatCurrency(finalEditNetAmt)}</strong>
                      </div>
                    </div>

                    {/* Authorized Signatures Layout preview */}
                    <div className="pt-3 flex justify-between items-end gap-4 text-[9px] text-slate-400 select-text">
                      <div className="w-[180px] text-left">
                        <div className="border-b border-slate-300 pb-1.5 text-center text-slate-700 font-bold select-all font-sans uppercase tracking-wider text-[9px]">
                          Endorsed by: SHEENA MAE D. SERRANO
                        </div>
                      </div>
                      <div className="w-[180px] text-right">
                        <div className="border-b border-slate-300 pb-1.5 text-center text-slate-700 font-bold select-all font-sans uppercase tracking-wider text-[9px]">
                          Approved by: RONALD FAMORCA
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footnotes checklist */}
                  <div className="text-[10px] text-slate-400 font-medium leading-relaxed bg-white border border-slate-200/80 p-3 rounded-xl flex items-start gap-2 text-left">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Audit Checklist Passed:</strong> Real-time tax ratios (VAT component and withholding subcontractor rates) match the financial settings. Milestone references can safely proceed to print or export.
                    </span>
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION DIALOG: Custom Yes/No Delete Modal */}
      <AnimatePresence>
        {billingToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBillingToDelete(null)}
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
                  Delete Client Billing Record?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Are you sure you want to completely remove billing statement <strong className="text-slate-900">{billingToDelete.billingReference || 'N/A'}</strong>?
                </p>
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-[10px] text-slate-400 font-medium text-left">
                  <strong>Statement Gross Amount:</strong> {formatCurrency(billingToDelete.grossAmount || billingToDelete.amount)}
                  <br />
                  <strong>Milestone Project Focus:</strong> {billingToDelete.milestone}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setBillingToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  No, Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteClientPayment(billingToDelete.id);
                    setBillingToDelete(null);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors shadow-2xs"
                >
                  Yes, Remove Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showAddReceiptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddReceiptModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-slate-800"
            >
              {/* Gold styling design block */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black tracking-tight uppercase flex items-center gap-2">
                    <FileText className="w-4 h-4 text-yellow-500" />
                    Encode Manual E-Receipt
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">Verify custom payments using authorized offline templates</p>
                </div>
                <button
                  onClick={() => setShowAddReceiptModal(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveReceipt} className="p-6 space-y-4 text-xs font-semibold text-slate-650">
                <div className="grid grid-cols-2 gap-3.5 text-left">
                  <div className="space-y-1">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold">Official Receipt No *</label>
                    <input
                      type="text"
                      required
                      value={receiptNo}
                      onChange={(e) => setReceiptNo(e.target.value)}
                      placeholder="e.g. OR-2026-0001"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold">Transaction Date *</label>
                    <input
                      type="date"
                      required
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-slate-500 text-[10px] uppercase font-bold">Payer / Client Name *</label>
                  <input
                    type="text"
                    required
                    value={receiptClient}
                    onChange={(e) => setReceiptClient(e.target.value)}
                    placeholder="Enter the full name of paying customer"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-850"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-left">
                  <div className="space-y-1">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold">Recipient Site *</label>
                    <select
                      value={receiptSiteId}
                      onChange={(e) => setReceiptSiteId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-850"
                    >
                      {sites.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold">Payment Channel *</label>
                    <select
                      value={receiptMethod}
                      onChange={(e) => setReceiptMethod(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-850"
                    >
                      <option value="Bank Transfer">Bank Transfer (BDO/BPI)</option>
                      <option value="Cash">Cash Handover</option>
                      <option value="Cheque">Corporate Cheque</option>
                      <option value="GCash">GCash Mobile QR</option>
                      <option value="Maya">Maya Mobile Pay</option>
                      <option value="Other">Other Electronic Gateway</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-left">
                  <div className="space-y-1">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold">Amount Paid (PHP) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={receiptAmt}
                      onChange={(e) => setReceiptAmt(e.target.value)}
                      placeholder="e.g. 150000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold">Authorized Signer *</label>
                    <input
                      type="text"
                      required
                      value={receiptReceiver}
                      onChange={(e) => setReceiptReceiver(e.target.value)}
                      placeholder="Receiving officer"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-850"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-slate-500 text-[10px] uppercase font-bold">Milestone Claim Cover / Purpose *</label>
                  <input
                    type="text"
                    required
                    value={receiptPurpose}
                    onChange={(e) => setReceiptPurpose(e.target.value)}
                    placeholder="e.g. 50% mobilization down-payment for contract fit-out structure"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-855"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-slate-500 text-[10px] uppercase font-bold">Internal Notes / Remarks</label>
                  <textarea
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    placeholder="Add miscellaneous references if any (e.g., cleared on May 15th)"
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-855 resize-none font-medium"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddReceiptModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200/85 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer transition-colors uppercase tracking-wider text-[11px]"
                  >
                    Lock & Encode Receipt
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
