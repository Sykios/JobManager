# 📋 JobManager - Bewerbungsmanager Desktop App

Ein digitales Bewerbungs-Management-Tool für Berufseinsteiger (Mich), um Bewerbungen zu organisieren, den Überblick über Fristen und Status zu behalten und stressfrei durch den Bewerbungsprozess zu gehen.

## 🎯 Ziel des Projekts

- **Bewerbungen organisieren** - Alle Bewerbungen an einem Ort verwalten
- **Überblick behalten** - Fristen, Status und Kontakte systematisch verfolgen  
- **Stressfrei bewerben** - Strukturierter Bewerbungsprozess mit Erinnerungen
- **Cross-Platform** - Desktop App mit geplanter Mobile-Synchronisation

## 🧱 MVP-Funktionen (Minimal Viable Product)

### 📌 1. Bewerbung erfassen
- Manuell: Titel, Firma, Link zur Anzeige eingeben
- Upload von Lebenslauf / Anschreiben
- Felder: Position, Branche, Ort, Bewerbungskanal

### 🚦 2. Statusverwaltung  
- Bewerbungsstatus: "Entwurf", "Abgeschickt", "Rückmeldung", "Interview", "Absage"
- Visuelle Timeline oder Statusliste

### 🗓️ 3. Fristen & Erinnerungen
- Bewerbungsfristen eintragen
- Follow-up-Erinnerungen nach X Tagen ohne Antwort
- Interviewtermine festhalten

### 🧑‍💼 4. Kontakte & Notizen
- Ansprechpartner (Name, E-Mail, Telefon) verwalten
- Gesprächsnotizen oder Beobachtungen speichern
- LinkedIn-Link oder Visitenkarte hinterlegen

### 📂 5. Dateien speichern
- Lebenslauf, Anschreiben, Portfolio hochladen
- Lokale Speicherung mit Cloud-Verknüpfung für Synchronisation (geplant)

### 🔍 6. Suche & Filter
- Nach Firma, Status, Bewerbungskanal, Branche filtern
- Jobs nach "offen", "abgeschlossen", "relevant" sortieren

## 🛠️ Technologie-Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Desktop**: Electron (Cross-Platform: Windows, macOS, Linux)
- **Datenbank**: SQLite (lokal) + PostgreSQL (Cloud, geplant)
- **Build Tool**: Webpack + TypeScript Compiler
- **Testing**: Jest + React Testing Library + Playwright

## 📁 Projektstruktur

```
JobManager/
├── src/
│   ├── main/           # Electron Main Process
│   ├── renderer/       # React Frontend
│   │   ├── pages/      # App Pages (Applications, Contacts, etc.)
│   │   ├── components/ # React Components (UI, Layout)
│   │   └── context/    # State Management
│   ├── database/       # SQLite Setup & Migrations
│   ├── services/       # Business Logic Layer
│   ├── models/         # Data Models
│   └── types/          # TypeScript Interfaces
├── tests/              # Unit, Integration & E2E Tests
├── assets/             # Icons, Images
├── docs/               # Documentation
└── mobile/             # React Native App (geplant)
```

## 🌱 Zukunftsfunktionen (Modular erweiterbar)

- **🧠 KI-Assistenz**: Lebenslauf-Check, Textvorschläge (GPT-Integration)
- **🔄 Import**: Bewerbungen aus E-Mail/LinkedIn automatisch importieren
- **📈 Analytics**: Bewerbungsstatistiken und Erfolgsquoten
- **💬 Interview-Coach**: Typische Fragen und Antwort-Training
- **🌐 Cloud-Sync**: Synchronisation zwischen Desktop und Mobile
- **👥 Multi-User**: Für Freunde und Bekannte erweitern

## 🚀 Development Setup

### Voraussetzungen
- Node.js 18+ 
- npm oder yarn
- Git

### Installation
```bash
# Repository klonen
git clone https://github.com/Sykios/JobManager.git
cd JobManager

# Dependencies installieren  
npm install

# Development starten
npm run dev

# Tests ausführen
npm test

# Production Build
npm run build
```
