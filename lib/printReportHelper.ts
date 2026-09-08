/**
 * Enterprise Print Engine for Itqan School System.
 * Uses an isolated hidden iframe to guarantee that reports never render blank/white
 * across all browsers (Chrome, Edge, Safari, Firefox, Mobile & Desktop).
 */

export const printElementViaIsolatedFrame = (elementId: string, docTitle = 'كشف حصر ومتابعة تسليمات المهام'): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const targetElement = document.getElementById(elementId);
      if (!targetElement) {
        console.warn(`Print element #${elementId} not found, falling back to window.print`);
        window.print();
        resolve(false);
        return;
      }

      // Collect current document stylesheets
      let collectedStyles = '';
      const styleNodes = document.querySelectorAll('style, link[rel="stylesheet"]');
      styleNodes.forEach((node) => {
        collectedStyles += node.outerHTML + '\n';
      });

      // Get or create dedicated print iframe
      let iframe = document.getElementById('itqan-print-engine-frame') as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'itqan-print-engine-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc) {
        window.print();
        resolve(false);
        return;
      }

      // Construct clean, isolated, white-page-proof HTML
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${docTitle}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
            ${collectedStyles}
            <style>
              @page {
                size: A4 portrait;
                margin: 8mm 6mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box;
              }
              html, body {
                background: #ffffff !important;
                color: #0f172a !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: 'Cairo', sans-serif !important;
                direction: rtl !important;
                width: 100% !important;
                height: auto !important;
              }
              .no-print {
                display: none !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: auto !important;
              }
              tr {
                page-break-inside: avoid !important;
                page-break-after: auto !important;
              }
              thead {
                display: table-header-group !important;
              }
              th, td {
                border: 1px solid #cbd5e1 !important;
              }
            </style>
          </head>
          <body class="p-2 bg-white">
            <div class="w-full">
              ${targetElement.outerHTML}
            </div>
          </body>
        </html>
      `;

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      // Give browser time to parse CSS and images before opening print dialog
      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
          resolve(true);
        } catch (printErr) {
          console.warn('Iframe print failed, calling window.print fallback:', printErr);
          window.print();
          resolve(false);
        }
      }, 350);
    } catch (e) {
      console.error('Print engine error:', e);
      window.print();
      resolve(false);
    }
  });
};
