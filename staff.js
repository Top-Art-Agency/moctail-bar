// Widok obsługi: logowanie, zamówienia, ekran wydawki, menu, kod QR, drukarka
import { db, auth, fs, au, errText } from './fb.js';
const MARKUP = "<nav class=\"top\"><b>Moctail bar</b>\n  <span id=\"tabs\" hidden style=\"display:contents\">\n    <a href=\"#\" data-tab=\"zam\">Zamówienia</a><a href=\"#\" data-tab=\"ekran\">Ekran wydawki</a><a href=\"#\" data-tab=\"menu\">Menu</a><a href=\"#\" data-tab=\"qr\">Kod QR</a><a href=\"#\" data-tab=\"druk\">Drukarka</a>\n  </span>\n  <span class=\"right\"><a href=\"./?gosc\" target=\"_blank\">Podgląd menu</a><span class=\"muted\" id=\"who\"></span><a href=\"#\" id=\"logout\" hidden>Wyloguj</a></span></nav>\n\n<form class=\"gate card\" id=\"vLogin\" hidden autocomplete=\"on\">\n  <h1>Obsługa baru</h1>\n  <p class=\"muted\" style=\"margin:0\">Zaloguj się kontem obsługi (zakładasz je w Firebase Console → Authentication → Users).</p>\n  <label class=\"f\">E-mail<input id=\"lEmail\" type=\"email\" autocomplete=\"username\" required></label>\n  <label class=\"f\">Hasło<input id=\"lPass\" type=\"password\" autocomplete=\"current-password\" required></label>\n  <p class=\"err danger\" id=\"lErr\" style=\"margin:0;min-height:1em\"></p>\n  <button class=\"primary\" type=\"submit\" id=\"lGo\">Zaloguj</button>\n  <a href=\"./\" class=\"muted\" style=\"font-size:13px\">← Wróć do menu dla gości</a>\n</form>\n\n<div id=\"vApp\" hidden>\n  <div class=\"wrap stack\" data-pane=\"zam\">\n    <div class=\"top\">\n      <div>\n        <h1 id=\"title\">Moctail bar</h1>\n        <div class=\"inline\"><span class=\"pill\" id=\"conn\">Łączę…</span><span class=\"pill\" id=\"prn\"></span></div>\n      </div>\n      <div class=\"inline\">\n        <label class=\"switch\" id=\"openSw\"><input type=\"checkbox\" id=\"open\"> <span id=\"openTxt\">Przyjmuję zamówienia</span></label>\n        <button id=\"test\">Testowe zamówienie</button>\n      </div>\n    </div>\n    <section class=\"queue\">\n      <div class=\"col\"><h2>Do zrobienia <b id=\"nNew\">0</b></h2><div class=\"orders\" id=\"qNew\"></div></div>\n      <div class=\"col\"><h2>Gotowe do odbioru <b id=\"nReady\">0</b></h2><div class=\"orders\" id=\"qReady\"></div></div>\n    </section>\n    <div class=\"stat\" id=\"stats\"></div>\n    <section class=\"card\">\n      <details>\n        <summary>Historia: odrzucone <b id=\"nRej\">0</b> · wydane dziś <b id=\"nDone\">0</b></summary>\n        <div class=\"tablewrap\" style=\"margin-top:10px\"><table>\n          <thead><tr><th>Kod</th><th>Nr</th><th>Godz.</th><th>Drink</th><th>Gość</th><th>Status</th><th></th></tr></thead>\n          <tbody id=\"hist\"></tbody>\n        </table></div>\n        <div class=\"inline\" style=\"margin-top:10px\"><button id=\"csv\">Pobierz historię (CSV)</button><button class=\"danger\" id=\"resetNo\">Zacznij numerację od 1</button></div>\n      </details>\n    </section>\n  </div>\n\n  <section class=\"screen\" data-pane=\"ekran\" id=\"paneEkran\" hidden>\n    <header><h1 id=\"scrBar\">Moctail bar</h1><span class=\"inline\"><span class=\"clock\" id=\"scrClock\"></span><button id=\"scrFull\">Pełny ekran</button></span></header>\n    <main><section><h2>Gotowe do odbioru</h2><div class=\"ready\" id=\"scrReady\"></div></section><section><h2>W przygotowaniu</h2><div class=\"prep\" id=\"scrPrep\"></div></section></main>\n    <footer id=\"scrFoot\"></footer>\n  </section>\n\n  <div class=\"wrap stack\" data-pane=\"menu\" hidden>\n    <section class=\"card stack\" style=\"gap:12px\">\n      <h2 style=\"margin:0\">Menu</h2>\n      <p class=\"muted\" style=\"margin:0;font-size:13px\">Zmiany widać na telefonach gości po odświeżeniu strony (same odświeżają co kilka minut). Odznacz drink, gdy skończy się składnik.</p>\n      <div class=\"mlist\" id=\"menu\"></div>\n      <div class=\"inline\"><button id=\"addItem\">+ Dodaj drink</button><button class=\"primary\" id=\"saveMenu\">Zapisz menu</button></div>\n      <label class=\"f\">Dodatki do wyboru (oddziel przecinkami)<input id=\"options\" placeholder=\"bez lodu, mniej słodki\"></label>\n      <div class=\"row\">\n        <label class=\"f\">Nazwa baru<input id=\"barName\" maxlength=\"40\"></label>\n        <label class=\"f\">Podtytuł (np. nazwa wydarzenia)<input id=\"event\" maxlength=\"40\"></label>\n      </div>\n      <div class=\"row\">\n        <label class=\"f\">Zamówień w przygotowaniu na jeden kod (0 = bez limitu)<input id=\"limit\" type=\"number\" min=\"0\" max=\"20\"></label>\n        <label class=\"check\" style=\"align-self:end;padding-bottom:8px\"><input type=\"checkbox\" id=\"reqCode\"> Wymagaj kodu z identyfikatora</label>\n      </div>\n      <div><button class=\"primary\" id=\"saveSet\">Zapisz ustawienia</button></div>\n    </section>\n  </div>\n\n  <div class=\"wrap stack\" data-pane=\"qr\" hidden>\n    <section class=\"card stack\" style=\"gap:12px;max-width:720px\">\n      <h2 style=\"margin:0\">Kod QR dla gości</h2>\n      <p class=\"warnbox\" id=\"cfgWarn\" hidden style=\"margin:0\">Goście widzą menu innego konta baru. Ta strona obsługuje jeden bar; zaloguj się kontem, które uruchomiło ją jako pierwsze.</p>\n      <label class=\"f\">Adres menu (kod QR prowadzi tutaj)\n        <span class=\"row\" style=\"grid-template-columns:minmax(0,1fr) auto\"><input id=\"guestLink\" readonly class=\"mono\" style=\"font-size:12px\"><button id=\"copyLink\">Kopiuj</button></span></label>\n      <span class=\"muted\" style=\"font-size:12px\">Tekst na naklejce obok kodu (puste pole = bez tej linii)</span>\n      <input id=\"qrT1\" maxlength=\"40\" placeholder=\"Duży napis, linia 1\">\n      <input id=\"qrT2\" maxlength=\"40\" placeholder=\"Duży napis, linia 2\">\n      <input id=\"qrT3\" maxlength=\"40\" placeholder=\"Mały dopisek na dole\">\n      <label class=\"f\">Czcionka<select id=\"qrFont\"></select></label>\n      <span class=\"muted\" style=\"font-size:12px\">Podgląd naklejki:</span>\n      <canvas id=\"qrPrev\" style=\"background:#fff;border:1px solid var(--line);border-radius:6px;max-width:100%;height:auto\"></canvas>\n      <div class=\"qrbox\"><canvas id=\"qr\" width=\"10\" height=\"10\"></canvas>\n        <span class=\"stack\" style=\"gap:8px\"><button class=\"primary\" id=\"printQr\">Drukuj naklejkę z kodem</button><span class=\"muted\" style=\"font-size:12px\">Do plakatu: zrzut ekranu kodu obok.</span></span></div>\n      <p class=\"muted\" style=\"margin:0;font-size:12px\">Adres z dopiskiem <span class=\"mono\">?kod=GUEST-0142&amp;imie=Anna</span> wypełni gościowi pola automatycznie.</p>\n    </section>\n  </div>\n\n  <div class=\"wrap stack\" data-pane=\"druk\" hidden>\n    <section class=\"card stack\" style=\"gap:12px;max-width:820px\">\n      <h2 style=\"margin:0\">Drukarka na tym urządzeniu</h2>\n      <label class=\"check\"><input type=\"checkbox\" id=\"pAuto\"> To urządzenie drukuje naklejkę przy każdym nowym zamówieniu</label>\n      <p class=\"warnbox\" style=\"margin:0\">Włącz to tylko na jednym urządzeniu, do którego jest podłączona drukarka. Inaczej naklejki wydrukują się podwójnie.</p>\n      <div class=\"row\">\n        <label class=\"f\">Szerokość etykiety (mm)<input id=\"pW\" type=\"number\" min=\"20\" max=\"120\"></label>\n        <label class=\"f\">Wysokość etykiety (mm)<input id=\"pH\" type=\"number\" min=\"15\" max=\"200\"></label>\n        <label class=\"f\">Czcionka naklejki<select id=\"pFont\"></select></label>\n      </div>\n      <div class=\"inline\"><button class=\"primary\" id=\"pSave\">Zapisz</button><button id=\"pTest\">Wydrukuj testową naklejkę</button></div>\n      <details>\n        <summary>Jak drukować bez okienka „Drukuj” (zalecane)</summary>\n        <div class=\"stack\" style=\"gap:8px;margin-top:8px;font-size:13px\">\n          <span>1. Zainstaluj drukarkę etykiet w systemie (sterownik producenta) i ustaw ją jako <b>drukarkę domyślną</b>. W jej preferencjach ustaw rozmiar papieru taki jak wyżej.</span>\n          <span>2. Zamknij całkowicie Chrome i uruchom go z opcją cichego drukowania:</span>\n          <b>Windows</b> (skrót na pulpicie → Właściwości → Element docelowy):\n          <div class=\"code-box\" id=\"cmdWin\"></div>\n          <b>macOS</b> (Terminal):\n          <div class=\"code-box\" id=\"cmdMac\"></div>\n          <span>Bez tego Chrome przy każdej naklejce pokaże okno drukowania. Wtedy kliknij „Drukuj”; zamówienia i tak działają.</span>\n        </div>\n      </details>\n    </section>\n  </div>\n</div>\n<div class=\"toast\" id=\"toast\" hidden></div>";
export function mount(root){
  root.innerHTML = MARKUP;
  const $ = s => document.querySelector(s);
  const h = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach(k => k != null && e.append(k)); return e; };
  function toast(t){ const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2800); }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const FONTS = [['Unbounded:800','Unbounded: nowoczesna, okrągła'],['Bebas Neue:400','Bebas Neue: wysoka, plakatowa'],['Pacifico:400','Pacifico: odręczna'],
    ['Playfair Display:italic 800','Playfair: elegancka kursywa'],['Fredoka:700','Fredoka: zaokrąglona'],['Archivo Narrow:700','Archivo Narrow: prosta, wąska']];
  ['#qrFont', '#pFont'].forEach(id => $(id).replaceChildren(...FONTS.map(([v, t]) => h('option', {value:v, textContent:t}))));

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
  const P = Object.assign({auto:false, w:100, h:50, font:'Archivo Narrow:700'}, (() => { try { return JSON.parse(localStorage.getItem('moctail-print')) || {}; } catch(e) { return {}; } })());
  const saveP = () => { try { localStorage.setItem('moctail-print', JSON.stringify(P)); } catch(e) {} };

  let UID = null, BAR = null, ACTIVE = [], HIST = [], menuDirty = false, unsubs = [], lastIds = null;
  const refs = {};
  const ACT = ['czeka', 'nowe', 'gotowe'];
  const ts = o => o.created && o.created.toDate ? o.created.toDate() : new Date();
  const hhmm = d => d.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'});

  /* ---------- logowanie ---------- */
  function show(v){ ['#vLogin', '#vApp'].forEach(id => $(id).hidden = id !== v); $('#tabs').hidden = v !== '#vApp'; }
  au.onAuthStateChanged(auth, user => {
    unsubs.forEach(u => u()); unsubs = [];
    if (!user) { UID = null; show('#vLogin'); $('#logout').hidden = true; $('#who').textContent = ''; return; }
    UID = user.uid; $('#who').textContent = user.email || ''; $('#logout').hidden = false;
    show('#vApp'); start();
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
    refs.bar = fs.doc(db, 'bars', UID);
    refs.counter = fs.doc(db, 'bars', UID, 'private', 'counter');
    refs.board = fs.doc(db, 'bars', UID, 'public', 'board');
    refs.orders = fs.collection(db, 'bars', UID, 'orders');
    refs.config = fs.doc(db, 'config', 'main');
    try {
      const s = await fs.getDoc(refs.bar);
      if (!s.exists()) { await fs.setDoc(refs.bar, DEFAULT_BAR); toast('Utworzono bar z przykładowym menu. Zmień je poniżej.'); }
    } catch(e) { $('#conn').className = 'pill bad'; $('#conn').textContent = errText(e); return; }
    // ta strona obsługuje jeden bar: zapisujemy, które konto nim zarządza, żeby goście widzieli jego menu
    try {
      const c = await fs.getDoc(refs.config);
      if (!c.exists()) await fs.setDoc(refs.config, {bar: UID});
      $('#cfgWarn').hidden = !c.exists() || c.data().bar === UID;
    } catch(e) { console.warn(e); }
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
  function printCanvas(c){ printQ.push(c.toDataURL('image/png')); runPrint(); }
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
  async function setStatus(o, status, msg){ try { await fs.updateDoc(fs.doc(refs.orders, o.id), {status}); if (msg) toast(msg); } catch(e) { toast(errText(e)); } }
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
      a.append(h('button', {textContent:'Drukuj', onclick:async () => { try { await document.fonts.load(fontSpec(P.font, 40)); } catch(e){} printCanvas(orderCanvas(o)); }}));
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
    drawStickers();
  }
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
    const panel = location.origin + location.pathname + '#obsluga';
    $('#cmdWin').textContent = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing "' + panel + '"';
    $('#cmdMac').textContent = 'open -na "Google Chrome" --args --kiosk-printing "' + panel + '"';
  }
  function copy(v, ok){ try { navigator.clipboard.writeText(v).then(() => toast(ok), () => toast('Zaznacz i skopiuj ręcznie')); } catch(e) { toast('Zaznacz i skopiuj ręcznie'); } }
  $('#copyLink').onclick = () => copy(guestUrl(), 'Skopiowano link dla gości');
  function stickerCanvas(){
    const W = Math.round(P.w * K), H = Math.round(P.h * K);
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
  $('#printQr').onclick = async () => { try { await document.fonts.load(fontSpec($('#qrFont').value, 40)); } catch(e) {} printCanvas(stickerCanvas()); };

  /* ---------- ustawienia drukarki tego urządzenia ---------- */
  function fillP(){ $('#pAuto').checked = P.auto; $('#pW').value = P.w; $('#pH').value = P.h; $('#pFont').value = P.font; prnPill(); }
  function prnPill(){ const el = $('#prn'); el.className = 'pill' + (P.auto ? ' ok' : ''); el.textContent = P.auto ? 'To urządzenie drukuje naklejki' : 'Druk na tym urządzeniu wyłączony'; }
  function readP(){ P.w = Math.max(20, Math.min(120, +$('#pW').value || 100)); P.h = Math.max(15, Math.min(200, +$('#pH').value || 50)); P.font = $('#pFont').value; saveP(); prnPill(); drawStickers(); }
  $('#pSave').onclick = () => { readP(); toast('Zapisano ustawienia drukarki na tym urządzeniu'); };
  $('#pAuto').onchange = () => { P.auto = $('#pAuto').checked; saveP(); prnPill(); if (P.auto) autoPrint(); toast(P.auto ? 'To urządzenie będzie drukować naklejki' : 'Druk wyłączony na tym urządzeniu'); };
  $('#pTest').onclick = async () => { readP(); try { await document.fonts.load(fontSpec(P.font, 40)); } catch(e) {} printCanvas(orderCanvas({no:17, code:'K7P', itemName:'Virgin Mojito', opts:['bez lodu'], name:'Anna', guest:''})); };
  fillP();

  /* zakładki */
  function tab(t){
    document.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== t);
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    try { localStorage.setItem('moctail-tab', t); } catch(e) {}
    if (t === 'ekran') pushBoard();
    if (t === 'qr') drawStickers();
  }
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = e => { e.preventDefault(); tab(b.dataset.tab); });
  tab((() => { try { return localStorage.getItem('moctail-tab') || 'zam'; } catch(e) { return 'zam'; } })());

  /* ekran nie gaśnie, gdy panel jest otwarty */
  async function wake(){ try { if (navigator.wakeLock && !document.hidden) await navigator.wakeLock.request('screen'); } catch(e) {} }
  document.addEventListener('visibilitychange', wake);
}
