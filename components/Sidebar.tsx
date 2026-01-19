import React from 'react';
import { AppView } from '../types';
import { 
  LayoutDashboard, 
  FileEdit, 
  ArrowRightLeft, 
  PenTool, 
  FileText, 
  Settings,
  LogOut,
  Zap
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const navItems = [
    { id: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
    { id: AppView.EDITOR, icon: FileEdit, label: 'Edit PDF' },
    { id: AppView.CONVERT, icon: ArrowRightLeft, label: 'Convert' },
    { id: AppView.SIGN, icon: PenTool, label: 'eSign & Track' },
    { id: AppView.FORMS, icon: FileText, label: 'Forms' },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen border-r border-slate-700 shadow-xl z-20 hidden md:flex">
      <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">LuminaPDF</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Menu</p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
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
            onClick={() => onChangeView(AppView.SETTINGS)}
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
        
        <button className="flex items-center space-x-2 text-slate-400 hover:text-white text-sm px-2">
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};