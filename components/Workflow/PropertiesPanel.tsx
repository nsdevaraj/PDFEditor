import React, { useState, useEffect } from 'react';
import { WorkflowToolId } from '../../services/workflowActions';
import { TOOL_DEFINITIONS } from './constants';
import { X, Sliders } from 'lucide-react';

interface PropertiesPanelProps {
  nodeId: string | null;
  toolId: WorkflowToolId | null;
  data: any;
  onChange: (newData: any) => void;
  onClose: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ nodeId, toolId, data, onChange, onClose }) => {
  const [params, setParams] = useState<any>({});

  useEffect(() => {
    if (data) {
        setParams(data);
    }
  }, [data]);

  const handleChange = (key: string, value: any) => {
    const newData = { ...params, [key]: value };
    setParams(newData);
    onChange(newData);
  };

  if (!nodeId || !toolId) return null;

  const toolDef = TOOL_DEFINITIONS[toolId];

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl absolute right-0 top-0 bottom-0 z-50 animate-in slide-in-from-right duration-200">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm truncate">{toolDef?.title} Settings</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {toolId === 'rotate' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Rotation Angle</label>
            <div className="flex items-center space-x-4">
               <input
                 type="range"
                 min="0"
                 max="270"
                 step="90"
                 value={params.angle || 0}
                 onChange={(e) => handleChange('angle', Number(e.target.value))}
                 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
               />
               <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded w-16 text-center">{params.angle || 0}°</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Rotate pages clockwise.</p>
          </div>
        )}

        {toolId === 'split' && (
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Page Range</label>
             <input
               type="text"
               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               placeholder="e.g. 1-5, 8, 11-13"
               value={params.range || ''}
               onChange={(e) => handleChange('range', e.target.value)}
             />
             <p className="text-xs text-slate-400 mt-2">Enter page numbers or ranges to extract.</p>
           </div>
        )}

        {toolId === 'protect' && (
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
             <input
               type="password"
               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               placeholder="Enter password"
               value={params.password || ''}
               onChange={(e) => handleChange('password', e.target.value)}
             />
           </div>
        )}

        {toolId === 'unlock' && (
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
             <input
               type="password"
               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               placeholder="Enter password"
               value={params.password || ''}
               onChange={(e) => handleChange('password', e.target.value)}
             />
             <p className="text-xs text-slate-400 mt-2">Password to unlock the file.</p>
           </div>
        )}

        {toolId === 'html-to-pdf' && (
            <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">HTML Content</label>
                 <textarea
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 font-mono"
                    placeholder="<html>...</html>"
                    value={params.content || ''}
                    onChange={(e) => handleChange('content', e.target.value)}
                 />
            </div>
        )}

        {/* Generic or No Settings */}
        {!['rotate', 'split', 'protect', 'unlock', 'html-to-pdf'].includes(toolId) && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Sliders className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No configurable settings for this tool.</p>
            </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <button
          onClick={onClose}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
