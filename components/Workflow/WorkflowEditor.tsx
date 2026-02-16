import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  MarkerType,
  MiniMap,
  useReactFlow,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Sidebar } from './Sidebar';
import CustomNode from './CustomNode';
import { PropertiesPanel } from './PropertiesPanel';
import { TOOL_DEFINITIONS, INITIAL_NODES } from './constants';
import { executeToolAction, WorkflowToolId } from '../../services/workflowActions';
import { Play, Save, Download, Trash2, Plus, Loader2, RotateCcw } from 'lucide-react';

const nodeTypes = {
  custom: CustomNode,
  tool: CustomNode, // Alias
};

const FLOW_KEY = 'lumina-workflow-flow';

const WorkflowEditorContent = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();

  // --- Handlers ---

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const toolId = event.dataTransfer.getData('application/toolId') as WorkflowToolId;

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const toolDef = TOOL_DEFINITIONS[toolId];

      const newNode: Node = {
        id: `${toolId}-${Date.now()}`,
        type: 'tool',
        position,
        data: {
            toolId,
            label: toolDef.title,
            isStart: false, // will be updated by effect
            onFileUpload: handleFileUpload
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  const handleFileUpload = useCallback((nodeId: string, file: File) => {
      setNodes((nds) => nds.map(n => {
          if (n.id === nodeId) {
              return {
                  ...n,
                  data: {
                      ...n.data,
                      uploadedFile: file
                  }
              };
          }
          return n;
      }));
  }, [setNodes]);

  // Update isStart property based on connections
  useEffect(() => {
     setNodes((nds) => nds.map(node => {
         const hasIncoming = edges.some(e => e.target === node.id);
         const isStart = !hasIncoming;
         if (node.data.isStart !== isStart) {
             return { ...node, data: { ...node.data, isStart, onFileUpload: handleFileUpload } };
         }
         // Ensure callback is always fresh
         if (node.data.onFileUpload !== handleFileUpload) {
             return { ...node, data: { ...node.data, onFileUpload: handleFileUpload } };
         }
         return node;
     }));
  }, [edges, handleFileUpload, setNodes]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeData = (newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  };

  // --- Execution Engine ---

  const runWorkflow = async () => {
    if (isRunning) return;
    setIsRunning(true);

    // Reset status
    setNodes(nds => nds.map(n => ({
        ...n,
        data: { ...n.data, status: 'idle', errorMessage: undefined, results: undefined }
    })));

    try {
        const nodesMap = new Map(nodes.map(n => [n.id, n]));
        const edgesMap = new Map<string, string[]>(); // target -> sources
        edges.forEach(e => {
            if (!edgesMap.has(e.target)) edgesMap.set(e.target, []);
            edgesMap.get(e.target)?.push(e.source);
        });

        const executed = new Set<string>();
        const results = new Map<string, Blob[]>(); // nodeId -> Blobs

        // Function to check if node is ready
        const isReady = (nodeId: string) => {
            const parents = edgesMap.get(nodeId) || [];
            return parents.every(p => executed.has(p));
        };

        // Get initial queue: nodes with no parents (start nodes)
        let queue = nodes.filter(n => !edgesMap.has(n.id) || edgesMap.get(n.id)!.length === 0);

        if (queue.length === 0 && nodes.length > 0) {
            throw new Error("Cycle detected or no start node found.");
        }

        // Loop until all reachable nodes executed
        // We need a loop that refreshes queue based on completed nodes
        // A simple topological traversal

        // We will process recursively or iteratively
        // Iterative with "pending" set
        const pending = new Set(nodes.map(n => n.id));

        while (pending.size > 0) {
             // Find candidates
             const candidates = Array.from(pending).filter(id => isReady(id));

             if (candidates.length === 0) {
                 if (executed.size < nodes.length) {
                     // Some nodes are unreachable or cycles
                     break;
                 }
                 break;
             }

             // Process one by one (or parallel, but let's do sequential for simplicity and visualization)
             for (const nodeId of candidates) {
                 const node = nodesMap.get(nodeId)!;

                 // Update status running
                 setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n));

                 try {
                     // Gather inputs
                     let inputs: (File | Blob)[] = [];

                     // 1. Uploaded file
                     if (node.data.uploadedFile) {
                         inputs.push(node.data.uploadedFile as File);
                     }

                     // 2. Inputs from parents
                     const parents = edgesMap.get(nodeId) || [];
                     parents.forEach(p => {
                         const parentResults = results.get(p);
                         if (parentResults) {
                             inputs.push(...parentResults);
                         }
                     });

                     if (inputs.length === 0) {
                         throw new Error("No input file provided.");
                     }

                     // Execute
                     const result = await executeToolAction(node.data.toolId as WorkflowToolId, inputs, node.data);

                     results.set(nodeId, [result]);

                     // Update status done
                     setNodes(nds => nds.map(n => n.id === nodeId ? {
                         ...n,
                         data: {
                             ...n.data,
                             status: 'done',
                             results: [result]
                         }
                     } : n));

                 } catch (err: any) {
                     console.error(`Error in node ${node.data.label}:`, err);
                     setNodes(nds => nds.map(n => n.id === nodeId ? {
                         ...n,
                         data: {
                             ...n.data,
                             status: 'error',
                             errorMessage: err.message
                         }
                     } : n));
                     // Stop execution on error? Yes for now.
                     setIsRunning(false);
                     return;
                 }

                 executed.add(nodeId);
                 pending.delete(nodeId);

                 // Small delay for visualization
                 await new Promise(r => setTimeout(r, 500));
             }
        }

    } catch (error: any) {
        alert("Workflow execution failed: " + error.message);
    } finally {
        setIsRunning(false);
    }
  };

  const onSave = useCallback(() => {
    if (selectedNodeId) {
        const node = nodes.find(n => n.id === selectedNodeId);
        if (node && node.data.results && node.data.results.length > 0) {
            const blob = (node.data.results as Blob[])[0];
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workflow_output_${node.data.toolId}.pdf`; // naive extension
            a.click();
            URL.revokeObjectURL(url);
        }
    } else {
        // Save flow to current persistent state
        const flow = { nodes, edges };
        localStorage.setItem(FLOW_KEY, JSON.stringify(flow));

        // Also save to "Saved Workflows" list if user wants to name it
        const name = prompt("Save this workflow as template?", "My Workflow");
        if (name) {
            const savedRaw = localStorage.getItem('lumina-saved-workflows');
            const saved = savedRaw ? JSON.parse(savedRaw) : [];
            const newEntry = {
                id: Date.now().toString(),
                title: name,
                nodes,
                edges,
                date: new Date().toISOString()
            };
            saved.push(newEntry);
            localStorage.setItem('lumina-saved-workflows', JSON.stringify(saved));
            // Dispatch event to update sidebar
            window.dispatchEvent(new Event('workflow-updated'));
        } else {
            alert('Workflow saved to local state!');
        }
    }
  }, [nodes, edges, selectedNodeId]);

  const onRestore = useCallback(() => {
    const flow = localStorage.getItem(FLOW_KEY);
    if (flow) {
      const { nodes: flowNodes, edges: flowEdges } = JSON.parse(flow);
      setNodes(flowNodes || []);
      setEdges(flowEdges || []);
    }
  }, [setNodes, setEdges]);

  const onLoadTemplate = useCallback((templateNodes: Node[], templateEdges: Edge[]) => {
      // Need to regenerate IDs to avoid conflicts if multiple templates loaded or reloaded?
      // For now, replace content.
      setNodes(templateNodes);
      setEdges(templateEdges);
  }, [setNodes, setEdges]);

  const onClear = useCallback(() => {
      setNodes([]);
      setEdges([]);
  }, [setNodes, setEdges]);

  // Restore on mount
  useEffect(() => {
      onRestore();
  }, [onRestore]);

  return (
    <div className="flex h-full w-full" ref={reactFlowWrapper}>
      <Sidebar onLoadTemplate={onLoadTemplate} />

      <div className="flex-1 relative h-full">
        {/* Toolbar */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-xl shadow-lg border border-slate-200 p-2 flex space-x-2">
            <button
                onClick={runWorkflow}
                disabled={isRunning || nodes.length === 0}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-bold shadow-sm transition-colors"
            >
                {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
                Run
            </button>
            <div className="w-px bg-slate-200 mx-2"></div>
            <button onClick={onSave} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg tooltip" title="Save Flow / Download Result">
                <Save className="w-5 h-5" />
            </button>
            <button onClick={onRestore} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="Restore Saved">
                <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={onClear} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Clear All">
                <Trash2 className="w-5 h-5" />
            </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
          className="bg-slate-50"
        >
          <Background color="#cbd5e1" gap={16} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {selectedNodeId && (
            <PropertiesPanel
                nodeId={selectedNodeId}
                toolId={nodes.find(n => n.id === selectedNodeId)?.data.toolId as WorkflowToolId}
                data={nodes.find(n => n.id === selectedNodeId)?.data}
                onChange={updateNodeData}
                onClose={() => setSelectedNodeId(null)}
            />
        )}
      </div>
    </div>
  );
};

export const WorkflowEditor = () => (
  <ReactFlowProvider>
    <WorkflowEditorContent />
  </ReactFlowProvider>
);
