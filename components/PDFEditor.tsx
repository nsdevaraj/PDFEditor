import React, { useState, useEffect, useRef } from 'react';
import { UploadedFile, ChatMessage } from '../types';
import { 
  Bot, 
  Send, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Type, 
  Highlighter, 
  Eraser, 
  X,
  FileText,
  Wand2,
  Mic,
  FileSignature,
  ChevronLeft,
  ChevronRight,
  Move,
  Trash2,
  EyeOff,
  MousePointer2,
  Hand,
  Image as ImageIcon,
  Minus,
  Circle,
  Square,
  ArrowRight,
  Undo,
  Redo,
  ChevronDown,
  AlignLeft,
  PenSquare,
  Check,
  Slash,
  Pencil
} from 'lucide-react';
import { chatWithDocument } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface PDFEditorProps {
  file: UploadedFile;
  onClose: () => void;
}

// Expanded Tool Types
type ToolType =
  | 'none'
  | 'select'
  | 'hand'
  | 'text'
  | 'signature'
  | 'draw'
  | 'highlight'
  | 'eraser'
  | 'shape'
  | 'image'
  | 'redact'
  | 'edit-text';

type ShapeType = 'rect' | 'circle' | 'line' | 'arrow' | 'check' | 'cross';

interface EditorElement {
  id: string;
  type: 'text' | 'signature' | 'highlight' | 'redact' | 'image' | 'path' | 'rect' | 'circle' | 'line' | 'arrow' | 'check' | 'cross';
  x: number;
  y: number;
  content?: string; // Text content or Image DataURL
  width?: number;
  height?: number;
  page: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  points?: {x: number, y: number}[]; // For freehand drawing
  endX?: number; // For lines/arrows
  endY?: number;
}

