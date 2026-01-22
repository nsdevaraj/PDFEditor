import React, { useState, useEffect, useRef } from 'react';
import { UploadedFile } from '../types';
import {
  X,
  Layers,
  Upload,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface ComparePDFProps {
  file: UploadedFile;
  onClose: () => void;
}

export const ComparePDF: React.FC<ComparePDFProps> = ({ file, onClose }) => {
  const [secondFile, setSecondFile] = useState<UploadedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View State
  const [scale, setScale] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [opacity, setOpacity] = useState(0.5); // 0 to 1

  // PDF State
  const [pdf1, setPdf1] = useState<any>(null);
  const [pdf2, setPdf2] = useState<any>(null);
  const [numPages1, setNumPages1] = useState(0);
  const [numPages2, setNumPages2] = useState(0);

  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const renderTask1Ref = useRef<any>(null);
  const renderTask2Ref = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load first PDF on mount
  useEffect(() => {
    const loadFirstPdf = async () => {
      try {
        setIsLoading(true);
        const raw = atob(file.content);
        const uint8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          uint8Array[i] = raw.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;
        setPdf1(pdf);
        setNumPages1(pdf.numPages);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading first PDF:", err);
        setError("Failed to load the first PDF file.");
        setIsLoading(false);
      }
    };

    if (file.content) {
      loadFirstPdf();
    }
  }, [file]);

  // Load second PDF when file is selected
  useEffect(() => {
    const loadSecondPdf = async () => {
      if (!secondFile) return;

      try {
        setIsLoading(true);
        const raw = atob(secondFile.content);
        const uint8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          uint8Array[i] = raw.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;
        setPdf2(pdf);
        setNumPages2(pdf.numPages);
        setIsLoading(false);
        // Reset to page 1 when new file loaded
        setCurrentPage(1);
      } catch (err) {
        console.error("Error loading second PDF:", err);
        setError("Failed to load the second PDF file.");
        setIsLoading(false);
      }
    };

    if (secondFile) {
      loadSecondPdf();
    }
  }, [secondFile]);

  // Render pages
  useEffect(() => {
    const renderPages = async () => {
      if (!pdf1 || !canvas1Ref.current) return;

      try {
        // Cancel previous renders
        if (renderTask1Ref.current) await renderTask1Ref.current.cancel();
        if (renderTask2Ref.current) await renderTask2Ref.current.cancel();

        // Render Page 1 (Bottom Layer)
        if (currentPage <= numPages1) {
            const page1 = await pdf1.getPage(currentPage);
            const viewport1 = page1.getViewport({ scale: scale });
            const canvas1 = canvas1Ref.current;
            const context1 = canvas1.getContext('2d');

            if (context1) {
                canvas1.height = viewport1.height;
                canvas1.width = viewport1.width;

                const renderContext1 = {
                  canvasContext: context1,
                  viewport: viewport1,
                };

                renderTask1Ref.current = page1.render(renderContext1);
                await renderTask1Ref.current.promise;
            }
        } else {
             // Clear canvas if page out of range
             const canvas1 = canvas1Ref.current;
             const context1 = canvas1.getContext('2d');
             if (context1) context1.clearRect(0, 0, canvas1.width, canvas1.height);
        }

        // Render Page 2 (Top Layer)
        if (pdf2 && canvas2Ref.current) {
            if (currentPage <= numPages2) {
                const page2 = await pdf2.getPage(currentPage);
                const viewport2 = page2.getViewport({ scale: scale });
                const canvas2 = canvas2Ref.current;
                const context2 = canvas2.getContext('2d');

                if (context2) {
                    canvas2.height = viewport2.height;
                    canvas2.width = viewport2.width;

                    const renderContext2 = {
                      canvasContext: context2,
                      viewport: viewport2,
                    };

                    renderTask2Ref.current = page2.render(renderContext2);
                    await renderTask2Ref.current.promise;
                }
            } else {
                 // Clear canvas if page out of range
                 const canvas2 = canvas2Ref.current;
                 const context2 = canvas2.getContext('2d');
                 if (context2) context2.clearRect(0, 0, canvas2.width, canvas2.height);
            }
        }

      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
          console.error("Render error:", error);
        }
      }
    };

    renderPages();
  }, [pdf1, pdf2, currentPage, scale]);

  const handleSecondFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const fullBase64 = event.target.result as string;
          const content = fullBase64.split(',')[1];
          setSecondFile({
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: fullBase64,
            content: content,
            lastModified: file.lastModified,
            fileUrl: URL.createObjectURL(file)
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const changePage = (offset: number) => {
      const maxPages = Math.max(numPages1, numPages2);
      const newPage = currentPage + offset;
      if (newPage >= 1 && newPage <= maxPages) {
          setCurrentPage(newPage);
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
       {/* Header */}
       <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
             <div className="p-2 bg-indigo-100 rounded-lg">
                <Layers className="w-6 h-6 text-indigo-600" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-900">Compare PDF</h2>
               <div className="flex items-center space-x-2 text-sm text-slate-500">
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span>vs</span>
                  <span className="truncate max-w-[200px] font-medium text-slate-700">
                      {secondFile ? secondFile.name : '...'}
                  </span>
               </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
             <X className="w-6 h-6" />
          </button>
       </div>

       {/* Main Content */}
       <div className="flex-1 flex overflow-hidden">
          {/* Controls Sidebar */}
          <div className="w-80 bg-white border-r border-slate-200 p-6 flex flex-col z-10 shadow-lg">
              <h3 className="font-bold text-slate-900 mb-6">Comparison Settings</h3>

              {!secondFile ? (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                       onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-10 h-10 text-slate-400 mb-4" />
                      <p className="font-semibold text-slate-700 mb-1">Upload Second PDF</p>
                      <p className="text-sm text-slate-500">Click to select file to compare</p>
                      <input
                          type="file"
                          accept=".pdf"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleSecondFileUpload}
                      />
                  </div>
              ) : (
                  <div className="space-y-8">
                      <div>
                          <label className="flex justify-between text-sm font-medium text-slate-700 mb-3">
                              <span>Overlay Transparency</span>
                              <span className="text-blue-600">{Math.round(opacity * 100)}%</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={opacity}
                            onChange={(e) => setOpacity(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                          <div className="flex justify-between text-xs text-slate-400 mt-2">
                              <span>Base File</span>
                              <span>Overlay File</span>
                          </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">File 1 (Base):</span>
                              <span className="font-medium text-slate-900 truncate max-w-[120px]" title={file.name}>{file.name}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">File 2 (Overlay):</span>
                              <span className="font-medium text-slate-900 truncate max-w-[120px]" title={secondFile.name}>{secondFile.name}</span>
                          </div>
                      </div>

                      <button
                        onClick={() => { setSecondFile(null); setPdf2(null); }}
                        className="w-full py-2 px-4 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                      >
                          Change Second File
                      </button>
                  </div>
              )}
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-slate-100 overflow-auto flex flex-col items-center relative">
             {/* Toolbar */}
             <div className="sticky top-4 z-30 bg-white shadow-md rounded-lg p-2 flex items-center space-x-2 mb-4">
                 <button
                    onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                    className="p-2 hover:bg-slate-100 rounded text-slate-600"
                    disabled={!secondFile}
                >
                    <ZoomOut className="w-5 h-5" />
                 </button>
                 <span className="text-sm font-medium w-12 text-center text-slate-600">{Math.round(scale * 100)}%</span>
                 <button
                    onClick={() => setScale(Math.min(2.5, scale + 0.1))}
                    className="p-2 hover:bg-slate-100 rounded text-slate-600"
                    disabled={!secondFile}
                 >
                    <ZoomIn className="w-5 h-5" />
                 </button>
                 <div className="w-px h-6 bg-slate-200 mx-2"></div>
                 <button
                    onClick={() => changePage(-1)}
                    disabled={currentPage <= 1 || !secondFile}
                    className="p-2 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-50"
                 >
                    <ChevronLeft className="w-5 h-5" />
                 </button>
                 <span className="text-sm font-medium text-slate-600 min-w-[80px] text-center">
                    Page {currentPage} / {Math.max(numPages1, numPages2) || '-'}
                 </span>
                 <button
                    onClick={() => changePage(1)}
                    disabled={currentPage >= Math.max(numPages1, numPages2) || !secondFile}
                    className="p-2 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-50"
                 >
                    <ChevronRight className="w-5 h-5" />
                 </button>
             </div>

             {/* Canvas Container */}
             <div className="relative p-8 min-h-[500px] flex items-start justify-center">
                 {isLoading && (
                     <div className="absolute inset-0 flex items-center justify-center z-50 bg-slate-100/80">
                         <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                     </div>
                 )}

                 {error && (
                     <div className="flex flex-col items-center text-red-500 mt-20">
                         <AlertCircle className="w-12 h-12 mb-2" />
                         <p>{error}</p>
                     </div>
                 )}

                 {/* Rendering Area */}
                 <div className="relative shadow-2xl bg-white" style={{ minWidth: '100px', minHeight: '100px' }}>
                     {/* Base Layer */}
                     <canvas
                        ref={canvas1Ref}
                        className="block"
                     />

                     {/* Overlay Layer */}
                     {secondFile && (
                         <canvas
                            ref={canvas2Ref}
                            className="absolute top-0 left-0"
                            style={{ opacity: opacity }}
                         />
                     )}
                 </div>
             </div>
          </div>
       </div>
    </div>
  );
};
