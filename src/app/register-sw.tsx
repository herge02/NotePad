"use client";

// Enregistre le service worker pour le support hors ligne (PWA).

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // hors ligne dégradé : l'app fonctionne quand même, sans cache SW
      });
    }
  }, []);
  return null;
}
