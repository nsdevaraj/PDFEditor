import React, { useState, useEffect } from 'react';
import { UploadedFile } from '../types';
import {
  X,
  Loader2,
  Hash,
  Save,
  ArrowDown,
  ArrowUp,
  Layout
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface PageNumbersPDFProps {
  file: UploadedFile;
  onClose: () => void;
}

type Position = 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right';

export const PageNumbersPDF: React.FC<PageNumbersPDFProps> = ({ file, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [position, setPosition] = useState<Position>('bottom-center');
  const [startNumber, setStartNumber] = useState(1);
  const [format, setFormat] = useState<'simple' | 'page' | 'of' | 'page-of'>('simple');
  const [totalPages, setTotalPages] = useState(0);

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
        setTotalPages(pdf.numPages);

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.8 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          setPreviewUrl(canvas.toDataURL());
        }
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

  const getPreviewText = () => {
    switch (format) {
        case 'simple': return `${startNumber}`;
        case 'page': return `Page ${startNumber}`;
        case 'of': return `${startNumber} of ${totalPages}`;
        case 'page-of': return `Page ${startNumber} of ${totalPages}`;
        default: return `${startNumber}`;
    }
  };

  const getPositionStyle = () => {
      const base = "absolute bg-white/80 border border-blue-200 text-blue-800 px-3 py-1 rounded shadow-sm text-sm font-medium";
      switch (position) {
          case 'top-left': return `${base} top-4 left-4`;
          case 'top-center': return `${base} top-4 left-1/2 -translate-x-1/2`;
          case 'top-right': return `${base} top-4 right-4`;
          case 'bottom-left': return `${base} bottom-4 left-4`;
          case 'bottom-center': return `${base} bottom-4 left-1/2 -translate-x-1/2`;
          case 'bottom-right': return `${base} bottom-4 right-4`;
          default: return `${base} bottom-4 left-1/2 -translate-x-1/2`;
      }
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
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const count = pages.length;

      for (let i = 0; i < count; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const num = startNumber + i;
        let text = '';

        switch (format) {
            case 'simple': text = `${num}`; break;
            case 'page': text = `Page ${num}`; break;
            case 'of': text = `${num} of ${count}`; break;
            case 'page-of': text = `Page ${num} of ${count}`; break;
        }

        const textSize = 12;
        const textWidth = helveticaFont.widthOfTextAtSize(text, textSize);

        let x = 0;
        let y = 0;
        const margin = 30;

        if (position.includes('left')) x = margin;
        else if (position.includes('center')) x = (width / 2) - (textWidth / 2);
        else if (position.includes('right')) x = width - textWidth - margin;

        if (position.includes('top')) y = height - margin;
        else if (position.includes('bottom')) y = margin;

        page.drawText(text, {
          x,
          y,
          size: textSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const newFileName = file.name.replace('.pdf', '_numbered.pdf');
      saveAs(blob, newFileName);

      setIsProcessing(false);
      onClose();
    } catch (error) {
      console.error("Error adding page numbers:", error);
      setIsProcessing(false);
      alert("Failed to add page numbers.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
       <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
             <div className="p-2 bg-green-100 rounded-lg">
                <Hash className="w-6 h-6 text-green-600" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-900">Add Page Numbers</h2>
               <p className="text-sm text-slate-500">{file.name}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
             <X className="w-6 h-6" />
          </button>
       </div>

       <div className="flex-1 overflow-hidden flex">
          {/* Preview Area */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex items-center justify-center">
             {isLoading ? (
                <div className="flex flex-col items-center justify-center text-slate-400">
                   <Loader2 className="w-12 h-12 animate-spin mb-4 text-green-600" />
                   <p>Generating preview...</p>
                </div>
             ) : (
                <div className="relative shadow-xl border border-slate-200 bg-white max-h-full max-w-full">
                   {previewUrl && <img src={previewUrl} alt="Preview" className="max-h-[80vh] w-auto" />}
                   {/* Overlay Preview */}
                   <div className={getPositionStyle()}>
                       {getPreviewText()}
                   </div>
                </div>
             )}
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col shadow-xl z-10">
             <h3 className="font-bold text-slate-900 mb-6">Settings</h3>

             <div className="space-y-6 flex-1">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'].map((pos) => (
                            <button
                                key={pos}
                                onClick={() => setPosition(pos as Position)}
                                className={`p-2 border rounded-lg flex items-center justify-center hover:bg-slate-50 ${position === pos ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500'}`}
                                title={pos.replace('-', ' ')}
                            >
                                <div className={`w-3 h-3 bg-current rounded-sm ${pos.includes('top') ? 'mb-2' : 'mt-2'} ${pos.includes('left') ? 'mr-auto' : pos.includes('right') ? 'ml-auto' : 'mx-auto'}`}></div>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Format</label>
                    <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value as any)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    >
                        <option value="simple">1</option>
                        <option value="page">Page 1</option>
                        <option value="of">1 of {totalPages}</option>
                        <option value="page-of">Page 1 of {totalPages}</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Number</label>
                    <input
                        type="number"
                        min="1"
                        value={startNumber}
                        onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    />
                </div>
             </div>

             <button
                onClick={handleSave}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-green-200 flex items-center justify-center space-x-2 transition-all"
             >
                {isProcessing ? (
                   <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                   <>
                     <Save className="w-5 h-5" />
                     <span>Apply Page Numbers</span>
                   </>
                )}
             </button>
          </div>
       </div>
    </div>
  );
};
