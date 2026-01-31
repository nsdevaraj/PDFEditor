## 2024-05-23 - [Massive ToolsGrid Chunk]
**Learning:** The `ToolsGrid` component compiles to a 2.5MB chunk, likely due to importing every single PDF tool and their associated libraries (pdf-lib, jspdf, office converters) all at once.
**Action:** Always lazy load `ToolsGrid` in the main routing. Future optimization: code-split individual tools *within* `ToolsGrid` so users only download the specific tool they are using (e.g. "PDF to Word").
## 2024-05-24 - [PDF Flattening Optimization]
**Learning:** The `flattenPDF` function was buffering all rendered pages in memory before assembly, unlike `compressPDF` which used interleaved assembly. This caused higher peak memory usage and delayed PDF generation.
**Action:** When implementing parallel processing pipelines, always prefer "Interleaved Assembly" (process & flush) over "Batch & Assemble" to minimize memory footprint and improve perceived performance.
## 2024-05-25 - [Static Imports in Utility Functions]
**Learning:** Even if components are lazy-loaded, utility functions with static imports (like `convertPdfToImages` importing `pdfjs-dist`) can cause heavy dependencies to be bundled into the parent chunk (`ToolsGrid`), defeating the purpose of code splitting.
**Action:** Always use dynamic imports (`await import(...)`) for heavy libraries inside utility functions that are not used immediately on page load.
