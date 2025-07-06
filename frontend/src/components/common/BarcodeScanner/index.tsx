import React, { useState, useRef, useEffect } from 'react';
// @ts-ignore
import Quagga from 'quagga';
import styles from './BarcodeScanner.module.css';

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeDetected,
  onError,
  onClose
}) => {
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [barcodeBuffer, setBarcodeBuffer] = useState<string[]>([]);
  const BUFFER_SIZE = 5; // ตรวจจับซ้ำ 5 ครั้ง

  // Start camera scan automatically
  useEffect(() => {
    if (scanMode === 'camera') {
      startCameraScan();
    } else {
      stopCameraScan();
    }
    return () => {
      stopCameraScan();
    };
    // eslint-disable-next-line
  }, [scanMode]);

  // Torch (flashlight) toggle
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    
    try {
      // @ts-ignore
      const capabilities = videoTrack.getCapabilities?.();
      // @ts-ignore
      if (capabilities && capabilities.torch) {
        // @ts-ignore
        await videoTrack.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(!torchOn);
      } else {
        console.log('อุปกรณ์ไม่รองรับไฟฉาย');
      }
    } catch (error) {
      console.error('ไม่สามารถเปิด/ปิดไฟฉายได้:', error);
    }
  };

  const startCameraScan = async () => {
    if (!videoRef.current) return;
    try {
      setError('');
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            width: { min: 800 },
            height: { min: 600 },
            facingMode: "environment"
          },
          area: {
            top: "20%",
            right: "20%",
            left: "20%",
            bottom: "20%"
          }
        },
        decoder: {
          readers: [
            "code_128_reader"
          ]
        },
        locate: true,
        numOfWorkers: 4,
        frequency: 20,
        debug: true
      }, (err: any) => {
        if (err) {
          setError('ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้อง');
          return;
        }
        Quagga.start();
        // ดึง stream จาก video element
        setTimeout(() => {
          const videoElem = videoRef.current?.querySelector('video');
          if (videoElem && videoElem.srcObject instanceof MediaStream) {
            streamRef.current = videoElem.srcObject as MediaStream;
          }
        }, 500);
      });
      // ล้าง onDetected callback เดิมก่อน add ใหม่
      if (typeof Quagga.offDetected === 'function') {
        Quagga.offDetected();
      } else if (typeof Quagga.off === 'function') {
        Quagga.off('detected');
      }
      Quagga.onDetected((result: any) => {
        let barcode = result.codeResult.code;
        // post-processing: trim, toUpperCase
        barcode = barcode.trim().toUpperCase();
        // ตรวจสอบความยาวและรูปแบบ (รองรับอักขระพิเศษกลุ่มใหญ่) และความยาว 1-50 ตัวอักษร
        if (!/^[A-Z0-9\-_\/\.\s"*:;,'()\[\]{}@#$%&+=!?|\\^~<>]{1,50}$/i.test(barcode)) {
          console.log(`Barcode format rejected: "${barcode}"`);
          return;
        }
        
        console.log(`Barcode detected: "${barcode}"`);

        setBarcodeBuffer(prev => {
          const newBuffer = [...prev, barcode].slice(-BUFFER_SIZE);
          // Majority vote
          const counts = newBuffer.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const sortedEntries = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number));
          const [mostCommon, count] = sortedEntries[0] as [string, number];
          if (count >= 3) { // ถ้าเจอซ้ำ 3 ครั้งขึ้นไป
            Quagga.stop();
            onBarcodeDetected(mostCommon);
            return [];
          }
          return newBuffer;
        });
      });
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการสแกน');
    }
  };

  const stopCameraScan = () => {
    Quagga.stop();
    streamRef.current = null;
    setTorchOn(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsLoading(true);
      setError('');
      const fileUrl = URL.createObjectURL(file);
      Quagga.decodeSingle({
        src: fileUrl,
        numOfWorkers: 0,
        inputStream: { size: 800 },
        decoder: {
          readers: [
            "ean_reader",
            "upc_reader",
            "upc_e_reader",
            "code_128_reader",
            "code_39_reader",
            "codabar_reader"
          ]
        },
        locate: true,
        debug: {
          drawBoundingBox: true,
          showFrequency: true,
          drawScanline: true,
          showPattern: true
        }
      }, (result: any) => {
        if (result && result.codeResult) {
          const barcode = result.codeResult.code;
          onBarcodeDetected(barcode);
        } else {
          setError('ไม่สามารถอ่านบาร์โค้ดจากรูปภาพได้ กรุณาตรวจสอบรูปภาพ');
        }
        setIsLoading(false);
        URL.revokeObjectURL(fileUrl);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      });
    } catch (err) {
      setError('ไม่สามารถอ่านบาร์โค้ดจากรูปภาพได้ กรุณาตรวจสอบรูปภาพ');
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleModeChange = (mode: 'camera' | 'upload') => {
    setScanMode(mode);
    setError('');
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.scannerContainer}>
        <div className={styles.cameraOverlay}>
          <button
            className={styles.iconCircle + ' ' + styles.closeBtn}
            onClick={onClose}
            type="button"
            aria-label="ปิดหน้าต่างสแกนบาร์โค้ด"
          >
            <span className={styles.closeIcon}>×</span>
          </button>
          <button
            className={styles.iconCircle + ' ' + styles.flashlightBtn}
            onClick={toggleTorch}
            type="button"
            title="เปิด/ปิดไฟฉาย"
            aria-label="เปิดหรือปิดไฟฉาย"
          >
            <img src="/flashlight-whitel.png" alt="ไฟฉาย" width={28} height={28} />
          </button>
          <button
            className={styles.iconCircle + ' ' + styles.uploadBtn}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            aria-label="อัปโหลดรูปภาพบาร์โค้ด"
          >
            <img src="/upload-white.png" alt="อัปโหลด" width={28} height={28} />
          </button>
          <div ref={videoRef} className={styles.video} style={{ filter: 'contrast(1.2) brightness(1.1)' }} />
          <div className={styles.scanArea}>
            <div className={`${styles.scanCorner} ${styles.tl}`}></div>
            <div className={`${styles.scanCorner} ${styles.tr}`}></div>
            <div className={`${styles.scanCorner} ${styles.bl}`}></div>
            <div className={`${styles.scanCorner} ${styles.br}`}></div>
          </div>
        </div>
        <div className={styles.scannerHint}>
          เล็งบาร์โค้ดให้อยู่ในกรอบสีเขียวและถือกล้องให้นิ่งที่สุด<br/>
          หากสแกนไม่ติด ลองขยับกล้องเข้า-ออก หรือเพิ่มแสงสว่าง
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className={styles.fileInput}
          style={{ display: 'none' }}
        />
        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner; 