import express from 'express';
import fs from 'fs';

const router = express.Router();

let puppeteerModule = null;
let puppeteerLoadError = null;
const loadPuppeteer = async () => {
  if (!puppeteerModule) {
    try {
      puppeteerModule = await import('puppeteer-core');
    } catch (e) {
      puppeteerLoadError = e.message;
      console.warn('puppeteer-core load failed:', e.message);
      puppeteerModule = null;
    }
  }
  return puppeteerModule ? (puppeteerModule.default || puppeteerModule) : null;
};

// Auto-detect Chrome or Edge executable on Windows/Linux/Mac
const getExecutablePath = () => {
  const candidatePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ].filter(Boolean);

  for (const path of candidatePaths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  return null;
};

let browserInstance = null;
const getBrowser = async () => {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  const puppeteer = await loadPuppeteer();
  if (!puppeteer) {
    throw new Error(`Puppeteer is not available on this server environment: ${puppeteerLoadError || 'unknown'}`);
  }
  const execPath = getExecutablePath();
  if (!execPath) {
    throw new Error('Chrome/Edge executable not found on the host machine.');
  }

  browserInstance = await puppeteer.launch({
    executablePath: execPath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none'
    ]
  });
  return browserInstance;
};

router.post('/generate-pdf', async (req, res) => {
  let page = null;
  try {
    const { html, filename = 'document.pdf', format = 'A4', orientation = 'portrait' } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    const browser = await getBrowser();
    page = await browser.newPage();

    // Set viewport matching standard page width
    const isLandscape = orientation === 'landscape';
    await page.setViewport({
      width: isLandscape ? 1123 : 794,
      height: isLandscape ? 794 : 1123,
      deviceScaleFactor: 2
    });

    // Load full HTML with print media emulation
    await page.setContent(html, {
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 30000
    });

    await page.emulateMediaType('print');

    // Generate pristine vector PDF directly from Chromium
    const pdfBuffer = await page.pdf({
      format: format,
      landscape: isLandscape,
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      preferCSSPageSize: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {}
    }
  }
});

export default router;
