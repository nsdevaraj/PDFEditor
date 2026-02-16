import React, { useState, useEffect } from 'react';
import { WorkflowToolId } from '../../services/workflowActions';
import { TOOL_DEFINITIONS } from './constants';
import { X, Sliders } from 'lucide-react';

// List of tools that have configurable settings
const TOOLS_WITH_SETTINGS: WorkflowToolId[] = [
  'rotate', 'split', 'protect', 'unlock', 'html-to-pdf',
  'organize', 'compress', 'ocr', 'pdf-to-image', 'image-to-pdf',
  'watermark', 'page-numbers', 'header-footer', 'epub-to-pdf',
  'resize', 'metadata'
];

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
  const hasSettings = TOOLS_WITH_SETTINGS.includes(toolId);

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

        {toolId === 'organize' && (
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Page Order</label>
             <input
               type="text"
               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               placeholder="e.g. 1, 3, 2, 4-6"
               value={params.pageOrder || ''}
               onChange={(e) => handleChange('pageOrder', e.target.value)}
             />
             <p className="text-xs text-slate-400 mt-2">Specify the new order of pages.</p>
           </div>
        )}

        {toolId === 'compress' && (
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Compression Level</label>
             <select
               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               value={params.level || 'medium'}
               onChange={(e) => handleChange('level', e.target.value)}
             >
                <option value="low">Low (High Quality)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Smallest Size)</option>
             </select>
           </div>
        )}

        {toolId === 'ocr' && (
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
             <select
               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               value={params.language || 'eng'}
               onChange={(e) => handleChange('language', e.target.value)}
             >
                <option value="eng">English</option>
                <option value="spa">Spanish</option>
                <option value="fra">French</option>
                <option value="deu">German</option>
                <option value="ita">Italian</option>
                <option value="por">Portuguese</option>
             </select>
           </div>
        )}

        {toolId === 'pdf-to-image' && (
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Format</label>
             <select
               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               value={params.format || 'jpg'}
               onChange={(e) => handleChange('format', e.target.value)}
             >
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
             </select>
           </div>
        )}

        {toolId === 'image-to-pdf' && (
           <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Fit Mode</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={params.fit || 'fit'}
                  onChange={(e) => handleChange('fit', e.target.value)}
                >
                    <option value="fit">Fit to Page</option>
                    <option value="original">Original Size</option>
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Orientation</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={params.orientation || 'portrait'}
                  onChange={(e) => handleChange('orientation', e.target.value)}
                >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                </select>
             </div>
           </div>
        )}

        {toolId === 'html-to-pdf' && (
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">HTML Content</label>
                    <textarea
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 font-mono"
                        placeholder="<html>...</html>"
                        value={params.content || ''}
                        onChange={(e) => handleChange('content', e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Page Size</label>
                    <select
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={params.pageSize || 'a4'}
                      onChange={(e) => handleChange('pageSize', e.target.value)}
                    >
                        <option value="a4">A4</option>
                        <option value="letter">Letter</option>
                        <option value="legal">Legal</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Orientation</label>
                    <select
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={params.orientation || 'portrait'}
                      onChange={(e) => handleChange('orientation', e.target.value)}
                    >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                    </select>
                 </div>
            </div>
        )}

        {toolId === 'watermark' && (
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Watermark Text</label>
                    <input
                       type="text"
                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       placeholder="Confidential"
                       value={params.text || ''}
                       onChange={(e) => handleChange('text', e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Opacity ({Math.round((params.opacity || 0.5) * 100)}%)</label>
                    <input
                       type="range"
                       min="0.1"
                       max="1"
                       step="0.1"
                       className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                       value={params.opacity || 0.5}
                       onChange={(e) => handleChange('opacity', Number(e.target.value))}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Rotation ({params.rotation || -45}°)</label>
                    <input
                       type="range"
                       min="-180"
                       max="180"
                       step="15"
                       className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                       value={params.rotation || -45}
                       onChange={(e) => handleChange('rotation', Number(e.target.value))}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                    <select
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={params.position || 'center'}
                      onChange={(e) => handleChange('position', e.target.value)}
                    >
                        <option value="center">Center</option>
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                    </select>
                 </div>
            </div>
        )}

        {toolId === 'page-numbers' && (
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                    <select
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={params.position || 'bottom-center'}
                      onChange={(e) => handleChange('position', e.target.value)}
                    >
                        <option value="bottom-center">Bottom Center</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="top-center">Top Center</option>
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Number</label>
                    <input
                       type="number"
                       min="1"
                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       value={params.startNumber || 1}
                       onChange={(e) => handleChange('startNumber', Number(e.target.value))}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Format</label>
                    <select
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={params.format || '1, 2, 3'}
                      onChange={(e) => handleChange('format', e.target.value)}
                    >
                        <option value="1, 2, 3">1, 2, 3...</option>
                        <option value="i, ii, iii">i, ii, iii...</option>
                        <option value="Page 1">Page 1, Page 2...</option>
                    </select>
                 </div>
            </div>
        )}

        {toolId === 'header-footer' && (
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Header Text</label>
                    <input
                       type="text"
                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       placeholder="Header Text"
                       value={params.headerText || ''}
                       onChange={(e) => handleChange('headerText', e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Footer Text</label>
                    <input
                       type="text"
                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       placeholder="Footer Text"
                       value={params.footerText || ''}
                       onChange={(e) => handleChange('footerText', e.target.value)}
                    />
                 </div>
            </div>
        )}

        {toolId === 'epub-to-pdf' && (
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Font Size (pt)</label>
             <input
               type="number"
               min="8"
               max="72"
               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               value={params.fontSize || 12}
               onChange={(e) => handleChange('fontSize', Number(e.target.value))}
             />
           </div>
        )}

        {toolId === 'resize' && (
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Target Page Size</label>
             <select
               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               value={params.pageSize || 'a4'}
               onChange={(e) => handleChange('pageSize', e.target.value)}
             >
                <option value="a4">A4 (210 x 297 mm)</option>
                <option value="a3">A3 (297 x 420 mm)</option>
                <option value="letter">Letter (8.5 x 11 in)</option>
                <option value="legal">Legal (8.5 x 14 in)</option>
             </select>
           </div>
        )}

        {toolId === 'metadata' && (
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                    <input
                       type="text"
                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       value={params.title || ''}
                       onChange={(e) => handleChange('title', e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Author</label>
                    <input
                       type="text"
                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       value={params.author || ''}
                       onChange={(e) => handleChange('author', e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                    <input
                       type="text"
                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       value={params.subject || ''}
                       onChange={(e) => handleChange('subject', e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Keywords</label>
                    <input
                       type="text"
                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       placeholder="Comma separated"
                       value={params.keywords || ''}
                       onChange={(e) => handleChange('keywords', e.target.value)}
                    />
                 </div>
            </div>
        )}

        {/* Generic or No Settings */}
        {!hasSettings && (
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
