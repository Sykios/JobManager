# Test Plan: Supabase Integration für JobManager

## Übersicht
Dieser Testplan beschreibt, wie die neue direkte Supabase-Integration getestet werden soll.

## Voraussetzungen für Tests

### 1. Supabase Setup
- Supabase Projekt erstellt
- SQL Schema aus `docs/supabase-schema.sql` ausgeführt
- Authentication Provider (Email) aktiviert
- Magic Link Redirect URL konfiguriert: `jobmanager://auth/callback`
- Environment Variables gesetzt (`.env` Datei)

### 2. Lokale Umgebung
- Node.js 18+ installiert
- Dependencies installiert (`npm install`)
- Build erfolgreich (`npm run build`)

## Test-Szenarien

### A. Authentication Tests

#### A1: Magic Link Login
**Ziel**: Benutzer kann sich via Magic Link einloggen

**Schritte**:
1. App starten (`npm run dev`)
2. Auf Login-Button klicken
3. E-Mail-Adresse eingeben
4. "Send Magic Link" klicken
5. E-Mail öffnen und auf Magic Link klicken
6. App sollte sich automatisch öffnen und User einloggen

**Erwartetes Ergebnis**:
- ✅ E-Mail wird empfangen
- ✅ Magic Link öffnet die App
- ✅ User ist eingeloggt
- ✅ Session wird in OS Keychain gespeichert
- ✅ User-Info wird angezeigt

**Fehlerfälle testen**:
- Falscher/abgelaufener Magic Link
- Keine Internetverbindung beim Link-Klick

#### A2: Session Persistenz
**Ziel**: Session bleibt nach App-Neustart erhalten

**Schritte**:
1. User einloggen (siehe A1)
2. App schließen
3. App neu starten
4. Überprüfen, ob User noch eingeloggt ist

**Erwartetes Ergebnis**:
- ✅ User ist automatisch eingeloggt
- ✅ Keine erneute Authentifizierung erforderlich
- ✅ Daten werden synchronisiert

#### A3: Token Refresh
**Ziel**: Access Token wird automatisch erneuert

**Schritte**:
1. User einloggen
2. App über längere Zeit (>1 Stunde) offen lassen
3. Datenoperation durchführen (z.B. Bewerbung erstellen)

**Erwartetes Ergebnis**:
- ✅ Token wird automatisch erneuert
- ✅ Operation erfolgreich
- ✅ Keine Fehlermeldung

#### A4: Logout
**Ziel**: User kann sich sicher ausloggen

**Schritte**:
1. User einloggen
2. Auf Logout-Button klicken
3. App neu starten

**Erwartetes Ergebnis**:
- ✅ User ist ausgeloggt
- ✅ Session aus Keychain entfernt
- ✅ Bei Neustart muss User sich neu einloggen
- ✅ Lokale Daten bleiben erhalten

### B. Daten-Synchronisation Tests

#### B1: Create Sync (Offline → Online)
**Ziel**: Lokal erstellte Daten werden zu Supabase hochgeladen

**Schritte**:
1. User einloggen
2. Neue Bewerbung erstellen
3. In Supabase Dashboard überprüfen (Table Editor)

**Erwartetes Ergebnis**:
- ✅ Datensatz in Supabase vorhanden
- ✅ `user_id` korrekt gesetzt
- ✅ Alle Felder korrekt übertragen
- ✅ `supabase_id` in lokaler Datenbank gesetzt

#### B2: Update Sync
**Ziel**: Lokale Änderungen werden synchronisiert

**Schritte**:
1. Bestehende Bewerbung bearbeiten
2. Änderungen speichern
3. In Supabase Dashboard überprüfen

**Erwartetes Ergebnis**:
- ✅ Änderungen in Supabase sichtbar
- ✅ `updated_at` Timestamp aktualisiert
- ✅ Keine Duplikate erstellt

#### B3: Delete Sync
**Ziel**: Gelöschte Datensätze werden aus Supabase entfernt

**Schritte**:
1. Bewerbung löschen
2. In Supabase Dashboard überprüfen

**Erwartetes Ergebnis**:
- ✅ Datensatz aus Supabase gelöscht
- ✅ Lokal auch gelöscht

#### B4: Pull Sync (Online → Offline)
**Ziel**: Remote-Änderungen werden lokal angewendet

**Setup**:
- Zwei Geräte/Instances mit gleichem User

