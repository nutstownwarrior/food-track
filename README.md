# 🥦 KaloTrack

KI-gestützte Kalorienerfassung mit deutschen Benutzeroberfläche.

## Features

- 📷 **KI-Fotoanalyse** — Mahlzeit fotografieren → Gemini 2.0 Flash schätzt Kalorien automatisch
- 🧮 **Wissenschaftliche Berechnungen** — BMR nach Mifflin-St Jeor (1990), TDEE mit Aktivitätsmultiplikatoren
- 🎯 **Personalisierte Ziele** — Kalorienziel basierend auf Gewichtsziel (7.700 kcal/kg Fett)
- 👥 **Multi-User** — Mehrere Konten auf einem Server (ideal für Paare/Familien)
- 📱 **PWA** — Installierbar auf iPhone & Android-Startbildschirm
- 🇩🇪 **Vollständig Deutsch** — Alle Texte auf Deutsch
- 🐋 **Docker Compose** — Einfach selbst hosten

## Schnellstart mit Docker

```bash
# 1. .env-Datei erstellen
cp .env.example .env
# Dann GEMINI_API_KEY und JWT_SECRET in .env eintragen

# 2. Starten
docker compose up --build -d

# 3. App aufrufen
# http://localhost (oder deine Server-IP)
```

### Gemini API-Schlüssel kostenlos erhalten

1. Gehe zu [Google AI Studio](https://aistudio.google.com)
2. Anmelden mit Google-Konto
3. API-Schlüssel erstellen (kostenlos, kein Zahlungsmittel erforderlich)
4. Schlüssel in `.env` als `GEMINI_API_KEY=...` eintragen

## Lokale Entwicklung

```bash
# Backend
cd backend
npm install
cp ../.env.example .env  # Dann .env ausfüllen
node server.js           # Läuft auf Port 3001

# Frontend (anderes Terminal)
cd frontend
npm install --legacy-peer-deps
npm run dev              # Läuft auf Port 5173
```

## Wissenschaftliche Grundlagen

| Berechnung | Methode |
|---|---|
| Grundumsatz (BMR) | Mifflin-St Jeor (1990) — validiert für allgemeine Bevölkerung |
| Alternativ | Katch-McArdle — wenn Körperfettanteil bekannt |
| Kaloriendichte Fett | 7.700 kcal/kg (Hall et al., 2012) |
| Sicherheitsgrenze | Max. 1.000 kcal/Tag Defizit, Min. 1.200/1.500 kcal |
| Eiweißziel | 2,0 g/kg bei Gewichtsabnahme (Muskelerhalt) |
| DGE-Empfehlung | ≥ 75% pflanzliche Lebensmittel (DGE 2024) |

## PWA auf Mobilgerät installieren

- **Android**: Browser öffnen → Menü → "Zum Startbildschirm hinzufügen"
- **iPhone**: Safari öffnen → Teilen-Symbol → "Zum Home-Bildschirm"

> **Hinweis:** Kamerazugriff und PWA-Installation erfordern HTTPS auf dem Produktionsserver.
> Empfehlung: Nginx Reverse Proxy mit Let's Encrypt SSL.

## Datenbankstruktur

SQLite-Datei wird in `./data/kalotrack.db` gespeichert (Docker Volume).

## Technologie

- **Frontend**: React + Vite + TailwindCSS + vite-plugin-pwa
- **Backend**: Node.js + Express + better-sqlite3
- **KI**: Google Gemini 2.0 Flash (Vision)
- **Auth**: JWT (30 Tage gültig)
