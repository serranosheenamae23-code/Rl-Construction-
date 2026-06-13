import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConstructionSite, AdditionalScopeItem, UserRole } from '../types';
import { 
  PlusCircle, 
  Trash2, 
  Download, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Clipboard, 
  CheckCircle,
  FolderOpen,
  Clock
} from 'lucide-react';

interface AdditionalScopeTrackerProps {
  sites: ConstructionSite[];
  additionalScopes: AdditionalScopeItem[];
  onAddAdditionalScope: (scope: Omit<AdditionalScopeItem, 'id'>) => Promise<void>;
  onDeleteAdditionalScope: (id: string) => Promise<void>;
  currentRole: UserRole;
  assignedSiteId: string;
}

export default function AdditionalScopeTracker({
  sites,
  additionalScopes,
  onAddAdditionalScope,
  onDeleteAdditionalScope,
  currentRole,
  assignedSiteId
}: AdditionalScopeTrackerProps) {
  // Pre-filter site lists if Site Supervisor is logged in
  const availableSites = currentRole === 'Site Supervisor' 
    ? sites.filter(s => s.id === assignedSiteId)
    : sites;

  const [selectedSiteId, setSelectedSiteId] = useState<string>(() => {
    if (currentRole === 'Site Supervisor') return assignedSiteId;
    return availableSites[0]?.id || '';
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const selectedSite = sites.find(s => s.id === selectedSiteId);
  const activeScopes = additionalScopes.filter(item => item.siteId === selectedSiteId);
  const totalAmount = activeScopes.reduce((sum, item) => sum + item.amount, 0);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedSiteId) {
      setError('Please select a construction site first');
      return;
    }
    if (!description.trim()) {
      setError('Scope description is required');
      return;
    }
    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setError('Please enter a valid amount greater than zero');
      return;
    }

    try {
      await onAddAdditionalScope({
        siteId: selectedSiteId,
        date,
        description: description.trim(),
        amount: parsedAmt,
        approvedBy: approvedBy.trim() || 'Client (Approved)',
        notes: notes.trim()
      });

      // Clear Form
      setDescription('');
      setAmount('');
      setApprovedBy('');
      setNotes('');
      setShowAddModal(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save additional scope item');
    }
  };

  const handleExportPDF = () => {
    if (!selectedSite) return;

    const doc = new jsPDF('p', 'mm', 'a4'); // portrait A4
    
    // Header block
    doc.setFillColor(24, 28, 36); // Charcoal Black matching the user's uploaded logo textured background
    doc.rect(0, 0, 210, 38, 'F');

    // Elegant gold bottom border acting as baseline border on the header
    doc.setDrawColor(229, 192, 96); // Metallic Gold #E5C060
    doc.setLineWidth(1.2);
    doc.line(0, 38, 210, 38);
    
    const logoX = 14;
    const logoY = 6;
    
    // Vector logo drawing matching our standard RL CON brand representation
    doc.setDrawColor(229, 192, 96); // Premium Gold
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
    doc.setTextColor(203, 213, 225); // slate-300 / white-ish for high contrast
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

    // Right side brand highlight
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(229, 192, 96); // Premium Gold
    doc.text('ADDITIONAL SCOPE OF WORK STATEMENT', 196, 15, { align: 'right' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 196, 21, { align: 'right' });
    doc.text(`Site: ${selectedSite.name}`, 196, 25, { align: 'right' });
    doc.text('Famorca Construction Management', 196, 29, { align: 'right' });
    
    // Site Details Metadata Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, 44, 182, 34, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(14, 44, 182, 34, 'S');
    
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('CONSTRUCTION PROJECT SITE DETAILS:', 18, 51);
    doc.text('FINANCIAL EXTRAS SUMMARY:', 115, 51);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8.5);
    
    doc.text(`Site Name: ${selectedSite.name}`, 18, 57);
    doc.text(`Location: ${selectedSite.location}`, 18, 62);
    doc.text(`Supervisor: ${selectedSite.supervisorName}`, 18, 67);
    doc.text(`Base Budget: PHP ${selectedSite.projectValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 18, 72);
    
    doc.text(`Total Approved Additions: ${activeScopes.length} item(s)`, 115, 57);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(22, 101, 52); // green-800
    doc.text(`TOTAL ADDITIONAL VALUE: PHP ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 115, 64);
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.text(`NET ADJUSTED CONTRACT: PHP ${(selectedSite.projectValue + totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 115, 71);

    // Prepare table columns
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('APPROVED ADDITIONAL BILLABLE WORKS & VARIATIONS', 14, 88);

    const tableBody = activeScopes.map((scope, index) => [
      `#${index + 1}`,
      scope.date,
      scope.description,
      scope.approvedBy || 'Approved',
      scope.notes || '-',
      `PHP ${scope.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    ]);

    if (tableBody.length === 0) {
      tableBody.push([
        '-', 'No additional scopes recorded', '-', '-', '-', 'PHP 0.00'
      ]);
    }

    autoTable(doc, {
      startY: 93,
      head: [['#', 'Approved Date', 'Description of Additional Work', 'Approving Party', 'Remarks', 'Amount Approved']],
      body: tableBody,
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 55 },
        3: { cellWidth: 32 },
        4: { cellWidth: 30 },
        5: { halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] }
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        valign: 'middle'
      }
    });

    doc.save(`Approved_Additional_Scopes_${selectedSite.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Overview Block */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-1.5">
            <Clipboard className="w-5 h-5 text-yellow-500" />
            Approved Additional Scope of Work Tracker
          </h3>
          <p className="text-[11px] text-slate-500 font-medium pt-1 pb-0.5">
            Register and monitor approved variation orders, scope extensions, and excess client-billable adjustments per construction site.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">Target Site:</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-yellow-500 font-bold text-slate-700"
            >
              <option value="">-- Choose Construction Site --</option>
              {availableSites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {selectedSiteId && (
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-yellow-400 font-extrabold uppercase text-[10px] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-700 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download Statement PDF
            </button>
          )}

          {currentRole !== 'Client' && selectedSiteId && (
            <button
              type="button"
              onClick={() => {
                setDate(new Date().toISOString().split('T')[0]);
                setDescription('');
                setAmount('');
                setApprovedBy('');
                setNotes('');
                setError('');
                setShowAddModal(true);
              }}
              className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black uppercase text-[10px] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm border border-yellow-400 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Approved Scope
            </button>
          )}
        </div>
      </div>

      {selectedSiteId ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Site Financial Summary Cards */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 text-left">
              <h4 className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider">Project Contract Board</h4>
              
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Base Contract Value</span>
                  <span className="text-sm font-mono font-bold text-slate-700">
                    ₱{selectedSite?.projectValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 font-extrabold block uppercase">Approved Additional Scopes</span>
                  <span className="text-base font-mono font-extrabold text-emerald-600">
                    + ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-slate-100">
                  <span className="text-[10px] text-slate-900 font-extrabold uppercase block">Adjusted Project Value</span>
                  <span className="text-lg font-mono font-black text-slate-900 block">
                    ₱{((selectedSite?.projectValue || 0) + totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-2.5 text-left">
              <div className="flex items-center gap-1.5 font-bold text-yellow-400 text-[10px] uppercase tracking-wider">
                <CheckCircle className="w-3.5 h-3.5" /> Approved Scope Policy
              </div>
              <p className="text-[10.5px] text-slate-300 leading-relaxed font-medium">
                Only additional scopes with client-signed variation approvals or signed project site directives must be logged in this ledger panel to qualify as a valid billing adjustment.
              </p>
            </div>
          </div>

          {/* Table & Timeline Column container */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-left flex flex-col justify-between min-h-[300px]">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">Approved Variation Ledger</h4>
                  <span className="bg-slate-100 text-slate-700 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full">
                    {activeScopes.length} registered item(s)
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-slate-700 text-left">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider">
                        <th className="p-3">Approved Date</th>
                        <th className="p-3">Description of Approved Scope Of Work</th>
                        <th className="p-3">Approved By</th>
                        <th className="p-3">Remarks / Notes</th>
                        <th className="p-3 text-right">Amount Approved</th>
                        {currentRole !== 'Client' && <th className="p-3 text-center">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium bg-white">
                      {activeScopes.length > 0 ? (
                        activeScopes.map((scope) => (
                          <tr key={scope.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-[11px] text-slate-500 whitespace-nowrap">
                              {scope.date}
                            </td>
                            <td className="p-3 font-semibold text-slate-900 max-w-[280px] break-words">
                              {scope.description}
                            </td>
                            <td className="p-3 text-slate-600">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase rounded">
                                {scope.approvedBy || 'Approved'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-450 text-[11px] italic max-w-[150px] truncate" title={scope.notes}>
                              {scope.notes || '-'}
                            </td>
                            <td className="p-3 font-mono font-black text-emerald-600 text-right whitespace-nowrap">
                              ₱{scope.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            {currentRole !== 'Client' && (
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this Approved Additional Scope item?")) {
                                      onDeleteAdditionalScope(scope.id);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Remove approved scope assignment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={currentRole === 'Client' ? 5 : 6} className="p-12 text-center text-slate-450 italic leading-relaxed">
                            No approved additional scopes of work recorded for this construction project.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Timeline View Container */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    Site Variation Timeline & TCP Escalation
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Chronological track of project contract value shifts computed dynamically over approved site directives</p>
                </div>
                <span className="bg-slate-900 text-white text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-slate-750 self-start sm:self-auto">
                  Base TCP: ₱{(selectedSite?.projectValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {activeScopes.length > 0 ? (
                (() => {
                  const sortedTimelineScopes = [...activeScopes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  let runningTotal = 0;

                  return (
                    <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-6 py-2">
                      <div className="absolute top-0 bottom-0 left-[-2px] w-0.5 bg-slate-200" />
                      
                      {/* Base Initial Stage Node */}
                      <div className="relative">
                        <span className="absolute -left-[31px] top-1.5 bg-slate-400 w-3 h-3 rounded-full border-2 border-white ring-4 ring-slate-100" />
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl max-w-2xl text-xs space-y-1">
                          <div className="flex justify-between items-center text-slate-450 font-bold uppercase tracking-wider text-[9px] font-mono">
                            <span>Project Commencement / Down Payment</span>
                            <span>{selectedSite?.startDate || 'Initial Date'}</span>
                          </div>
                          <p className="font-bold text-slate-800">Original Project Scope & Contract Activation</p>
                          <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                            <span className="text-[10px] text-slate-450 uppercase font-bold">Base Contract TCP:</span>
                            <span className="font-mono font-black text-slate-900 text-[11px]">
                              ₱{(selectedSite?.projectValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cumulative Scope Nodes */}
                      {sortedTimelineScopes.map((scope, idx) => {
                        runningTotal += scope.amount;
                        const currentEscalationValue = (selectedSite?.projectValue || 0) + runningTotal;

                        return (
                          <div key={scope.id} className="relative">
                            {/* Color indicator for variations */}
                            <span className="absolute -left-[31px] top-1.5 bg-indigo-500 w-3 h-3 rounded-full border-2 border-white ring-4 ring-indigo-50" />
                            
                            <div className="bg-indigo-50/20 border border-indigo-150/40 p-4 rounded-xl max-w-2xl text-xs space-y-2.5">
                              {/* Meta information row */}
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="bg-indigo-100 text-indigo-800 text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono">
                                      Variation #{idx + 1}
                                    </span>
                                    <span className="text-slate-450 font-semibold text-[10px] font-mono">{scope.date}</span>
                                  </div>
                                  <h5 className="font-bold text-slate-900 mt-1 leading-snug">{scope.description}</h5>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[8px] font-extrabold uppercase text-indigo-500 block">Variation TCP</span>
                                  <span className="font-bold text-indigo-800 font-mono text-[11px] block">
                                    + ₱{scope.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>

                              {scope.notes && (
                                <p className="text-[10.5px] italic text-slate-500 bg-white/60 p-2 rounded border border-slate-100">
                                  &quot;{scope.notes}&quot;
                                </p>
                              )}

                              <div className="flex justify-between items-center text-[10px] text-slate-500">
                                <span className="font-medium">Approved By: <strong className="text-slate-700 uppercase">{scope.approvedBy || 'Site Representative'}</strong></span>
                              </div>

                              {/* Adjusted TCP Escalation math block */}
                              <div className="bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pt-2 font-mono">
                                <div className="text-[9px] text-indigo-600 block leading-tight">
                                  <span>₱{(selectedSite?.projectValue || 0).toLocaleString('en-US')} (Base) + ₱{runningTotal.toLocaleString('en-US')} (VO Total)</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[8px] font-bold text-indigo-400 uppercase mr-1.5 font-sans">Adjusted Total TCP:</span>
                                  <span className="font-black text-indigo-950 font-mono text-xs">
                                    ₱{currentEscalationValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      })}

                    </div>
                  );
                })()
              ) : (
                <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-1.5">
                  <Clock className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 uppercase font-extrabold tracking-wider">No Variation Timeline Logged</p>
                  <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                    Once you record approved variation orders and select scopes for this construction project, the custom timeline of cumulative contract additions and adjusted TCP escalations will build dynamically right here.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        <div className="bg-white p-16 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center space-y-4">
          <FolderOpen className="w-12 h-12 text-slate-300" />
          <h4 className="font-extrabold text-slate-900 uppercase text-xs">No Site Selected For Additional Work Monitoring</h4>
          <p className="text-[10.5px] text-slate-500 text-center max-w-sm">
            Please pick an active project from the dropdown in the header section above to load its approved variation records.
          </p>
        </div>
      )}

      {/* MODAL WINDOW: Add Approved Additional Scope */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
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
                  <h3 className="text-sm font-black uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                    <PlusCircle className="w-5 h-5" />
                    Record Approved Custom Scope
                  </h3>
                  <p className="text-[9px] text-slate-450 font-semibold font-mono">SITE: {selectedSite?.name.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4 font-sans text-xs">
                {error && (
                  <div className="p-3 bg-red-50 text-red-655 rounded-xl border border-red-155 font-bold leading-relaxed">
                    ⚠️ {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Approval Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold font-mono focus:border-yellow-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Scope Approved Value (₱)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 7500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-extrabold font-mono focus:border-yellow-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Description Of Custom Addition Scope</label>
                  <textarea
                    placeholder="e.g. Living room wall finishing alteration, layout adjustments as certified by client."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-yellow-500 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Approving Authority (Client / rep)</label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Sheena Mae Serrano / Ar. Castillo"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:border-yellow-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Notes & Internal Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Material substitution logged in estimate change logs"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-850 focus:border-yellow-500"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl cursor-pointer text-center"
                  >
                    No, Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black py-3 rounded-xl cursor-pointer text-center shadow-xs"
                  >
                    Post Approved Scope
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
