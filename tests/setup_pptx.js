import PptxGenJS from 'pptxgenjs';
import fs from 'fs';

async function createSamplePptx() {
  const pptx = new PptxGenJS();

  // Add Slide 1
  const slide1 = pptx.addSlide();
  slide1.addText('Sample Presentation', { x: 1, y: 1, fontSize: 24, color: '363636' });
  slide1.addText('Created for testing PPT to PDF conversion', { x: 1, y: 2, fontSize: 18 });

  // Add Slide 2
  const slide2 = pptx.addSlide();
  slide2.addText('Slide 2', { x: 1, y: 1, fontSize: 24 });
  slide2.addText('More content here...', { x: 1, y: 2 });

  const fileName = 'sample.pptx';
  await pptx.writeFile({ fileName: fileName });
  console.log(`${fileName} created successfully`);
}

createSamplePptx().catch(console.error);
