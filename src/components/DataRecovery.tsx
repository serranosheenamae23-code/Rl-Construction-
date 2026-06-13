/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  History, 
  User, 
  Clock, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Search,
  Eye,
  FileSpreadsheet,
  Building2,
  Users,
  Coins,
  FileText,
  CreditCard,
  Percent,
  TrendingUp,
  X
} from 'lucide-react';
import { RecycleBinItem, restoreDeletedItem, revertModifiedItem, permanentlyPurgeBinItem } from '../lib/recovery';

interface DataRecoveryProps {
  recycleBin: RecycleBinItem[];
  currentUserEmail: string;
  onActivityLog: (type: string, desc: string) => void;
}

export default function DataRecovery({ recycleBin, currentUserEmail, onActivityLog }: DataRecoveryProps) {
  const [activeSubTab, setActiveSubTab] = useState<'deleted' | 'modified'>('deleted');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemForInspect, setSelectedItemForInspect] = useState<RecycleBinItem | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter items based on current tab and search query
  const filteredItems = recycleBin.filter(item => {
    // Partition by tab
    if (activeSubTab === 'deleted' && item.type !== 'delete') return false;
    if (activeSubTab === 'modified' && item.type !== 'edit') return false;

    // Search query
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      item.collectionName.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      (item.userEmail && item.userEmail.toLowerCase().includes(lowerQuery)) ||
      (item.userName && item.userName.toLowerCase().includes(lowerQuery)) ||
      item.originalId.toLowerCase().includes(lowerQuery)
    );
  });

  const getCollectionBadgeAndLabel = (collName: string) => {
    switch (collName) {
      case 'sites':
        return { label: 'Construction Project', color: 'bg-emerald-950 text-emerald-350 border-emerald-800', icon: Building2 };
      case 'workers':
        return { label: 'Worker Profile', color: 'bg-amber-950 text-amber-350 border-amber-800', icon: Users };
      case 'attendance':
        return { label: 'Attendance Card', color: 'bg-blue-950 text-blue-350 border-blue-800', icon: Clock };
      case 'expenses':
        return { label: 'Petty Expense', color: 'bg-rose-950 text-rose-350 border-rose-800', icon: Coins };
      case 'payments':
        return { label: 'Billing Statement', color: 'bg-violet-950 text-violet-350 border-violet-800', icon: FileText };
      case 'supervisor_funds':
        return { label: 'Supervisor Fund', color: 'bg-cyan-950 text-cyan-350 border-cyan-800', icon: CreditCard };
      case 'ereceipts':
        return { label: 'Client E-Receipt', color: 'bg-indigo-950 text-indigo-350 border-indigo-800', icon: FileSpreadsheet };
      case 'additional_scopes':
        return { label: 'Extra Scope Order', color: 'bg-teal-950 text-teal-350 border-teal-800', icon: Percent };
      case 'worker_loans':
        return { label: 'Worker Finance Loan', color: 'bg-purple-950 text-purple-350 border-purple-800', icon: TrendingUp };
      case 'supervisor_loans':
        return { label: 'Supervisor Finance Loan', color: 'bg-fuchsia-950 text-fuchsia-350 border-fuchsia-800', icon: TrendingUp };
      default:
        return { label: collName.toUpperCase(), color: 'bg-slate-850 text-slate-350 border-slate-800', icon: Database };
    }
  };

  const handleRestore = async (item: RecycleBinItem) => {
    try {
      if (item.type === 'delete') {
        await restoreDeletedItem(item);
        showToast(`Successfully restored document "${item.originalId}" to active list.`);
        onActivityLog('restore', `Restored soft-deleted document "${item.originalId}" back into the active "${item.collectionName}" collection.`);
      } else {
        await revertModifiedItem(item);
        showToast(`Successfully rolled back document "${item.originalId}" to previous historical state.`);
        onActivityLog('rollback', `Rolled back changes on document "${item.originalId}" inside the "${item.collectionName}" collection.`);
      }
      if (selectedItemForInspect?.id === item.id) {
        setSelectedItemForInspect(null);
      }
    } catch {
      showToast('Data recovery operations failed. Please double check security policies.', 'error');
    }
  };

  const handlePurge = async (item: RecycleBinItem) => {
    if (confirm("Are you sure you want to permanently erase this historical record from the log? This cannot be undone.")) {
      try {
        await permanentlyPurgeBinItem(item.id);
        showToast('Erase completed successfully.');
        if (selectedItemForInspect?.id === item.id) {
          setSelectedItemForInspect(null);
        }
      } catch {
        showToast('Purge item operation failed.', 'error');
      }
    }
  };

  const handleEmptyBin = async () => {
    const term = activeSubTab === 'deleted' ? 'deleted records' : 'granular edits';
    if (confirm(`⚠️ Are you sure you want to permanently purge all ${term} listed? This will erase recovery trails forever.`)) {
      try {
        const targets = filteredItems;
        for (const target of targets) {
          await permanentlyPurgeBinItem(target.id);
        }
        showToast(`Successfully emptied the log for ${term}.`);
      } catch {
        showToast('Failed to empty records completely.', 'error');
      }
    }
  };

  const inspectItem = (item: RecycleBinItem) => {
    setSelectedItemForInspect(item);
  };

  // Render a comparison table comparing values keys of edit logs
  const renderValueDifference = (prev: any, current: any) => {
    if (!prev || !current) return <span className="text-slate-500 font-mono text-[11px]">N/A</span>;
    
    const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(current)]))
      .filter(k => k !== 'id' && k !== 'updatedAt' && k !== 'createdAt');

    return (
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {allKeys.map(key => {
          const valPrev = prev[key];
          const valNext = current[key];
          
          // Stringify objects or arrays for comparison
          const strPrev = typeof valPrev === 'object' ? JSON.stringify(valPrev) : String(valPrev ?? '');
          const strNext = typeof valNext === 'object' ? JSON.stringify(valNext) : String(valNext ?? '');
          
          if (strPrev === strNext) return null; // No difference

          return (
            <div key={key} className="border-b border-slate-750 pb-1.5 last:border-0">
              <span className="text-yellow-400 font-mono text-[11px] font-semibold block">{key}:</span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-rose-950/40 border border-rose-900 rounded p-1 text-[11px] font-mono text-rose-300 break-words line-through decoration-rose-600">
                  {strPrev || <span className="text-slate-500 italic">Empty/Null</span>}
                </div>
                <div className="bg-emerald-950/40 border border-emerald-900 rounded p-1 text-[11px] font-mono text-emerald-300 break-words">
                  {strNext || <span className="text-slate-500 italic">Deleted</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl border ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-900 border-emerald-800 text-emerald-200' 
            : 'bg-rose-900 border-rose-800 text-rose-200'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-yellow-500" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">System Data Recovery & Backup Center</h1>
          </div>
          <p className="text-xs text-slate-400">
            Automated internal ledger capturing all deleted entries and record modifications allowing multi-device rolling restoration.
          </p>
        </div>
        
        {/* Empty Trash Button */}
        {filteredItems.length > 0 && (
          <button
            onClick={handleEmptyBin}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-350 rounded-lg text-xs font-medium cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Empty Settings Log ({filteredItems.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Records List */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Sub Tab selection bar & Search */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex bg-neutral-950 p-1 rounded-md border border-slate-855 w-full sm:w-auto">
              <button
                onClick={() => {
                  setActiveSubTab('deleted');
                  setSearchQuery('');
                }}
                className={`flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-colors ${
                  activeSubTab === 'deleted' 
                    ? 'bg-neutral-800 text-yellow-405' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Soft-Deleted Bin ({recycleBin.filter(i => i.type === 'delete').length})
              </button>
              <button
                onClick={() => {
                  setActiveSubTab('modified');
                  setSearchQuery('');
                }}
                className={`flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-colors ${
                  activeSubTab === 'modified' 
                    ? 'bg-neutral-800 text-yellow-405' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Changes Ledger ({recycleBin.filter(i => i.type === 'edit').length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-3.5 h-3.5 text-slate-500" />
              </span>
              <input
                type="text"
                placeholder="Find by collection, ID, auditor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-slate-800 rounded-md py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
          </div>

          {/* List display */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-lg py-12 text-center">
                <Info className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-350 text-xs font-medium">
                  {searchQuery ? 'No logging records match your query' : `Your ${activeSubTab === 'deleted' ? 'Soft-Deleted Bin' : 'Changes Ledger'} is currently empty.`}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  {activeSubTab === 'deleted' 
                    ? 'Whenever sites, worker profiles, or petty cash entries are deleted, they will record here for recovery.' 
                    : 'Granular audits capture historical inputs such as modifications of budgets or rate corrections.'
                  }
                </p>
              </div>
            ) : (
              filteredItems.map(item => {
                const collInfo = getCollectionBadgeAndLabel(item.collectionName);
                const Icon = collInfo.icon;
                
                return (
                  <div 
                    key={item.id} 
                    className={`bg-slate-900 border rounded-lg p-4 transition-all hover:border-slate-700 ${
                      selectedItemForInspect?.id === item.id 
                        ? 'border-yellow-500 bg-slate-900/60 shadow-md shadow-yellow-500/5' 
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Left: Metadata */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] uppercase font-bold tracking-wider ${collInfo.color}`}>
                            <Icon className="w-2.5 h-2.5" />
                            {collInfo.label}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ID: {item.originalId}
                          </span>
                        </div>
                        <h3 className="text-xs font-semibold text-slate-200">
                          {item.description}
                        </h3>
                        
                        {/* Audit Details */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-450 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            By: {item.userName} ({item.userEmail})
                          </span>
                        </div>
                      </div>

                      {/* Right: Quick Actions */}
                      <div className="flex items-center gap-2 sm:self-center">
                        <button
                          onClick={() => inspectItem(item)}
                          className={`p-1.5 rounded border text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                            selectedItemForInspect?.id === item.id
                              ? 'bg-yellow-950 border-yellow-800 text-yellow-350'
                              : 'bg-slate-800 border-slate-750 text-slate-300 hover:text-white hover:bg-slate-750'
                          }`}
                          title="Inspect Data Scheme"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Compare</span>
                        </button>
                        
                        <button
                          onClick={() => handleRestore(item)}
                          className="p-1.5 bg-slate-850 hover:bg-yellow-600 border border-slate-750 hover:border-yellow-500 text-slate-300 hover:text-slate-950 rounded text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors font-medium"
                          title={item.type === 'delete' ? 'Restore Active Record' : 'Rollback Revision'}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{item.type === 'delete' ? 'Restore' : 'Revert'}</span>
                        </button>

                        <button
                          onClick={() => handlePurge(item)}
                          className="p-1.5 bg-slate-950 hover:bg-rose-950 border border-slate-850 hover:border-rose-900 text-slate-500 hover:text-rose-400 rounded text-xs flex items-center justify-center cursor-pointer transition-colors"
                          title="Erase forever"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Inspector Panel */}
        <div className="lg:col-span-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 sticky top-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xs font-bold text-slate-305 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-yellow-505" />
                Audit Snapshot Inspector
              </h2>
              {selectedItemForInspect && (
                <button 
                  onClick={() => setSelectedItemForInspect(null)}
                  className="text-slate-550 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {!selectedItemForInspect ? (
              <div className="text-center py-12 px-2 text-slate-500">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No Log Selected</p>
                <p className="text-[11px] mt-1">
                  Click the "Compare" button on any audit record card to inspect granular data payloads, changes, and database structures.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Historical Snapshot Description</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">{selectedItemForInspect.description}</div>
                </div>

                {selectedItemForInspect.type === 'edit' ? (
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider"> granular state difference (Prev vs Next)</div>
                    {renderValueDifference(selectedItemForInspect.previousData, selectedItemForInspect.newData)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Payload Data (Object properties)</div>
                    <div className="bg-neutral-950 border border-slate-850 p-3 rounded-md max-h-80 overflow-y-auto">
                      <pre className="text-[11px] font-mono text-emerald-350 whitespace-pre-wrap leading-relaxed">
                        {JSON.stringify(selectedItemForInspect.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-800 pt-4 flex gap-2">
                  <button
                    onClick={() => handleRestore(selectedItemForInspect)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{selectedItemForInspect.type === 'delete' ? 'Restore Document' : 'Revert Changes'}</span>
                  </button>
                  <button
                    onClick={() => handlePurge(selectedItemForInspect)}
                    className="flex items-center justify-center px-3 py-2 bg-slate-950 hover:bg-rose-950 border border-slate-800 hover:border-rose-900 text-slate-400 hover:text-rose-300 rounded-lg text-xs cursor-pointer transition-colors"
                    title="Purge permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
