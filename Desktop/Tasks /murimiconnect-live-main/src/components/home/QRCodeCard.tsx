import { QRCodeSVG } from 'qrcode.react';
import { Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCallback, useRef } from 'react';

const APP_URL = 'https://murimiconnect-iota.vercel.app/';

export const QRCodeCard = () => {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Murimi Connect',
        text: 'Buy & sell fresh produce directly from farmers',
        url: APP_URL,
      }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(APP_URL);
      // Could use toast here
    }
  }, []);

  const handleDownload = useCallback(() => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = 'murimi-connect-qr.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(data);
  }, []);

  return (
    <section className="px-4 mt-5">
      <div className="bg-gradient-to-br from-primary to-primary/70 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 flex items-center gap-4">
          {/* QR Code */}
          <div
            ref={qrRef}
            className="flex-shrink-0 bg-white p-2 rounded-xl shadow-sm"
          >
            <QRCodeSVG
              value={APP_URL}
              size={88}
              bgColor="#ffffff"
              fgColor="#111827"
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Text + Actions */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-primary-foreground mb-0.5">Share the App</h3>
            <p className="text-xs text-primary-foreground/80 mb-3 leading-relaxed">
              Scan this QR or share the link with fellow farmers & buyers
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-card text-foreground hover:bg-card/90 rounded-xl text-xs font-semibold h-8 px-3 gap-1.5"
                onClick={handleShare}
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
              <Button
                size="sm"
                className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25 rounded-xl text-xs font-semibold h-8 px-3 gap-1.5"
                onClick={handleDownload}
              >
                <Download className="h-3.5 w-3.5" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
