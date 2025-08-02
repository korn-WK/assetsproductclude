import { Asset } from './types/asset';

export interface PrintOptions {
  printType: 'barcode' | 'qrcode';
  selectedAssets: Asset[];
}

export async function generatePrintContent(options: PrintOptions): Promise<string> {
  const { printType, selectedAssets } = options;
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bulk ${printType === 'barcode' ? 'Barcode' : 'QR Code'} Labels</title>
      <style>
        @media print {
          body { margin: 0; padding: 5px; }
          .label-grid { page-break-inside: avoid; }
          .label { page-break-inside: avoid; }
        }
        
        body {
          font-family: 'THSarabun', Arial, sans-serif;
          margin: 0;
          padding: 5px;
          background: white;
        }
        
        .label-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5px;
          max-width: 210mm;
          margin: 0 auto;
          justify-items: center;
        }
        
        /* For labels that don't fill the last row completely */
        .label-grid:has(.label:nth-child(4n+1):last-child) {
          justify-items: start;
        }
        
        .label-grid:has(.label:nth-child(4n+2):last-child) {
          justify-items: start;
        }
        
        .label-grid:has(.label:nth-child(4n+3):last-child) {
          justify-items: start;
        }
        
        ${printType === 'barcode' ? `
        .label {
          border: 1px solid #000;
          padding: 5px;
          text-align: center;
          background: white;
          min-height: 40px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          box-sizing: border-box;
        }
        
        .asset-name {
          font-size: 6px;
          font-weight: bold;
          color: #000;
          margin: 0;
          padding: 0;
          line-height: 1;
          max-width: 100%;
          word-wrap: break-word;
        }
        
        .barcode-container {
          margin-bottom: 0px;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .barcode-number {
          font-size: 7.5px;
          color: #000;
          margin: 0;
          padding: 0;
          font-family: monospace;
          line-height: 1;
        }
        
        svg {
          max-width: 100%;
          height: auto;
          display: block;
        }
        ` : `
        .label {
          border: 1px solid #000;
          padding: 1px;
          text-align: center;
          background: white;
          min-height: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
        }
        
        .asset-name {
          font-size: 10px;
          font-weight: bold;
          color: #000;
          margin-bottom: 3px;
          line-height: 1.1;
          max-width: 100%;
          word-wrap: break-word;
        }
        
        .qr-container {
          margin: 2px 0;
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
          width: 100%;
          height: 100%;
          min-height: 60px;
        }
        
        svg {
          max-width: 100%;
          height: auto;
          display: block;
          width: 80px;
          height: 80px;
        }
        `}
        
        @media print {
          .label {
            border: 1px solid #000;
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="label-grid">
  `;

  let labelsHtml = '';
  
  if (printType === 'barcode') {
    // Generate barcode labels using optimized batch generation
    try {
      // Import JsBarcode once for all barcodes
      const JsBarcode = await import('jsbarcode').then(module => module.default);
      
      // Create a single temporary container for all barcodes
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      // Generate all barcodes in batch
      const barcodePromises = selectedAssets.map(async (asset, index) => {
        const barcodeNumber = asset.inventory_number || '';
        
        // Create individual SVG for each barcode
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.setAttribute('width', '180');
        tempSvg.setAttribute('height', '40');
        tempSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        tempSvg.id = `barcode-temp-${index}`;
        tempContainer.appendChild(tempSvg);
        
        // Generate barcode using JsBarcode
        try {
          JsBarcode(tempSvg, barcodeNumber, {
            width: 1.5,
            height: 40,
            fontSize: 6,
            marginTop: 5,
            marginLeft: 15,
            marginRight: 15,
            displayValue: false,
            background: '#fff',
            lineColor: '#000',
            format: 'CODE128'
          });
        } catch (error) {
          console.warn(`Failed to generate barcode for ${barcodeNumber}:`, error);
          // Create a simple fallback barcode
          tempSvg.innerHTML = `
            <rect width="180" height="40" fill="white"/>
            <rect x="40" y="2" width="100" height="20" fill="black"/>
            <text x="70" y="40" text-anchor="middle" font-family="monospace" font-size="6" fill="black">${barcodeNumber}</text>
          `;
        }
        
        return { asset, tempSvg };
      });

      // Wait for all barcodes to generate
      const barcodeResults = await Promise.all(barcodePromises);
      
      // Extract SVG content for each barcode
      for (const { asset, tempSvg } of barcodeResults) {
        const barcodeNumber = asset.inventory_number || '';
        const barcodeSvg = tempSvg.outerHTML;
        
        labelsHtml += `
          <div class="label">
            <div class="asset-name">${asset.name}</div>
            <div class="barcode-container">
              ${barcodeSvg}
            </div>
            <div class="barcode-number">${barcodeNumber}</div>
          </div>
        `;
      }

      // Clean up all temporary elements
      document.body.removeChild(tempContainer);
      
    } catch (error) {
      console.error('Error generating barcodes:', error);
      
      // Fallback: generate simple barcode patterns for all assets
      for (const asset of selectedAssets) {
        const barcodeNumber = asset.inventory_number || '';
        
        labelsHtml += `
          <div class="label">
            <div class="asset-name">${asset.name}</div>
            <div class="barcode-container">
              <svg width="140" height="25" xmlns="http://www.w3.org/2000/svg">
                <rect width="140" height="25" fill="white"/>
                <rect x="20" y="2" width="100" height="20" fill="black"/>
                <text x="70" y="22" text-anchor="middle" font-family="monospace" font-size="6" fill="black">${barcodeNumber}</text>
              </svg>
            </div>
            <div class="barcode-number">${barcodeNumber}</div>
          </div>
        `;
      }
    }
  } else {
    // Generate QR code labels using optimized batch generation
    try {
      // Import libraries once for all QR codes
      const { QRCodeSVG } = await import('qrcode.react');
      const React = await import('react');
      const ReactDOM = await import('react-dom/client');

      // Create a single temporary container for all QR codes
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      // Generate all QR codes in batch
      const qrCodePromises = selectedAssets.map(async (asset, index) => {
        const qrNumber = asset.inventory_number || '';
        
        // Create individual div for each QR code
        const tempDiv = document.createElement('div');
        tempDiv.id = `qr-temp-${index}`;
        tempContainer.appendChild(tempDiv);
        
        // Create root and render QR code
        const root = ReactDOM.createRoot(tempDiv);
        root.render(
          React.createElement(QRCodeSVG, {
            value: qrNumber,
            size: 80,
            level: 'M',
            includeMargin: false,
            bgColor: '#FFFFFF',
            fgColor: '#000000'
          })
        );
        
        return { asset, tempDiv, root };
      });

      // Wait for all QR codes to render
      const qrCodeResults = await Promise.all(qrCodePromises);
      
      // Wait a bit more for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Extract SVG content for each QR code
      for (const { asset, tempDiv } of qrCodeResults) {
        const svgElement = tempDiv.querySelector('svg');
        let qrSvg = '';
        
        if (svgElement) {
          qrSvg = svgElement.outerHTML;
        } else {
          // Fallback to simple pattern if SVG not found
          const qrNumber = asset.inventory_number || '';
          const size = 80;
          const cellSize = 4;
          const cells = size / cellSize;
          
          qrSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
          qrSvg += `<rect width="${size}" height="${size}" fill="white"/>`;
          
          // Draw border squares (like real QR code)
          qrSvg += `<rect x="0" y="0" width="20" height="20" fill="black"/>`;
          qrSvg += `<rect x="${size-20}" y="0" width="20" height="20" fill="black"/>`;
          qrSvg += `<rect x="0" y="${size-20}" width="20" height="20" fill="black"/>`;
          
          // Draw inner pattern based on text
          for (let i = 5; i < cells - 5; i++) {
            for (let j = 5; j < cells - 5; j++) {
              const charCode = qrNumber.charCodeAt((i * cells + j) % qrNumber.length);
              if (charCode % 3 === 0) {
                qrSvg += `<rect x="${i * cellSize}" y="${j * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
              }
            }
          }
          
          qrSvg += `</svg>`;
        }
        
        labelsHtml += `
          <div class="label">
            <div class="asset-name">${asset.name}</div>
            <div class="qr-container">
              ${qrSvg}
            </div>
          </div>
        `;
      }

      // Clean up all temporary elements
      document.body.removeChild(tempContainer);
      
    } catch (error) {
      console.error('Error generating QR codes:', error);
      
      // Fallback: generate simple QR patterns for all assets
      for (const asset of selectedAssets) {
        const qrNumber = asset.inventory_number || '';
        const size = 80;
        const cellSize = 4;
        const cells = size / cellSize;
        
        let qrSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
        qrSvg += `<rect width="${size}" height="${size}" fill="white"/>`;
        
        // Draw border squares
        qrSvg += `<rect x="0" y="0" width="20" height="20" fill="black"/>`;
        qrSvg += `<rect x="${size-20}" y="0" width="20" height="20" fill="black"/>`;
        qrSvg += `<rect x="0" y="${size-20}" width="20" height="20" fill="black"/>`;
        
        // Draw inner pattern
        for (let i = 5; i < cells - 5; i++) {
          for (let j = 5; j < cells - 5; j++) {
            const charCode = qrNumber.charCodeAt((i * cells + j) % qrNumber.length);
            if (charCode % 3 === 0) {
              qrSvg += `<rect x="${i * cellSize}" y="${j * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
            }
          }
        }
        qrSvg += `</svg>`;
        
        labelsHtml += `
          <div class="label">
            <div class="asset-name">${asset.name}</div>
            <div class="qr-container">
              ${qrSvg}
            </div>
          </div>
        `;
      }
    }
  }

  return printContent + labelsHtml + `
      </div>
      <script>
        window.onload = function() {
          console.log('Print window loaded');
          
          // Auto print after a short delay (barcodes and QR codes are already generated)
          setTimeout(function() {
            console.log('Printing...');
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          }, 500);
        };
      </script>
    </body>
    </html>
  `;
}

export async function printBulkLabels(options: PrintOptions): Promise<void> {
  const printWindow = window.open('', '', 'width=800,height=600');
  if (!printWindow) return;

  const fullContent = await generatePrintContent(options);
  
  printWindow.document.write(fullContent);
  printWindow.document.close();
} 