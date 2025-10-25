# Migration Guide: Vercel API → Direct Supabase

## Overview

This guide helps you migrate from the old Vercel API-based sync to the new direct Supabase integration. The new architecture is more efficient, secure, and provides real-time updates.

## What Changed?

### Old Architecture (Deprecated)
```
Desktop App → HTTP API (Vercel) → Supabase
```
- Required intermediary API server
- HTTP polling for updates
- Higher latency
- Additional maintenance overhead

### New Architecture (Current)
```
Desktop App → Supabase SDK → Supabase Database
```
- Direct communication with Supabase
- WebSocket for real-time updates
- Lower latency
- No API server maintenance

## Benefits of Migration

1. **Better Performance**: Direct connection = faster sync
2. **Real-time Updates**: Instant synchronization via WebSocket
3. **Improved Security**: Row Level Security (RLS) enforced at database level
4. **Lower Costs**: No need to maintain separate API server
5. **Offline Support**: Enhanced offline queue with automatic retry

## Migration Steps

### 1. Backup Your Data

Before starting, backup your local database:

```bash
# Windows
copy %APPDATA%\JobManager\jobmanager.db %APPDATA%\JobManager\jobmanager.db.backup

# macOS
cp ~/Library/Application\ Support/JobManager/jobmanager.db ~/Library/Application\ Support/JobManager/jobmanager.db.backup

# Linux
cp ~/.config/JobManager/jobmanager.db ~/.config/JobManager/jobmanager.db.backup
```

### 2. Set Up Supabase

If you were using the Vercel API with an existing Supabase project:

1. **Keep your existing Supabase project** - No need to create a new one
2. **Run the new schema**: Execute `docs/supabase-schema.sql` in SQL Editor
   - This creates the new JSONB-based tables
   - Old tables remain untouched (if any)
3. **Configure Magic Link redirect**: Add `jobmanager://auth/callback` to redirect URLs

### 3. Update Environment Variables

**Old `.env`**:
```env
SYNC_API_URL=https://jobmanager-api.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**New `.env`**:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ENABLE_SYNC=true
```

Remove `SYNC_API_URL` - it's no longer needed!

### 4. Update the App

```bash
# Pull latest code
git pull origin main

# Install dependencies (in case new ones were added)
npm install

# Build
npm run build

# Run
npm run dev
```

### 5. First Login with Magic Link

1. Start the app
2. Click "Login"
3. Enter your email
4. Check your email for Magic Link
5. Click the link in the email
6. App should open and log you in

### 6. Initial Sync

After first login:
1. App will automatically sync your local data to Supabase
2. Check sync status in Settings
3. Verify data in Supabase Dashboard > Table Editor

## Data Migration

### Automatic Migration

The app will automatically:
- ✅ Upload all local records without `supabase_id`
- ✅ Set `supabase_id` after successful upload
- ✅ Mark records as `synced`

### Manual Data Migration (if needed)

If you have existing data in old Supabase tables, you need to migrate it manually:

```sql
-- Migrate applications from old structure to new JSONB structure
INSERT INTO public.applications (id, user_id, data, created_at, updated_at)
SELECT 
  id,
  user_id,
  jsonb_build_object(
    'title', title,
    'position', position,
    'company_id', company_id,
    'status', status,
    'notes', notes
    -- Add all other fields here
  ),
  created_at,
  updated_at
FROM old_applications_table;

-- Repeat for companies, contacts, reminders...
```

## Verification Checklist

After migration, verify:

- [ ] Can login with Magic Link
- [ ] Local data is visible in app
- [ ] Can create new records
- [ ] New records appear in Supabase Dashboard
- [ ] Can edit existing records
- [ ] Changes sync to Supabase
- [ ] Realtime updates work (test with two devices)
- [ ] Offline mode works
- [ ] Offline changes sync when back online
- [ ] Can logout successfully
- [ ] Session persists after app restart

## Troubleshooting

### "Connection failed" during sync

**Cause**: App still trying to connect to old Vercel API

**Solution**:
1. Verify `SYNC_API_URL` is removed from `.env`
2. Clear app data and restart
3. Check `SUPABASE_URL` is correct

### "User not authenticated" errors

**Cause**: Magic Link not configured properly

**Solution**:
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Add `jobmanager://auth/callback` to Redirect URLs
3. Try login again

### Old data not syncing

**Cause**: Records might have sync issues

**Solution**:
```sql
-- Check sync queue
SELECT * FROM sync_queue WHERE synced_at IS NULL;

-- Check sync status
SELECT COUNT(*) as pending 
FROM applications 
WHERE sync_status = 'pending';

-- Force re-sync (mark as pending)
UPDATE applications 
SET sync_status = 'pending', supabase_id = NULL 
WHERE sync_status = 'error';
```

### Realtime not working

**Cause**: Realtime not enabled in Supabase

**Solution**:
1. Go to Supabase Dashboard > Database > Replication
2. Ensure all tables are added to `supabase_realtime` publication
3. Or run:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
```

## Rollback Plan

If you need to rollback to the old system:

### 1. Restore Backup
```bash
# Stop the app first!

# Windows
copy %APPDATA%\JobManager\jobmanager.db.backup %APPDATA%\JobManager\jobmanager.db

# macOS
cp ~/Library/Application\ Support/JobManager/jobmanager.db.backup ~/Library/Application\ Support/JobManager/jobmanager.db

# Linux
cp ~/.config/JobManager/jobmanager.db.backup ~/.config/JobManager/jobmanager.db
```

### 2. Revert Environment
```bash
git checkout <previous-version-tag>
npm install
npm run build
```

### 3. Restore `.env`
Add back `SYNC_API_URL=https://jobmanager-api.vercel.app`

## FAQ

### Q: Will my local data be lost?
**A**: No, local SQLite database remains unchanged. Only sync mechanism changes.

### Q: Do I need to create a new Supabase project?
**A**: No, use your existing project. Just run the new schema SQL.

### Q: Can I use both old and new sync?
**A**: No, choose one. New direct sync is recommended.

### Q: What happens to data in old Vercel API?
**A**: It can be migrated to new Supabase tables using SQL scripts (see above).

### Q: Is there a deadline for migration?
**A**: Old Vercel API may be deprecated in future releases. Migrate as soon as possible.

### Q: Can I test new sync without affecting production?
**A**: Yes, create a separate Supabase project for testing.

## Support

If you encounter issues during migration:

1. Check `docs/SUPABASE_SETUP.md` for setup details
2. Review `docs/TEST_PLAN.md` for testing scenarios
3. Check Electron DevTools console for errors
4. Check Supabase Dashboard > Logs for server errors
5. Open an issue on GitHub with error details

## Post-Migration Monitoring

After successful migration, monitor:

- Sync queue size: Should be 0 or very small
- Supabase API usage: Check dashboard
- Real-time connections: Should show active connections
- Error logs: Check for recurring errors

## Summary

The migration to direct Supabase integration brings significant improvements in performance, security, and user experience. While it requires some initial setup, the benefits far outweigh the migration effort.

**Key Takeaways**:
- ✅ Backup before migration
- ✅ Update environment variables
- ✅ Run new SQL schema
- ✅ Test thoroughly
- ✅ Monitor after migration

Happy syncing! 🚀
