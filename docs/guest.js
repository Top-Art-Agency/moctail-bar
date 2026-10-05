// Widok gościa: menu i zamawianie
import { db, fs, errText } from './fb.js';
const MARKUP = "<div class=\"wrap\">\n  <header>\n    <span class=\"eyebrow\" id=\"event\"></span>\n    <h1 id=\"barName\">Moctail bar</h1>\n    <span class=\"state\" id=\"state\" hidden><i></i><span>Przyjmujemy zamówienia</span></span>\n  </header>\n\n  <main id=\"choose\">\n    <ul class=\"menu\" id=\"menu\"></ul>\n    <div class=\"closed-box\" id=\"closedBox\">Wczytuję menu…</div>\n  </main>\n\n  <main id=\"done\" hidden>\n    <div class=\"done\">\n      <span class=\"lbl\">Twój kod zamówienia</span>\n      <div class=\"ticket\"><div class=\"code\" id=\"dCode\">—</div><div class=\"what\" id=\"dWhat\"></div></div>\n      <div class=\"status\" id=\"dStatus\"><b class=\"dots\">Wysyłam do baru</b><span>Chwilka…</span></div>\n      <p id=\"dInfo\">Zostaw tę stronę otwartą. Gdy drink będzie gotowy, zobaczysz to tutaj, a kod pojawi się na ekranie przy barze.</p>\n      <button class=\"ghost\" id=\"again\" style=\"padding:12px 18px\">Zamów kolejny</button>\n    </div>\n  </main>\n  <footer id=\"foot\">Zamówienie trafia prosto do baru. · <a href=\"#obsluga\" style=\"color:inherit\">Obsługa baru</a></footer>\n</div>\n\n<form class=\"sheet\" id=\"sheet\" hidden autocomplete=\"off\">\n  <div class=\"in\">\n    <div class=\"chosen\" id=\"chosen\"></div>\n    <div class=\"chips\" id=\"opts\"></div>\n    <label class=\"f\">Imię (barman zawoła je przy odbiorze)<input id=\"name\" maxlength=\"24\" autocomplete=\"given-name\" enterkeyhint=\"send\"></label>\n    <label class=\"f\" id=\"codeWrap\">Kod z identyfikatora <span id=\"codeOpt\">(opcjonalnie)</span>\n      <span class=\"row\"><input id=\"guest\" maxlength=\"40\" autocapitalize=\"characters\" spellcheck=\"false\" placeholder=\"np. GUEST-0142\"><button type=\"button\" class=\"ghost\" id=\"scanBtn\">Zeskanuj</button></span>\n    </label>\n    <div class=\"cam\" id=\"cam\" hidden><video id=\"video\" playsinline muted></video></div>\n    <p class=\"err\" id=\"err\" aria-live=\"polite\"></p>\n    <button class=\"go\" id=\"go\" type=\"submit\">Zamów</button>\n  </div>\n</form>";
export function mount(root){
  root.innerHTML = MARKUP;
  const $ = s => document.querySelector(s);
  const store = { get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} } };

  /* Który bar: identyfikator przychodzi w linku z kodu QR (…?b=…). */
  const QS = new URLSearchParams(location.search);
  let BAR = QS.get('b') || '';
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(BAR)) BAR = '';

  let M = {barName:'Moctail bar', event:'', open:true, requireCode:false, options:[], items:[]};
  let pick = null, opts = new Set(), sending = false, menuState = 'loading', unsub = null;

  const pre = store.get('moctail-me') || {};
  $('#name').value = QS.get('imie') || pre.name || '';
  $('#guest').value = QS.get('kod') || pre.guest || '';

  function render(){
    const nm = M.barName || 'Moctail bar', h = $('#barName'); h.textContent = '';
    const k = nm.indexOf('0%');
    if (k >= 0) { const z = document.createElement('span'); z.className = 'zero'; z.textContent = '0%'; h.append(nm.slice(0,k), z, nm.slice(k+2)); } else h.textContent = nm;
    document.title = nm;
    $('#event').textContent = M.event || 'Zamów bez kolejki';
    const st = $('#state'); st.hidden = menuState !== 'ok'; st.classList.toggle('closed', !M.open);
    st.lastChild.textContent = M.open ? 'Przyjmujemy zamówienia' : 'Bar chwilowo zamknięty';
    const box = $('#closedBox');
    const msg = {nocfg:'Strona nie jest jeszcze połączona z bazą. Obsługa: uzupełnij plik firebase-config.js.',
      nobar:'Bar nie jest jeszcze uruchomiony. Obsługa: zaloguj się na dole strony.', loading:'Wczytuję menu…', missing:'Nie ma takiego baru. Zeskanuj aktualny kod QR przy barze.'}[menuState];
    if (menuState === 'error') { box.hidden = false; box.innerHTML = 'Nie udało się wczytać menu. Sprawdź internet.<br><button class="ghost" style="margin-top:10px;padding:10px 14px" onclick="location.reload()">Spróbuj ponownie</button>'; }
    else if (msg) { box.hidden = false; box.textContent = msg; }
    else { box.hidden = !!M.open; box.textContent = 'Bar chwilowo nie przyjmuje zamówień. Zajrzyj za chwilę albo podejdź do baru.'; }
    $('#menu').hidden = menuState !== 'ok' || !M.open;
    $('#codeOpt').textContent = M.requireCode ? '(wymagany)' : '(opcjonalnie)';
    if (pick && !(M.items || []).some(i => i.id === pick.id && i.on)) pick = null;
    $('#menu').replaceChildren(...(M.items || []).map(it => {
      const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button';
      const on = pick && pick.id === it.id;
      b.className = 'item' + (it.on ? '' : ' off') + (on ? ' on' : ''); b.disabled = !it.on; b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.innerHTML = '<span class="emo"></span><span><div class="iname"></div><div class="idesc"></div></span><span class="tick">✓</span>';
      b.querySelector('.emo').textContent = it.emoji || '🍹'; b.querySelector('.iname').textContent = it.name; b.querySelector('.idesc').textContent = it.desc || '';
      b.onclick = () => { pick = on ? null : it; render(); };
      li.appendChild(b); return li;
    }));
    $('#opts').replaceChildren(...(M.options || []).map(o => {
      const c = document.createElement('button'); c.type = 'button'; c.className = 'chip' + (opts.has(o) ? ' on' : ''); c.textContent = o;
      c.onclick = () => { opts.has(o) ? opts.delete(o) : opts.add(o); render(); }; return c;
    }));
    $('#sheet').hidden = !(pick && M.open && menuState === 'ok' && $('#done').hidden);
    if (pick) { $('#chosen').textContent = (pick.emoji || '🍹') + ' ' + pick.name; $('#go').textContent = 'Zamów ' + pick.name; }
  }

  /* Menu czytamy raz i odświeżamy co 5 minut (oszczędza darmowy limit odczytów Firebase). */
  async function loadMenu(){
    try {
      if (!BAR) {  // jeden bar na stronę: jego identyfikator zapisuje panel w config/main
        const c = await fs.getDoc(fs.doc(db, 'config', 'main'));
        BAR = c.exists() ? (c.data().bar || '') : '';
        if (!BAR) { menuState = 'nobar'; render(); return; }
      }
      const s = await fs.getDoc(fs.doc(db, 'bars', BAR));
      if (!s.exists()) { menuState = 'missing'; render(); return; }
      M = Object.assign(M, s.data()); menuState = 'ok'; render();
    } catch(e) { if (menuState !== 'ok') { menuState = 'error'; render(); } }
  }

  const ALPH = 'ACEFHJKLMNPRTUVWXY3479';
  const rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALPH[b % ALPH.length]).join('');

  $('#sheet').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (sending || !pick) return;
    const name = $('#name').value.trim(), guest = $('#guest').value.trim();
    $('#err').textContent = '';
    if (!name) { $('#err').textContent = 'Wpisz imię, żeby barman wiedział, kogo zawołać.'; $('#name').focus(); return; }
    if (M.requireCode && !guest) { $('#err').textContent = 'Wpisz albo zeskanuj kod z identyfikatora.'; $('#guest').focus(); return; }
    const last = store.get('moctail-last');
    if (last && Date.now() - last.t < 60000) { $('#err').textContent = 'Poprzednie zamówienie wysłałeś przed chwilą. Odczekaj minutę.'; return; }
    sending = true; $('#go').disabled = true; $('#go').textContent = 'Wysyłam…';
    const code = rnd(3);
    try {
      const ref = await fs.addDoc(fs.collection(db, 'bars', BAR, 'orders'), {
        code, item: pick.id, itemName: pick.name.slice(0, 40), opts: [...opts].slice(0, 6), name: name.slice(0, 24), guest: guest.slice(0, 40),
        status: 'czeka', created: fs.serverTimestamp()});
      store.set('moctail-me', {name, guest});
      const rec = {t: Date.now(), id: ref.id, code, what: pick.name, name, bar: BAR};
      store.set('moctail-last', rec);
      showDone(rec);
    } catch(e) {
      const c = (e && e.code) || '';
      $('#err').textContent = c.includes('permission-denied') ? 'Bar chwilowo nie przyjmuje zamówień. Odśwież stronę za chwilę.' : errText(e);
      loadMenu();
    }
    sending = false; $('#go').disabled = false; if (pick) $('#go').textContent = 'Zamów ' + pick.name;
  });

  const STAT = {
    czeka:  ['', 'Wysłano do baru', 'Czekamy na potwierdzenie…', true],
    nowe:   ['', 'Przyjęte, w przygotowaniu', '', false],
    gotowe: ['ready', 'Gotowe! Odbierz przy barze', 'Pokaż ten kod barmanowi.', false],
    wydane: ['', 'Wydane. Smacznego!', '', false],
    odrzucone: ['bad', 'Zamówienie nie zostało przyjęte', '', false],
    anulowane: ['bad', 'Bar anulował zamówienie', 'Podejdź do baru, jeśli to pomyłka.', false],
  };
  function setStatus(o){
    const [cls, title, sub, dots] = STAT[o.status] || STAT.czeka;
    const el = $('#dStatus'); el.className = 'status ' + cls;
    const extra = o.status === 'nowe' && o.no ? 'Numer zamówienia: #' + o.no : (o.status === 'odrzucone' ? (o.reason || '') : sub);
    el.innerHTML = '<b></b><span></span>'; el.firstChild.textContent = title; el.lastChild.textContent = extra;
    if (dots) el.firstChild.classList.add('dots');
    if (o.status === 'gotowe') { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
    if (['wydane', 'odrzucone', 'anulowane'].includes(o.status)) {
      if (unsub) { unsub(); unsub = null; }
      const l = store.get('moctail-last'); if (l) { l.done = true; if (o.status !== 'wydane') l.t = 0; store.set('moctail-last', l); }
    }
  }
  function showDone(rec){
    camOff();
    $('#choose').hidden = true; $('#done').hidden = false; $('#sheet').hidden = true;
    $('#dCode').textContent = rec.code; $('#dWhat').textContent = rec.what + ' · ' + rec.name;
    setStatus({status:'czeka'});
    if (unsub) unsub();
    unsub = fs.onSnapshot(fs.doc(db, 'bars', rec.bar || BAR, 'orders', rec.id), s => { if (s.exists()) setStatus(s.data()); }, () => {});
    window.scrollTo(0, 0);
  }
  $('#again').onclick = () => { if (unsub) { unsub(); unsub = null; } $('#done').hidden = true; $('#choose').hidden = false; pick = null; opts.clear(); loadMenu(); render(); };

  /* skan kodu z identyfikatora */
  let stream = null;
  async function camOn(){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('#err').textContent = 'Ta przeglądarka nie obsługuje aparatu. Wpisz kod ręcznie.'; return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}, audio:false});
      const v = $('#video'); v.srcObject = stream; await v.play();
      $('#cam').hidden = false; $('#scanBtn').textContent = 'Zamknij'; tick();
    } catch(e) { $('#err').textContent = 'Nie udało się włączyć aparatu. Wpisz kod ręcznie.'; stream = null; }
  }
  function camOff(){ if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; $('#cam').hidden = true; $('#scanBtn').textContent = 'Zeskanuj'; }
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', {willReadFrequently:true});
  function tick(){
    if (!stream) return;
    const v = $('#video');
    if (v.readyState >= 2 && window.jsQR) {
      const w = 400, h = Math.round(400 * v.videoHeight / v.videoWidth);
      cv.width = w; cv.height = h; cx.drawImage(v, 0, 0, w, h);
      const q = jsQR(cx.getImageData(0, 0, w, h).data, w, h, {inversionAttempts:'dontInvert'});
      if (q && q.data) {
        let code = q.data.trim();
        try { const u = new URL(code); code = u.searchParams.get('kod') || u.searchParams.get('code') || code; } catch(e) {}
        $('#guest').value = code.slice(0, 40); camOff(); if (navigator.vibrate) navigator.vibrate(60); return;
      }
    }
    setTimeout(tick, 200);
  }
  $('#scanBtn').onclick = () => stream ? camOff() : camOn();

  const last = store.get('moctail-last');
  render();
  loadMenu().then(() => { if (last && last.id && !last.done && last.bar === BAR && Date.now() - last.t < 3 * 3600e3) showDone(last); });
  setInterval(() => { if (!document.hidden) loadMenu(); }, 5 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadMenu(); });
}
