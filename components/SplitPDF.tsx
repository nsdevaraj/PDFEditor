import React, { useState, useEffect, useRef } from 'react';
import { UploadedFile } from '../types';
import {
  X,
  CheckCircle,
  Download,
  Loader2,
  ArrowRight,
  Split,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface SplitPDFProps {
  file: UploadedFile;
  onClose: () => void;
  title?: string;
  actionLabel?: string;
}

interface PageThumbnail {
  pageIndex: number; // 0-based
  pageNumber: number; // 1-based
  dataUrl: string;
}

export const SplitPDF: React.FC<SplitPDFProps> = ({
  file,
  onClose,
  title = "Split PDF",
  actionLabel = "Split PDF"
}) => {
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rangeInput, setRangeInput] = useState('');

  // Cleanup object URLs on unmount or when thumbnails change
  useEffect(() => {
    return () => {
      thumbnails.forEach(t => {
        if (t.dataUrl.startsWith('blob:')) {
          URL.revokeObjectURL(t.dataUrl);
        }
      });
    };
  }, [thumbnails]);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        const raw = atob(file.content);
        const uint8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          uint8Array[i] = raw.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;

        const newThumbnails: PageThumbnail[] = [];

        // Create canvas once to reuse
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) throw new Error("Canvas context not available");

        // Render thumbnails for each page
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 }); // Small scale for thumbnails

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          // Optimize: Use toBlob instead of toDataURL to avoid blocking main thread
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));

          if (blob) {
            const url = URL.createObjectURL(blob);
            newThumbnails.push({
              pageIndex: i - 1,
              pageNumber: i,
              dataUrl: url
            });
          }
        }

        setThumbnails(newThumbnails);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading PDF:", error);
        setIsLoading(false);
      }
    };

    if (file.content) {
      loadPdf();
    }
  }, [file]);

  const togglePageSelection = (pageNumber: number) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageNumber)) {
      newSelected.delete(pageNumber);
    } else {
      newSelected.add(pageNumber);
    }
    setSelectedPages(newSelected);
  };

  const handleSelectAll = () => {
    const allPages = new Set(thumbnails.map(t => t.pageNumber));
    setSelectedPages(allPages);
  };

  const handleDeselectAll = () => {
    setSelectedPages(new Set());
  };

  const handleApplyRange = () => {
    if (!rangeInput.trim()) return;

    const newSelected = new Set<number>();
    const parts = rangeInput.split(',');

    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
             if (i >= 1 && i <= thumbnails.length) {
               newSelected.add(i);
             }
          }
        }
      } else {
        const page = Number(trimmed);
        if (!isNaN(page) && page >= 1 && page <= thumbnails.length) {
          newSelected.add(page);
        }
      }
    });

    if (newSelected.size > 0) {
      setSelectedPages(newSelected);
    }
  };

  const handleSplit = async () => {
    if (selectedPages.size === 0) return;

    try {
      setIsProcessing(true);

      const raw = atob(file.content);
      const uint8Array = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        uint8Array[i] = raw.charCodeAt(i);
      }

      // Load source document
      const srcDoc = await PDFDocument.load(uint8Array);

      // Create new document
      const subDoc = await PDFDocument.create();

      // Copy pages (page indices are 0-based)
      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
      const indicesToCopy = sortedPages.map(p => p - 1);

      const copiedPages = await subDoc.copyPages(srcDoc, indicesToCopy);

      copiedPages.forEach(page => {
        subDoc.addPage(page);
      });

      const pdfBytes = await subDoc.save();

      // Create blob and download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const suffix = title.toLowerCase().includes('extract') ? '_extracted.pdf' : '_split.pdf';
      const newFileName = file.name.replace('.pdf', suffix);
      saveAs(blob, newFileName);

      setIsProcessing(false);
      onClose(); // Optional: close or let user split again

    } catch (error) {
      console.error("Error splitting PDF:", error);
      setIsProcessing(false);
      alert("Failed to process PDF. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
       <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
             <div className="p-2 bg-cyan-100 rounded-lg">
                <Split className="w-6 h-6 text-cyan-600" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-900">{title}</h2>
               <p className="text-sm text-slate-500">{file.name}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
             <X className="w-6 h-6" />
          </button>
       </div>

       <div className="flex-1 overflow-hidden flex">
          {/* Main Content - Grid */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
             {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                   <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600" />
                   <p>Loading document pages...</p>
                </div>
             ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                   {thumbnails.map((page) => (
                     <div
                       key={page.pageNumber}
                       onClick={() => togglePageSelection(page.pageNumber)}
                       className={`relative group cursor-pointer transition-transform hover:-translate-y-1 ${
                         selectedPages.has(page.pageNumber) ? 'ring-2 ring-blue-500 rounded-lg' : ''
                       }`}
                     >
                       <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                         <img src={page.dataUrl} alt={`Page ${page.pageNumber}`} className="w-full h-auto" />
                         <div className="p-2 text-center text-xs font-medium text-slate-500 bg-slate-50 border-t border-slate-100">
                           Page {page.pageNumber}
                         </div>
                       </div>

                       {/* Selection Overlay */}
                       <div className={`absolute inset-0 bg-blue-500/10 rounded-lg transition-opacity flex items-center justify-center ${
                         selectedPages.has(page.pageNumber) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                       }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                             selectedPages.has(page.pageNumber) ? 'bg-blue-600 text-white' : 'bg-white/80 text-slate-400'
                          }`}>
                             <CheckCircle className="w-5 h-5" />
                          </div>
                       </div>
                     </div>
                   ))}
                </div>
             )}
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col shadow-xl z-10">
             <h3 className="font-bold text-slate-900 mb-6">Split Options</h3>

             <div className="space-y-6 flex-1">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Page Range</label>
                   <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="e.g. 1-5, 8, 11-13"
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyRange()}
                      />
                      <button
                        onClick={handleApplyRange}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-sm font-medium transition-colors"
                      >
                        Apply
                      </button>
                   </div>
                   <p className="text-xs text-slate-400 mt-2">
                      Enter page numbers or ranges to select them automatically.
                   </p>
                </div>

                <div className="space-y-2">
                   <button
                     onClick={handleSelectAll}
                     className="w-full py-2 px-4 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center space-x-2 transition-colors"
                   >
                      <CheckSquare className="w-4 h-4" />
                      <span>Select All Pages</span>
                   </button>
                   <button
                     onClick={handleDeselectAll}
                     className="w-full py-2 px-4 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center space-x-2 transition-colors"
                   >
                      <Square className="w-4 h-4" />
                      <span>Deselect All</span>
                   </button>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-blue-900">Selected Pages</span>
                      <span className="text-lg font-bold text-blue-600">{selectedPages.size}</span>
                   </div>
                   <p className="text-xs text-blue-600/70">
                      {selectedPages.size === 0 ? "Select pages to split" : "Ready to extract"}
                   </p>
                </div>
             </div>

             <button
                onClick={handleSplit}
                disabled={selectedPages.size === 0 || isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center space-x-2 transition-all"
             >
                {isProcessing ? (
                   <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                   <>
                     <span>{actionLabel}</span>
                     <ArrowRight className="w-5 h-5" />
                   </>
                )}
             </button>
          </div>
       </div>
    </div>
  );
};
