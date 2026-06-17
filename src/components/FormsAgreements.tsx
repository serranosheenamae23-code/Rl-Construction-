/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Download, 
  User, 
  Building, 
  Check, 
  FileCheck, 
  ShieldAlert, 
  Calendar, 
  DollarSign, 
  Clock, 
  FileSpreadsheet, 
  Compass, 
  Award, 
  CheckSquare, 
  Briefcase 
} from 'lucide-react';
import jsPDF from 'jspdf';
import { Worker, ConstructionSite } from '../types';

interface FormsAgreementsProps {
  workers: Worker[];
  sites: ConstructionSite[];
}

type FormTemplateType = 
  | 'employment' 
  | 'subcontractor' 
  | 'waiver' 
  | 'materials' 
  | 'turnover' 
  | 'drawing_plan' 
  | 'contract_signing' 
  | 'progress_report' 
  | 'billing_report' 
  | 'punchlisting' 
  | 'cover_letter_billing';

export default function FormsAgreements({ workers, sites }: FormsAgreementsProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplateType>('employment');
  const [selectedWorkerId, setSelectedWorkerId] = useState(workers[0]?.id || '');
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id || '');
  const [signatoryName, setSignatoryName] = useState('Ronald C. Famorca');
  const [notarized, setNotarized] = useState(true);

  // Dynamic Template Specific Inputs
  const [clientName, setClientName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractAmount, setContractAmount] = useState('550000');
  const [drawingCode, setDrawingCode] = useState('WD-02-ARCH-REV3');
  const [engineerName, setEngineerName] = useState('Engr. Aljohn S. Villa');
  const [completionPercentage, setCompletionPercentage] = useState('75');
  const [billingPeriod, setBillingPeriod] = useState('Second Progress Billing');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [punchlistText, setPunchlistText] = useState('1. Retouch ceiling paint in master bedroom\n2. Secure living room cabinet hinges\n3. Trim excess floor sealant in dining area');
  const [customRemarks, setCustomRemarks] = useState('Works have been verified to comply strictly with architectural drawings and structural standards.');

  const activeWorker = workers.find(w => w.id === selectedWorkerId) || workers[0] || null;
  const activeSite = sites.find(s => s.id === selectedSiteId) || sites[0] || null;

  const siteNameUpper = activeSite ? activeSite.name.toUpperCase() : 'N/A';
  const siteLocUpper = activeSite ? activeSite.location.toUpperCase() : 'N/A';
  const workerNameUpper = activeWorker ? activeWorker.name.toUpperCase() : 'N/A';
  const workerRoleUpper = activeWorker ? activeWorker.role.toUpperCase() : 'N/A';
  const formattedAmount = Number(contractAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

  // Auto pre-fill client name when site changes
  useEffect(() => {
    if (activeSite) {
      setClientName(activeSite.clientName || '');
    }
  }, [selectedSiteId, activeSite]);

  const templateOptions: { id: FormTemplateType; label: string; group: 'Workforce & Safety' | 'Milestone & Project Closure' | 'Drawings & Billings' }[] = [
    // Workforce & Safety
    { id: 'employment', label: 'Regular Worker Agreement', group: 'Workforce & Safety' },
    { id: 'subcontractor', label: 'Subcontractor Covenant', group: 'Workforce & Safety' },
    { id: 'waiver', label: 'Safety Liability Waiver', group: 'Workforce & Safety' },
    { id: 'materials', label: 'Material Pull-out Clearance', group: 'Workforce & Safety' },
    
    // Milestone & Project Closure
    { id: 'contract_signing', label: 'Contract Signing MOA', group: 'Milestone & Project Closure' },
    { id: 'progress_report', label: 'Technical Progress Report', group: 'Milestone & Project Closure' },
    { id: 'punchlisting', label: 'Punchlist Verification', group: 'Milestone & Project Closure' },
    { id: 'turnover', label: 'Turnover & Property Acceptance', group: 'Milestone & Project Closure' },
    
    // Drawings & Billings
    { id: 'drawing_plan', label: 'Drawing & Plan Agreement', group: 'Drawings & Billings' },
    { id: 'billing_report', label: 'Detailed Billing Report', group: 'Drawings & Billings' },
    { id: 'cover_letter_billing', label: 'Cover Letter for Billing', group: 'Drawings & Billings' }
  ];

  const getTemplateTitle = () => {
    switch (selectedTemplate) {
      case 'employment': return 'Standard Regular Project Employment Agreement';
      case 'subcontractor': return 'Subcontractor Trade Services Covenant';
      case 'waiver': return 'Structural Site Safety Liability & Indemnity Waiver';
      case 'materials': return 'Material Release, Pull-out & Custody Liability Form';
      case 'turnover': return 'Project Handover & Client Property Acceptance Certificate';
      case 'drawing_plan': return 'Architectural Drawing, Specification & Plan Approval Agreement';
      case 'contract_signing': return 'Memorandum of Agreement for Construction Works';
      case 'progress_report': return 'Official Site Operational Progress Report';
      case 'billing_report': return 'Statement of Progress Billing & Valuation Certificate';
      case 'punchlisting': return 'Quality Assurance Punchlist & Rectification Log';
      case 'cover_letter_billing': return 'Cover Letter for Progress Billing Notice';
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('p', 'mm', 'letter');
    
    // Header Banner Design with premium charcoal/blue and gold highlight
    doc.setFillColor(15, 23, 42); // slate-900 / dark graphite
    doc.rect(0, 0, 216, 40, 'F');
    
    // RL CON Vector Gold logo
    const logoX = 14;
    const logoY = 6;
    
    doc.setDrawColor(234, 179, 8); // yellow-500 equivalent gold
    doc.setLineWidth(1.2);
    
    // House structural path matching corporate logo branding
    doc.line(logoX + 48, logoY + 19, logoX + 3.5, logoY + 19);
    doc.line(logoX + 3.5, logoY + 19, logoX + 3.5, logoY + 10.5);
    doc.line(logoX + 3.5, logoY + 10.5, logoX + 0.5, logoY + 10.5);
    doc.line(logoX + 0.5, logoY + 10.5, logoX + 13.5, logoY + 3.5);
    doc.line(logoX + 13.5, logoY + 3.5, logoX + 26.5, logoY + 10.5);
    doc.line(logoX + 26.5, logoY + 10.5, logoX + 24.0, logoY + 10.5);
    doc.line(logoX + 24.0, logoY + 10.5, logoX + 24.0, logoY + 13.5);

    // Write RL in Gold
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(234, 179, 8);
    doc.text('RL', logoX + 7, logoY + 16.5);
    
    // Write CON in White
    doc.setTextColor(255, 255, 255);
    doc.text('CON', logoX + 15, logoY + 16.5);
    
    // Sub-banner wording
    doc.setTextColor(156, 163, 175); // slate-400
    doc.setFontSize(5);
    doc.setFont('Helvetica', 'bold');
    doc.text('BUILD | DESIGN | LANDSCAPE', logoX + 18, logoY + 24);

    // Gold Star accent
    const starX = logoX + 47;
    const starY = logoY + 24;
    doc.setFillColor(234, 179, 8);
    doc.triangle(starX, starY - 1.5, starX + 0.5, starY, starX - 0.5, starY, 'F');
    doc.triangle(starX, starY + 1.5, starX + 0.5, starY, starX - 0.5, starY, 'F');
    doc.triangle(starX - 1.5, starY, starX, starY + 0.5, starX, starY - 0.5, 'F');
    doc.triangle(starX + 1.5, starY, starX, starY + 0.5, starX, starY - 0.5, 'F');

    // Company contact details on right
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('RL CONSTRUCTION', 110, 14);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(234, 179, 8); // Gold metallic
    doc.text('Block 25 Lot 14, Tierra Vista, Santiago, General Trias, Cavite', 110, 20);
    
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text('Corporate Construction Standard Covenants, Billings & Archives', 110, 25);

    // Yellow accent banner dividing line
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(1.0);
    doc.line(0, 40, 216, 40);

    // Document title header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Deep Charcoal
    doc.text(getTemplateTitle().toUpperCase(), 16, 52);
    
    // Bottom underline for title
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(16, 55, 200, 55);

    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // slate-700
    
    let textY = 65;
    const writeLine = (text: string, isBold: boolean = false, extraMarginY: number = 0) => {
      textY += extraMarginY;
      if (isBold) {
        doc.setFont('Helvetica', 'bold');
      } else {
        doc.setFont('Helvetica', 'normal');
      }
      const splitText = doc.splitTextToSize(text, 184);
      doc.text(splitText, 16, textY);
      textY += (splitText.length * 5.2);
    };

    // Render templates conditionally to PDF
    switch (selectedTemplate) {
      case 'employment':
        writeLine('KNOW ALL MEN BY THESE PRESENTS:', true);
        writeLine(`This Contract of Project Employment, made and entered into this ${selectedDate} by and between:`);
        writeLine(`RL CONSTRUCTION, represented by contractor ${signatoryName.toUpperCase()} of legal age, with office at Block 25 Lot 14, Tierra Vista, Santiago, General Trias, Cavite, hereinafter referred to as the "EMPLOYER";`, false, 2);
        writeLine('- and -', true, 2);
        writeLine(`${workerNameUpper}, of legal age, residing at ${activeWorker?.address || 'Cavite, Philippines'}, hereinafter referred to as the "PROJECT EMPLOYEE";`, false, 2);
        writeLine('WITNESSETH:', true, 4);
        writeLine(`1. TERM AND LOCATION: The Employer hereby contracts the services of the Project Employee to work on the designated construction project site "${siteNameUpper}" located at ${siteLocUpper}.`);
        writeLine(`2. SERVICES: The Project Employee is hired to perform duties matching the designated role of ${workerRoleUpper}, and agrees to maintain highest work quality standards, regular site attendance, and compliance with the project schedule.`);
        writeLine('3. COMPENSATION: As compensation for professional services rendered, the Employer agrees to pay the Project Employee a daily wage in accordance with standardized site payroll frameworks, subject to active daily attendance records and authorized timesheets.');
        writeLine('4. CASHBOND RESERVE: Each payroll cycle shall accrue 100 pesos deduction as standard security and trust retainage fund, reimbursable upon project conclusion and structural QA validation.');
        break;

      case 'subcontractor':
        writeLine('SUBCONTRACT AGREEMENT FOR SPECIALIST TRADE SERVICES', true);
        writeLine(`This Contract specifies the professional deliverables agreed between RL Construction (The Main Contractor) and the subcontractor on this date: ${selectedDate}.`);
        writeLine(`REPRESENTED SPECIALIST: ${workerNameUpper} (Operational Role: ${workerRoleUpper})`, true, 4);
        writeLine(`PROJECT DESIGNATION: ${siteNameUpper}`, true, 2);
        writeLine(`PROJECT ADDRESS: ${siteLocUpper}`, false, 1);
        writeLine('COVENANTS AND ASSIGNMENTS:', true, 4);
        writeLine('1. SCOPE OF DELIVERABLES: The subcontractor agrees to execute carpentry, structural framing, wall finishes, tile-setting, electrical rough-ins, plumbing leak tests, or painting as directed by the site specifications.');
        writeLine(`2. CONTRACT VALUATION AND RETENTION: For structural deliverables completed, compensation checks will be logged as Site Disbursements. Retainage of ten percent (10%) of the billing value remains applicable for QA guarantee.`);
        writeLine('3. WARRANTY AND ACCOUNTABILITY: The Subcontractor warrants all structural and finish items against aesthetic or structural failure for a period of twelve (12) months after turnover.');
        break;

      case 'waiver':
        writeLine('PERSONAL INDUSTRIAL RISK AND SITE SAFETY INDEMNITY WAIVER', true);
        writeLine(`I, ${workerNameUpper}, with role designation as ${workerRoleUpper} attached to construction project "${siteNameUpper}", hereby declare and covenant on this date ${selectedDate}:`, false, 4);
        writeLine('1. COMPLIANCE REQUIREMENT: I acknowledge that active construction areas involve mechanical, structural, and physical risks. I certify that I have received all standard-issue Personal Protective Equipment (PPE) including safety shoes & high-visibility outer garments, and I commit to wear them consistently.', false, 3);
        writeLine('2. SAFETY PROTOCOLS: I agree to operate vehicles, power saws, scaffolding structures, and paint sprays strictly in accordance with local builder specifications and supervisor safety guidelines.', false, 2);
        writeLine('3. COVENANT OF INDEMNITY: I hereby release RL Construction, its primary contractor, and the respective site client from civil or personal liabilities arising from accidents where written warning violations or failure to wear standard-issue protective gear has been certified.', false, 2);
        break;

      case 'materials':
        writeLine('MATERIAL RELEASE, PULL-OUT & CUSTODIAL LIABILITY CLEARANCE', true);
        writeLine(`This certifies clearance to pull out and haul industrial building supplies, high-value tools, architectural fittings, or raw masonry materials from depot resources for prompt delivery to:`);
        writeLine(`DELIVERY ENDPOINT DESIGNATION: ${siteNameUpper}`, true, 3);
        writeLine(`PROJECT PHYSICAL SITE LOCATION: ${siteLocUpper}`, false, 1);
        writeLine(`LOGISTICS HANDLER / REPRESENTATIVE: ${workerNameUpper} (${workerRoleUpper})`, true, 2);
        writeLine(`LOGISTICAL AUTHORIZATION DOCKET CODE: MAT-PULL-${Date.now().toString().slice(-6)}`, true, 2);
        writeLine('TERMS OF CUSTODIAL RECEIPT:', true, 4);
        writeLine('1. QUANTITY AND QUALITY: The authorized handler certifies that materials listed have been visually inspected for damage, cracked seals, or shortage prior to loading.');
        writeLine('2. SECURITY DEPOSIT AND LIABILITY: The handler acts as the direct custodian of RL Construction assets during transit. Any material damage due to reckless haulage or improper storage on site shall be logged under company discrepancy reports.');
        break;

      case 'turnover':
        writeLine('PROJECT HANDOVER & PROPERTY ACCEPTANCE CERTIFICATE', true);
        writeLine(`This Certificate witnesseth the formal structural and architectural handover of the finished works at:`);
        writeLine(`PROJECT DESIGNATION: ${siteNameUpper}`, true, 3);
        writeLine(`LOCATION: ${siteLocUpper}`, false, 1);
        writeLine(`CLIENT / PROPERTY OWNER: ${clientName.toUpperCase()}`, true, 2);
        writeLine(`HANDOVER & ACCEPTANCE DATE: ${selectedDate}`, false, 1);
        writeLine('DECLARATIONS OF AGREEMENT:', true, 4);
        writeLine(`1. FINAL VERIFICATION: The Client acknowledges having inspected all rooms, fit-out utilities, electrical outlets, plumbing pipelines, painting works, and floor designs of the project. Exception list is logged on active QA punchlists if applicable.`);
        writeLine(`2. SATISFACTION AND RELEASE: By signing this Turnover Agreement, the Client accepts the property as complete. RL Construction is released from daily operational site management, and the remaining billing balance (net of agreed retention values) becomes fully claimable.`);
        writeLine(`3. STRUCTURAL WARRANTY: Outstanding structural items remain covered under statutory builders warranty frameworks as stated in primary contracts.`);
        break;

      case 'drawing_plan':
        writeLine('DESIGN SPECS, ARCHITECTURAL PLAN & DRAWING APPROVAL AGREEMENT', true);
        writeLine(`This document certifies formal design sign-off for execution at the builder site:`);
        writeLine(`PROJECT ASSOCIATED: ${siteNameUpper}`, true, 3);
        writeLine(`BLUEPRINT REFERENCE DOCKET ID: ${drawingCode.toUpperCase()}`, true, 1);
        writeLine(`PREPARED BY REPRESENTATIVE: ${engineerName.toUpperCase()}`, false, 1);
        writeLine(`APPROVAL / VERIFICATION DATE: ${selectedDate}`, false, 1);
        writeLine('STATEMENT OF CONFORMANCE AND APPROVAL:', true, 4);
        writeLine(`1. GRAPHIC REPRESENTATIONS: The Client and Contractor have thoroughly reviewed the schematics, heights, floor layout layouts, wall partitions, and structural reinforcement details contained under drawing sheet reference.`, false, 2);
        writeLine(`2. AGREEMENT ON CHANGES: This design represents the frozen baseline. Any future revisions or custom layout variations requested by either party will be subject to an Approved Variation Order and Additional Scope charges.`, false, 2);
        writeLine(`3. RELEASES: Permission is hereby given to requisition finishing timber, tiles, and fixtures based on the dimensions and specifications documented in these drawings.`);
        break;

      case 'contract_signing':
        writeLine('MEMORANDUM OF AGREEMENT (MOA) FOR FIT-OUT & CONSTRUCTION WORKS', true);
        writeLine(`KNOW ALL MEN BY THESE PRESENTS This Memorandum of Agreement entered into this ${selectedDate} by and between:`);
        writeLine(`RL CONSTRUCTION, represented by ${signatoryName.toUpperCase()}, with legal address at General Trias, Cavite, hereinafter referred to as the "CONTRACTOR";`, false, 2);
        writeLine('- and -', true, 2);
        writeLine(`${clientName.toUpperCase()}, of legal age, residing at ${siteLocUpper}, hereinafter referred to as the "CLIENT";`, false, 2);
        writeLine('WITNESSETHThat the parties contract for physical building works on the following terms:', true, 4);
        writeLine(`1. TOTAL CONTRACT CONSIDERATION: The Client agrees to pay the Contractor for complete deliverables a contract sum of PHP ${formattedAmount} (Pesos) according to project billing schedulers.`);
        writeLine('2. MATERIALS AND WORKMANSHIP: The Contractor shall provide high-grade concrete, structural steel reinforcements, and architectural finishes in strict compliance with approved blueprints.');
        writeLine(`3. DISBURSEMENT PHASES: Payment milestones are mapped directly to project billings ledger, with a standard retainage percentage set aside up to final turnover and punchlist clearance.`);
        break;

      case 'progress_report':
        writeLine('OFFICIAL SITE OPERATIONAL STATUS AND PROGRESS REPORT', true);
        writeLine(`This Technical Report summarizes physical achievements of works at construction site:`);
        writeLine(`PROJECT ACTIVE DESIGNATION: ${siteNameUpper}`, true, 3);
        writeLine(`PHYSICAL ARCHITECTURAL PROGRESS LEVEL: [ ${completionPercentage}% COMPLETED ]`, true, 1.5);
        writeLine(`CERTIFIED VALUATION DATE: ${selectedDate}`, false, 1);
        writeLine(`SUPERVISING FIELD ENGINEER: ${engineerName.toUpperCase()}`, false, 1);
        writeLine('SITE OPERATIONAL UPDATE SUMMARY:', true, 4);
        writeLine(`The supervising team certifies that construction works have advanced to the indicated stage. Key roughing-ins, structural layouts, and architectural coatings are verified to comply with target timelines.`, false, 2);
        writeLine(`SUPERVISOR FIELD REMARKS AND COMMENTS:`, true, 3);
        writeLine(`"${customRemarks}"`);
        writeLine('This progress report acts as the technical authorization baseline to compile billing claims matching physical completion percentages.', false, 3);
        break;

      case 'billing_report':
        writeLine('STATEMENT OF PROGRESS BILLING & CERTIFICATE OF CONTRACT VALUATION', true);
        writeLine(`This claim and statement of payment represents structural work valuation at:`);
        writeLine(`PROJECT ACTIVE SITES LOG: ${siteNameUpper}`, true, 3);
        writeLine(`CLIENT BILLING REPRESENTATIVE: ${clientName.toUpperCase()}`, false, 1);
        writeLine(`BILLING CLAIM IDENTIFIER: ${billingPeriod}`, true, 1.5);
        writeLine(`BILLING INVOICE DATE: ${selectedDate}  |  DUE FOR SETTLEMENT on or before: ${dueDate}`, false, 1);
        writeLine('SUMMARY OF BILLING WORK VALUATIONS:', true, 4);
        writeLine(`1. BASE CONTRACT PORTION AMOUNT: ................................ PHP ${formattedAmount}`, false, 2);
        writeLine(`2. VALUE OF COMPLETED MILESTONE WORK: ........................... PHP ${((Number(contractAmount) * Number(completionPercentage)) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, false, 1);
        writeLine(`3. LESS RETAINAGE PRE-SET VALUE (10% standard): .................. PHP ${((Number(contractAmount) * Number(completionPercentage) * 0.1) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, false, 1);
        writeLine(`4. NET AMOUNT REQUESTED FOR RELEASE: ............................ PHP ${((Number(contractAmount) * Number(completionPercentage) * 0.9) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, true, 1.5);
        writeLine('RL Construction certifies that physical accomplishments match the milestone metrics and billing request as itemized layout.', false, 3);
        break;

      case 'punchlisting':
        writeLine('QUALITY ASSURANCE PUNCHLIST & COMPLIANCE RECTIFICATION LOG', true);
        writeLine(`This log lists remaining aesthetic or mechanical minor points requiring correction at:`);
        writeLine(`PROJECT REGISTERED: ${siteNameUpper}`, true, 3);
        writeLine(`CHECKER / QA REPRESENTATIVE: ${engineerName.toUpperCase()}`, false, 1);
        writeLine(`LOG DATE: ${selectedDate}  |  TARGET RESOLUTION CUTOFF DATE: ${dueDate}`, false, 1);
        writeLine('QA DETAILED CHECKLIST ITEMS:', true, 4);
        const lines = punchlistText.split('\n');
        lines.forEach(ln => {
          if (ln.trim()) writeLine(ln.trim(), false, 1);
        });
        writeLine('AGREEMENT ON RECTIFICATION:', true, 4);
        writeLine('RL Construction commits to deploy dedicated skilled laborers to finish, repair, or replace the highlighted items on or before the targeted completion deadline at no secondary cost to the client.', false, 2);
        break;

      case 'cover_letter_billing':
        writeLine('COVER LETTER FOR SITE MILESTONE AND PROGRESS BILLING RECORD', true);
        writeLine(`DATE: ${selectedDate}`, false, 3);
        writeLine(`ATTENTION: ${clientName.toUpperCase()}`, true, 2);
        writeLine(`RE: Progress Billing Statement for Project: ${siteNameUpper}`, true, 1);
        writeLine('Dear Client,', false, 3);
        writeLine(`We hope this letter finds you well. RL Construction is pleased to inform you that we have successfully achieved the construction milestones described under drawing code ${drawingCode} for your project at ${siteLocUpper}.`, false, 3);
        writeLine(`In connection with this progress, we have filed the ${billingPeriod} amounting to a net value matching completed milestones of work. Attached to this cover letter is our detailed Statement of Progress Billing and itemized material disbursements.`, false, 3);
        writeLine(`We kindest request settlement on or before the due date of ${dueDate} to help maintain regular worker schedules, material deliveries, and continuous physical progress.`, false, 3);
        writeLine('Thank you for your continuous trust as we build your dream space together.', false, 3);
        writeLine('Sincere,', false, 4);
        writeLine(`${signatoryName}`, true, 3);
        writeLine('RL Construction Lead Representative', false, 1);
        break;
    }

    // Centered signature line
    textY = Math.max(textY + 12, 195);
    
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
    doc.line(16, textY, 85, textY);
    doc.line(125, textY, 195, textY);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    
    doc.text(`${signatoryName}`, 16, textY + 4);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('RL Construction Representative', 16, textY + 7.5);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    
    if (selectedTemplate === 'employment' || selectedTemplate === 'subcontractor' || selectedTemplate === 'waiver' || selectedTemplate === 'materials') {
      doc.text(`${workerNameUpper}`, 125, textY + 4);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Affiant / Staff Member', 125, textY + 7.5);
    } else {
      doc.text(`${clientName.toUpperCase()}`, 125, textY + 4);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Client Representative / Sig.', 125, textY + 7.5);
    }

    // Reserved notarization field
    if (notarized) {
      const notaryY = textY + 18;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.setLineWidth(0.5);
      doc.rect(16, notaryY, 184, 18, 'FD');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175);
      doc.text('RESERVED COMPLIANCE & NOTARIZATION NOTARY RECORD', 20, notaryY + 5.5);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Subscribed and sworn before notary key credentials in Santiago, General Trias, Cavite. CTC and structural licenses registered.', 20, notaryY + 11.5);
    }

    // Save of appropriate draft PDF
    doc.save(`Form_${selectedTemplate}_${siteNameUpper.replace(/\s+/g, '_')}_Draft.pdf`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Upper header section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <FileText className="w-5 h-5 text-yellow-500 animate-pulse" />
            Corporate Agreements & Interactive Forms
          </h2>
          <p className="text-xs text-slate-500 font-semibold font-mono">
            SECURE FIELD INSTRUMENTS / EDITABLE BLUEPRINTS / PUNCHLISTS & PROFESSIONAL PROGRESS BILLINGS
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleDownloadPDF}
            className="bg-slate-900 hover:bg-slate-800 text-yellow-400 font-extrabold uppercase text-[10.5px] tracking-wider px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF Contract
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Selector of templates & Dynamic values */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          {/* Template category selector with scroll option */}
          <div className="space-y-3">
            <span className="block text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">
              Select Agreement Template
            </span>
            
            <div className="max-h-[340px] overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {['Workforce & Safety', 'Milestone & Project Closure', 'Drawings & Billings'].map((grp) => (
                <div key={grp} className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase text-amber-600 tracking-wider font-mono px-1">
                    {grp}
                  </h4>
                  <div className="grid grid-cols-1 gap-1">
                    {templateOptions
                      .filter(t => t.group === grp)
                      .map(tmpl => (
                        <button
                          key={tmpl.id}
                          onClick={() => setSelectedTemplate(tmpl.id)}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                            selectedTemplate === tmpl.id
                              ? 'bg-slate-900 border-slate-900 text-yellow-400 font-black shadow-xs translate-x-1'
                              : 'bg-slate-50 border-slate-150 text-slate-605 text-slate-600 hover:bg-slate-100/70'
                          }`}
                        >
                          <span className="truncate">{tmpl.label}</span>
                          <FileCheck className={`w-3.5 h-3.5 flex-shrink-0 ${selectedTemplate === tmpl.id ? 'text-yellow-400' : 'text-slate-300'}`} />
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DYNAMIC FIELD SETS FOR USER CUSTOMIZATION */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <span className="block text-xs font-black text-slate-900 uppercase tracking-widest border-b border-neutral-100 pb-2">
              ⚠️ Custom Form Variable Inputs
            </span>

            {/* Standard inputs shown for most items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Lead Contractor Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-205 border-slate-200 focus:border-yellow-500 focus:outline-hidden rounded-xl text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Document Field Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-205 border-slate-200 focus:border-yellow-500 focus:outline-hidden rounded-xl text-slate-900 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Associated Project Site</label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-705 cursor-pointer focus:border-yellow-500 focus:outline-hidden"
                >
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Target Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Mrs. Sheena Serrano"
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-205 border-slate-200 focus:border-yellow-500 focus:outline-hidden rounded-xl text-slate-900"
                />
              </div>
            </div>

            {/* Template Specific variables */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTemplate}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3.5"
              >
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider font-mono">
                  Variables specific to {templateOptions.find(t => t.id === selectedTemplate)?.label.toUpperCase()}
                </span>

                {/* WORKFORCE & SAFETY SPECIFIC */}
                {['employment', 'subcontractor', 'waiver', 'materials'].includes(selectedTemplate) && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase text-slate-550 block text-slate-550">Choose Staff Member / Roster Worker</label>
                    <select
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-700 cursor-pointer"
                    >
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-400 font-semibold font-mono mt-0.5">Loads worker addresses and role classifications automatically</p>
                  </div>
                )}

                {/* DRAWINGS PLAN SPECIFIC */}
                {selectedTemplate === 'drawing_plan' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Blueprint Reference Code</label>
                      <input
                        type="text"
                        value={drawingCode}
                        onChange={(e) => setDrawingCode(e.target.value)}
                        className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Architect / Engineer In-charge</label>
                      <input
                        type="text"
                        value={engineerName}
                        onChange={(e) => setEngineerName(e.target.value)}
                        className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* CONTRACT / BILLING VALUES SPECIFIC */}
                {['contract_signing', 'billing_report', 'progress_report', 'cover_letter_billing'].includes(selectedTemplate) && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Contract Total Sum (₱)</label>
                        <input
                          type="number"
                          value={contractAmount}
                          onChange={(e) => setContractAmount(e.target.value)}
                          className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-lg font-mono text-emerald-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Report Completion Level %</label>
                        <input
                          type="number"
                          value={completionPercentage}
                          onChange={(e) => setCompletionPercentage(e.target.value)}
                          max="100"
                          min="0"
                          className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-800"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Billing Period / Stage name</label>
                        <input
                          type="text"
                          value={billingPeriod}
                          onChange={(e) => setBillingPeriod(e.target.value)}
                          className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Payment Cutoff / Due Date</label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {selectedTemplate === 'progress_report' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Technical Field Engineer Remarks</label>
                        <textarea
                          value={customRemarks}
                          onChange={(e) => setCustomRemarks(e.target.value)}
                          rows={3}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium leading-relaxed font-sans text-slate-800"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* PUNCHLIST LOG SPECIFIC */}
                {selectedTemplate === 'punchlisting' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 block">outstanding Rectification tasks (Line items)</label>
                      <textarea
                        value={punchlistText}
                        onChange={(e) => setPunchlistText(e.target.value)}
                        rows={4}
                        placeholder="Type each rectification point on a new line"
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-mono leading-relaxed"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Assign QA Inspector</label>
                        <input
                          type="text"
                          value={engineerName}
                          onChange={(e) => setEngineerName(e.target.value)}
                          className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Expected Finish Date</label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-lg cursor-pointer text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notarized}
                  onChange={(e) => setNotarized(e.target.checked)}
                  className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500 w-4 h-4 cursor-pointer"
                />
                Include Official Notary & License blocks
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Large, Elegant paper style Preview */}
        <div className="lg:col-span-7 bg-slate-905 bg-slate-900 p-6 md:p-10 rounded-2xl border border-slate-800 shadow-2xl font-serif text-slate-200 min-h-[640px] max-h-[760px] overflow-y-auto space-y-6 relative flex flex-col scrollbar-thin">
          
          {/* Absolute floating preview watermark banner */}
          <div className="absolute top-3 right-4 bg-yellow-500/10 text-yellow-550 border border-yellow-500/20 text-[8px] font-black font-mono tracking-widest px-2.5 py-1 rounded-full uppercase tracking-wider select-none">
            Interactive Live Document Preview
          </div>

          <div className="text-center space-y-2 border-b border-slate-800 pb-5 pt-2">
            <h1 className="text-base md:text-lg font-black tracking-wider text-white uppercase font-sans">{getTemplateTitle()}</h1>
            <p className="text-[9.5px] text-slate-400 font-sans tracking-widest uppercase">
              RL Construction Standards | general trias, cavite, ph
            </p>
          </div>

          {/* DYNAMIC DOCUMENT PAPER BODY TEXT */}
          <div className="text-xs leading-relaxed text-slate-300 space-y-4 pr-1">
            
            {/* Employ agreement preview */}
            {selectedTemplate === 'employment' && (
              <div className="space-y-4">
                <p className="font-bold text-slate-200 tracking-wider">KNOW ALL MEN BY THESE PRESENTS:</p>
                <p>
                  This Project Employment Covenant is written and verified on <strong className="text-yellow-400 font-sans font-extrabold underline">{selectedDate}</strong> by and between:
                </p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 font-sans space-y-1.5 leading-relaxed text-slate-300 text-[11px]">
                  <p><strong>REPRESENTED BY CONTRACTOR:</strong> <span className="text-white font-extrabold">{signatoryName.toUpperCase()}</span>, with enterprise license address in Santiago, General Trias, Cavite.</p>
                  <p><strong>REGISTERED WORKER:</strong> <span className="text-white font-extrabold">{workerNameUpper}</span>, acting as operational <span className="text-yellow-400 font-extrabold">{workerRoleUpper}</span> on core deliverables.</p>
                  <p><strong>ADDRESS ON FILE:</strong> <span className="text-stone-300 italic">{activeWorker?.address || 'General Trias, Cavite, Ph'}</span></p>
                </div>
                <p className="font-bold text-slate-200 tracking-wider">W I T N E S S E T H:</p>
                <p>
                  That whereas the Employer requires workforce capabilities for construction works located at: <strong>{activeSite?.name ? activeSite.name.toUpperCase() : 'YOUR SELECTED SITE'}</strong> ({activeSite?.location || 'Cavite Project Spot'}), the parties covenant daily labor terms:
                </p>
                <ul className="list-decimal pl-5 space-y-2 text-[11px] text-slate-350">
                  <li>
                    <strong>TERM AND DISCHARGE:</strong> Project Employee understands that their tenure is strictly co-terminus with the milestones of this site. Re-hiring to subsequent projects is subject to performance.
                  </li>
                  <li>
                    <strong>DEDUCTION RETENTION:</strong> The staff agrees to standard PHP 100 Cashbond deduction on daily timesheet payrolls as retainage, excluding lead supervisor categories.
                  </li>
                  <li>
                    <strong>COMPLIANCE SAFETY:</strong> Strict adherence to protective shoes, safety goggles, and hard-hats is a zero-tolerance condition.
                  </li>
                </ul>
              </div>
            )}

            {/* Subcontractor covenant preview */}
            {selectedTemplate === 'subcontractor' && (
              <div className="space-y-4">
                <p className="font-bold text-slate-200 tracking-wider">SUBCONTRACT AGREEMENT FOR TRADE COMPETENCIES</p>
                <p>
                  This Subcontract document delineates core structural trade covenants finalized on <strong className="text-yellow-400 font-sans font-extrabold">{selectedDate}</strong> between main general contractor RL Construction and:
                </p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 font-sans text-[11.5px] text-slate-300 space-y-1">
                  <p><strong>SUBCONTRACTOR:</strong> <span className="text-white font-bold">{workerNameUpper}</span></p>
                  <p><strong>TRADE SKILL CLASS:</strong> <span className="text-yellow-400 font-bold">{workerRoleUpper}</span></p>
                  <p><strong>SITE LOCATION / DESIGNATION:</strong> <span className="text-white font-bold">{siteNameUpper}</span> — {siteLocUpper}</p>
                </div>
                <p>
                  1. <strong>TECHNICAL DELIVERABLES:</strong> Subcontractor guarantees pristine execution of structural steel works, plumbing systems layout, or fine tile finishes strictly conforming to engineer specs.
                </p>
                <p>
                  2. <strong>PAYMENT VALUATION:</strong> Work completions will undergo physical inspection. Approved scope disbursements will be processed upon completion of target milestones, subject to a 10% cash retention rate.
                </p>
              </div>
            )}

            {/* Waiver safety preview */}
            {selectedTemplate === 'waiver' && (
              <div className="space-y-4">
                <p className="font-bold text-slate-200 tracking-wider">SAFETY LIABILTY WAIVER & INDUSTRIAL COMPLIANCE FORUM</p>
                <p>
                  I, <strong className="text-white font-sans">{workerNameUpper}</strong>, with active employment status as a <span className="text-yellow-450 text-yellow-400 font-semibold">{workerRoleUpper}</span> at RL Construction site: <strong className="text-slate-250">{siteNameUpper}</strong>, declare under oath:
                </p>
                <p className="indent-8">
                  1. I certify that RL Construction has issued complete Personal Protective Equipment (hard hats, safety boots) to me. I commit to keep them worn on site hours.
                </p>
                <p className="indent-8">
                  2. I acknowledge that heavy masonry, scaffolding climbing, and steel fabrication are inherently risky tasks. I voluntarily assume physical risk and indemnify RL Construction representative officers against liability as long as standard supervisor oversight is maintained.
                </p>
                <p className="text-[10px] text-slate-500 font-mono">FILED ON RECORD DATE: {selectedDate}</p>
              </div>
            )}

            {/* Material pullout clearance */}
            {selectedTemplate === 'materials' && (
              <div className="space-y-4">
                <p className="font-bold text-slate-200 tracking-wider">MATERIAL RELEASE AND DEPOT LOGISTICS TRANSFER DOC</p>
                <p>
                  This logistical clearance docket authorizes immediate transport, custody, and physical pull-out of tool arrays, masonry supplies, tile palettes, or steel rebars:
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-sans text-xs space-y-2">
                  <p><strong>DESTINATION SITE DESIGNATION:</strong> <span className="text-white font-bold">{siteNameUpper}</span></p>
                  <p><strong>REQUISITIONED BY HANDLER:</strong> <span className="text-yellow-400 font-bold">{workerNameUpper}</span> ({workerRoleUpper})</p>
                  <p><strong>HAULAGE DOCKET TRACKING ID:</strong> <span className="text-white font-mono uppercase tracking-widest font-black text-amber-500">M-CH-{(100000 + Math.random() * 900000).toFixed(0)}</span></p>
                </div>
                <p>
                  The assigned handler acts as custodian. All materials must be logged into physical on-site estimation sheets instantly upon arrival.
                </p>
              </div>
            )}

            {/* Project Handover / Turnover certificate (New) */}
            {selectedTemplate === 'turnover' && (
              <div className="space-y-4 text-[11.5px]">
                <p className="font-bold text-slate-200 tracking-wider">PROJECT HANDOVER & PROPERTY STATUS ACCEPTANCE</p>
                <p>
                  This signifies formal handover of the finished works at project site <strong className="text-white">{siteNameUpper}</strong> located at <strong className="text-white">{siteLocUpper}</strong> on this date <strong className="text-yellow-400 font-sans">{selectedDate}</strong>.
                </p>
                <p className="indent-8">
                  The Contractor structural representative <strong className="text-slate-200">{signatoryName}</strong> has formally delivered physical building keys, blueprints, utility clearances, and completion logs.
                </p>
                <p className="indent-8">
                  The Client property representative <strong className="text-yellow-400 font-sans">{clientName.toUpperCase()}</strong> has inspected work finishes, paint trims, tile setups, and drainage pathways. The Client accepts key custody, concluding general operational construct services, and releasing full contract settlements.
                </p>
                <p className="bg-slate-950/60 p-3 rounded-lg border border-slate-850 italic text-[10.5px] text-slate-400">
                  "By signing this, physical risk levels of the site are formally accepted by the host client."
                </p>
              </div>
            )}

            {/* Architectural Drawing Plan Approval (New) */}
            {selectedTemplate === 'drawing_plan' && (
              <div className="space-y-4">
                <p className="font-bold text-slate-200 tracking-wider">SPECS, SCALE ARCHITECTURAL BLUEPRINTS APPROVAL COVENANT</p>
                <p>
                  This document certifies client approval of finishing blueprints, wiring routes, and custom tile layouts for layout site: <strong className="text-slate-100">{siteNameUpper}</strong>.
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-sans text-xs space-y-1.5">
                  <p><strong>APPROVED DWG ID CODE:</strong> <span className="text-amber-400 font-bold font-mono">{drawingCode.toUpperCase()}</span></p>
                  <p><strong>REPRESENTATIVE ARCHITECT / ENGINEER:</strong> <span className="text-white font-bold">{engineerName.toUpperCase()}</span></p>
                  <p><strong>FORMAL SIGN-OFF DATE:</strong> <span className="text-white font-mono">{selectedDate}</span></p>
                </div>
                <p className="indent-8 text-[11px] text-slate-350">
                  Any future deviation, architectural partition variation, or fixture modification requested by either the Client or Supervisor after this sign-off will yield a secondary Variation Order subject to independent estimation checks.
                </p>
              </div>
            )}

            {/* Contract signing MOA (New) */}
            {selectedTemplate === 'contract_signing' && (
              <div className="space-y-4">
                <p className="font-bold text-slate-200 tracking-wider">MEMORANDUM OF AGREEMENT (MOA) FOR FIT-OUT DESIGN</p>
                <p>
                  This MOA is entered into on <strong className="text-yellow-400 font-sans">{selectedDate}</strong> by RL Construction, hereinafter referred to as the <strong>Contractor</strong>, and <strong className="text-white">{clientName.toUpperCase()}</strong>, hereinafter referred to as the <strong>Client</strong>:
                </p>
                <p className="indent-8">
                  The Contractor agrees to furnish complete materials, labor, carpentry systems, and engineering supervisors for the completion of the project site target coordinates in <strong>{siteNameUpper}</strong>.
                </p>
                <p className="indent-8 font-sans">
                  The Client agrees to pay the total contract value of <strong className="text-emerald-400">₱{formattedAmount}</strong>. Payments shall be released on a progress milestone basis according to authorized billings statements.
                </p>
              </div>
            )}

            {/* Technical progress report (New) */}
            {selectedTemplate === 'progress_report' && (
              <div className="space-y-4">
                <p className="font-bold text-slate-200 tracking-wider">OFFICIAL FIELD OPERATIONAL PROGRESS DISPATCH</p>
                <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850 font-sans text-xs">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">PROJECT COMPONENT</span>
                    <strong className="text-white">{siteNameUpper}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">COMPLETION LEVEL Metric</span>
                    <strong className="text-yellow-400 text-sm font-black font-mono">{completionPercentage}% Completed</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">TECHNICAL REVIEW DATE</span>
                    <strong className="text-white">{selectedDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">ENGINEER IN-CHARGE</span>
                    <strong className="text-white">{engineerName}</strong>
                  </div>
                </div>
                <p className="font-bold text-slate-20s">SUPERVISOR COMPLIANCE REMARKS:</p>
                <p className="bg-slate-900 border-l-4 border-yellow-500 p-3 italic text-stone-300 font-sans text-[11.5px] rounded-r-lg">
                  "{customRemarks}"
                </p>
              </div>
            )}

            {/* Billing Report (New) */}
            {selectedTemplate === 'billing_report' && (
              <div className="space-y-4">
                <p className="font-bold text-slate-200 tracking-wider">STATEMENT OF PROGRESS BILLING VALUATION</p>
                <p>
                  Valuation breakdown of accomplishments recorded at <strong>{siteNameUpper}</strong> for representative client <strong>{clientName.toUpperCase()}</strong>:
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-sans space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-900 pb-1.5 text-slate-450">
                    <span>Base Project Contract Value:</span>
                    <strong className="font-mono text-white">₱{formattedAmount}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5 text-slate-450">
                    <span>Physical Milestone Finished ({completionPercentage}% progress):</span>
                    <strong className="font-mono text-white">₱{((Number(contractAmount) * Number(completionPercentage)) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5 text-slate-455">
                    <span>Retainage Hold Deduction (10% standard):</span>
                    <strong className="font-mono text-yellow-500">- ₱{((Number(contractAmount) * Number(completionPercentage) * 0.1) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="flex justify-between text-base font-black border-t border-slate-800 pt-2 text-emerald-400">
                    <span>Total Billing Request Due:</span>
                    <span className="font-mono">₱{((Number(contractAmount) * Number(completionPercentage) * 0.9) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider">
                  PAYMENT CYCLE REFERENCE: {billingPeriod}  •  DUE DEADLINE: {dueDate}
                </p>
              </div>
            )}

            {/* Punchlisting QA (New) */}
            {selectedTemplate === 'punchlisting' && (
              <div className="space-y-4">
                <p className="font-bold text-slate-200 tracking-wider">QUALITY CHECK PUNCHLIST LOG</p>
                <p>
                  List of architectural finishes needing touch-up or correction prior to final turnover of site <strong>{siteNameUpper}</strong>:
                </p>
                <div className="bg-slate-95o bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-[11px] text-slate-350 whitespace-pre-wrap leading-relaxed">
                  {punchlistText || 'No outstanding punchlist points recorded. Site meets 100% QA specifications.'}
                </div>
                <div className="bg-slate-950/45 p-3 rounded border border-slate-850 flex justify-between text-[11px] font-sans">
                  <span>QA Inspector: <strong>{engineerName}</strong></span>
                  <span>Target Clear Goal: <strong>{dueDate}</strong></span>
                </div>
              </div>
            )}

            {/* Cover Letter Billing (New) */}
            {selectedTemplate === 'cover_letter_billing' && (
              <div className="space-y-4 font-sans text-[11.5px] leading-relaxed">
                <p>DATE: <strong className="text-slate-100">{selectedDate}</strong></p>
                <p className="font-bold text-white uppercase">ATTN: {clientName.toUpperCase()}</p>
                <p className="font-bold text-white uppercase text-amber-500">RE: PROGRESS MILESTONE BILLING PAYMENT NOTICE</p>
                <p>Dear Ma'am / Sir,</p>
                <p>
                  Greetings from RL Construction! We are pleased to report that physical progress has advanced significantly at your project site: <strong>{siteNameUpper}</strong> as layout in drawing set {drawingCode}.
                </p>
                <p>
                  In accord with these milestones, we have officially compiled the <strong>{billingPeriod} Status Claim</strong>. We have attached the complete Valuation Assessment detailing materials, site payouts, and timesheet logs.
                </p>
                <p>
                  We kindly request payment of the billed sum on or before the due date of <strong>{dueDate}</strong> in order to sustain active material schedules, logistical transport, and workers daily wages.
                </p>
                <p>
                  Sincerely,
                </p>
                <div className="pt-2 font-mono text-yellow-500 font-extrabold text-[12px]">
                  {signatoryName}
                </div>
                <p className="text-[10px] text-slate-500 uppercase leading-none">RL Design-Build General Representative</p>
              </div>
            )}

          </div>

          {/* DOCUMENT FOOTER SIGNATURES PREVIEW */}
          <div className="pt-8 border-t border-slate-800 grid grid-cols-2 gap-8 text-neutral-400 font-sans text-[10.5px]">
            <div className="text-center space-y-4">
              <div className="h-10 flex items-end justify-center">
                <span className="italic text-slate-600 font-bold">[ Digitally Approved ]</span>
              </div>
              <p className="border-t border-slate-850/80 pt-2 font-bold text-slate-200 uppercase font-sans tracking-wide leading-none">{signatoryName}</p>
              <p className="text-[9.5px] text-slate-500 font-mono tracking-widest leading-none mt-1 uppercase">RL Contractor head</p>
            </div>

            <div className="text-center space-y-4">
              <div className="h-10 flex items-end justify-center">
                <span className="italic text-slate-600 font-bold">[ Signature Filed ]</span>
              </div>
              <p className="border-t border-slate-850/80 pt-2 font-bold text-slate-200 uppercase font-sans tracking-wide leading-none">
                {['employment', 'subcontractor', 'waiver', 'materials'].includes(selectedTemplate) ? workerNameUpper : clientName.toUpperCase()}
              </p>
              <p className="text-[9.5px] text-slate-500 font-mono tracking-widest leading-none mt-1 uppercase">
                {['employment', 'subcontractor', 'waiver', 'materials'].includes(selectedTemplate) ? 'Roster Affiant' : 'Approved Client Owner'}
              </p>
            </div>
          </div>

          {/* Reserved notary seal in Preview bottom */}
          {notarized && (
            <div className="mt-4 p-3 bg-slate-950 border border-slate-850 rounded-xl text-center select-none">
              <span className="block text-[8px] font-black text-slate-600 uppercase tracking-widest">
                OFFICIAL CAVITE STRUCTURAL REGISTRY SEAL & NOTARY RESERVE
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
