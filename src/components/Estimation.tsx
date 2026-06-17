/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  FileText, 
  Printer, 
  Check, 
  Plus, 
  Trash2, 
  ArrowRight, 
  FileSpreadsheet,
  Save,
  RefreshCw,
  History,
  Calendar,
  MapPin,
  User,
  FolderOpen,
  Clock,
  Edit,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import { formatPDFCurrency } from '../utils';

interface LineItem {
  id: string;
  category: string;
  description: string;
  unit: string;
  qty: number;
  unitCost: number;
  totalCost: number;
}

interface ProposalScope {
  id: string;
  title: string;
  bullets: string;
  cost: number;
  costType?: string;
}

interface SavedEstimationHistoryItem {
  id: string;
  savedAt: string;
  type: 'famarca_proposal' | 'fitout';
  clientName: string;
  projectTitleOrAddress: string;
  totalCost: number;
  data: any;
}

import { ConstructionSite, AdditionalScopeItem } from '../types';

interface EstimationProps {
  sites?: ConstructionSite[];
  additionalScopes?: AdditionalScopeItem[];
}

const getScopeSuffix = (type?: string) => {
  if (!type || type === 'labor_and_materials') return ' (labors and materials)';
  if (type === 'labor_only') return ' (labor only)';
  if (type === 'materials_only') return ' (materials only)';
  if (type === 'osm') return " (owner's supply materials)";
  if (type === 'none') return '';
  return ` (${type})`;
};

