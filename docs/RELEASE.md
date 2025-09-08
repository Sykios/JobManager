# Release Process

This document describes the automated release process for JobManager.

## Quick Release (Recommended)

Use the automated release script to ensure version consistency:

```bash
# Release a new version (e.g., 1.2.3)
npm run release 1.2.3

# Release a pre-release version (e.g., 1.2.3-beta.1)
npm run release 1.2.3-beta.1
```

This script will:
1. ✅ Check that your working directory is clean
2. ✅ Ensure you're on the main branch
3. ✅ Pull the latest changes
4. ✅ Update package.json version
5. ✅ Commit the version change
6. ✅ Create and push the git tag
7. ✅ Trigger GitHub Actions to build and release

## Manual Release Process

If you prefer to do it manually:

1. **Update package.json version:**
   ```bash
   npm version 1.2.3 --no-git-tag-version
   ```

2. **Commit the version change:**
   ```bash
   git add package.json package-lock.json
   git commit -m "chore: bump version to 1.2.3"
   ```

3. **Create and push tag:**
   ```bash
   git tag v1.2.3
   git push origin main
   git push origin v1.2.3
   ```