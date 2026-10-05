// Wspólne połączenie z Firebase dla wszystkich stron.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import * as fs from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as au from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const cfg = window.FIREBASE_CONFIG || {};
export const configured = !!cfg.apiKey && !/WKLEJ/.test(cfg.apiKey + cfg.projectId);
export const app = configured ? initializeApp(cfg) : null;
export const db = app ? fs.getFirestore(app) : null;
export const auth = app ? au.getAuth(app) : null;
export { fs, au };

// Polskie komunikaty dla najczęstszych błędów Firebase
export function errText(e){
  const c = (e && e.code) || '';
  if (c.includes('permission-denied')) return 'Brak uprawnień. Sprawdź reguły bezpieczeństwa Firestore (plik firestore.rules).';
  if (c.includes('unavailable') || c.includes('network')) return 'Brak połączenia z internetem.';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-email')) return 'Zły e-mail albo hasło.';
  if (c.includes('too-many-requests')) return 'Za dużo prób logowania. Odczekaj chwilę.';
  return (e && e.message) || 'Nieznany błąd.';
}
