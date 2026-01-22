import React, { useState, useEffect } from 'react';
import { UploadedFile } from '../types';
import {
  X,
  Loader2,
  ArrowLeftRight,
  Save,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface OrganizePDFProps {
  file: UploadedFile;
  onClose: () => void;
}

interface PageThumbnail {
  id: string; // Unique ID to track pages when reordered
  originalIndex: number; // 0-based index from original PDF
  pageNumber: number; // Display number (original)
  dataUrl: string;
}

export const OrganizePDF: React.FC<OrganizePDFProps> = ({ file, onClose }) => {
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

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

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;

            newThumbnails.push({
              id: `page-${i}`,
              originalIndex: i - 1,
              pageNumber: i,
              dataUrl: canvas.toDataURL()
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

  const movePage = (index: number, direction: 'left' | 'right') => {
    if (direction === 'left' && index > 0) {
      const newThumbnails = [...thumbnails];
      [newThumbnails[index - 1], newThumbnails[index]] = [newThumbnails[index], newThumbnails[index - 1]];
      setThumbnails(newThumbnails);
    } else if (direction === 'right' && index < thumbnails.length - 1) {
      const newThumbnails = [...thumbnails];
      [newThumbnails[index], newThumbnails[index + 1]] = [newThumbnails[index + 1], newThumbnails[index]];
      setThumbnails(newThumbnails);
    }
  };

  const removePage = (index: number) => {
    const newThumbnails = thumbnails.filter((_, i) => i !== index);
    setThumbnails(newThumbnails);
  };

  const handleSave = async () => {
    try {
      setIsProcessing(true);

      const raw = atob(file.content);
      const uint8Array = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        uint8Array[i] = raw.charCodeAt(i);
      }

      const srcDoc = await PDFDocument.load(uint8Array);
      const newDoc = await PDFDocument.create();

      const indicesToCopy = thumbnails.map(t => t.originalIndex);
      const copiedPages = await newDoc.copyPages(srcDoc, indicesToCopy);

      copiedPages.forEach(page => {
        newDoc.addPage(page);
      });

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const newFileName = file.name.replace('.pdf', '_organized.pdf');
      saveAs(blob, newFileName);

      setIsProcessing(false);
      onClose();
    } catch (error) {
      console.error("Error organizing PDF:", error);
      setIsProcessing(false);
      alert("Failed to organize PDF.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
       <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
             <div className="p-2 bg-purple-100 rounded-lg">
                <ArrowLeftRight className="w-6 h-6 text-purple-600" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-900">Organize PDF</h2>
               <p className="text-sm text-slate-500">{file.name}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
             <X className="w-6 h-6" />
          </button>
       </div>

       <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
             {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                   <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600" />
                   <p>Loading document pages...</p>
                </div>
             ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                   {thumbnails.map((page, idx) => (
                     <div key={page.id} className="relative group">
                       <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden p-2 transition-transform hover:-translate-y-1">
                         <div className="relative aspect-[3/4] flex items-center justify-center bg-slate-50 overflow-hidden">
                            <img
                                src={page.dataUrl}
                                alt={`Page ${page.pageNumber}`}
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute top-1 right-1">
                                <span className="bg-slate-800 text-white text-xs px-2 py-0.5 rounded-full">{idx + 1}</span>
                            </div>
                         </div>
                         <div className="mt-2 flex justify-between items-center border-t border-slate-100 pt-2">
                           <button onClick={() => removePage(idx)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded" title="Remove Page">
                              <Trash2 className="w-4 h-4" />
                           </button>
                           <div className="flex space-x-1">
                             <button
                                onClick={() => movePage(idx, 'left')}
                                disabled={idx === 0}
                                className="p-1 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move Left"
                             >
                               <ChevronLeft className="w-4 h-4" />
                             </button>
                             <button
                                onClick={() => movePage(idx, 'right')}
                                disabled={idx === thumbnails.length - 1}
                                className="p-1 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move Right"
                             >
                               <ChevronRight className="w-4 h-4" />
                             </button>
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                </div>
             )}
          </div>

          <div className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col shadow-xl z-10">
             <h3 className="font-bold text-slate-900 mb-6">Summary</h3>

             <div className="flex-1">
                <p className="text-slate-600 mb-4">
                    Pages: <span className="font-bold text-slate-900">{thumbnails.length}</span>
                </p>
                <p className="text-sm text-slate-500">
                    Reorder pages by using the arrow buttons or remove pages using the trash icon.
                </p>
             </div>

             <button
                onClick={handleSave}
                disabled={isProcessing || thumbnails.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-purple-200 flex items-center justify-center space-x-2 transition-all"
             >
                {isProcessing ? (
                   <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                   <>
                     <Save className="w-5 h-5" />
                     <span>Save PDF</span>
                   </>
                )}
             </button>
          </div>
       </div>
    </div>
  );
};
