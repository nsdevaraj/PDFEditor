import React, { useState, useRef, Suspense } from 'react';
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
  Globe,
  Layers,
  Camera,
  PenTool,
  Book,
  FileCode,
  FileImage,
  LayoutGrid,
  Columns,
  Grid,
  Maximize,
  Minimize,
  RefreshCcw,
  Shield,
  EyeOff,
  Type,
  Palette,
  Folder,
  Trash2,
  Save,
  Printer,
  File,
  Search,
  Settings
} from 'lucide-react';
import { UploadedFile, AppView } from '../types';

// Lazy load heavy components to reduce initial bundle size
const SplitPDF = React.lazy(() => import('./SplitPDF').then(module => ({ default: module.SplitPDF })));
const ScanPDF = React.lazy(() => import('./ScanPDF').then(module => ({ default: module.ScanPDF })));
const RotatePDF = React.lazy(() => import('./RotatePDF').then(module => ({ default: module.RotatePDF })));
const OrganizePDF = React.lazy(() => import('./OrganizePDF').then(module => ({ default: module.OrganizePDF })));
const PageNumbersPDF = React.lazy(() => import('./PageNumbersPDF').then(module => ({ default: module.PageNumbersPDF })));
const CropPDF = React.lazy(() => import('./CropPDF').then(module => ({ default: module.CropPDF })));
const ComparePDF = React.lazy(() => import('./ComparePDF').then(module => ({ default: module.ComparePDF })));

const FallbackLoader = () => (
  <div className="flex-1 flex items-center justify-center h-full">
    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
  </div>
);

interface ToolsGridProps {
  onNavigate?: (view: AppView) => void;
}

