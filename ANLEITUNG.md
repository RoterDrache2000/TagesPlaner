# TagesPlaner – Anleitung

„TagesPlaner“ ist der Nachfolger der Morgenroutine-App: Routinen, Gewohnheiten, Aufgaben und ein Rückblick in einer App. Sie besteht nur aus normalen Dateien (HTML, CSS, JavaScript) und braucht **kein Claude, keinen Account, keinen Server**. Alle Daten bleiben auf deinem iPhone.

## Was die App kann

**Heute** (Startseite, die der Wecker öffnet)
- Tagesbogen: wie viel Zeit bis zur Schlafenszeit bleibt.
- Die Routine, die gerade dran ist, steht aufgeklappt oben (morgens „Morgen“, ab 21 Uhr „Abend“). Ist sie fertig, klappt sie zu.
- **Fokus-Modus**: ein Schritt pro Bildschirm, mit Timer, wenn der Schritt Minuten hat. „Später“ schiebt einen Schritt ans Ende.
- „Von gestern“: unerledigte Aufgaben auf heute oder auf später schieben.
- Fällige Gewohnheiten abhaken. Bei Mengen (z. B. 8 Gläser Wasser) zählt jedes **+** eins hoch.
- Die Aufgaben für heute.

**Planen**
- Aufgaben für heute, morgen oder später (ohne Datum) anlegen. Bis zu 3 pro Tag als „Wichtig“ markieren.
- Über **⋯** an einer Aufgabe: verschieben, wichtig, umbenennen, löschen.
- **Routinen bearbeiten**: Name, Startzeit, Wochentage, Schritte (umbenennen, Minuten, nach oben schieben, löschen mit zweimal Tippen). Ein Schritt kann mit einer Gewohnheit verknüpft werden, dann wird sie beim Abhaken mit erledigt.

**Gewohnheiten**
- Woche im Blick, Serie in Tagen. Heute und gestern lassen sich direkt antippen.
- Art „Ja / Nein“ oder „Menge“ mit Ziel und Einheit. Fällig an bestimmten Wochentagen. Tage, an denen eine Gewohnheit nicht fällig ist, unterbrechen die Serie nicht.
- Archivieren behält den Verlauf.

**Rückblick**
- Quoten der letzten 30 Tage, längste laufende Serie, Ø Dauer der Morgenroutine.
- Monatskalender: je kräftiger die Farbe, desto mehr war an dem Tag geschafft.
- Backup speichern und wiederherstellen, Einstellungen.

## Deine alten Daten

Wenn du die neue Version **unter derselben Adresse** hochlädst wie die alte Morgenroutine, übernimmt der TagesPlaner beim ersten Öffnen automatisch deine Schritte als Routine „Morgen“ (und was du heute schon abgehakt hast). Die Emojis am Anfang der Schritte werden dabei entfernt. Den Kurzbefehl musst du nicht ändern.

## Die Dateien

| Datei | Wofür |
|---|---|
| `index.html` | Gerüst der Seite |
| `style.css` | Aussehen. Farben stehen ganz oben (`--accent` ist das Kupfer) |
| `store.js` | Speichern, Backup, Serien-Berechnung, Übernahme der alten Daten. Standard-Routinen stehen in `defaults()` |
| `ui.js` | Bausteine: Knöpfe, Icons, Fenster von unten |
| `today.js` | Tab „Heute“ und Fokus-Modus |
| `plan.js` | Tab „Planen“ und Routinen bearbeiten |
| `habits.js` | Tab „Gewohnheiten“ |
| `review.js` | Tab „Rückblick“, Backup, Einstellungen |
| `app.js` | Start und Tab-Leiste |
| `sw.js` | Offline-Funktion |
| `manifest.json`, `icon-*.png` | Name und Icon für den Home-Bildschirm |

Alle Dateien müssen zusammen im selben Ordner liegen.

