import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { envError } from "@/lib/supabase";
import App from "@/App";
import "@/index.css";
import "leaflet/dist/leaflet.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);

if (envError) {
  // Konfigurasi belum lengkap — tampilkan pesan yang bisa ditindaklanjuti.
  root.render(
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="mb-2 text-base font-bold">Konfigurasi belum lengkap</p>
        <p className="mb-3">{envError}</p>
        <p className="text-xs">
          Set variabel tersebut di Cloudflare (Settings → Variables &amp;
          Secrets, sebagai <b>build variable</b>, jangan di-Encrypt), lalu
          jalankan <b>Retry deployment</b>.
        </p>
      </div>
    </div>
  );
} else {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}