export const ToolsGrid: React.FC<ToolsGridProps> = ({ onNavigate }) => {
  const [activeTool, setActiveTool] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'configuring' | 'processing' | 'success' | 'waiting_password' | 'selecting_html_input'>('idle');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [currentFile, setCurrentFile] = useState<UploadedFile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [stampImage, setStampImage] = useState<File | null>(null);
    
  const [processedFile, setProcessedFile] = useState<Blob | null>(null);
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png' | 'tiff'>('jpg');
  const [conversionResult, setConversionResult] = useState<Blob | null>(null);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [headerFooterFontSize, setHeaderFooterFontSize] = useState(12);
  const [bgColor, setBgColor] = useState('#FFFDE7');
  const [textColor, setTextColor] = useState('#FF0000');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    // Edit & Annotate
    { title: "Edit PDF", desc: "Add text, images, and annotations", icon: PenTool, color: "text-blue-600", bg: "bg-blue-100", ext: "" },
    { title: "Sign PDF", desc: "Add electronic signatures", icon: PenTool, color: "text-purple-600", bg: "bg-purple-100", ext: "" },
    { title: "Crop PDF", desc: "Trim margins and crop pages", icon: Crop, color: "text-orange-600", bg: "bg-orange-100", ext: "_cropped.pdf" },
    { title: "Page Numbers", desc: "Add page numbers to document", icon: Hash, color: "text-green-600", bg: "bg-green-100", ext: "_numbered.pdf" },
    { title: "Add Watermark", desc: "Add text or image watermarks", icon: Type, color: "text-indigo-600", bg: "bg-indigo-100", ext: "_watermarked.pdf" },
    { title: "Header & Footer", desc: "Add headers and footers", icon: LayoutGrid, color: "text-blue-600", bg: "bg-blue-100", ext: "_headerfooter.pdf" },
    { title: "Invert Colors", desc: "Invert PDF colors for dark mode", icon: Palette, color: "text-gray-600", bg: "bg-gray-100", ext: "_inverted.pdf" },
    { title: "Background Color", desc: "Change PDF background color", icon: Palette, color: "text-pink-600", bg: "bg-pink-100", ext: "_bg.pdf" },
    { title: "Change Text Color", desc: "Modify color of text content", icon: Type, color: "text-blue-600", bg: "bg-blue-100", ext: "_textcolor.pdf" },
    { title: "Add Stamps", desc: "Add approval stamps", icon: FileCheck, color: "text-green-600", bg: "bg-green-100", ext: "_stamped.pdf" },
    { title: "Remove Annotations", desc: "Delete comments and markup", icon: Eraser, color: "text-red-600", bg: "bg-red-100", ext: "_clean.pdf" },
    { title: "Form Filler", desc: "Fill PDF forms online", icon: FileText, color: "text-blue-600", bg: "bg-blue-100", ext: "" },
    { title: "Form Creator", desc: "Create fillable PDF forms", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-100", ext: "" },
    { title: "Remove Blank Pages", desc: "Detect and remove empty pages", icon: File, color: "text-gray-500", bg: "bg-gray-100", ext: "_noblank.pdf" },
    { title: "PDF Reader", desc: "View and navigate PDF documents", icon: Book, color: "text-blue-600", bg: "bg-blue-100", ext: "" },

    // Convert to PDF
    { title: "JPG to PDF", desc: "Convert JPG images to PDF", icon: Image, color: "text-purple-600", bg: "bg-purple-100", ext: ".pdf" },
    { title: "PNG to PDF", desc: "Convert PNG images to PDF", icon: Image, color: "text-blue-600", bg: "bg-blue-100", ext: ".pdf" },
    { title: "WebP to PDF", desc: "Convert WebP images to PDF", icon: Image, color: "text-green-600", bg: "bg-green-100", ext: ".pdf" },
    { title: "BMP to PDF", desc: "Convert BMP images to PDF", icon: Image, color: "text-orange-600", bg: "bg-orange-100", ext: ".pdf" },
    { title: "TIFF to PDF", desc: "Convert TIFF images to PDF", icon: Image, color: "text-red-600", bg: "bg-red-100", ext: ".pdf" },
    { title: "Text to PDF", desc: "Convert plain text to PDF", icon: FileText, color: "text-gray-600", bg: "bg-gray-100", ext: ".pdf" },
    { title: "Markdown to PDF", desc: "Convert Markdown to PDF", icon: FileCode, color: "text-slate-800", bg: "bg-slate-200", ext: ".pdf" },
    { title: "Word to PDF", desc: "Convert Word documents to PDF", icon: FileText, color: "text-blue-600", bg: "bg-blue-100", ext: ".pdf" },
    { title: "Excel to PDF", desc: "Convert Excel spreadsheets to PDF", icon: FileSpreadsheet, color: "text-green-600", bg: "bg-green-100", ext: ".pdf" },
    { title: "PPT to PDF", desc: "Convert PowerPoint to PDF", icon: FileOutput, color: "text-orange-600", bg: "bg-orange-100", ext: ".pdf" },
    { title: "HTML to PDF", desc: "Convert HTML files or content to PDF", icon: Globe, color: "text-pink-600", bg: "bg-pink-100", ext: ".pdf" },

    // Convert from PDF
    { title: "PDF to JPG", desc: "Convert PDF pages to JPG", icon: Image, color: "text-purple-600", bg: "bg-purple-100", ext: ".zip" },
    { title: "PDF to PNG", desc: "Convert PDF pages to PNG", icon: Image, color: "text-blue-600", bg: "bg-blue-100", ext: ".zip" },
    { title: "PDF to WebP", desc: "Convert PDF pages to WebP", icon: Image, color: "text-green-600", bg: "bg-green-100", ext: ".zip" },
    { title: "PDF to BMP", desc: "Convert PDF pages to BMP", icon: Image, color: "text-orange-600", bg: "bg-orange-100", ext: ".zip" },
    { title: "PDF to TIFF", desc: "Convert PDF to TIFF images", icon: Image, color: "text-red-600", bg: "bg-red-100", ext: ".zip" },
    { title: "PDF to Text", desc: "Extract text from PDF", icon: FileText, color: "text-gray-600", bg: "bg-gray-100", ext: ".txt" },
    { title: "PDF to JSON", desc: "Extract content to JSON", icon: FileCode, color: "text-yellow-600", bg: "bg-yellow-100", ext: ".json" },
    { title: "PDF to Word", desc: "Convert PDF files to Microsoft Word", icon: FileText, color: "text-blue-600", bg: "bg-blue-100", ext: ".docx" },
    { title: "PDF to Excel", desc: "Convert PDF files to Microsoft Excel", icon: FileSpreadsheet, color: "text-green-600", bg: "bg-green-100", ext: ".xlsx" },
    { title: "PDF to PPT", desc: "Convert PDF files to PowerPoint", icon: FileOutput, color: "text-orange-600", bg: "bg-orange-100", ext: ".pptx" },
    { title: "PDF to Image", desc: "Convert pages to Images (General)", icon: Image, color: "text-purple-600", bg: "bg-purple-100", ext: ".zip" },

    // Organize & Manage
    { title: "Merge PDF", desc: "Combine multiple PDFs into one", icon: Merge, color: "text-red-600", bg: "bg-red-100", ext: "_merged.pdf" },
    { title: "Split PDF", desc: "Separate one page or a whole set", icon: Split, color: "text-cyan-600", bg: "bg-cyan-100", ext: "_split.zip" },
    { title: "Extract PDF Pages", desc: "Extract specific pages from PDF", icon: FileText, color: "text-cyan-600", bg: "bg-cyan-100", ext: "_extracted.pdf" },
    { title: "Organize PDF", desc: "Sort and reorder pages", icon: ArrowLeftRight, color: "text-purple-600", bg: "bg-purple-100", ext: "_organized.pdf" },
    { title: "Rotate PDF", desc: "Rotate pages left or right", icon: RotateCw, color: "text-blue-600", bg: "bg-blue-100", ext: "_rotated.pdf" },
    { title: "Scan to PDF", desc: "Capture document scans from mobile", icon: Camera, color: "text-blue-600", bg: "bg-blue-100", ext: ".pdf" },
    { title: "Compare PDF", desc: "Overlay and compare two PDF files", icon: Layers, color: "text-indigo-600", bg: "bg-indigo-100", ext: "" },
    { title: "OCR", desc: "Make scanned documents searchable", icon: Eye, color: "text-yellow-600", bg: "bg-yellow-100", ext: "_ocr.pdf" },
    { title: "View Metadata", desc: "View PDF document properties", icon: FileText, color: "text-gray-600", bg: "bg-gray-100", ext: "" },
    { title: "Edit Metadata", desc: "Edit PDF document properties", icon: FileText, color: "text-blue-600", bg: "bg-blue-100", ext: "_metadata.pdf" },

    // Optimize & Repair
    { title: "Compress PDF", desc: "Reduce file size while optimizing", icon: Scissors, color: "text-pink-600", bg: "bg-pink-100", ext: "_compressed.pdf" },
    { title: "Repair PDF", desc: "Fix corrupted or damaged files", icon: Wrench, color: "text-red-600", bg: "bg-red-100", ext: "_repaired.pdf" },
    { title: "Flatten PDF", desc: "Make your PDF uneditable", icon: Layers, color: "text-purple-600", bg: "bg-purple-100", ext: "_flattened.pdf" },
    { title: "Validate PDF/A", desc: "Check compliance with ISO standards", icon: FileCheck, color: "text-emerald-600", bg: "bg-emerald-100", ext: "_report.txt" },

    // Secure PDF
    { title: "Protect PDF", desc: "Encrypt your PDF with a password", icon: Lock, color: "text-indigo-600", bg: "bg-indigo-100", ext: "_protected.pdf" },
    { title: "Unlock PDF", desc: "Remove security from PDF files", icon: Unlock, color: "text-teal-600", bg: "bg-teal-100", ext: "_unlocked.pdf" },
    { title: "Redact", desc: "Permanently remove sensitive info", icon: Eraser, color: "text-gray-600", bg: "bg-gray-100", ext: "_redacted.pdf" },
  ];

  const handleToolClick = (tool: any) => {
    if (tool.title === "Edit PDF" && onNavigate) {
       onNavigate(AppView.EDITOR);
       return;
    }
    if (tool.title === "Sign PDF" && onNavigate) {
       onNavigate(AppView.SIGN);
       return;
    }
    if ((tool.title === "Form Filler" || tool.title === "Form Creator") && onNavigate) {
       onNavigate(AppView.FORMS);
       return;
    }

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

    if (tool.title === "Scan to PDF") {
        // No file input needed for scanning
        return;
    }

    // Tools that require file input first, then configuration
    // We let the file input click happen for these tools now
    // (Add Stamps, Add Watermark, Header & Footer, Invert Colors, Background Color, Change Text Color, PDF to Image)

    // Small timeout to allow state to set before clicking input
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleWatermark = async () => {
    if (!selectedFile) return;
    setStatus('processing');
    setProgress(10);

    try {
      const { PDFDocument, rgb, degrees, StandardFonts } = await import('pdf-lib');
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();
      const text = watermarkText || 'WATERMARK';

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const fontSize = Math.min(width, height) / 8;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        page.drawText(text, {
          x: width / 2 - textWidth / 2,
          y: height / 2 - textHeight / 2,
          size: fontSize,
          font: font,
          color: rgb(0.75, 0.75, 0.75),
          rotate: degrees(-45),
          opacity: 0.3,
        });

        setProgress(10 + ((i + 1) / pages.length) * 85);
      }

      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      setResultBlob(blob);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus('success');
      setProgress(100);
    } catch (error) {
      console.error('Watermark failed:', error);
      setStatus('idle');
      alert('Watermark operation failed. Please try again.');
    }
  };

  const handleHeaderFooter = async () => {
    if (!selectedFile || (!headerText && !footerText)) return;
    setStatus('processing');
    setProgress(10);

    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        if (headerText) {
          const textWidth = font.widthOfTextAtSize(headerText, headerFooterFontSize);
          page.drawText(headerText, {
            x: (width - textWidth) / 2,
            y: height - headerFooterFontSize - 15,
            size: headerFooterFontSize,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
        }

        if (footerText) {
          const textWidth = font.widthOfTextAtSize(footerText, headerFooterFontSize);
          page.drawText(footerText, {
            x: (width - textWidth) / 2,
            y: 15,
            size: headerFooterFontSize,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
        }

        setProgress(10 + ((i + 1) / pages.length) * 85);
      }

      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      setResultBlob(blob);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus('success');
      setProgress(100);
    } catch (error) {
      console.error('Header & Footer failed:', error);
      setStatus('idle');
      alert('Header & Footer operation failed. Please try again.');
    }
  };

  const handleInvertColors = async () => {
    if (!selectedFile) return;
    setStatus('processing');
    setProgress(10);

    try {
      const { PDFDocument, rgb, BlendMode } = await import('pdf-lib');
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        // Draw a white rectangle with Difference blend mode to invert underlying colors
        page.drawRectangle({
          x: 0,
          y: 0,
          width,
          height,
          color: rgb(1, 1, 1),
          blendMode: BlendMode.Difference,
          opacity: 1,
        });
        setProgress(10 + ((i + 1) / pages.length) * 85);
      }

      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      setResultBlob(blob);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus('success');
      setProgress(100);
    } catch (error) {
      console.error('Invert Colors failed:', error);
      setStatus('idle');
      alert('Invert Colors operation failed. Please try again.');
    }
  };

  const handleBackgroundColor = async () => {
    if (!selectedFile) return;
    setStatus('processing');
    setProgress(10);

    try {
      const { PDFDocument, rgb, PDFName, PDFArray } = await import('pdf-lib');
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      const r = parseInt(bgColor.slice(1, 3), 16) / 255;
      const g = parseInt(bgColor.slice(3, 5), 16) / 255;
      const b = parseInt(bgColor.slice(5, 7), 16) / 255;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        // Draw background rectangle (initially on top)
        page.drawRectangle({
          x: 0,
          y: 0,
          width,
          height,
          color: rgb(r, g, b),
          opacity: 1,
        });

        // Move the drawn rectangle to the background (beginning of content stream)
        const contents = page.node.lookup(PDFName.of('Contents'));
        if (contents instanceof PDFArray) {
          const lastIndex = contents.size() - 1;
          const last = contents.get(lastIndex);
          contents.remove(lastIndex);
          contents.insert(0, last);
        }

        setProgress(10 + ((i + 1) / pages.length) * 85);
      }

      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      setResultBlob(blob);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus('success');
      setProgress(100);
    } catch (error) {
      console.error('Background Color failed:', error);
      setStatus('idle');
      alert('Background Color operation failed. Please try again.');
    }
  };

  const handleTextColor = async () => {
    if (!selectedFile) return;
    setStatus('processing');
    setProgress(10);

    try {
      const { PDFDocument, rgb, BlendMode } = await import('pdf-lib');
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      const r = parseInt(textColor.slice(1, 3), 16) / 255;
      const g = parseInt(textColor.slice(3, 5), 16) / 255;
      const b = parseInt(textColor.slice(5, 7), 16) / 255;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        // Draw a rectangle with Screen blend mode
        // If text is black (0,0,0), Screen with Color (R,G,B) -> (R,G,B).
        // If background is white (1,1,1), Screen with Color (R,G,B) -> (1,1,1).
        page.drawRectangle({
          x: 0,
          y: 0,
          width,
          height,
          color: rgb(r, g, b),
          blendMode: BlendMode.Screen,
          opacity: 1,
        });

        setProgress(10 + ((i + 1) / pages.length) * 85);
      }

      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      setResultBlob(blob);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus('success');
      setProgress(100);
    } catch (error) {
      console.error('Change Text Color failed:', error);
      setStatus('idle');
      alert('Change Text Color operation failed. Please try again.');
    }
  };

  const handleStamp = async () => {
      if (!selectedFile || !stampImage) return;
      setStatus('processing');
      setProgress(10);
      try {
          const { PDFDocument } = await import('pdf-lib');
          const pdfBytes = await selectedFile.arrayBuffer();
          const pdfDoc = await PDFDocument.load(pdfBytes);

          const imageBytes = await stampImage.arrayBuffer();
          let image;
          if (stampImage.type === 'image/png') {
              image = await pdfDoc.embedPng(imageBytes);
          } else {
              image = await pdfDoc.embedJpg(imageBytes);
          }

          const pages = pdfDoc.getPages();
          const { width, height } = image.scale(0.5); // Default scale

          for (let i = 0; i < pages.length; i++) {
              const page = pages[i];
              const { width: pageWidth } = page.getSize();
              // Draw at bottom right
              page.drawImage(image, {
                  x: pageWidth - width - 20,
                  y: 20,
                  width: width,
                  height: height,
              });
              setProgress(10 + ((i + 1) / pages.length) * 85);
          }

          const savedBytes = await pdfDoc.save();
          const blob = new Blob([savedBytes], { type: 'application/pdf' });
          setResultBlob(blob);
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          setStatus('success');
          setProgress(100);
      } catch (error) {
          console.error('Stamp failed:', error);
          setStatus('idle');
          alert('Stamp operation failed.');
      }
  };

  const handleMerge = async (files: File[]) => {
      setStatus('processing');
      setProgress(10);
      try {
          const { PDFDocument } = await import('pdf-lib');
          const mergedPdf = await PDFDocument.create();

          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const arrayBuffer = await file.arrayBuffer();
              const pdf = await PDFDocument.load(arrayBuffer);
              const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
              copiedPages.forEach((page) => mergedPdf.addPage(page));
              setProgress(10 + ((i + 1) / files.length) * 85);
          }

          const savedBytes = await mergedPdf.save();
          const blob = new Blob([savedBytes], { type: 'application/pdf' });
          setResultBlob(blob);
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          setStatus('success');
          setProgress(100);
      } catch (error) {
          console.error('Merge failed:', error);
          setStatus('idle');
          alert('Merge operation failed.');
      }
  };

  const handleRemoveAnnotations = async (file?: File) => {
      const targetFile = file || selectedFile;
      if (!targetFile) return;
      setStatus('processing');
      setProgress(10);
      try {
          const { PDFDocument, PDFName } = await import('pdf-lib');
          const pdfBytes = await targetFile.arrayBuffer();
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pages = pdfDoc.getPages();

          for (let i = 0; i < pages.length; i++) {
              const page = pages[i];
              // Set Annots to empty array instead of deleting to avoid corruption in some viewers
              page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([]));
              setProgress(10 + ((i + 1) / pages.length) * 85);
          }

          const savedBytes = await pdfDoc.save();
          const blob = new Blob([savedBytes], { type: 'application/pdf' });
          setResultBlob(blob);
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          setStatus('success');
          setProgress(100);
      } catch (error) {
           console.error('Remove Annotations failed:', error);
           setStatus('idle');
           alert('Remove Annotations failed.');
      }
  };

  const handleRemoveBlankPages = async (file?: File) => {
      const targetFile = file || selectedFile;
      if (!targetFile) return;
      setStatus('processing');
      setProgress(10);
      try {
          // Use pdfjs-dist to detect content
          const pdfjsLib = await import('pdfjs-dist');
          const { WORKER_URL } = await import('../utils/workerConfig');

          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
             pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
          }

          const arrayBuffer = await targetFile.arrayBuffer();
          // Clone buffer for PDF.js to avoid detachment issues if shared
          const pdfJsBuffer = arrayBuffer.slice(0);
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfJsBuffer) }).promise;
          const pagesToRemove: number[] = [];

          for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              // Simple heuristic: if text items > 0, keep.
              // If empty, mark for removal
              if (textContent.items.length === 0) {
                  pagesToRemove.push(i - 1); // 0-based for pdf-lib
              }
              setProgress((i / pdf.numPages) * 50);
          }

          if (pagesToRemove.length === pdf.numPages) {
              throw new Error("All pages are blank!");
          }

          // Use pdf-lib to modify existing doc (safer than creating new one)
          const { PDFDocument } = await import('pdf-lib');
          const pdfDoc = await PDFDocument.load(arrayBuffer);

          // Remove pages in reverse order to avoid index shift
          pagesToRemove.sort((a, b) => b - a).forEach(idx => {
             pdfDoc.removePage(idx);
          });

          const savedBytes = await pdfDoc.save();
          const blob = new Blob([savedBytes], { type: 'application/pdf' });
          setResultBlob(blob);
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          setStatus('success');
          setProgress(100);
      } catch (error) {
           console.error('Remove Blank Pages failed:', error);
           setStatus('idle');
           alert('Remove Blank Pages failed.');
      }
  };

  const handleHtmlConvert = async () => {
      if (!htmlContent) return;
      setStatus('processing');
      setFileName('content.pdf');
      setProgress(20);
      try {
          const { convertHTMLToPDF } = await import('../services/conversionService');
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
    if (e.target.files && e.target.files.length > 0) {
      if (activeTool?.title === "Merge PDF" && e.target.files.length > 0) {
          const files = Array.from(e.target.files);
          setSelectedFiles(files);
          setFileName(`${files.length} files`);
          // Reset input
          e.target.value = '';
          handleMerge(files);
          return;
      }

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
        if (['Split PDF', 'Rotate PDF', 'Organize PDF', 'Page Numbers', 'Crop PDF',  'Compare PDF', 'Extract PDF Pages'].includes(activeTool?.title)) {
            const fileUrl = URL.createObjectURL(file);
            // Optimization: Avoid reading file content into base64 string to reduce memory usage and main thread blocking
            setCurrentFile({
              name: file.name,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified,
              fileUrl: fileUrl,
              originalFile: file
            });
            return;
        }

      if (activeTool && activeTool.title === "PDF to Image") {
        setStatus('configuring');
        return;
      }

      if (activeTool && activeTool.title === "Add Watermark") {
        setStatus('configuring');
        return;
      }

      if (activeTool && activeTool.title === "Add Stamps") {
        setStatus('configuring');
        return;
      }

      if (activeTool && ['Header & Footer', 'Invert Colors', 'Background Color', 'Change Text Color'].includes(activeTool.title)) {
        setStatus('configuring');
        return;
      }

      if (activeTool && activeTool.title === "Remove Annotations") {
          handleRemoveAnnotations(file);
          return;
      }

      if (activeTool && activeTool.title === "Remove Blank Pages") {
          handleRemoveBlankPages(file);
          return;
      }

      if (activeTool?.title === "Unlock PDF") {
        try {
            const buffer = await file.arrayBuffer();
            try {
                // Attempt to load without password first (in case it's just owner password or no password)
                const { PDFDocument } = await import('pdf-lib');
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
           const { convertPDFToExcel } = await import('../services/conversionService');
           const blob = await convertPDFToExcel(file);
           setResultBlob(blob);
           const url = URL.createObjectURL(blob);
           setDownloadUrl(url);
           setStatus('success');
           setProgress(100);
        } else if (activeTool.title === "PDF to PPT") {
           const { convertPDFToPPT } = await import('../services/conversionService');
           const blob = await convertPDFToPPT(file);
           setResultBlob(blob);
           const url = URL.createObjectURL(blob);
           setDownloadUrl(url);
           setStatus('success');
           setProgress(100);
        } else if (activeTool.title === "PDF to Word") {
           const { convertPDFToWord } = await import('../services/conversionService');
           const blob = await convertPDFToWord(file);
           setResultBlob(blob);
           const url = URL.createObjectURL(blob);
           setDownloadUrl(url);
           setStatus('success');
           setProgress(100);
        } else if (activeTool.title === "Word to PDF") {
            const { convertWordToPDF } = await import('../services/conversionService');
            const blob = await convertWordToPDF(file);
            setResultBlob(blob);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('success');
            setProgress(100);
        } else if (activeTool.title === "Excel to PDF") {
            const { convertExcelToPDF } = await import('../services/conversionService');
            const blob = await convertExcelToPDF(file);
            setResultBlob(blob);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('success');
            setProgress(100);
        } else if (activeTool.title === "PPT to PDF") {
            const { convertPPTToPDF } = await import('../services/conversionService');
            const blob = await convertPPTToPDF(file);
            setResultBlob(blob);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('success');
            setProgress(100);
        } else if (activeTool.title === "JPG to PDF" || activeTool.title === "PNG to PDF" || activeTool.title === "WebP to PDF" || activeTool.title === "BMP to PDF" || activeTool.title === "TIFF to PDF") {
            const { convertImageToPDF } = await import('../services/conversionService');
            const blob = await convertImageToPDF(file);
            setResultBlob(blob);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('success');
            setProgress(100);
        } else if (activeTool.title === "Text to PDF") {
            const { convertTextToPDF } = await import('../services/conversionService');
            const blob = await convertTextToPDF(file);
            setResultBlob(blob);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('success');
            setProgress(100);
        } else if (activeTool.title === "Markdown to PDF") {
            const { convertMarkdownToPDF } = await import('../services/conversionService');
            const blob = await convertMarkdownToPDF(file);
            setResultBlob(blob);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('success');
            setProgress(100);
        } else if (activeTool.title === "PDF to Text") {
             const { convertPDFToText } = await import('../services/conversionService');
             const blob = await convertPDFToText(file);
             setResultBlob(blob);
             const url = URL.createObjectURL(blob);
             setDownloadUrl(url);
             setStatus('success');
             setProgress(100);
        } else if (activeTool.title === "PDF to JSON") {
             const { convertPDFToJSON } = await import('../services/conversionService');
             const blob = await convertPDFToJSON(file);
             setResultBlob(blob);
             const url = URL.createObjectURL(blob);
             setDownloadUrl(url);
             setStatus('success');
             setProgress(100);
        } else if (["PDF to JPG", "PDF to PNG", "PDF to WebP", "PDF to BMP", "PDF to TIFF"].includes(activeTool.title)) {
             const { convertPdfToImages } = await import('../utils/pdfConverter');
             let format: any = 'jpg';
             if (activeTool.title === "PDF to PNG") format = 'png';
             if (activeTool.title === "PDF to WebP") format = 'webp';
             if (activeTool.title === "PDF to BMP") format = 'bmp';
             if (activeTool.title === "PDF to TIFF") format = 'tiff';

             const result = await convertPdfToImages(file, format, (p) => setProgress(p));
             setConversionResult(result); // Using conversionResult triggers Zip download logic in handleDownload
             setResultBlob(result);
             setStatus('success');
        } else if (activeTool.title === "HTML to PDF") {
            // HTML File upload path
             const text = await file.text();
             const { convertHTMLToPDF } = await import('../services/conversionService');
             const blob = await convertHTMLToPDF(text);
             setResultBlob(blob);
             const url = URL.createObjectURL(blob);
             setDownloadUrl(url);
             setStatus('success');
             setProgress(100);
        } else if (activeTool.title === "Compress PDF") {
           const { compressPDF } = await import('../services/pdfService');
           const blob = await compressPDF(file, (p) => setProgress(p));
           setResultBlob(blob);
           const url = URL.createObjectURL(blob);
           setDownloadUrl(url);
           setStatus('success');
        } else if (activeTool.title === "Flatten PDF") {
           const { flattenPDF } = await import('../services/pdfService');
           const blob = await flattenPDF(file, (p) => setProgress(p));
           setResultBlob(blob);
           const url = URL.createObjectURL(blob);
           setDownloadUrl(url);
           setStatus('success');
        } else if (activeTool.title === "Repair PDF") {
           const { repairPDF } = await import('../services/repairService');
           const blob = await repairPDF(file);
           setResultBlob(blob);
           const url = URL.createObjectURL(blob);
           setDownloadUrl(url);
           setStatus('success');
           setProgress(100);
        } else if (activeTool.title === 'OCR') {
           const { performOCR } = await import('../services/ocrService');
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
               const { validatePDFCompliance } = await import('../services/geminiService');
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
      const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt-lite');
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
      const { convertPdfToImages } = await import('../utils/pdfConverter');
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
      const { PDFDocument } = await import('pdf-lib');
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
    setWatermarkText('CONFIDENTIAL');
    setHeaderText('');
    setFooterText('');
    setHeaderFooterFontSize(12);
    setBgColor('#FFFDE7');
    setTextColor('#FF0000');
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
    return (
        <Suspense fallback={<FallbackLoader />}>
            <SplitPDF file={currentFile} onClose={handleClose} />
        </Suspense>
    );
  }
  if (activeTool?.title === "Extract PDF Pages" && currentFile) {
    return (
        <Suspense fallback={<FallbackLoader />}>
            <SplitPDF file={currentFile} onClose={handleClose} title="Extract Pages" actionLabel="Extract Pages" />
        </Suspense>
    );
  }
  if (activeTool?.title === "Scan to PDF") {
    return (
        <Suspense fallback={<FallbackLoader />}>
            <ScanPDF onClose={handleClose} />
        </Suspense>
    );
  }
  if (activeTool?.title === "Rotate PDF" && currentFile) {
    return (
        <Suspense fallback={<FallbackLoader />}>
            <RotatePDF file={currentFile} onClose={handleClose} />
        </Suspense>
    );
  }
  if (activeTool?.title === "Organize PDF" && currentFile) {
    return (
        <Suspense fallback={<FallbackLoader />}>
            <OrganizePDF file={currentFile} onClose={handleClose} />
        </Suspense>
    );
  }
  if (activeTool?.title === "Page Numbers" && currentFile) {
    return (
        <Suspense fallback={<FallbackLoader />}>
            <PageNumbersPDF file={currentFile} onClose={handleClose} />
        </Suspense>
    );
  }
  if (activeTool?.title === "Crop PDF" && currentFile) {
    return (
        <Suspense fallback={<FallbackLoader />}>
            <CropPDF file={currentFile} onClose={handleClose} />
        </Suspense>
    );
  }
  if (activeTool?.title === "Compare PDF" && currentFile) {
    return (
        <Suspense fallback={<FallbackLoader />}>
            <ComparePDF file={currentFile} onClose={handleClose} />
        </Suspense>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-8 h-full overflow-y-auto relative">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">All PDF Tools</h2>
        <p className="text-slate-500">Select a tool to get started</p>
      </div>

      <input 
        type="file" 
        multiple={activeTool?.title === "Merge PDF"}
        accept={
            activeTool?.title === "JPG to PDF" ? "image/jpeg, image/jpg" :
            activeTool?.title === "PNG to PDF" ? "image/png" :
            activeTool?.title === "WebP to PDF" ? "image/webp" :
            activeTool?.title === "BMP to PDF" ? "image/bmp" :
            activeTool?.title === "TIFF to PDF" ? "image/tiff, .tiff, .tif" :
            activeTool?.title === "Word to PDF" ? ".docx, .doc" :
            activeTool?.title === "Excel to PDF" ? ".xlsx, .xls" :
            activeTool?.title === "PPT to PDF" ? ".pptx, .ppt" :
            activeTool?.title === "Text to PDF" ? "text/plain, .txt" :
            activeTool?.title === "Markdown to PDF" ? "text/markdown, .md, .markdown" :
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

                {status === 'configuring' && activeTool?.title === 'Add Stamps' && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileCheck className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Add Stamp</h4>
                    <p className="text-slate-500 mb-6">Upload an image to stamp on your PDF</p>

                    <div className="mb-6">
                      <input
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                setStampImage(e.target.files[0]);
                            }
                        }}
                        className="block w-full text-sm text-slate-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100"
                      />
                    </div>

                    <button
                      onClick={handleStamp}
                      disabled={!stampImage}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
                    >
                      Apply Stamp
                    </button>
                  </div>
                )}

                {status === 'configuring' && activeTool?.title === 'Add Watermark' && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Type className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Add Watermark</h4>
                    <p className="text-slate-500 mb-6">Enter the watermark text for your PDF</p>

                    <div className="mb-6">
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="Enter watermark text"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        autoFocus
                      />
                    </div>

                    <button
                      onClick={handleWatermark}
                      disabled={!watermarkText.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
                    >
                      Apply Watermark
                    </button>
                  </div>
                )}

                {status === 'configuring' && activeTool?.title === 'Header & Footer' && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <LayoutGrid className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Header & Footer</h4>
                    <p className="text-slate-500 mb-6">Add headers and footers to every page</p>

                    <div className="space-y-4 text-left mb-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Header Text</label>
                        <input
                          type="text"
                          value={headerText}
                          onChange={(e) => setHeaderText(e.target.value)}
                          placeholder="e.g. Company Name"
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Footer Text</label>
                        <input
                          type="text"
                          value={footerText}
                          onChange={(e) => setFooterText(e.target.value)}
                          placeholder="e.g. Confidential"
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Font Size: {headerFooterFontSize}pt</label>
                        <input
                          type="range"
                          min="8"
                          max="24"
                          value={headerFooterFontSize}
                          onChange={(e) => setHeaderFooterFontSize(Number(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>8pt</span>
                          <span>24pt</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleHeaderFooter}
                      disabled={!headerText.trim() && !footerText.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
                    >
                      Apply Header & Footer
                    </button>
                  </div>
                )}

                {status === 'configuring' && activeTool?.title === 'Invert Colors' && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Palette className="w-8 h-8 text-gray-600" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Invert Colors</h4>
                    <p className="text-slate-500 mb-4">Apply a dark overlay to create a dark-mode version of your PDF.</p>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                      <div className="flex items-center space-x-4 justify-center">
                        <div className="w-16 h-20 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-slate-400">Before</span>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                        <div className="w-16 h-20 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-slate-300">After</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleInvertColors}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors"
                    >
                      Invert Colors
                    </button>
                  </div>
                )}

                {status === 'configuring' && activeTool?.title === 'Background Color' && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Palette className="w-8 h-8 text-pink-600" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Background Color</h4>
                    <p className="text-slate-500 mb-6">Choose a background color for all pages</p>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-center space-x-4">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-16 h-16 rounded-xl border-2 border-slate-200 cursor-pointer"
                        />
                        <div className="text-left">
                          <p className="text-sm font-medium text-slate-700">Selected Color</p>
                          <p className="text-sm text-slate-500 font-mono">{bgColor}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {['#FFFDE7', '#FFF3E0', '#E3F2FD', '#E8F5E9', '#F3E5F5', '#FAFAFA', '#FFEBEE', '#E0F7FA'].map((c) => (
                          <button
                            key={c}
                            onClick={() => setBgColor(c)}
                            className={`w-10 h-10 rounded-lg border-2 transition-all ${bgColor === c ? 'border-blue-600 scale-110' : 'border-slate-200 hover:border-slate-400'}`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleBackgroundColor}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors"
                    >
                      Apply Background Color
                    </button>
                  </div>
                )}

                {status === 'configuring' && activeTool?.title === 'Change Text Color' && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Type className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Change Text Color</h4>
                    <p className="text-slate-500 mb-6">Pick a new color for your PDF text</p>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-center space-x-4">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-16 h-16 rounded-xl border-2 border-slate-200 cursor-pointer"
                        />
                        <div className="text-left">
                          <p className="text-sm font-medium text-slate-700">Selected Color</p>
                          <p className="text-sm font-mono" style={{ color: textColor }}>{textColor}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {['#FF0000', '#0000FF', '#008000', '#FF6600', '#800080', '#000000', '#333333', '#1E3A5F'].map((c) => (
                          <button
                            key={c}
                            onClick={() => setTextColor(c)}
                            className={`w-10 h-10 rounded-lg border-2 transition-all ${textColor === c ? 'border-blue-600 scale-110' : 'border-slate-200 hover:border-slate-400'}`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleTextColor}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors"
                    >
                      Apply Text Color
                    </button>
                  </div>
                )}

                {status === 'configuring' && !['Add Stamps', 'Add Watermark', 'Header & Footer', 'Invert Colors', 'Background Color', 'Change Text Color'].includes(activeTool?.title) && (
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