export default function Estimation({ sites = [], additionalScopes = [] }: EstimationProps) {
  const [activeMode, setActiveMode] = useState<'fitout' | 'famarca_proposal' | 'history'>('famarca_proposal');

  const [proposalProjectTitle, setProposalProjectTitle] = useState('Proposed Construction of Commercial Project');
  const [proposalClientName, setProposalClientName] = useState('Dimaano Residence');
  const [proposalClientAddress, setProposalClientAddress] = useState('Block 37 Lot 10, The Villages, Lipa, Batangas');
  const [proposalDate, setProposalDate] = useState('2026-06-05');
  const [constructionPeriod, setConstructionPeriod] = useState('maximum of 2 to 3 months');
  const [permitNote, setPermitNote] = useState('Not included permit');
  const [contactPhone, setContactPhone] = useState('09389027195');
  const [contractorName, setContractorName] = useState('Ronald C. Famorca');

  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(50);
  const [progressPaymentPercent, setProgressPaymentPercent] = useState<number>(0);
  const [turnoverPaymentPercent, setTurnoverPaymentPercent] = useState<number>(50);

  const defaultTermsList = [
    "{dp_percent}% down payment upon signing of contract = Php {dp_amount}\n{turnover_percent}% upon 100% accomplishment and turnover = Php {turnover_amount}",
    "Construction Period: maximum of 2 to 3 days",
    "Not included permit",
    "Construction Bond, Vetting Fee, Electricity and Water Deposits and other administrative charges are all for the account of the client.",
    "Water and Electrical charge consumption during construction is for the account of the client.",
    "Construction comes with a 6-month warranty, starting from the final day of the job."
  ];

  const [proposalTerms, setProposalTerms] = useState<string[]>(defaultTermsList);
  const [fitoutTerms, setFitoutTerms] = useState<string[]>(defaultTermsList);
  const [newProposalTerm, setNewProposalTerm] = useState('');
  const [newFitoutTerm, setNewFitoutTerm] = useState('');

  const resolveTermText = (term: string, currentTotal: number) => {
    const dp = currentTotal * (downPaymentPercent / 100);
    const mid = currentTotal * (progressPaymentPercent / 100);
    const turn = currentTotal * (turnoverPaymentPercent / 100);
    
    return term
      .replace(/{dp_amount}/g, dp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      .replace(/{mid_amount}/g, mid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      .replace(/{turnover_amount}/g, turn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      .replace(/{dp_percent}/g, String(downPaymentPercent))
      .replace(/{mid_percent}/g, String(progressPaymentPercent))
      .replace(/{turnover_percent}/g, String(turnoverPaymentPercent))
      .replace(/{construction_period}/g, constructionPeriod)
      .replace(/{permit_note}/g, permitNote)
      .replace(/{total_tcp}/g, currentTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleRestoreDefaultProposalTerms = () => {
    setProposalTerms([...defaultTermsList]);
  };

  const handleRestoreDefaultFitoutTerms = () => {
    setFitoutTerms([...defaultTermsList]);
  };

  const presetTemplates = [
    {
      title: 'Structural works (ready for 2nd floor)',
      bullets: '3 sets of column ready for 2nd floor\nInstallation of concrete pavement\nInstallation of masonry CHB #5 wall\nCanopy installation',
      cost: 185800
    },
    {
      title: 'Tinsmithry works',
      bullets: 'Installation of channel bar 2x3x1/4" and C purlins 2x3x1.2mm\nInstallation of rib type long span 0.5mm and colored gutter 0.4mm',
      cost: 55500
    },
    {
      title: 'Ceiling works with pin lights',
      bullets: 'Installation of metal furring and Hardieflex 3.5mm panels',
      cost: 31500
    },
    {
      title: 'Tile works',
      bullets: 'Flooring tiles installation 60x60 cm (worth PHP 180/pc)',
      cost: 37200
    },
    {
      title: 'Aluminum works',
      bullets: 'Installation of sliding door with premium clear fixed glass (3.6x2.1)(1.2x2.1)',
      cost: 54800
    },
    {
      title: 'Kitchen countertop (2.4x6 meters)',
      bullets: 'Custom concrete slab countertop\nInstallation of ceramic tiles 60x120 (worth 650/pc)',
      cost: 23200
    },
    {
      title: 'Aluminum installation',
      bullets: 'Fabrication and installation of customized aluminum base cabinet',
      cost: 28000
    },
    {
      title: 'Breakfast nook installation with cabinets (2.4 meters)',
      bullets: 'Fabrication of functional breakfast nook table, matching hanging levels and base cabinet drawers',
      cost: 73500
    },
    {
      title: 'Seamless door',
      bullets: 'Installation of premium fluted panel (worth 400/pc)\nInstallation of modern sliding ghost door (flush door)(80x210)',
      cost: 45300
    },
    {
      title: 'Stainless stair railing',
      bullets: 'Dismantling of the old existing metal safety railing\nInstallation of 2x2 tubular stainless steel and 1x1 tubular stainless framing with tempered security glass panels',
      cost: 80700
    },
    {
      title: 'Mobilization and hauling',
      bullets: 'Transport of materials, heavy tools mobilization, and waste clearing with final demobilization',
      cost: 35000
    }
  ];

  const [selectedPresetCategory, setSelectedPresetCategory] = useState<string>('custom');
  const [selectedSiteIdForImport, setSelectedSiteIdForImport] = useState<string>('');

  const [newScopeTitle, setNewScopeTitle] = useState('');
  const [newScopeBullets, setNewScopeBullets] = useState('');
  const [newScopeCost, setNewScopeCost] = useState<string>('');
  const [newScopeCostType, setNewScopeCostType] = useState<string>('labor_and_materials');
  const [editingScopeId, setEditingScopeId] = useState<string | null>(null);

  const [ownerMaterials, setOwnerMaterials] = useState<string[]>([
    'Kitchen sink',
    'Faucet',
    'Pendant light',
    'LED strip light',
    'Center light',
    'Ceiling/wall Exhaust',
    'Toilet fixture and accessories'
  ]);
  const [newOwnerMaterial, setNewOwnerMaterial] = useState('');

  const [proposalScopes, setProposalScopes] = useState<ProposalScope[]>([
    {
      id: 'scope-1',
      title: 'Structurals works (ready for 2nd floor)',
      bullets: '3 sets of column ready for 2nd floor\nInstallation of concrete pavement\nInstallation of masonry wall chb #5\nCanopy installation',
      cost: 185800
    },
    {
      id: 'scope-2',
      title: 'Tinsmithry works',
      bullets: 'Installation of channel bar 2x3x1/4" and c purlins 2x3x1.2mm\nInstallation of rib type long span 0.5mm and colored gutter 0.4mm',
      cost: 55500
    },
    {
      id: 'scope-3',
      title: 'Ceiling works with pin lights',
      bullets: 'Installation of metal furring and hardieflex 3.5mm',
      cost: 31500
    },
    {
      id: 'scope-4',
      title: 'Tile works',
      bullets: 'Flooring tiles installation 60x60 cm (worth 180/pc)',
      cost: 37200
    },
    {
      id: 'scope-5',
      title: 'Aluminum works',
      bullets: 'Installation of sliding door with fixed glass (3.6x2.1)(1.2x2.1)',
      cost: 54800
    },
    {
      id: 'scope-6',
      title: 'Kitchen countertop (2.4x6 meters)',
      bullets: 'Concrete countertop\nInstallation of tiles 60x120 (worth 650/pc)',
      cost: 23200
    },
    {
      id: 'scope-7',
      title: 'Aluminum installation',
      bullets: 'Installation of aluminum base cabinet',
      cost: 28000
    },
    {
      id: 'scope-8',
      title: 'Breakfast nook installation with cabinets (2.4 meters)',
      bullets: 'Fabrication of breakfast nook with hanging and base cabinet',
      cost: 73500
    },
    {
      id: 'scope-9',
      title: 'Seamless door',
      bullets: 'Installation of fluted panel (worth 400/pc)\nInstallation of sliding ghost door (flash door)(80x210)',
      cost: 45300
    },
    {
      id: 'scope-10',
      title: 'Stainless stair railing',
      bullets: 'Dismantle of existing metal railing\nInstallation of 2x2 tubular stainless and 1x1 tubular stainless with tempered glass',
      cost: 80700
    },
    {
      id: 'scope-11',
      title: 'Mobilization and hauling',
      bullets: 'Mobilization and hauling of waste materials',
      cost: 35000
    }
  ]);

  const [clientName, setClientName] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [floorArea, setFloorArea] = useState<number>(50);
  const [includeVat, setIncludeVat] = useState<boolean>(false);
  const [taxPercent, setTaxPercent] = useState<number>(12);

  // Scope of Work options
  const [scopeOfWorkMode, setScopeOfWorkMode] = useState<'Automatic' | 'Manual'>('Automatic');
  const [manualScopeText, setManualScopeText] = useState(
    "1. Mobilization and Site Preparation\n" +
    "   - Setting up safety barrier boards, temporary workspace borders, utility routing, and protective floor sheets.\n" +
    "2. Civil, Drywall & Framing Works\n" +
    "   - Double-stud metal framing with high-strength gypsum board panels for core office divisions.\n" +
    "3. Electrical & Power Infrastructure Upgrade\n" +
    "   - Direct routing of lighting circuits, fire-safety compliance conduits, power panels, and standard LED elements.\n" +
    "4. Premium Finishing, Painting & Turnover Clean\n" +
    "   - Polyurethane coatings, eco-friendly premium finish coat application, and comprehensive clearing operations."
  );

  // Line item collection state
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', category: 'temporary facility', description: 'Setup of temporary site cabinets, storage, protective perimeter enclosures, and utility connections.', totalCost: 45000 },
    { id: '2', category: 'Excavation and hauling works', description: 'Clearing of topsoil, manual and mechanical structural excavation, hauling of debris and organic materials.', totalCost: 65000 },
    { id: '3', category: 'structural works', description: 'Installation of foundation column rebar frameworks, concrete pouring, footings, and structural masonry.', totalCost: 185000 },
    { id: '4', category: 'Plumbing works', description: 'Roughing-in of PVC sewer pipes, water distribution lines, grease traps, and connection of core sanitary lines.', totalCost: 55000 },
    { id: '5', category: 'Painting works', description: 'Surface preparation, double coat of primer sealant application, and finishing color coats for interior and exterior walls.', totalCost: 48000 },
    { id: '6', category: 'Mobilization and clearing works', description: 'Transport of specialized machinery, crew mobilization, final deep cleaning, waste clearing and demobilization.', totalCost: 30000 },
  ]);

  // Add Item states
  const [newCat, setNewCat] = useState('temporary facility');
  const [customCategory, setCustomCategory] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUnitCost, setNewUnitCost] = useState<number>(0);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc || newUnitCost <= 0) return;
    
    const catToUse = newCat === 'custom' ? (customCategory.trim() || 'Custom Works') : newCat;

    if (editingItemId) {
      setItems(items.map(it => it.id === editingItemId ? {
        ...it,
        category: catToUse,
        description: newDesc,
        totalCost: newUnitCost
      } : it));
      setEditingItemId(null);
    } else {
      setItems([
        ...items,
        {
          id: `custom-${Date.now()}`,
          category: catToUse,
          description: newDesc,
          totalCost: newUnitCost
        }
      ]);
    }
    setNewDesc('');
    setNewUnitCost(0);
    setCustomCategory('');
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    if (editingItemId === id) {
      setEditingItemId(null);
      setNewDesc('');
      setNewUnitCost(0);
      setNewCat('temporary facility');
      setCustomCategory('');
    }
  };

  const handleEditItemClick = (it: LineItem) => {
    setEditingItemId(it.id);
    const standardCategories = [
      'temporary facility',
      'Excavation and hauling works',
      'structural works',
      'Plumbing works',
      'Painting works',
      'Mobilization and clearing works',
      'Other works'
    ];
    if (standardCategories.includes(it.category)) {
      setNewCat(it.category);
      setCustomCategory('');
    } else {
      setNewCat('custom');
      setCustomCategory(it.category);
    }
    setNewDesc(it.description);
    setNewUnitCost(it.totalCost);
  };

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const [estimationHistory, setEstimationHistory] = useState<SavedEstimationHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('rlcon_estimation_history');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'hist-1',
        savedAt: new Date(Date.now() - 3600000 * 24 * 7).toLocaleString('en-US', { hour12: true }),
        type: 'famarca_proposal',
        clientName: 'Dimaano Residence',
        projectTitleOrAddress: 'Proposed Construction of Commercial Project',
        totalCost: 663200,
        data: {
          proposalProjectTitle: 'Proposed Construction of Commercial Project',
          proposalClientName: 'Dimaano Residence',
          proposalClientAddress: 'Block 37 Lot 10, The Villages, Lipa, Batangas',
          proposalDate: '2026-06-05',
          constructionPeriod: 'maximum of 2 to 3 months',
          permitNote: 'Not included permit',
          contactPhone: '09389027195',
          contractorName: 'Ronald C. Famorca',
          downPaymentPercent: 50,
          progressPaymentPercent: 0,
          turnoverPaymentPercent: 50,
          proposalTerms: [
            "50% down payment upon signing of contract = Php 331,600.00\n50% upon 100% accomplishment and turnover = Php 331,600.00",
            "Construction Period: maximum of 2 to 3 days",
            "Not included permit",
            "Construction Bond, Vetting Fee, Electricity and Water Deposits and other administrative charges are all for the account of the client.",
            "Water and Electrical charge consumption during construction is for the account of the client.",
            "Construction comes with a 6-month warranty, starting from the final day of the job."
          ],
          proposalScopes: [
            { id: 'scope-1', title: 'Structurals works (ready for 2nd floor)', bullets: '3 sets of column ready for 2nd floor\nInstallation of concrete pavement\nInstallation of CHB wall masonry\nCanopy installation', cost: 185800, costType: 'labor_and_materials' },
            { id: 'scope-2', title: 'Tinsmithry works', bullets: 'Installation of purlins and gutter roofings', cost: 55500, costType: 'labor_and_materials' },
            { id: 'scope-3', title: 'Ceiling works with pin lights', bullets: 'Installation of metal furring and Hardieflex panels', cost: 31500, costType: 'labor_and_materials' },
            { id: 'scope-4', title: 'Tile works', bullets: 'Flooring tiles installation 60x60 cm', cost: 37200, costType: 'labor_and_materials' }
          ]
        }
      },
      {
        id: 'hist-2',
        savedAt: new Date(Date.now() - 3600000 * 2).toLocaleString('en-US', { hour12: true }),
        type: 'fitout',
        clientName: 'Alvarez Corporate Office',
        projectTitleOrAddress: '6th Floor Cyberzone Building, Cavite City',
        totalCost: 428000,
        data: {
          clientName: 'Alvarez Corporate Office',
          projectAddress: '6th Floor Cyberzone Building, Cavite City',
          floorArea: 120,
          includeVat: true,
          taxPercent: 12,
          scopeOfWorkMode: 'Automatic',
          manualScopeText: 'Default site details text logs',
          ownerMaterials: ['Kitchen sink', 'Faucet', 'Pendant light', 'LED strip light'],
          fitoutTerms: [
            "50% down payment upon signing of contract = Php 240,000.00\n50% upon 100% accomplishment and turnover = Php 240,000.00",
            "Construction Period: maximum of 2 to 3 days",
            "Not included permit",
            "Construction Bond, Vetting Fee, Electricity and Water Deposits and other administrative charges are all for the account of the client."
          ],
          items: [
            { id: '1', category: 'temporary facility', description: 'Setup of temporary site cabinets, storage, protective perimeter enclosures.', totalCost: 45000 },
            { id: '2', category: 'Excavation and hauling works', description: 'Clearing of topsoil, manual structural excavation.', totalCost: 65000 },
            { id: '3', category: 'structural works', description: 'Installation of foundation column rebar frameworks.', totalCost: 185000 },
            { id: '4', category: 'Plumbing works', description: 'Roughing-in of PVC sewer pipes, water distribution lines.', totalCost: 55000 },
            { id: '5', category: 'Painting works', description: 'Surface preparation, double coat of primer sealant application and color coats.', totalCost: 48500 }
          ]
        }
      }
    ];
  });

  const handleSaveCurrentToHistory = (type: 'famarca_proposal' | 'fitout') => {
    let entryClient = '';
    let entryProject = '';
    let entryTotal = 0;
    let entryData: any = {};

    if (type === 'famarca_proposal') {
      entryClient = proposalClientName || 'Unnamed Client';
      entryProject = proposalProjectTitle || 'Proposed Construction Project';
      entryTotal = proposalScopes.reduce((sum, s) => sum + s.cost, 0);
      entryData = {
        proposalProjectTitle,
        proposalClientName,
        proposalClientAddress,
        proposalDate,
        constructionPeriod,
        permitNote,
        contactPhone,
        contractorName,
        downPaymentPercent,
        progressPaymentPercent,
        turnoverPaymentPercent,
        proposalTerms,
        proposalScopes
      };
    } else {
      entryClient = clientName || 'Unnamed Client';
      entryProject = projectAddress || 'Direct Fitout Site';
      const rawTotalMaterialLabor = items.reduce((sum, i) => sum + i.totalCost, 0);
      const vatValue = includeVat ? rawTotalMaterialLabor * (taxPercent / 100) : 0;
      entryTotal = rawTotalMaterialLabor + vatValue;
      entryData = {
        clientName,
        projectAddress,
        floorArea,
        includeVat,
        taxPercent,
        scopeOfWorkMode,
        manualScopeText,
        ownerMaterials,
        fitoutTerms,
        items
      };
    }

    const newItem: SavedEstimationHistoryItem = {
      id: `hist-${Date.now()}`,
      savedAt: new Date().toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      }),
      type,
      clientName: entryClient,
      projectTitleOrAddress: entryProject,
      totalCost: entryTotal,
      data: entryData
    };

    setEstimationHistory(prev => {
      const updated = [newItem, ...prev];
      localStorage.setItem('rlcon_estimation_history', JSON.stringify(updated));
      return updated;
    });

    setSaveSuccessMessage(`Successfully saved ${type === 'famarca_proposal' ? 'Additional Scope Estimator' : 'Fitout Estimator'} record for "${entryClient}" to Saved History!`);
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const handleLoadHistoryItem = (item: SavedEstimationHistoryItem) => {
    if (!window.confirm(`Are you sure you want to load the saved session for "${item.clientName}"? This will overwrite your current active Estimator inputs and settings.`)) {
      return;
    }

    if (item.type === 'famarca_proposal') {
      const d = item.data;
      if (d.proposalProjectTitle !== undefined) setProposalProjectTitle(d.proposalProjectTitle);
      if (d.proposalClientName !== undefined) setProposalClientName(d.proposalClientName);
      if (d.proposalClientAddress !== undefined) setProposalClientAddress(d.proposalClientAddress);
      if (d.proposalDate !== undefined) setProposalDate(d.proposalDate);
      if (d.constructionPeriod !== undefined) setConstructionPeriod(d.constructionPeriod);
      if (d.permitNote !== undefined) setPermitNote(d.permitNote);
      if (d.contactPhone !== undefined) setContactPhone(d.contactPhone);
      if (d.contractorName !== undefined) setContractorName(d.contractorName);
      if (d.downPaymentPercent !== undefined) setDownPaymentPercent(d.downPaymentPercent);
      if (d.progressPaymentPercent !== undefined) setProgressPaymentPercent(d.progressPaymentPercent);
      if (d.turnoverPaymentPercent !== undefined) setTurnoverPaymentPercent(d.turnoverPaymentPercent);
      if (d.proposalTerms !== undefined) setProposalTerms(d.proposalTerms);
      if (d.proposalScopes !== undefined) setProposalScopes(d.proposalScopes);
      
      setActiveMode('famarca_proposal');
    } else {
      const d = item.data;
      if (d.clientName !== undefined) setClientName(d.clientName);
      if (d.projectAddress !== undefined) setProjectAddress(d.projectAddress);
      if (d.floorArea !== undefined) setFloorArea(d.floorArea);
      if (d.includeVat !== undefined) setIncludeVat(d.includeVat);
      if (d.taxPercent !== undefined) setTaxPercent(d.taxPercent);
      if (d.scopeOfWorkMode !== undefined) setScopeOfWorkMode(d.scopeOfWorkMode);
      if (d.manualScopeText !== undefined) setManualScopeText(d.manualScopeText);
      if (d.ownerMaterials !== undefined) setOwnerMaterials(d.ownerMaterials);
      if (d.fitoutTerms !== undefined) setFitoutTerms(d.fitoutTerms);
      if (d.items !== undefined) setItems(d.items);

      setActiveMode('fitout');
    }

    setSaveSuccessMessage(`Successfully restored active session for "${item.clientName}"!`);
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const handleDeleteHistoryItem = (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this saved history record?")) {
      return;
    }
    setEstimationHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('rlcon_estimation_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Famorca Proposal state handlers
  const handleSaveScope = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScopeTitle) return;
    const costNum = parseFloat(newScopeCost) || 0;

    if (editingScopeId) {
      setProposalScopes(prev => prev.map(s => s.id === editingScopeId ? {
        ...s,
        title: newScopeTitle,
        bullets: newScopeBullets,
        cost: costNum,
        costType: newScopeCostType
      } : s));
      setEditingScopeId(null);
    } else {
      const newScope: ProposalScope = {
        id: `scope-${Date.now()}`,
        title: newScopeTitle,
        bullets: newScopeBullets,
        cost: costNum,
        costType: newScopeCostType
      };
      setProposalScopes(prev => [...prev, newScope]);
    }

    setNewScopeTitle('');
    setNewScopeBullets('');
    setNewScopeCost('');
    setNewScopeCostType('labor_and_materials');
  };

  const handleEditScopeClick = (scope: ProposalScope) => {
    setEditingScopeId(scope.id);
    setNewScopeTitle(scope.title);
    setNewScopeBullets(scope.bullets);
    setNewScopeCost(String(scope.cost));
    setNewScopeCostType(scope.costType || 'labor_and_materials');
  };

  const handleDeleteScope = (id: string) => {
    setProposalScopes(prev => prev.filter(s => s.id !== id));
    if (editingScopeId === id) {
      setEditingScopeId(null);
      setNewScopeTitle('');
      setNewScopeBullets('');
      setNewScopeCost('');
      setNewScopeCostType('labor_and_materials');
    }
  };

  const handleAddOwnerMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwnerMaterial.trim()) return;
    if (!ownerMaterials.includes(newOwnerMaterial.trim())) {
      setOwnerMaterials(prev => [...prev, newOwnerMaterial.trim()]);
    }
    setNewOwnerMaterial('');
  };

  const handleRemoveOwnerMaterial = (mat: string) => {
    setOwnerMaterials(prev => prev.filter(m => m !== mat));
  };

  const handleGenerateProposalPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4'); // A4: 210mm x 297mm
    let pageNum = 1;

    const drawHeader = (docInstance: jsPDF, pageNumber: number) => {
      // Charcoal Slate background block for header matching user-uploaded photo exactly
      docInstance.setFillColor(24, 28, 36); // Charcoal Black
      docInstance.rect(0, 0, 210, 38, 'F');

      // Elegant gold bottom border acting as baseline border on the header
      docInstance.setDrawColor(229, 192, 96); // Metallic Gold #E5C060
      docInstance.setLineWidth(1.2);
      docInstance.line(0, 38, 210, 38);
      
      const logoX = 14;
      const logoY = 6;
      
      // Vector logo drawing matching our standard RL CON brand representation
      docInstance.setDrawColor(229, 192, 96); // Premium Gold
      docInstance.setLineWidth(1.2);

      // House structural path: Underline line, left vertical, overhang, roof slants, inset, dropdown vertical tail
      docInstance.line(logoX + 48, logoY + 19, logoX + 3.5, logoY + 19); // base underline
      docInstance.line(logoX + 3.5, logoY + 19, logoX + 3.5, logoY + 10.5); // left wall
      docInstance.line(logoX + 3.5, logoY + 10.5, logoX + 0.5, logoY + 10.5); // left overhang
      docInstance.line(logoX + 0.5, logoY + 10.5, logoX + 13.5, logoY + 3.5); // peak left
      docInstance.line(logoX + 13.5, logoY + 3.5, logoX + 26.5, logoY + 10.5); // peak right
      docInstance.line(logoX + 26.5, logoY + 10.5, logoX + 24.0, logoY + 10.5); // inset step
      docInstance.line(logoX + 24.0, logoY + 10.5, logoX + 24.0, logoY + 13.5); // dropdown tail

      // Draw the "RL" Text in Gold Metallic
      docInstance.setFont('Helvetica', 'bold');
      docInstance.setFontSize(14);
      docInstance.setTextColor(229, 192, 96); // Gold (#E5C060)
      docInstance.text('RL', logoX + 7, logoY + 16.5);
      
      // Draw the "CON" Text in Crisp White for luxury contrast
      docInstance.setTextColor(255, 255, 255);
      docInstance.text('CON', logoX + 15, logoY + 16.5);
      
      // Subtitle "BUILD | DESIGN | LANDSCAPE" centered below the design
      docInstance.setTextColor(203, 213, 225); // slate-300 / white-ish for high contrast
      docInstance.setFontSize(5);
      docInstance.setFont('Helvetica', 'bold');
      docInstance.text('BUILD | DESIGN | LANDSCAPE', logoX + 18, logoY + 24);

      // Draw an elegant gold metallic 4-pointed star at the bottom right corner of the logo block
      const starX = logoX + 47;
      const starY = logoY + 24;
      docInstance.setFillColor(229, 192, 96); // Metallic Gold #E5C060
      docInstance.triangle(starX, starY - 1.5, starX + 0.5, starY, starX - 0.5, starY, 'F');
      docInstance.triangle(starX, starY + 1.5, starX + 0.5, starY, starX - 0.5, starY, 'F');
      docInstance.triangle(starX - 1.5, starY, starX, starY + 0.5, starX, starY - 0.5, 'F');
      docInstance.triangle(starX + 1.5, starY, starX, starY + 0.5, starX, starY - 0.5, 'F');
      
      // Extra details under yellow line or integrated
      docInstance.setFont('Helvetica', 'normal');
      docInstance.setFontSize(7.5);
      docInstance.setTextColor(148, 163, 184); // slate-400
      docInstance.text(`Official Construction Proposal Statement | Ref: EST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, 14, 43);
      
      // Right side brand highlight
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(229, 192, 96); // Premium Gold Precision
      docInstance.text('ADDITIONAL SCOPE OF WORK', 196, 15, { align: 'right' });
      docInstance.setFontSize(7.5);
      docInstance.setTextColor(148, 163, 184);
      docInstance.text(`Proposal Date: ${proposalDate}`, 196, 21, { align: 'right' });
      docInstance.text(`Contractor Hotline: ${contactPhone}`, 196, 26, { align: 'right' });

      // Bottom footer page markers representing RL CON
      docInstance.setFontSize(7.5);
      docInstance.setTextColor(148, 163, 184);
      docInstance.text(`RL CON  |  OFFICIAL ESTIMATOR DOCUMENT  |  PAGE ${pageNumber}`, 105, 287, { align: 'center' });
    };

    drawHeader(doc, pageNum);
    let y = 50;

    // Project Info card layout
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, y, 182, 33, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(14, y, 182, 33, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('PROJECT ESTIMATE DETAILS:', 18, y + 6);
    doc.text('CLIENT RECORD DETAILS:', 110, y + 6);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    doc.text(`Project Title/Scope: ${proposalProjectTitle}`, 18, y + 12);
    doc.text(`Location/Site: ${proposalClientAddress}`, 18, y + 17);
    doc.text(`Target Period: ${constructionPeriod}`, 18, y + 22);

    doc.text(`Client Representative: ${proposalClientName}`, 110, y + 12);
    doc.text(`Project Contractor: ${contractorName}`, 110, y + 17);

    y += 41;

    // Intro reference text
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text('This is the computation below for your reference for the proposed construction of the project:', 14, y);
    y += 10;

    // Section header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('I. SCOPE OF WORK:', 14, y);
    y += 6;

    const totalTCP = proposalScopes.reduce((sum, s) => sum + s.cost, 0);

    // Dynamic Helper to render the elegant Slate table header
    const drawTableHeader = (docInstance: typeof doc, yCoord: number) => {
      docInstance.setFillColor(15, 23, 42); // slate-900 / premium dark slate
      docInstance.rect(14, yCoord, 182, 8, 'F');
      
      docInstance.setFont('Helvetica', 'bold');
      docInstance.setFontSize(7.5);
      docInstance.setTextColor(255, 255, 255); // high contrast white
      
      docInstance.text('ITEM', 17, yCoord + 5.5);
      docInstance.text('WORK DIVISION & DETAILED SPECIFICATIONS', 28, yCoord + 5.5);
      docInstance.text('SUBTOTAL (PHP)', 193, yCoord + 5.5, { align: 'right' });
    };

    // Draw initial table header
    drawTableHeader(doc, y);
    y += 8;

    proposalScopes.forEach((scope, index) => {
      const titleLines: string[] = doc.splitTextToSize(`${scope.title.toUpperCase()}`, 122);
      const bulletLines: string[] = [];
      
      // Clean and split each bullet specification to prevent wrapping overflows in the table cell
      scope.bullets.split('\n').filter(Boolean).forEach((line) => {
        const split: string[] = doc.splitTextToSize(`•  ${line}`, 118);
        bulletLines.push(...split);
      });

      const hasSuffixLine = scope.costType && scope.costType !== 'none';
      const totalLinesCount = titleLines.length + bulletLines.length + (hasSuffixLine ? 1 : 0);
      const rowHeight = (totalLinesCount * 4.2) + 5; // 4.2mm per line + 5mm cell vertical padding

      // Check if this row would hit the safety boundaries of Page layout
      if (y + rowHeight > 268) {
        // Draw finishing line of previous table
        doc.setDrawColor(226, 232, 240); // slate-200 boundary line
        doc.line(14, y, 196, y);

        doc.addPage();
        pageNum++;
        drawHeader(doc, pageNum);
        y = 50;
        drawTableHeader(doc, y);
        y += 8;
      }

      // Draw standard zebra striping for clean visual distinction
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(14, y, 182, rowHeight, 'F');
      }

      // Set extremely thin light slate grid lines
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.35);
      
      doc.line(14, y, 196, y); // Top row border
      
      // Vertical column dividers
      doc.line(14, y, 14, y + rowHeight);   // left page border
      doc.line(26, y, 26, y + rowHeight);   // Col 1 to 2 divider
      doc.line(154, y, 154, y + rowHeight); // Col 2 to 3 divider
      doc.line(196, y, 196, y + rowHeight); // right page border

      // Render Item Index Column (Col 1)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text(String(index + 1).padStart(2, '0'), 18, y + 4.5);

      // Render Division Specifications Column (Col 2)
      let col2Y = y + 4.5;
      
      // Bold Header of the Work Scope
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      titleLines.forEach((line) => {
        doc.text(line, 28, col2Y);
        col2Y += 4.2;
      });

      // Special addition for Cost Type Suffix inside PDF table row
      if (scope.costType && scope.costType !== 'none') {
        doc.setFont('Helvetica', 'oblique');
        doc.setFontSize(6.8);
        doc.setTextColor(120, 113, 108); // warm gray
        let suffixLabel = 'labors and materials';
        if (scope.costType === 'labor_only') suffixLabel = 'labor only';
        else if (scope.costType === 'materials_only') suffixLabel = 'materials only';
        doc.text(`* Included: ${suffixLabel}`, 28, col2Y);
        col2Y += 4.2;
      }

      col2Y += 0.8; // subtle spacer

      // Light specs/sub-bullet item items
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105); // slate-600
      bulletLines.forEach((line) => {
        doc.text(line, 31, col2Y);
        col2Y += 4.2;
      });

      // Render Subtotal Cost Column (Col 3)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      
      // Align price perfectly vertically within the middle of row container height
      const centerPriceY = y + (rowHeight / 2) + 1.2;
      doc.text(
        `Php ${scope.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        193,
        centerPriceY,
        { align: 'right' }
      );

      y += rowHeight;
    });

    // Close final row boundary
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, 196, y);

    // Pinned space check for total contract price box
    if (y + 20 > 268) {
      doc.addPage();
      pageNum++;
      drawHeader(doc, pageNum);
      y = 50;
    }

    y += 2;

    // Draw Gold Highlight TCP Box (beautiful contrast)
    doc.setFillColor(254, 252, 232); // amber-50 background color
    doc.setDrawColor(254, 240, 138); // amber-200 border
    doc.rect(14, y, 182, 12, 'F');
    doc.rect(14, y, 182, 12, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text('TOTAL CONTRACT PRICE (TCP) - Labor and Materials:', 18, y + 7.5);
    
    // Aligned perfectly on the right-hand margin of the page
    doc.text(`Php ${totalTCP.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 193, y + 7.5, { align: 'right' });
    y += 22;

    // Section II. TERMS AND CONDITIONS
    if (y + 55 > 268) {
      doc.addPage();
      pageNum++;
      drawHeader(doc, pageNum);
      y = 50;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('II. TERMS AND CONDITIONS:', 14, y);
    y += 8;

    proposalTerms.forEach((term, index) => {
      const resolvedText = resolveTermText(term, totalTCP);
      const termMarker = `${index + 1})  `;
      const termBlockLines = resolvedText.split('\n');
      
      const combinedLinesForSizeCheck: string[] = [];
      termBlockLines.forEach((blockLine) => {
        const wrappedLine = doc.splitTextToSize(blockLine, 172);
        combinedLinesForSizeCheck.push(...wrappedLine);
      });
      
      const blockHeight = combinedLinesForSizeCheck.length * 4.2 + 2;
      
      if (y + blockHeight > 268) {
        doc.addPage();
        pageNum++;
        drawHeader(doc, pageNum);
        y = 50;
      }
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(51, 65, 85);
      
      let termY = y;
      termBlockLines.forEach((blockLine, blIndex) => {
        const wrappedLine = doc.splitTextToSize(blockLine, 172);
        wrappedLine.forEach((subL, slIndex) => {
          if (blIndex === 0 && slIndex === 0) {
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(termMarker, 18, termY);
            
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            doc.text(subL, 24, termY);
          } else {
            doc.text(subL, 24, termY);
          }
          termY += 4.2;
        });
      });
      
      y = termY + 2;
    });

    y += 4;

    // Owner Supplied Materials layout
    if (ownerMaterials.length > 0) {
      if (y + 35 > 268) {
        doc.addPage();
        pageNum++;
        drawHeader(doc, pageNum);
        y = 50;
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Owner Supplier materials (if applicable):', 18, y);
      y += 5.5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      const half = Math.ceil(ownerMaterials.length / 2);
      const col1 = ownerMaterials.slice(0, half);
      const col2 = ownerMaterials.slice(half);

      col1.forEach((item, idx) => {
        doc.text(`•  ${item}`, 22, y + (idx * 4.2));
      });

      col2.forEach((item, idx) => {
        doc.text(`•  ${item}`, 110, y + (idx * 4.2));
      });

      y += Math.max(col1.length, col2.length) * 4.2 + 8;
    }

    // Query disclaimer and sign lines
    if (y + 38 > 268) {
      doc.addPage();
      pageNum++;
      drawHeader(doc, pageNum);
      y = 50;
    }

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Should you have any queries, please do not hesitate to contact us at ${contactPhone}.`, 14, y);
    doc.text('Thank you very much and we appreciated your trust in us. God bless.', 14, y + 4.5);

    y += 18;

    // Real Signatures grid
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.6);

    // Left Contractor signature line
    doc.line(14, y + 6, 85, y + 6);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${contractorName.toUpperCase()}`, 14, y + 10.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Contractor Signature / Representative', 14, y + 14);

    // Right Client signature line
    doc.line(115, y + 6, 186, y + 6);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${proposalClientName.toUpperCase()}`, 115, y + 10.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Approved Customer / Client Acceptance', 115, y + 14);

    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`Rl Con_${proposalClientName}_ Additional scope and ${dateStr}.pdf`);
  };

  // Aggregated Cost Calculations
  const rawTotalMaterialLabor = items.reduce((sum, i) => sum + i.totalCost, 0);
  const vatValue = includeVat ? rawTotalMaterialLabor * (taxPercent / 100) : 0;
  const totalClientTCP = rawTotalMaterialLabor + vatValue;

  const handleGeneratePDF = () => {
    const doc = new jsPDF('p', 'mm', 'letter');
    
    // ==========================================
    // PAGE 1: EXECUTIVE FINANCIAL SUMMARY PLATE
    // ==========================================

    // Elegant Dark Luxury Banner (matching the beautiful RL CON gold-brushed brand theme)
    doc.setFillColor(24, 28, 36); // Deep charcoal black
    doc.rect(0, 0, 216, 40, 'F');
    
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

    // Business Registration Address metadata on the right side
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(229, 192, 96); // Golden Touch
    doc.text('Block 25 Lot 14, Tierra Vista, Santiago, General Trias, Cavite', 202, 16, { align: 'right' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Professional Fit-out & Structural Project Cost Estimation', 202, 22, { align: 'right' });
    doc.text('Official Business Representative Document', 202, 27, { align: 'right' });

    // Elegant gold border line acting as baseline border on the header
    doc.setDrawColor(229, 192, 96);
    doc.setLineWidth(1.2);
    doc.line(0, 40, 216, 40);

    // Document Details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('PROJECT FIT-OUT ESTIMATE SUMMARY REPORT', 16, 52);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Date Generated: ${new Date().toLocaleDateString()} | Reference No: ES-2026-${Math.floor(1000 + Math.random() * 9000)}`, 16, 57);
    
    // Client Table card
    doc.setFillColor(248, 250, 252);
    doc.rect(16, 62, 184, 18, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(16, 62, 184, 18, 'D');

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.text("Client's Name:", 20, 68);
    doc.text('Planned Floor Area:', 20, 74);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(clientName || 'N/A', 55, 68);
    doc.text(`${floorArea} Square Meters (sqm)`, 55, 74);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Project Site Location:', 110, 68);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const addrLines: string[] = doc.splitTextToSize(projectAddress || 'N/A', 48);
    doc.text(addrLines, 148, 68);

    // Page 1 main table header: CONSOLIDATED GENERAL SUMMARY BY CATEGORIES
    doc.setFillColor(21, 94, 117); // Rich theme Cyan-800
    doc.rect(16, 88, 184, 8, 'F');
    
    // Gold baseline
    doc.setDrawColor(229, 192, 96);
    doc.setLineWidth(0.8);
    doc.line(16, 96, 200, 96);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Category Work Scope Grouping', 18, 93.5);
    doc.text('Category Consolidated Net Subtotal', 194, 93.5, { align: 'right' });

    // Calculate dynamic aggregated category grouping
    const categorySummary: { [key: string]: { total: number } } = {};
    items.forEach(item => {
      const cat = item.category || 'General Works';
      if (!categorySummary[cat]) {
        categorySummary[cat] = { total: 0 };
      }
      categorySummary[cat].total += item.totalCost;
    });

    let sumY = 102;
    doc.setFontSize(8.5);

    Object.entries(categorySummary).forEach(([category, data], idx) => {
      // Alternating row background colors
      if (idx % 2 === 0) {
        doc.setFillColor(240, 249, 252); // Soft cyan/blue tint
      } else {
        doc.setFillColor(248, 250, 252); // Soft slate tint
      }
      doc.rect(16, sumY - 5.5, 184, 8.2, 'F');

      // Left accent highlight gold strip
      doc.setFillColor(229, 192, 96); // Metallic Gold #E5C060
      doc.rect(16, sumY - 5.5, 1.5, 8.2, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(category, 20, sumY);
      
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Php ${data.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 194, sumY, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(16, sumY + 2.7, 200, sumY + 2.7);
      sumY += 9;
    });

    // Subtotal section pinned cleanly at y = 175 (plenty of padding space)
    const summaryStartY = 175;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8.5);
    doc.text('Direct Material/Labor Cumulative Total:', 105, summaryStartY);
    if (includeVat) {
      doc.text(`Value-Added Tax (VAT) (12%):`, 105, summaryStartY + 6);
    }
    
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(`Total Project Cost Price (TCP):`, 105, summaryStartY + 14);

    // Amounts aligned perfectly to the right side matching column grid (194)
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(formatPDFCurrency(rawTotalMaterialLabor), 194, summaryStartY, { align: 'right' });
    if (includeVat) {
      doc.text(formatPDFCurrency(vatValue), 194, summaryStartY + 6, { align: 'right' });
    }
    
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(10);
    doc.text(formatPDFCurrency(totalClientTCP), 194, summaryStartY + 14, { align: 'right' });

    if (!includeVat) {
      doc.setFont('Helvetica', 'bolditalic');
      doc.setFontSize(7.5);
      doc.setTextColor(217, 119, 6); // Amber
      doc.text('* Note: Price quotation is EXCLUSIVE of 12% Value-Added Tax (VAT).', 105, summaryStartY + 21);
    }

    // Signatures block cleanly anchored on Page 1 at bottom
    const sigY = 225;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(16, sigY, 80, sigY);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Prepared & Drafted by:', 16, sigY + 4.5);
    doc.setFont('Helvetica', 'bold');
    doc.text('RL ESTIMATION DEPARTMENT', 16, sigY + 8.5);

    doc.setFont('Helvetica', 'normal');
    doc.line(130, sigY, 194, sigY);
    doc.text('Certified Approved for Execution:', 130, sigY + 4.5);
    doc.setFont('Helvetica', 'bold');
    doc.text('RL MANAGEMENT AUTHORITY / CEO', 130, sigY + 8.5);

    // Page 1 Footer
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('RL DESIGN & CONSTRUCTION OFFICES — FITOUT ESTIMATE REPORT — PAGE 1', 108, 268, { align: 'center' });


    // ==========================================
    // PAGE 2: BROAD ESTIMATION & STATEMENT OF WORK
    // ==========================================
    doc.addPage();

    let pageNum = 2;
    const drawPage2MiniHeader = () => {
      // Branded miniature elegant header template
      doc.setFillColor(24, 28, 36); // Deep charcoal black
      doc.rect(0, 0, 216, 25, 'F');
      
      const miniX = 14;
      const miniY = 4;
      doc.setDrawColor(229, 192, 96);
      doc.setLineWidth(1.0);
      doc.line(miniX + 28, miniY + 12, miniX + 2.5, miniY + 12);
      doc.line(miniX + 2.5, miniY + 12, miniX + 2.5, miniY + 6.5);
      doc.line(miniX + 2.5, miniY + 6.5, miniX + 0.5, miniY + 6.5);
      doc.line(miniX + 0.5, miniY + 6.5, miniX + 8.5, miniY + 2.0);
      doc.line(miniX + 8.5, miniY + 2.0, miniX + 16.5, miniY + 6.5);
      doc.line(miniX + 16.5, miniY + 6.5, miniX + 15.0, miniY + 6.5);
      doc.line(miniX + 15.0, miniY + 6.5, miniX + 15.0, miniY + 8.5);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(229, 192, 96);
      doc.text('RL', miniX + 5.0, miniY + 10.5);
      doc.setTextColor(255, 255, 255);
      doc.text('CON', miniX + 10.5, miniY + 10.5);
      
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(4);
      doc.text('BUILD | DESIGN | LANDSCAPE', miniX + 11.0, miniY + 15.0);

      // Page metadata on the right
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(229, 192, 96);
      doc.text(`PAGE ${pageNum}: WORK SCOPE & PROPOSAL SPECIFICATIONS`, 202, 11, { align: 'right' });
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Client: ${clientName || 'Draft Setup'}`, 202, 16, { align: 'right' });

      // Gold baseline
      doc.setDrawColor(229, 192, 96);
      doc.setLineWidth(1.2);
      doc.line(0, 25, 216, 25);

      // Page Footer
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`RL DESIGN & CONSTRUCTION OFFICES — FITOUT ESTIMATE REPORT — PAGE ${pageNum}`, 108, 268, { align: 'center' });
    };

    drawPage2MiniHeader();

    // Page 2 Body Content
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);

    let termsY = 60;

    if (scopeOfWorkMode === 'Automatic') {
      doc.text('II. DETAILED WORK DELIVERABLES & MAIN CATEGORY SPECIFICATIONS', 16, 36);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('The following table details the customized main category groups, statement of works descriptions, and allocated costs:', 16, 41);

      // Detailed cost items table - Cyan Theme
      doc.setFillColor(21, 94, 117); // Cyan-800
      doc.rect(16, 46, 184, 8, 'F');
      
      // Gold line separator
      doc.setDrawColor(229, 192, 96);
      doc.setLineWidth(0.8);
      doc.line(16, 54, 200, 54);
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('Category of Works Group', 18, 51);
      doc.text('Manual Description of Works', 68, 51);
      doc.text('Amount (Php)', 196, 51, { align: 'right' });

      let itemY = 60;
      doc.setTextColor(51, 65, 85);

      items.forEach((item, rowIdx) => {
        // Parse and calculate detailed itemized bullet wrapping
        const descWrappedLines: { text: string; isBulletStart: boolean }[] = [];
        const rawDescLines = (item.description || '').split('\n').filter(l => l.trim().length > 0);
        
        if (rawDescLines.length === 0) {
          descWrappedLines.push({ text: '-', isBulletStart: false });
        } else {
          rawDescLines.forEach((rawL) => {
            const rawText = rawL.trim();
            // Wrap text in 114mm column (6mm left margin for bullet hanging indent)
            const wrappedSublines = doc.splitTextToSize(rawText, 114);
            wrappedSublines.forEach((subL, idx) => {
              descWrappedLines.push({
                text: subL,
                isBulletStart: idx === 0
              });
            });
          });
        }

        const catLines: string[] = doc.splitTextToSize(item.category, 45);
        const maxTextHeight = Math.max(catLines.length, descWrappedLines.length) * 4;
        const cellSpan = Math.max(7, maxTextHeight + 4);

        // Prevent printing text too closely if we overflow y
        if (itemY + cellSpan > 250) {
          doc.addPage();
          pageNum++;
          drawPage2MiniHeader();

          // Detailed cost items table header redraw
          doc.setFillColor(21, 94, 117); // Cyan-800
          doc.rect(16, 32, 184, 8, 'F');
          
          doc.setDrawColor(229, 192, 96);
          doc.setLineWidth(0.8);
          doc.line(16, 40, 200, 40);
          
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text('Category of Works Group', 18, 37);
          doc.text('Manual Description of Works', 68, 37);
          doc.text('Amount (Php)', 196, 37, { align: 'right' });

          itemY = 46;
        }

        // Alternating row styling
        if (rowIdx % 2 === 0) {
          doc.setFillColor(240, 249, 252); // Light cyan tint
        } else {
          doc.setFillColor(255, 255, 255);
        }
        // Fill full row block height
        doc.rect(16, itemY - 3, 184, cellSpan, 'F');
        
        // Draw subtle cell boundaries
        doc.setDrawColor(186, 230, 253); // Sky soft border
        doc.setLineWidth(0.3);
        doc.line(16, itemY - 3, 16, itemY - 3 + cellSpan);
        doc.line(200, itemY - 3, 200, itemY - 3 + cellSpan);
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        // Print Category Group
        catLines.forEach((line, lineIdx) => {
          doc.text(line, 19, itemY + (lineIdx * 4));
        });
        
        // Print itemized bullet list Description of Works
        descWrappedLines.forEach((lineInfo, lineIdx) => {
          const yPos = itemY + (lineIdx * 4);
          if (lineInfo.isBulletStart) {
            // Draw a themed bullet point color dot
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(21, 94, 117); // theme Cyan bullet
            doc.text('•', 68, yPos);
            
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(lineInfo.text, 71.5, yPos);
          } else {
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(lineInfo.text, 71.5, yPos);
          }
        });

        // Print Amount
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.0);
        doc.setTextColor(15, 23, 42);
        doc.text(`Php ${item.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 196, itemY + 1, { align: 'right' });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(16, itemY + cellSpan - 3, 200, itemY + cellSpan - 3);
        
        itemY += cellSpan;
      });

      termsY = itemY + 8;

    } else {
      // MANUAL MODE
      doc.text('II. STATEMENT of WORK & BROAD PROJECTS ESTIMATION', 16, 36);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('The customized master directives, milestones, and core scope of works as defined for execution are as follows:', 16, 41);

      // Light luxury card framing
      doc.setFillColor(248, 250, 252);
      
      const wrappedScopeLines = doc.splitTextToSize(manualScopeText, 172);
      const manualBoxHeight = Math.max(60, wrappedScopeLines.length * 4.4 + 12);

      doc.rect(16, 46, 184, manualBoxHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(16, 46, 184, manualBoxHeight, 'D');

      // Draw customized text block perfectly wrapped
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.0);
      doc.setTextColor(30, 41, 59);
      doc.text(wrappedScopeLines, 22, 54);

      termsY = 46 + manualBoxHeight + 12;
    }

    // Section III. TERMS AND CONDITIONS
    if (termsY + 50 > 255) {
      doc.addPage();
      pageNum++;
      drawPage2MiniHeader();
      termsY = 36;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('III. TERMS AND CONDITIONS:', 18, termsY);
    termsY += 8;

    fitoutTerms.forEach((term, index) => {
      const resolvedText = resolveTermText(term, totalClientTCP);
      const termMarker = `${index + 1})  `;
      const termBlockLines = resolvedText.split('\n');
      
      const combinedLinesForSizeCheck: string[] = [];
      termBlockLines.forEach((blockLine) => {
        const wrappedLine = doc.splitTextToSize(blockLine, 172);
        combinedLinesForSizeCheck.push(...wrappedLine);
      });
      
      const blockHeight = combinedLinesForSizeCheck.length * 4.2 + 2;
      
      if (termsY + blockHeight > 255) {
        doc.addPage();
        pageNum++;
        drawPage2MiniHeader();
        termsY = 36;
      }
      
      let currentTermY = termsY;
      termBlockLines.forEach((blockLine, blIndex) => {
        const wrappedLine = doc.splitTextToSize(blockLine, 172);
        wrappedLine.forEach((subL, slIndex) => {
          if (blIndex === 0 && slIndex === 0) {
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(termMarker, 20, currentTermY);
            
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            doc.text(subL, 26, currentTermY);
          } else {
            doc.text(subL, 26, currentTermY);
          }
          currentTermY += 4.2;
        });
      });
      
      termsY = currentTermY + 2;
    });

    // Add queries disclaimer and signatures at bottom of last page
    if (termsY + 45 > 255) {
      doc.addPage();
      pageNum++;
      drawPage2MiniHeader();
      termsY = 36;
    }

    termsY += 4;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Should you have any queries, please do not hesitate to contact us at 09389027195.', 18, termsY);
    doc.text('Thank you very much and we appreciated your trust in us. God bless.', 18, termsY + 4.5);
    
    termsY += 15;
    
    // Signatures grid
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.6);
    doc.line(18, termsY + 6, 85, termsY + 6);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('RONALD C. FAMORCA', 18, termsY + 10.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Contractor Signature / Representative', 18, termsY + 14);

    doc.line(130, termsY + 6, 197, termsY + 6);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${(clientName || 'Client representative').toUpperCase()}`, 130, termsY + 10.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Approved Customer / Client Acceptance', 130, termsY + 14);

    // Save final output with custom format clientname_quote_date
    const sanitizedClient = (clientName || 'Draft').trim().replace(/[^a-zA-Z0-9]/g, '_');
    const isoDateStr = new Date().toISOString().split('T')[0];
    doc.save(`${sanitizedClient}_quote_${isoDateStr}.pdf`);
  };

  const exportToSheetsCSV = () => {
    const headers = ['Category Group of Works', 'Description of Works', 'Total Amount (PHP)', 'VAT Included', 'Computed Total Client Price'];
    
    const rows = items.map(it => [
      `"${it.category.replace(/"/g, '""')}"`,
      `"${it.description.replace(/"/g, '""')}"`,
      it.totalCost,
      includeVat ? 'YES' : 'NO',
      totalClientTCP
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RL_Estimation_Fitout_${clientName.replace(/\s+/g, '_') || 'Draft'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <Calculator className="w-5 h-5 text-yellow-500" />
            RL CON Estimator & Proposal Hub
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Formulate detailed construction cost breakdowns, automatic TCP computations, and client-ready PDF statements.
          </p>
          
          {/* Elegant active mode tabs button */}
          <div className="flex flex-wrap gap-1.5 mt-4 border-b border-sidebar pb-1">
            <button
              onClick={() => setActiveMode('famarca_proposal')}
              className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer mr-4 sm:mr-6 ${
                activeMode === 'famarca_proposal'
                  ? 'border-b-2 border-yellow-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              💼 Additional Scope of Work Estimator
            </button>
            <button
              onClick={() => setActiveMode('fitout')}
              className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer mr-4 sm:mr-6 ${
                activeMode === 'fitout'
                  ? 'border-b-2 border-yellow-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              📐 Fitout Estimator
            </button>
            <button
              onClick={() => setActiveMode('history')}
              className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeMode === 'history'
                  ? 'border-b-2 border-yellow-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              ⏳ Saved Estimations History ({estimationHistory.length})
            </button>
          </div>
        </div>

        {activeMode === 'fitout' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSaveCurrentToHistory('fitout')}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase text-[10px] tracking-wider px-4 py-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-amber-500"
              title="Save current formulation inputs to local history logs"
            >
              <Save className="w-4 h-4 text-slate-950" />
              <span>Save Session</span>
            </button>

            <button
              onClick={exportToSheetsCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-[10px] tracking-wider px-4 py-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Download Estimations Data to CSV ready for Google Sheets/Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Google Sheets</span>
            </button>

            <button
              onClick={handleGeneratePDF}
              className="bg-slate-900 hover:bg-slate-800 text-yellow-400 font-bold uppercase text-[10px] tracking-wider px-5 py-3 rounded-xl border border-slate-800 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Export PDF
            </button>
          </div>
        )}

        {activeMode === 'famarca_proposal' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSaveCurrentToHistory('famarca_proposal')}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase text-[10px] tracking-wider px-4 py-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border border-amber-500"
              title="Save current proposal inputs to local history logs"
            >
              <Save className="w-4 h-4 text-slate-950" />
              <span>Save Session</span>
            </button>

            <button
              onClick={handleGenerateProposalPDF}
              className="bg-slate-900 hover:bg-slate-800 text-yellow-400 font-bold uppercase text-[10px] tracking-wider px-5 py-3.5 rounded-xl border border-slate-800 flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4 text-yellow-400" />
              Print Proposal PDF
            </button>
          </div>
        )}
      </div>

      {saveSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl px-4 py-3 text-xs font-bold leading-relaxed shadow-xs flex items-center justify-between animate-fade-in animate-duration-150">
          <div className="flex items-center gap-2">
            <span className="text-base">🎉</span>
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-800 text-[10px] uppercase font-black tracking-wider cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {activeMode === 'history' ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-250/60 shadow-xs text-left animate-fade-in space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-yellow-500" />
                Estimator & Additional Work History
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Review, restore, or manage pre-saved Estimator templates and formulation logs.
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/50 max-w-sm">
              <p className="text-[10px] text-amber-800 font-bold leading-snug">
                💡 Quick Hint: Save your work using the "Save Session" button in either estimator to secure it. You can load records back anytime to continue editing!
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-slate-700 text-left">
              <thead>
                <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider">
                  <th className="p-3">Saved Timestamp</th>
                  <th className="p-3">Estimator Type</th>
                  <th className="p-3">Customer / Client Name</th>
                  <th className="p-3">Project Title / Address Location</th>
                  <th className="p-3 text-right">Computed Budget Value</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium bg-white">
                {estimationHistory.length > 0 ? (
                  estimationHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/85 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {item.savedAt}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {item.type === 'famarca_proposal' ? (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black uppercase rounded-lg inline-flex items-center gap-1">
                            💼 Additional Work Scope
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-black uppercase rounded-lg inline-flex items-center gap-1">
                            📐 Fitout Estimator
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-900 font-bold">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {item.clientName}
                        </div>
                      </td>
                      <td className="p-3 text-slate-650 max-w-[280px] truncate" title={item.projectTitleOrAddress}>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.projectTitleOrAddress}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-black text-slate-900 text-right text-[12px] whitespace-nowrap">
                        ₱{item.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => handleLoadHistoryItem(item)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold uppercase text-[10px] rounded cursor-pointer flex items-center gap-1 transition-all"
                            title="Load and edit this saved config in active tab"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Load</span>
                          </button>
                          <button
                            onClick={() => handleDeleteHistoryItem(item.id)}
                            className="p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Remove from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-400 italic">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <History className="w-8 h-8 text-slate-200" />
                        <p className="font-bold text-slate-600">No saved history records found.</p>
                        <p className="text-[11px] text-slate-400 font-normal">Create an estimate or proposal and save its configuration to populate your ledger logs.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeMode === 'famarca_proposal' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left spec parameters panel for Proposal */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
              <span>Client & Project Config</span>
              <span className="text-[10px] bg-yellow-105 text-yellow-850 px-2 py-0.5 rounded font-mono font-bold">RL CON Suite</span>
            </span>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-500">Proposal Project Subtitle</label>
              <input
                type="text"
                placeholder="Proposed Construction of Commercial Project"
                value={proposalProjectTitle}
                onChange={(e) => setProposalProjectTitle(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-hidden focus:border-yellow-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-500">Client Representative Name</label>
              <input
                type="text"
                placeholder="Dimaano Residence"
                value={proposalClientName}
                onChange={(e) => setProposalClientName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-hidden focus:border-yellow-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-500">Project Location Address</label>
              <textarea
                rows={2}
                placeholder="Block 25 Lot 14, Tierra Vista"
                value={proposalClientAddress}
                onChange={(e) => setProposalClientAddress(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-hidden focus:border-yellow-500 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500">Construction Period</label>
                <input
                  type="text"
                  placeholder="maximum of 2 to 3 months"
                  value={constructionPeriod}
                  onChange={(e) => setConstructionPeriod(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500">Permit Clause Note</label>
                <input
                  type="text"
                  placeholder="Not included permit"
                  value={permitNote}
                  onChange={(e) => setPermitNote(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500">Contractor Name</label>
                <input
                  type="text"
                  placeholder="Ronald C. Famorca"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500">Hotline Phone</label>
                <input
                  type="text"
                  placeholder="09389027195"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono"
                />
              </div>
            </div>

            <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 pt-2">
              Downpayment Terms Break %
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Down %</label>
                <input
                  type="number"
                  value={downPaymentPercent}
                  onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Mid %</label>
                <input
                  type="number"
                  value={progressPaymentPercent}
                  onChange={(e) => setProgressPaymentPercent(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Turn %</label>
                <input
                  type="number"
                  value={turnoverPaymentPercent}
                  onChange={(e) => setTurnoverPaymentPercent(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-center"
                />
              </div>
            </div>

            <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 pt-2">
              Owner Supplied Materials
            </span>

            <form onSubmit={handleAddOwnerMaterial} className="flex gap-1.5">
              <input
                type="text"
                placeholder="Add e.g. Kitchen sink..."
                value={newOwnerMaterial}
                onChange={(e) => setNewOwnerMaterial(e.target.value)}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden"
              />
              <button
                type="submit"
                className="bg-slate-900 border border-slate-900 text-yellow-405 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-slate-800 cursor-pointer"
              >
                Add
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {ownerMaterials.map(mat => (
                <span
                  key={mat}
                  className="inline-flex items-center gap-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-sm border border-slate-200 transition-colors cursor-pointer"
                  onClick={() => handleRemoveOwnerMaterial(mat)}
                  title="Click to remove item"
                >
                  {mat}
                  <span className="text-[9px] text-slate-400">×</span>
                </span>
              ))}
            </div>

            {/* Terms & Conditions Manager Section */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>⚙️ Terms & Conditions</span>
                <button
                  type="button"
                  onClick={handleRestoreDefaultProposalTerms}
                  className="text-[9px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-650 cursor-pointer font-bold uppercase transition"
                >
                  Reset Defaults
                </button>
              </span>
              <p className="text-[10px] text-slate-400 font-medium leading-normal">
                Edit terms in place. Change, delete, or add clauses. Live values like <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[9px]">{`{dp_amount}`}</code> and <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[9px]">{`{turnover_amount}`}</code> will automatically calculate.
              </p>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {proposalTerms.map((term, index) => (
                  <div key={index} className="flex gap-1.5 items-start">
                    <span className="text-[10px] font-black font-sans mt-1.5 bg-slate-100 border w-4 h-4 flex items-center justify-center rounded-full text-slate-500 shrink-0 select-none text-[8px]">
                      {index + 1}
                    </span>
                    <textarea
                      rows={2}
                      value={term}
                      onChange={(e) => {
                        const next = [...proposalTerms];
                        next[index] = e.target.value;
                        setProposalTerms(next);
                      }}
                      className="flex-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-800 focus:outline bg-white leading-relaxed resize-none focus:border-yellow-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = proposalTerms.filter((_, i) => i !== index);
                        setProposalTerms(next);
                      }}
                      className="p-1 hover:bg-rose-50 rounded text-rose-500 mt-1 cursor-pointer transition-colors"
                      title="Delete term"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Form to add a new term */}
              <div className="flex gap-2 pt-1 border-t border-dashed border-slate-200">
                <input
                  type="text"
                  placeholder="Add custom term clause..."
                  value={newProposalTerm}
                  onChange={(e) => setNewProposalTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newProposalTerm.trim()) {
                        setProposalTerms([...proposalTerms, newProposalTerm.trim()]);
                        setNewProposalTerm('');
                      }
                    }
                  }}
                  className="flex-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline focus:border-yellow-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newProposalTerm.trim()) {
                      setProposalTerms([...proposalTerms, newProposalTerm.trim()]);
                      setNewProposalTerm('');
                    }
                  }}
                  className="bg-slate-900 border border-slate-900 text-yellow-500 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-800 cursor-pointer flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right interactive worksheet block for Proposal */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              {editingScopeId ? '✏️ Edit Scope of Work Block' : '➕ Encode Scope of Work Block'}
            </span>

            {/* Quick Presets & Site Variations Helper Section */}
            <div className="p-4 bg-yellow-50/40 border border-yellow-250/50 rounded-xl space-y-3.5 text-xs">
              <p className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider flex items-center gap-1.5 text-yellow-600">
                ⭐ Preset Selection Assistants & Helpers
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preschool helper of 11 default category blocks */}
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Quick Category Templates (11 Standard Sectors)</label>
                  <select
                    value={selectedPresetCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedPresetCategory(val);
                      if (val !== 'custom' && val !== '') {
                        const idx = parseInt(val, 10);
                        const template = presetTemplates[idx];
                        if (template) {
                          setNewScopeTitle(template.title);
                          setNewScopeBullets(template.bullets);
                          setNewScopeCost(String(template.cost));
                        }
                      } else {
                        setNewScopeTitle('');
                        setNewScopeBullets('');
                        setNewScopeCost('');
                      }
                    }}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer font-bold text-slate-700 focus:outline-hidden focus:border-yellow-500"
                  >
                    <option value="custom">-- Custom Work / New additions --</option>
                    {presetTemplates.map((tmpl, idx) => (
                      <option key={idx} value={String(idx)}>{idx + 1}. {tmpl.title}</option>
                    ))}
                  </select>
                </div>

                {/* Import from Approved Varied Scopes database */}
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Load from Project Site Variations / Extras</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedSiteIdForImport}
                      onChange={(e) => {
                        setSelectedSiteIdForImport(e.target.value);
                      }}
                      className="w-1/2 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer font-bold text-slate-700 focus:outline-hidden focus:border-yellow-500"
                    >
                      <option value="">-- Choose Project Site --</option>
                      {sites.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>

                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const matchedScope = additionalScopes.find(s => s.id === val);
                          if (matchedScope) {
                            setNewScopeTitle(`Additional / Variation: ${matchedScope.description}`);
                            setNewScopeCost(String(matchedScope.amount));
                            setNewScopeBullets(
                              `Approved Date: ${matchedScope.date}\n` +
                              `Approved By: ${matchedScope.approvedBy || 'Client representative'}\n` +
                              `Remarks: ${matchedScope.notes || 'Variation Order adjustment'}`
                            );
                          }
                        }
                      }}
                      disabled={!selectedSiteIdForImport}
                      className="w-1/2 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer font-bold text-slate-700 focus:outline-hidden focus:border-yellow-500 disabled:opacity-50"
                    >
                      <option value="">-- Choose Site Variation --</option>
                      {additionalScopes
                        .filter(sc => sc.siteId === selectedSiteIdForImport)
                        .map(sc => (
                          <option key={sc.id} value={sc.id}>
                            ₱{sc.amount.toLocaleString()} - {sc.description.substring(0, 20)}...
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </div>
              <p className="text-[9.5px] text-slate-400 font-medium">
                Tip: Choose any preset template or select a site variation from the tracker above to auto-populate the form. You are not forced to stay within the 11 categories; you can add as many custom divisions/categories as you wish.
              </p>
            </div>

            <form onSubmit={handleSaveScope} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl items-end text-xs">
              <div className="md:col-span-6 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">Scope Title / Work Division Heading</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Structurals works (ready for 2nd floor)"
                  value={newScopeTitle}
                  onChange={(e) => setNewScopeTitle(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:border-yellow-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">Total Cost Inclusion / Scope Type</label>
                <select
                  value={newScopeCostType}
                  onChange={(e) => setNewScopeCostType(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-850 font-bold focus:border-yellow-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="labor_and_materials">Labors and Materials</option>
                  <option value="labor_only">Labor Only</option>
                  <option value="materials_only">Materials Only</option>
                  <option value="osm">OSM / Owner\'s Supply Materials</option>
                  <option value="none">None (No Suffix)</option>
                </select>
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">Scope Total Cost (₱)</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 185000"
                  value={newScopeCost}
                  onChange={(e) => setNewScopeCost(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-extrabold font-mono focus:border-yellow-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-12 space-y-1 pt-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">
                  Detailed Tasks / Sub-bullet Specifications (Write one task item per line)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="3 sets of column ready for 2nd floor&#10;Installation of concrete pavement&#10;Installation of masonry wall chb #5"
                  value={newScopeBullets}
                  onChange={(e) => setNewScopeBullets(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 leading-relaxed focus:border-yellow-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-12 flex justify-end gap-2 pt-2 border-t border-slate-200 mt-2">
                {editingScopeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingScopeId(null);
                      setNewScopeTitle('');
                      setNewScopeBullets('');
                      setNewScopeCost('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-900 text-yellow-400 font-bold uppercase text-[10px] tracking-wider rounded-lg flex items-center gap-1 cursor-pointer shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-yellow-500" />
                  <span>{editingScopeId ? 'Save Changes' : 'Append Work Scope Block'}</span>
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between border-b pb-2 pt-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                Scope of Work Table Breakdown
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded font-mono">
                {proposalScopes.length} Major Work Blocks
              </span>
            </div>

            {/* Scope divisions listed */}
            <div className="space-y-3">
              {proposalScopes.length > 0 ? (
                proposalScopes.map((scope, idx) => (
                  <div
                    key={scope.id}
                    className="p-4 border border-slate-150 bg-slate-50/10 rounded-xl hover:border-yellow-200 transition-all flex flex-col md:flex-row justify-between items-start gap-4 relative"
                  >
                    <div className="flex-1 space-y-2 text-left">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 text-yellow-400 font-black font-mono aspect-square w-5 rounded-full flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <h4 className="font-extrabold text-slate-950 text-xs uppercase tracking-tight">{scope.title}</h4>
                      </div>

                      <div className="pl-7 space-y-1">
                        {scope.bullets.split('\n').filter(Boolean).map((bullet, bidx) => (
                          <div key={bidx} className="text-xs text-slate-500 flex items-start gap-1.5 leading-relaxed font-medium">
                            <span className="text-slate-300 font-mono mt-0.5">•</span>
                            <span>{bullet}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pl-7 pt-1 font-mono font-bold text-[11px] text-slate-500">
                        TOTAL = <span className="text-slate-950 font-extrabold">₱ {scope.cost.toLocaleString('en-US')}</span>{getScopeSuffix(scope.costType)}
                      </div>
                    </div>

                    <div className="flex md:flex-col items-center gap-1.5 shrink-0 self-end md:self-start">
                      <button
                        onClick={() => handleEditScopeClick(scope)}
                        className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded cursor-pointer transition-all uppercase tracking-wider"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteScope(scope.id)}
                        className="px-2.5 py-1 text-[10px] bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 hover:text-rose-700 font-bold rounded cursor-pointer transition-all uppercase tracking-wider"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 italic text-xs">
                  Empty proposal. Append scope blocks using the form above.
                </div>
              )}
            </div>

            {/* Proposal Totals & Schedule Breakdown */}
            <div className="border border-slate-150 pt-4 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50">
              <div className="space-y-2 text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  CONTRACT SCHEDULE INSTALLMENTS
                </span>
                
                <div className="space-y-1 font-sans text-xs text-slate-650 font-medium">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                    <span>{downPaymentPercent}% Down Payment upon signing:</span>
                    <span className="font-mono text-slate-900 font-bold">
                      ₱ {(proposalScopes.reduce((sum, s) => sum + s.cost, 0) * (downPaymentPercent / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                    <span>{progressPaymentPercent}% upon 50% construction:</span>
                    <span className="font-mono text-slate-900 font-bold">
                      ₱ {(proposalScopes.reduce((sum, s) => sum + s.cost, 0) * (progressPaymentPercent / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                    <span>{turnoverPaymentPercent}% upon 100% turnover:</span>
                    <span className="font-mono text-slate-900 font-bold">
                      ₱ {(proposalScopes.reduce((sum, s) => sum + s.cost, 0) * (turnoverPaymentPercent / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center items-end text-right border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-6 border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  TOTAL CONTRACT PRICE (TCP)
                </span>
                <div className="text-2xl font-black text-rose-600 tracking-tight font-mono">
                  ₱ {proposalScopes.reduce((sum, s) => sum + s.cost, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[9px] text-slate-400 font-extrabold mt-1 uppercase font-mono">
                  Labor and materials automatically computed
                </span>
              </div>
            </div>

            {/* Primary Print Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleGenerateProposalPDF}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-yellow-450 font-bold uppercase text-[10px] tracking-wider px-6 py-4 rounded-xl border border-slate-800 flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Printer className="w-4 h-4 text-yellow-500" />
                <span>Export / Print RL CON Proposal Statement PDF</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left Specification Form Panel */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              1. Core Parameters
            </span>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-500">Client's Name</label>
              <input
                type="text"
                placeholder="e.g. Serrano residence"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:border-yellow-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-500">Project Location Address</label>
              <input
                type="text"
                placeholder="e.g. Block 25 Lot 14, Tierra Vista"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:border-yellow-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-500">Floor Area (SQM)</label>
              <input
                type="number"
                min="5"
                max="10000"
                value={floorArea}
                onChange={(e) => setFloorArea(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono focus:border-yellow-500 focus:outline-hidden"
              />
            </div>

            <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 pt-2">
              2. Tax & VAT Treatment
            </span>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 block">VAT Option *</label>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setIncludeVat(false)}
                  className={`py-2 rounded-lg border text-center transition-all cursor-pointer uppercase tracking-wider ${
                    !includeVat
                      ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                  }`}
                >
                  🔴 Exclude VAT
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeVat(true)}
                  className={`py-2 rounded-lg border text-center transition-all cursor-pointer uppercase tracking-wider ${
                    includeVat
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                  }`}
                >
                  🟢 Add 12% VAT
                </button>
              </div>
              <p className="text-[10px] font-medium text-slate-450 italic leading-relaxed mt-1">
                {!includeVat 
                  ? 'Quotation displays standard pricing as exclusive of 12% VAT with automated disclaimer notes.' 
                  : 'Automated 12% Value-Added Tax (VAT) computation is added onto the net contract pricing.'
                }
              </p>
            </div>

            <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 pt-2">
              3. Page 2: Scope of Work Settings
            </span>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Generator Source Mode</label>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setScopeOfWorkMode('Automatic')}
                  className={`py-2 rounded-lg border text-center transition-all cursor-pointer uppercase tracking-wider ${
                    scopeOfWorkMode === 'Automatic'
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Automatic List
                </button>
                <button
                  type="button"
                  onClick={() => setScopeOfWorkMode('Manual')}
                  className={`py-2 rounded-lg border text-center transition-all cursor-pointer uppercase tracking-wider ${
                    scopeOfWorkMode === 'Manual'
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Manual Text
                </button>
              </div>
            </div>

            {scopeOfWorkMode === 'Manual' && (
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Edit Statement of Work</label>
                <textarea
                  value={manualScopeText}
                  onChange={(e) => setManualScopeText(e.target.value)}
                  rows={5}
                  placeholder="Type the detailed manual scope list..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-hidden font-medium leading-relaxed resize-none"
                />
              </div>
            )}

            {/* Terms & Conditions Manager Section */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>⚙️ Terms & Conditions</span>
                <button
                  type="button"
                  onClick={handleRestoreDefaultFitoutTerms}
                  className="text-[9px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-650 cursor-pointer font-bold uppercase transition"
                >
                  Reset Defaults
                </button>
              </span>
              <p className="text-[10px] text-slate-400 font-medium leading-normal">
                Edit terms in place. Change, delete, or add clauses. Live values like <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[9px]">{`{dp_amount}`}</code> and <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[9px]">{`{turnover_amount}`}</code> will automatically calculate.
              </p>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {fitoutTerms.map((term, index) => (
                  <div key={index} className="flex gap-1.5 items-start">
                    <span className="text-[10px] font-black font-sans mt-1.5 bg-slate-100 border w-4 h-4 flex items-center justify-center rounded-full text-slate-500 shrink-0 select-none text-[8px]">
                      {index + 1}
                    </span>
                    <textarea
                      rows={2}
                      value={term}
                      onChange={(e) => {
                        const next = [...fitoutTerms];
                        next[index] = e.target.value;
                        setFitoutTerms(next);
                      }}
                      className="flex-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-800 focus:outline bg-white leading-relaxed resize-none focus:border-yellow-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = fitoutTerms.filter((_, i) => i !== index);
                        setFitoutTerms(next);
                      }}
                      className="p-1 hover:bg-rose-50 rounded text-rose-500 mt-1 cursor-pointer transition-colors"
                      title="Delete term"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Form to add a new term */}
              <div className="flex gap-2 pt-1 border-t border-dashed border-slate-200">
                <input
                  type="text"
                  placeholder="Add custom term clause..."
                  value={newFitoutTerm}
                  onChange={(e) => setNewFitoutTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newFitoutTerm.trim()) {
                        setFitoutTerms([...fitoutTerms, newFitoutTerm.trim()]);
                        setNewFitoutTerm('');
                      }
                    }
                  }}
                  className="flex-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline focus:border-yellow-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newFitoutTerm.trim()) {
                      setFitoutTerms([...fitoutTerms, newFitoutTerm.trim()]);
                      setNewFitoutTerm('');
                    }
                  }}
                  className="bg-slate-900 border border-slate-900 text-yellow-500 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-800 cursor-pointer flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Line Items Worksheet */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Cost Items Worksheet Table
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-sm font-mono">
                {items.length} Category Sections
              </span>
            </div>

            {/* Add simplified custom category item form */}
            <form 
              onSubmit={handleAddNewItem} 
              className={`grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-xl items-end text-xs transition-all ${
                editingItemId 
                  ? 'bg-yellow-50/70 border-yellow-200 shadow-inner' 
                  : 'bg-slate-50 border-slate-200 shadow-xs'
              }`}
            >
              <div className={`${newCat === 'custom' ? 'md:col-span-2' : 'md:col-span-4'} space-y-1`}>
                <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Category of Works Group *</label>
                <select
                  value={newCat}
                  onChange={(e) => {
                    setNewCat(e.target.value);
                  }}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer font-bold text-slate-800 focus:outline-hidden focus:border-yellow-500"
                >
                  <option value="temporary facility">temporary facility</option>
                  <option value="Excavation and hauling works">Excavation and hauling works</option>
                  <option value="structural works">structural works</option>
                  <option value="Plumbing works">Plumbing works</option>
                  <option value="Painting works">Painting works</option>
                  <option value="Mobilization and clearing works">Mobilization and clearing works</option>
                  <option value="Other works">Other custom works</option>
                  <option value="custom">✍️ Custom Category...</option>
                </select>
              </div>

              {newCat === 'custom' && (
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Type Specific Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tile works, Joinery"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:border-yellow-500 focus:outline-hidden font-bold"
                  />
                </div>
              )}

              <div className="md:col-span-5 space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 block flex justify-between">
                  <span>Manual Description of Works *</span>
                  <span className="text-[8px] text-slate-400 normal-case">Write one itemized task per line</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder={`Setting up safety barrier boards and floor protection\nInstallation of carpentry partition framing\nFinal clean up and debris clearing`}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:border-yellow-500 focus:outline bg-white leading-relaxed resize-none h-[38px]"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 block">Total Amount (₱) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 45000"
                  value={newUnitCost === 0 ? '' : newUnitCost}
                  onChange={(e) => setNewUnitCost(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold font-mono focus:border-yellow-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-1">
                {editingItemId ? (
                  <div className="flex gap-1">
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 rounded-lg cursor-pointer flex justify-center items-center h-[34px] transition-all"
                      title="Save changes"
                    >
                      <Check className="w-4 h-4 font-black text-white" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItemId(null);
                        setNewDesc('');
                        setNewUnitCost(0);
                        setNewCat('temporary facility');
                        setCustomCategory('');
                      }}
                      className="flex-1 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold py-1.5 px-2 rounded-lg cursor-pointer flex justify-center items-center h-[34px] transition-all"
                      title="Cancel edit"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-slate-900 border border-slate-950 font-bold py-1.5 px-3 rounded-lg text-yellow-500 hover:bg-slate-800 cursor-pointer flex justify-center items-center h-[34px] transition-all"
                    title="Add Category Block"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>

            {/* Line Items Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl font-sans">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-[10px] text-white uppercase tracking-wider font-extrabold font-mono border-b">
                    <th className="p-3 w-1/4">Category of Works Group</th>
                    <th className="p-3 w-1/2">Description of Works</th>
                    <th className="p-3 w-1/4 text-right">Total Amount (₱)</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {items.length > 0 ? (
                    items.map((it) => (
                      <tr key={it.id} className={`hover:bg-slate-50 transition-colors ${editingItemId === it.id ? 'bg-yellow-50/40 border-l-2 border-yellow-405 font-medium' : ''}`}>
                        <td className="p-3 whitespace-nowrap">
                          <span className="inline-block px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 text-[9px] font-black uppercase rounded">
                            {it.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-650 leading-relaxed font-semibold">
                          <ul className="list-disc pl-4 space-y-0.5">
                            {(it.description || '').split('\n').filter(line => line.trim().length > 0).map((line, idx) => (
                              <li key={idx}>{line.trim()}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          ₱ {it.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditItemClick(it)}
                              className={`p-1 hover:bg-yellow-100 rounded text-slate-500 hover:text-yellow-600 transition-colors cursor-pointer ${editingItemId === it.id ? 'text-yellow-600 bg-yellow-50' : ''}`}
                              title="Edit cost item"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(it.id)}
                              className="p-1 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Delete category scope"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center p-8 text-slate-400 italic">
                        No category estimative lines configured. Select a Category of Works and add the manual description of works using the form above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary Sheet */}
            <div className="border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-400 space-y-1">
                <span className="font-extrabold text-slate-600 uppercase block">Engineer Note:</span>
                <p>
                  Calculations represent RL CON standard direct values. Margin multipliers are excluded. Price quotation is exclusive of 12% Value-Added Tax (VAT) unless otherwise configured.
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                <div className="flex justify-between">
                  <span>Direct Material/Labor Total:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {rawTotalMaterialLabor.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                  </span>
                </div>
                {includeVat && (
                  <div className="flex justify-between whitespace-nowrap">
                    <span>Value-Added Tax (VAT) (12%):</span>
                    <span className="font-mono text-slate-800">
                      {vatValue.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-rose-600">
                  <span>Total Project Price (TCP):</span>
                  <span className="font-mono font-black">
                    {totalClientTCP.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                  </span>
                </div>
                {!includeVat && (
                  <p className="text-[10px] text-right font-bold text-amber-600 mt-1 uppercase tracking-wider">
                    ⚠️ Exclusive of 12% Value-Added Tax (VAT)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