export const PDFEditor: React.FC<PDFEditorProps> = ({ file, onClose }) => {
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  // Editor State
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [subTool, setSubTool] = useState<string>('pencil'); // For draw/shape sub-types
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [elements, setElements] = useState<EditorElement[]>([]);
  const [history, setHistory] = useState<EditorElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Panning State
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

  // Drawing/Creating State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
  const [creationElement, setCreationElement] = useState<EditorElement | null>(null);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);

  // Tool Settings
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fillColor, setFillColor] = useState('transparent');

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isRendering, setIsRendering] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null); // Scrollable container
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: `Hello! I've analyzed **${file.name}**. I can summarize it, rewrite sections, or extract specific data for you. What would you like to do?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load PDF Document
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsRendering(true);
        const raw = atob(file.content);
        const uint8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          uint8Array[i] = raw.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setIsRendering(false);
      } catch (error) {
        console.error("Error loading PDF:", error);
        setIsRendering(false);
      }
    };

    if (file.content) {
      loadPdf();
    }
  }, [file]);

  // Render Page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: scale, rotation: rotation });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
          console.error("Render error:", error);
        }
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale, rotation]);

  // --- Tool Logic ---

  const addToHistory = (newElements: EditorElement[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newElements);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
      if (historyIndex > 0) {
          setHistoryIndex(historyIndex - 1);
          setElements(history[historyIndex - 1]);
      }
  };

  const handleRedo = () => {
      if (historyIndex < history.length - 1) {
          setHistoryIndex(historyIndex + 1);
          setElements(history[historyIndex + 1]);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && canvasRef.current) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
            // Simplified image add for now - center on screen
            const viewportWidth = canvasRef.current!.width / scale;
            const viewportHeight = canvasRef.current!.height / scale;

            const newElement: EditorElement = {
                id: Date.now().toString(),
                type: 'image',
                x: (viewportWidth / 2) - 100,
                y: (viewportHeight / 2) - 100,
                content: event.target.result as string,
                width: 200,
                height: 200,
                page: currentPage
            };
            const newElements = [...elements, newElement];
            setElements(newElements);
            addToHistory(newElements);
            setActiveTool('select');
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    e.target.value = '';
  };

  const addElementCentered = (type: 'text' | 'signature') => {
      if (!canvasRef.current) return;
      const viewportWidth = canvasRef.current.width / scale;
      const viewportHeight = canvasRef.current.height / scale;

      const newElement: EditorElement = {
          id: Date.now().toString(),
          type,
          x: (viewportWidth / 2) - (type === 'text' ? 50 : 60),
          y: (viewportHeight / 2) - 20,
          page: currentPage,
          content: type === 'text' ? 'Type here...' : 'Alex. L',
          width: undefined,
          height: undefined,
      };
      
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
      setActiveTool('select');
  };


  // --- Event Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
      // 1. Hand Tool
      if (activeTool === 'hand') {
          setIsPanning(true);
          setPanStart({ x: e.clientX, y: e.clientY });
          if (editorContainerRef.current) {
              setScrollStart({
                  x: editorContainerRef.current.scrollLeft,
                  y: editorContainerRef.current.scrollTop
              });
          }
          return;
      }

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      // 2. Drawing Tool
      if (activeTool === 'draw') {
          setIsDrawing(true);
          setCurrentPath([{x, y}]);
          return;
      }

      // 3. Shape Tool
      if (activeTool === 'shape') {
          setStartPoint({x, y});
          const type = subTool as any;
          const newEl: EditorElement = {
              id: 'temp',
              type: type,
              x, y,
              width: 0, height: 0,
              endX: x, endY: y,
              strokeColor: '#000000',
              strokeWidth: 2,
              fillColor: 'transparent',
              page: currentPage
          };
          setCreationElement(newEl);
          return;
      }

      // 4. Select Tool - Deselect or start drag (handled by element mousedown)
  };

  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (activeTool === 'eraser') {
      const newElements = elements.filter(el => el.id !== id);
      setElements(newElements);
      addToHistory(newElements);
      return;
    }

    if (activeTool !== 'select') return;

    const element = elements.find(el => el.id === id);
    if (!element) return;

    setDraggingId(id);
    const elRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - elRect.left,
      y: e.clientY - elRect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Pan
    if (isPanning && editorContainerRef.current) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        editorContainerRef.current.scrollLeft = scrollStart.x - dx;
        editorContainerRef.current.scrollTop = scrollStart.y - dy;
        return;
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // 2. Draw
    if (isDrawing) {
        setCurrentPath(prev => [...prev, {x, y}]);
        return;
    }

    // 3. Create Shape
    if (creationElement && startPoint) {
        setCreationElement(prev => {
            if (!prev) return null;
            return {
                ...prev,
                width: x - startPoint.x,
                height: y - startPoint.y,
                endX: x,
                endY: y
            };
        });
        return;
    }

    // 4. Drag Element
    if (activeTool === 'select' && draggingId && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newX = (e.clientX - containerRect.left - dragOffset.x) / scale;
        const newY = (e.clientY - containerRect.top - dragOffset.y) / scale;

        setElements(prev => prev.map(el => {
            if (el.id !== draggingId) return el;

            if (el.type === 'line' || el.type === 'arrow') {
                const dx = newX - el.x;
                const dy = newY - el.y;
                return { ...el, x: newX, y: newY, endX: el.endX! + dx, endY: el.endY! + dy };
            }

            return { ...el, x: newX, y: newY };
        }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);

    if (isDrawing) {
        setIsDrawing(false);
        if (currentPath.length > 2) {
             const newElement: EditorElement = {
                id: Date.now().toString(),
                type: 'path',
                x: 0, y: 0, // Path points are absolute relative to canvas
                points: currentPath,
                strokeColor: subTool === 'highlighter' ? '#fde047' : strokeColor,
                strokeWidth: subTool === 'highlighter' ? 15 : strokeWidth,
                page: currentPage,
                // Highlight is transparent
                fillColor: subTool === 'highlighter' ? 'transparent' : undefined
            };
            const newElements = [...elements, newElement];
            setElements(newElements);
            addToHistory(newElements);
        }
        setCurrentPath([]);
    }

    if (creationElement) {
        const finalElement = { ...creationElement, id: Date.now().toString() };
        // Normalize rect dimensions if negative
        if (finalElement.type === 'rect' || finalElement.type === 'circle') {
             if (finalElement.width! < 0) {
                 finalElement.x += finalElement.width!;
                 finalElement.width = Math.abs(finalElement.width!);
             }
             if (finalElement.height! < 0) {
                 finalElement.y += finalElement.height!;
                 finalElement.height = Math.abs(finalElement.height!);
             }
        }

        const newElements = [...elements, finalElement];
        setElements(newElements);
        addToHistory(newElements);
        setCreationElement(null);
        setStartPoint(null);
        // Reset to select tool after shape creation? Or keep shape tool active?
        // Usually keeping tool active is better for multiple shapes.
    }

    if (draggingId) {
        setDraggingId(null);
        // Could save history here if we tracked start position
    }
  };

  const updateElementContent = (id: string, newContent: string) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, content: newContent } : el));
  };

  // Chat Logic
  const handleSendMessage = async () => {
    if (!input.trim() || isAiProcessing) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsAiProcessing(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await chatWithDocument(history, userMsg.text, file.content, file.type);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
       const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I encountered an error processing your request.",
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const changePage = (offset: number) => {
    const newPage = currentPage + offset;
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
    }
  };

  // Helper for Toolbar Button
  const ToolButton = ({
    active,
    onClick,
    icon: Icon,
    title,
    hasDropdown,
    onDropdownClick
  }: {
    active: boolean,
    onClick: () => void,
    icon: any,
    title: string,
    hasDropdown?: boolean,
    onDropdownClick?: (e: React.MouseEvent) => void
  }) => (
    <div className="flex items-center space-x-0.5 bg-slate-100 rounded-lg p-0.5">
        <button
            onClick={onClick}
            className={`p-1.5 rounded-md transition-colors ${active ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:bg-slate-200'}`}
            title={title}
        >
            <Icon className="w-4 h-4" />
        </button>
        {hasDropdown && (
            <button
                onClick={onDropdownClick}
                className={`p-0.5 rounded-md transition-colors ${activeDropdown === title ? 'bg-slate-300' : 'text-slate-500 hover:bg-slate-200'}`}
            >
                <ChevronDown className="w-3 h-3" />
            </button>
        )}
    </div>
  );

  // Helper to render element
  const renderElement = (el: EditorElement) => {
      switch (el.type) {
          case 'text':
              return (
                <div
                    contentEditable={activeTool === 'select'}
                    suppressContentEditableWarning
                    onBlur={(e) => updateElementContent(el.id, e.currentTarget.innerText)}
                    className="text-slate-900 text-base px-2 py-1 border border-transparent hover:border-blue-400 hover:bg-blue-50/30 rounded outline-none min-w-[50px] cursor-text whitespace-nowrap"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {el.content}
                </div>
              );
          case 'signature':
              return (
                 <div className="font-serif italic text-4xl text-blue-900 px-4 py-2 select-none border-2 border-transparent group-hover:border-blue-300 rounded-lg transition-all whitespace-nowrap bg-transparent">
                    {el.content}
                 </div>
              );
          case 'image':
              return (
                   <div className="relative">
                        <img
                            src={el.content}
                            alt="User Upload"
                            style={{
                                width: el.width,
                                height: el.height,
                                pointerEvents: 'none'
                            }}
                        />
                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-400 transition-colors" />
                   </div>
              );
          case 'rect':
              return (
                  <div
                    style={{
                        width: el.width,
                        height: el.height,
                        border: `${el.strokeWidth}px solid ${el.strokeColor}`,
                        backgroundColor: el.fillColor || 'transparent'
                    }}
                  />
              );
          case 'circle':
              return (
                  <div
                    style={{
                        width: el.width,
                        height: el.height,
                        borderRadius: '50%',
                        border: `${el.strokeWidth}px solid ${el.strokeColor}`,
                        backgroundColor: el.fillColor || 'transparent'
                    }}
                  />
              );
           case 'highlight': // Legacy highlight
              return (
                   <div
                        className="bg-yellow-300/40 border border-yellow-400/50 hover:bg-yellow-300/60 transition-colors"
                        style={{ width: el.width, height: el.height }}
                    />
              );
           case 'redact': // Legacy redact
              return (
                   <div className="bg-black" style={{ width: el.width, height: el.height }} />
              );
           // SVG types (path, line, arrow) are handled in a separate SVG layer or absolutely positioned SVG
           default: return null;
      }
  };

  return (
    <div 
      className="flex h-screen w-full bg-slate-100 overflow-hidden relative" 
      onMouseUp={handleMouseUp} 
      onMouseMove={handleMouseMove}
      onClick={() => setActiveDropdown(null)}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Define Markers for Arrows */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#000000" />
            </marker>
        </defs>
      </svg>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white shadow-sm flex items-center justify-between px-4 z-10 border-b border-slate-200">
        <div className="flex items-center space-x-4">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center space-x-2">
                <button 
                    onClick={() => setActiveTool('hand')}
                    className={`p-2 rounded-lg ${activeTool === 'hand' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    title="Hand Tool (Pan)"
                >
                    <Hand className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setActiveTool('select')}
                    className={`p-2 rounded-lg ${activeTool === 'select' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    title="Select Tool"
                >
                    <MousePointer2 className="w-5 h-5" />
                </button>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <button
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-sm"
                title="Edit existing text (Not fully implemented)"
                onClick={() => setActiveTool('edit-text')}
            >
                <PenSquare className="w-4 h-4" />
                <span>Edit Text</span>
            </button>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center space-x-2 relative">
                 <button
                    onClick={() => addElementCentered('text')}
                    className={`p-2 rounded-lg ${activeTool === 'text' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    title="Add Text"
                >
                    <Type className="w-5 h-5" />
                </button>

                <div className="relative">
                     <ToolButton
                        active={activeTool === 'draw'}
                        onClick={() => { setActiveTool('draw'); setSubTool('pencil'); }}
                        icon={subTool === 'highlighter' ? Highlighter : Pencil}
                        title="Draw"
                        hasDropdown
                        onDropdownClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'draw' ? null : 'draw'); }}
                     />
                     {activeDropdown === 'draw' && (
                         <div className="absolute top-full left-0 mt-1 w-40 bg-white shadow-xl rounded-lg border border-slate-100 py-1 z-50">
                             <button onClick={() => { setActiveTool('draw'); setSubTool('pencil'); }} className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-slate-50 text-sm">
                                 <Pencil className="w-4 h-4" /> <span>Pencil</span>
                             </button>
                             <button onClick={() => { setActiveTool('draw'); setSubTool('highlighter'); }} className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-slate-50 text-sm">
                                 <Highlighter className="w-4 h-4" /> <span>Highlighter</span>
                             </button>
                             <div className="border-t border-slate-100 my-1" />
                             <button onClick={() => setActiveTool('eraser')} className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-slate-50 text-sm text-red-600">
                                 <Eraser className="w-4 h-4" /> <span>Eraser</span>
                             </button>
                         </div>
                     )}
                </div>

                <div className="relative">
                    <ToolButton
                         active={activeTool === 'highlight'}
                         onClick={() => setActiveTool('highlight')}
                         icon={Highlighter}
                         title="Text Markup"
                         hasDropdown
                         onDropdownClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'markup' ? null : 'markup'); }}
                    />
                    {activeDropdown === 'markup' && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white shadow-xl rounded-lg border border-slate-100 py-1 z-50">
                            <button onClick={() => setActiveTool('highlight')} className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-slate-50 text-sm">
                                <Highlighter className="w-4 h-4 text-yellow-500" /> <span>Highlight</span>
                            </button>
                            <button onClick={() => { setActiveTool('shape'); setSubTool('line'); }} className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-slate-50 text-sm">
                                <Minus className="w-4 h-4" /> <span>Underline</span>
                            </button>
                             <button onClick={() => { setActiveTool('shape'); setSubTool('line'); }} className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-slate-50 text-sm line-through">
                                <span className="w-4 text-center">T</span> <span>Strikethrough</span>
                            </button>
                            <button onClick={() => { setActiveTool('draw'); setSubTool('pencil'); }} className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-slate-50 text-sm">
                                <span className="w-4 text-center">~</span> <span>Squiggle (Draw)</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <ToolButton
                         active={activeTool === 'shape'}
                         onClick={() => { setActiveTool('shape'); setSubTool('rect'); }}
                         icon={Square}
                         title="Shapes"
                         hasDropdown
                         onDropdownClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'shapes' ? null : 'shapes'); }}
                    />
                    {activeDropdown === 'shapes' && (
                        <div className="absolute top-full left-0 mt-1 w-40 bg-white shadow-xl rounded-lg border border-slate-100 py-1 z-50">
                            <button onClick={() => { setActiveTool('shape'); setSubTool('rect'); }} className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-slate-50 text-sm">
                                <Square className="w-4 h-4" /> <span>Rectangle</span>
                            </button>
                            <button onClick={() => { setActiveTool('shape'); setSubTool('circle'); }} className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-slate-50 text-sm">
                                <Circle className="w-4 h-4" /> <span>Circle</span>
                            </button>
                             <button onClick={() => { setActiveTool('shape'); setSubTool('line'); }} className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-slate-50 text-sm">
                                <Minus className="w-4 h-4" /> <span>Line</span>
                            </button>
                             <button onClick={() => { setActiveTool('shape'); setSubTool('arrow'); }} className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-slate-50 text-sm">
                                <ArrowRight className="w-4 h-4" /> <span>Arrow</span>
                            </button>
                        </div>
                    )}
                </div>

                 <button
                    onClick={() => addElementCentered('signature')}
                    className={`p-2 rounded-lg ${activeTool === 'signature' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    title="Sign"
                >
                    <FileSignature className="w-5 h-5" />
                </button>
            </div>

            <div className="h-6 w-px bg-slate-200" />

             <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-lg ${activeTool === 'image' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    title="Add Image"
                >
                    <ImageIcon className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center space-x-1">
                 <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-30">
                     <Undo className="w-5 h-5" />
                 </button>
                 <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-30">
                     <Redo className="w-5 h-5" />
                 </button>
            </div>

        </div>

        <div className="flex items-center space-x-4">
             <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
                <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} className="p-2 hover:bg-white rounded shadow-sm text-slate-600"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-xs font-medium w-12 text-center text-slate-600">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(Math.min(2.5, scale + 0.1))} className="p-2 hover:bg-white rounded shadow-sm text-slate-600"><ZoomIn className="w-4 h-4" /></button>
            </div>
             <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-medium text-sm transition-colors">
                <Download className="w-4 h-4" />
                <span>Export</span>
             </button>
             <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-2 rounded-lg transition-colors ${isChatOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'}`}>
                <Bot className="w-5 h-5" />
             </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex mt-16 h-[calc(100vh-64px)]">
        {/* PDF Viewer Canvas */}
        <div
            ref={editorContainerRef}
            className="flex-1 bg-slate-200 overflow-auto flex justify-center p-8 relative"
            style={{ cursor: activeTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
            onMouseDown={handleMouseDown}
        >
            <div 
                ref={containerRef}
                className="bg-white shadow-2xl transition-transform duration-75 ease-out origin-top relative"
                style={{ 
                    minHeight: '400px',
                    minWidth: '300px',
                    cursor: activeTool === 'eraser' ? 'crosshair' : 'inherit'
                }}
            >
                {isRendering && !pdfDoc && (
                     <div className="absolute inset-0 flex items-center justify-center z-50 bg-white/50">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                     </div>
                )}
                
                <canvas ref={canvasRef} className="block relative z-0" />
                
                {/* SVG Layer for Paths and Lines/Arrows */}
                <svg className="absolute inset-0 pointer-events-none z-10" style={{ width: '100%', height: '100%' }}>
                     {/* Render Current Drawing Path */}
                     {isDrawing && currentPath.length > 0 && (
                         <path
                            d={`M ${currentPath.map(p => `${p.x * scale},${p.y * scale}`).join(' L ')}`}
                            stroke={subTool === 'highlighter' ? '#fde047' : strokeColor}
                            strokeWidth={(subTool === 'highlighter' ? 15 : strokeWidth) * scale}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity={subTool === 'highlighter' ? 0.5 : 1}
                         />
                     )}

                     {/* Render Lines/Arrows being created */}
                     {creationElement && (creationElement.type === 'line' || creationElement.type === 'arrow') && (
                         <line
                            x1={creationElement.x * scale}
                            y1={creationElement.y * scale}
                            x2={creationElement.endX! * scale}
                            y2={creationElement.endY! * scale}
                            stroke="black"
                            strokeWidth={2 * scale}
                            markerEnd={creationElement.type === 'arrow' ? "url(#arrowhead)" : undefined}
                         />
                     )}

                     {/* Render Existing Paths/Lines/Arrows */}
                     {elements.filter(el => el.page === currentPage).map(el => {
                         if (el.type === 'path' && el.points) {
                             return (
                                 <path
                                    key={el.id}
                                    d={`M ${el.points.map(p => `${(p.x + el.x) * scale},${(p.y + el.y) * scale}`).join(' L ')}`}
                                    stroke={el.strokeColor}
                                    strokeWidth={(el.strokeWidth || 2) * scale}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeOpacity={el.type === 'highlight' || (el.strokeWidth && el.strokeWidth > 10) ? 0.5 : 1}
                                    style={{ pointerEvents: 'visibleStroke', cursor: activeTool === 'eraser' ? 'crosshair' : 'move' }}
                                    onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                                 />
                             );
                         }
                         if (el.type === 'line' || el.type === 'arrow') {
                             return (
                                 <line
                                    key={el.id}
                                    x1={el.x * scale}
                                    y1={el.y * scale}
                                    x2={el.endX! * scale}
                                    y2={el.endY! * scale}
                                    stroke={el.strokeColor || "black"}
                                    strokeWidth={(el.strokeWidth || 2) * scale}
                                    markerEnd={el.type === 'arrow' ? "url(#arrowhead)" : undefined}
                                    style={{ pointerEvents: 'visibleStroke', cursor: activeTool === 'eraser' ? 'crosshair' : 'move' }}
                                    onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                                 />
                             );
                         }
                         return null;
                     })}
                </svg>

                {/* DOM Elements Layer (Text, Images, Rects, Circles) */}
                {elements.filter(el => el.page === currentPage).map((el) => {
                   if (el.type === 'path' || el.type === 'line' || el.type === 'arrow') return null; // Handled by SVG layer

                   return (
                   <div 
                        key={el.id}
                        className={`absolute z-20 group ${activeTool === 'eraser' ? 'hover:opacity-50 cursor-pointer' : 'cursor-move'}`}
                        style={{
                            left: el.x * scale,
                            top: el.y * scale,
                            transform: `scale(${scale})`, 
                            transformOrigin: 'top left'
                        }}
                        onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                   >
                       {renderElement(el)}

                       {/* Delete Button for DOM elements */}
                       {activeTool !== 'eraser' && (
                           <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setElements(elements.filter(e => e.id !== el.id)) }}
                                    className="p-1 bg-red-500 text-white rounded-full shadow hover:bg-red-600 scale-75"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                           </div>
                       )}
                   </div>
                   );
                })}

                {/* Render Shape being created (Rect/Circle) */}
                {creationElement && (creationElement.type === 'rect' || creationElement.type === 'circle') && (
                     <div
                        className="absolute border-2 border-blue-500 bg-blue-100/20"
                        style={{
                            left: Math.min(creationElement.x, creationElement.endX!) * scale,
                            top: Math.min(creationElement.y, creationElement.endY!) * scale,
                            width: Math.abs(creationElement.width!) * scale,
                            height: Math.abs(creationElement.height!) * scale,
                            borderRadius: creationElement.type === 'circle' ? '50%' : '0'
                        }}
                     />
                )}
            </div>
        </div>

        {/* AI Assistant Sidebar */}
        <div className={`${isChatOpen ? 'w-96' : 'w-0'} bg-white border-l border-slate-200 transition-all duration-300 flex flex-col relative z-30`}>
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                <div className="flex items-center space-x-2 text-blue-600">
                    <Wand2 className="w-5 h-5" />
                    <h3 className="font-bold">AI Assistant</h3>
                </div>
                 <div className="flex space-x-1">
                     <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-full">Gemini 2.5</span>
                </div>
            </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-none shadow-md' 
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                        }`}>
                            {msg.isError ? (
                                <span className="text-red-500">{msg.text}</span>
                            ) : (
                                msg.text.split('**').map((part, i) => 
                                    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                                )
                            )}
                        </div>
                    </div>
                ))}
                {isAiProcessing && (
                    <div className="flex justify-start">
                         <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

             {messages.length < 3 && !isAiProcessing && (
                <div className="px-4 py-2 flex flex-wrap gap-2 bg-slate-50">
                    <button 
                        onClick={() => { setInput("Summarize this document"); handleSendMessage(); }}
                        className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors"
                    >
                        Summarize
                    </button>
                    <button 
                         onClick={() => { setInput("What are the key dates?"); handleSendMessage(); }}
                        className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors"
                    >
                        Extract Key Data
                    </button>
                </div>
            )}

            <div className="p-4 bg-white border-t border-slate-200">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask about your PDF..."
                        className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isAiProcessing}
                        className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="mt-2 flex justify-between items-center text-[10px] text-slate-400">
                    <span>Powered by Gemini 2.5 Flash</span>
                    <div className="flex items-center space-x-1">
                        <Mic className="w-3 h-3 cursor-pointer hover:text-blue-500" />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};