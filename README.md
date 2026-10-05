# Moctail bar

Zamawianie drinków z telefonu na evencie. Cały system to strony internetowe, bez instalowania programów:

| Strona | Adres | Kto używa |
|---|---|---|
| **Menu dla gości** | `https://LOGIN.github.io/REPO/?b=…` (z kodu QR) | Goście na swoich telefonach |
| **Panel baru** | `https://LOGIN.github.io/REPO/bar/` | Obsługa: kolejka, menu, kod QR, druk naklejek |
| **Ekran wydawki** | `https://LOGIN.github.io/REPO/ekran/?b=…` | Telewizor/tablet przy barze, dowolna sieć |

```
Telefon gościa ──► Firebase (baza Google) ──► Panel baru (laptop/tablet) ──► naklejka z drukarki
      ▲                     │
      └── „Gotowe!” ◄───────┴──────────────► Ekran wydawki (TV)
```

Gość skanuje kod QR, wybiera drink, wpisuje imię i zamawia. Na telefonie widzi na żywo: *Przyjęte (#12)* → *Gotowe! Odbierz przy barze*. Obsługa widzi zamówienia na każdym zalogowanym urządzeniu, a jedno urządzenie z podłączoną drukarką drukuje naklejki na kubki.

---

## Konfiguracja (raz, ok. 15 minut)

### 1. Projekt Firebase
1. Wejdź na https://console.firebase.google.com i zaloguj się kontem Google.
2. **Utwórz projekt** (Create project), nazwa np. `moctail-bar`. Google Analytics możesz wyłączyć.

### 2. Baza danych (Firestore)
1. W menu po lewej: **Build → Firestore Database → Create database**.
2. Lokalizacja: **eur3 (Europe)**. Tryb: **production mode**. Kliknij **Create**.
3. Zakładka **Rules (Reguły)**: usuń wszystko, wklej całą zawartość pliku [`firestore.rules`](firestore.rules) z tego repozytorium i kliknij **Publish (Opublikuj)**.

### 3. Konto dla obsługi baru
1. **Build → Authentication → Get started**.
2. Zakładka **Sign-in method** → **Email/Password** → włącz pierwszy przełącznik → **Save**.
3. Zakładka **Users** → **Add user**: wpisz e-mail i hasło dla obsługi baru. Tym kontem logujecie się w panelu na wszystkich urządzeniach.
4. Zakładka **Settings → Authorized domains** → **Add domain** → wpisz `LOGIN.github.io` (np. `top-art-agency.github.io`).

### 4. Połącz strony z projektem
1. W Firebase: ⚙ obok „Project Overview” → **Project settings** → sekcja **Your apps** → ikona **`</>`** (Web) → nazwa np. `moctail` → **Register app**.
2. Zobaczysz fragment `const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "...", ... }`.
3. Na GitHubie otwórz plik **`docs/firebase-config.js`**, kliknij ✏️ (Edit) i podmień cztery wartości `WKLEJ_TUTAJ` na te z Firebase: `apiKey`, `authDomain`, `projectId`, `appId`. Kliknij **Commit changes**.

Te klucze nie są tajne, mogą być w publicznym repozytorium. Dostęp do danych chronią reguły z kroku 2.

### 5. GitHub Pages
W repozytorium: **Settings → Pages → Branch: `main`, folder `/docs` → Save**. Po 1–2 minutach strony działają.

### 6. Pierwsze uruchomienie
1. Otwórz `https://LOGIN.github.io/REPO/bar/` i zaloguj się kontem z kroku 3.
2. Panel sam utworzy bar z przykładowym menu. Zmień menu, nazwę i dodatki.
3. Kliknij **Testowe zamówienie**. Powinno pojawić się w kolejce z numerem #1.
4. Weź telefon, wyłącz Wi-Fi, zeskanuj kod QR z panelu i złóż zamówienie.

---

## Druk naklejek (opcjonalnie)

Przeglądarka drukuje przez zwykłe drukowanie systemowe, więc drukarka etykiet musi być **zainstalowana w Windows/macOS ze sterownikiem producenta**.

1. Zainstaluj sterownik drukarki i ustaw ją jako **drukarkę domyślną**. W jej preferencjach ustaw rozmiar papieru, np. 100 × 50 mm.
2. W panelu, w sekcji **Drukarka na tym urządzeniu**: zaznacz „To urządzenie drukuje naklejkę…”, wpisz rozmiar etykiety i kliknij **Wydrukuj testową naklejkę**.
3. **Bez okienka „Drukuj”**: zamknij całkowicie Chrome i uruchom go z opcją `--kiosk-printing` (gotowe polecenia dla Windows i macOS są w panelu, sekcja „Jak drukować bez okienka”). Wtedy naklejki drukują się same.

Drukowanie włącz **tylko na jednym urządzeniu**. Pozostałe tablety obsługi mogą mieć panel otwarty bez drukowania.

Bez drukarki wszystko działa: zamówienia są w kolejce, a gość i ekran wydawki dostają status „Gotowe”.

## Na evencie

- **Kod QR**: w panelu wpisz napisy, wybierz czcionkę i kliknij **Drukuj naklejkę z kodem**. Do plakatu zrób zrzut ekranu kodu. Na stoliku wystarczy 3 × 3 cm, na plakacie oglądanym z kilku metrów co najmniej 10 × 10 cm.
- **Ekran wydawki**: skopiuj link z panelu (sekcja Ekran wydawki) i otwórz go na telewizorze lub tablecie. Działa w każdej sieci i nie wymaga logowania.
- **„Gotowe”** pokazuje kod na ekranie i u gościa na telefonie. **„Wydane”** zdejmuje zamówienie z ekranu.
- **Skończył się składnik?** Odznacz „jest” przy drinku.
- **Za duży ruch?** Wyłącz „Przyjmuję zamówienia”. Strona gościa pokaże „Bar chwilowo zamknięty”, a nowe zamówienia zostaną zablokowane już w bazie.
- **Limit**: domyślnie jedno zamówienie w przygotowaniu na jeden kod z identyfikatora.

## Darmowy plan Firebase

Plan Spark (bez karty płatniczej) daje dziennie 50 000 odczytów i 20 000 zapisów w bazie. Event na ok. 1000 gości i 1200 zamówień zużywa szacunkowo ok. 30–35 tys. odczytów i ok. 11 tys. zapisów, z jednym ekranem wydawki i dwoma urządzeniami z panelem. Każdy dodatkowy otwarty panel albo ekran zwiększa liczbę odczytów. Po przekroczeniu limitu baza przestaje działać do następnego dnia, nic nie jest naliczane. Na większe eventy można włączyć plan Blaze (płatny za użycie) w ustawieniach projektu.

## Bezpieczeństwo

- Gość może tylko złożyć zamówienie (sprawdzane w regułach: pola, długości, otwarty bar) i podejrzeć swoje, znając jego losowy numer.
- Tylko zalogowana obsługa widzi listę zamówień, zmienia statusy i menu.
- Ekran wydawki pokazuje publiczną tablicę: kod, imię i nazwę drinka dla zamówień w toku.
- Imiona i kody z identyfikatorów są przechowywane w Firebase (Google) w regionie wybranym w kroku 2.

## Pliki

```
docs/index.html           menu dla gości
docs/bar/index.html       panel baru
docs/ekran/index.html     ekran wydawki
docs/firebase-config.js   ustawienia Twojego projektu Firebase (uzupełnij)
docs/fb.js, style.css     wspólne pliki stron
firestore.rules           reguły bezpieczeństwa do wklejenia w Firebase Console
```

Biblioteki ładowane z CDN: Firebase JS SDK (Apache-2.0), [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT), [jsQR](https://github.com/cozmo/jsQR) (Apache-2.0), czcionki Google Fonts (OFL).
