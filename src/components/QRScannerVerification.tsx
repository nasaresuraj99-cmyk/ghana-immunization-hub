import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  QrCode, 
  CheckCircle, 
  XCircle, 
  User, 
  Calendar, 
  MapPin,
  Shield,
  Syringe,
  AlertTriangle
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface QRVerificationData {
  id: string;
  regNo: string;
  name: string;
  dob: string;
  sex: string;
  facility: string;
  vaccinesCompleted: number;
  totalVaccines: number;
  generatedAt: string;
  verifyUrl?: string;
}

interface QRScannerVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onFindChild?: (regNo: string) => void;
}

export function QRScannerVerification({ isOpen, onClose, onFindChild }: QRScannerVerificationProps) {
  const [scanResult, setScanResult] = useState<QRVerificationData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const mountId = "qr-reader";

  useEffect(() => {
    if (!isOpen || !isScanning) return;

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          mountId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
          },
          false
        );

        scanner.render(
          (decodedText: string) => {
            try {
              const data = JSON.parse(decodedText) as QRVerificationData;
              if (data.regNo && data.name) {
                setScanResult(data);
                setScanError(null);
                setIsScanning(false);
                scanner.clear().catch(() => {});
              } else {
                setScanError("Invalid QR code format - not a valid immunization card");
              }
            } catch {
              setScanError("Could not read QR code - not a valid immunization card format");
            }
          },
          (error: string) => {
            // Ignore scan errors as they occur frequently during scanning
          }
        );

        scannerRef.current = scanner;
      } catch (err) {
        console.error("Scanner init error:", err);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen, isScanning]);

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanResult(null);
    setScanError(null);
    setIsScanning(true);
    onClose();
  };

  const handleScanAgain = () => {
    setScanResult(null);
    setScanError(null);
    setIsScanning(true);
  };

  const progress = scanResult 
    ? Math.round((scanResult.vaccinesCompleted / scanResult.totalVaccines) * 100) 
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            QR Code Verification
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isScanning && !scanResult && (
            <div className="space-y-4">
              <div 
                id={mountId} 
                className="w-full rounded-lg overflow-hidden border border-border"
              />
              <p className="text-sm text-muted-foreground text-center">
                Point your camera at an immunization card QR code to verify
              </p>
              {scanError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{scanError}</p>
                </div>
              )}
            </div>
          )}

          {scanResult && (
            <Card className="border-2 border-success">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-success">
                  <Shield className="w-5 h-5" />
                  Verified Immunization Card
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-success" />
                  <div>
                    <p className="font-semibold text-success">Valid Certificate</p>
                    <p className="text-xs text-muted-foreground">
                      Generated: {formatDate(scanResult.generatedAt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Child's Name</p>
                      <p className="font-semibold">{scanResult.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {scanResult.regNo}
                    </Badge>
                    <Badge variant={scanResult.sex === 'Male' ? 'default' : 'secondary'}>
                      {scanResult.sex}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">{formatDate(scanResult.dob)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Health Facility</p>
                      <p className="font-medium">{scanResult.facility}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Vaccination Progress</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-success rounded-full transition-all" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold">{progress}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {scanResult.vaccinesCompleted} of {scanResult.totalVaccines} vaccines completed
                      </p>
                    </div>
                  </div>
                </div>

                {progress < 100 && (
                  <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-warning-foreground">
                      Immunization incomplete. Please ensure all required vaccines are administered.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            {scanResult && (
              <>
                <Button onClick={handleScanAgain} variant="outline" className="flex-1">
                  <QrCode className="w-4 h-4 mr-2" />
                  Scan Another
                </Button>
                {onFindChild && (
                  <Button 
                    onClick={() => {
                      onFindChild(scanResult.regNo);
                      handleClose();
                    }} 
                    className="flex-1 bg-primary"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Find in Register
                  </Button>
                )}
              </>
            )}
            <Button onClick={handleClose} variant={scanResult ? "outline" : "default"} className={!scanResult ? "flex-1" : ""}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
