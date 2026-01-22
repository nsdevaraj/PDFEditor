import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite';
import { validatePDFCompliance } from '../services/geminiService';
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
  ArrowRight,
  RotateCw,
  ArrowLeftRight,
  Hash,
  Crop,
  Wrench,
  Globe
} from 'lucide-react';
import { compressPDF } from '../services/pdfService';
import { repairPDF } from '../services/repairService';
import {
  convertPDFToExcel,
  convertPDFToPPT,
  convertPDFToWord,
  convertWordToPDF,
  convertExcelToPDF,
  convertPPTToPDF,
  convertImageToPDF,
  convertHTMLToPDF
} from '../services/conversionService';
import { UploadedFile } from '../types';
import { SplitPDF } from './SplitPDF';
import { RotatePDF } from './RotatePDF';
import { OrganizePDF } from './OrganizePDF';
import { PageNumbersPDF } from './PageNumbersPDF';
import { CropPDF } from './CropPDF';
import { convertPdfToImages } from '../utils/pdfConverter';
import { performOCR } from '../services/ocrService';

export const ToolsGrid: React.FC = () => {
  const [activeTool, setActiveTool] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'configuring' | 'processing' | 'success' | 'waiting_password' | 'selecting_html_input'>('idle');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [currentFile, setCurrentFile] = useState<UploadedFile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
  const [processedFile, setProcessedFile] = useState<Blob | null>(null);
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png' | 'tiff'>('jpg');
  const [conversionResult, setConversionResult] = useState<Blob | null>(null);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [htmlContent, setHtmlContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { title: "Rotate PDF", desc: "Rotate pages left or right", icon: RotateCw, color: "text-blue-600", bg: "bg-blue-100", ext: "_rotated.pdf" },
    { title: "Organize PDF", desc: "Sort and reorder pages", icon: ArrowLeftRight, color: "text-purple-600", bg: "bg-purple-100", ext: "_organized.pdf" },
    { title: "Page Numbers", desc: "Add page numbers to document", icon: Hash, color: "text-green-600", bg: "bg-green-100", ext: "_numbered.pdf" },
    { title: "Crop PDF", desc: "Trim margins and crop pages", icon: Crop, color: "text-orange-600", bg: "bg-orange-100", ext: "_cropped.pdf" },
    { title: "Repair PDF", desc: "Fix corrupted or damaged files", icon: Wrench, color: "text-red-600", bg: "bg-red-100", ext: "_repaired.pdf" },
    { title: "PDF to Word", desc: "Convert PDF files to Microsoft Word", icon: FileText, color: "text-blue-600", bg: "bg-blue-100", ext: ".docx" },
    { title: "PDF to Excel", desc: "Convert PDF files to Microsoft Excel", icon: FileSpreadsheet, color: "text-green-600", bg: "bg-green-100", ext: ".xlsx" },
    { title: "PDF to PPT", desc: "Convert PDF files to PowerPoint", icon: FileOutput, color: "text-orange-600", bg: "bg-orange-100", ext: ".pptx" },
    { title: "PDF to Image", desc: "Convert pages to JPG, PNG or TIFF", icon: Image, color: "text-purple-600", bg: "bg-purple-100", ext: ".zip" },
    { title: "Word to PDF", desc: "Convert Word documents to PDF", icon: FileText, color: "text-blue-600", bg: "bg-blue-100", ext: ".pdf" },
    { title: "Excel to PDF", desc: "Convert Excel spreadsheets to PDF", icon: FileSpreadsheet, color: "text-green-600", bg: "bg-green-100", ext: ".pdf" },
    { title: "PPT to PDF", desc: "Convert PowerPoint presentations to PDF", icon: FileOutput, color: "text-orange-600", bg: "bg-orange-100", ext: ".pdf" },
    { title: "JPG to PDF", desc: "Convert Images to PDF", icon: Image, color: "text-purple-600", bg: "bg-purple-100", ext: ".pdf" },
    { title: "HTML to PDF", desc: "Convert HTML files or content to PDF", icon: Globe, color: "text-pink-600", bg: "bg-pink-100", ext: ".pdf" },
    { title: "Merge PDF", desc: "Combine multiple PDFs into one", icon: Merge, color: "text-red-600", bg: "bg-red-100", ext: "_merged.pdf" },
    { title: "Split PDF", desc: "Separate one page or a whole set", icon: Split, color: "text-cyan-600", bg: "bg-cyan-100", ext: "_split.zip" },
    { title: "Compress PDF", desc: "Reduce file size while optimizing", icon: Scissors, color: "text-pink-600", bg: "bg-pink-100", ext: "_compressed.pdf" },
    { title: "Protect PDF", desc: "Encrypt your PDF with a password", icon: Lock, color: "text-indigo-600", bg: "bg-indigo-100", ext: "_protected.pdf" },
    { title: "Unlock PDF", desc: "Remove security from PDF files", icon: Unlock, color: "text-teal-600", bg: "bg-teal-100", ext: "_unlocked.pdf" },
    { title: "Redact", desc: "Permanently remove sensitive info", icon: Eraser, color: "text-gray-600", bg: "bg-gray-100", ext: "_redacted.pdf" },
    { title: "OCR", desc: "Make scanned documents searchable", icon: Eye, color: "text-yellow-600", bg: "bg-yellow-100", ext: "_ocr.pdf" },
    { title: "Validate PDF/A", desc: "Check compliance with ISO standards", icon: FileCheck, color: "text-emerald-600", bg: "bg-emerald-100", ext: "_report.txt" },
  ];

  const handleToolClick = (tool: any) => {
    setActiveTool(tool);
    setStatus('idle');
    setFileName('');
    setProgress(0);
    setResultBlob(null);
    setProcessedFileUrl(null);
    setErrorMessage('');
    setPassword('');
    setFileBuffer(null);
    setValidationResult(null);
    setHtmlContent('');
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    if (tool.title === "HTML to PDF") {
        setStatus('selecting_html_input');
        return;
    }

    // Small timeout to allow state to set before clicking input
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleHtmlConvert = async () => {
      if (!htmlContent) return;
      setStatus('processing');
      setFileName('content.pdf');
      setProgress(20);
      try {
          const blob = await convertHTMLToPDF(htmlContent);
          setResultBlob(blob);
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          setStatus('success');
          setProgress(100);
      } catch (error) {
          console.error(error);
          setStatus('idle');
          alert('HTML conversion failed');
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setSelectedFile(file);

      // Reset input immediately so we can select same file again if needed
      e.target.value = '';

      if (activeTool.title === 'Protect PDF') {
        setSelectedFile(file);
        setStatus('password');
      } else { 

        // Components that need the file loaded first
        if (['Split PDF', 'Rotate PDF', 'Organize PDF', 'Page Numbers', 'Crop PDF'].includes(activeTool?.title)) {
            const fileUrl = URL.createObjectURL(file);
            const reader = new FileReader();
            reader.onload = (event) => {
            if (event.target?.result) {
                const fullBase64 = event.target.result as string;
                const content = fullBase64.split(',')[1];
                setCurrentFile({
                name: file.name,
                type: file.type,
                size: file.size,
                dataUrl: fullBase64,
                content: content,
                lastModified: file.lastModified,
                fileUrl: fileUrl
                });
            }
            };
            reader.readAsDataURL(file);
            return;
        }

      if (activeTool && activeTool.title === "PDF to Image") {
        setStatus('configuring');
        return;
      }

      if (activeTool?.title === "Unlock PDF") {
        try {
            const buffer = await file.arrayBuffer();
            try {
                // Attempt to load without password first (in case it's just owner password or no password)
                const pdfDoc = await PDFDocument.load(buffer);
                // If loaded, save it (this removes encryption if it was just owner password)
                const savedBytes = await pdfDoc.save();
                const blob = new Blob([savedBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setDownloadUrl(url);
                setResultBlob(blob);
                setStatus('success');
                setProgress(100);
            } catch (error) {
                // Failed to load, likely due to password
                setFileBuffer(buffer);
                setStatus('waiting_password');
            }
        } catch (err) {
            setErrorMessage('Failed to read file.');
            setStatus('idle');
        }
        return;
      }

      setStatus('processing');
      setProgress(10); // Start progress

      try {
        if (activeTool.title === "PDF to Excel") {
           const blob = await convertPDFToExcel(file);
           setResultBlob(blob);
           const url = URL.createObjectURL(blob);
           setDownloadUrl(url);
           setStatus('success');
           setProgress(100);
        } else if (activeTool.title === "PDF to PPT") {
           const blob = await convertPDFToPPT(file);
           setResultBlob(blob);
           const url = URL.createObjectURL(blob);
           setDownloadUrl(url);
           setStatus('success');
           setProgress(100);
        } else if (activeTool.title === "PDF to Word") {
           const blob = await convertPDFToWord(file);
           setResultBlob(blob);
           const url = URL.createObjectURL(blob);
           setDownloadUrl(url);
           setStatus('success');
           setProgress(100);
        } else if (activeTool.title === "Word to PDF") {
            const blob = await convertWordToPDF(file);
            setResultBlob(blob);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('success');
            setProgress(100);
        } else if (activeTool.title === "Excel to PDF") {
            const blob = await convertExcelToPDF(file);
            setResultBlob(blob);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('success');
            setProgress(100);
        } else if (activeTool.title === "PPT to PDF") {
            const blob = await convertPPTToPDF(file);
            setResultBlob(blob);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('success');
            setProgress(100);
        } else if (activeTool.title === "JPG to PDF") {
            const blob = await convertImageToPDF(file);
            setResultBlob(blob);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('success');
            setProgress(100);
        } else if (activeTool.title === "HTML to PDF") {
            // HTML File upload path
             const text = await file.text();
             const blob = await convertHTMLToPDF(text);
             setResultBlob(blob);
             const url = URL.createObjectURL(blob);
             setDownloadUrl(url);
             setStatus('success');
             setProgress(100);
        } else if (activeTool.title === "Compress PDF") {
           const blob = await compressPDF(file, (p) => setProgress(p));
           setResultBlob(blob);
           const url = URL.createObjectURL(blob);
           setDownloadUrl(url);
           setStatus('success');
        } else if (activeTool.title === "Repair PDF") {
           const blob = await repairPDF(file);
           setResultBlob(blob);
           const url = URL.createObjectURL(blob);
           setDownloadUrl(url);
           setStatus('success');
           setProgress(100);
        } else if (activeTool.title === 'OCR') {
           const blob = await performOCR(file, (p) => setProgress(p));
           setResultBlob(blob);
           const url = URL.createObjectURL(blob);
           setProcessedFileUrl(url);
           setDownloadUrl(url); // Ensure download button works
           setStatus('success');
        } else if (activeTool.title === "Validate PDF/A") {
           const reader = new FileReader();
           reader.onload = async (event) => {
             if (event.target && event.target.result) {
               const base64Data = (event.target.result as string).split(',')[1];
               const report = await validatePDFCompliance(base64Data, file.type);
               setValidationResult(report);
               setStatus('success');
               setProgress(100);
             }
           };
           reader.readAsDataURL(file);
        } else {
           // Fallback / Simulated processing for tools not yet fully implemented
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    const next = prev + 10;
                    if (next >= 100) {
                        clearInterval(progressInterval);
                        setStatus('success');
                        return 100;
                    }
                    return next;
                });
            }, 200);

            // Create a dummy result for simulation
            const content = `Simulated content for ${activeTool.title}\nFile: ${file.name}`;
            const blob = new Blob([content], { type: 'text/plain' });
            setResultBlob(blob);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
        }
      } catch (error) {
        console.error("Operation failed", error);
        setStatus('idle');
        alert(`Operation failed: ${error}`);
      }
    }
  }
  };

  const handleEncrypt = async () => {
    if (!selectedFile || !password) return;
    setStatus('processing');
    setProgress(10);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);

      // Use @pdfsmaller/pdf-encrypt-lite for encryption
      const encryptedBytes = await encryptPDF(pdfBytes, password, password);

      const blob = new Blob([encryptedBytes], { type: 'application/pdf' });
      setProcessedFile(blob);
      setResultBlob(blob);
      setProgress(100);
      setStatus('success');
    } catch (error) {
      console.error('Encryption failed:', error);
      alert('Encryption failed. Please try again.');
      setStatus('idle');
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) return;
    setStatus('processing');
    setProgress(0);

    try {
      const result = await convertPdfToImages(selectedFile, outputFormat, (p) => {
        setProgress(p);
      });
      setConversionResult(result);
      setResultBlob(result);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('idle');
      alert('Error converting file');
    }
  };

  const handleUnlockWithPassword = async () => {
    if (!fileBuffer || !password) return;
    setStatus('processing');
    setErrorMessage('');

    try {
      const pdfDoc = await PDFDocument.load(fileBuffer, { password });
      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultBlob(blob);
      setStatus('success');
      setProgress(100);
    } catch (error) {
      setStatus('waiting_password');
      setErrorMessage('Incorrect password. Please try again.');
    }
  };

  const handleClose = () => {
    if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
        setDownloadUrl(null);
    }
    setActiveTool(null);
    setStatus('idle');
    setResultBlob(null);
    setCurrentFile(null);
    setSelectedFile(null);
    setConversionResult(null);
    setOutputFormat('jpg');
    setPassword('');
    setSelectedFile(null);
    setProcessedFile(null);
    setFileName('');
    setProgress(0);
    setErrorMessage('');
    setFileBuffer(null);
    setProcessedFileUrl(null);
    setValidationResult(null);
    setHtmlContent('');
  };

  const handleDownload = () => {
    if (!resultBlob || !activeTool) return;
    
    let blob: Blob;

    if (processedFile) {
      blob = processedFile;
    } else {
      // Create a dummy file for download
      const content = `This is a simulated converted file for: ${fileName}.\nTool Used: ${activeTool.title}\nTimestamp: ${new Date().toISOString()}`;
      blob = new Blob([content], { type: 'text/plain' });
    }

    let url = downloadUrl;
    let isTempUrl = false;

    if (!url) {
        if (processedFile) {
            url = URL.createObjectURL(processedFile);
            isTempUrl = true;
        } else {
            // Create a dummy file for download
            const content = `This is a simulated converted file for: ${fileName}.\nTool Used: ${activeTool.title}\nTimestamp: ${new Date().toISOString()}`;
            const blob = new Blob([content], { type: 'text/plain' });
            url = URL.createObjectURL(blob);
            isTempUrl = true;
        }
    }

    if (activeTool.title === "Validate PDF/A" && validationResult) {
       const blob = new Blob([validationResult], { type: 'text/plain' });
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       const originalName = fileName.replace(/\.pdf$/i, '');
       link.download = `${originalName}_report.txt`;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       URL.revokeObjectURL(url);
       handleClose();
       return;
    }

    if (activeTool.title === "PDF to Image" && conversionResult) {
       const url = URL.createObjectURL(conversionResult);
       const link = document.createElement('a');
       link.href = url;
       const originalName = fileName.replace(/\.pdf$/i, '');
       link.download = `${originalName}_images.zip`;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       URL.revokeObjectURL(url);
       handleClose();
       return;
    }

    if (url) {
        const link = document.createElement('a');
        link.href = url;
        const originalName = fileName.replace(/\.pdf$/i, '');
        link.download = `${originalName}${activeTool.ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (isTempUrl) {
            setTimeout(() => URL.revokeObjectURL(url), 100);
        }
        handleClose();
        return;
    }
  };

  if (activeTool?.title === "Split PDF" && currentFile) {
    return <SplitPDF file={currentFile} onClose={handleClose} />;
  }
  if (activeTool?.title === "Rotate PDF" && currentFile) {
    return <RotatePDF file={currentFile} onClose={handleClose} />;
  }
  if (activeTool?.title === "Organize PDF" && currentFile) {
    return <OrganizePDF file={currentFile} onClose={handleClose} />;
  }
  if (activeTool?.title === "Page Numbers" && currentFile) {
    return <PageNumbersPDF file={currentFile} onClose={handleClose} />;
  }
  if (activeTool?.title === "Crop PDF" && currentFile) {
    return <CropPDF file={currentFile} onClose={handleClose} />;
  }

  return (
    <div className="flex-1 bg-slate-50 p-8 h-screen overflow-y-auto relative">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">All PDF Tools</h2>
        <p className="text-slate-500">Select a tool to get started</p>
      </div>

      <input 
        type="file" 
        accept={
            activeTool?.title === "JPG to PDF" ? "image/jpeg, image/jpg" :
            activeTool?.title === "Word to PDF" ? ".docx, .doc" :
            activeTool?.title === "Excel to PDF" ? ".xlsx, .xls" :
            activeTool?.title === "PPT to PDF" ? ".pptx, .ppt" :
            activeTool?.title === "HTML to PDF" ? ".html, .htm" :
            ".pdf"
        }
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

                {status === 'selecting_html_input' && (
                    <div className="text-center py-6">
                        <h4 className="font-semibold text-slate-900 mb-4">Choose Input Method</h4>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200 py-3 rounded-xl font-medium transition-colors"
                            >
                                Upload HTML File
                            </button>
                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">OR</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                            </div>
                            <div className="text-left">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Enter URL or Paste HTML</label>
                                <textarea
                                    className="w-full border border-slate-300 rounded-xl p-3 h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono"
                                    placeholder="<html>...</html> or https://..."
                                    value={htmlContent}
                                    onChange={(e) => setHtmlContent(e.target.value)}
                                ></textarea>
                            </div>
                            <button
                                onClick={handleHtmlConvert}
                                disabled={!htmlContent.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
                            >
                                Convert Content
                            </button>
                        </div>
                    </div>
                )}

                {status === 'password' && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Protect PDF</h4>
                    <p className="text-slate-500 mb-6">Enter a password to encrypt your file</p>

                    <div className="mb-6">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        autoFocus
                      />
                    </div>

                    <button
                      onClick={handleEncrypt}
                      disabled={!password}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
                    >
                      Encrypt PDF
                    </button>
                  </div>
                )}

                {status === 'configuring' && (
                  <div className="text-center py-6">
                    <h4 className="font-semibold text-slate-900 mb-4">Select Output Format</h4>

                    <div className="flex justify-center space-x-4 mb-8">
                      {['jpg', 'png', 'tiff'].map((fmt) => (
                        <label key={fmt} className="cursor-pointer">
                          <input
                            type="radio"
                            name="format"
                            value={fmt}
                            checked={outputFormat === fmt}
                            onChange={() => setOutputFormat(fmt as any)}
                            className="hidden peer"
                          />
                          <div className="px-4 py-2 rounded-lg border border-slate-200 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 hover:bg-slate-50 transition-colors uppercase text-sm font-medium">
                            {fmt}
                          </div>
                        </label>
                      ))}
                    </div>

                    <button
                      onClick={handleConvert}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors"
                    >
                      <ArrowRight className="w-5 h-5" />
                      <span>Convert to {outputFormat.toUpperCase()}</span>
                    </button>
                  </div>
                )}

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

                {status === 'waiting_password' && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-orange-600" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">File is Encrypted</h4>
                    <p className="text-slate-500 mb-6">Enter the password to unlock this file.</p>

                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter Password"
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && handleUnlockWithPassword()}
                    />

                    {errorMessage && (
                      <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
                    )}

                    <button
                      onClick={handleUnlockWithPassword}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium mt-4 transition-colors"
                    >
                      Unlock PDF
                    </button>
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
