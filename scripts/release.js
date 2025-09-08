#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Release script for JobManager
 * Usage: node scripts/release.js [version]
 * Example: node scripts/release.js 1.2.0
 * Example: node scripts/release.js 1.2.0-beta.1
 */

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Please provide a version number');
    console.log('Usage: node scripts/release.js [version]');
    console.log('Example: node scripts/release.js 1.2.0');
    console.log('Example: node scripts/release.js 1.2.0-beta.1');
    process.exit(1);
  }

  const version = args[0];
  
  // Validate version format
  if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
    console.error('❌ Invalid version format. Use semantic versioning (e.g., 1.2.0 or 1.2.0-beta.1)');
    process.exit(1);
  }

  console.log(`🚀 Starting release process for version ${version}`);

  try {
    // Check if working directory is clean
    try {
      execSync('git diff --exit-code', { stdio: 'pipe' });
      execSync('git diff --cached --exit-code', { stdio: 'pipe' });
    } catch (error) {
      console.error('❌ Working directory is not clean. Please commit or stash your changes first.');
      process.exit(1);
    }

    // Make sure we're on main branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    if (currentBranch !== 'main') {
      console.error(`❌ You must be on the main branch to create a release. Currently on: ${currentBranch}`);
      process.exit(1);
    }

    // Pull latest changes
    console.log('📥 Pulling latest changes...');
    execSync('git pull origin main', { stdio: 'inherit' });

    // Update package.json version
    console.log(`📝 Checking current version...`);
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const currentVersion = packageJson.version;
    
    if (currentVersion === version) {
      console.log(`⚠️  Version ${version} is already set in package.json. Skipping version update.`);
    } else {
      console.log(`📝 Updating package.json version from ${currentVersion} to ${version}...`);
      execSync(`npm version ${version} --no-git-tag-version`, { stdio: 'inherit' });
    }

    // Check if there are any changes to commit
    let hasChanges = false;
    try {
      execSync('git diff --exit-code package.json package-lock.json', { stdio: 'pipe' });
    } catch (error) {
      hasChanges = true;
    }

    // Commit the version change if there are changes
    if (hasChanges) {
      console.log('💾 Committing version change...');
      execSync('git add package.json package-lock.json', { stdio: 'inherit' });
      execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
    } else {
      console.log('📝 No version changes to commit.');
    }

    // Create and push tag
    const tag = `v${version}`;
    console.log(`🏷️  Creating tag ${tag}...`);
    execSync(`git tag ${tag}`, { stdio: 'inherit' });

    // Push changes and tag
    console.log('📤 Pushing changes and tag...');
    execSync('git push origin main', { stdio: 'inherit' });
    execSync(`git push origin ${tag}`, { stdio: 'inherit' });

    console.log('');
    console.log('✅ Release process completed successfully!');
    console.log(`📦 Version ${version} has been released`);
    console.log(`🏷️  Tag ${tag} has been created and pushed`);
    console.log('🔄 GitHub Actions will now build and publish the release');
    console.log('');
    console.log(`🔗 View release: https://github.com/Sykios/JobManager/releases/tag/${tag}`);

  } catch (error) {
    console.error('❌ Release process failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
