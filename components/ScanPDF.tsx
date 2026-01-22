import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Trash2,
  Download,
  Loader2,
  ArrowRight,
  Plus,
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

interface ScanPDFProps {
  onClose: () => void;
}

export const ScanPDF: React.FC<ScanPDFProps> = ({ onClose }) => {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please ensure you have granted permission.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImages(prev => [...prev, dataUrl]);
      }
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePDF = () => {
    if (capturedImages.length === 0) return;
    setIsProcessing(true);

    try {
      const pdf = new jsPDF();

      capturedImages.forEach((imgData, index) => {
        if (index > 0) {
          pdf.addPage();
        }

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculate dimensions to fit page while maintaining aspect ratio
        const ratio = imgProps.width / imgProps.height;
        let w = pdfWidth;
        let h = w / ratio;

        if (h > pdfHeight) {
           h = pdfHeight;
           w = h * ratio;
        }

        const x = (pdfWidth - w) / 2;
        const y = (pdfHeight - h) / 2;

        pdf.addImage(imgData, 'JPEG', x, y, w, h);
      });

      const blob = pdf.output('blob');
      saveAs(blob, `scanned_document_${new Date().toISOString().slice(0, 10)}.pdf`);

      setIsProcessing(false);
      onClose();
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("Failed to generate PDF");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
       {/* Header */}
       <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
             <div className="p-2 bg-blue-100 rounded-lg">
                <Camera className="w-6 h-6 text-blue-600" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-900">Scan to PDF</h2>
               <p className="text-sm text-slate-500">Capture documents using your camera</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
             <X className="w-6 h-6" />
          </button>
       </div>

       <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Main Area: Camera or Image Preview */}
          <div className="flex-1 bg-slate-900 relative flex items-center justify-center overflow-hidden">
             {error ? (
                <div className="text-center p-8 bg-white rounded-xl max-w-md mx-4">
                   <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Camera className="w-8 h-8 text-red-600" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-900 mb-2">Camera Error</h3>
                   <p className="text-slate-500 mb-6">{error}</p>
                   <button
                     onClick={startCamera}
                     className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 w-full"
                   >
                     <RotateCcw className="w-4 h-4" />
                     <span>Retry Camera</span>
                   </button>
                </div>
             ) : (
                <>
                   {/* Camera View */}
                   <video
                     ref={videoRef}
                     autoPlay
                     playsInline
                     className="max-w-full max-h-full object-contain"
                   ></video>

                   {/* Capture Controls */}
                   <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center space-x-8">
                      <button
                        onClick={captureImage}
                        className="w-16 h-16 rounded-full bg-white border-4 border-slate-200 shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
                        title="Capture Photo"
                      >
                         <div className="w-12 h-12 rounded-full bg-red-600"></div>
                      </button>
                   </div>
                </>
             )}
          </div>

          {/* Sidebar: Gallery & Actions */}
          <div className="w-full md:w-80 bg-white border-l border-slate-200 flex flex-col h-1/3 md:h-full z-10">
             <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Captured Pages</h3>
                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">
                   {capturedImages.length}
                </span>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {capturedImages.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                      <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                      <p className="text-sm">No pages scanned yet.</p>
                      <p className="text-xs mt-1">Use the camera to capture documents.</p>
                   </div>
                ) : (
                   <div className="grid grid-cols-2 gap-4">
                      {capturedImages.map((img, idx) => (
                         <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-[3/4]">
                            <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                               <button
                                 onClick={() => removeImage(idx)}
                                 className="p-2 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors"
                               >
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 text-center">
                               Page {idx + 1}
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>

             <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button
                   onClick={handleGeneratePDF}
                   disabled={capturedImages.length === 0 || isProcessing}
                   className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center space-x-2 transition-all"
                >
                   {isProcessing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                   ) : (
                      <>
                        <Download className="w-5 h-5" />
                        <span>Save as PDF</span>
                      </>
                   )}
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};
