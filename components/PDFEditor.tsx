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
  Square,
  ImageIcon,
  ChevronDown,
  Check,
  Hand,
  MousePointer2,
  Pen,
  Underline,
  Strikethrough,
  Waves,
  Circle,
  X as XIcon,
  Minus,
  ArrowUpRight,
  Undo,
  Redo,
  AlignLeft,
  Palette
} from 'lucide-react';
import { chatWithDocument } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface PDFEditorProps {
  file: UploadedFile;
  onClose: () => void;
}

type InteractionMode = 'hand' | 'select' | 'draw';

interface EditorElement {
  id: string;
  type: 'text' | 'signature' | 'image' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'check' | 'cross' | 'draw' | 'highlight' | 'underline' | 'strike' | 'squiggle';
  x: number;
  y: number;
  content?: string;
  width?: number;
  height?: number;
  page: number;
  dataUrl?: string; // For images
  pathData?: { x: number; y: number }[]; // For drawings
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
}

export const PDFEditor: React.FC<PDFEditorProps> = ({ file, onClose }) => {
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  // Editor State
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('select');
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Dragging & Resizing State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeState, setResizeState] = useState<{
      active: boolean;
      handle: string; // 'nw', 'ne', 'sw', 'se'
      startX: number;
      startY: number;
      initialX: number;
      initialY: number;
      initialWidth: number;
      initialHeight: number;
  } | null>(null);
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [drawColor, setDrawColor] = useState('#000000');
  const [drawWidth, setDrawWidth] = useState(2);
  const [drawOpacity, setDrawOpacity] = useState(1);

  // History State
  const [history, setHistory] = useState<EditorElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // UI State
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isRendering, setIsRendering] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
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

  // --- History Management ---
  const saveToHistory = (newElements: EditorElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setElements(newElements);
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

  // --- Tool & Drag Logic ---

  const addElementCentered = (type: EditorElement['type'], extraData?: any) => {
      if (!canvasRef.current) return;
      
      const viewportWidth = canvasRef.current.width / scale;
      const viewportHeight = canvasRef.current.height / scale;
      
      const defaultColor = type === 'highlight' ? '#fde047' : drawColor;
      const defaultOpacity = type === 'highlight' ? 0.4 : 1;

      const newElement: EditorElement = {
          id: Date.now().toString(),
          type,
          x: (viewportWidth / 2) - 50,
          y: (viewportHeight / 2) - 20,
          page: currentPage,
          content: type === 'text' ? 'Type here...' : type === 'signature' ? 'Alex. L' : undefined,
          width: type === 'highlight' ? 200 : type === 'rectangle' || type === 'circle' ? 100 : type === 'line' || type === 'arrow' || type === 'underline' || type === 'strike' || type === 'squiggle' ? 150 : undefined,
          height: type === 'highlight' || type === 'underline' || type === 'strike' || type === 'squiggle' ? 20 : type === 'rectangle' || type === 'circle' ? 100 : type === 'line' || type === 'arrow' ? 2 : undefined,
          strokeColor: defaultColor,
          opacity: defaultOpacity,
          ...extraData
      };
      
      saveToHistory([...elements, newElement]);
      setInteractionMode('select');
      setSelectedId(newElement.id); // Select newly added element
      setActiveMenu(null);
  };

  const startDrawingMode = (color: string, width: number, opacity: number) => {
      setInteractionMode('draw');
      setDrawColor(color);
      setDrawWidth(width);
      setDrawOpacity(opacity);
      setActiveMenu(null);
      setSelectedId(null);
  };

  const updateSelectedColor = (color: string) => {
      setDrawColor(color);
      if (selectedId) {
          const newElements = elements.map(el => el.id === selectedId ? { ...el, strokeColor: color } : el);
          saveToHistory(newElements);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result && canvasRef.current) {
                  const viewportWidth = canvasRef.current.width / scale;
                  const viewportHeight = canvasRef.current.height / scale;
                  
                  const newElement: EditorElement = {
                      id: Date.now().toString(),
                      type: 'image',
                      x: (viewportWidth / 2) - 75,
                      y: (viewportHeight / 2) - 75,
                      page: currentPage,
                      width: 150,
                      height: 150,
                      dataUrl: event.target.result as string
                  };
                  saveToHistory([...elements, newElement]);
                  setSelectedId(newElement.id);
              }
          };
          reader.readAsDataURL(file);
      }
      e.target.value = ''; // Reset input
  };

  // --- Mouse Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicking on empty space, deselect
    if (e.target === containerRef.current || e.target === canvasRef.current) {
         setSelectedId(null);
    }

    if (interactionMode === 'draw' && containerRef.current) {
        setIsDrawing(true);
        const containerRect = containerRef.current.getBoundingClientRect();
        const startX = (e.clientX - containerRect.left) / scale;
        const startY = (e.clientY - containerRect.top) / scale;
        setCurrentPath([{ x: startX, y: startY }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    if (resizeState && resizeState.active) {
        const currentX = (e.clientX - containerRect.left) / scale;
        const currentY = (e.clientY - containerRect.top) / scale;
        
        const deltaX = currentX - (resizeState.startX - containerRect.left) / scale;
        const deltaY = currentY - (resizeState.startY - containerRect.top) / scale;

        let newX = resizeState.initialX;
        let newY = resizeState.initialY;
        let newWidth = resizeState.initialWidth;
        let newHeight = resizeState.initialHeight;

        if (resizeState.handle.includes('e')) newWidth = Math.max(10, resizeState.initialWidth + deltaX);
        if (resizeState.handle.includes('w')) {
             const w = Math.max(10, resizeState.initialWidth - deltaX);
             newX += resizeState.initialWidth - w;
             newWidth = w;
        }
        if (resizeState.handle.includes('s')) newHeight = Math.max(10, resizeState.initialHeight + deltaY);
        if (resizeState.handle.includes('n')) {
             const h = Math.max(10, resizeState.initialHeight - deltaY);
             newY += resizeState.initialHeight - h;
             newHeight = h;
        }

        setElements(prev => prev.map(el => 
            el.id === selectedId ? { ...el, x: newX, y: newY, width: newWidth, height: newHeight } : el
        ));
        return;
    }

    if (isDrawing) {
        const x = (e.clientX - containerRect.left) / scale;
        const y = (e.clientY - containerRect.top) / scale;
        setCurrentPath(prev => [...prev, { x, y }]);
    } else if (draggingId) {
        const newX = (e.clientX - containerRect.left - dragOffset.x) / scale;
        const newY = (e.clientY - containerRect.top - dragOffset.y) / scale;
        setElements(prev => prev.map(el => 
          el.id === draggingId ? { ...el, x: newX, y: newY } : el
        ));
    }
  };

  const handleMouseUp = () => {
    if (resizeState?.active) {
        saveToHistory(elements);
        setResizeState(null);
        return;
    }

    if (isDrawing) {
        setIsDrawing(false);
        if (currentPath.length > 1) {
            const newElement: EditorElement = {
                id: Date.now().toString(),
                type: 'draw',
                x: 0,
                y: 0,
                page: currentPage,
                pathData: currentPath,
                strokeColor: drawColor,
                strokeWidth: drawWidth,
                opacity: drawOpacity
            };
            saveToHistory([...elements, newElement]);
        }
        setCurrentPath([]);
    }
    if (draggingId) {
        saveToHistory(elements);
        setDraggingId(null);
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (interactionMode !== 'select') return;
    
    setSelectedId(id);
    setDraggingId(id);
    
    const elRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - elRect.left,
      y: e.clientY - elRect.top
    });
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
      e.stopPropagation();
      const el = elements.find(e => e.id === selectedId);
      if (!el) return;

      setResizeState({
          active: true,
          handle,
          startX: e.clientX,
          startY: e.clientY,
          initialX: el.x,
          initialY: el.y,
          initialWidth: el.width || 100,
          initialHeight: el.height || 100
      });
  };

  const removeElement = (id: string) => {
      saveToHistory(elements.filter(el => el.id !== id));
      if (selectedId === id) setSelectedId(null);
  };

  const updateElementContent = (id: string, newContent: string) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, content: newContent } : el));
  };

  const handleExport = (format: string) => {
      setShowExportMenu(false);
      const content = `Simulated ${format} export for ${file.name}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace('.pdf', '')}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  return (
    <div 
      className="flex h-screen w-full bg-slate-100 overflow-hidden relative" 
      onClick={() => { setActiveMenu(null); setShowExportMenu(false); }}
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white shadow-sm flex items-center justify-between px-4 z-10 border-b border-slate-200">
        <div className="flex items-center space-x-3">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-800">Edit PDF</span>
            </div>
        </div>

        {/* Center Toolbar */}
        <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm" onClick={(e) => e.stopPropagation()}>
            
            <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button 
                    onClick={() => setInteractionMode('hand')}
                    className={`p-1.5 rounded-md transition-colors ${interactionMode === 'hand' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    title="Pan"
                >
                    <Hand className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setInteractionMode('select')}
                    className={`p-1.5 rounded-md transition-colors ${interactionMode === 'select' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    title="Select"
                >
                    <MousePointer2 className="w-4 h-4" />
                </button>
            </div>

            <div className="w-px h-5 bg-slate-200 mx-1"></div>

            <button className="flex items-center space-x-1 px-3 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium">
                <Type className="w-4 h-4" />
                <span>Edit Text</span>
            </button>

            <div className="w-px h-5 bg-slate-200 mx-1"></div>

             {/* Color Picker */}
             <div className="relative group">
                <button className="p-2 rounded-lg flex items-center space-x-1 text-slate-600 hover:bg-slate-50">
                     <div className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: drawColor }}></div>
                     <ChevronDown className="w-3 h-3" />
                </button>
                <input 
                    type="color" 
                    value={drawColor}
                    onChange={(e) => updateSelectedColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    title="Change Color"
                />
            </div>

            <button 
                onClick={() => addElementCentered('text')}
                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Add Text"
            >
                <Type className="w-5 h-5" />
            </button>

            {/* Pencil Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => setActiveMenu(activeMenu === 'pencil' ? null : 'pencil')}
                    className={`p-2 rounded-lg flex items-center space-x-1 ${activeMenu === 'pencil' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <Pen className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3" />
                </button>
                {activeMenu === 'pencil' && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50">
                        <button onClick={() => startDrawingMode(drawColor, 2, 1)} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <Pen className="w-4 h-4" />
                            <span>Pencil</span>
                        </button>
                        <button onClick={() => startDrawingMode('#fde047', 15, 0.4)} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <Highlighter className="w-4 h-4" />
                            <span>Highlight</span>
                        </button>
                        <button onClick={() => setInteractionMode('select')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <Eraser className="w-4 h-4" />
                            <span>Eraser</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Markup Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => setActiveMenu(activeMenu === 'markup' ? null : 'markup')}
                    className={`p-2 rounded-lg flex items-center space-x-1 ${activeMenu === 'markup' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <div className="flex items-center bg-slate-100 px-1 rounded border border-slate-200">
                        <span className="text-xs font-serif font-bold">A</span>
                        <span className="text-xs font-serif border-l border-slate-300 pl-0.5 ml-0.5">b</span>
                    </div>
                    <ChevronDown className="w-3 h-3" />
                </button>
                {activeMenu === 'markup' && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50">
                        <button onClick={() => addElementCentered('highlight')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <div className="bg-yellow-300 px-1 rounded text-xs font-bold">Ab</div>
                            <span>Highlight</span>
                        </button>
                        <button onClick={() => addElementCentered('underline')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <Underline className="w-4 h-4" />
                            <span>Underline</span>
                        </button>
                        <button onClick={() => addElementCentered('strike')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <Strikethrough className="w-4 h-4" />
                            <span>Strikethrough</span>
                        </button>
                        <button onClick={() => addElementCentered('squiggle')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <Waves className="w-4 h-4" />
                            <span>Squiggle</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Shape Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => setActiveMenu(activeMenu === 'shape' ? null : 'shape')}
                    className={`p-2 rounded-lg flex items-center space-x-1 ${activeMenu === 'shape' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <Square className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3" />
                </button>
                {activeMenu === 'shape' && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50">
                        <button onClick={() => addElementCentered('rectangle')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <Square className="w-4 h-4" />
                            <span>Rectangle</span>
                        </button>
                        <button onClick={() => addElementCentered('circle')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <Circle className="w-4 h-4" />
                            <span>Circle</span>
                        </button>
                        <button onClick={() => addElementCentered('check')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <Check className="w-4 h-4" />
                            <span>Checkmark</span>
                        </button>
                        <button onClick={() => addElementCentered('cross')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <XIcon className="w-4 h-4" />
                            <span>Cross</span>
                        </button>
                        <button onClick={() => addElementCentered('line')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <Minus className="w-4 h-4 -rotate-45" />
                            <span>Line</span>
                        </button>
                        <button onClick={() => addElementCentered('arrow')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <ArrowUpRight className="w-4 h-4" />
                            <span>Arrow</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Signature Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => setActiveMenu(activeMenu === 'sign' ? null : 'sign')}
                    className={`p-2 rounded-lg flex items-center space-x-1 ${activeMenu === 'sign' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <FileSignature className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3" />
                </button>
                {activeMenu === 'sign' && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50">
                        <button onClick={() => addElementCentered('signature')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <FileSignature className="w-4 h-4" />
                            <span>Add Signature</span>
                        </button>
                        <button onClick={() => addElementCentered('signature', { content: 'Initials' })} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <Type className="w-4 h-4" />
                            <span>Add Initials</span>
                        </button>
                    </div>
                )}
            </div>

             <button 
                onClick={() => addElementCentered('text', { content: 'Date: ' + new Date().toLocaleDateString() })}
                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Insert Field"
            >
                <AlignLeft className="w-5 h-5" />
            </button>

            <button 
                onClick={() => imageInputRef.current?.click()}
                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Add Image"
            >
                <ImageIcon className="w-5 h-5" />
                <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={imageInputRef}
                    onChange={handleImageUpload}
                />
            </button>

            <div className="w-px h-5 bg-slate-200 mx-1"></div>

             <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-30">
                <Undo className="w-4 h-4" />
            </button>
            <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-30">
                <Redo className="w-4 h-4" />
            </button>

        </div>

        <div className="flex items-center space-x-4">
             <div className="relative">
                 <button 
                    onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-medium text-sm transition-colors"
                 >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                    <ChevronDown className="w-3 h-3 opacity-80" />
                 </button>
                 
                 {showExportMenu && (
                     <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="px-4 py-2 border-b border-slate-50">
                            <span className="text-xs font-semibold text-slate-400 uppercase">Export As</span>
                        </div>
                        <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <FileText className="w-4 h-4 text-red-500" />
                            <span>PDF Document (.pdf)</span>
                        </button>
                        <button onClick={() => handleExport('docx')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center space-x-2 text-sm text-slate-700">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span>Microsoft Word (.docx)</span>
                        </button>
                     </div>
                 )}
             </div>

             <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-2 rounded-lg transition-colors ${isChatOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'}`}>
                <Bot className="w-5 h-5" />
             </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex mt-16 h-[calc(100vh-64px)]">
        {/* PDF Viewer Canvas */}
        <div className="flex-1 bg-slate-200 overflow-auto flex justify-center p-8 relative"
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
        >
            <div 
                ref={containerRef}
                className="bg-white shadow-2xl transition-transform duration-75 ease-out origin-top relative"
                style={{ 
                    minHeight: '400px',
                    minWidth: '300px',
                    cursor: interactionMode === 'hand' ? 'grab' : interactionMode === 'draw' ? 'crosshair' : 'default',
                    userSelect: 'none'
                }}
            >
                {isRendering && !pdfDoc && (
                     <div className="absolute inset-0 flex items-center justify-center z-50 bg-white/50">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                     </div>
                )}
                
                <canvas ref={canvasRef} className="block relative z-0 pointer-events-none" />
                
                {/* Annotations Layer */}
                {elements.filter(el => el.page === currentPage).map((el) => {
                   const isSelected = selectedId === el.id;
                   
                   return (
                   <div 
                        key={el.id}
                        className={`absolute z-20 group ${interactionMode === 'select' ? 'cursor-move' : ''} ${isSelected ? 'ring-1 ring-blue-500' : ''}`}
                        style={{
                            left: el.x * scale,
                            top: el.y * scale,
                            transform: `scale(${scale})`, 
                            transformOrigin: 'top left',
                            pointerEvents: interactionMode === 'draw' ? 'none' : 'auto'
                        }}
                        onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                   >
                       {/* Resize Handles - Only for specific types when selected */}
                       {isSelected && ['rectangle', 'circle', 'image', 'highlight'].includes(el.type) && (
                           <>
                               <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-blue-600 rounded-full cursor-nw-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
                               <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full cursor-ne-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
                               <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-blue-600 rounded-full cursor-sw-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
                               <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full cursor-se-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'se')} />
                           </>
                       )}

                       {/* Delete Button for Selected Item */}
                       {isSelected && (
                           <div className="absolute -top-8 right-0 transition-opacity z-50">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                                    className="p-1 bg-white text-red-500 border border-slate-200 rounded shadow-sm hover:bg-red-50"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                           </div>
                       )}

                       {/* Render Based on Type */}
                       {el.type === 'text' && (
                            <div 
                                contentEditable={interactionMode === 'select'}
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementContent(el.id, e.currentTarget.innerText)}
                                className="text-base px-2 py-1 border border-transparent hover:border-blue-400/50 rounded outline-none min-w-[50px] cursor-text"
                                style={{ color: el.strokeColor || '#0f172a' }}
                            >
                                {el.content}
                            </div>
                       )}

                       {el.type === 'signature' && (
                           <div 
                                className="font-serif italic text-4xl px-2 py-1 select-none border border-transparent hover:border-blue-300 rounded whitespace-nowrap"
                                style={{ color: el.strokeColor || '#1e3a8a' }}
                           >
                               {el.content}
                           </div>
                       )}

                       {el.type === 'image' && el.dataUrl && (
                           <img 
                               src={el.dataUrl} 
                               alt="Added" 
                               className="pointer-events-none select-none shadow-sm border border-transparent hover:border-blue-400"
                               style={{ width: el.width, height: el.height, objectFit: 'contain' }}
                           />
                       )}

                       {el.type === 'rectangle' && (
                           <div 
                                className="border-2 hover:bg-blue-50/5 transition-colors" 
                                style={{ width: el.width, height: el.height, borderColor: el.strokeColor }} 
                           />
                       )}
                       
                       {el.type === 'circle' && (
                           <div 
                                className="border-2 rounded-full hover:bg-blue-50/5 transition-colors" 
                                style={{ width: el.width, height: el.height, borderColor: el.strokeColor }} 
                           />
                       )}

                       {el.type === 'check' && (
                           <Check className="w-10 h-10" style={{ color: el.strokeColor }} />
                       )}

                       {el.type === 'cross' && (
                           <XIcon className="w-10 h-10" style={{ color: el.strokeColor }} />
                       )}

                       {el.type === 'line' && (
                           <div className="hover:opacity-80" style={{ width: el.width, height: 3, backgroundColor: el.strokeColor }} />
                       )}

                        {el.type === 'arrow' && (
                           <div className="flex items-center">
                               <div className="h-0.5" style={{ width: el.width, backgroundColor: el.strokeColor }} />
                               <div 
                                    className="w-0 h-0 border-t-4 border-t-transparent border-l-[8px] border-b-4 border-b-transparent" 
                                    style={{ borderLeftColor: el.strokeColor }}
                               />
                           </div>
                       )}

                       {el.type === 'highlight' && (
                            <div 
                                className="border border-transparent hover:border-blue-300" 
                                style={{ width: el.width, height: el.height, backgroundColor: el.strokeColor, opacity: el.opacity }} 
                            />
                       )}
                       
                       {el.type === 'underline' && (
                            <div className="border-b-2 w-full" style={{ width: el.width, height: el.height, borderColor: el.strokeColor }}></div>
                       )}

                       {el.type === 'strike' && (
                            <div className="flex items-center w-full" style={{ width: el.width, height: el.height }}>
                                <div className="w-full h-0.5" style={{ backgroundColor: el.strokeColor }}></div>
                            </div>
                       )}
                       
                       {el.type === 'squiggle' && (
                            <div className="w-full border-b-2 border-dotted" style={{ width: el.width, height: el.height, borderColor: el.strokeColor }}></div>
                       )}

                       {el.type === 'draw' && el.pathData && (
                           <svg 
                                className="overflow-visible pointer-events-none"
                                style={{ width: 0, height: 0 }}
                           >
                               <path 
                                   d={`M ${el.pathData.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                                   fill="none"
                                   stroke={el.strokeColor}
                                   strokeWidth={el.strokeWidth}
                                   strokeOpacity={el.opacity}
                                   strokeLinecap="round"
                                   strokeLinejoin="round"
                               />
                           </svg>
                       )}
                   </div>
                )})}
                
                {/* Active Drawing Path */}
                {isDrawing && (
                    <div className="absolute top-0 left-0 pointer-events-none z-30">
                        <svg className="overflow-visible" style={{ width: 0, height: 0 }}>
                            <path 
                                d={`M ${currentPath.map(p => `${p.x * scale} ${p.y * scale}`).join(' L ')}`}
                                fill="none"
                                stroke={drawColor}
                                strokeWidth={drawWidth * scale}
                                strokeOpacity={drawOpacity}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                )}
            </div>
        </div>

        {/* AI Assistant Sidebar */}
        <div className={`${isChatOpen ? 'w-96' : 'w-0'} bg-white border-l border-slate-200 transition-all duration-300 flex flex-col relative z-30`}>
            {/* ... Chat Interface ... */}
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