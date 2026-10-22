import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  ExternalLink,
  KeyRound,
  ShieldAlert,
  Copy,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
} from 'lucide-react';
import {
  getStoredFirebaseConfig,
  saveClientFirebaseConfig,
  clearClientFirebaseConfig,
  isFirebaseConfigured,
} from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { testFirestoreAccess } from '../utils/gradebookService';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const currentConfig = getStoredFirebaseConfig();
  const configured = isFirebaseConfigured();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'rules' | 'config'>('rules');

  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [authDomain, setAuthDomain] = useState(currentConfig?.authDomain || '');
  const [projectId, setProjectId] = useState(currentConfig?.projectId || '');
  const [storageBucket, setStorageBucket] = useState(currentConfig?.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(currentConfig?.messagingSenderId || '');
  const [appId, setAppId] = useState(currentConfig?.appId || '');

  const [rawJson, setRawJson] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Firestore Rules Test State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasCopiedRules, setHasCopiedRules] = useState(false);

  if (!isOpen) return null;

  const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
      setHasCopiedRules(true);
      setTimeout(() => setHasCopiedRules(false), 3000);
    } catch {
      // Fallback
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const targetUid = user?.uid || 'anonymous-test-uid';
    const result = await testFirestoreAccess(targetUid);
    setTestResult(result);
    setIsTesting(false);
  };

  const handlePasteConfig = (text: string) => {
    setRawJson(text);
    setParseError(null);
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        let jsonLike = match[0]
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
          .replace(/'/g, '"')
          .replace(/,\s*\}/g, '}');
        const parsed = JSON.parse(jsonLike);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.authDomain) setAuthDomain(parsed.authDomain);
        if (parsed.projectId) setProjectId(parsed.projectId);
        if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
        if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId);
        if (parsed.appId) setAppId(parsed.appId);
      }
    } catch {
      setParseError('Could not auto-parse. You can also paste each field manually below.');
    }
  };

  const handleSave = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setParseError('API Key and Project ID are required.');
      return;
    }

    saveClientFirebaseConfig({
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    });
    onClose();
  };

  const handleReset = () => {
    if (confirm('Clear custom Firebase configuration and reset to defaults?')) {
      clearClientFirebaseConfig();
    }
  };

  const consoleRulesUrl = `https://console.firebase.google.com/project/${projectId || 'gradebook-cbd26'}/firestore/rules`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Cloud Sync & Firebase Settings</h2>
              <p className="text-xs text-slate-500">Cross-device synchronization for PC & Phone</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/40 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`pb-2.5 text-xs font-bold cursor-pointer transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Firestore Rules (Cross-Device Sync)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 text-xs font-bold cursor-pointer transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Firebase Credentials</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'rules' ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 text-xs leading-relaxed">
                <p className="font-bold mb-1">Why do my grades not show up on my phone?</p>
                <p className="text-blue-800">
                  By default, Firebase Cloud Firestore blocks all reading and writing until you publish security rules.
                  Without these rules, your computer cannot save grades to the cloud, and your phone cannot load them.
                </p>
              </div>

              {/* Step by step */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800">Step 1: Copy this rule into your Firebase Console</p>
                <div className="relative">
                  <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
                    {FIRESTORE_RULES_SNIPPET}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyRules}
                    className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    {hasCopiedRules ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-300" />
                        <span>Copy Rules</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800">Step 2: Paste & Publish in Firebase Console</p>
                <a
                  href={consoleRulesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
                >
                  <span>Open Firebase Console Rules Tab</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </a>
              </div>

              {/* Connection Test Section */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-xs font-bold text-slate-800">Step 3: Test Cloud Firestore Connection</p>
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={handleTestConnection}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing Read & Write...' : 'Test Cloud Connection'}</span>
                </button>

                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                      testResult.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="leading-relaxed font-medium">
                      {testResult.message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {configured ? (
                <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs font-medium">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Firebase project ({projectId}) is active.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">To connect Firebase credentials:</p>
                    <p className="text-amber-800">
                      Paste the web app configuration object snippet from your Firebase Project Settings.
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Paste Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Quick Paste (Firebase Web App Config Snippet):
                </label>
                <textarea
                  rows={3}
                  placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "your-project",\n  ...\n};`}
                  value={rawJson}
                  onChange={(e) => handlePasteConfig(e.target.value)}
                  className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                {parseError && <p className="text-xs text-rose-500 mt-1">{parseError}</p>}
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Individual Keys:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">API Key *</label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Auth Domain *</label>
                    <input
                      type="text"
                      value={authDomain}
                      onChange={(e) => setAuthDomain(e.target.value)}
                      placeholder="project-id.firebaseapp.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Project ID *</label>
                    <input
                      type="text"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="gradebook-cbd26"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Storage Bucket</label>
                    <input
                      type="text"
                      value={storageBucket}
                      onChange={(e) => setStorageBucket(e.target.value)}
                      placeholder="project-id.appspot.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Messaging Sender ID</label>
                    <input
                      type="text"
                      value={messagingSenderId}
                      onChange={(e) => setMessagingSenderId(e.target.value)}
                      placeholder="1234567890"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">App ID</label>
                    <input
                      type="text"
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      placeholder="1:123456:web:abcd123"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {configured ? (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              Reset Configuration
            </button>
          ) : (
            <span className="text-xs text-slate-400">Settings save to your browser</span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
            {activeTab === 'config' && (
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Save Keys</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
