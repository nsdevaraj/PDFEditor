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
  EyeOff
} from 'lucide-react';
import { chatWithDocument } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface PDFEditorProps {
  file: UploadedFile;
  onClose: () => void;
}

type ToolType = 'none' | 'eraser' | 'text' | 'signature' | 'highlight' | 'redact';

interface EditorElement {
  id: string;
  type: 'text' | 'signature' | 'highlight' | 'redact';
  x: number;
  y: number;
  content?: string;
  width?: number;
  height?: number;
  page: number;
}

export const PDFEditor: React.FC<PDFEditorProps> = ({ file, onClose }) => {
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  // Editor State
  const [activeTool, setActiveTool] = useState<ToolType>('none');
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastCreatedElementId, setLastCreatedElementId] = useState<string | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isRendering, setIsRendering] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  
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

  // --- Tool & Drag Logic ---

  // Auto-focus new text elements
  useEffect(() => {
    if (lastCreatedElementId) {
      const el = elements.find(e => e.id === lastCreatedElementId);
      if (el && el.type === 'text') {
        const domEl = document.getElementById(`text-input-${el.id}`);
        if (domEl) {
          domEl.focus();
          // Place cursor at end
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(domEl);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
      setLastCreatedElementId(null);
    }
  }, [lastCreatedElementId, elements]);

  const addElement = (type: 'text' | 'signature' | 'highlight' | 'redact', x: number, y: number) => {
      const newElement: EditorElement = {
          id: Date.now().toString(),
          type,
          x,
          y,
          page: currentPage,
          content: type === 'text' ? 'Type here...' : type === 'signature' ? 'Alex. L' : undefined,
          width: (type === 'highlight' || type === 'redact') ? 200 : undefined,
          height: (type === 'highlight' || type === 'redact') ? 30 : undefined,
      };
      
      setElements(prev => [...prev, newElement]);
      setLastCreatedElementId(newElement.id);

      // Optional: Reset tool after one use if desired. For form filling, keeping it active is often better.
      // setActiveTool('none');
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
      if (activeTool === 'none' || activeTool === 'eraser' || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - containerRect.left) / scale;
      const y = (e.clientY - containerRect.top) / scale;

      addElement(activeTool, x, y);
  };

  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent canvas click bubbling
    
    if (activeTool === 'eraser') {
      setElements(elements.filter(el => el.id !== id));
      setActiveTool('none'); // Optional: keep tool active or reset
      return;
    }

    const element = elements.find(el => el.id === id);
    if (!element) return;

    setDraggingId(id);
    
    // Calculate mouse offset relative to the element's top-left
    const elRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - elRect.left,
      y: e.clientY - elRect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate new position relative to container, taking into account zoom scale
    // x = (mouse_x - container_left - offset_x) / scale
    const newX = (e.clientX - containerRect.left - dragOffset.x) / scale;
    const newY = (e.clientY - containerRect.top - dragOffset.y) / scale;

    setElements(prev => prev.map(el => 
      el.id === draggingId ? { ...el, x: newX, y: newY } : el
    ));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
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

  return (
    <div 
      className="flex h-full w-full bg-slate-100 overflow-hidden relative"
      onMouseUp={handleMouseUp} 
      onMouseMove={handleMouseMove}
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white shadow-sm flex items-center justify-between px-4 z-10 border-b border-slate-200 overflow-x-auto overflow-y-hidden">
        <div className="flex items-center space-x-3 min-w-max">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-slate-800 truncate max-w-[150px] md:max-w-[200px]">{file.name}</span>
            </div>
        </div>

        <div className="flex items-center space-x-4 min-w-max px-4">
             {/* Pagination */}
             {numPages > 0 && (
                 <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1 mr-2">
                     <button 
                        onClick={() => changePage(-1)} 
                        disabled={currentPage <= 1}
                        className="p-1 hover:bg-white rounded disabled:opacity-30"
                     >
                         <ChevronLeft className="w-4 h-4" />
                     </button>
                     <span className="text-xs font-medium w-16 text-center text-slate-600">
                        {currentPage} / {numPages}
                     </span>
                     <button 
                        onClick={() => changePage(1)} 
                        disabled={currentPage >= numPages}
                        className="p-1 hover:bg-white rounded disabled:opacity-30"
                     >
                         <ChevronRight className="w-4 h-4" />
                     </button>
                 </div>
             )}

            <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
                <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} className="p-2 hover:bg-white rounded shadow-sm text-slate-600"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-xs font-medium w-12 text-center text-slate-600">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(Math.min(2.5, scale + 0.1))} className="p-2 hover:bg-white rounded shadow-sm text-slate-600"><ZoomIn className="w-4 h-4" /></button>
            </div>
        </div>

        <div className="flex items-center space-x-4 min-w-max px-4">
             <div className="flex items-center space-x-1 border-r border-slate-200 pr-4">
                <button 
                    onClick={() => setActiveTool(activeTool === 'signature' ? 'none' : 'signature')}
                    className={`p-2 rounded-lg transition-colors ${activeTool === 'signature' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    title="Sign Document"
                >
                    <FileSignature className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setActiveTool(activeTool === 'text' ? 'none' : 'text')}
                    className={`p-2 rounded-lg transition-colors ${activeTool === 'text' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    title="Add Text"
                >
                    <Type className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setActiveTool(activeTool === 'highlight' ? 'none' : 'highlight')}
                    className={`p-2 rounded-lg transition-colors ${activeTool === 'highlight' ? 'bg-yellow-100 text-yellow-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    title="Highlight"
                >
                    <Highlighter className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setActiveTool(activeTool === 'redact' ? 'none' : 'redact')}
                    className={`p-2 rounded-lg transition-colors ${activeTool === 'redact' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
                    title="Redact (Permanently hide content)"
                >
                    <EyeOff className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setActiveTool(activeTool === 'eraser' ? 'none' : 'eraser')}
                    className={`p-2 rounded-lg transition-colors ${activeTool === 'eraser' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    title="Eraser (Click item to remove)"
                >
                    <Eraser className="w-5 h-5" />
                </button>
             </div>
             
             <button onClick={() => setRotation((r) => r + 90)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Rotate">
                <RotateCw className="w-5 h-5" />
             </button>
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
      <div className="flex-1 flex mt-16 h-[calc(100%-64px)] relative">
        {/* PDF Viewer Canvas */}
        <div className="flex-1 bg-slate-200 overflow-auto flex justify-center p-8 relative">
            <div 
                ref={containerRef}
                onClick={handleCanvasClick}
                className="bg-white shadow-2xl transition-transform duration-75 ease-out origin-top relative"
                style={{ 
                    minHeight: '400px',
                    minWidth: '300px',
                    cursor: activeTool === 'eraser' || activeTool === 'text' || activeTool === 'highlight' || activeTool === 'redact' || activeTool === 'signature' ? 'crosshair' : 'default'
                }}
            >
                {isRendering && !pdfDoc && (
                     <div className="absolute inset-0 flex items-center justify-center z-50 bg-white/50">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                     </div>
                )}
                
                <canvas ref={canvasRef} className="block relative z-0" />
                
                {/* Annotations Layer */}
                {elements.filter(el => el.page === currentPage).map((el) => (
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
                       {el.type === 'signature' && (
                           <div className="relative">
                               <div className="font-serif italic text-4xl text-blue-900 px-4 py-2 select-none border-2 border-transparent group-hover:border-blue-300 rounded-lg transition-all whitespace-nowrap bg-transparent">
                                   {el.content}
                               </div>
                               {/* Remove button only visible when not erasing (since erasing is clicking the item itself) */}
                               {activeTool !== 'eraser' && (
                                   <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setElements(elements.filter(e => e.id !== el.id)) }}
                                            className="p-1 bg-red-500 text-white rounded-full shadow hover:bg-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                   </div>
                               )}
                           </div>
                       )}

                       {el.type === 'redact' && (
                           <div className="relative group">
                                <div
                                        className="bg-black"
                                        style={{
                                            width: el.width,
                                            height: el.height
                                        }}
                                />
                                {activeTool !== 'eraser' && (
                                   <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setElements(elements.filter(e => e.id !== el.id)) }}
                                            className="p-1 bg-slate-500 text-white rounded-full shadow hover:bg-slate-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                   </div>
                               )}
                           </div>
                       )}

                       {el.type === 'text' && (
                            <div className="group relative">
                                <div 
                                    id={`text-input-${el.id}`}
                                    contentEditable={activeTool !== 'eraser'}
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementContent(el.id, e.currentTarget.innerText)}
                                    className="text-slate-900 text-base px-2 py-1 border border-transparent hover:border-blue-400 hover:bg-blue-50/30 rounded outline-none min-w-[50px] cursor-text"
                                    onMouseDown={(e) => {
                                        // If interacting with text input, stop drag unless clicking border? 
                                        // For simplicity, we allow drag via container, text edit via click
                                        e.stopPropagation(); 
                                    }}
                                    // Custom drag handler for the text container wrapper to allow moving
                                >
                                    {el.content}
                                </div>
                                <div 
                                    className="absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move bg-slate-800 text-white rounded px-1 text-[10px]"
                                    onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                                >
                                    Drag
                                </div>
                            </div>
                       )}

                       {el.type === 'highlight' && (
                           <div className="relative group">
                                <div 
                                        className="bg-yellow-300/40 border border-yellow-400/50 hover:bg-yellow-300/60 transition-colors"
                                        style={{
                                            width: el.width,
                                            height: el.height
                                        }}
                                />
                                {activeTool !== 'eraser' && (
                                   <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setElements(elements.filter(e => e.id !== el.id)) }}
                                            className="p-1 bg-slate-500 text-white rounded-full shadow hover:bg-slate-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                   </div>
                               )}
                           </div>
                       )}
                   </div>
                ))}
            </div>
        </div>

        {/* AI Assistant Sidebar */}
        <div className={`${isChatOpen ? 'w-full md:w-96' : 'w-0'} absolute md:relative right-0 h-full bg-white border-l border-slate-200 transition-all duration-300 flex flex-col z-30`}>
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