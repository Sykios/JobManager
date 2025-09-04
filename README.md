# 📋 JobManager - Bewerbungsmanager Desktop App

Ein digitales Bewerbungs-Management-Tool für Berufseinsteiger (Mich), um Bewerbungen zu organisieren, den Überblick über Fristen und Status zu behalten und stressfrei durch den Bewerbungsprozess zu gehen.

## 🎯 Ziel des Projekts

- **Bewerbungen organisieren** - Alle Bewerbungen an einem Ort verwalten
- **Überblick behalten** - Fristen, Status und Kontakte systematisch verfolgen  
- **Stressfrei bewerben** - Strukturierter Bewerbungsprozess mit Erinnerungen
- **Cross-Platform** - Desktop App mit geplanter Mobile-Synchronisation

## 🧱 Implemented Features

### 📌 1. Bewerbung erfassen ✅
- ✅ Vollständige Bewerbungsformulare mit Validierung
- ✅ Upload von Lebenslauf, Anschreiben und weiteren Dateien
- ✅ Felder: Position, Branche, Ort, Bewerbungskanal, Gehalt
- ✅ Automatische Firma- und Kontaktauswahl mit Suchfunktion

### 🚦 2. Statusverwaltung ✅
- ✅ Erweiterte Status: "Entwurf", "Beworben", "In Bearbeitung", "Interview", "Angebot", "Abgelehnt", "Zurückgezogen"
- ✅ Visuelle Statusanzeige mit Farbkodierung
- ✅ Status-History mit Zeitstempel-Tracking
- ✅ Schnelle Status-Änderung in Listen- und Detailansicht

### 🗓️ 3. Fristen & Erinnerungen ✅ 
- ✅ **Umfassendes Erinnerungs-System** mit Vorlagen
- ✅ Follow-up-Erinnerungen nach X Tagen ohne Antwort
- ✅ Interview-Terminplanung mit Zeit- und Ortsangaben
- ✅ **Erinnerungs-Templates** für häufige Szenarien
- ✅ Prioritätsstufen und Kategorien (Deadline, Follow-up, Interview, Custom)
- ✅ **Kalender-Integration** mit Monats- und Tagesansicht
- ✅ Automatische Benachrichtigungen und Snooze-Funktionen

### 🧑‍💼 4. Kontakte & Notizen ✅
- ✅ Vollständige Kontaktverwaltung (Name, E-Mail, Telefon, Position)
- ✅ LinkedIn-Profile und Visitenkarten-Verwaltung
- ✅ Gesprächsnotizen und Beobachtungen mit Timestamps
- ✅ Kontakt-Firmen-Zuordnungen und Beziehungsmanagement

### 🏢 5. Unternehmensverwaltung ✅
- ✅ Detaillierte Firmenprofile (Name, Website, Branche, Standort, Größe)
- ✅ Branchen-Kategorisierung und -Statistiken
- ✅ Duplikate-Erkennung und Management
- ✅ CSV-Export für Unternehmensdaten

### 📂 6. Dateien speichern ✅
- ✅ Lokale Dateispeicherung mit SQLite-Integration
- ✅ Lebenslauf, Anschreiben, Portfolio-Uploads
- ✅ Datei-Preview und Download-Funktionen
- ✅ Dateigröße-Tracking und Storage-Management

### 🔍 7. Suche & Filter ✅
- ✅ Volltext-Suche über alle Bewerbungsfelder
- ✅ Erweiterte Filter nach Firma, Status, Datum, Gehalt
- ✅ Sortierung nach verschiedenen Kriterien
- ✅ Gespeicherte Filtereinstellungen

### � 8. Authentication & Cloud-Sync ✅
- ✅ **Passwordless Authentication** mit Magic Links
- ✅ **Supabase Integration** für sichere Cloud-Speicherung
- ✅ **Bidirektionale Synchronisation** zwischen Geräten
- ✅ Offline-Fähigkeit mit automatischer Sync bei Verbindung
- ✅ Konfliktlösung und Versionskontrolle
- ✅ Benutzer-Sessions mit automatischer Token-Erneuerung

