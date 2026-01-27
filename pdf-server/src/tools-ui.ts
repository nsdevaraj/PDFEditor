import { compressPDF, flattenPDF } from './services/pdfService';
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
function selectFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files ? input.files[0] : null;
      resolve(file);
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
  if (!pdfBytes) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new File([pdfBytes as any], filename, { type: 'application/pdf' });
}

export function initToolsUI(
  getPdfBytes: () => Uint8Array | null,
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
      name: 'Compress PDF',
      description: 'Reduce PDF file size',
      action: async () => {
        const file = getCurrentPdfFile(getPdfBytes());
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
      name: 'Flatten PDF',
      description: 'Flatten layers and forms',
      action: async () => {
        const file = getCurrentPdfFile(getPdfBytes());
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
      name: 'OCR PDF',
      description: 'Recognize text in scanned PDF',
      action: async () => {
        const file = getCurrentPdfFile(getPdfBytes());
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
      name: 'Convert to Excel',
      description: 'Extract tables to Excel',
      action: async () => {
        const file = getCurrentPdfFile(getPdfBytes());
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
        const file = getCurrentPdfFile(getPdfBytes());
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
        const file = getCurrentPdfFile(getPdfBytes());
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
        const file = getCurrentPdfFile(getPdfBytes());
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
            const file = await selectFile('.docx');
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
            const file = await selectFile('.xlsx, .xls');
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
            const file = await selectFile('.pptx');
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
    },
    {
        name: 'Image to PDF',
        description: 'Convert Image file to PDF',
        action: async () => {
            const file = await selectFile('image/*');
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
