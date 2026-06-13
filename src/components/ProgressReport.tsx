import React, { useState, useEffect, useRef, useId } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Building2, 
  Calendar, 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  Check, 
  Clock, 
  AlertTriangle,
  Settings, 
  PenTool, 
  ChevronRight, 
  RotateCcw,
  Percent,
  CheckCircle2,
  TrendingUp,
  Paperclip,
  Activity,
  UserCheck
} from 'lucide-react';
import { ConstructionSite, SiteProgressReport, ProgressActivity, ProgressDelay, ProgressDesignIssue, ProgressHistoryEntry, UserRole } from '../types';

interface ProgressReportProps {
  sites: ConstructionSite[];
  currentRole: UserRole;
  assignedSiteId: string;
}

export default function ProgressReport({ sites, currentRole, assignedSiteId }: ProgressReportProps) {
  const compId = useId();
  
  // Selection of active project/site
  const visibleSites = currentRole === 'Admin' ? sites : sites.filter(s => s.id === assignedSiteId);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(() => {
    if (visibleSites.length > 0) return visibleSites[0].id;
    return '';
  });

  const activeSite = sites.find(s => s.id === selectedSiteId) || sites[0];

  // Load and preserve reports in localStorage
  const [reports, setReports] = useState<SiteProgressReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string>('');

  // Signature canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string>(''); // Base64 of signature

  // Pre-populate with beautiful, comprehensive template data matching the user's reference image
  useEffect(() => {
    const saved = localStorage.getItem('rl_site_progress_reports');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setReports(parsed);
        if (parsed.length > 0) {
          // Default to the first report of current site
          const matches = parsed.filter((r: any) => r.siteId === selectedSiteId);
          if (matches.length > 0) {
            setActiveReportId(matches[0].id);
          } else {
            setActiveReportId(parsed[0].id);
          }
        }
      } catch (e) {
        initializeDefaults();
      }
    } else {
      initializeDefaults();
    }
  }, [selectedSiteId]);

  const initializeDefaults = () => {
    const defaultReports: SiteProgressReport[] = sites.map(site => {
      // Generated milestones based on site status
      const historyPoints: ProgressHistoryEntry[] = [
        { date: '2026-05-10', progressPercent: 12 },
        { date: '2026-05-20', progressPercent: 28 },
        { date: '2026-05-30', progressPercent: 46 },
        { date: '2026-06-08', progressPercent: 62 },
      ];

      return {
        id: `report-${site.id}`,
        siteId: site.id,
        formNumber: `RL-PRG-${site.name.toUpperCase().substring(0, 4)}-2026-01`,
        organisation: 'RL CON Construction',
        project: site.name,
        team: `${site.supervisorName || 'Ronald Famorca'} Team`,
        templateId: 'DP-PROD-0009',
        templateVersion: '2',
        formCreated: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' 2:15 PM',
        startDate: '2026-05-01',
        endDate: '2026-06-15',
        worksCompletedDesc: `Construction continues steadily on ${site.location}. Drywall partition framings are 95% complete. High productivity in ceiling finishes and prime electrical lighting layout. Baseline concrete slab has cured 100% and the secondary support structure is safely in place. Scaffoldings are secured standard.`,
        progressPercent: site.progress || 65,
        activities: [
          {
            activity: 'Basement Structure & Floor Screeding',
            comments: 'Basement level structure complete. Levels 3 and 4 floor topping works scheduled next week.',
            photos: 'See attachments: baseline_photo_A.jpg'
          },
          {
            activity: 'Secondary Drywall Wall Partition and framing',
            comments: 'Boarding and aluminum framing completed. High alignment verified by QA team.',
            photos: 'Complied (Photos attached)'
          },
          {
            activity: 'Lighting layout & electrical pulling',
            comments: 'Primary wires layout finished. Safety inspection on floor switches is still pending due to power.',
            photos: 'Ref-Drawing: EL-L1'
          }
        ],
        delays: [
          {
            description: 'Concrete supplier backorder delivery lag',
            dateTime: 'Wednesday, 2026-06-03 2:00 PM',
            photos: 'Missing 2.5t of concrete from Wednesday delivery. Rescheduled Friday morning.'
          },
          {
            description: 'Scaffolding structural alignment inspect delay',
            dateTime: 'Monday, 2026-06-08 9:30 AM',
            photos: 'Minor misalignment repaired before PM signoff approval.'
          }
        ],
        designIssues: [
          {
            description: 'Change to original wall layout on floor 2 due to extra structural columns',
            location: 'Level 2 - Left wing Aisle C',
            drawing: 'Original-Approved-Building-Plan.pdf',
            photos: 'Pending architect review and approvals.'
          }
        ],
        managerComments: 'Work is moving ahead generally as planned. A couple of minor supplier delays but completely restorable. Team is keeping high craftsmanship.',
        managerName: site.supervisorName || 'Ronald C. Famorca',
        signatureData: '',
        history: historyPoints
      };
    });

    setReports(defaultReports);
    if (defaultReports.length > 0) {
      const match = defaultReports.find(r => r.siteId === selectedSiteId);
      setActiveReportId(match ? match.id : defaultReports[0].id);
    }
    localStorage.setItem('rl_site_progress_reports', JSON.stringify(defaultReports));
  };

  // Safe fetch of current active report
  const activeReport = reports.find(r => r.id === activeReportId) || reports.find(r => r.siteId === selectedSiteId);

  // Update a field inside the active report
  const updateReportField = (field: keyof SiteProgressReport, value: any) => {
    if (!activeReport) return;
    const updated = reports.map(r => {
      if (r.id === activeReport.id) {
        return { ...r, [field]: value };
      }
      return r;
    });
    setReports(updated);
    localStorage.setItem('rl_site_progress_reports', JSON.stringify(updated));
  };

  // Add item helper
  const addActivityRow = () => {
    if (!activeReport) return;
    const newActivity: ProgressActivity = { activity: 'New Activity Work', comments: 'Ongoing progress updates', photos: 'N/A' };
    updateReportField('activities', [...activeReport.activities, newActivity]);
  };

  const deleteActivityRow = (index: number) => {
    if (!activeReport) return;
    const filtered = activeReport.activities.filter((_, i) => i !== index);
    updateReportField('activities', filtered);
  };

  const addDelayRow = () => {
    if (!activeReport) return;
    const newDelay: ProgressDelay = { description: 'New Delay Description', dateTime: 'Date & Time details', photos: 'N/A' };
    updateReportField('delays', [...activeReport.delays, newDelay]);
  };

  const deleteDelayRow = (index: number) => {
    if (!activeReport) return;
    const filtered = activeReport.delays.filter((_, i) => i !== index);
    updateReportField('delays', filtered);
  };

  const addDesignIssueRow = () => {
    if (!activeReport) return;
    const newIssue: ProgressDesignIssue = { description: 'New design modification', location: 'Location in site', drawing: 'Sheet Ref #', photos: 'N/A' };
    updateReportField('designIssues', [...activeReport.designIssues, newIssue]);
  };

  const deleteDesignIssueRow = (index: number) => {
    if (!activeReport) return;
    const filtered = activeReport.designIssues.filter((_, i) => i !== index);
    updateReportField('designIssues', filtered);
  };

  const addHistorySnapshot = (newDate: string, newPercent: number) => {
    if (!activeReport) return;
    const sortedHistory = [...activeReport.history, { date: newDate, progressPercent: Number(newPercent) }]
      .sort((a, b) => a.date.localeCompare(b.date));
    updateReportField('history', sortedHistory);
  };

  const deleteHistoryPoint = (index: number) => {
    if (!activeReport) return;
    const filtered = activeReport.history.filter((_, i) => i !== index);
    updateReportField('history', filtered);
  };

  // Signature canvas drawing operations
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#020617'; // slate-950
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // Save image base64
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setSignatureData(dataUrl);
      updateReportField('signatureData', dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureData('');
    updateReportField('signatureData', '');
  };

  const applyDefaultSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw a stylish cursive signature line mock
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e3a8a'; // dark blue
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(25, 45);
    ctx.bezierCurveTo(45, 15, 65, 80, 85, 30);
    ctx.bezierCurveTo(110, 10, 130, 75, 155, 40);
    ctx.lineTo(195, 45);
    ctx.stroke();
    setHasSignature(true);

    const dataUrl = canvas.toDataURL();
    setSignatureData(dataUrl);
    updateReportField('signatureData', dataUrl);
  };

  // Helper date state for progress milestones
  const [newSnapshotDate, setNewSnapshotDate] = useState('2026-06-11');
  const [newSnapshotValue, setNewSnapshotValue] = useState(70);

  // Generate Report PDF with exact high fidelity specifications & the brand gold house logo
  const generatePDFReport = () => {
    if (!activeReport) return;

    const doc = new jsPDF('p', 'mm', 'a4');

    // PAGE 1 HEADER - Charcoal Dark Branding box matching user uploaded logo background exactly
    doc.setFillColor(24, 28, 36); // Charcoal Black
    doc.rect(0, 0, 210, 38, 'F');

    // Elegant gold bottom border acting as baseline border on the header
    doc.setDrawColor(229, 192, 96); // Metallic Gold #E5C060
    doc.setLineWidth(1.2);
    doc.line(0, 38, 210, 38);
    
    // Draw RL CON Vector Logo (Gold and White) matching the uploaded image exactly
    const logoX = 14;
    const logoY = 6;
    
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

    // Right-aligned Metadata Grid
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(229, 192, 96); // Gold heading
    doc.text(`Organisation: ${activeReport.organisation}`, 194, 13, { align: 'right' });
    doc.setTextColor(241, 245, 249); // White-ish text
    doc.text(`Project: ${activeReport.project}`, 194, 18, { align: 'right' });
    doc.text(`Team: ${activeReport.team}`, 194, 22, { align: 'right' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`Template ID: ${activeReport.templateId} | Version: ${activeReport.templateVersion}`, 194, 26, { align: 'right' });
    doc.text(`Form Created: ${activeReport.formCreated}`, 194, 30, { align: 'right' });

    // Document Main title of Progress Report
    doc.setTextColor(15, 23, 42); // Navy/Slate-900
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Building Progress Report', 16, 50);

    // Horizontal boundary
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.line(16, 54, 194, 54);

    // Section 1: Top-level form info
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Automated Form Number:', 16, 62);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(activeReport.formNumber, 54, 62);

    doc.setFont('Helvetica', 'bold');
    doc.text('Reporting Period:', 16, 68);
    doc.setFont('Helvetica', 'normal');
    const periodText = `${activeReport.startDate} — to — ${activeReport.endDate}`;
    doc.text(periodText, 54, 68);

    doc.setFont('Helvetica', 'bold');
    doc.text('Completion Status:', 16, 74);
    
    // Draw graphical colored progress bar inside PDF!
    doc.setFillColor(241, 245, 249); // Empty background (slate-100)
    doc.rect(54, 71, 70, 4, 'F');
    doc.setFillColor(212, 175, 55); // Filled Gold
    const barWidth = (70 * activeReport.progressPercent) / 100;
    doc.rect(54, 71, barWidth, 4, 'F');
    
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${activeReport.progressPercent}% Completed`, 130, 74);

    // Brief description of works completed section (in a beautiful layout box)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Brief Description of Works Completed:', 16, 83);
    
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(16, 86, 178, 20, 'F');
    doc.setDrawColor(226, 232, 240); // border
    doc.rect(16, 86, 178, 20, 'S');

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85); // slate-700
    const lines = doc.splitTextToSize(activeReport.worksCompletedDesc, 172);
    doc.text(lines, 19, 91);

    // Section 2: Summary of Progress Table (Activity Summary)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Summary of Progress Activities', 16, 114);

    const activitiesBody = activeReport.activities.map(act => [act.activity, act.comments, act.photos || 'N/A']);
    autoTable(doc, {
      startY: 117,
      margin: { left: 16, right: 16 },
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
      head: [['Activity Component', 'Progress Status & Work comments', 'Evidence / Attachment Note']],
      body: activitiesBody,
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 90 },
        2: { cellWidth: 38 }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // Page overflow handler
    if (currentY + 60 > 280) {
      doc.addPage();
      currentY = 20;
    }

    // Section 3: Delays Table
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Delays Identified', 16, currentY);

    const delaysBody = activeReport.delays.map(del => [del.description, del.dateTime, del.photos || 'N/A']);
    autoTable(doc, {
      startY: currentY + 3,
      margin: { left: 16, right: 16 },
      theme: 'grid',
      headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
      head: [['Delay Description', 'Incident Date & Time', 'Action & Delay Details']],
      body: delaysBody,
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 45 },
        2: { cellWidth: 78 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Check boundary
    if (currentY + 50 > 280) {
      doc.addPage();
      currentY = 20;
    }

    // Section 4: Design Issues Table
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Design & Structural Issues', 16, currentY);

    const designBody = activeReport.designIssues.map(issue => [issue.description, issue.location, issue.drawing, issue.photos || 'N/A']);
    autoTable(doc, {
      startY: currentY + 3,
      margin: { left: 16, right: 16 },
      theme: 'grid',
      headStyles: { fillColor: [148, 163, 184], textColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
      head: [['Design Issue Description', 'Site Location', 'Plan Drawing Reference', 'Current Solution Outline']],
      body: designBody,
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 35 },
        2: { cellWidth: 45 },
        3: { cellWidth: 43 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Sign-off & PM Comments Box
    if (currentY + 60 > 280) {
      doc.addPage();
      currentY = 20;
    }

    // Box header
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(16, currentY, 178, 45, 'F');
    doc.setDrawColor(226, 232, 240); // border
    doc.rect(16, currentY, 178, 45, 'S');

    // PM Comments
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Project Manager / Supervisor Summary Remarks:', 20, currentY + 6);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const commentsLines = doc.splitTextToSize(activeReport.managerComments, 105);
    doc.text(commentsLines, 20, currentY + 11);

    // Signature image rendering inside signbox
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('PROJECT DIRECTOR SIGN-OFF:', 130, currentY + 6);
    
    doc.line(130, currentY + 28, 184, currentY + 28); // line for signature

    if (activeReport.signatureData) {
      try {
        doc.addImage(activeReport.signatureData, 'PNG', 135, currentY + 8, 40, 18);
      } catch (err) {
        // failed image loading, draw fallback text
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(10);
        doc.text(activeReport.managerName, 135, currentY + 18);
      }
    } else if (signatureData) {
      try {
        doc.addImage(signatureData, 'PNG', 135, currentY + 8, 40, 18);
      } catch (err) {
        // ignore
      }
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(activeReport.managerName.toUpperCase(), 130, currentY + 32);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Site Manager Signature', 130, currentY + 36);
    doc.text(`Signed: ${activeReport.formCreated.split(' 2:')[0]}`, 130, currentY + 40);

    // Footer copyright
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('RL CON Construction Management System | Official Verified Site Update', 16, currentY + 52);
    doc.text('Page 1 of 1', 194, currentY + 52, { align: 'right' });

    // Save
    doc.save(`RL_Progress_Report_${activeReport.formNumber}.pdf`);
  };

  // Coordinates data calculation for responsive line & area chart plotting
  const drawSVGChart = () => {
    if (!activeReport || activeReport.history.length === 0) return null;

    const width = 500;
    const height = 150;
    const padding = 30;

    const points = activeReport.history;
    const minPercent = 0;
    const maxPercent = 100;

    // Map x coordinates spaced evenly
    const stepX = (width - padding * 2) / Math.max(1, points.length - 1);
    
    const coordPoints = points.map((p, index) => {
      const x = padding + index * stepX;
      // y is mapped from top-down, so 100% is near the top (padding) and 0% is near bottom (height - padding)
      const ratio = p.progressPercent / 100;
      const y = height - padding - ratio * (height - padding * 2);
      return { x, y, date: p.date, val: p.progressPercent };
    });

    // Create line path
    let linePath = `M ${coordPoints[0].x} ${coordPoints[0].y}`;
    for (let i = 1; i < coordPoints.length; i++) {
      linePath += ` L ${coordPoints[i].x} ${coordPoints[i].y}`;
    }

    // Create area path
    const areaPath = `${linePath} L ${coordPoints[coordPoints.length - 1].x} ${height - padding} L ${coordPoints[0].x} ${height - padding} Z`;

    return (
      <svg className="w-full h-[180px] bg-slate-900 rounded-xl p-3 border border-slate-800" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eab308" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((grid, i) => {
          const ratio = grid / 100;
          const y = height - padding - ratio * (height - padding * 2);
          return (
            <g key={i}>
              <line 
                x1={padding} 
                y1={y} 
                x2={width - padding} 
                y2={y} 
                stroke="#334155" 
                strokeWidth={1} 
                strokeDasharray="4 4" 
              />
              <text 
                x={padding - 8} 
                y={y + 3} 
                fill="#94a3b8" 
                fontSize={8} 
                fontFamily="sans-serif" 
                textAnchor="end"
              >
                {grid}%
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Main Line */}
        <path d={linePath} fill="none" stroke="#eab308" strokeWidth={3} />

        {/* Data circles & text */}
        {coordPoints.map((pt, idx) => (
          <g key={idx} className="group cursor-pointer">
            <circle 
              cx={pt.x} 
              cy={pt.y} 
              r={5} 
              fill="#eab308" 
              stroke="#020617" 
              strokeWidth={1.5} 
            />
            {/* Value popups */}
            <text 
              x={pt.x} 
              y={pt.y - 10} 
              fill="#ffffff" 
              fontSize={9} 
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
              className="bg-slate-950 px-1 py-0.5 rounded shadow"
            >
              {pt.val}%
            </text>
            {/* Axis labels */}
            <text 
              x={pt.x} 
              y={height - padding + 15} 
              fill="#94a3b8" 
              fontSize={8} 
              fontFamily="sans-serif" 
              textAnchor="middle"
            >
              {pt.date.substring(5)}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  if (!activeReport) {
    return (
      <div className="bg-white p-8 rounded-xl text-center border">
        <LoaderSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6" id={compId}>
      {/* Title block */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-yellow-550 shadow-md text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-yellow-500 text-slate-950 font-bold px-2 py-0.5 rounded uppercase tracking-wider">RL Brand Suite</span>
              <span className="text-slate-400 text-xs">A4 Format Compliant</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              Project Progress Estimator & PDF Constructor
            </h1>
            <p className="text-xs text-slate-350 max-w-2xl">
              Construct real-time progress reports matching RL CON Construction guidelines. Add dynamic milestones, logs of delays, and project design corrections in live PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={generatePDFReport}
              className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold uppercase rounded-lg px-4 py-2 text-xs flex items-center gap-2 shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-950 stroke-[3]" />
              Export Progress PDF
            </button>
            <button
              onClick={initializeDefaults}
              title="Reset report changes to factory database values"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 uppercase rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Grid configuration settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Controls, metadata & dynamic milestone plotting */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Site selection panel */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b pb-2">
              <Building2 className="w-4 h-4 text-yellow-600" />
              <h2 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">Select active project site</h2>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase block">Project Site location</label>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-2 font-bold text-slate-800 focus:outline-hidden focus:border-yellow-500"
              >
                {visibleSites.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
                ))}
              </select>
            </div>

            {/* Quick status attributes card */}
            <div className="bg-slate-50 p-2.5 rounded-lg border text-xs text-slate-650 space-y-1.5">
              <p>📍 <strong>Location:</strong> {activeSite.location}</p>
              <p>👷 <strong>Site Supervisor:</strong> {activeSite.supervisorName || 'Ronald Famorca'}</p>
              <p>💰 <strong>Estimated Value:</strong> ₱ {activeSite.projectValue?.toLocaleString('en-US')}</p>
              <p>📊 <strong>Global Status:</strong> <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black uppercase text-[9px]">{activeSite.status}</span></p>
            </div>
          </div>

          {/* Interactive progress multiplier controller */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">Adjustment of progress %</h3>
              </div>
              <span className="bg-emerald-500 text-white font-black font-mono text-xs px-2.5 py-1 rounded">
                {activeReport.progressPercent}%
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>0% Planning</span>
                <span>50% Mid</span>
                <span>100% Handover</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={activeReport.progressPercent}
                onChange={(e) => updateReportField('progressPercent', Number(e.target.value))}
                className="w-full accent-yellow-500 cursor-ew-resize h-2 bg-slate-100 rounded-lg appearance-none"
              />
            </div>

            {/* Visual progress bar representation in CSS */}
            <div className="relative pt-1">
              <div className="overflow-hidden h-4 text-xs flex rounded bg-slate-100 border">
                <div 
                  style={{ width: `${activeReport.progressPercent}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500 font-bold font-mono text-[9px] transition-all duration-300"
                >
                  {activeReport.progressPercent >= 15 ? `${activeReport.progressPercent}% DONE` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive graph snap plotters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">Milestone Timeline Snapshots</h3>
            </div>

            {/* Dynamic svg plotter view */}
            {drawSVGChart()}

            {/* Quick snapshot plotter tool form */}
            <div className="bg-slate-50 p-2.5 rounded-lg border space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500 block">Add Progress plot snapshot point</span>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-450 block uppercase">Target Date</label>
                  <input
                    type="date"
                    value={newSnapshotDate}
                    onChange={(e) => setNewSnapshotDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-xs px-2 py-1 rounded"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-450 block uppercase">Progress %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newSnapshotValue}
                    onChange={(e) => setNewSnapshotValue(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 text-xs px-2 py-1 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <button
                onClick={() => addHistorySnapshot(newSnapshotDate, newSnapshotValue)}
                className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] py-1 rounded uppercase tracking-wider cursor-pointer"
              >
                Plot Snapshot Data Point
              </button>
            </div>

            {/* List of current plotted snap points */}
            <div className="max-h-[110px] overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
              {activeReport.history.map((pt, idx) => (
                <div key={idx} className="flex justify-between items-center p-1 bg-white border rounded">
                  <span className="text-slate-600 font-bold">{pt.date}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-700 font-black">{pt.progressPercent}%</span>
                    <button 
                      onClick={() => deleteHistoryPoint(idx)}
                      className="text-rose-500 hover:text-rose-600 cursor-pointer"
                      title="Delete plotting node"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* MID & RIGHT COLUMN: FULL CUSTOMISABLE TEMPLATE BUILDER */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Printable Layout Box Mockup */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Header Block matching uploaded image style */}
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center border-b border-yellow-500">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-black tracking-widest text-yellow-400">Official Report Sheet</span>
                <p className="font-extrabold text-[15px] uppercase tracking-wide">Building Progress template</p>
              </div>

              <div className="text-right text-[10px] font-mono opacity-85">
                <p>Template ID: {activeReport.templateId}</p>
                <p>Ver: {activeReport.templateVersion}</p>
              </div>
            </div>

            {/* Template input form configuration properties */}
            <div className="p-6 space-y-5">
              
              {/* Box 1: Core Form Numbers & Period */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-500">Automated Form No.</label>
                  <input
                    type="text"
                    value={activeReport.formNumber}
                    onChange={(e) => updateReportField('formNumber', e.target.value)}
                    className="w-full text-xs font-black bg-white border rounded px-2.5 py-1.5 font-mono text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-500">Organisation</label>
                  <input
                    type="text"
                    value={activeReport.organisation}
                    onChange={(e) => updateReportField('organisation', e.target.value)}
                    className="w-full text-xs font-bold bg-white border rounded px-2.5 py-1.5 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-500">Manager Team</label>
                  <input
                    type="text"
                    value={activeReport.team}
                    onChange={(e) => updateReportField('team', e.target.value)}
                    className="w-full text-xs bg-white border rounded px-2.5 py-1.5 text-slate-800 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-500">Reporting Range: Start</label>
                  <input
                    type="date"
                    value={activeReport.startDate}
                    onChange={(e) => updateReportField('startDate', e.target.value)}
                    className="w-full text-xs bg-white border rounded px-2 py-1 text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-500">Reporting Range: End</label>
                  <input
                    type="date"
                    value={activeReport.endDate}
                    onChange={(e) => updateReportField('endDate', e.target.value)}
                    className="w-full text-xs bg-white border rounded px-2 py-1 text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-500">Date Log Created</label>
                  <input
                    type="text"
                    value={activeReport.formCreated}
                    onChange={(e) => updateReportField('formCreated', e.target.value)}
                    className="w-full text-xs bg-white border rounded px-2 py-1 text-slate-700"
                  />
                </div>
              </div>

              {/* Box 2: Narrative description description of accomplishments */}
              <div className="space-y-1 bg-white p-3 rounded-xl border">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Brief Description of Works Completed</label>
                  <span className="text-[9px] text-slate-400">Visible on top block of PDF</span>
                </div>
                <textarea
                  rows={3}
                  value={activeReport.worksCompletedDesc}
                  onChange={(e) => updateReportField('worksCompletedDesc', e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden"
                  placeholder="Detail structural progress accomplishments, masonry highlights, electric wires installed etc..."
                />
              </div>

              {/* Box 3: Dynamic Activities table */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center border-b pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">Summary of progress Activities</h3>
                  </div>
                  <button
                    onClick={addActivityRow}
                    className="bg-slate-900 text-white font-extrabold text-[9px] uppercase tracking-wider py-1 px-2.5 rounded-md hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-yellow-400" />
                    Add Activity
                  </button>
                </div>

                <div className="space-y-3 divide-y divide-dashed">
                  {activeReport.activities.map((act, index) => (
                    <div key={index} className="pt-2 flex flex-col md:flex-row gap-3">
                      <div className="flex-1 space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Activity description</span>
                        <input
                          type="text"
                          value={act.activity}
                          onChange={(e) => {
                            const updated = [...activeReport.activities];
                            updated[index].activity = e.target.value;
                            updateReportField('activities', updated);
                          }}
                          className="w-full text-xs font-bold p-1 px-2 border rounded bg-slate-50"
                        />
                      </div>
                      <div className="flex-[1.5] space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Comments & detailed status</span>
                        <input
                          type="text"
                          value={act.comments}
                          onChange={(e) => {
                            const updated = [...activeReport.activities];
                            updated[index].comments = e.target.value;
                            updateReportField('activities', updated);
                          }}
                          className="w-full text-xs p-1 px-2 border rounded bg-slate-50"
                        />
                      </div>
                      <div className="flex-[0.8] space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Photo / Note</span>
                        <input
                          type="text"
                          value={act.photos || ''}
                          onChange={(e) => {
                            const updated = [...activeReport.activities];
                            updated[index].photos = e.target.value;
                            updateReportField('activities', updated);
                          }}
                          className="w-full text-xs p-1 px-2 border rounded bg-slate-50"
                        />
                      </div>
                      <div className="flex items-end pb-0.5 justify-end">
                        <button
                          onClick={() => deleteActivityRow(index)}
                          className="p-1 text-rose-500 hover:text-rose-600 cursor-pointer"
                          title="Delete work item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 4: Delays Table */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center border-b pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">Identified Delays</h3>
                  </div>
                  <button
                    onClick={addDelayRow}
                    className="bg-slate-900 text-white font-extrabold text-[9px] uppercase tracking-wider py-1 px-2.5 rounded-md hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-yellow-400" />
                    Add Delay Log
                  </button>
                </div>

                <div className="space-y-3 divide-y divide-dashed">
                  {activeReport.delays.map((del, index) => (
                    <div key={index} className="pt-2 flex flex-col md:flex-row gap-3">
                      <div className="flex-1 space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Delay Name / cause</span>
                        <input
                          type="text"
                          value={del.description}
                          onChange={(e) => {
                            const updated = [...activeReport.delays];
                            updated[index].description = e.target.value;
                            updateReportField('delays', updated);
                          }}
                          className="w-full text-xs p-1 px-2 border rounded bg-slate-50 font-semibold"
                        />
                      </div>
                      <div className="flex-[0.8] space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Date & Time incident</span>
                        <input
                          type="text"
                          value={del.dateTime}
                          onChange={(e) => {
                            const updated = [...activeReport.delays];
                            updated[index].dateTime = e.target.value;
                            updateReportField('delays', updated);
                          }}
                          className="w-full text-xs p-1 px-2 border rounded bg-slate-50"
                        />
                      </div>
                      <div className="flex-[1.2] space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Mitigation & comment</span>
                        <input
                          type="text"
                          value={del.photos || ''}
                          onChange={(e) => {
                            const updated = [...activeReport.delays];
                            updated[index].photos = e.target.value;
                            updateReportField('delays', updated);
                          }}
                          className="w-full text-xs p-1 px-2 border rounded bg-slate-50"
                        />
                      </div>
                      <div className="flex items-end pb-0.5 justify-end">
                        <button
                          onClick={() => deleteDelayRow(index)}
                          className="p-1 text-rose-500 hover:text-rose-600 cursor-pointer"
                          title="Delete delay point"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 5: Design Issues */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center border-b pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider">Design Corrections & Issues</h3>
                  </div>
                  <button
                    onClick={addDesignIssueRow}
                    className="bg-slate-900 text-white font-extrabold text-[9px] uppercase tracking-wider py-1 px-2.5 rounded-md hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-yellow-400" />
                    Add Design Correction
                  </button>
                </div>

                <div className="space-y-3 divide-y divide-dashed">
                  {activeReport.designIssues.map((issue, index) => (
                    <div key={index} className="pt-2 flex flex-col md:flex-row gap-3">
                      <div className="flex-1 space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Issue description</span>
                        <input
                          type="text"
                          value={issue.description}
                          onChange={(e) => {
                            const updated = [...activeReport.designIssues];
                            updated[index].description = e.target.value;
                            updateReportField('designIssues', updated);
                          }}
                          className="w-full text-xs p-1 px-2 border rounded bg-slate-50"
                        />
                      </div>
                      <div className="flex-[0.5] space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Location</span>
                        <input
                          type="text"
                          value={issue.location}
                          onChange={(e) => {
                            const updated = [...activeReport.designIssues];
                            updated[index].location = e.target.value;
                            updateReportField('designIssues', updated);
                          }}
                          className="w-full text-xs p-1 px-2 border rounded bg-slate-50"
                        />
                      </div>
                      <div className="flex-[0.7] space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Drawing Ref</span>
                        <input
                          type="text"
                          value={issue.drawing}
                          onChange={(e) => {
                            const updated = [...activeReport.designIssues];
                            updated[index].drawing = e.target.value;
                            updateReportField('designIssues', updated);
                          }}
                          className="w-full text-xs p-1 px-2 border rounded bg-slate-50"
                        />
                      </div>
                      <div className="flex-[0.8] space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Status Update</span>
                        <input
                          type="text"
                          value={issue.photos || ''}
                          onChange={(e) => {
                            const updated = [...activeReport.designIssues];
                            updated[index].photos = e.target.value;
                            updateReportField('designIssues', updated);
                          }}
                          className="w-full text-xs p-1 px-2 border rounded bg-slate-50"
                        />
                      </div>
                      <div className="flex items-end pb-0.5 justify-end">
                        <button
                          onClick={() => deleteDesignIssueRow(index)}
                          className="p-1 text-rose-500 hover:text-rose-600 cursor-pointer"
                          title="Delete issue point"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 6: Signoff, Signature Drawing & PM Remarks */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase text-slate-800 tracking-wide">PM General remarks Comments</h4>
                  <textarea
                    rows={4}
                    value={activeReport.managerComments}
                    onChange={(e) => updateReportField('managerComments', e.target.value)}
                    className="w-full text-xs p-2 border rounded-lg focus:outline-hidden focus:bg-white"
                    placeholder="Concluding general remarks like: 'Work is moving ahead as planned with minor, mitigated risks...'"
                  />

                  <div className="space-y-1 mt-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500 block">Lead Project Manager Name</label>
                    <input
                      type="text"
                      value={activeReport.managerName}
                      onChange={(e) => updateReportField('managerName', e.target.value)}
                      className="w-full text-xs font-black bg-white border rounded p-1.5 text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-extrabold uppercase text-slate-800 tracking-wide flex items-center gap-1">
                      <PenTool className="w-3.5 h-3.5 text-yellow-600" />
                      Signature Autograph board
                    </h4>
                    <div className="flex gap-1.5">
                      <button
                        onClick={applyDefaultSignature}
                        className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[8px] uppercase tracking-wide py-1 px-2 rounded cursor-pointer"
                      >
                        Auto-Sign
                      </button>
                      <button
                        onClick={clearSignature}
                        className="bg-white border hover:bg-slate-100 text-slate-600 font-bold text-[8px] uppercase tracking-wide py-1 px-2 rounded cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white relative h-[140px] flex flex-col justify-between">
                    <canvas
                      ref={canvasRef}
                      width={280}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-full cursor-crosshair absolute top-0 left-0"
                    />

                    {!hasSignature && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] text-slate-400 font-semibold uppercase pointer-events-none gap-1 bg-slate-50/70 select-none">
                        <PenTool className="w-5 h-5 text-slate-350" />
                        Draw manager signature here
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] text-slate-500 italic block leading-tight text-center font-semibold">
                    Sketch signature directly or tap "Auto-Sign" to prefill the authorized vector line for CEO Famorca.
                  </span>
                </div>

              </div>

            </div>

            {/* Print compliance disclaimer message  */}
            <div className="bg-slate-50 p-3.5 border-t text-center text-[9px] text-slate-400 font-semibold select-none leading-relaxed uppercase">
              Notice: Verified progress tracking report. Render logs under strict guidelines. CEO audited and locked.
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

function LoaderSpinner() {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-2">
      <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-yellow-500 animate-spin" />
      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Constructing reports...</span>
    </div>
  );
}
