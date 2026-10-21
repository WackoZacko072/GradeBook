import React, { useState } from 'react';
import { X, Sparkles, Check, ExternalLink, KeyRound, ShieldAlert } from 'lucide-react';
import { getStoredFirebaseConfig, saveClientFirebaseConfig, clearClientFirebaseConfig, isFirebaseConfigured } from '../lib/firebase';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const currentConfig = getStoredFirebaseConfig();
  const configured = isFirebaseConfigured();

  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [authDomain, setAuthDomain] = useState(currentConfig?.authDomain || '');
  const [projectId, setProjectId] = useState(currentConfig?.projectId || '');
  const [storageBucket, setStorageBucket] = useState(currentConfig?.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(currentConfig?.messagingSenderId || '');
  const [appId, setAppId] = useState(currentConfig?.appId || '');

  const [rawJson, setRawJson] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePasteConfig = (text: string) => {
    setRawJson(text);
    setParseError(null);
    try {
      // Clean string if user pasted "const firebaseConfig = { ... };"
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        // Replace non-quoted keys with quoted keys for JSON.parse
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
    } catch (err: any) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Firebase Setup</h2>
              <p className="text-xs text-slate-500">Connect Google Sign-In and Cloud Firestore for your users</p>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {configured ? (
            <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs font-medium">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Firebase is successfully configured and active!</span>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">To enable Google Sign-In:</p>
                <ol className="list-decimal list-inside space-y-1 text-amber-800">
                  <li>Create a project in the <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline font-bold inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="w-3 h-3" /></a></li>
                  <li>Enable <strong>Authentication &gt; Google</strong> and create a <strong>Firestore Database</strong></li>
                  <li>Copy your web app configuration keys below</li>
                </ol>
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

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Or Enter Manually:</h4>
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
                  placeholder="gradebook-app-123"
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
            <span className="text-xs text-slate-400">Settings save to your browser and .env</span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Save & Connect</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
