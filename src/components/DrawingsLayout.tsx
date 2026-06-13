/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  UserPlus, 
  MapPin, 
  User, 
  BadgeAlert, 
  CheckCircle2, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  CalendarDays, 
  Trash2,
  Plus,
  FileSpreadsheet,
  Edit,
  Download
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';

interface DrawingClient {
  id: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  serviceType: 'Architectural Drafting' | '3D Render & Interior' | 'Structural Blueprint Package' | 'Full Permit Drawings';
  contractValue: number;
  amountPaid: number;
  currentStep: 'Initial Consult' | 'Concept Proposal' | 'Schematic Drafting' | 'Rendering Phase' | 'Final Notarization' | 'Completed & Handed-over';
  nextAction: string;
  targetDate: string;
  notes?: string;
  billingRef?: string;
  
  // Custom drawing fields:
  drawingStatus?: string; // e.g., 'Drafting', 'Under Revision', 'Awaiting Client Review', 'Approved for Printing', 'Revision Requested'
  drawingRemarks?: string;
  
  // 3 Revision Details:
  rev1Status?: string; // e.g., 'Not Requested', 'Awaiting Client Review', 'In Progress', 'Completed & Merged'
  rev1Remarks?: string;
  rev1Date?: string;
  
  rev2Status?: string;
  rev2Remarks?: string;
  rev2Date?: string;
  
  rev3Status?: string;
  rev3Remarks?: string;
  rev3Date?: string;
}

