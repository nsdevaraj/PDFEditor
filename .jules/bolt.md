## 2024-05-23 - [Massive ToolsGrid Chunk]
**Learning:** The `ToolsGrid` component compiles to a 2.5MB chunk, likely due to importing every single PDF tool and their associated libraries (pdf-lib, jspdf, office converters) all at once.
**Action:** Always lazy load `ToolsGrid` in the main routing. Future optimization: code-split individual tools *within* `ToolsGrid` so users only download the specific tool they are using (e.g. "PDF to Word").
