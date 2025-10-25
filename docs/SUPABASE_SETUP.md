# Supabase Setup Guide für JobManager

## Übersicht

JobManager nutzt Supabase für:
- **Authentifizierung**: Passwordless Login via Magic Link
- **Daten-Synchronisation**: Bidirektionale Sync zwischen lokaler SQLite und Cloud
- **Row Level Security (RLS)**: Jeder Nutzer sieht nur seine eigenen Daten
- **Realtime Updates**: Automatische Synchronisation bei Änderungen

## Voraussetzungen

- Supabase Account (https://supabase.com)
- Supabase Projekt erstellt

## Setup-Schritte

### 1. Supabase Projekt konfigurieren

1. Gehe zu deinem Supabase Projekt Dashboard
2. Notiere dir folgende Werte aus **Settings > API**:
   - `Project URL` (z.B. `https://gnwodqwfxuorcztopebz.supabase.co`)
   - `anon public` Key

### 2. Datenbank-Schema einrichten

1. Öffne den **SQL Editor** in deinem Supabase Dashboard
2. Führe das SQL-Skript aus `docs/supabase-schema.sql` aus
3. Das Skript erstellt:
   - Tabellen: `companies`, `contacts`, `applications`, `reminders`
   - RLS Policies für Datenisolierung
   - Trigger für automatische `updated_at` und `user_id` Felder
   - Realtime-Aktivierung für alle Tabellen

### 3. Authentication einrichten

1. Gehe zu **Authentication > Providers**
2. Aktiviere **Email** Provider
3. Konfiguriere **Email Templates**:
   - **Magic Link**: Stelle sicher, dass die Redirect URL auf `jobmanager://auth/callback` gesetzt ist
4. Gehe zu **Authentication > URL Configuration**
5. Füge `jobmanager://auth/callback` zu den **Redirect URLs** hinzu

### 4. Environment Variables setzen

Erstelle oder aktualisiere die `.env` Datei im Projekt-Root:

```env
# Supabase Configuration
SUPABASE_URL=https://gnwodqwfxuorcztopebz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database
DATABASE_PATH=./jobmanager.db

# Sync Settings
ENABLE_SYNC=true
```

### 5. App starten

```bash
npm install
npm run dev
```

## Funktionsweise

### Authentifizierung

1. **Login**:
   - User gibt E-Mail-Adresse ein
   - Supabase sendet Magic Link per E-Mail
   - User klickt auf Link → App öffnet sich automatisch
   - Session wird sicher im OS Keychain gespeichert

2. **Session Management**:
   - Automatische Token-Erneuerung
   - Session-Persistenz über App-Neustarts
   - Logout löscht Session sicher

### Daten-Synchronisation

1. **Offline-First**:
   - Alle Änderungen werden lokal in SQLite gespeichert
   - Schreiboperationen werden in Sync-Queue eingereiht
   - App funktioniert vollständig offline

2. **Bidirektionale Sync**:
   - **Push**: Lokale Änderungen werden zu Supabase hochgeladen
   - **Pull**: Remote-Änderungen werden heruntergeladen
   - **Realtime**: Automatische Updates bei Änderungen durch andere Geräte

3. **Konfliktlösung**:
   - "Last write wins" Strategie
   - Basiert auf `updated_at` Timestamp
   - Konflikte werden automatisch aufgelöst

### Row Level Security (RLS)

- Alle Queries werden automatisch gefiltert: `WHERE user_id = auth.uid()`
- Kein Service-Role-Key im Client notwendig
- Sichere Mandantentrennung durch Supabase

## Datenstruktur

### Tabellen-Schema

Alle Tabellen haben die gleiche Basis-Struktur:

```sql
CREATE TABLE public.<tablename> (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- **id**: Eindeutige UUID für jeden Datensatz
- **user_id**: Referenz zum authentifizierten User (automatisch gesetzt)
- **data**: JSONB-Feld mit allen Anwendungsdaten
- **created_at**: Erstellungszeitpunkt
- **updated_at**: Letzte Änderung (automatisch aktualisiert)

### Lokale SQLite Struktur

- Detailliertes relationelles Schema
- Zusätzliche Felder: `supabase_id`, `sync_status`, `last_synced_at`
- Sync-Queue Tabelle für Offline-Operationen

## Troubleshooting

### Sync funktioniert nicht

1. Prüfe Authentifizierung: User muss eingeloggt sein
2. Prüfe Netzwerkverbindung
3. Prüfe Supabase Dashboard > Logs für Fehler
4. Prüfe Browser Console / Electron DevTools für Client-Fehler

### Magic Link wird nicht empfangen

1. Prüfe Spam-Ordner
2. Prüfe Supabase Dashboard > Authentication > Logs
3. Prüfe Email Template Konfiguration
4. Stelle sicher, dass Email Provider aktiviert ist

### RLS Errors

1. Prüfe ob alle RLS Policies korrekt erstellt wurden
2. Prüfe ob User authentifiziert ist: `auth.uid()` muss gesetzt sein
3. Prüfe ob `user_id` in allen Inserts gesetzt wird (sollte automatisch passieren)

## Best Practices

1. **Nie Service-Role-Key im Client verwenden**
2. **Immer RLS aktiviert lassen**
3. **Sensitive Daten nicht im `data` JSONB speichern** (außer verschlüsselt)
4. **Regelmäßige Backups der Supabase DB**
5. **Rate Limiting für API-Calls beachten**

## Migration von bestehenden Daten

Für Migration von lokalen Daten zu Supabase:

1. User muss sich einloggen
2. Alle lokalen Datensätze ohne `supabase_id` werden hochgeladen
3. `supabase_id` wird lokal gespeichert
4. Zukünftige Änderungen werden synchronisiert

## Weitere Ressourcen

- [Supabase Dokumentation](https://supabase.com/docs)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)
