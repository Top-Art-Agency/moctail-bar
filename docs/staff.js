// Widok obsługi: logowanie, zamówienia, ekran wydawki, menu, kod QR, raport
import { db, auth, fs, au, errText } from './fb.js';
const MARKUP = "<nav class=\"top\"><b>Moctail bar</b>\n  <span id=\"tabs\" hidden style=\"display:contents\">\n    <a href=\"#\" data-tab=\"zam\">Zamówienia</a><a href=\"#\" data-tab=\"ekran\">Ekran wydawki</a><a href=\"#\" data-tab=\"menu\">Menu</a><a href=\"#\" data-tab=\"qr\">Kod QR</a><a href=\"#\" data-tab=\"raport\">Raport</a>\n  </span>\n  <span class=\"right\"><a href=\"./?gosc\" target=\"_blank\">Podgląd menu</a><span class=\"muted\" id=\"who\"></span><a href=\"#\" id=\"logout\" hidden>Wyloguj</a></span></nav>\n\n<form class=\"gate card\" id=\"vLogin\" hidden autocomplete=\"on\">\n  <h1>Obsługa baru</h1>\n  <p class=\"muted\" style=\"margin:0\">Zaloguj się kontem obsługi (zakładasz je w Firebase Console → Authentication → Users).</p>\n  <label class=\"f\">E-mail<input id=\"lEmail\" type=\"email\" autocomplete=\"username\" required></label>\n  <label class=\"f\">Hasło<input id=\"lPass\" type=\"password\" autocomplete=\"current-password\" required></label>\n  <p class=\"err danger\" id=\"lErr\" style=\"margin:0;min-height:1em\"></p>\n  <button class=\"primary\" type=\"submit\" id=\"lGo\">Zaloguj</button>\n  <a href=\"./\" class=\"muted\" style=\"font-size:13px\">← Wróć do menu dla gości</a>\n</form>\n\n<section class=\"gate card\" id=\"vNoAccess\" hidden>\n  <h1>Brak dostępu do baru</h1>\n  <p class=\"muted\" style=\"margin:0\">Konto <b id=\"naEmail\"></b> nie jest na liście obsługi tego baru.</p>\n  <p class=\"muted\" style=\"margin:0\">Poproś osobę z kontem głównym (<b id=\"naOwner\">konto główne</b>), żeby w zakładce <b>Menu → Konta obsługi</b> dopisała ten adres e-mail. Potem odśwież stronę.</p>\n  <button id=\"naRetry\" class=\"primary\">Sprawdź ponownie</button>\n</section>\n\n<div id=\"vApp\" hidden>\n  <div class=\"wrap stack\" data-pane=\"zam\">\n    <div class=\"top\">\n      <div>\n        <h1 id=\"title\">Moctail bar</h1>\n        <div class=\"inline\"><span class=\"pill\" id=\"conn\">Łączę…</span><span class=\"pill\" id=\"prn\" hidden></span></div>\n      </div>\n      <div class=\"inline\">\n        <label class=\"switch\" id=\"openSw\"><input type=\"checkbox\" id=\"open\"> <span id=\"openTxt\">Przyjmuję zamówienia</span></label>\n        <button id=\"test\">Testowe zamówienie</button>\n      </div>\n    </div>\n    <section class=\"queue\">\n      <div class=\"col\"><h2>Do zrobienia <b id=\"nNew\">0</b></h2><div class=\"orders\" id=\"qNew\"></div></div>\n      <div class=\"col\"><h2>Gotowe do odbioru <b id=\"nReady\">0</b></h2><div class=\"orders\" id=\"qReady\"></div></div>\n    </section>\n    <div class=\"stat\" id=\"stats\"></div>\n    <section class=\"card\">\n      <details>\n        <summary>Historia: odrzucone <b id=\"nRej\">0</b> · wydane dziś <b id=\"nDone\">0</b></summary>\n        <div class=\"tablewrap\" style=\"margin-top:10px\"><table>\n          <thead><tr><th>Kod</th><th>Nr</th><th>Godz.</th><th>Drink</th><th>Gość</th><th>Status</th><th></th></tr></thead>\n          <tbody id=\"hist\"></tbody>\n        </table></div>\n        <div class=\"inline\" style=\"margin-top:10px\"><button id=\"csv\">Pobierz historię (CSV)</button><button class=\"danger\" id=\"resetNo\">Zacznij numerację od 1</button></div>\n      </details>\n    </section>\n  </div>\n\n  <section class=\"screen\" data-pane=\"ekran\" id=\"paneEkran\" hidden>\n    <header><h1 id=\"scrBar\">Moctail bar</h1><span class=\"inline\"><span class=\"clock\" id=\"scrClock\"></span><button id=\"scrFull\">Pełny ekran</button></span></header>\n    <main><section><h2>Gotowe do odbioru</h2><div class=\"ready\" id=\"scrReady\"></div></section><section><h2>W przygotowaniu</h2><div class=\"prep\" id=\"scrPrep\"></div></section></main>\n    <footer id=\"scrFoot\"></footer>\n  </section>\n\n  <div class=\"wrap stack\" data-pane=\"menu\" hidden>\n    <section class=\"card stack\" style=\"gap:12px\">\n      <h2 style=\"margin:0\">Menu</h2>\n      <p class=\"muted\" style=\"margin:0;font-size:13px\">Zmiany widać na telefonach gości po odświeżeniu strony (same odświeżają co kilka minut). Odznacz drink, gdy skończy się składnik.</p>\n      <div class=\"mlist\" id=\"menu\"></div>\n      <div class=\"inline\"><button id=\"addItem\">+ Dodaj drink</button><button class=\"primary\" id=\"saveMenu\">Zapisz menu</button></div>\n      <label class=\"f\">Dodatki do wyboru (oddziel przecinkami)<input id=\"options\" placeholder=\"bez lodu, mniej słodki\"></label>\n      <div class=\"row\">\n        <label class=\"f\">Nazwa baru<input id=\"barName\" maxlength=\"40\"></label>\n        <label class=\"f\">Podtytuł (np. nazwa wydarzenia)<input id=\"event\" maxlength=\"40\"></label>\n      </div>\n      <div class=\"row\">\n        <label class=\"f\">Zamówień w przygotowaniu na jeden kod (0 = bez limitu)<input id=\"limit\" type=\"number\" min=\"0\" max=\"20\"></label>\n        <label class=\"check\" style=\"align-self:end;padding-bottom:8px\"><input type=\"checkbox\" id=\"reqCode\"> Wymagaj kodu z identyfikatora</label>\n      </div>\n      <div><button class=\"primary\" id=\"saveSet\">Zapisz ustawienia</button></div>\n    </section>\n    <section class=\"card stack\" style=\"gap:10px\">\n      <h2 style=\"margin:0\">Konta obsługi</h2>\n      <p class=\"muted\" style=\"margin:0;font-size:13px\">Te konta widzą te same zamówienia i menu co konto główne. Najpierw załóż konto w Firebase Console → Authentication → Users → Add user, potem dopisz tutaj jego e-mail.</p>\n      <div class=\"stack\" id=\"staffList\" style=\"gap:6px\"></div>\n      <div class=\"row\" id=\"staffForm\" style=\"grid-template-columns:minmax(0,1fr) auto\"><input id=\"staffEmail\" type=\"email\" placeholder=\"np. barman@topart.pl\" autocomplete=\"off\"><button class=\"primary\" id=\"staffAdd\">Dodaj konto</button></div>\n      <p class=\"muted\" id=\"staffNote\" hidden style=\"margin:0;font-size:13px\">Listę kont może zmieniać tylko konto główne.</p>\n    </section>\n  </div>\n\n  <div class=\"wrap stack\" data-pane=\"qr\" hidden>\n    <section class=\"card stack\" style=\"gap:12px;max-width:720px\">\n      <h2 style=\"margin:0\">Kod QR dla gości</h2>\n      <p class=\"warnbox\" id=\"cfgWarn\" hidden style=\"margin:0\">Goście widzą menu innego konta baru. Ta strona obsługuje jeden bar; zaloguj się kontem, które uruchomiło ją jako pierwsze.</p>\n      <label class=\"f\">Adres menu (kod QR prowadzi tutaj)\n        <span class=\"row\" style=\"grid-template-columns:minmax(0,1fr) auto\"><input id=\"guestLink\" readonly class=\"mono\" style=\"font-size:12px\"><button id=\"copyLink\">Kopiuj</button></span></label>\n      <span class=\"muted\" style=\"font-size:12px\">Napis obok kodu na grafice (puste pole = bez tej linii)</span>\n      <input id=\"qrT1\" maxlength=\"40\" placeholder=\"Duży napis, linia 1\">\n      <input id=\"qrT2\" maxlength=\"40\" placeholder=\"Duży napis, linia 2\">\n      <input id=\"qrT3\" maxlength=\"40\" placeholder=\"Mały dopisek na dole\">\n      <label class=\"f\">Czcionka<select id=\"qrFont\"></select></label>\n      <span class=\"muted\" style=\"font-size:12px\">Podgląd grafiki na stolik:</span>\n      <canvas id=\"qrPrev\" style=\"background:#fff;border:1px solid var(--line);border-radius:6px;max-width:100%;height:auto\"></canvas>\n      <div class=\"qrbox\"><canvas id=\"qr\" width=\"10\" height=\"10\"></canvas>\n        <span class=\"stack\" style=\"gap:8px\"><button class=\"primary\" id=\"dlCard\">Pobierz grafikę z napisem (PNG)</button><button id=\"dlQr\">Pobierz sam kod QR (PNG)</button><span class=\"muted\" style=\"font-size:12px\">Wydrukuj na zwykłej drukarce albo wstaw na plakat.</span></span></div>\n      <p class=\"muted\" style=\"margin:0;font-size:12px\">Adres z dopiskiem <span class=\"mono\">?kod=GUEST-0142&amp;imie=Anna</span> wypełni gościowi pola automatycznie.</p>\n    </section>\n  </div>\n\n  <div class=\"wrap stack\" data-pane=\"raport\" hidden>\n    <section class=\"card stack rep-ctl\" style=\"gap:12px\">\n      <h2 style=\"margin:0\">Raport z zamówień</h2>\n      <div class=\"inline\" style=\"gap:8px;align-items:end\">\n        <label class=\"f\">Okres<select id=\"repRange\"><option value=\"today\">Dziś</option><option value=\"yday\">Wczoraj</option><option value=\"7\">Ostatnie 7 dni</option><option value=\"30\">Ostatnie 30 dni</option><option value=\"custom\">Własny zakres</option></select></label>\n        <label class=\"f\" id=\"repFromL\" hidden>Od<input type=\"date\" id=\"repFrom\"></label>\n        <label class=\"f\" id=\"repToL\" hidden>Do<input type=\"date\" id=\"repTo\"></label>\n        <button class=\"primary\" id=\"repGo\">Pokaż raport</button>\n        <button id=\"repPrint\" disabled>Zapisz jako PDF / drukuj</button>\n        <button id=\"repCsv\" disabled>Pobierz dane (CSV)</button>\n      </div>\n      <p class=\"muted\" style=\"margin:0;font-size:12px\">Raport pobiera zamówienia z bazy jednorazowo, po kliknięciu „Pokaż raport”. Liczone są zamówienia przyjęte (anulowane i odrzucone są podane osobno). PDF: w oknie drukowania wybierz „Zapisz jako PDF”.</p>\n    </section>\n    <div id=\"rep\" class=\"stack\"></div>\n  </div>\n\n</div>\n<div class=\"toast\" id=\"toast\" hidden></div>";
export function mount(root){
  root.innerHTML = MARKUP;
  const $ = s => document.querySelector(s);
  const h = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach(k => k != null && e.append(k)); return e; };
  function toast(t){ const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2800); }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const FONTS = [['Unbounded:800','Unbounded: nowoczesna, okrągła'],['Bebas Neue:400','Bebas Neue: wysoka, plakatowa'],['Pacifico:400','Pacifico: odręczna'],
    ['Playfair Display:italic 800','Playfair: elegancka kursywa'],['Fredoka:700','Fredoka: zaokrąglona'],['Archivo Narrow:700','Archivo Narrow: prosta, wąska']];
  ['#qrFont'].forEach(id => $(id).replaceChildren(...FONTS.map(([v, t]) => h('option', {value:v, textContent:t}))));

  const DEFAULT_BAR = {
    barName: 'Moctail bar 0%', event: '', open: true, requireCode: false, limitPerCode: 1,
    options: ['bez lodu', 'mniej słodki', 'bez cukru', 'extra mięta'],
    qrText1: 'Zamów', qrText2: 'moctail', qrText3: 'Zeskanuj aparatem', qrFont: 'Unbounded:800',
    items: [
      {id:'virgin-mojito', name:'Virgin Mojito', desc:'limonka, mięta, cukier trzcinowy, soda', emoji:'🌿', on:true},
      {id:'nojito-truskawka', name:'Truskawkowe Nojito', desc:'truskawka, limonka, mięta, soda', emoji:'🍓', on:true},
      {id:'ginger-fizz', name:'Ginger Fizz', desc:'imbir, cytryna, miód, tonik', emoji:'🫚', on:true},
      {id:'passion-spritz', name:'Passion Spritz', desc:'marakuja, pomarańcza, tonik', emoji:'🥭', on:true},
      {id:'blue-lagoon', name:'Blue Lagoon 0%', desc:'blue curaçao 0%, cytryna, sprite', emoji:'🫐', on:true},
      {id:'lemoniada-lawenda', name:'Lemoniada lawendowa', desc:'cytryna, syrop lawendowy, woda gazowana', emoji:'💜', on:true}]};

  /* ustawienia drukarki trzymamy osobno na każdym urządzeniu */
  const P = Object.assign({auto:false, w:100, h:50, font:'Archivo Narrow:700', method:'bridge', ip:'', bridge:''}, (() => { try { return JSON.parse(localStorage.getItem('moctail-print')) || {}; } catch(e) { return {}; } })());
  // Safari blokuje http://localhost ze strony https, więc tam używamy bezpiecznego portu programu (8443)
  const IS_SAFARI = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
  const DEF_BRIDGE = IS_SAFARI ? 'https://localhost:8443' : 'http://localhost:8080';
  if (!P.bridge || (IS_SAFARI && /^http:\/\/(localhost|127\.0\.0\.1)/.test(P.bridge))) P.bridge = DEF_BRIDGE;
  const saveP = () => { try { localStorage.setItem('moctail-print', JSON.stringify(P)); } catch(e) {} };

  let UID = null, BID = null, EMAIL = '', OWNER = false, BAR = null, ACTIVE = [], HIST = [], menuDirty = false, unsubs = [], lastIds = null;
  const refs = {};
  const ACT = ['czeka', 'nowe', 'gotowe'];
  const ts = o => o.created && o.created.toDate ? o.created.toDate() : new Date();
  const hhmm = d => d.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'});

  /* ---------- logowanie ---------- */
  function show(v){ ['#vLogin', '#vApp', '#vNoAccess'].forEach(id => $(id).hidden = id !== v); $('#tabs').hidden = v !== '#vApp'; }
  au.onAuthStateChanged(auth, user => {
    unsubs.forEach(u => u()); unsubs = [];
    if (!user) { UID = null; show('#vLogin'); $('#logout').hidden = true; $('#who').textContent = ''; return; }
    UID = user.uid; EMAIL = (user.email || '').toLowerCase(); $('#who').textContent = user.email || ''; $('#logout').hidden = false;
    start();
  });
  $('#vLogin').addEventListener('submit', async ev => {
    ev.preventDefault(); $('#lErr').textContent = ''; $('#lGo').disabled = true;
    try { await au.signInWithEmailAndPassword(auth, $('#lEmail').value.trim(), $('#lPass').value); }
    catch(e) { $('#lErr').textContent = errText(e); }
    $('#lGo').disabled = false;
  });
  $('#logout').onclick = e => { e.preventDefault(); au.signOut(auth).then(() => { location.href = location.pathname; }); };

  /* ---------- start: nasłuch bazy ---------- */
  async function start(){
    refs.config = fs.doc(db, 'config', 'main');
    // ta strona obsługuje jeden bar: konto główne zapisane w config/main albo konto dopisane do jego listy obsługi
    let cfg = null;
    try { const c = await fs.getDoc(refs.config); cfg = c.exists() ? c.data() : null; }
    catch(e) { show('#vApp'); return err(e); }
    BID = UID;
    if (cfg && cfg.bar && cfg.bar !== UID) {
      let staff = [], ownerName = '';
      try { const b = await fs.getDoc(fs.doc(db, 'bars', cfg.bar)); if (b.exists()) { staff = b.data().staff || []; ownerName = b.data().ownerEmail || ''; } } catch(e) {}
      if (!staff.includes(EMAIL)) { $('#naEmail').textContent = EMAIL || 'bez e-maila'; $('#naOwner').textContent = ownerName || 'konto główne'; show('#vNoAccess'); return; }
      BID = cfg.bar;
    }
    OWNER = BID === UID;
    $('#who').textContent = EMAIL + (OWNER ? ' (konto główne)' : ' (obsługa)');
    show('#vApp');
    refs.bar = fs.doc(db, 'bars', BID);
    refs.counter = fs.doc(db, 'bars', BID, 'private', 'counter');
    refs.board = fs.doc(db, 'bars', BID, 'public', 'board');
    refs.orders = fs.collection(db, 'bars', BID, 'orders');
    if (OWNER) {
      try {
        const s = await fs.getDoc(refs.bar);
        if (!s.exists()) { await fs.setDoc(refs.bar, Object.assign({}, DEFAULT_BAR, {ownerEmail: EMAIL, staff: []})); toast('Utworzono bar z przykładowym menu. Zmień je poniżej.'); }
        else if (s.data().ownerEmail !== EMAIL) fs.updateDoc(refs.bar, {ownerEmail: EMAIL}).catch(() => {});
        if (!cfg) await fs.setDoc(refs.config, {bar: UID});
      } catch(e) { $('#conn').className = 'pill bad'; $('#conn').textContent = errText(e); return; }
    }
    $('#cfgWarn').hidden = true;
    unsubs.push(fs.onSnapshot(refs.bar, s => { BAR = Object.assign({}, DEFAULT_BAR, s.data()); renderBar(); pushBoard(); }, err));
    unsubs.push(fs.onSnapshot(fs.query(refs.orders, fs.where('status', 'in', ACT)), snap => {
      $('#conn').className = 'pill ok'; $('#conn').textContent = snap.metadata.fromCache ? 'Brak internetu, pokazuję ostatni stan' : 'Odbieram zamówienia';
      if (snap.metadata.fromCache) $('#conn').className = 'pill warn';
      ACTIVE = snap.docs.map(d => Object.assign({id:d.id}, d.data())).sort((a, b) => (a.no || 1e9) - (b.no || 1e9) || ts(a) - ts(b));
      ACTIVE.filter(o => o.status === 'czeka').forEach(accept);
      autoPrint();
      renderQueue(); pushBoard();
    }, err));
    unsubs.push(fs.onSnapshot(fs.query(refs.orders, fs.orderBy('created', 'desc'), fs.limit(300)), snap => {
      HIST = snap.docs.map(d => Object.assign({id:d.id}, d.data())); renderHist();
    }, err));
    links(); wake();
  }
  $('#naRetry').onclick = () => location.reload();
  function err(e){ $('#conn').className = 'pill bad'; $('#conn').textContent = errText(e); }

  /* ---------- przyjmowanie zamówień: numer nadawany transakcją, więc kilka urządzeń nie zdubluje numerów ---------- */
  const processing = new Set();
  function why(o){
    const b = BAR, item = (b.items || []).find(i => i.id === o.item);
    if (!b.open) return 'Bar chwilowo nie przyjmuje zamówień.';
    if (!item || !item.on) return 'Tego drinka chwilowo nie ma. Wybierz inny.';
    if (b.requireCode && !o.guest) return 'Potrzebny jest kod z identyfikatora.';
    const lim = +b.limitPerCode || 0;
    if (o.guest && lim > 0 && ACTIVE.filter(x => x.id !== o.id && x.guest === o.guest && (x.status === 'nowe' || x.status === 'gotowe')).length >= lim)
      return 'Masz już zamówienie w przygotowaniu. Odbierz je, zanim zamówisz kolejne.';
    return '';
  }
  async function accept(o, force){
    if (!BAR || processing.has(o.id)) return;
    processing.add(o.id);
    const reason = force ? '' : why(o);
    const item = (BAR.items || []).find(i => i.id === o.item);
    const oref = fs.doc(refs.orders, o.id);
    try {
      await fs.runTransaction(db, async tx => {
        const os = await tx.get(oref), cs = await tx.get(refs.counter);
        if (!os.exists()) return;
        const st = os.data().status;
        if (!(st === 'czeka' || (force && st === 'odrzucone'))) return;
        if (reason) { tx.update(oref, {status:'odrzucone', reason}); return; }
        const no = ((cs.exists() && cs.data().seq) || 0) + 1;
        tx.set(refs.counter, {seq: no}, {merge: true});
        tx.update(oref, {status:'nowe', no, reason:'', itemName: item ? item.name : os.data().itemName,
          opts: (os.data().opts || []).filter(x => (BAR.options || []).includes(x)), accepted: fs.serverTimestamp()});
      });
    } catch(e) { console.warn(e); }
    setTimeout(() => processing.delete(o.id), 5000);
  }

  /* ---------- druk przez system (okno drukowania lub cichy druk w Chrome) ---------- */
  function fontSpec(spec, px){ const [fam, w] = spec.split(':'); return (w || '700') + ' ' + px + 'px "' + fam + '", "Arial Black", Arial, sans-serif'; }
  const K = 12; // punktów na mm na płótnie
  function orderCanvas(o){
    const W = Math.round(P.w * K), H = Math.round(P.h * K), m = Math.round(3 * K), bw = W - 2 * m;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#000'; g.textBaseline = 'top'; g.textAlign = 'center';
    const line = (t, y, k) => { if (!t) return; let px = Math.round(H * k); g.font = fontSpec(P.font, px); while (px > 8 && g.measureText(t).width > bw) { px -= 2; g.font = fontSpec(P.font, px); } g.fillText(t, W / 2, y); };
    line('#' + o.no + '  ·  ' + hhmm(ts(o)), H * 0.035, 0.085);
    line(o.code, H * 0.13, 0.34);
    line(o.itemName, H * 0.5, 0.12);
    line((o.opts || []).join(', '), H * 0.64, 0.08);
    line(o.name, H * 0.74, 0.11);
    g.fillRect(m, Math.round(H * 0.875), bw, Math.max(2, Math.round(K * 0.25)));
    line((BAR ? BAR.barName : '') + (o.guest ? '  ·  ' + o.guest : ''), H * 0.9, 0.065);
    return c;
  }
  const printQ = []; let printing = false;
  function printCanvas(c){ if (P.method === 'bridge') return bridgePrint(c); printQ.push(c.toDataURL('image/png')); runPrint(); }
  /* druk przez serwer-etykiet.py: naklejka jako obraz ZPL (203 dpi = 8 punktów/mm) wysłana na adres IP drukarki */
  function toZpl(src){
    const W = Math.round(P.w * 8), H = Math.round(P.h * 8);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(src, 0, 0, W, H);
    const px = g.getImageData(0, 0, W, H).data, bpr = Math.ceil(W / 8), hex = [];
    for (let y = 0; y < H; y++) for (let b = 0; b < bpr; b++) {
      let v = 0;
      for (let i = 0; i < 8; i++) { const x = b * 8 + i; if (x < W) { const j = (y * W + x) * 4; if (px[j] + px[j+1] + px[j+2] < 384) v |= 128 >> i; } }
      hex.push((v < 16 ? '0' : '') + v.toString(16).toUpperCase());
    }
    return ['^XA', '^PW' + W, '^LL' + H, '^LH0,0', '^FO0,0^GFA,' + bpr*H + ',' + bpr*H + ',' + bpr + ',' + hex.join(''), '^FS', '^PQ1', '^XZ'].join('\n');
  }
  const bridgeQ = []; let bridging = false;
  function bridgePrint(c){ bridgeQ.push(toZpl(c)); runBridge(); }
  async function runBridge(){
    if (bridging) return; bridging = true;
    while (bridgeQ.length) {
      const zpl = bridgeQ.shift();
      try {
        const r = await fetch((P.bridge || DEF_BRIDGE).replace(/\/$/, '') + '/print', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({zpl, mode:'wifi', ip:P.ip})});
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.ok === false) throw new Error(j.error || 'Drukarka odrzuciła wydruk.');
      } catch(e) {
        toast(e instanceof TypeError ? (IS_SAFARI ? 'Safari nie łączy się z programem. Kliknij „Otwórz adres programu” w zakładce Drukarka i zaakceptuj certyfikat.' : 'Nie widzę programu serwer-etykiet.py. Uruchom go na tym komputerze.') : e.message);
      }
    }
    bridging = false;
  }
  async function runPrint(){ if (printing) return; printing = true; while (printQ.length) { await printOne(printQ.shift()); await sleep(700); } printing = false; }
  function printOne(url){
    return new Promise(res => {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
      document.body.appendChild(f);
      const d = f.contentDocument;
      d.open();
      d.write('<!doctype html><html><head><style>@page{size:' + P.w + 'mm ' + P.h + 'mm;margin:0}html,body{margin:0;padding:0}img{display:block;width:' + P.w + 'mm;height:' + P.h + 'mm}</style></head><body><img></body></html>');
      d.close();
      const img = d.querySelector('img');
      img.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch(e) {} setTimeout(() => { f.remove(); res(); }, 1000); };
      img.src = url;
    });
  }
  const printedHere = new Set();
  async function autoPrint(){
    return; // wersja bez drukowania
    if (!P.auto) return;
    try { await document.fonts.load(fontSpec(P.font, 40)); } catch(e) {}
    for (const o of ACTIVE) {
      if (o.status !== 'nowe' || o.printed || printedHere.has(o.id)) continue;
      printedHere.add(o.id);
      printCanvas(orderCanvas(o));
      fs.updateDoc(fs.doc(refs.orders, o.id), {printed: true}).catch(() => {});
    }
  }

  /* ---------- ekran wydawki (zakładka) ---------- */
  function pushBoard(){
    if (!BAR) return;
    $('#scrBar').textContent = BAR.barName;
    $('#scrClock').textContent = hhmm(new Date());
    const rd = ACTIVE.filter(o => o.status === 'gotowe'), pr = ACTIVE.filter(o => o.status === 'nowe');
    $('#scrReady').replaceChildren(...(rd.length ? rd.map(o => h('div', {className:'r'}, h('div', {className:'c', textContent:o.code}), h('div', {className:'n', textContent:o.name || ''}), h('div', {className:'d', textContent:o.itemName}))) : [h('div', {className:'none', textContent:'Za chwilę pojawią się tu gotowe drinki.'})]));
    $('#scrPrep').replaceChildren(...(pr.length ? pr.map(o => h('span', {className:'p', textContent:o.code})) : [h('div', {className:'none', textContent:'Brak zamówień w kolejce.'})]));
    $('#scrFoot').innerHTML = BAR.open ? 'Zeskanuj kod QR przy barze, żeby zamówić bez kolejki. Odbierz drink, gdy zobaczysz swój <b>kod</b>.' : 'Zamówienia przez telefon są chwilowo wstrzymane.';
  }
  setInterval(() => { const c = $('#scrClock'); if (c) c.textContent = hhmm(new Date()); }, 10000);
  $('#scrFull').onclick = () => { const el = $('#paneEkran'); try { (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen()).catch(() => {}); } catch(e) {} };

  /* ---------- widok kolejki ---------- */
  let ac;
  document.addEventListener('pointerdown', () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch(e){} }, {once:true});
  function ding(){ try { if (!ac) return; [880, 1320].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.15, ac.currentTime + i*.12); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + i*.12 + .25); o.connect(g).connect(ac.destination); o.start(ac.currentTime + i*.12); o.stop(ac.currentTime + i*.12 + .3); }); } catch(e){} }
  function ago(d){ const m = Math.round((Date.now() - d) / 60000); return m < 1 ? 'teraz' : m + ' min temu'; }
  async function setStatus(o, status, msg){
    const upd = {status};
    if (status === 'gotowe') upd.readyAt = fs.serverTimestamp();
    if (status === 'wydane') upd.doneAt = fs.serverTimestamp();
    if (status === 'nowe') upd.readyAt = null;
    try { await fs.updateDoc(fs.doc(refs.orders, o.id), upd); if (msg) toast(msg); } catch(e) { toast(errText(e)); }
  }
  function card(o){
    const ready = o.status === 'gotowe';
    const c = h('div', {className:'ord' + (ready ? ' ready' : '')});
    c.append(h('div', {className:'hd'}, h('span', {className:'code', textContent:o.code}), h('span', {className:'no', textContent:(o.no ? '#' + o.no : '…') + '\n' + hhmm(ts(o))})));
    c.append(h('div', {className:'drink', textContent:o.itemName}));
    if (o.opts && o.opts.length) c.append(h('div', {className:'opts', textContent:o.opts.join(', ')}));
    c.append(h('div', {className:'who', textContent:(o.name || 'bez imienia') + (o.guest ? ' · ' + o.guest : '') + ' · ' + ago(ts(o))}));
    const a = h('div', {className:'acts'});
    if (!ready) {
      a.append(h('button', {className:'primary', textContent:'Gotowe', onclick:() => setStatus(o, 'gotowe', o.code + ' gotowe do odbioru')}));
        const cn = h('button', {className:'danger', textContent:'Anuluj'});
      cn.onclick = () => { if (!cn.classList.contains('armed')) { cn.classList.add('armed'); cn.textContent = 'Na pewno?'; setTimeout(() => { cn.classList.remove('armed'); cn.textContent = 'Anuluj'; }, 3000); return; } setStatus(o, 'anulowane', 'Anulowano ' + o.code); };
      a.append(cn);
    } else {
      a.append(h('button', {className:'primary', textContent:'Wydane', onclick:() => setStatus(o, 'wydane')}));
      a.append(h('button', {textContent:'Cofnij', onclick:() => setStatus(o, 'nowe')}));
    }
    c.append(a);
    return c;
  }
  function renderQueue(){
    const nw = ACTIVE.filter(o => o.status === 'nowe'), rd = ACTIVE.filter(o => o.status === 'gotowe');
    $('#nNew').textContent = nw.length; $('#nReady').textContent = rd.length;
    $('#qNew').replaceChildren(...(nw.length ? nw.map(card) : [h('div', {className:'empty-col', textContent:'Brak zamówień. Nowe pojawią się tutaj automatycznie.'})]));
    $('#qReady').replaceChildren(...(rd.length ? rd.map(card) : [h('div', {className:'empty-col', textContent:'Nic nie czeka na odbiór.'})]));
    const ids = new Set(nw.map(o => o.id));
    if (lastIds && [...ids].some(id => !lastIds.has(id))) ding();
    lastIds = ids;
  }
  function renderHist(){
    const today = new Date().toDateString();
    const td = HIST.filter(o => ts(o).toDateString() === today);
    const ok = td.filter(o => !['odrzucone', 'anulowane', 'czeka'].includes(o.status));
    const hourAgo = Date.now() - 3600e3;
    const per = {}; ok.forEach(o => per[o.itemName] = (per[o.itemName] || 0) + 1);
    $('#stats').replaceChildren(
      h('span', {className:'pill', textContent:'Dziś zamówień: ' + ok.length}),
      h('span', {className:'pill', textContent:'Ostatnia godzina: ' + ok.filter(o => ts(o) >= hourAgo).length}),
      h('span', {className:'pill' + (td.some(o => o.status === 'odrzucone') ? ' warn' : ''), textContent:'Odrzucone dziś: ' + td.filter(o => o.status === 'odrzucone').length}),
      ...Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, c]) => h('span', {className:'pill', textContent:n + ': ' + c})));
    $('#nRej').textContent = td.filter(o => o.status === 'odrzucone').length;
    $('#nDone').textContent = td.filter(o => o.status === 'wydane').length;
    const rows = HIST.filter(o => !ACT.includes(o.status)).slice(0, 120);
    $('#hist').replaceChildren(...(rows.length ? rows.map(o => {
      const cell = h('td');
      if (o.status === 'odrzucone') cell.append(h('button', {textContent:'Przyjmij mimo to', onclick:() => { accept(o, true); toast('Przyjmuję ' + o.code); }}));
      if (o.status === 'anulowane' || o.status === 'wydane') cell.append(h('button', {textContent:'Przywróć', onclick:() => setStatus(o, 'nowe')}));
      const st = o.status === 'odrzucone' ? 'odrzucone: ' + (o.reason || '') : o.status;
      return h('tr', {}, h('td', {className:'mono', textContent:o.code}), h('td', {className:'num', textContent:o.no ? '#' + o.no : '—'}),
        h('td', {className:'num', textContent:hhmm(ts(o))}), h('td', {textContent:o.itemName}), h('td', {textContent:(o.name || '—') + (o.guest ? ' · ' + o.guest : '')}),
        h('td', {textContent:st, style:'font-size:12px'}), cell);
    }) : [h('tr', {}, h('td', {colSpan:7, className:'muted', textContent:'Brak.'}))]));
  }
  $('#csv').onclick = () => {
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const lines = [['Kod','Numer','Data','Drink','Dodatki','Imię','Kod gościa','Status'].join(';')].concat(
      HIST.map(o => [o.code, o.no || '', ts(o).toLocaleString('pl-PL'), o.itemName, (o.opts || []).join(', '), o.name, o.guest, o.status].map(esc).join(';')));
    const a = h('a', {href: URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], {type:'text/csv'})), download:'moctail-zamowienia.csv'});
    document.body.appendChild(a); a.click(); a.remove();
  };
  const rn = $('#resetNo');
  rn.onclick = async () => {
    if (!rn.classList.contains('armed')) { rn.classList.add('armed'); rn.textContent = 'Na pewno? Kliknij znowu'; setTimeout(() => { rn.classList.remove('armed'); rn.textContent = 'Zacznij numerację od 1'; }, 3500); return; }
    try { await fs.setDoc(refs.counter, {seq: 0}); toast('Następne zamówienie dostanie numer 1'); } catch(e) { toast(errText(e)); }
  };

  /* ---------- bar: ustawienia i menu ---------- */
  function renderBar(){
    $('#title').textContent = BAR.barName;
    $('#open').checked = !!BAR.open; $('#openSw').classList.toggle('off', !BAR.open);
    $('#openTxt').textContent = BAR.open ? 'Przyjmuję zamówienia' : 'Zamówienia wstrzymane';
    const act = document.activeElement;
    if (!act || !act.closest('.grid2')) {
      $('#barName').value = BAR.barName; $('#event').value = BAR.event || ''; $('#options').value = (BAR.options || []).join(', ');
      $('#limit').value = BAR.limitPerCode; $('#reqCode').checked = !!BAR.requireCode;
      $('#qrT1').value = BAR.qrText1 ?? ''; $('#qrT2').value = BAR.qrText2 ?? ''; $('#qrT3').value = BAR.qrText3 ?? ''; $('#qrFont').value = BAR.qrFont || FONTS[0][0];
      if (!menuDirty) renderMenu();
    }
    renderStaff();
    drawStickers();
  }
  function renderStaff(){
    const list = BAR.staff || [];
    $('#staffForm').hidden = !OWNER; $('#staffNote').hidden = OWNER;
    const rows = [h('div', {className:'inline', style:'justify-content:space-between'}, h('span', {}, h('b', {textContent: BAR.ownerEmail || 'konto główne'}), h('span', {className:'muted', textContent:'  · konto główne'})))];
    list.forEach(em => {
      const r = h('div', {className:'inline', style:'justify-content:space-between'}, h('span', {textContent: em}));
      if (OWNER) r.append(h('button', {className:'danger', textContent:'Usuń', onclick: async () => {
        try { await fs.updateDoc(refs.bar, {staff: list.filter(x => x !== em)}); toast('Usunięto ' + em); } catch(e) { toast(errText(e)); } }}));
      rows.push(r);
    });
    if (!list.length) rows.push(h('span', {className:'muted', style:'font-size:13px', textContent:'Brak dodatkowych kont.'}));
    $('#staffList').replaceChildren(...rows);
  }
  $('#staffAdd').onclick = async () => {
    const em = $('#staffEmail').value.trim().toLowerCase().replace(/,/g, '.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return toast('Wpisz poprawny adres e-mail.');
    const list = BAR.staff || [];
    if (em === EMAIL || list.includes(em)) return toast('To konto już ma dostęp.');
    if (list.length >= 20) return toast('Maksymalnie 20 kont.');
    try { await fs.updateDoc(refs.bar, {staff: list.concat(em)}); $('#staffEmail').value = ''; toast('Dodano ' + em + '. Może się teraz zalogować.'); } catch(e) { toast(errText(e)); }
  };
  function menuRow(it){
    const r = h('div', {className:'mrow'});
    const emo = h('input', {className:'emo', value:it.emoji || '🍹', maxLength:4, title:'Emoji'});
    const nm = h('input', {value:it.name || '', placeholder:'Nazwa drinka', maxLength:30});
    const ds = h('input', {className:'desc', value:it.desc || '', placeholder:'Składniki', maxLength:70});
    const on = h('input', {type:'checkbox', checked:it.on !== false});
    const del = h('button', {className:'danger', textContent:'×', title:'Usuń z menu', onclick:() => { r.remove(); menuDirty = true; }});
    [emo, nm, ds].forEach(i => i.oninput = () => menuDirty = true);
    on.onchange = () => saveMenu(true);
    r.dataset.id = it.id || '';
    r.append(emo, nm, ds, h('label', {className:'check', title:'Dostępny'}, on, 'jest'), del);
    r.get = () => ({id:r.dataset.id, emoji:emo.value.trim() || '🍹', name:nm.value.trim().slice(0, 30), desc:ds.value.trim().slice(0, 70), on:on.checked});
    return r;
  }
  function renderMenu(){ $('#menu').replaceChildren(...(BAR.items || []).map(menuRow)); menuDirty = false; }
  function slug(n, taken){ let s = n.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'drink'; let b = s, i = 2; while (taken.has(s)) s = b + '-' + i++; return s; }
  async function saveMenu(quiet){
    const taken = new Set();
    const items = [...$('#menu').children].map(r => r.get()).filter(i => i.name).map(i => { if (!i.id || taken.has(i.id)) i.id = slug(i.name, taken); taken.add(i.id); return i; });
    if (!items.length) return toast('Menu musi mieć przynajmniej jedną pozycję.');
    try { menuDirty = false; await fs.updateDoc(refs.bar, {items}); toast(quiet ? 'Zmieniono dostępność' : 'Zapisano menu'); } catch(e) { toast(errText(e)); }
  }
  $('#addItem').onclick = () => { const r = menuRow({name:'', desc:'', emoji:'🍹', on:true}); $('#menu').append(r); r.children[1].focus(); menuDirty = true; };
  $('#saveMenu').onclick = () => saveMenu(false);
  $('#saveSet').onclick = async () => {
    try {
      await fs.updateDoc(refs.bar, {barName:$('#barName').value.trim().slice(0, 40) || 'Moctail bar', event:$('#event').value.trim().slice(0, 40),
        limitPerCode: Math.max(0, Math.min(20, parseInt($('#limit').value || 0, 10))), requireCode:$('#reqCode').checked,
        options:$('#options').value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 12)});
      toast('Zapisano ustawienia');
    } catch(e) { toast(errText(e)); }
  };
  $('#open').onchange = async ev => { try { await fs.updateDoc(refs.bar, {open: ev.target.checked}); toast(ev.target.checked ? 'Bar przyjmuje zamówienia' : 'Zamówienia wstrzymane'); } catch(e) { toast(errText(e)); } };
  $('#test').onclick = async () => {
    const on = (BAR.items || []).filter(i => i.on); if (!on.length) return toast('Brak dostępnych drinków w menu.');
    const it = on[Math.floor(Math.random() * on.length)], A = 'ACEFHJKLMNPRTUVWXY3479', code = [0,0,0].map(() => A[Math.floor(Math.random() * A.length)]).join('');
    try {
      await fs.addDoc(refs.orders, {code, item:it.id, itemName:it.name, opts:(BAR.options || []).slice(0, 1), name:['Anna','Piotr','Kasia','Marek','Ola'][Math.floor(Math.random() * 5)], guest:'', status:'czeka', created: fs.serverTimestamp()});
      toast('Wysłano testowe zamówienie ' + code + ', zaraz pojawi się w kolejce');
    } catch(e) { toast(errText(e)); }
  };

  /* ---------- linki, kody QR, naklejka z kodem ---------- */
  const guestUrl = () => location.origin + location.pathname;
  function qrTo(cv, url, s){
    if (!window.qrcode) return;
    const q = qrcode(0, 'M'); q.addData(url); q.make();
    const n = q.getModuleCount(); cv.width = cv.height = n * s;
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, n*s, n*s); g.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(c*s, r*s, s, s);
  }
  function links(){
    $('#guestLink').value = guestUrl();
    qrTo($('#qr'), guestUrl(), 5);
  }
  function copy(v, ok){ try { navigator.clipboard.writeText(v).then(() => toast(ok), () => toast('Zaznacz i skopiuj ręcznie')); } catch(e) { toast('Zaznacz i skopiuj ręcznie'); } }
  $('#copyLink').onclick = () => copy(guestUrl(), 'Skopiowano link dla gości');
  function stickerCanvas(){
    const W = Math.round(150 * K), H = Math.round(70 * K);  // grafika 15 × 7 cm
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#000';
    const q = qrcode(0, 'M'); q.addData(UID ? guestUrl() : 'https://example.com'); q.make();
    const n = q.getModuleCount(), mag = Math.max(2, Math.floor(Math.min(W * 0.46, H * 0.86) / n));
    const qs = n * mag, qx = W - Math.round(3 * K) - qs, qy = Math.round((H - qs) / 2);
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect(qx + k*mag, qy + r*mag, mag, mag);
    const tw = qx - Math.round(6 * K), x = Math.round(3 * K), font = $('#qrFont').value;
    const lines = [[$('#qrT1').value, 0.30], [$('#qrT2').value, 0.30], [$('#qrT3').value, 0.10]].filter(l => l[0].trim());
    const sized = lines.map(([t, k]) => { let px = Math.round(H * k); g.font = fontSpec(font, px); while (px > 8 && g.measureText(t).width > tw) { px -= 2; g.font = fontSpec(font, px); } return {t, px}; });
    const gap = H * 0.04, total = sized.reduce((a, l) => a + l.px * 1.12, 0) + gap * Math.max(0, sized.length - 1);
    let y = Math.max(8, (H - total) / 2); g.textBaseline = 'top';
    sized.forEach(l => { g.font = fontSpec(font, l.px); g.fillText(l.t, x, y); y += l.px * 1.12 + gap; });
    return c;
  }
  function drawStickers(){
    if (!window.qrcode || !UID) return;
    const c = stickerCanvas(), p = $('#qrPrev'); p.width = c.width; p.height = c.height; p.getContext('2d').drawImage(c, 0, 0);
    p.style.width = Math.min(360, c.width / 3) + 'px';
  }
  ['#qrT1', '#qrT2', '#qrT3', '#qrFont'].forEach(id => $(id).addEventListener('input', drawStickers));
  let qrSave = null;
  ['#qrT1', '#qrT2', '#qrT3', '#qrFont'].forEach(id => $(id).addEventListener('change', () => { clearTimeout(qrSave); qrSave = setTimeout(() => fs.updateDoc(refs.bar, {qrText1:$('#qrT1').value, qrText2:$('#qrT2').value, qrText3:$('#qrT3').value, qrFont:$('#qrFont').value}).catch(() => {}), 500); }));
  if (document.fonts) { document.fonts.ready.then(drawStickers); FONTS.forEach(([f]) => document.fonts.load(fontSpec(f, 40)).then(drawStickers).catch(() => {})); }
  function download(canvas, name){
    canvas.toBlob(b => { const a = h('a', {href: URL.createObjectURL(b), download: name}); document.body.appendChild(a); a.click(); a.remove(); }, 'image/png');
  }
  $('#dlCard').onclick = async () => { try { await document.fonts.load(fontSpec($('#qrFont').value, 40)); } catch(e) {} download(stickerCanvas(), 'moctail-kod-qr-stolik.png'); };
  $('#dlQr').onclick = () => { const c = document.createElement('canvas'); qrTo(c, guestUrl(), 24); download(c, 'moctail-kod-qr.png'); };


  /* ---------- raport ---------- */
  let REP = [], REPR = null;
  const dayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const isoDay = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
  const toD = v => v && v.toDate ? v.toDate() : null;
  const pl = (n, a, b, c) => n === 1 ? a : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? b : c;
  const fmtDay = d => d.toLocaleDateString('pl-PL', {day:'numeric', month:'long', year:'numeric'});
  $('#repRange').onchange = () => { const c = $('#repRange').value === 'custom'; $('#repFromL').hidden = $('#repToL').hidden = !c; };
  $('#repFrom').value = $('#repTo').value = isoDay(new Date());
  function repPeriod(){
    const v = $('#repRange').value, t0 = dayStart(new Date()), day = 864e5;
    if (v === 'today') return [t0, new Date(+t0 + day)];
    if (v === 'yday') return [new Date(+t0 - day), t0];
    if (v === 'custom') { const a = dayStart(new Date($('#repFrom').value + 'T00:00')), b = dayStart(new Date($('#repTo').value + 'T00:00')); return a <= b ? [a, new Date(+b + day)] : [b, new Date(+a + day)]; }
    return [new Date(+t0 - (+v - 1) * day), new Date(+t0 + day)];
  }
  $('#repGo').onclick = async () => {
    const [from, to] = repPeriod(); $('#repGo').disabled = true; $('#rep').replaceChildren(h('p', {className:'muted', textContent:'Wczytuję zamówienia…'}));
    try {
      const snap = await fs.getDocs(fs.query(refs.orders, fs.where('created', '>=', from), fs.where('created', '<', to), fs.orderBy('created')));
      REP = snap.docs.map(d => Object.assign({id:d.id}, d.data())); REPR = [from, to];
      renderReport();
    } catch(e) { $('#rep').replaceChildren(h('p', {className:'err danger', textContent:errText(e)})); }
    $('#repGo').disabled = false;
  };
  function hbars(rows, total){
    const max = Math.max(1, ...rows.map(r => r[1]));
    return h('div', {className:'hbars'}, ...rows.map(([label, n]) => h('div', {className:'hb', title: label + ': ' + n},
      h('span', {className:'l', textContent:label}),
      h('span', {className:'t'}, h('span', {className:'b', style:'width:' + Math.max(1.5, n / max * 100) + '%'})),
      h('span', {className:'v num', textContent: n + (total ? '  ·  ' + Math.round(n / total * 100) + '%' : '')}))));
  }
  function vbars(rows, label){
    // rows: [[etykieta, liczba], ...]; prosty wykres słupkowy w SVG
    const W = 720, H = 220, pl_ = 8, pb = 26, pt = 22, n = rows.length, max = Math.max(1, ...rows.map(r => r[1]));
    const bw = (W - pl_ * 2) / n, g = Math.min(14, bw * 0.28), peak = rows.reduce((a, r, i) => r[1] > rows[a][1] ? i : a, 0);
    const NS = 'http://www.w3.org/2000/svg', el = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const svg = el('svg', {viewBox:`0 0 ${W} ${H}`, class:'vbars', role:'img', 'aria-label':label});
    svg.append(el('line', {x1:pl_, x2:W - pl_, y1:H - pb + .5, y2:H - pb + .5, class:'base'}));
    rows.forEach(([lab, v], i) => {
      const x = pl_ + i * bw + g / 2, w = bw - g, hh = v / max * (H - pb - pt), y = H - pb - hh, r = Math.min(4, w / 2, hh);
      const grp = el('g', {class:'bar' + (i === peak && v ? ' peak' : '')});
      const t = el('title', {}); t.textContent = lab + ': ' + v + ' ' + pl(v, 'zamówienie', 'zamówienia', 'zamówień'); grp.append(t);
      grp.append(el('rect', {x: pl_ + i * bw, y: pt - 6, width: bw, height: H - pb - pt + 6, class:'hit'}));
      if (v) grp.append(el('path', {d:`M${x},${H - pb}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${H - pb}Z`}));
      if (v && (n <= 16 || i === peak)) { const tv = el('text', {x: x + w / 2, y: y - 6, class:'val'}); tv.textContent = v; grp.append(tv); }
      if (n <= 16 || i % Math.ceil(n / 12) === 0) { const tl = el('text', {x: x + w / 2, y: H - 8, class:'lab'}); tl.textContent = lab; grp.append(tl); }
      svg.append(grp);
    });
    return svg;
  }
  function renderReport(){
    const [from, to] = REPR, all = REP;
    const ok = all.filter(o => ['nowe', 'gotowe', 'wydane'].includes(o.status));
    const canc = all.filter(o => o.status === 'anulowane').length, rej = all.filter(o => o.status === 'odrzucone').length;
    const days = Math.round((to - from) / 864e5);
    const period = days === 1 ? fmtDay(from) : fmtDay(from) + ' – ' + fmtDay(new Date(+to - 1));
    $('#repPrint').disabled = $('#repCsv').disabled = false;
    const head = h('section', {className:'card rep-head'}, h('h1', {textContent:(BAR ? BAR.barName : 'Moctail bar') + ': raport'}),
      h('p', {className:'muted', style:'margin:0', textContent:period + (BAR && BAR.event ? ' · ' + BAR.event : '') + ' · wygenerowano ' + new Date().toLocaleString('pl-PL', {dateStyle:'short', timeStyle:'short'})}));
    if (!ok.length) { $('#rep').replaceChildren(head, h('section', {className:'card'}, h('p', {className:'muted', style:'margin:0', textContent:'W tym okresie nie było przyjętych zamówień.' + (canc + rej ? ' Anulowane: ' + canc + ', odrzucone: ' + rej + '.' : '')}))); return; }
    // drinki, dodatki, godziny
    const cnt = (arr, f) => { const m = new Map(); arr.forEach(o => [].concat(f(o)).forEach(k => k && m.set(k, (m.get(k) || 0) + 1))); return [...m].sort((a, b) => b[1] - a[1]); };
    const emo = n => { const it = (BAR && BAR.items || []).find(i => i.name === n); return it ? it.emoji + ' ' : ''; };
    const drinks = cnt(ok, o => o.itemName).map(([n, c]) => [emo(n) + n, c]);
    const opts = cnt(ok, o => o.opts || []);
    const hours = new Array(24).fill(0); ok.forEach(o => hours[ts(o).getHours()]++);
    const used = hours.map((v, i) => v ? i : -1).filter(i => i >= 0), h0 = Math.min(...used), h1 = Math.max(...used);
    const hourRows = []; for (let i = h0; i <= h1; i++) hourRows.push([String(i).padStart(2, '0') + ':00', hours[i]]);
    const peakH = hours.indexOf(Math.max(...hours));
    // najlepsze 15 minut
    const q = new Map(); ok.forEach(o => { const d = ts(o), k = isoDay(d) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(Math.floor(d.getMinutes() / 15) * 15).padStart(2, '0'); q.set(k, (q.get(k) || 0) + 1); });
    const best15 = [...q].sort((a, b) => b[1] - a[1])[0];
    // czas przygotowania: od złożenia do „Gotowe” (mediana, bez skrajnych > 2 h)
    const waits = ok.map(o => { const r = toD(o.readyAt); return r ? (r - ts(o)) / 60000 : null; }).filter(v => v != null && v >= 0 && v < 120).sort((a, b) => a - b);
    const med = waits.length ? waits[Math.floor(waits.length / 2)] : null;
    const fmtMin = m => m == null ? '—' : m < 1 ? '< 1 min' : Math.round(m) + ' min';
    const guests = new Set(ok.map(o => (o.guest || '').trim().toUpperCase()).filter(Boolean)).size;
    const tile = (lab, val, sub) => h('div', {className:'tile'}, h('span', {className:'k', textContent:lab}), h('span', {className:'v', textContent:val}), sub ? h('span', {className:'s', textContent:sub}) : null);
    const tiles = h('section', {className:'tiles'},
      tile('Zamówienia', String(ok.length), ok.filter(o => o.status === 'wydane').length + ' wydanych'),
      tile('Najpopularniejszy', drinks[0][0], drinks[0][1] + ' ' + pl(drinks[0][1], 'zamówienie', 'zamówienia', 'zamówień') + ' · ' + Math.round(drinks[0][1] / ok.length * 100) + '%'),
      tile('Godzina szczytu', String(peakH).padStart(2, '0') + ':00–' + String(peakH + 1).padStart(2, '0') + ':00', hours[peakH] + ' ' + pl(hours[peakH], 'zamówienie', 'zamówienia', 'zamówień')),
      tile('Czas przygotowania', fmtMin(med), waits.length ? 'mediana z ' + waits.length + ' ' + pl(waits.length, 'zamówienia', 'zamówień', 'zamówień') : 'brak danych'),
      tile(guests ? 'Różnych gości' : 'Anulowane / odrzucone', guests ? String(guests) : canc + ' / ' + rej, guests ? 'po kodzie z identyfikatora' : ''));
    const sections = [head, tiles];
    sections.push(h('section', {className:'card'}, h('h2', {textContent:'Zamówienia w poszczególnych godzinach' + (days > 1 ? ' (suma z ' + days + ' dni)' : '')}), vbars(hourRows, 'Zamówienia na godzinę'),
      best15 ? h('p', {className:'muted', style:'margin:6px 0 0;font-size:12px', textContent:'Najbardziej obłożony kwadrans: ' + (days > 1 ? best15[0] : best15[0].slice(11)) + ' (' + best15[1] + ' ' + pl(best15[1], 'zamówienie', 'zamówienia', 'zamówień') + ').'}) : null));
    if (days > 1) {
      const dm = new Map(); for (let d = +from; d < +to; d += 864e5) dm.set(isoDay(new Date(d)), 0);
      ok.forEach(o => { const k = isoDay(ts(o)); dm.set(k, (dm.get(k) || 0) + 1); });
      sections.push(h('section', {className:'card'}, h('h2', {textContent:'Zamówienia dziennie'}), vbars([...dm].map(([k, v]) => [k.slice(8) + '.' + k.slice(5, 7), v]), 'Zamówienia dziennie')));
    }
    sections.push(h('section', {className:'grid2r'},
      h('div', {className:'card'}, h('h2', {textContent:'Ranking drinków'}), hbars(drinks, ok.length)),
      h('div', {className:'card'}, h('h2', {textContent:'Dodatki'}), opts.length ? hbars(opts, ok.length) : h('p', {className:'muted', textContent:'Nikt nie wybierał dodatków.'}))));
    // godzina po godzinie
    const rows = hourRows.filter(r => r[1]).map(([lab]) => {
      const hr = +lab.slice(0, 2), os = ok.filter(o => ts(o).getHours() === hr), top = cnt(os, o => o.itemName)[0];
      const w = os.map(o => { const r = toD(o.readyAt); return r ? (r - ts(o)) / 60000 : null; }).filter(v => v != null && v >= 0 && v < 120).sort((a, b) => a - b);
      return h('tr', {}, h('td', {className:'num', textContent:lab + '–' + String(hr + 1).padStart(2, '0') + ':00'}), h('td', {className:'num', textContent:os.length}),
        h('td', {textContent: top ? emo(top[0]) + top[0] + ' (' + top[1] + ')' : '—'}), h('td', {className:'num', textContent: fmtMin(w.length ? w[Math.floor(w.length / 2)] : null)}));
    });
    sections.push(h('section', {className:'card'}, h('h2', {textContent:'Godzina po godzinie'}), h('div', {className:'tablewrap'}, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {textContent:'Godzina'}), h('th', {textContent:'Zamówień'}), h('th', {textContent:'Najczęściej zamawiany'}), h('th', {textContent:'Czas przygotowania'}))),
      h('tbody', {}, ...rows)))));
    sections.push(h('p', {className:'muted', style:'font-size:12px;margin:0', textContent:'Anulowane: ' + canc + ' · odrzucone automatycznie (np. limit na kod, wstrzymane zamówienia): ' + rej + '. Czas przygotowania liczony od złożenia zamówienia do kliknięcia „Gotowe” (dostępny dla zamówień od tej wersji panelu).'}));
    $('#rep').replaceChildren(...sections);
  }
  $('#repPrint').onclick = () => window.print();
  $('#repCsv').onclick = () => {
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', t = d => d ? d.toLocaleString('pl-PL') : '';
    const lines = [['Kod','Numer','Złożone','Gotowe','Wydane','Drink','Dodatki','Imię','Kod gościa','Status'].join(';')].concat(
      REP.map(o => [o.code, o.no || '', t(ts(o)), t(toD(o.readyAt)), t(toD(o.doneAt)), o.itemName, (o.opts || []).join(', '), o.name, o.guest, o.status].map(esc).join(';')));
    const a = h('a', {href: URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], {type:'text/csv'})), download:'moctail-raport-' + isoDay(REPR[0]) + '.csv'});
    document.body.appendChild(a); a.click(); a.remove();
  };

  /* zakładki */
  function tab(t){
    document.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== t);
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    try { localStorage.setItem('moctail-tab', t); } catch(e) {}
    if (t === 'ekran') pushBoard();
    if (t === 'qr') drawStickers();
  }
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = e => { e.preventDefault(); tab(b.dataset.tab); });
  tab((() => { try { const t = localStorage.getItem('moctail-tab'); return ['zam','ekran','menu','qr','raport'].includes(t) ? t : 'zam'; } catch(e) { return 'zam'; } })());

  /* ekran nie gaśnie, gdy panel jest otwarty */
  async function wake(){ try { if (navigator.wakeLock && !document.hidden) await navigator.wakeLock.request('screen'); } catch(e) {} }
  document.addEventListener('visibilitychange', wake);
}
