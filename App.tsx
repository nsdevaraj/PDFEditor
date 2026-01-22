import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PDFEditor } from './components/PDFEditor';
import { ToolsGrid } from './components/ToolsGrid';
import { ESignDashboard } from './components/ESignDashboard';
import { FormsPage } from './components/FormsPage';
import { SettingsPage } from './components/SettingsPage';
import { AppView, UploadedFile } from './types';
import { Menu } from 'lucide-react';

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

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans">
      {/* Mobile Menu Overlay */}
      <div className={`md:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm transition-opacity ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)}>
        <div className={`w-64 h-full bg-white transform transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`} onClick={e => e.stopPropagation()}>
             {/* Re-using sidebar logic for mobile would ideally go here, simplified for now */}
             <div className="p-4 border-b">
                <h2 className="font-bold text-xl">LuminaPDF</h2>
             </div>
             <div className="p-4 space-y-4">
                <button onClick={() => { setCurrentView(AppView.DASHBOARD); setIsMobileMenuOpen(false); }} className="block w-full text-left p-2 hover:bg-slate-100 rounded">Dashboard</button>
                <button onClick={() => { setCurrentView(AppView.CONVERT); setIsMobileMenuOpen(false); }} className="block w-full text-left p-2 hover:bg-slate-100 rounded">Tools</button>
             </div>
        </div>
      </div>

      {/* Main Sidebar (Desktop) */}
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />

      {/* Main Layout */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Mobile Header */}
        <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center space-x-3">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600">
                    <Menu className="w-6 h-6" />
                </button>
                <span className="font-bold text-lg">LuminaPDF</span>
            </div>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                AL
            </div>
        </div>

        {/* Dynamic Content */}
        {renderContent()}

      </main>
    </div>
  );
};

export default App;