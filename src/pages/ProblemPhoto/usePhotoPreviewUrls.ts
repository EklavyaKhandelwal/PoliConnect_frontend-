import { useEffect, useMemo, useRef } from "react";

export const usePhotoPreviewUrls = (photos: File[]): string[] => {
  const urls = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos]);
  const pendingRevocations = useRef(new Map<string, number>());

  useEffect(() => {
    const revocationTimers = pendingRevocations.current;
    urls.forEach((url) => {
      const pendingTimer = revocationTimers.get(url);
      if (pendingTimer !== undefined) {
        window.clearTimeout(pendingTimer);
        revocationTimers.delete(url);
      }
    });

    return () => {
      urls.forEach((url) => {
        const timer = window.setTimeout(() => {
          URL.revokeObjectURL(url);
          revocationTimers.delete(url);
        }, 0);
        revocationTimers.set(url, timer);
      });
    };
  }, [urls]);

  return urls;
};
