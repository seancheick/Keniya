"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/admin/ui";

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

/**
 * Camera UPC/EAN scanner. Uses the native BarcodeDetector (Chrome/Android) and falls back to
 * ZXing (iOS Safari). Always offers manual entry, since some labels won't scan.
 */
export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const done = useRef(false);
  const detectedRef = useRef(onDetected);
  useEffect(() => {
    detectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopZxing: (() => void) | null = null;
    const hit = (code: string) => {
      if (done.current) return;
      done.current = true;
      navigator.vibrate?.(60);
      detectedRef.current(code.replace(/\D/g, ""));
    };

    (async () => {
      const el = video.current;
      if (!el) return;
      const Native = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
      try {
        if (Native) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          el.srcObject = stream;
          await el.play();
          const det = new Native({ formats: ["ean_13", "upc_a", "upc_e", "ean_8"] });
          const tick = async () => {
            if (done.current) return;
            try {
              const found = await det.detect(el);
              if (found[0]?.rawValue) return hit(found[0].rawValue);
            } catch {
              /* frame not ready */
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, el, (result) => {
            if (result) hit(result.getText());
          });
          stopZxing = () => controls.stop();
        }
      } catch (e) {
        setError(e instanceof Error && e.name === "NotAllowedError" ? "Camera permission was denied." : "Camera unavailable on this device.");
      }
    })();

    return () => {
      done.current = true;
      cancelAnimationFrame(raf);
      stopZxing?.();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video ref={video} muted playsInline className="aspect-[4/3] w-full object-cover" />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.replace(/\D/g, "").length >= 6) onDetected(manual.replace(/\D/g, ""));
        }}
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          inputMode="numeric"
          placeholder="Or type the barcode digits"
          className={fieldClass}
          aria-label="Barcode digits"
        />
        <Button type="submit" variant="secondary">
          Use
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </form>
    </div>
  );
}

/** UPC-A "012345678905" and EAN-13 "0012345678905" are the same item. */
export const sameBarcode = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a && b) && a!.replace(/^0+/, "") === b!.replace(/^0+/, "");