## 1. Auf GitHub hochladen (Update der Morgenroutine)

1. Dein Repository `TagesPlaner` auf github.com öffnen.
2. **Add file → Upload files**.
3. Alle Dateien aus dem Ordner `tag-app` hineinziehen (nicht den Ordner selbst). Gleichnamige Dateien werden ersetzt.
4. **Commit changes**.
5. Die alte `app.js` wird ersetzt. Es bleibt nichts Altes übrig, das stört. Die alte `ANLEITUNG.md` kannst du löschen oder ersetzen.
6. Nach 1 bis 2 Minuten ist alles online unter `https://roterdrache2000.github.io/TagesPlaner/` (Groß- und Kleinschreibung beachten). Seite in Safari öffnen und einmal **neu laden**, damit die neuen Dateien geladen werden.

Neu einrichten statt Update: siehe unten „Ganz neu einrichten“.

## 2. Wecker-Kurzbefehl

Bleibt wie bisher: **Kurzbefehle → Automation → Wecker → „Wird gestoppt“ → Sofort ausführen → „URLs öffnen“** mit deiner Adresse.

Optional für den Abend: eine zweite Automation **„Tageszeit“ 21:00 → URLs öffnen** mit derselben Adresse. Dann ist abends die Abendroutine oben.

## 3. Backup (wichtig)

Die Daten liegen nur im Browser auf dem iPhone. Safari kann Website-Daten löschen, wenn du die Seite rund 7 Tage nicht öffnest, oder wenn du „Verlauf und Websitedaten löschen“ machst.

- **Rückblick → Backup speichern** öffnet das Teilen-Menü. Wähle **„In Dateien sichern“** (z. B. iCloud Drive). Die Datei heißt `tagesplaner-backup-JJJJ-MM-TT.json`.
- **Backup wiederherstellen** lädt so eine Datei und ersetzt alle Daten.
- Die App erinnert dich, wenn das letzte Backup älter als 7 Tage ist.

## Wichtig: Safari und Home-Bildschirm-Icon

Auf dem iPhone haben Safari und das Home-Bildschirm-Icon **getrennte Speicher**. Der Wecker-Kurzbefehl öffnet Safari. Nutze die App deshalb am besten nur in Safari. Wenn du doch beides nutzen willst, übertrage die Daten per Backup.

## Einstellungen (Zahnrad oben rechts auf „Heute“)

- **Neuer Tag beginnt um**: Standard 3:00 Uhr. Wer um 0:30 noch die Abendroutine abhakt, bucht sie auf den richtigen Tag.
- **Schlafenszeit**: für den Tagesbogen.
- **Alle Daten löschen**: zweimal tippen.

## Selbst etwas ändern

- Datei auf GitHub anklicken → Stift-Symbol → ändern → **Commit changes**.
- Wenn du etwas geändert hast: in `sw.js` die Zeile `const CACHE = 'tag-v1';` hochzählen (`tag-v2` usw.). So holt sich das iPhone sicher die neue Version.
- Zum Testen am Computer: im Ordner `python3 -m http.server` ausführen und `http://localhost:8000` öffnen.

## Ganz neu einrichten

1. Auf github.com **New repository**, Name z. B. `TagesPlaner`, Public, erstellen.
2. **uploading an existing file** → alle Dateien hineinziehen → **Commit changes**.
3. **Settings → Pages → Deploy from a branch → main → / (root) → Save**.
4. Nach 1 bis 2 Minuten steht die Adresse da, z. B. `https://roterdrache2000.github.io/TagesPlaner/`. Diese im Kurzbefehl eintragen.

Unter einer neuen Adresse startet die App ohne deine alten Daten. Die Routine kannst du dann unter Planen → Routinen neu anlegen.

## Ohne GitHub

Die Dateien laufen auf jedem Webspace mit HTTPS, z. B. Netlify (Ordner auf app.netlify.com/drop ziehen) oder Cloudflare Pages.
