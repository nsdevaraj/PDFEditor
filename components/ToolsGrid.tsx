import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Image, 
  FileSpreadsheet, 
  FileOutput, 
  Split, 
  Merge, 
  Scissors, 
  Lock, 
  Unlock,
  Eye,
  Eraser,
  FileCheck,
  X,
  CheckCircle,
  Loader2,
  Download,
  ArrowRight
} from 'lucide-react';
import { performOCR } from '../services/ocrService';

export const ToolsGrid: React.FC = () => {
  const [activeTool, setActiveTool] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { title: "PDF to Word", desc: "Convert PDF files to Microsoft Word", icon: FileText, color: "text-blue-600", bg: "bg-blue-100", ext: ".docx" },
    { title: "PDF to Excel", desc: "Convert PDF files to Microsoft Excel", icon: FileSpreadsheet, color: "text-green-600", bg: "bg-green-100", ext: ".xlsx" },
    { title: "PDF to PPT", desc: "Convert PDF files to PowerPoint", icon: FileOutput, color: "text-orange-600", bg: "bg-orange-100", ext: ".pptx" },
    { title: "PDF to Image", desc: "Convert pages to JPG, PNG or TIFF", icon: Image, color: "text-purple-600", bg: "bg-purple-100", ext: ".zip" },
    { title: "Merge PDF", desc: "Combine multiple PDFs into one", icon: Merge, color: "text-red-600", bg: "bg-red-100", ext: "_merged.pdf" },
    { title: "Split PDF", desc: "Separate one page or a whole set", icon: Split, color: "text-cyan-600", bg: "bg-cyan-100", ext: "_split.zip" },
    { title: "Compress PDF", desc: "Reduce file size while optimizing", icon: Scissors, color: "text-pink-600", bg: "bg-pink-100", ext: "_compressed.pdf" },
    { title: "Protect PDF", desc: "Encrypt your PDF with a password", icon: Lock, color: "text-indigo-600", bg: "bg-indigo-100", ext: "_protected.pdf" },
    { title: "Unlock PDF", desc: "Remove security from PDF files", icon: Unlock, color: "text-teal-600", bg: "bg-teal-100", ext: "_unlocked.pdf" },
    { title: "Redact", desc: "Permanently remove sensitive info", icon: Eraser, color: "text-gray-600", bg: "bg-gray-100", ext: "_redacted.pdf" },
    { title: "OCR", desc: "Make scanned documents searchable", icon: Eye, color: "text-yellow-600", bg: "bg-yellow-100", ext: "_ocr.pdf" },
    { title: "Validate PDF/A", desc: "Check compliance with ISO standards", icon: FileCheck, color: "text-emerald-600", bg: "bg-emerald-100", ext: "_report.pdf" },
  ];

  const handleToolClick = (tool: any) => {
    setActiveTool(tool);
    setStatus('idle');
    setFileName('');
    setProgress(0);
    setProcessedFileUrl(null);
    // Small timeout to allow state to set before clicking input
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setStatus('processing');
      
      if (activeTool.title === 'OCR') {
        try {
          const blob = await performOCR(file, (p) => setProgress(p));
          const url = URL.createObjectURL(blob);
          setProcessedFileUrl(url);
          setStatus('success');
        } catch (error) {
          console.error(error);
          setStatus('idle'); // Or error state
          alert('OCR Failed. Please try again.');
        }
      } else {
        // Simulate processing progress for other tools
        let p = 0;
        const interval = setInterval(() => {
          p += Math.random() * 10;
          if (p >= 100) {
            p = 100;
            clearInterval(interval);
            setStatus('success');
          }
          setProgress(Math.min(p, 100));
        }, 200);
      }
    }
    // Reset input
    e.target.value = '';
  };

  const handleClose = () => {
    setActiveTool(null);
    setStatus('idle');
  };

  const handleDownload = () => {
    if (!activeTool) return;
    
    let url: string;
    let link = document.createElement('a');

    if (processedFileUrl && activeTool.title === 'OCR') {
       url = processedFileUrl;
    } else {
      // Create a dummy file for download
      const content = `This is a simulated converted file for: ${fileName}.\nTool Used: ${activeTool.title}\nTimestamp: ${new Date().toISOString()}`;
      const blob = new Blob([content], { type: 'text/plain' });
      url = URL.createObjectURL(blob);
    }
    
    link.href = url;
    const originalName = fileName.replace('.pdf', '');
    link.download = `${originalName}${activeTool.ext}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke URL only if it was created here (dummy).
    // If it is processedFileUrl, we might want to keep it valid until closed, but here we can revoke it if we don't allow multiple downloads.
    // For simplicity, we won't revoke processedFileUrl here to allow re-download if needed,
    // but we should revoke it when the tool closes.
    if (!processedFileUrl) {
       URL.revokeObjectURL(url);
    }
    
    handleClose();
  };

  return (
    <div className="flex-1 bg-slate-50 p-8 h-screen overflow-y-auto relative">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">All PDF Tools</h2>
        <p className="text-slate-500">Select a tool to get started</p>
      </div>

      <input 
        type="file" 
        accept=".pdf" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tools.map((tool, idx) => (
          <button 
            key={idx} 
            onClick={() => handleToolClick(tool)}
            className="text-left bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 w-full"
          >
            <div className={`${tool.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <tool.icon className={`${tool.color} w-6 h-6`} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">{tool.title}</h3>
            <p className="text-sm text-slate-500">{tool.desc}</p>
          </button>
        ))}
      </div>
      
      {/* Banner */}
      <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
            <h3 className="text-2xl font-bold mb-2">Go Mobile</h3>
            <p className="text-blue-100 mb-6">Scan, edit, and sign documents on the go with the LuminaPDF mobile app for iOS and Android.</p>
            <button className="bg-white text-blue-700 px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                Get the App
            </button>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 skew-x-12 transform translate-x-12"></div>
      </div>

      {/* Conversion Modal */}
      {activeTool && status !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${activeTool.bg}`}>
                        <activeTool.icon className={`w-6 h-6 ${activeTool.color}`} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{activeTool.title}</h3>
                   </div>
                   <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                     <X className="w-5 h-5" />
                   </button>
                </div>

                {status === 'processing' && (
                  <div className="text-center py-8">
                     <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                     <h4 className="font-semibold text-slate-900 mb-1">Converting File...</h4>
                     <p className="text-sm text-slate-500 mb-6">{fileName}</p>
                     
                     <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        ></div>
                     </div>
                     <p className="text-xs text-slate-400 mt-2 text-right">{Math.round(progress)}%</p>
                  </div>
                )}

                {status === 'success' && (
                  <div className="text-center py-6">
                     <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                     </div>
                     <h4 className="text-xl font-bold text-slate-900 mb-2">Conversion Complete!</h4>
                     <p className="text-slate-500 mb-8">Your file is ready to download.</p>
                     
                     <div className="flex flex-col gap-3">
                        <button 
                          onClick={handleDownload}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors"
                        >
                          <Download className="w-5 h-5" />
                          <span>Download File</span>
                        </button>
                        <button 
                          onClick={handleClose}
                          className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                        >
                          Convert Another File
                        </button>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};