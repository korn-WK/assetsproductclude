import JsBarcode from 'jsbarcode';

export interface BarcodeOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  marginTop?: number;
  displayValue?: boolean;
  background?: string;
  lineColor?: string;
}

export const generateBarcode = (
  element: HTMLElement | SVGSVGElement,
  text: string,
  options: BarcodeOptions = {}
): boolean => {
  if (!element || !text) {
    return false;
  }

  // Clean the text to remove any non-ASCII characters but keep common symbols
  const cleanText = text.replace(/[^\x00-\x7F]/g, '');
  
  if (!cleanText) {
    console.warn('No valid ASCII characters found in text for barcode generation');
    return false;
  }

  const defaultOptions = {
    width: 1.2,
    height: 42,
    fontSize: 10,
    marginTop: 60,
    displayValue: true,
    background: '#fff',
    lineColor: '#000'
  };

  const finalOptions = { ...defaultOptions, ...options };

  // Define format constraints
  const formatConstraints = [
    { format: 'CODE128', maxLength: 50, minLength: 1 },
    { format: 'CODE39', maxLength: 50, minLength: 1 },
    { format: 'EAN13', maxLength: 13, minLength: 13 }
  ];
  
  for (const constraint of formatConstraints) {
    // Check if text length is suitable for this format
    if (cleanText.length < constraint.minLength || cleanText.length > constraint.maxLength) {
      continue;
    }
    
    try {
      JsBarcode(element, cleanText, {
        ...finalOptions,
        format: constraint.format
      });
      return true;
    } catch (error) {
      console.warn(`Failed to generate barcode with format ${constraint.format}:`, error);
      continue;
    }
  }

  // If no suitable format found, try with CODE128 as fallback
  try {
    JsBarcode(element, cleanText, {
      ...finalOptions,
      format: 'CODE128'
    });
    return true;
  } catch (error) {
    console.error('Failed to generate barcode with fallback format:', error);
  }

  // If all formats fail, clear the element
  if (element) {
    element.innerHTML = '';
  }
  
  console.error('Failed to generate barcode with all available formats');
  return false;
};

export const isValidBarcodeText = (text: string): boolean => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  // Check if text contains only ASCII characters and common symbols (large set)
  const regex = /^[A-Z0-9\-_\/\.\s"*:;,'()\[\]{}@#$%&+=!?|\\^~<>]{1,50}$/i;
  return regex.test(text);
};

export const sanitizeBarcodeText = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  // Remove non-ASCII characters and trim, but keep common symbols (large set)
  return text.replace(/[^A-Za-z0-9\-_\/\.\s"*:;,'()\[\]{}@#$%&+=!?|\\^~<>]/g, '').trim();
};

export const sanitizeInventoryNumber = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  // Keep only ASCII characters and common symbols for inventory number (large set)
  return text.replace(/[^A-Za-z0-9\-_\/\.\s"*:;,'()\[\]{}@#$%&+=!?|\\^~<>]/g, '').trim();
}; 