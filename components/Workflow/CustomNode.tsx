import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { TOOL_DEFINITIONS } from './constants';
import { WorkflowToolId } from '../../services/workflowActions';
import { Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface CustomNodeData extends Record<string, unknown> {
  toolId: WorkflowToolId;
  label: string;
  status?: 'idle' | 'running' | 'done' | 'error';
  errorMessage?: string;
  results?: Blob[];
  isStart?: boolean;
  uploadedFile?: File;
}

const CustomNode = ({ id, data, selected }: NodeProps<any>) => {
  // Cast data to our expected type safely
  const nodeData = data as CustomNodeData;
  const toolId = nodeData.toolId;
  const def = TOOL_DEFINITIONS[toolId];

  if (!def) return <div className="p-2 border border-red-500 rounded bg-red-50">Unknown Tool</div>;

  const Icon = def.icon;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       // We need to update the node data with the file
       // Since we can't update data directly here without the callback,
       // we rely on the parent updating it via a custom event or context?
       // Actually, CustomNode doesn't have 'setNodes'.
       // But 'data' object is mutable in ReactFlow? No.
       // We need to trigger an update.
       // For now, let's store it in a local state or assume parent handles 'data' change?
       // Best practice in ReactFlow is to use 'useReactFlow' hook to update node data.

       // But we can't use hooks inside the callback easily if we don't have the instance.
       // Wait, we can use useReactFlow inside the component.
    }
  };

  return (
    <div className={`shadow-md rounded-xl bg-white border-2 w-64 transition-all duration-200 ${
      selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        className={`w-3 h-3 !bg-slate-400 !border-2 !border-white transition-colors hover:!bg-blue-500 ${nodeData.isStart ? 'opacity-0 pointer-events-none' : ''}`}
      />

      <div className="flex items-center p-3 border-b border-slate-100">
        <div className={`p-2 rounded-lg ${def.bg} mr-3`}>
          <Icon className={`w-5 h-5 ${def.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 truncate">{nodeData.label || def.title}</h3>
          <p className="text-xs text-slate-500 truncate">{def.title}</p>
        </div>
        {nodeData.status === 'running' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
        {nodeData.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500" />}
        {nodeData.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
      </div>

      {/* Start Node File Input */}
      {nodeData.isStart && (
        <div className="p-3 bg-slate-50 border-b border-slate-100">
            <label className="block text-xs font-medium text-slate-500 mb-1">Input File</label>
            <div className="flex items-center space-x-2">
                 {nodeData.uploadedFile ? (
                    <div className="flex items-center text-xs text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 w-full truncate">
                        <FileText className="w-3 h-3 mr-1 text-blue-500" />
                        <span className="truncate">{nodeData.uploadedFile.name}</span>
                    </div>
                 ) : (
                    <input
                        type="file"
                        className="text-xs text-slate-500 w-full file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        onChange={(e) => {
                             // This will be handled by a global event listener or we bubble it up?
                             // A better way is to simply render the input, and let the `onChange` be passed in `data`?
                             // Yes, let's assume `data.onFileUpload` is provided by the parent.
                             if (nodeData.onFileUpload && e.target.files?.[0]) {
                                 nodeData.onFileUpload(id, e.target.files[0]);
                             }
                        }}
                    />
                 )}
            </div>
        </div>
      )}

      {/* File / Result Indicator */}
      {(nodeData.results || nodeData.status === 'done') && (
        <div className="px-3 py-2 bg-slate-50 rounded-b-xl flex items-center justify-between">
           <div className="flex items-center text-xs text-slate-600">
             <FileText className="w-3 h-3 mr-1" />
             <span>Output Ready</span>
           </div>
           <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">PDF</span>
        </div>
      )}

      {nodeData.errorMessage && (
        <div className="px-3 py-2 bg-red-50 rounded-b-xl text-xs text-red-600 border-t border-red-100">
          {nodeData.errorMessage}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-slate-400 !border-2 !border-white transition-colors hover:!bg-blue-500"
      />
    </div>
  );
};

export default memo(CustomNode);
