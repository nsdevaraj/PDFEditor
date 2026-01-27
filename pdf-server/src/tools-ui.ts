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
  // URL.revokeObjectURL(url); // Don't revoke immediately to allow manual click backup if needed
  setTimeout(() => URL.revokeObjectURL(url), 60000);
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

interface ToolDef {
    name: string;
    description: string;
    action?: () => Promise<void>;
    renderUI?: (container: HTMLElement, back: () => void) => void;
}

export function initToolsUI(
  getPdfBytes: () => Promise<Uint8Array | null>,
  showLoading: (text: string) => void,
  hideLoading: () => void,
  showError: (msg: string) => void,
  saveFile?: (filename: string, blob: Blob) => Promise<void>
) {
  const toolsBtn = document.getElementById('tools-btn');
  const toolsModal = document.getElementById('tools-modal');
  const closeToolsBtn = document.getElementById('close-tools-btn');
  const toolsList = document.getElementById('tools-list');
  const modalHeader = toolsModal?.querySelector('.modal-header h3');

  if (!toolsBtn || !toolsModal || !closeToolsBtn || !toolsList) {
    console.error('Tools UI elements not found');
    return;
  }

  // Helper to reset to list view
  const showList = () => {
      toolsList.innerHTML = '';
      if (modalHeader) modalHeader.textContent = 'PDF Tools';
      renderToolsList();
  };

  toolsBtn.style.display = 'flex';

  toolsBtn.onclick = () => {
    toolsModal.style.display = 'flex';
    showList();
  };

  closeToolsBtn.onclick = () => {
    toolsModal.style.display = 'none';
  };

  toolsModal.onclick = (e) => {
    if (e.target === toolsModal) {
      toolsModal.style.display = 'none';
    }
  };

  // NEW: Success View Helper
  const renderSuccessView = (blob: Blob, filename: string, back: () => void) => {
      toolsList.innerHTML = '';
      if (modalHeader) modalHeader.textContent = 'Success';

      const container = document.createElement('div');
      container.className = 'tool-view-container';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.padding = '2rem';
      container.style.textAlign = 'center';

      container.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
        <h3 style="margin: 0 0 1rem 0; color: var(--text000);">Processing Complete</h3>
        <p style="color: var(--text100); margin-bottom: 2rem;">Your file has been processed successfully.</p>
        <button id="download-result-btn" class="tool-action-btn primary" style="margin-bottom: 1rem; width: 100%;">Download File</button>
        ${saveFile ? `<button id="save-host-btn" class="tool-action-btn secondary" style="margin-bottom: 1rem; width: 100%;">Save to Host</button>` : ''}
        <button id="back-to-tools-btn" class="nav-btn">Back to Tools</button>
      `;

      const downloadBtn = container.querySelector('#download-result-btn') as HTMLButtonElement;
      const backBtn = container.querySelector('#back-to-tools-btn') as HTMLButtonElement;
      const saveBtn = container.querySelector('#save-host-btn') as HTMLButtonElement;

      downloadBtn.onclick = () => {
          downloadBlob(blob, filename);
      };

      if (saveBtn) {
          saveBtn.onclick = async () => {
              if (saveFile) {
                  showLoading('Saving to host...');
                  try {
                      await saveFile(filename, blob);
                      alert(`Saved ${filename} to host.`);
                  } catch (e) {
                      showError(`Save failed: ${e}`);
                  } finally {
                      hideLoading();
                  }
              }
          };
      }

      backBtn.onclick = back;

      toolsList.appendChild(container);

      // Auto-trigger download as well, just in case it works
      downloadBlob(blob, filename);
  };

  const renderToolView = (tool: ToolDef) => {
      toolsList.innerHTML = ''; // Clear list
      if (modalHeader) modalHeader.textContent = tool.name;

      const container = document.createElement('div');
      container.className = 'tool-view-container';
      container.style.padding = '1rem';

      const backBtn = document.createElement('button');
      backBtn.textContent = '← Back';
      backBtn.className = 'nav-btn'; // Reuse style or add new
      backBtn.style.marginBottom = '1rem';
      backBtn.onclick = showList;

      const content = document.createElement('div');
      content.className = 'tool-content';

      container.appendChild(backBtn);
      container.appendChild(content);
      toolsList.appendChild(container);

      if (tool.renderUI) {
          tool.renderUI(content, showList);
      }
  };

  const tools: ToolDef[] = [
    {
        name: 'Merge PDF',
        description: 'Combine multiple PDFs',
        renderUI: (container, back) => {
            container.innerHTML = `
                <p>Select PDF files to merge (in order):</p>
                <div id="file-list" style="margin: 10px 0; border: 1px solid #ddd; padding: 10px; min-height: 50px;"></div>
                <button id="add-files-btn" class="tool-action-btn">Add Files</button>
                <button id="merge-btn" class="tool-action-btn primary" style="margin-left: 10px;">Merge</button>
            `;
            const fileListEl = container.querySelector('#file-list') as HTMLElement;
            const addBtn = container.querySelector('#add-files-btn') as HTMLButtonElement;
            const mergeBtn = container.querySelector('#merge-btn') as HTMLButtonElement;

            let selectedFiles: File[] = [];

            const renderFiles = () => {
                fileListEl.innerHTML = selectedFiles.map((f, i) => `
                    <div style="display: flex; justify-content: space-between; padding: 4px; background: #f5f5f5; margin-bottom: 4px;">
                        <span>${i+1}. ${f.name}</span>
                        <span style="cursor: pointer; color: red;" data-idx="${i}">×</span>
                    </div>
                `).join('');

                fileListEl.querySelectorAll('span[data-idx]').forEach(el => {
                    (el as HTMLElement).onclick = (e) => {
                        const idx = parseInt((e.target as HTMLElement).dataset.idx || '0');
                        selectedFiles.splice(idx, 1);
                        renderFiles();
                    };
                });
            };

            addBtn.onclick = async () => {
                const files = await selectFile('.pdf', true) as File[] | null;
                if (files) {
                    selectedFiles = [...selectedFiles, ...files];
                    renderFiles();
                }
            };

            mergeBtn.onclick = async () => {
                if (selectedFiles.length < 2) return alert("Please select at least 2 files.");
                showLoading('Merging PDFs...');
                try {
                    const blob = await mergePDFs(selectedFiles);
                    renderSuccessView(blob, 'merged.pdf', back);
                } catch (e) {
                    showError(`Merge failed: ${e}`);
                } finally {
                    hideLoading();
                }
            };
        }
    },
    {
        name: 'Split PDF',
        description: 'Split by page ranges',
        renderUI: (container, back) => {
            container.innerHTML = `
                <p>Enter page ranges to extract (e.g. '1-3, 5, 7-9'):</p>
                <input type="text" id="split-ranges" class="tool-input" placeholder="1-5" style="width: 100%; padding: 8px; margin: 10px 0;">
                <button id="split-btn" class="tool-action-btn primary">Split PDF</button>
            `;
            const input = container.querySelector('#split-ranges') as HTMLInputElement;
            const btn = container.querySelector('#split-btn') as HTMLButtonElement;

            btn.onclick = async () => {
                const ranges = input.value;
                if (!ranges) return alert("Please enter a range.");

                const bytes = await getPdfBytes();
                const file = getCurrentPdfFile(bytes);
                if (!file) return showError('No PDF loaded');

                showLoading('Splitting PDF...');
                try {
                    const blob = await splitPDF(file, ranges);
                    renderSuccessView(blob, 'split.pdf', back);
                } catch (e) {
                    showError(`Split failed: ${e}`);
                } finally {
                    hideLoading();
                }
            };
        }
    },
    {
        name: 'Extract Pages',
        description: 'Extract specific pages',
        renderUI: (container, back) => {
            container.innerHTML = `
                <p>Enter page numbers/ranges to extract:</p>
                <input type="text" id="extract-ranges" class="tool-input" placeholder="1, 3, 5-7" style="width: 100%; padding: 8px; margin: 10px 0;">
                <button id="extract-btn" class="tool-action-btn primary">Extract</button>
            `;
            const input = container.querySelector('#extract-ranges') as HTMLInputElement;
            const btn = container.querySelector('#extract-btn') as HTMLButtonElement;

            btn.onclick = async () => {
                const ranges = input.value;
                if (!ranges) return alert("Please enter ranges.");

                const bytes = await getPdfBytes();
                const file = getCurrentPdfFile(bytes);
                if (!file) return showError('No PDF loaded');

                showLoading('Extracting pages...');
                try {
                    const blob = await extractPages(file, ranges);
                    renderSuccessView(blob, 'extracted.pdf', back);
                } catch (e) {
                    showError(`Extraction failed: ${e}`);
                } finally {
                    hideLoading();
                }
            };
        }
    },
    {
        name: 'Organize PDF',
        description: 'Reorder pages',
        renderUI: (container, back) => {
            container.innerHTML = `
                <p>Enter new page order (comma separated):</p>
                <input type="text" id="organize-order" class="tool-input" placeholder="3, 1, 2" style="width: 100%; padding: 8px; margin: 10px 0;">
                <button id="organize-btn" class="tool-action-btn primary">Reorder</button>
            `;
            const input = container.querySelector('#organize-order') as HTMLInputElement;
            const btn = container.querySelector('#organize-btn') as HTMLButtonElement;

            btn.onclick = async () => {
                const orderStr = input.value;
                if (!orderStr) return alert("Please enter order.");
                const order = orderStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                if (order.length === 0) return alert("Invalid order.");

                const bytes = await getPdfBytes();
                const file = getCurrentPdfFile(bytes);
                if (!file) return showError('No PDF loaded');

                showLoading('Organizing PDF...');
                try {
                    const blob = await organizePDF(file, order);
                    renderSuccessView(blob, 'organized.pdf', back);
                } catch (e) {
                    showError(`Organize failed: ${e}`);
                } finally {
                    hideLoading();
                }
            };
        }
    },
    {
        name: 'Rotate PDF',
        description: 'Rotate pages',
        renderUI: (container, back) => {
            container.innerHTML = `
                <p>Select rotation angle:</p>
                <div style="display: flex; gap: 10px; margin: 10px 0;">
                    <button class="rotate-opt tool-action-btn" data-angle="90">90° CW</button>
                    <button class="rotate-opt tool-action-btn" data-angle="180">180°</button>
                    <button class="rotate-opt tool-action-btn" data-angle="270">90° CCW</button>
                </div>
            `;

            container.querySelectorAll('.rotate-opt').forEach(btn => {
                (btn as HTMLElement).onclick = async () => {
                    const angle = parseInt((btn as HTMLElement).dataset.angle || '0');

                    const bytes = await getPdfBytes();
                    const file = getCurrentPdfFile(bytes);
                    if (!file) return showError('No PDF loaded');

                    showLoading('Rotating PDF...');
                    try {
                        const blob = await rotatePDF(file, angle);
                        renderSuccessView(blob, 'rotated.pdf', back);
                    } catch (e) {
                        showError(`Rotation failed: ${e}`);
                    } finally {
                        hideLoading();
                    }
                };
            });
        }
    },
    {
        name: 'Protect PDF',
        description: 'Add password protection',
        renderUI: (container, back) => {
            container.innerHTML = `
                <p>Enter password to protect PDF:</p>
                <input type="password" id="protect-pw" class="tool-input" style="width: 100%; padding: 8px; margin: 10px 0;">
                <button id="protect-btn" class="tool-action-btn primary">Protect</button>
            `;
            const input = container.querySelector('#protect-pw') as HTMLInputElement;
            const btn = container.querySelector('#protect-btn') as HTMLButtonElement;

            btn.onclick = async () => {
                const password = input.value;
                if (!password) return alert("Please enter a password.");

                const bytes = await getPdfBytes();
                const file = getCurrentPdfFile(bytes);
                if (!file) return showError('No PDF loaded');

                showLoading('Protecting PDF...');
                try {
                    const blob = await protectPDF(file, password);
                    renderSuccessView(blob, 'protected.pdf', back);
                } catch (e) {
                    showError(`Protection failed: ${e}`);
                } finally {
                    hideLoading();
                }
            };
        }
    },
    {
        name: 'Unlock PDF',
        description: 'Remove password',
        renderUI: (container, back) => {
            container.innerHTML = `
                <p>To unlock a PDF, select it from your device:</p>
                <button id="select-unlock-btn" class="tool-action-btn">Select File</button>
                <div id="unlock-step-2" style="display: none; margin-top: 10px;">
                    <p>Enter password:</p>
                    <input type="password" id="unlock-pw" class="tool-input" style="width: 100%; padding: 8px; margin: 10px 0;">
                    <button id="unlock-btn" class="tool-action-btn primary">Unlock</button>
                </div>
            `;
            const selectBtn = container.querySelector('#select-unlock-btn') as HTMLButtonElement;
            const step2 = container.querySelector('#unlock-step-2') as HTMLElement;
            const input = container.querySelector('#unlock-pw') as HTMLInputElement;
            const unlockBtn = container.querySelector('#unlock-btn') as HTMLButtonElement;

            let selectedFile: File | null = null;

            selectBtn.onclick = async () => {
                selectedFile = await selectFile('.pdf') as File;
                if (selectedFile) {
                    selectBtn.textContent = `Selected: ${selectedFile.name}`;
                    step2.style.display = 'block';
                }
            };

            unlockBtn.onclick = async () => {
                if (!selectedFile) return;
                const password = input.value;
                if (!password) return alert("Please enter password.");

                showLoading('Unlocking PDF...');
                try {
                    const blob = await unlockPDF(selectedFile, password);
                    renderSuccessView(blob, 'unlocked.pdf', back);
                } catch (e) {
                    showError(`Unlock failed: ${e}`);
                } finally {
                    hideLoading();
                }
            };
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
          renderSuccessView(blob, 'compressed.pdf', showList);
        } catch (e) {
          showError(`Compression failed: ${e}`);
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
          renderSuccessView(blob, 'ocr_result.pdf', showList);
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
                showList();
            } catch (e) {
                showError(`Validation failed: ${e}`);
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
                 renderSuccessView(blob, file.name + '.pdf', showList);
             } catch (e) {
                 showError(`Conversion failed: ${e}`);
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
                renderSuccessView(blob, 'numbered.pdf', showList);
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
                renderSuccessView(blob, 'cropped.pdf', showList);
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
                renderSuccessView(blob, 'repaired.pdf', showList);
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
          renderSuccessView(blob, 'flattened.pdf', showList);
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
          renderSuccessView(blob, 'converted.xlsx', showList);
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
          renderSuccessView(blob, 'converted.docx', showList);
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
          renderSuccessView(blob, 'converted.pptx', showList);
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
          renderSuccessView(blob, 'images.zip', showList);
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
                renderSuccessView(blob, file.name.replace(/\.docx$/i, '.pdf'), showList);
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
                renderSuccessView(blob, file.name.replace(/\.xlsx$/i, '.pdf'), showList);
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
                renderSuccessView(blob, file.name.replace(/\.pptx$/i, '.pdf'), showList);
            } catch (e) {
                showError(`Conversion failed: ${e}`);
            } finally {
                hideLoading();
            }
        }
    }
  ];

  const renderToolsList = () => {
      toolsList.innerHTML = '';
      tools.forEach(tool => {
        const btn = document.createElement('div');
        btn.className = 'tool-card';
        btn.innerHTML = `
          <div class="tool-name">${tool.name}</div>
          <div class="tool-desc">${tool.description}</div>
        `;
        btn.onclick = () => {
          if (tool.renderUI) {
              renderToolView(tool);
          } else if (tool.action) {
              // Close if simple action
              // toolsModal.style.display = 'none'; // Don't close anymore, render success
              tool.action();
          }
        };
        toolsList.appendChild(btn);
      });
  };

  // Initial render
  renderToolsList();
}