export default function DrawingsLayout() {
  const [drawingClients, setDrawingClients] = useState<DrawingClient[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formService, setFormService] = useState<DrawingClient['serviceType']>('Architectural Drafting');
  const [formValue, setFormValue] = useState<number>(25000);
  const [formPaid, setFormPaid] = useState<number>(0);
  const [formStep, setFormStep] = useState<DrawingClient['currentStep']>('Initial Consult');
  const [formNextAction, setFormNextAction] = useState('Draft first architectural sketch concept');
  const [formTargetDate, setFormTargetDate] = useState('2026-06-15');
  const [formNotes, setFormNotes] = useState('');
  
  // New Form states for Drawing Status, Remarks & 3 Revisions
  const [formDrawingStatus, setFormDrawingStatus] = useState('Drafting');
  const [formDrawingRemarks, setFormDrawingRemarks] = useState('');
  const [formRev1Status, setFormRev1Status] = useState('Not Requested');
  const [formRev1Remarks, setFormRev1Remarks] = useState('');
  const [formRev1Date, setFormRev1Date] = useState('');
  const [formRev2Status, setFormRev2Status] = useState('Not Requested');
  const [formRev2Remarks, setFormRev2Remarks] = useState('');
  const [formRev2Date, setFormRev2Date] = useState('');
  const [formRev3Status, setFormRev3Status] = useState('Not Requested');
  const [formRev3Remarks, setFormRev3Remarks] = useState('');
  const [formRev3Date, setFormRev3Date] = useState('');

  // Edit Form States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<DrawingClient | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editService, setEditService] = useState<DrawingClient['serviceType']>('Architectural Drafting');
  const [editValue, setEditValue] = useState<number>(25000);
  const [editPaid, setEditPaid] = useState<number>(0);
  const [editStep, setEditStep] = useState<DrawingClient['currentStep']>('Initial Consult');
  const [editNextAction, setEditNextAction] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('2026-06-15');
  const [editNotes, setEditNotes] = useState('');
  
  // New Edit states for Drawing Status, Remarks & 3 Revisions
  const [editDrawingStatus, setEditDrawingStatus] = useState('Drafting');
  const [editDrawingRemarks, setEditDrawingRemarks] = useState('');
  const [editRev1Status, setEditRev1Status] = useState('Not Requested');
  const [editRev1Remarks, setEditRev1Remarks] = useState('');
  const [editRev1Date, setEditRev1Date] = useState('');
  const [editRev2Status, setEditRev2Status] = useState('Not Requested');
  const [editRev2Remarks, setEditRev2Remarks] = useState('');
  const [editRev2Date, setEditRev2Date] = useState('');
  const [editRev3Status, setEditRev3Status] = useState('Not Requested');
  const [editRev3Remarks, setEditRev3Remarks] = useState('');
  const [editRev3Date, setEditRev3Date] = useState('');

  // Real-time Firestore Sync
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'drawing_clients'), (snapshot) => {
      const list: DrawingClient[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as DrawingClient);
      });
      setDrawingClients(list);
      setLoading(false);
    }, (error) => {
      console.error("Error drawing sync", error);
      // Fallback local persistence if Firestore permission not deployed yet
      const saved = localStorage.getItem('cs_drawing_clients');
      if (saved) {
        setDrawingClients(JSON.parse(saved));
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const saveToFirestoreOrLocal = async (items: DrawingClient[], singleItem?: DrawingClient) => {
    if (singleItem) {
      try {
        await setDoc(doc(db, 'drawing_clients', singleItem.id), singleItem);
      } catch (e) {
        console.error("Firestore writing error, falling back locally", e);
        localStorage.setItem('cs_drawing_clients', JSON.stringify(items));
        setDrawingClients(items);
      }
    } else {
      localStorage.setItem('cs_drawing_clients', JSON.stringify(items));
      setDrawingClients(items);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formAddress) return;

    const newClient: DrawingClient = {
      id: `dwg-${Date.now()}`,
      clientName: formName,
      clientAddress: formAddress,
      clientPhone: formPhone,
      serviceType: formService,
      contractValue: Number(formValue),
      amountPaid: Number(formPaid),
      currentStep: formStep,
      nextAction: formNextAction,
      targetDate: formTargetDate,
      notes: formNotes,
      billingRef: `DWG-BILL-${Math.floor(1000 + Math.random() * 9000)}`,
      
      drawingStatus: formDrawingStatus,
      drawingRemarks: formDrawingRemarks,
      rev1Status: formRev1Status,
      rev1Remarks: formRev1Remarks,
      rev1Date: formRev1Date,
      rev2Status: formRev2Status,
      rev2Remarks: formRev2Remarks,
      rev2Date: formRev2Date,
      rev3Status: formRev3Status,
      rev3Remarks: formRev3Remarks,
      rev3Date: formRev3Date
    };

    const updated = [...drawingClients, newClient];
    await saveToFirestoreOrLocal(updated, newClient);

    // Reset fields
    setFormName('');
    setFormAddress('');
    setFormPhone('');
    setFormValue(25000);
    setFormPaid(0);
    setFormStep('Initial Consult');
    setFormNextAction('Draft first architectural sketch concept');
    setFormNotes('');
    
    // Reset our new fields
    setFormDrawingStatus('Drafting');
    setFormDrawingRemarks('');
    setFormRev1Status('Not Requested');
    setFormRev1Remarks('');
    setFormRev1Date('');
    setFormRev2Status('Not Requested');
    setFormRev2Remarks('');
    setFormRev2Date('');
    setFormRev3Status('Not Requested');
    setFormRev3Remarks('');
    setFormRev3Date('');
    
    setShowAddModal(false);
  };

  const handleDeleteClient = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this drawing client account record?');
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'drawing_clients', id));
    } catch (e) {
      console.error(e);
      const filtered = drawingClients.filter(c => c.id !== id);
      await saveToFirestoreOrLocal(filtered);
    }
  };

  const handleOpenEditModal = (client: DrawingClient) => {
    setEditingClient(client);
    setEditName(client.clientName);
    setEditAddress(client.clientAddress);
    setEditPhone(client.clientPhone || '');
    setEditService(client.serviceType);
    setEditValue(client.contractValue);
    setEditPaid(client.amountPaid);
    setEditStep(client.currentStep);
    setEditNextAction(client.nextAction);
    setEditTargetDate(client.targetDate || '2026-06-15');
    setEditNotes(client.notes || '');
    
    setEditDrawingStatus(client.drawingStatus || 'Drafting');
    setEditDrawingRemarks(client.drawingRemarks || '');
    setEditRev1Status(client.rev1Status || 'Not Requested');
    setEditRev1Remarks(client.rev1Remarks || '');
    setEditRev1Date(client.rev1Date || '');
    setEditRev2Status(client.rev2Status || 'Not Requested');
    setEditRev2Remarks(client.rev2Remarks || '');
    setEditRev2Date(client.rev2Date || '');
    setEditRev3Status(client.rev3Status || 'Not Requested');
    setEditRev3Remarks(client.rev3Remarks || '');
    setEditRev3Date(client.rev3Date || '');
    
    setShowEditModal(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editName || !editAddress) return;

    const updatedClient: DrawingClient = {
      ...editingClient,
      clientName: editName,
      clientAddress: editAddress,
      clientPhone: editPhone,
      serviceType: editService,
      contractValue: Number(editValue),
      amountPaid: Number(editPaid),
      currentStep: editStep,
      nextAction: editNextAction,
      targetDate: editTargetDate,
      notes: editNotes,
      
      drawingStatus: editDrawingStatus,
      drawingRemarks: editDrawingRemarks,
      rev1Status: editRev1Status,
      rev1Remarks: editRev1Remarks,
      rev1Date: editRev1Date,
      rev2Status: editRev2Status,
      rev2Remarks: editRev2Remarks,
      rev2Date: editRev2Date,
      rev3Status: editRev3Status,
      rev3Remarks: editRev3Remarks,
      rev3Date: editRev3Date
    };

    const updated = drawingClients.map(c => c.id === editingClient.id ? updatedClient : c);
    await saveToFirestoreOrLocal(updated, updatedClient);

    setShowEditModal(false);
    setEditingClient(null);
  };

  const handleUpdatePayment = async (client: DrawingClient, newPaid: number) => {
    const updatedClient = { ...client, amountPaid: newPaid };
    const updatedList = drawingClients.map(c => c.id === client.id ? updatedClient : c);
    await saveToFirestoreOrLocal(updatedList, updatedClient);
  };

  const handleUpdateStep = async (client: DrawingClient, step: DrawingClient['currentStep']) => {
    const updatedClient = { ...client, currentStep: step };
    const updatedList = drawingClients.map(c => c.id === client.id ? updatedClient : c);
    await saveToFirestoreOrLocal(updatedList, updatedClient);
  };

  // Helper formatting
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Metrics
  const totalContracts = drawingClients.reduce((sum, c) => sum + c.contractValue, 0);
  const totalPaid = drawingClients.reduce((sum, c) => sum + c.amountPaid, 0);
  const totalBalance = totalContracts - totalPaid;

  const exportToSheetsCSV = () => {
    const headers = ['Client Design Code', 'Client Name', 'Address', 'Contact', 'Design Plan Type', 'Total Contract Value', 'Amount Paid', 'Active Milestone Stage', 'Immediate Objective Task', 'Target Date'];
    
    const rows = drawingClients.map(c => [
      `"${(c.billingRef || `DWG-${c.id.slice(-4).toUpperCase()}`).replace(/"/g, '""')}"`,
      `"${c.clientName.replace(/"/g, '""')}"`,
      `"${c.clientAddress.replace(/"/g, '""')}"`,
      `"${c.clientPhone}"`,
      `"${c.serviceType}"`,
      c.contractValue,
      c.amountPaid,
      `"${c.currentStep}"`,
      `"${c.nextAction.replace(/"/g, '""')}"`,
      `"${c.targetDate}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'RL_Design_Drawings_Clients_GoogleSheets.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportClientToPDF = (client: DrawingClient) => {
    const doc = new jsPDF('p', 'mm', 'letter');
    
    // 1. HEADER (Charcoal Dark Background matching the user's uploaded logo exactly)
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

    // Right Side Document Header Text aligned perfectly
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('BLUEPRINT DESIGN SPECIFICATION', 202, 13, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Reference ID: ${client.billingRef || `DWG-${client.id.slice(-4).toUpperCase()}`}`, 202, 18, { align: 'right' });
    doc.text(`Date Exported: ${new Date().toLocaleDateString()}`, 202, 22, { align: 'right' });
    
    doc.setFontSize(7);
    doc.setTextColor(229, 192, 96); // Golden Touch
    doc.text('Block 25 Lot 14, Tierra Vista, Santiago, General Trias, Cavite', 202, 27, { align: 'right' });

    // Elegant gold bottom border acting as baseline border on the header
    doc.setDrawColor(229, 192, 96);
    doc.setLineWidth(1.2);
    doc.line(0, 40, 216, 40);

    // 2. CLIENT & PROJECT METRICS SECTION
    let y = 50;
    
    // Draw section box for client info
    doc.setFillColor(248, 250, 252); // light slate gray bg
    doc.rect(14, y, 188, 30, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(14, y, 188, 30, 'D');

    // Detail texts inside the box
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('CLIENT & BLUEPRINT DESIGN SERVICE SUMMARY', 18, y + 6);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600
    
    doc.text(`Client Representative:`, 18, y + 13);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(client.clientName, 50, y + 13);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Delivery Address:`, 18, y + 19);
    doc.text(client.clientAddress, 50, y + 19);
    
    doc.text(`Contact Number:`, 18, y + 25);
    doc.text(client.clientPhone || 'N/A', 50, y + 25);

    // Right Column in details panel
    doc.setTextColor(71, 85, 105);
    doc.text(`Contracted Plan Type:`, 122, y + 13);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(229, 192, 96); // gold touch
    doc.text(client.serviceType, 155, y + 13);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Active Milestone:`, 122, y + 19);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(client.currentStep, 155, y + 19);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Estimated Target:`, 122, y + 25);
    doc.setTextColor(15, 23, 42);
    doc.text(client.targetDate, 155, y + 25);

    // 3. FINANCIAL PANEL
    y += 35;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 188, 14, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, 188, 14, 'D');

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    
    doc.text('Total Valuation Price:', 18, y + 9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(client.contractValue), 50, y + 9);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Collected Paid Value:', 84, y + 9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(22, 163, 74); // green-600
    doc.text(formatCurrency(client.amountPaid), 116, y + 9);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Outstanding Balance:', 148, y + 9);
    doc.setFont('Helvetica', 'bold');
    const balance = client.contractValue - client.amountPaid;
    doc.setTextColor(balance > 0 ? 225 : 71, balance > 0 ? 29 : 85, balance > 0 ? 72 : 105); // Red if balance
    doc.text(formatCurrency(balance), 178, y + 9);

    // 4. DRAWING STATUS & REMARKS EXPLICIT SECTION
    y += 20;
    doc.setDrawColor(229, 192, 96);
    doc.setLineWidth(0.8);
    // Draw an elegant gold colored small vertical accent bar next to section title
    doc.line(14, y, 14, y + 6);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('BLUEPRINT DESIGN EXECUTION STATUS', 18, y + 5);

    y += 9;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 188, 24, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(14, y, 188, 24, 'D');

    // Drawing Status Status Badge-like render
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Active Drawing State:', 18, y + 9);
    
    doc.setFillColor(254, 243, 199); // light yellow tint
    doc.rect(50, y + 5, 45, 6, 'F');
    doc.setTextColor(146, 64, 14); // amber-800
    doc.setFontSize(7.5);
    doc.text(client.drawingStatus || 'Drafting', 53, y + 9.5);

    // Immediate action task
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Immediate Action Prep:', 102, y + 9);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(client.nextAction || 'None logged', 138, y + 9);

    // Drawing general Remarks
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Drawing Status Remarks:', 18, y + 17);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(client.drawingRemarks || 'No active design notes logged.', 53, y + 17);

    // 5. 3-SESSION REVISION TIMELINE HISTORY
    y += 30;
    doc.setDrawColor(229, 192, 96);
    doc.setLineWidth(0.8);
    doc.line(14, y, 14, y + 6);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('BLUEPRINT CONTRACT REVISIONS LOG (MAX 3 SESSIONS ALLOWED)', 18, y + 5);

    y += 9;
    // Draw clean table for the 3 revisions
    doc.setFillColor(241, 245, 249); // table heading bg
    doc.rect(14, y, 188, 7, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, 188, 7, 'D');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('REVISION NUMBER', 18, y + 5);
    doc.text('DESIGN LOG STATUS', 65, y + 5);
    doc.text('COMPLETION DATE', 115, y + 5);
    doc.text('REMARKS / ACTION CORRECTIONS', 145, y + 5);

    // Row 1: Revision 1
    y += 7;
    doc.rect(14, y, 188, 10, 'D');
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Revision Session 1 (Rev 01)', 18, y + 6.5);
    doc.text(client.rev1Status || 'Not Requested', 65, y + 6.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(client.rev1Date || 'Not specified', 115, y + 6.5);
    doc.text(client.rev1Remarks || 'No remarks specified or requested.', 145, y + 6.5);

    // Row 2: Revision 2
    y += 10;
    doc.rect(14, y, 188, 10, 'D');
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Revision Session 2 (Rev 02)', 18, y + 6.5);
    doc.text(client.rev2Status || 'Not Requested', 65, y + 6.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(client.rev2Date || 'Not specified', 115, y + 6.5);
    doc.text(client.rev2Remarks || 'No remarks specified or requested.', 145, y + 6.5);

    // Row 3: Revision 3
    y += 10;
    doc.rect(14, y, 188, 10, 'D');
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Revision Session 3 (Rev 03)', 18, y + 6.5);
    doc.text(client.rev3Status || 'Not Requested', 65, y + 6.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(client.rev3Date || 'Not specified', 115, y + 6.5);
    doc.text(client.rev3Remarks || 'No remarks specified or requested.', 145, y + 6.5);

    // 6. BOTTOM LEGAL COMPLIANCE FOOTER & SIGNATURE SECTIONS
    y = 202;
    
    // Draw sign off lines
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(18, y + 12, 80, y + 12);
    doc.line(136, y + 12, 198, y + 12);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('PREPARED BY: LEAD DESIGNER / ARCHITECT', 18, y + 16);
    doc.text('RL CONSTRUCTION AUDITING SUITE', 18, y + 20);
    
    doc.text('CLIENT SIGN-OFF REPRESENTATIVE', 136, y + 16);
    doc.text('CONFIRMING BLUEPRINT REVISION SLIP', 136, y + 20);

    // Terms section
    y += 28;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 188, 13, 'F');
    doc.rect(14, y, 188, 13, 'D');
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('TERMS & COMPLIANCE: The architectural, structural, and electrical drafts listed herein are subjects to maximum structural changes detailed', 18, y + 4.5);
    doc.text('under the design contract agreement. Any modification exceeding the 3 maximum requested revisions entails separate layout assessment fees.', 18, y + 8.5);

    // Save PDF file
    const safeName = client.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`RL_CON_Blueprint_Slip_${safeName}.pdf`);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <Compass className="w-5 h-5 text-yellow-500" />
            Drawing & Layout Design Service
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Dedicated workflow tracking payments, draft blueprint progressions, and next structural permit steps for design-only clients.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToSheetsCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download Drawings Tracker to CSV ready for Google Sheets/Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Sheets</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black uppercase text-[10px] tracking-wider px-4 py-3 rounded-xl border border-yellow-400 hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Drawing Client File
          </button>
        </div>
      </div>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Accumulated Design Portfolio</p>
          <p className="text-lg font-black text-slate-900 mt-1">{formatCurrency(totalContracts)}</p>
          <div className="text-[9px] text-slate-400 mt-0.5 font-medium">Sum of blueprints & layout contract documents</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Realized Collected Income</p>
          <p className="text-lg font-black text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p>
          <div className="text-[9px] text-slate-400 mt-0.5 font-medium">Payments certified down-payments or drafts values</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Design-stage Accounts Receivables</p>
          <p className="text-lg font-black text-rose-500 mt-1">{formatCurrency(totalBalance)}</p>
          <div className="text-[9px] text-slate-400 mt-0.5 font-medium">Outstanding payments and blueprint final balances</div>
        </div>
      </div>

      {/* Roster of drafting clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {drawingClients.length > 0 ? (
          drawingClients.map((client) => {
            const balance = client.contractValue - client.amountPaid;
            const percentCollected = client.contractValue ? Math.round((client.amountPaid / client.contractValue) * 100) : 0;

            return (
              <motion.div
                layout
                key={client.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 space-y-4"
              >
                {/* Header card details */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 bg-yellow-400/10 text-yellow-800 font-extrabold text-[9px] uppercase tracking-wider rounded">
                      🎨 {client.serviceType}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">{client.clientName}</h3>
                    <div className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {client.clientAddress}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => exportClientToPDF(client)}
                      className="p-1.5 hover:bg-red-50 text-slate-350 hover:text-red-650 rounded-lg transition-colors cursor-pointer"
                      title="Download Blueprint Specification PDF Slip"
                    >
                      <Download className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(client)}
                      className="p-1.5 hover:bg-amber-50 text-slate-350 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                      title="Edit / Revise Design Client File"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-350 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Delete record card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-b border-slate-100 py-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Valuation</span>
                    <p className="text-xs font-bold text-slate-900 font-mono mt-0.5">{formatCurrency(client.contractValue)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Collected</span>
                    <p className="text-xs font-bold text-emerald-600 font-mono mt-0.5">{formatCurrency(client.amountPaid)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-405 text-slate-400 uppercase">Balance</span>
                    <p className={`text-xs font-bold font-mono mt-0.5 ${balance > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {formatCurrency(balance)}
                    </p>
                  </div>
                </div>

                {/* Progress Tracking Sliders / Select */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>Active Plan Milestone Stage</span>
                    <span className="text-yellow-600 font-bold">{percentCollected}% Paid</span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-yellow-500 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${percentCollected}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Update Drawing Status</span>
                      <select
                        value={client.currentStep}
                        onChange={(e) => handleUpdateStep(client, e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-[10px] cursor-pointer text-slate-700 focus:bg-white"
                      >
                        <option value="Initial Consult">💬 Initial Consult</option>
                        <option value="Concept Proposal">📝 Concept Proposal</option>
                        <option value="Schematic Drafting">📐 Schematic Drafting</option>
                        <option value="Rendering Phase">⚡ Rendering Phase</option>
                        <option value="Final Notarization">🏛️ Notarization / Stamp</option>
                        <option value="Completed & Handed-over">✓ Completed</option>
                      </select>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Log Additional Payment</span>
                      <input
                        type="number"
                        placeholder="Update total paid value"
                        value={client.amountPaid}
                        onChange={(e) => handleUpdatePayment(client, Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono text-[10px] font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Next Milestone task action details */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <BadgeAlert className="w-3.5 h-3.5 text-yellow-600" />
                      Next Objective Action
                    </span>
                    <span className="flex items-center gap-0.5 text-[9px] text-slate-400 capitalize">
                      <CalendarDays className="w-3 h-3" />
                      by {client.targetDate}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                    {client.nextAction}
                  </p>
                </div>

                {/* Drawing Status, Remarks & 3 Revisions section */}
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-yellow-500/[0.04] p-2.5 rounded-lg border border-yellow-500/10">
                    <div className="text-[10px] font-extrabold uppercase text-slate-500 flex items-center gap-1">
                      <span>📐 Drawing Exec Status:</span>
                    </div>
                    <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-800 border border-yellow-500/30 rounded text-[9px] font-extrabold uppercase tracking-wider">
                      {client.drawingStatus || 'Drafting'}
                    </span>
                  </div>
                  
                  {client.drawingRemarks ? (
                    <div className="text-[10.5px] text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      <span className="font-extrabold text-slate-800 text-[9px] block mb-0.5 uppercase tracking-wider not-italic">Drawing Remarks:</span>
                      "{client.drawingRemarks}"
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 bg-slate-50/55 p-2 rounded-lg border border-dashed border-slate-150 text-center">
                      No additional drawing remarks added yet.
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block font-mono">
                      Design Session Revisions Timeline (Max 3)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Revision 1 */}
                      <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 text-center flex flex-col justify-between min-h-[95px] hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-tight">REV 01</p>
                          <span className={`inline-block my-1 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-tight ${
                            client.rev1Status === 'Completed & Merged' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            client.rev1Status === 'In Progress' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            client.rev1Status === 'Awaiting Client Review' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {client.rev1Status || 'Not Requested'}
                          </span>
                        </div>
                        <div className="space-y-0.5 mt-1 pt-1.5 border-t border-slate-100 text-left">
                          <p className="text-[7.5px] text-slate-400 font-bold">{client.rev1Date || 'No Date Specified'}</p>
                          <p className="text-[8.5px] text-slate-500 leading-snug line-clamp-2" title={client.rev1Remarks || 'None specified'}>
                            {client.rev1Remarks || 'None specified'}
                          </p>
                        </div>
                      </div>

                      {/* Revision 2 */}
                      <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 text-center flex flex-col justify-between min-h-[95px] hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-tight">REV 02</p>
                          <span className={`inline-block my-1 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-tight ${
                            client.rev2Status === 'Completed & Merged' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            client.rev2Status === 'In Progress' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            client.rev2Status === 'Awaiting Client Review' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {client.rev2Status || 'Not Requested'}
                          </span>
                        </div>
                        <div className="space-y-0.5 mt-1 pt-1.5 border-t border-slate-100 text-left">
                          <p className="text-[7.5px] text-slate-400 font-bold">{client.rev2Date || 'No Date Specified'}</p>
                          <p className="text-[8.5px] text-slate-500 leading-snug line-clamp-2" title={client.rev2Remarks || 'None specified'}>
                            {client.rev2Remarks || 'None specified'}
                          </p>
                        </div>
                      </div>

                      {/* Revision 3 */}
                      <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 text-center flex flex-col justify-between min-h-[95px] hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-tight">REV 03</p>
                          <span className={`inline-block my-1 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-tight ${
                            client.rev3Status === 'Completed & Merged' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            client.rev3Status === 'In Progress' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            client.rev3Status === 'Awaiting Client Review' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {client.rev3Status || 'Not Requested'}
                          </span>
                        </div>
                        <div className="space-y-0.5 mt-1 pt-1.5 border-t border-slate-100 text-left">
                          <p className="text-[7.5px] text-slate-400 font-bold">{client.rev3Date || 'No Date Specified'}</p>
                          <p className="text-[8.5px] text-slate-500 leading-snug line-clamp-2" title={client.rev3Remarks || 'None specified'}>
                            {client.rev3Remarks || 'None specified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="md:col-span-2 text-center py-12 bg-white rounded-3xl border border-slate-150 text-slate-400 italic font-medium">
            No drawing-only clients listed yet. Use "Add Drawing Client" row above to add design files.
          </div>
        )}
      </div>

      {/* Dynamic Modal Form to Register Drawing Client */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-xl w-full p-6 relative z-10 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between font-sans">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Compass className="w-5 h-5 text-yellow-500" />
                  Register Design Service File
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="space-y-4 font-sans text-xs pr-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Client Representative Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sheena Mae Serrano"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Client Delivery Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="Block 25 Lot 14, Tierra Vista, Cavite"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Contact Mobile Number</label>
                    <input
                      type="text"
                      placeholder="+63-917-555-4011"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Design Plan Contract Type</label>
                    <select
                      value={formService}
                      onChange={(e) => setFormService(e.target.value as any)}
                      className="w-full bg-slate-50 border rounded-lg px-2.5 py-2 cursor-pointer text-slate-700"
                    >
                      <option value="Architectural Drafting">Architectural Concept Drafting</option>
                      <option value="3D Render & Interior">3D Interior & External Renderings</option>
                      <option value="Structural Blueprint Package">Structural Signed Blueprint Package</option>
                      <option value="Full Permit Drawings">Full Permit Blueprint Release Package</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500">Contract Plan Value (₱) *</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={formValue}
                      onChange={(e) => setFormValue(Number(e.target.value))}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500">Deposit Paid Value (₱)</label>
                    <input
                      type="number"
                      value={formPaid}
                      onChange={(e) => setFormPaid(Number(e.target.value))}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 font-mono"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500">Initial Drawing Status Milestone</label>
                    <select
                      value={formStep}
                      onChange={(e) => setFormStep(e.target.value as any)}
                      className="w-full bg-slate-50 border rounded-lg px-2.5 py-2 cursor-pointer"
                    >
                      <option value="Initial Consult">Initial Design Consultation</option>
                      <option value="Concept Proposal">Design Concept Proposal</option>
                      <option value="Schematic Drafting">2D AutoCAD Drafting Phase</option>
                      <option value="Rendering Phase">3D Lumion / Max rendering phase</option>
                      <option value="Final Notarization">Architect/Engineer Signing & Stamps</option>
                      <option value="Completed & Handed-over">Completed & Handed Over</option>
                    </select>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500">Immediate Action Task Required</label>
                    <textarea
                      rows={2}
                      value={formNextAction}
                      onChange={(e) => setFormNextAction(e.target.value)}
                      className="w-full bg-slate-50 border rounded-lg p-2.5 text-slate-800 leading-snug focus:outline-hidden focus:border-yellow-500"
                    />
                  </div>

                  {/* Drawing Specifications & Revisions logs section */}
                  <div className="col-span-2 border-t border-slate-100 pt-3 mt-1 space-y-3">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest block font-mono">
                      Drawing Specifications & Revisions Logs
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-slate-500">Active Drawing Status</label>
                        <select
                          value={formDrawingStatus}
                          onChange={(e) => setFormDrawingStatus(e.target.value)}
                          className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-yellow-500 cursor-pointer text-slate-700"
                        >
                          <option value="Drafting">Drafting</option>
                          <option value="Under Revision">Under Revision</option>
                          <option value="Awaiting Client Review">Awaiting Client Review</option>
                          <option value="Approved for Printing">Approved for Printing</option>
                          <option value="Revision Requested">Revision Requested</option>
                          <option value="Print Release Done">Print Release Done</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-slate-500">Drawing General Remarks</label>
                        <input
                          type="text"
                          placeholder="e.g. Columns alignment changed"
                          value={formDrawingRemarks}
                          onChange={(e) => setFormDrawingRemarks(e.target.value)}
                          className="w-full bg-slate-50 border rounded-lg px-3 py-1.5 text-slate-800 focus:outline-hidden focus:border-yellow-500"
                        />
                      </div>
                    </div>

                    {/* Timeline logs form */}
                    <div className="space-y-3 bg-slate-550/15 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Revision History Sessions (Max 3 Revisions)</p>
                      
                      {/* Revision 1 Row */}
                      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-200">
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 01 STATUS</label>
                          <select
                            value={formRev1Status}
                            onChange={(e) => setFormRev1Status(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-1 text-[9px] font-bold focus:outline-hidden focus:border-yellow-500"
                          >
                            <option value="Not Requested">Not Requested</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Awaiting Client Review">Awaiting Client</option>
                            <option value="Completed & Merged">Completed & Merged</option>
                          </select>
                        </div>
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 01 DATE</label>
                          <input
                            type="date"
                            value={formRev1Date}
                            onChange={(e) => setFormRev1Date(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-0.5 text-[9px] focus:outline-hidden focus:border-yellow-500"
                          />
                        </div>
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 01 REMARKS</label>
                          <input
                            type="text"
                            placeholder="Initial feedback remarks"
                            value={formRev1Remarks}
                            onChange={(e) => setFormRev1Remarks(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-0.5 text-[9px] focus:outline-hidden focus:border-yellow-500"
                          />
                        </div>
                      </div>

                      {/* Revision 2 Row */}
                      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-200">
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 02 STATUS</label>
                          <select
                            value={formRev2Status}
                            onChange={(e) => setFormRev2Status(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-1 text-[9px] font-bold focus:outline-hidden focus:border-yellow-500"
                          >
                            <option value="Not Requested">Not Requested</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Awaiting Client Review">Awaiting Client</option>
                            <option value="Completed & Merged">Completed & Merged</option>
                          </select>
                        </div>
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 02 DATE</label>
                          <input
                            type="date"
                            value={formRev2Date}
                            onChange={(e) => setFormRev2Date(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-0.5 text-[9px] focus:outline-hidden focus:border-yellow-500"
                          />
                        </div>
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 02 REMARKS</label>
                          <input
                            type="text"
                            placeholder="Overhang modifications"
                            value={formRev2Remarks}
                            onChange={(e) => setFormRev2Remarks(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-0.5 text-[9px] focus:outline-hidden focus:border-yellow-500"
                          />
                        </div>
                      </div>

                      {/* Revision 3 Row */}
                      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-200">
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 03 STATUS</label>
                          <select
                            value={formRev3Status}
                            onChange={(e) => setFormRev3Status(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-1 text-[9px] font-bold focus:outline-hidden focus:border-yellow-500"
                          >
                            <option value="Not Requested">Not Requested</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Awaiting Client Review">Awaiting Client</option>
                            <option value="Completed & Merged">Completed & Merged</option>
                          </select>
                        </div>
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 03 DATE</label>
                          <input
                            type="date"
                            value={formRev3Date}
                            onChange={(e) => setFormRev3Date(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-0.5 text-[9px] focus:outline-hidden focus:border-yellow-500"
                          />
                        </div>
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 03 REMARKS</label>
                          <input
                            type="text"
                            placeholder="Stamping approval notes"
                            value={formRev3Remarks}
                            onChange={(e) => setFormRev3Remarks(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-0.5 text-[9px] focus:outline-hidden focus:border-yellow-500"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-yellow-500 hover:bg-yellow-605 text-slate-950 font-bold rounded-xl border border-yellow-400 cursor-pointer shadow-xs"
                  >
                    Create Design File
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Revision / Edit Modal Form to Revise Drawing Client File */}
      <AnimatePresence>
        {showEditModal && editingClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEditModal(false);
                setEditingClient(null);
              }}
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-xl w-full p-6 relative z-10 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between font-sans">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Edit className="w-5 h-5 text-yellow-500" />
                  Revise Design Service File
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClient(null);
                  }}
                  className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateClient} className="space-y-4 font-sans text-xs pr-1">
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Client Representative Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sheena Mae Serrano"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Client Delivery Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="Block 25 Lot 14, Tierra Vista, Cavite"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Contact Mobile Number</label>
                    <input
                      type="text"
                      placeholder="+63-917-555-4011"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Design Plan Contract Type</label>
                    <select
                      value={editService}
                      onChange={(e) => setEditService(e.target.value as any)}
                      className="w-full bg-slate-50 border rounded-lg px-2.5 py-2 cursor-pointer text-slate-700 focus:outline-hidden focus:border-yellow-500"
                    >
                      <option value="Architectural Drafting">Architectural Concept Drafting</option>
                      <option value="3D Render & Interior">3D Interior & External Renderings</option>
                      <option value="Structural Blueprint Package">Structural Signed Blueprint Package</option>
                      <option value="Full Permit Drawings">Full Permit Blueprint Release Package</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500">Contract Plan Value (₱) *</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={editValue}
                      onChange={(e) => setEditValue(Number(e.target.value))}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 font-mono focus:outline-hidden focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500">Deposit Paid Value (₱)</label>
                    <input
                      type="number"
                      value={editPaid}
                      onChange={(e) => setEditPaid(Number(e.target.value))}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 font-mono focus:outline-hidden focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500">Active Drawing Status Milestone</label>
                    <select
                      value={editStep}
                      onChange={(e) => setEditStep(e.target.value as any)}
                      className="w-full bg-slate-50 border rounded-lg px-2.5 py-2 cursor-pointer focus:outline-hidden focus:border-yellow-500"
                    >
                      <option value="Initial Consult">Initial Design Consultation</option>
                      <option value="Concept Proposal">Design Concept Proposal</option>
                      <option value="Schematic Drafting">2D AutoCAD Drafting Phase</option>
                      <option value="Rendering Phase">3D Lumion / Max rendering phase</option>
                      <option value="Final Notarization">Architect/Engineer Signing & Stamps</option>
                      <option value="Completed & Handed-over">Completed & Handed Over</option>
                    </select>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500">Immediate Action Task Required</label>
                    <textarea
                      rows={2}
                      value={editNextAction}
                      onChange={(e) => setEditNextAction(e.target.value)}
                      className="w-full bg-slate-50 border rounded-lg p-2.5 text-slate-800 leading-snug focus:outline-hidden focus:border-yellow-500"
                    />
                  </div>

                  {/* Drawing Specifications & Revisions logs section */}
                  <div className="col-span-2 border-t border-slate-100 pt-3 mt-1 space-y-3">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest block font-mono">
                      Drawing Specifications & Revisions Logs
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-slate-500">Active Drawing Status</label>
                        <select
                          value={editDrawingStatus}
                          onChange={(e) => setEditDrawingStatus(e.target.value)}
                          className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-yellow-500 cursor-pointer text-slate-700"
                        >
                          <option value="Drafting">Drafting</option>
                          <option value="Under Revision">Under Revision</option>
                          <option value="Awaiting Client Review">Awaiting Client Review</option>
                          <option value="Approved for Printing">Approved for Printing</option>
                          <option value="Revision Requested">Revision Requested</option>
                          <option value="Print Release Done">Print Release Done</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-slate-500">Drawing General Remarks</label>
                        <input
                          type="text"
                          placeholder="e.g. Columns alignment changed"
                          value={editDrawingRemarks}
                          onChange={(e) => setEditDrawingRemarks(e.target.value)}
                          className="w-full bg-slate-50 border rounded-lg px-3 py-1.5 text-slate-800 focus:outline-hidden focus:border-yellow-500"
                        />
                      </div>
                    </div>

                    {/* Timeline logs form */}
                    <div className="space-y-3 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Revision History Sessions (Max 3 Revisions)</p>
                      
                      {/* Revision 1 Row */}
                      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-200">
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 01 STATUS</label>
                          <select
                            value={editRev1Status}
                            onChange={(e) => setEditRev1Status(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-1 text-[9px] font-bold focus:outline-hidden focus:border-yellow-500"
                          >
                            <option value="Not Requested">Not Requested</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Awaiting Client Review">Awaiting Client</option>
                            <option value="Completed & Merged">Completed & Merged</option>
                          </select>
                        </div>
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 01 DATE</label>
                          <input
                            type="date"
                            value={editRev1Date}
                            onChange={(e) => setEditRev1Date(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-0.5 text-[9px] focus:outline-hidden focus:border-yellow-500"
                          />
                        </div>
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 01 REMARKS</label>
                          <input
                            type="text"
                            placeholder="Initial feedback remarks"
                            value={editRev1Remarks}
                            onChange={(e) => setEditRev1Remarks(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-0.5 text-[9px] focus:outline-hidden focus:border-yellow-500"
                          />
                        </div>
                      </div>

                      {/* Revision 2 Row */}
                      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-200">
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 02 STATUS</label>
                          <select
                            value={editRev2Status}
                            onChange={(e) => setEditRev2Status(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-1 text-[9px] font-bold focus:outline-hidden focus:border-yellow-500"
                          >
                            <option value="Not Requested">Not Requested</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Awaiting Client Review">Awaiting Client</option>
                            <option value="Completed & Merged">Completed & Merged</option>
                          </select>
                        </div>
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 02 DATE</label>
                          <input
                            type="date"
                            value={editRev2Date}
                            onChange={(e) => setEditRev2Date(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-0.5 text-[9px] focus:outline-hidden focus:border-yellow-500"
                          />
                        </div>
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 02 REMARKS</label>
                          <input
                            type="text"
                            placeholder="Overhang modifications"
                            value={editRev2Remarks}
                            onChange={(e) => setEditRev2Remarks(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-0.5 text-[9px] focus:outline-hidden focus:border-yellow-500"
                          />
                        </div>
                      </div>

                      {/* Revision 3 Row */}
                      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-200">
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 03 STATUS</label>
                          <select
                            value={editRev3Status}
                            onChange={(e) => setEditRev3Status(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-1 text-[9px] font-bold focus:outline-hidden focus:border-yellow-500"
                          >
                            <option value="Not Requested">Not Requested</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Awaiting Client Review">Awaiting Client</option>
                            <option value="Completed & Merged">Completed & Merged</option>
                          </select>
                        </div>
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 03 DATE</label>
                          <input
                            type="date"
                            value={editRev3Date}
                            onChange={(e) => setEditRev3Date(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-0.5 text-[9px] focus:outline-hidden focus:border-yellow-500"
                          />
                        </div>
                        <div className="space-y-0.5 col-span-3 sm:col-span-1">
                          <label className="text-[8px] font-black text-slate-400 block uppercase">REV 03 REMARKS</label>
                          <input
                            type="text"
                            placeholder="Stamping approval notes"
                            value={editRev3Remarks}
                            onChange={(e) => setEditRev3Remarks(e.target.value)}
                            className="w-full bg-white border rounded px-1.5 py-0.5 text-[9px] focus:outline-hidden focus:border-yellow-500"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingClient(null);
                    }}
                    className="px-4 py-2 border rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold rounded-xl border border-yellow-400 cursor-pointer shadow-xs"
                  >
                    Save Changes
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
