import {
    compressPDF,
    flattenPDF,
    mergePDFs,
    splitPDF,
    extractPages,
    organizePDF,
    rotatePDF,
    addPageNumbers,
    protectPDF,
    unlockPDF,
    repairPDF,
    validatePDFA,
    cropPDF
} from './services/pdfService';
import { performOCR } from './services/ocrService';
import {
  convertPDFToExcel,
  convertPDFToPPT,
  convertPDFToWord,
  convertWordToPDF,
  convertExcelToPDF,
  convertPPTToPDF,
  convertImageToPDF
} from './services/conversionService';
import { convertPdfToImages } from './utils/pdfConverter';

// Helper to trigger download
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper to create a file input and wait for selection
function selectFile(accept: string, multiple: boolean = false): Promise<File | File[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = () => {
      if (multiple) {
          const files = input.files ? Array.from(input.files) : null;
          resolve(files);
      } else {
          const file = input.files ? input.files[0] : null;
          resolve(file);
      }
      document.body.removeChild(input);
    };
    input.oncancel = () => {
        resolve(null);
        document.body.removeChild(input);
    }
    input.click();
  });
}

// Helper to get current PDF as File
function getCurrentPdfFile(pdfBytes: Uint8Array | null, filename: string = 'document.pdf'): File | null {
  if (!pdfBytes || pdfBytes.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new File([pdfBytes as any], filename, { type: 'application/pdf' });
}

export function initToolsUI(
  getPdfBytes: () => Promise<Uint8Array | null>,
  showLoading: (text: string) => void,
  hideLoading: () => void,
  showError: (msg: string) => void
) {
  const toolsBtn = document.getElementById('tools-btn');
  const toolsModal = document.getElementById('tools-modal');
  const closeToolsBtn = document.getElementById('close-tools-btn');
  const toolsList = document.getElementById('tools-list');

  if (!toolsBtn || !toolsModal || !closeToolsBtn || !toolsList) {
    console.error('Tools UI elements not found');
    return;
  }

  toolsBtn.style.display = 'flex'; // Show the button

  toolsBtn.onclick = () => {
    toolsModal.style.display = 'flex';
  };

  closeToolsBtn.onclick = () => {
    toolsModal.style.display = 'none';
  };

  toolsModal.onclick = (e) => {
    if (e.target === toolsModal) {
      toolsModal.style.display = 'none';
    }
  };

  const tools = [
    {
        name: 'Merge PDF',
        description: 'Combine multiple PDFs',
        action: async () => {
            const files = await selectFile('.pdf', true) as File[];
            if (!files || files.length < 2) return showError("Select at least 2 PDF files");
            showLoading('Merging PDFs...');
            try {
                const blob = await mergePDFs(files);
                downloadBlob(blob, 'merged.pdf');
            } catch (e) {
                showError(`Merge failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
        name: 'Split PDF',
        description: 'Split by page ranges',
        action: async () => {
            const bytes = await getPdfBytes();
            const file = getCurrentPdfFile(bytes);
            if (!file) return showError('No PDF loaded');
            const ranges = window.prompt("Enter page ranges to split (e.g. '1-3, 5, 7-9'):");
            if (!ranges) return;
            showLoading('Splitting PDF...');
            try {
                const blob = await splitPDF(file, ranges);
                downloadBlob(blob, 'split.pdf');
            } catch (e) {
                showError(`Split failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
      name: 'Compress PDF',
      description: 'Reduce PDF file size',
      action: async () => {
        const bytes = await getPdfBytes();
        const file = getCurrentPdfFile(bytes);
        if (!file) return showError('No PDF loaded');
        showLoading('Compressing PDF...');
        try {
          const blob = await compressPDF(file, (p) => showLoading(`Compressing: ${Math.round(p)}%`));
          downloadBlob(blob, 'compressed.pdf');
        } catch (e) {
          showError(`Compression failed: ${e}`);
        } finally {
          hideLoading();
        }
      }
    },
    {
        name: 'Protect PDF',
        description: 'Add password protection',
        action: async () => {
            const bytes = await getPdfBytes();
            const file = getCurrentPdfFile(bytes);
            if (!file) return showError('No PDF loaded');
            const password = window.prompt("Enter password to protect PDF:");
            if (!password) return;
            showLoading('Protecting PDF...');
            try {
                const blob = await protectPDF(file, password);
                downloadBlob(blob, 'protected.pdf');
            } catch (e) {
                showError(`Protection failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
        name: 'Unlock PDF',
        description: 'Remove password',
        action: async () => {
            // Note: Current file in viewer is already decrypted by PDF.js if it was password protected.
            // But if we want to process a fresh file:
            const file = await selectFile('.pdf') as File;
            if (!file) return;
            const password = window.prompt("Enter password to unlock PDF:");
            if (!password) return;
            showLoading('Unlocking PDF...');
            try {
                const blob = await unlockPDF(file, password);
                downloadBlob(blob, 'unlocked.pdf');
            } catch (e) {
                showError(`Unlock failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
      name: 'OCR PDF',
      description: 'Recognize text in scanned PDF',
      action: async () => {
        const bytes = await getPdfBytes();
        const file = getCurrentPdfFile(bytes);
        if (!file) return showError('No PDF loaded');
        showLoading('Initializing OCR...');
        try {
          const blob = await performOCR(file, (p) => showLoading(`OCR Processing: ${Math.round(p)}%`));
          downloadBlob(blob, 'ocr_result.pdf');
        } catch (e) {
          showError(`OCR failed: ${e}`);
        } finally {
          hideLoading();
        }
      }
    },
    {
        name: 'Validate PDF/A',
        description: 'Check for PDF/A compliance',
        action: async () => {
            const bytes = await getPdfBytes();
            const file = getCurrentPdfFile(bytes);
            if (!file) return showError('No PDF loaded');
            showLoading('Validating...');
            try {
                const isValid = await validatePDFA(file);
                alert(isValid ? "Valid PDF/A Metadata found." : "Not a valid PDF/A (or metadata missing).");
            } catch (e) {
                showError(`Validation failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
        name: 'Extract Pages',
        description: 'Extract specific pages',
        action: async () => {
            const bytes = await getPdfBytes();
            const file = getCurrentPdfFile(bytes);
            if (!file) return showError('No PDF loaded');
            const ranges = window.prompt("Enter page numbers to extract (e.g. '1, 3, 5-7'):");
            if (!ranges) return;
            showLoading('Extracting pages...');
            try {
                const blob = await extractPages(file, ranges);
                downloadBlob(blob, 'extracted.pdf');
            } catch (e) {
                showError(`Extraction failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
        name: 'JPG to PDF',
        description: 'Convert JPG/PNG to PDF',
        action: async () => {
             const file = await selectFile('image/jpeg, image/png') as File;
             if (!file) return;
             showLoading('Converting Image to PDF...');
             try {
                 const blob = await convertImageToPDF(file);
                 downloadBlob(blob, file.name + '.pdf');
             } catch (e) {
                 showError(`Conversion failed: ${e}`);
             } finally {
                 hideLoading();
             }
        }
    },
    {
        name: 'Rotate PDF',
        description: 'Rotate pages',
        action: async () => {
            const bytes = await getPdfBytes();
            const file = getCurrentPdfFile(bytes);
            if (!file) return showError('No PDF loaded');
            const angleStr = window.prompt("Enter rotation angle (90, 180, 270):", "90");
            if (!angleStr) return;
            const angle = parseInt(angleStr);
            if (isNaN(angle)) return showError("Invalid angle");

            showLoading('Rotating PDF...');
            try {
                const blob = await rotatePDF(file, angle);
                downloadBlob(blob, 'rotated.pdf');
            } catch (e) {
                showError(`Rotation failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
        name: 'Organize PDF',
        description: 'Reorder pages',
        action: async () => {
            const bytes = await getPdfBytes();
            const file = getCurrentPdfFile(bytes);
            if (!file) return showError('No PDF loaded');
            const orderStr = window.prompt("Enter new page order (comma separated, e.g. '3, 1, 2'):");
            if (!orderStr) return;
            const order = orderStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

            showLoading('Organizing PDF...');
            try {
                const blob = await organizePDF(file, order);
                downloadBlob(blob, 'organized.pdf');
            } catch (e) {
                showError(`Organize failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
        name: 'Page Numbers',
        description: 'Add page numbers',
        action: async () => {
            const bytes = await getPdfBytes();
            const file = getCurrentPdfFile(bytes);
            if (!file) return showError('No PDF loaded');
            showLoading('Adding page numbers...');
            try {
                const blob = await addPageNumbers(file);
                downloadBlob(blob, 'numbered.pdf');
            } catch (e) {
                showError(`Failed to add page numbers: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
        name: 'Crop PDF',
        description: 'Crop pages (auto-margin)',
        action: async () => {
            const bytes = await getPdfBytes();
            const file = getCurrentPdfFile(bytes);
            if (!file) return showError('No PDF loaded');
            if (!confirm("This will crop 50 units from all sides as a demo. Continue?")) return;

            showLoading('Cropping PDF...');
            try {
                const blob = await cropPDF(file);
                downloadBlob(blob, 'cropped.pdf');
            } catch (e) {
                showError(`Crop failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
        name: 'Repair PDF',
        description: 'Attempt to repair corrupted PDF',
        action: async () => {
            const file = await selectFile('.pdf') as File;
            if (!file) return;
            showLoading('Repairing PDF...');
            try {
                const blob = await repairPDF(file);
                downloadBlob(blob, 'repaired.pdf');
            } catch (e) {
                showError(`Repair failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
      name: 'Flatten PDF',
      description: 'Flatten layers and forms',
      action: async () => {
        const bytes = await getPdfBytes();
        const file = getCurrentPdfFile(bytes);
        if (!file) return showError('No PDF loaded');
        showLoading('Flattening PDF...');
        try {
          const blob = await flattenPDF(file, (p) => showLoading(`Flattening: ${Math.round(p)}%`));
          downloadBlob(blob, 'flattened.pdf');
        } catch (e) {
          showError(`Flattening failed: ${e}`);
        } finally {
          hideLoading();
        }
      }
    },
    {
      name: 'Convert to Excel',
      description: 'Extract tables to Excel',
      action: async () => {
        const bytes = await getPdfBytes();
        const file = getCurrentPdfFile(bytes);
        if (!file) return showError('No PDF loaded');
        showLoading('Converting to Excel...');
        try {
          const blob = await convertPDFToExcel(file);
          downloadBlob(blob, 'converted.xlsx');
        } catch (e) {
          showError(`Conversion failed: ${e}`);
        } finally {
          hideLoading();
        }
      }
    },
    {
      name: 'Convert to Word',
      description: 'Convert PDF to Word DOCX',
      action: async () => {
        const bytes = await getPdfBytes();
        const file = getCurrentPdfFile(bytes);
        if (!file) return showError('No PDF loaded');
        showLoading('Converting to Word...');
        try {
          const blob = await convertPDFToWord(file);
          downloadBlob(blob, 'converted.docx');
        } catch (e) {
          showError(`Conversion failed: ${e}`);
        } finally {
          hideLoading();
        }
      }
    },
    {
      name: 'Convert to PPT',
      description: 'Convert PDF to PowerPoint',
      action: async () => {
        const bytes = await getPdfBytes();
        const file = getCurrentPdfFile(bytes);
        if (!file) return showError('No PDF loaded');
        showLoading('Converting to PPT...');
        try {
          const blob = await convertPDFToPPT(file);
          downloadBlob(blob, 'converted.pptx');
        } catch (e) {
          showError(`Conversion failed: ${e}`);
        } finally {
          hideLoading();
        }
      }
    },
    {
      name: 'PDF to Images',
      description: 'Save pages as images (ZIP)',
      action: async () => {
        const bytes = await getPdfBytes();
        const file = getCurrentPdfFile(bytes);
        if (!file) return showError('No PDF loaded');

        // Simple prompt for format
        const format = window.confirm('Click OK for PNG, Cancel for JPG') ? 'png' : 'jpg';

        showLoading('Converting to Images...');
        try {
          const blob = await convertPdfToImages(file, format, (p) => showLoading(`Converting: ${Math.round(p)}%`));
          downloadBlob(blob, 'images.zip');
        } catch (e) {
          showError(`Conversion failed: ${e}`);
        } finally {
          hideLoading();
        }
      }
    },
    {
        name: 'Word to PDF',
        description: 'Convert DOCX file to PDF',
        action: async () => {
            const file = await selectFile('.docx') as File;
            if (!file) return;
            showLoading('Converting Word to PDF...');
            try {
                const blob = await convertWordToPDF(file);
                downloadBlob(blob, file.name.replace(/\.docx$/i, '.pdf'));
            } catch (e) {
                showError(`Conversion failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
        name: 'Excel to PDF',
        description: 'Convert XLSX file to PDF',
        action: async () => {
            const file = await selectFile('.xlsx, .xls') as File;
            if (!file) return;
            showLoading('Converting Excel to PDF...');
            try {
                const blob = await convertExcelToPDF(file);
                downloadBlob(blob, file.name.replace(/\.xlsx$/i, '.pdf'));
            } catch (e) {
                showError(`Conversion failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    },
    {
        name: 'PPT to PDF',
        description: 'Convert PPTX file to PDF',
        action: async () => {
            const file = await selectFile('.pptx') as File;
            if (!file) return;
            showLoading('Converting PPT to PDF...');
            try {
                const blob = await convertPPTToPDF(file);
                downloadBlob(blob, file.name.replace(/\.pptx$/i, '.pdf'));
            } catch (e) {
                showError(`Conversion failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    }
  ];

  // Render tools
  toolsList.innerHTML = '';
  tools.forEach(tool => {
    const btn = document.createElement('div');
    btn.className = 'tool-card';
    btn.innerHTML = `
      <div class="tool-name">${tool.name}</div>
      <div class="tool-desc">${tool.description}</div>
    `;
    btn.onclick = () => {
      toolsModal.style.display = 'none';
      tool.action();
    };
    toolsList.appendChild(btn);
  });
}
