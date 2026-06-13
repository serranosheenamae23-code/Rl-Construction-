/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Key, Building2, UserCheck, Eye, EyeOff } from 'lucide-react';
import { RLLogo } from './RLLogo';
import { ConstructionSite } from '../types';

interface LoginGatewayProps {
  onLoginSuccess: (role: 'Admin' | 'Site Supervisor' | 'Client', assignedSiteId: string) => void;
  sites: ConstructionSite[];
  adminPasscode?: string;
}

export default function LoginGateway({ onLoginSuccess, sites, adminPasscode = '1111' }: LoginGatewayProps) {
  const [role, setRole] = useState<'Admin' | 'Site Supervisor' | 'Client'>('Admin');
  const [passcode, setPasscode] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id || 'site-1');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getPasscodeHint = () => {
    if (role === 'Admin') return adminPasscode;
    if (role === 'Site Supervisor') {
      const siteObj = sites.find(s => s.id === selectedSiteId);
      return siteObj?.supervisorPasscode || '2222';
    }
    return '3333';
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Role-based logins
    if (role === 'Admin' && passcode === adminPasscode) {
      onLoginSuccess('Admin', 'site-1');
    } else if (role === 'Site Supervisor') {
      const siteObj = sites.find(s => s.id === selectedSiteId);
      const expectedCode = siteObj?.supervisorPasscode || '2222';
      if (passcode === expectedCode) {
        onLoginSuccess('Site Supervisor', selectedSiteId);
      } else {
        setErrorMsg('Invalid Security Passcode. Please try again or reference the authorized codes below.');
      }
    } else if (role === 'Client' && passcode === '3333') {
      onLoginSuccess('Client', selectedSiteId);
    } else {
      setErrorMsg('Invalid Security Passcode. Please try again or reference the authorized codes below.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative font-sans">
      {/* Absolute subtle watermark pattern background */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-2">
        <div className="flex justify-center mb-4">
          <RLLogo className="h-16 w-auto drop-shadow-sm" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
          RL CONSTRUCTION MANAGER
        </h2>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Secure Infrastructure Suite
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-8 px-4 shadow-xl border border-slate-100 rounded-2xl sm:px-10 space-y-6"
        >
          <div className="border-b border-slate-100 pb-4 text-center">
            <span className="inline-flex items-center gap-1 bg-yellow-400/10 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-yellow-600" />
              Authorized Personnel Entry Gate
            </span>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-xs font-semibold text-rose-700 leading-snug animate-pulse">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Role Select */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Select Workspace Account Role
              </label>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['Admin', 'Site Supervisor', 'Client'] as const).map((r) => {
                  const active = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r);
                        setPasscode('');
                        setErrorMsg('');
                      }}
                      className={`py-2 px-1 text-[10px] font-bold uppercase tracking-wider rounded-xl border text-center transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-900 border-slate-900 text-yellow-400 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                      }`}
                    >
                      {r === 'Admin' ? '🛡️ Admin' : r === 'Site Supervisor' ? '👷 Supervisor' : '💼 Client'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Site selector for Supervisors or Clients */}
            {role !== 'Admin' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1"
              >
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Select Associated Project Site
                </label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 text-xs rounded-xl px-3 py-2.5 font-bold cursor-pointer text-slate-800"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      📍 {s.name}
                    </option>
                  ))}
                </select>
              </motion.div>
            )}

            {/* Passcode input field */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider flex justify-between">
                <span>Passcode PIN Required</span>
                <span className="lowercase font-normal text-slate-400">test key: {getPasscodeHint()}</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  required
                  value={passcode}
                  maxLength={10}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-yellow-500 focus:outline-hidden text-center tracking-widest font-mono text-base font-black rounded-xl px-10 py-2.5"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black tracking-wider uppercase text-xs py-3 rounded-xl border border-yellow-400 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:shadow-md transition-all pt-2.5"
            >
              <UserCheck className="w-4 h-4" />
              Secure Sign In & Synced Authenticate
            </button>
          </form>

          {/* Guidelines on Roles Access */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1 text-[10px] text-slate-500 font-medium">
            <span className="block font-bold text-slate-700 uppercase tracking-wide">
              🔒 Workspace Authorization System
            </span>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
              <li>
                <strong className="text-slate-600 font-bold">Admin:</strong> Complete project control, full rates edit, client bilings, and PDF reports generation.
              </li>
              <li>
                <strong className="text-slate-600 font-bold">Site Supervisor:</strong> Edit only daily attendance matrix & file petty cash claims for assigned project.
              </li>
              <li>
                <strong className="text-slate-600 font-bold">Client:</strong> Real-time overview of progress percentage, field photo notes, and billings ledger.
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Humbler footer company detail */}
        <p className="text-center text-[10px] text-slate-400 mt-6 font-semibold">
          RL CONSTRUCTION | BLOCK 25 LOT 14, TIERRA VISTA, CAVITE
        </p>
      </div>
    </div>
  );
}
