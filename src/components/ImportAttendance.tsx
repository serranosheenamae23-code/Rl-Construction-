import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  HelpCircle, 
  PlusCircle, 
  X,
  RefreshCw,
  Info
} from 'lucide-react';
import { Worker, AttendanceRecord, ConstructionSite } from '../types';
import { formatCurrency } from '../utils';

interface ImportAttendanceProps {
  workers: Worker[];
  sites: ConstructionSite[];
  defaultDate: string;
  defaultSiteId: string;
  onImportComplete: (records: Omit<AttendanceRecord, 'id'>[]) => void;
  onClose: () => void;
}

interface ParsedRow {
  key: string;
  rawLine: string;
  scannedName: string;
  scannedStatus: string;
  scannedDate: string;
  scannedSiteName: string;
  
  // Resolved state
  matchedWorkerId: string; // empty string if not mapped
  matchedSiteId: string;
  status: 'Present' | 'Absent' | 'Half-Day';
  date: string;
  notes: string;
  
  // Validation issues
  error?: string;
}

export const ImportAttendance: React.FC<ImportAttendanceProps> = ({
  workers,
  sites,
  defaultDate,
  defaultSiteId,
  onImportComplete,
  onClose,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [selectedSiteId, setSelectedSiteId] = useState(defaultSiteId === 'all' ? (sites[0]?.id || '') : defaultSiteId);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [showGuide, setShowGuide] = useState(true);
  const [importFeedback, setImportFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV/TSV/pasted spreadsheet rows helper
  const handleParseData = (textToParse: string) => {
    if (!textToParse.trim()) {
      return;
    }

    const lines = textToParse.split(/\r?\n/);
    const newParsedRows: ParsedRow[] = [];
    
    // Check if first line resembles a header
    let startIdx = 0;
    const firstLine = lines[0]?.toLowerCase() || '';
    if (
      firstLine.includes('name') || 
      firstLine.includes('worker') || 
      firstLine.includes('status') || 
      firstLine.includes('attendance') ||
      firstLine.includes('rate')
    ) {
      startIdx = 1; // skip header columns
    }

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by tab, comma, or semicolon
      let parts = line.split('\t');
      if (parts.length <= 1) {
        parts = line.split(',');
      }
      if (parts.length <= 1) {
        parts = line.split(';');
      }

      // Cleanup extra quotation marks from CSV values
      const cleanedParts = parts.map(p => p.trim().replace(/^["']|["']$/g, ''));

      // Scannable fragments
      let scannedName = '';
      let scannedStatus = '';
      let scannedDate = '';
      let scannedSiteName = '';
      let scannedNotes = '';

      if (cleanedParts.length === 1) {
        // Just name or raw line
        scannedName = cleanedParts[0];
      } else if (cleanedParts.length === 2) {
        // Assume Name, Status
        scannedName = cleanedParts[0];
        scannedStatus = cleanedParts[1];
      } else if (cleanedParts.length === 3) {
        // Assume Name, Status, Date OR Site
        scannedName = cleanedParts[0];
        scannedStatus = cleanedParts[1];
        if (cleanedParts[2].match(/\d{4}[-/]\d{2}[-/]\d{2}/) || cleanedParts[2].includes('/')) {
          scannedDate = cleanedParts[2];
        } else {
          scannedSiteName = cleanedParts[2];
        }
      } else {
        // General: Col 0: Name, Col 1: Status, Col 2: Date/Site, Col 3: Site/Notes
        scannedName = cleanedParts[0];
        scannedStatus = cleanedParts[1];
        
        // Iteratively search for standard date patterns
        const dateMatch = cleanedParts.find(p => p.match(/^\d{4}-\d{2}-\d{2}$/) || p.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/));
        if (dateMatch) {
          scannedDate = dateMatch;
        }

        // Find standard site match or leftover columns
        const siteMatch = cleanedParts.find(p => {
          if (p === dateMatch) return false;
          return sites.some(s => s.name.toLowerCase().includes(p.toLowerCase()));
        });

        if (siteMatch) {
          scannedSiteName = siteMatch;
        }

        // Map positions if not found by heuristics
        if (!scannedDate && cleanedParts[2]?.match(/\d/)) {
          scannedDate = cleanedParts[2];
        }
        if (!scannedSiteName && cleanedParts[3]) {
          scannedSiteName = cleanedParts[3];
        } else if (!scannedSiteName && cleanedParts[2] && cleanedParts[2] !== scannedDate) {
          scannedSiteName = cleanedParts[2];
        }
        
        if (cleanedParts.length > 4) {
          scannedNotes = cleanedParts.slice(4).join(' ');
        }
      }

      // 1. Resolve Worker ID
      let matchedWorkerId = '';
      const nameLower = scannedName.toLowerCase().replace(/\s+/g, '');
      
      // Match active workers
      const resolvedWorker = workers.find(w => {
        const wNameLower = w.name.toLowerCase().replace(/\s+/g, '');
        return wNameLower === nameLower || wNameLower.includes(nameLower) || nameLower.includes(wNameLower);
      });

      if (resolvedWorker) {
        matchedWorkerId = resolvedWorker.id;
      }

      // 2. Resolve Status
      let finalStatus: 'Present' | 'Absent' | 'Half-Day' = 'Present';
      const statusLower = scannedStatus.toLowerCase().trim();
      if (statusLower.includes('abs') || statusLower === 'a' || statusLower === '0' || statusLower === 'absent') {
        finalStatus = 'Absent';
      } else if (statusLower.includes('half') || statusLower === 'h' || statusLower === 'hd' || statusLower === '0.5' || statusLower.includes('part') || statusLower === 'half-day') {
        finalStatus = 'Half-Day';
      } else {
        finalStatus = 'Present'; // default
      }

      // 3. Resolve Site
      let matchedSiteId = selectedSiteId; // fallback to active selection
      if (scannedSiteName) {
        const siteLower = scannedSiteName.toLowerCase();
        const foundSite = sites.find(s => s.name.toLowerCase().includes(siteLower) || siteLower.includes(s.name.toLowerCase()));
        if (foundSite) {
          matchedSiteId = foundSite.id;
        }
      } else if (resolvedWorker) {
        // Fallback to worker default assigned site
        matchedSiteId = resolvedWorker.assignedSiteId;
      }

      // 4. Resolve Date
      let finalDate = selectedDate;
      if (scannedDate) {
        // Standardize YYYY-MM-DD
        try {
          const parsedD = new Date(scannedDate);
          if (!isNaN(parsedD.getTime())) {
            finalDate = parsedD.toISOString().split('T')[0];
          }
        } catch (_) {}
      }

      newParsedRows.push({
        key: `row-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        rawLine: line,
        scannedName,
        scannedStatus,
        scannedDate,
        scannedSiteName,
        matchedWorkerId,
        matchedSiteId,
        status: finalStatus,
        date: finalDate,
        notes: scannedNotes || 'Bulk batch processed',
        error: !matchedWorkerId ? `Unrecognized worker name: "${scannedName}"` : undefined
      });
    }

    setParsedRows(prev => [...prev, ...newParsedRows]);
    setPasteText('');
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleParseData(text);
      }
    };
    reader.onerror = () => {
      alert('Failed to read the selected text file.');
    };
    reader.readAsText(file);
  };

  // Trigger import submission
  const handleFinalImport = () => {
    // Audit parsed rows for missing workers
    const invalidRowsCount = parsedRows.filter(r => !r.matchedWorkerId).length;
    if (invalidRowsCount > 0) {
      if (!confirm(`You have ${invalidRowsCount} row(s) whose worker matches could not be identified automatically. If you proceed, these rows will be ignored. Continue?`)) {
        return;
      }
    }

    const validRows = parsedRows.filter(r => r.matchedWorkerId);
    if (validRows.length === 0) {
      alert('There are no valid mapped worker records to import! Please choose matching staff in the grid.');
      return;
    }

    // Convert to proper AttendanceRecord payload
    const finalPayload = validRows.map(row => {
      const worker = workers.find(w => w.id === row.matchedWorkerId)!;
      let multiplier = 0;
      if (row.status === 'Present') multiplier = 1;
      if (row.status === 'Half-Day') multiplier = 0.5;

      const wageEarned = worker.dailyRate * multiplier;

      return {
        date: row.date,
        workerId: row.matchedWorkerId,
        siteId: row.matchedSiteId,
        status: row.status,
        wageEarned,
        notes: row.notes,
      };
    });

    onImportComplete(finalPayload);
    setImportFeedback({
      success: true,
      message: `Successfully imported and locked ${finalPayload.length} shifts into the supervisor ledger!`,
    });

    // Reset list after a delay and close
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleUpdateRowWorker = (rowKey: string, workerId: string) => {
    setParsedRows(prev => prev.map(row => {
      if (row.key === rowKey) {
        return {
          ...row,
          matchedWorkerId: workerId,
          error: !workerId ? 'Unrecognized worker name' : undefined
        };
      }
      return row;
    }));
  };

  const handleUpdateRowStatus = (rowKey: string, status: ParsedRow['status']) => {
    setParsedRows(prev => prev.map(row => {
      if (row.key === rowKey) {
        return { ...row, status };
      }
      return row;
    }));
  };

  const handleUpdateRowSite = (rowKey: string, siteId: string) => {
    setParsedRows(prev => prev.map(row => {
      if (row.key === rowKey) {
        return { ...row, matchedSiteId: siteId };
      }
      return row;
    }));
  };

  const handleUpdateRowDate = (rowKey: string, date: string) => {
    setParsedRows(prev => prev.map(row => {
      if (row.key === rowKey) {
        return { ...row, date };
      }
      return row;
    }));
  };

  const handleDeleteRow = (rowKey: string) => {
    setParsedRows(prev => prev.filter(row => row.key !== rowKey));
  };

  const handleClearPreview = () => {
    if (confirm('Clear all parsed rows?')) {
      setParsedRows([]);
    }
  };

  // Preset sample paste values to make testing painless and joyful for supervisors
  const loadExampleData = () => {
    const activeStaff = workers.filter(w => w.active).slice(0, 3);
    const names = activeStaff.length > 0 ? activeStaff.map(w => w.name) : ['Samuel Jackson', 'Cardo Dalisay', 'Maria Santos'];
    const sample = `${names[0] || 'Samuel Jackson'}	Present	${selectedDate}
${names[1] || 'Cardo Dalisay'}	Half-Day	${selectedDate}
${names[2] || 'Maria Santos'}	Absent	${selectedDate}`;
    setPasteText(sample);
  };

  // Calculations for preview stats
  const totalAmount = parsedRows.reduce((sum, row) => {
    if (!row.matchedWorkerId) return sum;
    const worker = workers.find(w => w.id === row.matchedWorkerId);
    if (!worker) return sum;

    let multiplier = 0;
    if (row.status === 'Present') multiplier = 1;
    if (row.status === 'Half-Day') multiplier = 0.5;
    return sum + (worker.dailyRate * multiplier);
  }, 0);

  const matchedCount = parsedRows.filter(r => r.matchedWorkerId).length;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-6 mx-auto w-full max-w-5xl animate-fade-in shadow-sm">
      
      {/* Drawer Title Block */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-yellow-400 text-slate-900 p-2 rounded-xl flex items-center justify-center font-bold shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Bulk Spreadsheet Attendance Importer</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Map and ingest mass worker attendance entries in seconds.</p>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="p-1 px-2 border border-slate-200 hover:bg-slate-200 text-slate-400 hover:text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs select-none"
        >
          Close Importer ✕
        </button>
      </div>

      {importFeedback && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border flex items-center gap-3 font-semibold text-xs leading-5 shadow-xs ${
            importFeedback.success 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
              : 'bg-rose-50 text-rose-800 border-rose-100'
          }`}
        >
          {importFeedback.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span>{importFeedback.message}</span>
        </motion.div>
      )}

      {/* Form Setup Fields */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs">
        <div className="md:col-span-4 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Default Date (Internal Fallback)</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              // Update all parsed rows dates that use fallback
              setParsedRows(prev => prev.map(row => ({
                ...row,
                date: row.scannedDate ? row.date : e.target.value
              })));
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 font-medium text-slate-900 focus:outline-hidden focus:border-yellow-500 text-center"
          />
          <span className="text-[9px] text-slate-400 block font-medium">Rows without explicit dates will default to this date.</span>
        </div>

        <div className="md:col-span-5 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Default Project Site Placement</label>
          <select 
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value);
              // Update all parsed rows sites that use fallback
              setParsedRows(prev => prev.map(row => ({
                ...row,
                matchedSiteId: row.scannedSiteName ? row.matchedSiteId : e.target.value
              })));
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 font-medium text-slate-900 cursor-pointer focus:outline-hidden"
          >
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name} - {s.location}</option>
            ))}
          </select>
          <span className="text-[9px] text-slate-400 block font-medium">Rows without site matching keywords map here automatically.</span>
        </div>

        <div className="md:col-span-3 flex items-end justify-end pb-1.5">
          <button 
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 cursor-pointer select-none"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showGuide ? 'Hide Format Guide' : 'Show Format Guide'}
          </button>
        </div>
      </div>

      {/* Accordion Formatting Guidelines */}
      <AnimatePresence>
        {showGuide && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl text-xs text-slate-700 space-y-2.5">
              <h4 className="font-bold text-amber-900 flex items-center gap-1">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                Input Data Guidelines & Matching Layout Settings
              </h4>
              <p className="leading-relaxed">
                You can copy spreadsheet columns directly from your active <strong>Excel</strong>, <strong>Google Sheets</strong>, or <strong>CSV</strong> file and paste them into the box below. Alternatively, select or drag/drop a spreadsheet <code>.csv</code>/<code>.tsv</code> file.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-mono text-[9.5px]">
                <div className="bg-white p-3 rounded-lg border border-slate-150 space-y-1 shadow-2xs">
                  <p className="font-bold text-slate-900 uppercase tracking-widest text-[8px] pb-1 border-b border-slate-100 text-amber-800">Format Option A: Minimal Position Style</p>
                  <p className="text-slate-500">Only name and attendance status (separated by space or tab):</p>
                  <pre className="bg-slate-50 p-1.5 rounded text-slate-700 block leading-tight">
                    Samuel Jackson    Present{'\n'}
                    Cardo Dalisay     Half-Day{'\n'}
                    Maria Santos      Absent
                  </pre>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-150 space-y-1 shadow-2xs">
                  <p className="font-bold text-slate-900 uppercase tracking-widest text-[8px] pb-1 border-b border-slate-100 text-amber-800">Format Option B: Complete Tabular Row style</p>
                  <p className="text-slate-500">Supports variable date alignments and keyword matching:</p>
                  <pre className="bg-slate-50 p-1.5 rounded text-slate-700 block leading-tight">
                    Worker Name, Status, Date (YYYY-MM-DD), Site Keyword{'\n'}
                    Samuel Jackson, Present, 2026-05-24, Retaining Wall{'\n'}
                    Jane Smith, Half-Day, 2026-05-24, Project Alpha
                  </pre>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 bg-white/60 p-2 rounded-lg leading-relaxed">
                💡 <strong>Smart Parser engine details:</strong> Names support fuzzy matches (e.g. "Samuel" aligns to "Samuel Jackson"). Statuses support convenient aliases (P, Present, Checked-In, and 1 map to <strong>Present</strong>; H, HD, Half, and 0.5 map to <strong>Half-Day</strong>; A, Abs, Absent, and 0 map to <strong>Absent</strong>).
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TWO CHANNELS: Upload File or Paste Spreadsheet Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Drag/Drop visual section */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all min-h-[190px] relative select-none ${
            dragActive 
              ? 'border-yellow-400 bg-yellow-50/20 shadow-xs' 
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.tsv,.txt"
            className="hidden"
          />

          <div className="bg-slate-100 p-3 rounded-2xl text-slate-600 mb-3 block">
            <UploadCloud className="w-7 h-7 stroke-1.5" />
          </div>

          <p className="text-xs font-bold text-slate-900">Drag & Drop structured Attendance sheet</p>
          <p className="text-[10px] text-slate-400 mt-1">Accepts CSV, TSV or TXT files</p>
          
          <div className="relative flex items-center gap-1.5 mt-4">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-900 hover:bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition-colors"
            >
              Select File on Computer
            </button>
          </div>
        </div>

        {/* Right Column: Paste Text Area */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 flex flex-col space-y-3 shadow-2xs">
          <div className="flex justify-between items-center text-xs font-bold text-slate-900">
            <span>Or paste tabular entries directly:</span>
            <button
              type="button"
              onClick={loadExampleData}
              className="text-yellow-600 hover:text-yellow-800 text-[10px] font-extrabold uppercase tracking-wide cursor-pointer transition-colors"
            >
              📋 Load Demo Paste Sample
            </button>
          </div>
          
          <textarea
            placeholder={`e.g. Click and paste table text here...${'\n'}John Doe	Present	2026-05-24${'\n'}Jane Smith	Absent	2026-05-24`}
            rows={5}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-400 text-xs rounded-xl p-3 font-mono focus:outline-hidden text-slate-900 resize-none h-28"
          />

          <button
            type="button"
            onClick={() => handleParseData(pasteText)}
            disabled={!pasteText.trim()}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-extrabold uppercase text-[10px] tracking-wider py-2 rounded-xl transition-colors cursor-pointer text-center"
          >
            Process & Run Fuzzy Matching
          </button>
        </div>

      </div>

      {/* Parser Verification / Workspace Review Section */}
      {parsedRows.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          
          {/* Header row in verified container */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">Review Parsed Records Batch ({parsedRows.length})</span>
                <span className="bg-yellow-100 text-yellow-905 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  Checked {matchedCount} / {parsedRows.length} Successfully
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Correct validation conflicts, modify site parameters, or adjust status actions before adding to general ledger.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearPreview}
                className="px-3 py-1.5 border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg text-xs font-bold cursor-pointer select-none transition-colors"
              >
                Clear Preview Roster
              </button>
              
              <button
                type="button"
                onClick={handleFinalImport}
                className="bg-black text-yellow-400 hover:text-yellow-500 hover:bg-zinc-900 font-extrabold uppercase text-[10px] tracking-widest px-4 py-2 rounded-lg flex items-center gap-1 shadow-sm cursor-pointer select-none transition-all"
              >
                Lock Logs to Ledger ({matchedCount} shifts)
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Verification Table Scroll grid */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-h-[360px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Scanned Input Text</th>
                  <th className="p-3">Roster Worker Match</th>
                  <th className="p-3">Site Mapping</th>
                  <th className="p-3 text-center">Duty Status</th>
                  <th className="p-3 text-center">Log Date</th>
                  <th className="p-3 text-right">Preview Wage</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {parsedRows.map((row) => {
                  const worker = workers.find(w => w.id === row.matchedWorkerId);
                  const isMapped = !!row.matchedWorkerId;

                  let wageValue = 0;
                  if (worker) {
                    let multiplier = 0;
                    if (row.status === 'Present') multiplier = 1;
                    if (row.status === 'Half-Day') multiplier = 0.5;
                    wageValue = worker.dailyRate * multiplier;
                  }

                  return (
                    <tr key={row.key} className={`hover:bg-slate-50/50 transition-colors ${!isMapped ? 'bg-rose-50/20' : ''}`}>
                      
                      {/* Formatted printed Raw row content */}
                      <td className="p-3 min-w-[150px] max-w-[210px]">
                        <p className="font-mono text-[10px] text-slate-500 truncate" title={row.rawLine}>
                          {row.rawLine}
                        </p>
                        {row.error && (
                          <span className="text-[9px] text-rose-600 flex items-center gap-0.5 font-bold mt-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                            {row.error}
                          </span>
                        )}
                        {!row.error && isMapped && (
                          <span className="text-[9px] text-emerald-600 flex items-center gap-0.5 font-bold mt-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            Auto-matched successfully
                          </span>
                        )}
                      </td>

                      {/* Dropdown database Worker list */}
                      <td className="p-3 min-w-[160px]">
                        <select
                          value={row.matchedWorkerId}
                          onChange={(e) => handleUpdateRowWorker(row.key, e.target.value)}
                          className={`w-full bg-slate-50 border text-[11px] rounded-lg px-2 py-1 font-semibold ${
                            !isMapped ? 'border-rose-300 text-rose-700 font-bold bg-rose-50' : 'border-slate-200 text-slate-800'
                          }`}
                        >
                          <option value="">-- Choose Worker Profile --</option>
                          {workers.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.role}) {w.status === 'awol' ? '• AWOL' : w.status === 'terminated' ? '• Terminated' : w.active ? '• Active' : '• Deactivated'}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Dropdown database Site list */}
                      <td className="p-3 min-w-[150px]">
                        <select
                          value={row.matchedSiteId}
                          onChange={(e) => handleUpdateRowSite(row.key, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-[11px] rounded-lg px-2 py-1 text-slate-800"
                        >
                          {sites.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Status toggle selector */}
                      <td className="p-3 text-center min-w-[110px]">
                        <div className="flex justify-center">
                          <select
                            value={row.status}
                            onChange={(e) => handleUpdateRowStatus(row.key, e.target.value as any)}
                            className={`text-[10px] font-bold uppercase tracking-wide rounded border px-1.5 py-0.5 text-center cursor-pointer ${
                              row.status === 'Present' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : row.status === 'Half-Day'
                                ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                : 'bg-rose-50 text-rose-750 border-rose-200'
                            }`}
                          >
                            <option value="Present">Present (100%)</option>
                            <option value="Half-Day">Half-Day (50%)</option>
                            <option value="Absent">Absent (0%)</option>
                          </select>
                        </div>
                      </td>

                      {/* Date selection field */}
                      <td className="p-3 text-center min-w-[110px]">
                        <input 
                          type="date"
                          value={row.date}
                          onChange={(e) => handleUpdateRowDate(row.key, e.target.value)}
                          className="bg-transparent border border-slate-200 hover:border-slate-300 font-semibold font-mono text-[10px] rounded px-1.5 py-0.5 text-center cursor-pointer text-slate-800"
                        />
                      </td>

                      {/* Preview calculation values */}
                      <td className="p-3 text-right font-mono font-bold text-slate-900 min-w-[95px]">
                        {formatCurrency(wageValue)}
                      </td>

                      {/* Small inline row drop/remove toggle option */}
                      <td className="p-3 text-center min-w-[50px]">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.key)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-md cursor-pointer inline-block"
                          title="Discard Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Batch calculations statistics banner */}
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-mono text-xs">
            <div className="flex gap-4 flex-wrap">
              <div>
                <span className="text-slate-400">Lines Processed:</span>{' '}
                <span className="font-bold text-slate-800">{parsedRows.length}</span>
              </div>
              <div>
                <span className="text-slate-400">Match Qualified:</span>{' '}
                <span className="font-bold text-emerald-600">{matchedCount}</span>
              </div>
              <div>
                <span className="text-slate-400">To Discard:</span>{' '}
                <span className="font-bold text-rose-500">{parsedRows.length - matchedCount}</span>
              </div>
            </div>

            <div className="text-slate-900 flex items-center gap-2">
              <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Sum Labor Cost:</span>
              <span className="font-bold text-[14px] text-zinc-900 bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

        </div>
      )}

      {/* Guide notes banner in panel bottom */}
      <div className="bg-sky-50 rounded-xl p-3 border border-sky-100 flex gap-2.5 items-start">
        <Info className="w-4.5 h-4.5 text-sky-600 shrink-0 mt-0.5" />
        <p className="text-[10px] text-sky-800 leading-normal">
          <strong>Security Logging Notice:</strong> Logged entries trigger background payroll calculation loops instantly. If workers are marked working on specialized project dates, please review the mapped fields block so site budget metrics accurately reflect true expenses.
        </p>
      </div>

    </div>
  );
};
