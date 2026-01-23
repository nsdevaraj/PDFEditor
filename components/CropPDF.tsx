import React, { useState, useEffect, useRef } from 'react';
import { UploadedFile } from '../types';
import {
  X,
  Loader2,
  Crop,
  Save,
  ArrowRight
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface CropPDFProps {
  file: UploadedFile;
  onClose: () => void;
}

export const CropPDF: React.FC<CropPDFProps> = ({ file, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);

  // Margins in percentage (0-50%)
  const [marginTop, setMarginTop] = useState(0);
  const [marginBottom, setMarginBottom] = useState(0);
  const [marginLeft, setMarginLeft] = useState(0);
  const [marginRight, setMarginRight] = useState(0);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.8 });

        // Keep track of original dimensions for ratio if needed,
        // but for percentage based crop, just visual is enough.
        setPageWidth(viewport.width);
        setPageHeight(viewport.height);

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          // Optimize: Use toBlob instead of toDataURL to avoid blocking main thread
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
          if (blob) {
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
          }
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

      pages.forEach(page => {
         const { width, height } = page.getSize();

         // Calculate crop box
         const x = (marginLeft / 100) * width;
         const y = (marginBottom / 100) * height; // PDF coordinates start from bottom-left usually, but setCropBox takes x,y,width,height
         const w = width - ((marginLeft + marginRight) / 100) * width;
         const h = height - ((marginTop + marginBottom) / 100) * height;

         page.setCropBox(x, y, w, h);
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const newFileName = file.name.replace('.pdf', '_cropped.pdf');
      saveAs(blob, newFileName);

      setIsProcessing(false);
      onClose();
    } catch (error) {
      console.error("Error cropping PDF:", error);
      setIsProcessing(false);
      alert("Failed to crop PDF.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
       <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
             <div className="p-2 bg-orange-100 rounded-lg">
                <Crop className="w-6 h-6 text-orange-600" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-900">Crop PDF</h2>
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
                   <Loader2 className="w-12 h-12 animate-spin mb-4 text-orange-600" />
                   <p>Generating preview...</p>
                </div>
             ) : (
                <div className="relative shadow-xl bg-white inline-block">
                   {previewUrl && <img src={previewUrl} alt="Preview" className="max-h-[80vh] w-auto block" />}

                   {/* Crop Overlay */}
                   <div
                      className="absolute inset-0 border-2 border-orange-500 bg-orange-500/20 pointer-events-none"
                      style={{
                          top: `${marginTop}%`,
                          bottom: `${marginBottom}%`,
                          left: `${marginLeft}%`,
                          right: `${marginRight}%`
                      }}
                   >
                       {/* Dimensions indicator (optional) */}
                       <div className="absolute top-0 left-0 bg-orange-600 text-white text-xs px-1 rounded-br">
                           New Size
                       </div>
                   </div>

                   {/* Darkened areas outside crop */}
                   <div className="absolute top-0 left-0 right-0 bg-black/50" style={{ height: `${marginTop}%` }}></div>
                   <div className="absolute bottom-0 left-0 right-0 bg-black/50" style={{ height: `${marginBottom}%` }}></div>
                   <div className="absolute top-0 left-0 bottom-0 bg-black/50" style={{ width: `${marginLeft}%`, top: `${marginTop}%`, bottom: `${marginBottom}%` }}></div>
                   <div className="absolute top-0 right-0 bottom-0 bg-black/50" style={{ width: `${marginRight}%`, top: `${marginTop}%`, bottom: `${marginBottom}%` }}></div>
                </div>
             )}
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col shadow-xl z-10">
             <h3 className="font-bold text-slate-900 mb-6">Crop Margins</h3>

             <div className="space-y-6 flex-1">
                <p className="text-sm text-slate-500 mb-4">Adjust margins to crop all pages.</p>

                <div>
                   <div className="flex justify-between mb-1">
                      <label className="text-sm font-medium text-slate-700">Top</label>
                      <span className="text-xs text-slate-500">{marginTop}%</span>
                   </div>
                   <input
                      type="range" min="0" max="40" value={marginTop}
                      onChange={(e) => setMarginTop(Number(e.target.value))}
                      className="w-full accent-orange-600"
                   />
                </div>

                <div>
                   <div className="flex justify-between mb-1">
                      <label className="text-sm font-medium text-slate-700">Bottom</label>
                      <span className="text-xs text-slate-500">{marginBottom}%</span>
                   </div>
                   <input
                      type="range" min="0" max="40" value={marginBottom}
                      onChange={(e) => setMarginBottom(Number(e.target.value))}
                      className="w-full accent-orange-600"
                   />
                </div>

                <div>
                   <div className="flex justify-between mb-1">
                      <label className="text-sm font-medium text-slate-700">Left</label>
                      <span className="text-xs text-slate-500">{marginLeft}%</span>
                   </div>
                   <input
                      type="range" min="0" max="40" value={marginLeft}
                      onChange={(e) => setMarginLeft(Number(e.target.value))}
                      className="w-full accent-orange-600"
                   />
                </div>

                <div>
                   <div className="flex justify-between mb-1">
                      <label className="text-sm font-medium text-slate-700">Right</label>
                      <span className="text-xs text-slate-500">{marginRight}%</span>
                   </div>
                   <input
                      type="range" min="0" max="40" value={marginRight}
                      onChange={(e) => setMarginRight(Number(e.target.value))}
                      className="w-full accent-orange-600"
                   />
                </div>

             </div>

             <button
                onClick={handleSave}
                disabled={isProcessing}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-orange-200 flex items-center justify-center space-x-2 transition-all"
             >
                {isProcessing ? (
                   <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                   <>
                     <Save className="w-5 h-5" />
                     <span>Crop PDF</span>
                   </>
                )}
             </button>
          </div>
       </div>
    </div>
  );
};