**Schritte**:
1. Auf Gerät 1: Bewerbung erstellen
2. Auf Gerät 2: Sync auslösen oder auf Realtime-Update warten
3. Überprüfen, ob Bewerbung auf Gerät 2 sichtbar ist

**Erwartetes Ergebnis**:
- ✅ Neue Bewerbung erscheint auf Gerät 2
- ✅ Alle Felder korrekt übertragen
- ✅ Realtime-Update funktioniert (< 1 Sekunde)

#### B5: Realtime Updates
**Ziel**: Änderungen werden in Echtzeit synchronisiert

**Setup**:
- Zwei Browser-Tabs oder zwei Geräte

**Schritte**:
1. In Tab 1: Bewerbung erstellen
2. In Tab 2: Beobachten

**Erwartetes Ergebnis**:
- ✅ Neue Bewerbung erscheint sofort in Tab 2
- ✅ Bei Update: Änderungen werden live aktualisiert
- ✅ Bei Delete: Eintrag verschwindet live

### C. Offline-Mode Tests

#### C1: Offline Schreiben
**Ziel**: Änderungen werden offline in Queue gespeichert

**Schritte**:
1. User einloggen
2. Netzwerk deaktivieren (Flugmodus oder Entwickler-Tools)
3. Bewerbung erstellen
4. Prüfen, dass Bewerbung lokal gespeichert ist
5. Netzwerk wieder aktivieren
6. Warten auf automatische Sync

**Erwartetes Ergebnis**:
- ✅ Bewerbung lokal gespeichert (auch ohne Netzwerk)
- ✅ In Sync-Queue eingereiht
- ✅ Nach Reconnect automatisch hochgeladen
- ✅ Supabase-ID nachträglich gesetzt

#### C2: Offline Queue Retry
**Ziel**: Fehlgeschlagene Syncs werden automatisch wiederholt

**Schritte**:
1. Offline mehrere Bewerbungen erstellen
2. Netzwerk kurz aktivieren, dann wieder deaktivieren
3. Netzwerk dauerhaft aktivieren
4. Sync-Status beobachten

**Erwartetes Ergebnis**:
- ✅ Alle Bewerbungen werden nacheinander synchronisiert
- ✅ Retry bei Fehlern (max. 3x)
- ✅ Sync-Queue wird geleert

#### C3: Startup Sync
**Ziel**: Offline-Änderungen werden beim App-Start synchronisiert

**Schritte**:
1. Offline arbeiten
2. Mehrere Änderungen machen
3. App schließen
4. Netzwerk aktivieren
5. App neu starten

**Erwartetes Ergebnis**:
- ✅ Startup-Sync wird durchgeführt
- ✅ Alle Änderungen werden hochgeladen
- ✅ Keine Daten verloren

#### C4: Shutdown Sync
**Ziel**: Änderungen werden beim App-Schließen synchronisiert

**Schritte**:
1. Online arbeiten
2. Änderungen machen
3. App sofort schließen

**Erwartetes Ergebnis**:
- ✅ Shutdown-Sync wird ausgeführt
- ✅ Änderungen in Supabase gespeichert
- ✅ Bei erneutem Start keine Sync-Queue

### D. Konflikt-Resolution Tests

#### D1: Concurrent Updates (Last Write Wins)
**Ziel**: Bei gleichzeitigen Änderungen gewinnt der letzte Write

**Setup**:
- Zwei Geräte mit gleichem User
- Gleiche Bewerbung auf beiden geöffnet

**Schritte**:
1. Auf Gerät 1: Feld "Status" auf "Interview" setzen, speichern
2. Auf Gerät 2 (schnell danach): Feld "Status" auf "Abgelehnt" setzen, speichern
3. Beide Geräte synchronisieren lassen
4. Status auf beiden Geräten prüfen

**Erwartetes Ergebnis**:
- ✅ Status ist "Abgelehnt" (letzter Write)
- ✅ Keine Fehler oder Konflikte
- ✅ `updated_at` reflektiert letzten Write

#### D2: Offline Konflikt
**Ziel**: Offline-Änderungen werden bei Sync korrekt behandelt

**Schritte**:
1. Gerät 1 offline: Bewerbung auf Status "Interview" setzen
2. Gerät 2 online: Gleiche Bewerbung auf Status "Abgelehnt" setzen
3. Gerät 1 online bringen und sync

**Erwartetes Ergebnis**:
- ✅ Konflikt wird automatisch aufgelöst
- ✅ Kein Datenverlust
- ✅ Finaler Status basiert auf `updated_at`

