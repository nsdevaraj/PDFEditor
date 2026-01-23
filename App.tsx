import React, { useState, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AppView, UploadedFile } from './types';
import {
  Menu,
  LayoutDashboard,
  FileEdit,
  ArrowRightLeft,
  PenTool,
  FileText,
  Settings,
  LogOut,
  Zap,
  X,
  Loader2
} from 'lucide-react';

// Lazy load components for better performance (code splitting)
const PDFEditor = React.lazy(() => import('./components/PDFEditor').then(module => ({ default: module.PDFEditor })));
const ToolsGrid = React.lazy(() => import('./components/ToolsGrid').then(module => ({ default: module.ToolsGrid })));
const ESignDashboard = React.lazy(() => import('./components/ESignDashboard').then(module => ({ default: module.ESignDashboard })));
const FormsPage = React.lazy(() => import('./components/FormsPage').then(module => ({ default: module.FormsPage })));
const SettingsPage = React.lazy(() => import('./components/SettingsPage').then(module => ({ default: module.SettingsPage })));

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [currentFile, setCurrentFile] = useState<UploadedFile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleUpload = (file: UploadedFile) => {
    setCurrentFile(file);
    setCurrentView(AppView.EDITOR);
  };

  const handleCloseEditor = () => {
    setCurrentFile(null);
    setCurrentView(AppView.DASHBOARD);
  };

  const renderContent = () => {
    // If we have a file and are in Editor mode
    if (currentView === AppView.EDITOR && currentFile) {
      return <PDFEditor file={currentFile} onClose={handleCloseEditor} />;
    }

    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard onUpload={handleUpload} onChangeView={setCurrentView} />;
      case AppView.SIGN:
        return <ESignDashboard onUpload={handleUpload} />;
      case AppView.FORMS:
        return <FormsPage onUpload={handleUpload} onChangeView={setCurrentView} />;
      case AppView.SETTINGS:
        return <SettingsPage />;
      case AppView.CONVERT:
        return <ToolsGrid />;
      // Fallback if user navigates to Editor without a file
      case AppView.EDITOR:
         return <Dashboard onUpload={handleUpload} onChangeView={setCurrentView} />;
      default:
        return <Dashboard onUpload={handleUpload} onChangeView={setCurrentView} />;
    }
  };

  const navItems = [
    { id: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
    { id: AppView.EDITOR, icon: FileEdit, label: 'Edit PDF' },
    { id: AppView.CONVERT, icon: ArrowRightLeft, label: 'Convert' },
    { id: AppView.SIGN, icon: PenTool, label: 'eSign & Track' },
    { id: AppView.FORMS, icon: FileText, label: 'Forms' },
  ];

  const handleMobileNav = (view: AppView) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const isEditorMode = currentView === AppView.EDITOR && !!currentFile;

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans">
      {/* Mobile Menu Overlay */}
      <div
        className={`md:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div
          className={`w-72 h-full bg-slate-900 text-white transform transition-transform duration-300 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={e => e.stopPropagation()}
        >
             <div className="p-6 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="font-bold text-xl tracking-tight">LuminaPDF</h2>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
             </div>

             <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Menu</p>
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMobileNav(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      currentView === item.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}

                <div className="pt-8">
                   <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Settings</p>
                   <button
                    onClick={() => handleMobileNav(AppView.SETTINGS)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      currentView === AppView.SETTINGS
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Settings</span>
                  </button>
                </div>
             </nav>

             <div className="p-4 border-t border-slate-800">
                <div className="bg-slate-800 rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-blue-400">AI Credits</span>
                    <span className="text-xs text-white">12/20</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Free Plan - Resets in 12 days</p>
                </div>

                <button className="flex items-center space-x-2 text-slate-400 hover:text-white text-sm px-2 w-full">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
             </div>
        </div>
      </div>

      {/* Main Sidebar (Desktop) */}
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />

      {/* Main Layout */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Mobile Header - Hide in Editor Mode */}
        {!isEditorMode && (
          <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center space-x-3">
                  <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                      <Menu className="w-6 h-6" />
                  </button>
                  <span className="font-bold text-lg text-slate-900">LuminaPDF</span>
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  AL
              </div>
          </div>
        )}

        {/* Dynamic Content */}
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        }>
          {renderContent()}
        </Suspense>

      </main>
    </div>
  );
};

export default App;