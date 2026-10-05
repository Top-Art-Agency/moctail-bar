# Moctail bar

Zamawianie drinków z telefonu na evencie. **Jedna strona internetowa pod jednym adresem**, bez instalowania programów:

- **Gość** wchodzi na `https://LOGIN.github.io/REPO/` (np. z kodu QR na stoliku), wybiera drink, wpisuje imię i zamawia. Na telefonie widzi na żywo: *Przyjęte (#12)* → *Gotowe! Odbierz przy barze*.
- **Obsługa** na tym samym adresie klika na dole „Obsługa baru”, loguje się i ma zakładki: **Zamówienia**, **Ekran wydawki** (na pełny ekran na telewizor), **Menu**, **Kod QR**, **Drukarka**. Można być zalogowanym na kilku urządzeniach naraz.

Dane trzyma Firebase (baza Google, darmowy plan wystarcza na typowy event).

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
1. Otwórz `https://LOGIN.github.io/REPO/`, kliknij na dole **Obsługa baru** i zaloguj się kontem z kroku 3.
2. Pierwsze zalogowane konto staje się właścicielem baru na tej stronie. Panel sam utworzy przykładowe menu. Zmień je w zakładce **Menu**.
3. W zakładce **Zamówienia** kliknij **Testowe zamówienie**. Powinno pojawić się w kolejce z numerem #1.
4. Weź telefon, wyłącz Wi-Fi, otwórz adres strony (albo zeskanuj kod z zakładki **Kod QR**) i złóż zamówienie.

Podgląd tego, co widzi gość, gdy jesteś zalogowany: link **Podgląd menu** w prawym górnym rogu (adres z dopiskiem `?gosc`).

---

## Druk naklejek (opcjonalnie)

Przeglądarka drukuje przez zwykłe drukowanie systemowe, więc drukarka etykiet musi być **zainstalowana w Windows/macOS ze sterownikiem producenta**.

1. Zainstaluj sterownik drukarki i ustaw ją jako **drukarkę domyślną**. W jej preferencjach ustaw rozmiar papieru, np. 100 × 50 mm.
2. W zakładce **Drukarka**: zaznacz „To urządzenie drukuje naklejkę…”, wpisz rozmiar etykiety i kliknij **Wydrukuj testową naklejkę**.
3. **Bez okienka „Drukuj”**: zamknij całkowicie Chrome i uruchom go z opcją `--kiosk-printing` (gotowe polecenia dla Windows i macOS są w zakładce **Drukarka**). Wtedy naklejki drukują się same.

Drukowanie włącz **tylko na jednym urządzeniu**. Pozostałe tablety obsługi mogą mieć panel otwarty bez drukowania.

Bez drukarki wszystko działa: zamówienia są w kolejce, a gość i ekran wydawki dostają status „Gotowe”.

## Na evencie

- **Kod QR**: zakładka **Kod QR**, wpisz napisy, wybierz czcionkę i kliknij **Drukuj naklejkę z kodem**. Do plakatu zrób zrzut ekranu kodu. Kod prowadzi po prostu na adres strony. Na stoliku wystarczy 3 × 3 cm, na plakacie co najmniej 10 × 10 cm.
- **Ekran wydawki**: na telewizorze lub laptopie przy barze otwórz stronę, zaloguj się, wybierz zakładkę **Ekran wydawki** i kliknij **Pełny ekran**. Urządzenie zapamięta zakładkę.
- **„Gotowe”** pokazuje kod na ekranie i u gościa na telefonie. **„Wydane”** zdejmuje zamówienie z ekranu.
- **Skończył się składnik?** Odznacz „jest” przy drinku.
- **Za duży ruch?** Wyłącz „Przyjmuję zamówienia”. Strona gościa pokaże „Bar chwilowo zamknięty”, a nowe zamówienia zostaną zablokowane już w bazie.
- **Limit**: domyślnie jedno zamówienie w przygotowaniu na jeden kod z identyfikatora.

## Darmowy plan Firebase

Plan Spark (bez karty płatniczej) daje dziennie 50 000 odczytów i 20 000 zapisów w bazie. Event na ok. 1000 gości i 1200 zamówień zużywa szacunkowo ok. 30–35 tys. odczytów i ok. 11 tys. zapisów. Każde dodatkowe zalogowane urządzenie zwiększa liczbę odczytów. Po przekroczeniu limitu baza przestaje działać do następnego dnia, nic nie jest naliczane. Na większe eventy można włączyć plan Blaze (płatny za użycie) w ustawieniach projektu.

## Bezpieczeństwo

- Gość może tylko złożyć zamówienie (sprawdzane w regułach: pola, długości, otwarty bar) i podejrzeć swoje, znając jego losowy numer.
- Tylko zalogowana obsługa widzi listę zamówień, zmienia statusy i menu.
- Imiona i kody z identyfikatorów są przechowywane w Firebase (Google) w regionie wybranym w kroku 2.

## Pliki

```
docs/index.html           strona (wybiera widok gościa albo obsługi)
docs/guest.js, guest.css  menu i zamawianie dla gości
docs/staff.js, staff.css  panel obsługi z zakładkami
docs/fb.js                połączenie z Firebase
docs/firebase-config.js   ustawienia Twojego projektu Firebase (uzupełnij)
docs/bar/, docs/ekran/    przekierowania ze starych adresów
firestore.rules           reguły bezpieczeństwa do wklejenia w Firebase Console
```

Biblioteki ładowane z CDN: Firebase JS SDK (Apache-2.0), [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT), [jsQR](https://github.com/cozmo/jsQR) (Apache-2.0), czcionki Google Fonts (OFL).