### E. Row Level Security Tests

#### E1: Multi-User Isolation
**Ziel**: User können nur ihre eigenen Daten sehen

**Setup**:
- Zwei verschiedene User-Accounts

**Schritte**:
1. User 1 einloggen und Bewerbung erstellen
2. User 1 ausloggen
3. User 2 einloggen
4. Bewerbungen anzeigen
5. In Supabase Dashboard beide User's Daten prüfen

**Erwartetes Ergebnis**:
- ✅ User 2 sieht nur eigene Bewerbungen
- ✅ User 1's Bewerbung ist nicht sichtbar
- ✅ In Supabase sind beide Datensätze vorhanden (mit unterschiedlichen `user_id`)

#### E2: Unauthorized Access
**Ziel**: Nicht authentifizierte Requests werden abgelehnt

**Schritte**:
1. Ausloggen
2. Versuchen, Bewerbung zu erstellen/lesen

**Erwartetes Ergebnis**:
- ✅ Operation schlägt fehl
- ✅ Fehlermeldung: "User not authenticated"
- ✅ Keine Daten ohne Auth zugreifbar

### F. Performance Tests

#### F1: Large Dataset Sync
**Ziel**: Sync funktioniert auch mit vielen Datensätzen

**Setup**:
- 100+ Bewerbungen in Supabase (z.B. via Seed-Skript)

**Schritte**:
1. Fresh Install auf neuem Gerät
2. User einloggen
3. Initial Sync beobachten

**Erwartetes Ergebnis**:
- ✅ Alle Bewerbungen werden heruntergeladen
- ✅ Sync dauert < 30 Sekunden
- ✅ App bleibt responsiv
- ✅ Keine Fehler oder Timeouts

#### F2: Realtime Subscription Performance
**Ziel**: Realtime bleibt auch bei vielen Updates stabil

**Schritte**:
1. Realtime-Subscription aktiviert
2. Rapid Changes durchführen (z.B. viele Bewerbungen schnell hintereinander)
3. Beobachten, ob Updates ankommen

**Erwartetes Ergebnis**:
- ✅ Alle Updates werden empfangen
- ✅ Keine Dropped Messages
- ✅ Memory Leak ausgeschlossen

## Test-Checkliste

### Vor Release
- [ ] Alle A-Tests (Authentication) bestanden
- [ ] Alle B-Tests (Sync) bestanden
- [ ] Alle C-Tests (Offline) bestanden
- [ ] Alle D-Tests (Conflicts) bestanden
- [ ] Alle E-Tests (Security) bestanden
- [ ] Alle F-Tests (Performance) bestanden
- [ ] CodeQL Security Check bestanden
- [ ] Build auf allen Plattformen (Windows, macOS, Linux)
- [ ] E2E Test mit echtem User-Szenario

### Nach Release
- [ ] Monitoring von Sync-Errors
- [ ] User-Feedback sammeln
- [ ] Performance-Metriken tracken

## Debugging Tipps

### Logs überprüfen
```bash
# Electron DevTools öffnen
npm run dev
# Dann: View > Toggle Developer Tools

# Logs im Terminal beobachten
npm run dev | grep -i "sync\|supabase\|auth"
```

### Supabase Logs
- Dashboard > Logs > API Logs: RLS Errors
- Dashboard > Logs > Auth Logs: Auth Errors
- Dashboard > Table Editor: Daten manuell prüfen

### Lokale Datenbank inspizieren
```bash
# SQLite DB öffnen
sqlite3 ./jobmanager.db

# Sync Queue prüfen
SELECT * FROM sync_queue WHERE synced_at IS NULL;

# Supabase IDs prüfen
SELECT id, supabase_id, sync_status FROM applications;
```

## Known Issues & Workarounds

### Issue: Magic Link öffnet Browser statt App
**Workaround**: 
- Überprüfe, ob Custom URL Scheme registriert ist
- Windows: Registry-Eintrag prüfen
- macOS: LSHandlers in Info.plist prüfen

### Issue: Realtime Updates nicht empfangen
**Workaround**:
- Supabase Dashboard > Settings > API: Realtime aktiviert?
- Firewall blockiert WebSocket-Verbindungen?
- Browser/Electron DevTools: WebSocket-Verbindung prüfen

### Issue: Sync schlägt fehl mit "403 Forbidden"
**Workaround**:
- RLS Policies korrekt eingerichtet?
- User authentifiziert?
- Token abgelaufen? (automatischer Refresh sollte funktionieren)
