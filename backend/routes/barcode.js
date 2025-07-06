const express = require('express');
const bwipjs = require('bwip-js');
const multer = require('multer');
const Quagga = require('quagga').default || require('quagga');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');

// สร้าง barcode image
router.get('/:code', async (req, res) => {
  try {
    // ตรวจสอบว่าเป็นเลข 13 หลัก (EAN-13) หรือไม่
    const isEAN13 = /^\d{13}$/.test(req.params.code);
    const bcid = isEAN13 ? 'ean13' : 'code128';
    const png = await bwipjs.toBuffer({
      bcid,
      text: req.params.code,
      scale: 7,
      height: 40,
      includetext: true,
      textxalign: 'center',
      textsize: 20,
      backgroundcolor: 'FFFFFF',
      barcolor: '000000',
      paddingwidth: 60,
      paddingheight: 20,
    });
    res.type('png').send(png);
  } catch (err) {
    res.status(400).json({ error: 'Barcode generation failed' });
  }
});

// decode barcode จากรูป
router.post('/decode', upload.single('barcodeImage'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // ตรวจสอบ mimetype และตั้งนามสกุลไฟล์ให้ถูกต้อง
  const ext = (req.file.mimetype === 'image/png') ? '.png'
            : (req.file.mimetype === 'image/jpeg') ? '.jpg'
            : (req.file.mimetype === 'image/webp') ? '.webp'
            : null;
  if (!ext) return res.status(400).json({ error: 'Unsupported file type' });

  const tempPath = path.join(os.tmpdir(), `barcode-upload-${Date.now()}${ext}`);
  fs.writeFileSync(tempPath, req.file.buffer);

  Quagga.decodeSingle({
    src: tempPath,
    numOfWorkers: 0,
    inputStream: { size: 800 },
    decoder: { readers: ['code_128_reader', 'ean_reader', 'code_39_reader'] },
    locate: true,
  }, (result) => {
    try { fs.unlinkSync(tempPath); } catch (e) {}
    if (result && result.codeResult) {
      res.json({ code: result.codeResult.code });
    } else {
      res.status(400).json({ error: 'Barcode not detected' });
    }
  });
});

module.exports = router; 