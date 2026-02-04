import { chromium } from 'playwright';

(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    // Increase size: Double A4
    await page.setViewportSize({ width: 4960, height: 7016 });

    // Add random noise/text to make it less compressible
    await page.evaluate(() => {
        document.body.style.margin = '0';
        document.body.style.background = 'white';
        const canvas = document.createElement('canvas');
        canvas.width = 4960;
        canvas.height = 7016;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw random colored rectangles
        for (let i = 0; i < 5000; i++) {
            ctx.fillStyle = `rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`;
            ctx.fillRect(Math.random() * 4960, Math.random() * 7016, Math.random() * 100 + 50, Math.random() * 100 + 50);
        }

        // Draw some text
        ctx.fillStyle = 'black';
        ctx.font = '50px Arial';
        for (let i = 0; i < 1000; i++) {
            ctx.fillText('Performance Test ' + i, Math.random() * 4960, Math.random() * 7016);
        }

        document.body.appendChild(canvas);
    });

    // Quality 90
    await page.screenshot({ path: 'large_sample.jpg', type: 'jpeg', quality: 90 });

    await browser.close();
    console.log('Created larger large_sample.jpg');
  } catch (error) {
    console.error('Error creating image:', error);
    process.exit(1);
  }
})();