### 🧪 9. Testing Infrastructure ✅
- ✅ Umfassende Test-Suite für Sync und Authentication
- ✅ Automatisierte Test-Daten-Generierung
- ✅ Environment-Validierung und Dependency-Checking
- ✅ Web-basierte Auth-Testing-Tools

## 🛠️ Technologie-Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Desktop**: Electron (Cross-Platform: Windows, macOS, Linux)
- **Datenbank**: SQLite (lokal) + Supabase PostgreSQL (Cloud-Sync) ✅
- **Authentication**: Supabase Auth mit Magic Links (passwordless) ✅
- **Synchronization**: Bidirektionale Cloud-Sync mit Konfliktlösung ✅
- **Build Tool**: Webpack + TypeScript Compiler
- **Testing**: Jest + React Testing Library + Playwright + Custom Sync Tests ✅
- **API Integration**: Axios für HTTP-Kommunikation ✅

## 📁 Projektstruktur

```
JobManager/
├── src/
│   ├── main/             # Electron Main Process + Auth Service ✅
│   ├── renderer/         # React Frontend
│   │   ├── pages/        # App Pages (Applications, Contacts, Calendar, etc.) ✅
│   │   ├── components/   # React Components (UI, Layout, Auth, Sync) ✅
│   │   │   ├── auth/     # Authentication Components ✅
│   │   │   ├── settings/ # Sync & User Settings ✅ 
│   │   │   ├── reminders/# Reminder Management ✅
│   │   │   └── common/   # Shared Components + Shutdown Sync ✅
│   │   └── context/      # State Management + AuthContext ✅
│   ├── database/         # SQLite Setup & Migrations ✅
│   ├── services/         # Business Logic Layer + SyncService + AuthService ✅
│   ├── models/           # Data Models ✅
│   └── types/            # TypeScript Interfaces + Sync Types ✅
├── tests/                # Unit, Integration & E2E + Sync Tests ✅
├── assets/               # Icons, Images
├── docs/                 # Documentation + API Specs ✅
└── mobile/               # React Native App (geplant)
```

## 🌱 Zukunftsfunktionen (Modular erweiterbar)

- **🧠 KI-Assistenz**: Lebenslauf-Check, Textvorschläge (GPT-Integration)
- **🔄 Import**: Bewerbungen aus E-Mail/LinkedIn automatisch importieren
- **📈 Analytics**: Bewerbungsstatistiken und Erfolgsquoten
- **💬 Interview-Coach**: Typische Fragen und Antwort-Training
- **📱 Mobile App**: React Native App mit vollständiger Sync-Integration
- **👥 Multi-User**: Team-Funktionen für Karriereberater
- **🤖 Job-Scraping**: Automatische Job-Discovery von Plattformen
- **� Advanced Analytics**: Erfolgsquoten und Bewerbungs-Insights

## 🚀 Development Setup

### Voraussetzungen
- Node.js 18+ 
- npm oder yarn
- Git
- Supabase Account (für Cloud-Sync, optional) ✅

### Installation
```bash
# Repository klonen
git clone https://github.com/Sykios/JobManager.git
cd JobManager

# Dependencies installieren  
npm install

# Environment Variables einrichten (optional für Cloud-Sync)
cp .env.example .env.development
# SUPABASE_URL und SUPABASE_ANON_KEY eintragen

# Development starten
npm run dev

# Tests ausführen
npm test

# Sync Tests ausführen (mit Supabase)
npm run test:sync

# Production Build
npm run build
```

### 🧪 Testing & Development Tools
```bash
# Test-Daten generieren
node tests/create-test-data.js

# Sync-Funktionalität testen
node tests/test-sync.js

# Authentication in Browser testen
# Öffne: auth-test.html
```
