/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Download, Printer, User, Building, Check, FileCheck, ShieldAlert } from 'lucide-react';
import jsPDF from 'jspdf';
import { Worker, ConstructionSite } from '../types';

interface FormsAgreementsProps {
  workers: Worker[];
  sites: ConstructionSite[];
}

export default function FormsAgreements({ workers, sites }: FormsAgreementsProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<'employment' | 'subcontractor' | 'waiver' | 'materials'>('employment');
  const [selectedWorkerId, setSelectedWorkerId] = useState(workers[0]?.id || '');
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id || '');
  const [signatoryName, setSignatoryName] = useState('Ronald C. Famorca');
  const [notarized, setNotarized] = useState(true);

  const activeWorker = workers.find(w => w.id === selectedWorkerId) || workers[0] || null;
  const activeSite = sites.find(s => s.id === selectedSiteId) || sites[0] || null;

  const getTemplateTitle = () => {
    switch(selectedTemplate) {
      case 'employment': return 'Standard Regular Project Employment Agreement';
      case 'subcontractor': return 'Subcontractor Trade Services Covenant';
      case 'waiver': return 'Structural Site Safety Liability & Indemnity Waiver';
      case 'materials': return 'Material Release, Pull-out & Custody Liability Form';
    }
  };

  const handlePrintForm = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('p', 'mm', 'letter');
    
    // Header banner
    doc.setFillColor(24, 28, 36); // Charcoal Black matching the user's uploaded logo textured background
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

    // Right side text
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text('RL CONSTRUCTION', 114, 15);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(229, 192, 96); // yellow-500 equivalent gold
    doc.text('Block 25 Lot 14, Tierra Vista, Santiago, General Trias, Cavite', 114, 21);
    
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Corporate Construction Standard Forms & Legal Covenants', 114, 26);

    // Elegant gold bottom border acting as baseline border on the header
    doc.setDrawColor(229, 192, 96);
    doc.setLineWidth(1.2);
    doc.line(0, 40, 216, 40);

    // Title of Agreement
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(getTemplateTitle().toUpperCase(), 16, 52);
    
    doc.setFontSize(9.5);
    doc.setFont('Helvetica', 'normal');
    
    let textY = 65;
    const writeLine = (text: string) => {
      const splitText = doc.splitTextToSize(text, 180);
      doc.text(splitText, 16, textY);
      textY += (splitText.length * 5.5);
    };

    if (selectedTemplate === 'employment') {
      writeLine(`KNOW ALL MEN BY THESE PRESENTS:`);
      writeLine(`This Contract of Project Employment, made and entered into this ${new Date().toLocaleDateString()} by and between:`);
      writeLine(`RL CONSTRUCTION, represented by contractor Ronald C. Famorca of legal age, with office at Block 25 Lot 14, Tierra Vista, Santiago, General Trias, Cavite, hereinafter referred to as the "EMPLOYER";`);
      writeLine(`- and -`);
      writeLine(`${activeWorker ? activeWorker.name.toUpperCase() : 'N/A'}, of legal age, residing at ${activeWorker?.address || 'Tierra Vista, Cavite'}, hereinafter referred to as the "PROJECT EMPLOYEE";`);
      writeLine(`WITNESSETH:`);
      writeLine(`1. TERM: The Employer hereby contracts the services of the Project Employee to work on the designated construction project site "${activeSite ? activeSite.name : 'Assigned Site'}" located at ${activeSite ? activeSite.location : 'N/A'}.`);
      writeLine(`2. SERVICES: The Project Employee is hired to perform duties matching the designated role of ${activeWorker ? activeWorker.role : 'Skilled Worker'}, and agrees to maintain work excellence, attendance, and adherence to safety guidelines.`);
      writeLine(`3. COMPENSATION: As compensation for professional services rendered, the Employer agrees to pay the Project Employee a standard Daily Wage Rate of One Hundred Pesos deduction applicable towards their security Cashbond reserve, excluding Site Supervisor role.`);
      writeLine(`4. CASHBOND RESERVE: Each payroll cycle shall accrue 100 pesos deduction as standard security and trust retainage fund, reimbursable upon project conclusion and structural verification.`);
    } else if (selectedTemplate === 'subcontractor') {
      writeLine(`SUBCONTRACT AGREEMENT FOR SPECIALIST TRADE SERVICES`);
      writeLine(`This contract specifies the professional trade deliverables agreed between RL Construction (The Main Contractor) and independent trade contractors for associated structural milestones.`);
      writeLine(`PROJECT LOCATION: ${activeSite ? activeSite.location : 'N/A'} - (${activeSite ? activeSite.name : 'Assigned Site'})`);
      writeLine(`REPRESENTED WORKER: ${activeWorker ? activeWorker.name : 'N/A'} (Operational Role: ${activeWorker ? activeWorker.role : 'Specialist'})`);
      writeLine(`SCOPE OF WORKS: Plumbing installation, concrete pouring finishing, high-grade architectural drywall construction, or specialized electrical wiring layout according to engineer design blueprint.`);
      writeLine(`LIABILITY: The trade subcontractor bears full warranties regarding deliverables quality for a post-completion period of twelve (12) standard calendar months.`);
    } else if (selectedTemplate === 'waiver') {
      writeLine(`PERSONAL LIABILITY SAFETY & COMPLIANCE INDEMNITY WAIVER`);
      writeLine(`I, ${activeWorker ? activeWorker.name : 'Staff Member'}, with role designation as ${activeWorker ? activeWorker.role : 'Worker'} attached to project "${activeSite ? activeSite.name : 'Assigned Site'}", hereby covenant:`);
      writeLine(`1. I acknowledge that the construction site environs have inherent physical risks. I certify that I have received all standard-issue Personal Protective Equipment (PPE) including safety shoes & hard-hats.`);
      writeLine(`2. I agree to indemnify RL Construction officers against accidental trauma liabilities, provided standard safety precautions were certified and logged active on the respective milestone date.`);
    } else {
      writeLine(`MATERIAL RELEASE, PULL-OUT & LOGISTICAL CLEARANCE DOCUMENT`);
      writeLine(`This certifies clearance to log and pull out technical building supplies, steel rebar, electrical conduit fittings, or structural masonry bags from RL depot to designated site:`);
      writeLine(`AUTHORIZED CONSIGNEE: ${activeWorker ? activeWorker.name : 'Site Personnel'} (Role: ${activeWorker ? activeWorker.role : 'Supervisor'})`);
      writeLine(`DELIVERY ENDPOINT: ${activeSite ? activeSite.name : 'Assigned Site'} - Address: ${activeSite ? activeSite.location : 'N/A'}`);
      writeLine(`LOGISTICS CODE: MAT-PULL-${Date.now().toString().slice(-6)}`);
      writeLine(`Items pulled must be checked against structural bill of estimation materials instantly upon arrival.`);
    }

    // Signatures
    textY += 15;
    doc.setDrawColor(148, 163, 184);
    doc.line(16, textY, 80, textY);
    doc.text(`${signatoryName}`, 16, textY + 4.5);
    doc.setFont('Helvetica', 'bold');
    doc.text('Authorized Representative / Contractor', 16, textY + 8.5);

    doc.line(125, textY, 195, textY);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${activeWorker ? activeWorker.name : 'Authorized Signatory Partner'}`, 125, textY + 4.5);
    doc.setFont('Helvetica', 'bold');
    doc.text('Affiant / Staff Member Signature', 125, textY + 8.5);

    if (notarized) {
      textY += 15;
      doc.setFillColor(254, 243, 199);
      doc.rect(16, textY, 184, 18, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      doc.text('RESERVED CORPORATE NOTARIZATION SPACE', 20, textY + 5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(120, 113, 108);
      doc.text('Subscribed and sworn to before Cavite notary, with Community Tax Certificate submitted under active building permits.', 20, textY + 11);
    }

    doc.save(`Form_${selectedTemplate}_${activeWorker?.name.replace(/\s+/g, '_') || 'Draft'}.pdf`);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <FileText className="w-5 h-5 text-yellow-500" />
            Forms & Agreement Library
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Pre-fill, draft, print, and generate corporate contracts, workforce waivers, and client trade agreements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="bg-slate-900 hover:bg-slate-800 text-yellow-400 font-bold uppercase text-[10px] tracking-wider px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF Agreement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Document Selector and Signatory Fields */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
            Contract Configuration
          </span>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-505 text-slate-500 block">Select Form Template</label>
            <div className="flex flex-col gap-1.5 pt-1">
              {[
                { id: 'employment', label: 'Regular Worker Agreement' },
                { id: 'subcontractor', label: 'Subcontract trade contract' },
                { id: 'waiver', label: 'Safety Liability Waiver' },
                { id: 'materials', label: 'Material release & pulling form' },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id as any)}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    selectedTemplate === tmpl.id
                      ? 'bg-slate-900 border-slate-900 text-yellow-400 font-black'
                      : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100/70'
                  }`}
                >
                  {tmpl.label}
                  <FileCheck className={`w-3.5 h-3.5 ${selectedTemplate === tmpl.id ? 'text-yellow-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Prefill Contractor / Representative</label>
            <input
              type="text"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Prefill Roster Employee</label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-700 cursor-pointer"
              >
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Associated Construction Site</label>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-700 cursor-pointer"
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notarized}
                onChange={(e) => setNotarized(e.target.checked)}
                className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
              />
              Include Standard Notary Reserved Field
            </label>
          </div>
        </div>

        {/* Live Document Preview Layout */}
        <div className="lg:col-span-8 bg-neutral-900 p-8 rounded-2xl border border-neutral-800 shadow-xl font-serif text-slate-100 max-h-[640px] overflow-y-auto space-y-6">
          <div className="text-center space-y-2 border-b border-neutral-800 pb-5">
            <span className="text-[8px] font-mono tracking-widest text-yellow-400 block font-bold uppercase">PREVIEW PRINT COVENANT</span>
            <h1 className="text-lg font-black tracking-tight text-white uppercase">{getTemplateTitle()}</h1>
            <p className="text-[10px] text-slate-400 font-sans tracking-wide">
              RL Construction Standards | Santiago, General Trias, Cavite, Ph
            </p>
          </div>

          {selectedTemplate === 'employment' && (
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <p className="font-bold text-white uppercase">KNOW ALL MEN BY THESE PRESENTS:</p>
              <p>
                This Project Employment Agreement is compiled on this <span className="text-yellow-400 font-sans font-semibold underline">{new Date().toLocaleDateString()}</span> by and between the following parties:
              </p>
              <p className="bg-neutral-950/40 p-3 rounded border border-neutral-800 font-sans">
                <strong>EMPLOYER:</strong> RL CONSTRUCTION, represented herein by its primary director <span className="text-white font-semibold">{signatoryName}</span>, with corporate business license attached to santiago, General Trias, Cavite.<br/>
                <strong>PROJECT EMPLOYEE:</strong> <span className="text-white font-semibold">{activeWorker?.name || 'N/A'}</span>, designation <span className="text-yellow-400 font-semibold">{activeWorker?.role || 'Builder'}</span>, with current reported home coordinates at <span className="text-white italic">{activeWorker?.address || 'General Trias, Cavite'}</span>.
              </p>
              <p className="font-bold text-white uppercase">TERMS OF AGREEMENT:</p>
              <ul className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>DESIGNATION & LOCATION:</strong> The Employee is requested to execute high-quality services matching their workforce competency on the specific construction project: <strong>"{activeSite?.name || 'Assigned Site'}"</strong>, located in <span>{activeSite?.location || 'Cavite'}</span>.
                </li>
                <li>
                  <strong>COMPENSATION RETENTION:</strong> Payment will occur under the primary company ledger, with a standard workforce reserve retaining <strong>One Hundred Pesos (₱100.00)</strong> deduction on each payroll cycle which serves towards their accrued security cashbonds (excluding supervisors).
                </li>
                <li>
                  <strong>GENERAL SAFETY COVENANT:</strong> The Worker commits to wear their Personal Protective Equipment (hard hats, safety shoes) during all active operational site hours.
                </li>
              </ul>
            </div>
          )}

          {selectedTemplate === 'subcontractor' && (
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <p className="font-bold text-white uppercase">SUBCONTRACT SPECIALIST COVENANT</p>
              <p>
                RL Design and Construction represents main builder supervision, assigning specialist trade tasks to:
              </p>
              <p className="bg-neutral-950/40 p-3 rounded border border-neutral-800 font-sans">
                <strong>Subcontract Partner:</strong> {activeWorker?.name || 'N/A'} (Competency Class: {activeWorker?.role || 'Mason/Welder'})
              </p>
              <p>
                1. <strong>Scope</strong>: The subcontractor guarantees technical expertise and material standard compliance on fit-out deliverables located inside: <strong>{activeSite?.name || 'Site'}</strong>, at {activeSite?.location || 'Cavite'}.
              </p>
              <p>
                2. <strong>Quality Standard</strong>: Raw work failing standard engineer structural alignment or materials estimate tests is subject to correction at the sole cost of the Subcontract Affiant.
              </p>
            </div>
          )}

          {selectedTemplate === 'waiver' && (
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <p className="font-bold text-white uppercase">SAFETY WAIVER, ACKNOWLEDGEMENT AND INDEMNIFICATION</p>
              <p>
                I, <strong className="text-white">{activeWorker?.name || 'Associated Worker'}</strong>, with core operational site assignment at <strong className="text-white">"{activeSite?.name || 'Assigned Site'}"</strong>, hereby certify:
              </p>
              <p>
                1. I understand that steel fabrication, heavy masonry equipment operations, and scaffolding climbing represent industrial environments with physical risk factors.
              </p>
              <p>
                2. I agree to operate strictly inside marked safety zones and wear compliant safety gear. I voluntarily release RL Construction from trauma liabilities where guidelines have been violated.
              </p>
            </div>
          )}

          {selectedTemplate === 'materials' && (
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <p className="font-bold text-white uppercase">MATERIAL CUSTODY AND LOGISTICAL LIABILITY SLIP</p>
              <p>
                This form permits logistical warehouse pull-out of building equipment or architectural assets destined for project: <strong>{activeSite?.name || 'Site'}</strong>.
              </p>
              <p className="bg-neutral-950/40 p-3 rounded border border-neutral-800 font-sans">
                <strong>Assigned Logistics Custodian:</strong> {activeWorker?.name || 'Roster Employee'} (Designated: {activeWorker?.role || 'Staff'})<br/>
                <strong>Form Verification Identifier:</strong> CTR-RELEASE-{Math.floor(100000 + Math.random() * 900000)}
              </p>
              <p>
                The Custodian accepts accountability for high-value tools or raw materials during hauling and on-site distribution cycles.
              </p>
            </div>
          )}

          <div className="pt-8 border-t border-neutral-800 grid grid-cols-2 gap-8 text-xs">
            <div className="text-center space-y-4">
              <div className="h-10 flex items-end justify-center">
                <span className="italic font-sans text-[10px] text-neutral-500 font-bold tracking-widest">[ Signed electronically ]</span>
              </div>
              <p className="border-t border-neutral-800 pt-2 font-bold text-white">{signatoryName}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none font-sans">RL Builder Representative</p>
            </div>

            <div className="text-center space-y-4">
              <div className="h-10 flex items-end justify-center">
                <span className="italic font-sans text-stone-500 font-bold text-[10px]">[ Pending Affiant Seal ]</span>
              </div>
              <p className="border-t border-neutral-800 pt-2 font-bold text-white">{activeWorker?.name || 'Staff Representative'}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none font-sans">Affiant / Project Employee</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
