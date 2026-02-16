import React, { useState, useEffect } from 'react';
import { TOOL_DEFINITIONS } from './constants';
import { WorkflowToolId } from '../../services/workflowActions';
import { LayoutTemplate, Wrench, Save, Clock } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'merge-compress',
    title: 'Merge & Compress',
    nodes: [
      { id: '1', type: 'tool', position: { x: 100, y: 100 }, data: { toolId: 'merge', label: 'Merge PDF', isStart: true } },
      { id: '2', type: 'tool', position: { x: 100, y: 300 }, data: { toolId: 'compress', label: 'Compress PDF' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2' }]
  },
  {
    id: 'rotate-split',
    title: 'Rotate & Split',
    nodes: [
      { id: '1', type: 'tool', position: { x: 100, y: 100 }, data: { toolId: 'rotate', label: 'Rotate PDF', isStart: true } },
      { id: '2', type: 'tool', position: { x: 100, y: 300 }, data: { toolId: 'split', label: 'Split PDF' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2' }]
  }
];

export const Sidebar = ({ onLoadTemplate }: { onLoadTemplate?: (nodes: any[], edges: any[]) => void }) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'templates' | 'saved'>('tools');
  const [savedWorkflows, setSavedWorkflows] = useState<any[]>([]);

  useEffect(() => {
    const loadSaved = () => {
        const raw = localStorage.getItem('lumina-saved-workflows');
        if (raw) {
            setSavedWorkflows(JSON.parse(raw));
        }
    };
    loadSaved();

    const handleUpdate = () => loadSaved();
    window.addEventListener('workflow-updated', handleUpdate);
    return () => window.removeEventListener('workflow-updated', handleUpdate);
  }, []);

  const onDragStart = (event: React.DragEvent, nodeType: string, toolId: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/toolId', toolId);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-slate-200 bg-white">
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 ${activeTab === 'tools' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
             <Wrench className="w-4 h-4" />
             <span>Tools</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 ${activeTab === 'templates' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
             <LayoutTemplate className="w-4 h-4" />
             <span>Templates</span>
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 ${activeTab === 'saved' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
             <Save className="w-4 h-4" />
             <span>Saved</span>
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'tools' && (
            Object.entries(TOOL_DEFINITIONS).map(([id, def]) => {
            const ToolIcon = def.icon;
            return (
                <div
                key={id}
                className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-grab hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center space-x-3 group"
                onDragStart={(event) => onDragStart(event, 'custom', id)}
                draggable
                >
                <div className={`p-2 rounded-md ${def.bg} group-hover:scale-110 transition-transform`}>
                    <ToolIcon className={`w-5 h-5 ${def.color}`} />
                </div>
                <div>
                    <span className="font-medium text-slate-700 text-sm block">{def.title}</span>
                    <span className="text-[10px] text-slate-400">Drag to add</span>
                </div>
                </div>
            );
            })
        )}

        {activeTab === 'templates' && (
            <div className="space-y-3">
                {TEMPLATES.map(template => (
                    <button
                        key={template.id}
                        onClick={() => onLoadTemplate && onLoadTemplate(template.nodes, template.edges)}
                        className="w-full text-left bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-800">{template.title}</span>
                            <LayoutTemplate className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                        </div>
                        <div className="flex items-center space-x-1">
                            {template.nodes.map((n, i) => (
                                <React.Fragment key={n.id}>
                                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                    {i < template.nodes.length - 1 && <div className="w-4 h-0.5 bg-slate-200"></div>}
                                </React.Fragment>
                            ))}
                        </div>
                    </button>
                ))}

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-center">
                    <p className="text-xs text-blue-600">
                        Create a workflow and save it to add more templates here!
                    </p>
                </div>
            </div>
        )}

        {activeTab === 'saved' && (
            <div className="space-y-3">
                {savedWorkflows.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No saved workflows yet.</p>
                    </div>
                ) : (
                    savedWorkflows.map(flow => (
                        <button
                            key={flow.id}
                            onClick={() => onLoadTemplate && onLoadTemplate(flow.nodes, flow.edges)}
                            className="w-full text-left bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-slate-800">{flow.title}</span>
                                <Save className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                            </div>
                            <p className="text-[10px] text-slate-400">
                                {new Date(flow.date).toLocaleDateString()}
                            </p>
                        </button>
                    ))
                )}
            </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <h4 className="text-xs font-bold text-blue-800 mb-1">Pro Tip</h4>
            <p className="text-[10px] text-blue-600/80">
                Chain tools together (e.g., Merge → Compress) to automate complex tasks.
            </p>
        </div>
      </div>
    </aside>
  );
};
