import React, { useState, useEffect } from 'react';
import { UploadedFile } from '../types';
import {
  X,
  CheckCircle,
  Loader2,
  ArrowRight,
  RotateCw,
  RotateCcw,
  Save
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, degrees } from 'pdf-lib';
import { saveAs } from 'file-saver';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface RotatePDFProps {
  file: UploadedFile;
  onClose: () => void;
}

interface PageThumbnail {
  pageIndex: number;
  pageNumber: number;
  dataUrl: string;
  rotation: number; // 0, 90, 180, 270
}

export const RotatePDF: React.FC<RotatePDFProps> = ({ file, onClose }) => {
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
              pageIndex: i - 1,
              pageNumber: i,
              dataUrl: canvas.toDataURL(),
              rotation: 0
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

  const rotatePage = (index: number, direction: 'cw' | 'ccw') => {
    setThumbnails(prev => prev.map((t, i) => {
      if (i === index) {
        let newRotation = t.rotation + (direction === 'cw' ? 90 : -90);
        if (newRotation >= 360) newRotation = 0;
        if (newRotation < 0) newRotation = 270;
        return { ...t, rotation: newRotation };
      }
      return t;
    }));
  };

  const rotateAll = (direction: 'cw' | 'ccw') => {
    setThumbnails(prev => prev.map(t => {
      let newRotation = t.rotation + (direction === 'cw' ? 90 : -90);
      if (newRotation >= 360) newRotation = 0;
      if (newRotation < 0) newRotation = 270;
      return { ...t, rotation: newRotation };
    }));
  };

  const handleSave = async () => {
    try {
      setIsProcessing(true);

      const raw = atob(file.content);
      const uint8Array = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        uint8Array[i] = raw.charCodeAt(i);
      }

      const pdfDoc = await PDFDocument.load(uint8Array);
      const pages = pdfDoc.getPages();

      thumbnails.forEach((t, i) => {
        if (t.rotation !== 0) {
          const page = pages[i];
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees(currentRotation + t.rotation));
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const newFileName = file.name.replace('.pdf', '_rotated.pdf');
      saveAs(blob, newFileName);

      setIsProcessing(false);
      onClose();
    } catch (error) {
      console.error("Error rotating PDF:", error);
      setIsProcessing(false);
      alert("Failed to rotate PDF.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
       <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
             <div className="p-2 bg-blue-100 rounded-lg">
                <RotateCw className="w-6 h-6 text-blue-600" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-900">Rotate PDF</h2>
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
                     <div key={page.pageNumber} className="relative group">
                       <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden p-2">
                         <div className="relative aspect-[3/4] flex items-center justify-center bg-slate-50 overflow-hidden">
                            <img
                                src={page.dataUrl}
                                alt={`Page ${page.pageNumber}`}
                                className="w-full h-full object-contain transition-transform duration-300"
                                style={{ transform: `rotate(${page.rotation}deg)` }}
                            />
                         </div>
                         <div className="mt-2 flex justify-between items-center border-t border-slate-100 pt-2">
                           <span className="text-xs font-medium text-slate-500">Page {page.pageNumber}</span>
                           <div className="flex space-x-1">
                             <button onClick={() => rotatePage(idx, 'ccw')} className="p-1 hover:bg-slate-100 rounded text-slate-600" title="Rotate Left">
                               <RotateCcw className="w-4 h-4" />
                             </button>
                             <button onClick={() => rotatePage(idx, 'cw')} className="p-1 hover:bg-slate-100 rounded text-slate-600" title="Rotate Right">
                               <RotateCw className="w-4 h-4" />
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
             <h3 className="font-bold text-slate-900 mb-6">Rotation Options</h3>

             <div className="space-y-4 flex-1">
                <button onClick={() => rotateAll('cw')} className="w-full py-3 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center justify-center space-x-2 transition-colors">
                    <RotateCw className="w-5 h-5 text-slate-600" />
                    <span>Rotate All Right</span>
                </button>
                <button onClick={() => rotateAll('ccw')} className="w-full py-3 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center justify-center space-x-2 transition-colors">
                    <RotateCcw className="w-5 h-5 text-slate-600" />
                    <span>Rotate All Left</span>
                </button>
             </div>

             <button
                onClick={handleSave}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center space-x-2 transition-all"
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
