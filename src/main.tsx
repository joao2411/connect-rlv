import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const BLOCKED_HOSTS = ["connect-rlv.lovable.app"];

if (BLOCKED_HOSTS.includes(window.location.hostname)) {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#888;font-family:sans-serif;text-align:center;padding:2rem;">
      <div>
        <h1 style="font-size:1.5rem;color:#fff;margin-bottom:0.5rem;">Acesso indisponível</h1>
        <p>Este endereço não está mais ativo.</p>
      </div>
    </div>
  `;
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
