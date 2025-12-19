#!/usr/bin/env ts-node

/**
 * Template Sync Script
 * 
 * This script helps merge updates from the template repository into a project
 * that was created from the template.
 * 
 * Usage:
 *   yarn sync-template [options]
 * 
 * Options:
 *   --dry-run                Show what would be done without making changes
 *   --force                  Force update even if there are uncommitted changes
 *   --diff-summary           Generate a diff summary file showing all template changes
 * 
 * Auto modes (non-interactive):
 *   --auto-safe-only         Apply only safe changes, skip all conflicts
 *   --auto-merge-conflicts   Apply all changes, create .template files for conflicts
 *   --auto-override-conflicts Apply all changes, override conflicts with template version
 *   --auto-skip-conflicts    Apply safe changes, skip all conflicting files
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as readline from 'readline';

interface TemplateSyncConfig {
  templateRepo: string;
  templateBranch: string;
  baseCommit: string | null;
  lastSyncCommit: string | null;
  lastProjectCommit: string | null;
  lastSyncDate: string | null;
  ignoredFiles: string[];
  projectSpecificFiles: string[];
}

interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  inTemplate: boolean;
  inProject: boolean;
}

interface SyncResult {
  autoMerged: string[];
  conflicts: string[];
  projectOnlyChanges: string[];  // Only changed in project - kept as-is
  skipped: string[];
  errors: string[];
}

interface AnalysisResult {
  safeChanges: FileChange[];        // Only changed in template - safe to auto-apply
  conflictChanges: FileChange[];    // Changed in BOTH - needs manual merge
  projectOnlyChanges: FileChange[]; // Only changed in project - keep as-is
  skipped: string[];
}

type SyncMode = 'safe' | 'all' | 'none';

type ConflictResolution = 'override' | 'skip' | 'merge' | 'nothing';

interface ConflictResolutionMap {
  [filePath: string]: ConflictResolution;
}

const CONFIG_FILE = '.template-sync.json';
const TEMPLATE_DIR = '.template-sync-temp';
const DIFF_SUMMARY_FILE = 'template-diff-summary.md';

type AutoMode = 'none' | 'safe-only' | 'merge-conflicts' | 'override-conflicts' | 'skip-conflicts';

class TemplateSyncTool {
  private config: TemplateSyncConfig;
  private projectRoot: string;
  private dryRun: boolean;
  private force: boolean;
  private autoMode: AutoMode;
  private diffSummary: boolean;
  private rl: readline.Interface;

  constructor(dryRun = false, force = false, autoMode: AutoMode = 'none', diffSummary = false) {
    this.projectRoot = process.cwd();
    this.dryRun = dryRun;
    this.force = force;
    this.autoMode = autoMode;
    this.diffSummary = diffSummary;
    this.config = this.loadConfig();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private loadConfig(): TemplateSyncConfig {
    const configPath = path.join(this.projectRoot, CONFIG_FILE);

    if (!fs.existsSync(configPath)) {
      console.error('❌ Error: .template-sync.json not found.');
      console.error('Run "yarn init-template" first to initialize template tracking.');
      process.exit(1);
    }

    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  private saveConfig(): void {
    const configPath = path.join(this.projectRoot, CONFIG_FILE);
    fs.writeFileSync(
      configPath,
      JSON.stringify(this.config, null, 2) + '\n',
      'utf-8'
    );
  }

  private exec(command: string, options: { cwd?: string; silent?: boolean } = {}): string {
    try {
      return execSync(command, {
        cwd: options.cwd || this.projectRoot,
        encoding: 'utf-8',
        stdio: options.silent ? 'pipe' : 'inherit',
      }).toString().trim();
    } catch (error: any) {
      if (!options.silent) {
        throw error;
      }
      return '';
    }
  }

  private checkGitStatus(): void {
    const status = this.exec('git status --porcelain', { silent: true });

    if (status && !this.force) {
      console.error('❌ Error: You have uncommitted changes.');
      console.error('Please commit or stash your changes before syncing the template.');
      console.error('Or use --force to override this check.');
      process.exit(1);
    }
  }

  private cloneTemplate(): void {
    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);

    // Clean up any existing template directory
    if (fs.existsSync(templatePath)) {
      fs.rmSync(templatePath, { recursive: true, force: true });
    }

    console.log(`📥 Cloning template from ${this.config.templateRepo}...`);
    // Clone with full history to enable comparison with lastSyncCommit
    this.exec(
      `git clone --branch ${this.config.templateBranch} ${this.config.templateRepo} ${TEMPLATE_DIR}`,
      { silent: true }
    );
  }

  private cleanupTemplate(): void {
    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);
    if (fs.existsSync(templatePath)) {
      fs.rmSync(templatePath, { recursive: true, force: true });
    }
  }

  private getAllFiles(dir: string, baseDir = dir): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      // Skip ignored files/directories
      if (this.shouldIgnore(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...this.getAllFiles(fullPath, baseDir));
      } else {
        files.push(relativePath);
      }
    }

    return files;
  }

  private shouldIgnore(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');

    return this.config.ignoredFiles.some(pattern => {
      // Normalize pattern
      const normalizedPattern = pattern.replace(/\\/g, '/');

      // Exact match
      if (normalized === normalizedPattern) return true;

      // Handle ** (match any number of path segments)
      if (normalizedPattern.includes('**')) {
        const regexPattern = normalizedPattern
          .replace(/\*\*/g, '.*')  // ** matches anything
          .replace(/\*/g, '[^/]*') // * matches anything except /
          .replace(/\//g, '\\/');  // escape slashes

        const regex = new RegExp('^' + regexPattern + '$');
        if (regex.test(normalized)) return true;
      }

      // Handle * (match within a single path segment)
      if (normalizedPattern.includes('*') && !normalizedPattern.includes('**')) {
        const regexPattern = normalizedPattern
          .replace(/\*/g, '[^/]*')  // * matches anything except /
          .replace(/\//g, '\\/');   // escape slashes

        const regex = new RegExp('^' + regexPattern + '$');
        if (regex.test(normalized)) return true;
      }

      // Directory match (if pattern is a directory name anywhere in path)
      if (normalized.split('/').includes(normalizedPattern)) return true;

      // Start with match (for directory paths)
      if (normalized.startsWith(normalizedPattern + '/')) return true;

      return false;
    });
  }

  private shouldIgnoreByProjectSpecificFiles(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');

    return this.config.projectSpecificFiles.some(pattern => {
      // Normalize pattern
      const normalizedPattern = pattern.replace(/\\/g, '/');

      // Exact match
      if (normalized === normalizedPattern) return true;

      // Handle ** (match any number of path segments)
      if (normalizedPattern.includes('**')) {
        const regexPattern = normalizedPattern
          .replace(/\*\*/g, '.*')  // ** matches anything
          .replace(/\*/g, '[^/]*') // * matches anything except /
          .replace(/\//g, '\\/');  // escape slashes

        const regex = new RegExp('^' + regexPattern + '$');
        if (regex.test(normalized)) return true;
      }

      // Handle * (match within a single path segment)
      if (normalizedPattern.includes('*') && !normalizedPattern.includes('**')) {
        const regexPattern = normalizedPattern
          .replace(/\*/g, '[^/]*')  // * matches anything except /
          .replace(/\//g, '\\/');   // escape slashes

        const regex = new RegExp('^' + regexPattern + '$');
        if (regex.test(normalized)) return true;
      }

      // Directory match (if pattern is a directory name anywhere in path)
      if (normalized.split('/').includes(normalizedPattern)) return true;

      // Start with match (for directory paths)
      if (normalized.startsWith(normalizedPattern + '/')) return true;

      return false;
    });
  }

  private getFileHash(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';

    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private compareFiles(): FileChange[] {
    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);
    const templateFiles = this.getAllFiles(templatePath);
    const projectFiles = this.getAllFiles(this.projectRoot);

    const allFiles = Array.from(new Set([...templateFiles, ...projectFiles]));
    const changes: FileChange[] = [];

    for (const file of allFiles) {
      const templateFilePath = path.join(templatePath, file);
      const projectFilePath = path.join(this.projectRoot, file);

      const inTemplate = fs.existsSync(templateFilePath);
      const inProject = fs.existsSync(projectFilePath);

      if (!inProject && inTemplate) {
        // New file in template
        changes.push({
          path: file,
          status: 'added',
          inTemplate: true,
          inProject: false,
        });
      } else if (inProject && !inTemplate) {
        // File removed from template (keep in project)
        continue;
      } else if (inProject && inTemplate) {
        // File exists in both - check if different
        const templateHash = this.getFileHash(templateFilePath);
        const projectHash = this.getFileHash(projectFilePath);

        if (templateHash !== projectHash) {
          changes.push({
            path: file,
            status: 'modified',
            inTemplate: true,
            inProject: true,
          });
        }
      }
    }

    return changes;
  }

  private hasProjectChanges(filePath: string): boolean {
    // Check if file has been modified in the project since last sync
    try {
      // If we have the project commit from last sync, check against it
      if (this.config.lastProjectCommit) {
        const diff = this.exec(
          `git diff ${this.config.lastProjectCommit} HEAD -- "${filePath}"`,
          { silent: true }
        );
        return diff.length > 0;
      }

      // Otherwise, check if file is tracked and has history
      const log = this.exec(`git log --oneline -- "${filePath}"`, { silent: true });
      return log.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if a file has changed in the template since the last sync.
   * Returns true if the template modified this file.
   */
  private hasTemplateChanges(filePath: string): boolean {
    // If no lastSyncCommit, this is first sync - assume everything is new
    if (!this.config.lastSyncCommit) {
      return true;
    }

    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);

    try {
      // Check if file changed in template between lastSyncCommit and HEAD
      const diff = this.exec(
        `git diff ${this.config.lastSyncCommit} HEAD -- "${filePath}"`,
        { cwd: templatePath, silent: true }
      );
      return diff.length > 0;
    } catch {
      // If we can't determine (e.g., commit not found), assume changed to be safe
      return true;
    }
  }

  private analyzeChanges(changes: FileChange[]): AnalysisResult {
    const result: AnalysisResult = {
      safeChanges: [],
      conflictChanges: [],
      projectOnlyChanges: [],
      skipped: [],
    };

    for (const change of changes) {
      // Skip project-specific files (with glob pattern support)
      if (this.shouldIgnoreByProjectSpecificFiles(change.path)) {
        result.skipped.push(change.path);
        continue;
      }

      if (change.status === 'added') {
        // New file - safe to add
        result.safeChanges.push(change);
      } else if (change.status === 'modified') {
        // Check both sides for changes
        const templateChanged = this.hasTemplateChanges(change.path);
        const projectChanged = this.hasProjectChanges(change.path);

        if (templateChanged && projectChanged) {
          // TRUE conflict - both sides modified the file
          result.conflictChanges.push(change);
        } else if (templateChanged && !projectChanged) {
          // Only template changed - safe to auto-apply
          result.safeChanges.push(change);
        } else if (!templateChanged && projectChanged) {
          // Only project changed - this is a customization, NOT a conflict
          result.projectOnlyChanges.push(change);
        }
        // If neither changed, files should be identical (won't reach here)
      }
    }

    return result;
  }

  private async promptUser(analysis: AnalysisResult): Promise<SyncMode> {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(60));

    if (analysis.safeChanges.length > 0) {
      console.log(`\n✅ Safe changes (${analysis.safeChanges.length} files):`);
      console.log('   Only changed in template, no conflicts:');
      analysis.safeChanges.forEach(f =>
        console.log(`   • ${f.path}`)
      );
    }

    if (analysis.conflictChanges.length > 0) {
      console.log(`\n⚠️  Potential conflicts (${analysis.conflictChanges.length} files):`);
      console.log('   Changed in both template and your project:');
      analysis.conflictChanges.forEach(f =>
        console.log(`   • ${f.path}`)
      );
    }

    if (analysis.projectOnlyChanges.length > 0) {
      console.log(`\n✅ Project customizations (${analysis.projectOnlyChanges.length} files):`);
      console.log('   Changed only in your project (template unchanged):');
      analysis.projectOnlyChanges.forEach(f =>
        console.log(`   • ${f.path}`)
      );
    }

    if (analysis.skipped.length > 0) {
      console.log(`\n⏭️  Skipped (${analysis.skipped.length} files):`);
      console.log('   Project-specific files (ignored):');
      analysis.skipped.forEach(f =>
        console.log(`   • ${f}`)
      );

      // Warning about skipped files
      console.log('\n' + '─'.repeat(60));
      console.log('⚠️  WARNING: Skipped files have template changes!');
      console.log('   These changes will NOT be applied to your project.');
      console.log('   If synced files depend on skipped file changes, your code may break.');
      console.log('   Run "yarn sync-template --diff-summary" to review skipped file diffs.');
      console.log('─'.repeat(60));
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n🤔 What would you like to do?\n');
    console.log('  [1] Safe only  - Apply only safe changes (skip conflicts)');
    console.log('  [2] All changes - Apply safe changes + choose how to handle each conflict');
    console.log('  [3] Cancel     - Don\'t apply any changes');
    if (analysis.projectOnlyChanges.length > 0) {
      console.log('\n   Note: Project customizations will be kept automatically.\n');
    } else {
      console.log('');
    }

    return new Promise((resolve) => {
      this.rl.question('Enter your choice (1/2/3): ', (answer) => {
        const choice = answer.trim();

        if (choice === '1') {
          resolve('safe');
        } else if (choice === '2') {
          resolve('all');
        } else if (choice === '3') {
          resolve('none');
        } else {
          console.log('Invalid choice. Please enter 1, 2, or 3.');
          this.promptUser(analysis).then(resolve);
        }
      });
    });
  }

  private printConflictResolutionOptions(): void {
    console.log('');
    console.log('  [1] Override with template - Replace your changes with template version');
    console.log('  [2] Skip file              - Keep your current version, ignore template');
    console.log('  [3] Merge                  - Apply template changes (may cause conflicts)');
    console.log('  [4] Do nothing             - Leave file unchanged for now');
    console.log('');
  }

  private parseConflictResolution(input: string): ConflictResolution | null {
    const choice = input.trim();
    switch (choice) {
      case '1': return 'override';
      case '2': return 'skip';
      case '3': return 'merge';
      case '4': return 'nothing';
      default: return null;
    }
  }

  private async promptConflictResolutionMode(conflictCount: number): Promise<'bulk' | 'individual'> {
    console.log('\n' + '─'.repeat(60));
    console.log(`⚠️  CONFLICT RESOLUTION (${conflictCount} files)`);
    console.log('─'.repeat(60));
    console.log('\nHow would you like to handle the conflicting files?\n');
    console.log('  [1] Apply the same action to all conflicting files');
    console.log('  [2] Choose an action for each file individually');
    console.log('');

    return new Promise((resolve) => {
      this.rl.question('Enter your choice (1/2): ', (answer) => {
        const choice = answer.trim();
        if (choice === '1') {
          resolve('bulk');
        } else if (choice === '2') {
          resolve('individual');
        } else {
          console.log('Invalid choice. Please enter 1 or 2.');
          this.promptConflictResolutionMode(conflictCount).then(resolve);
        }
      });
    });
  }

  private async promptBulkConflictResolution(): Promise<ConflictResolution> {
    console.log('\n📋 Choose the action to apply to ALL conflicting files:');
    this.printConflictResolutionOptions();

    return new Promise((resolve) => {
      this.rl.question('Enter your choice (1/2/3/4): ', (answer) => {
        const resolution = this.parseConflictResolution(answer);
        if (resolution) {
          resolve(resolution);
        } else {
          console.log('Invalid choice. Please enter 1, 2, 3, or 4.');
          this.promptBulkConflictResolution().then(resolve);
        }
      });
    });
  }

  private async promptIndividualConflictResolution(
    conflicts: FileChange[]
  ): Promise<ConflictResolutionMap> {
    const resolutions: ConflictResolutionMap = {};

    console.log('\n📋 Choose an action for each conflicting file:\n');

    for (let i = 0; i < conflicts.length; i++) {
      const file = conflicts[i];
      console.log('─'.repeat(60));
      console.log(`\n📄 File ${i + 1} of ${conflicts.length}: ${file.path}`);
      this.printConflictResolutionOptions();

      const resolution = await new Promise<ConflictResolution>((resolve) => {
        const askQuestion = () => {
          this.rl.question(`Action for ${file.path} (1/2/3/4): `, (answer) => {
            const res = this.parseConflictResolution(answer);
            if (res) {
              resolve(res);
            } else {
              console.log('Invalid choice. Please enter 1, 2, 3, or 4.');
              askQuestion();
            }
          });
        };
        askQuestion();
      });

      resolutions[file.path] = resolution;

      // Show confirmation
      const resolutionLabels: Record<ConflictResolution, string> = {
        override: '✓ Will override with template',
        skip: '✓ Will skip (keep current)',
        merge: '✓ Will merge (may conflict)',
        nothing: '✓ Will do nothing',
      };
      console.log(`   ${resolutionLabels[resolution]}`);
    }

    return resolutions;
  }

  private async handleConflictResolution(
    conflicts: FileChange[]
  ): Promise<ConflictResolutionMap> {
    if (conflicts.length === 0) {
      return {};
    }

    // Show list of conflicting files
    console.log('\n' + '='.repeat(60));
    console.log('📋 FILES WITH POTENTIAL CONFLICTS');
    console.log('='.repeat(60));
    console.log('\nThese files have changes in both your project AND the template:\n');
    conflicts.forEach((f, i) => console.log(`  ${i + 1}. ${f.path}`));

    // Ask user how they want to handle conflicts
    const mode = await this.promptConflictResolutionMode(conflicts.length);

    if (mode === 'bulk') {
      const resolution = await this.promptBulkConflictResolution();
      const resolutions: ConflictResolutionMap = {};
      for (const conflict of conflicts) {
        resolutions[conflict.path] = resolution;
      }
      return resolutions;
    } else {
      return this.promptIndividualConflictResolution(conflicts);
    }
  }

  private printConflictResolutionSummary(resolutions: ConflictResolutionMap): void {
    const counts = {
      override: 0,
      skip: 0,
      merge: 0,
      nothing: 0,
    };

    for (const resolution of Object.values(resolutions)) {
      counts[resolution]++;
    }

    console.log('\n' + '─'.repeat(60));
    console.log('📊 CONFLICT RESOLUTION SUMMARY');
    console.log('─'.repeat(60));

    if (counts.override > 0) {
      console.log(`\n🔄 Override with template (${counts.override} files):`);
      Object.entries(resolutions)
        .filter(([, r]) => r === 'override')
        .forEach(([path]) => console.log(`   • ${path}`));
    }

    if (counts.skip > 0) {
      console.log(`\n⏭️  Skip (${counts.skip} files):`);
      Object.entries(resolutions)
        .filter(([, r]) => r === 'skip')
        .forEach(([path]) => console.log(`   • ${path}`));
    }

    if (counts.merge > 0) {
      console.log(`\n🔀 Merge (${counts.merge} files):`);
      Object.entries(resolutions)
        .filter(([, r]) => r === 'merge')
        .forEach(([path]) => console.log(`   • ${path}`));
    }

    if (counts.nothing > 0) {
      console.log(`\n⏸️  Do nothing (${counts.nothing} files):`);
      Object.entries(resolutions)
        .filter(([, r]) => r === 'nothing')
        .forEach(([path]) => console.log(`   • ${path}`));
    }

    console.log('');
  }

  private async syncFiles(
    analysis: AnalysisResult,
    mode: SyncMode,
    conflictResolutions?: ConflictResolutionMap
  ): Promise<SyncResult> {
    const result: SyncResult = {
      autoMerged: [],
      conflicts: [],
      projectOnlyChanges: analysis.projectOnlyChanges.map(c => c.path),
      skipped: [...analysis.skipped],
      errors: [],
    };

    if (mode === 'none') {
      console.log('\n❌ Cancelled. No changes applied.');
      return result;
    }

    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);

    // Apply safe changes
    console.log(`\n🔄 Applying safe changes (${analysis.safeChanges.length} files)...\n`);

    for (const change of analysis.safeChanges) {
      const templateFilePath = path.join(templatePath, change.path);
      const projectFilePath = path.join(this.projectRoot, change.path);

      try {
        if (!this.dryRun) {
          const dir = path.dirname(projectFilePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.copyFileSync(templateFilePath, projectFilePath);
        }
        result.autoMerged.push(change.path);
      } catch (error: any) {
        result.errors.push(`${change.path}: ${error.message}`);
      }
    }

    // Handle conflicts based on mode and resolutions
    if (mode === 'all' && analysis.conflictChanges.length > 0) {
      console.log(`\n🔄 Processing conflicts (${analysis.conflictChanges.length} files)...\n`);

      for (const change of analysis.conflictChanges) {
        const templateFilePath = path.join(templatePath, change.path);
        const projectFilePath = path.join(this.projectRoot, change.path);
        const resolution = conflictResolutions?.[change.path] || 'merge';

        try {
          switch (resolution) {
            case 'override':
              // Replace project file with template version
              if (!this.dryRun) {
                const dir = path.dirname(projectFilePath);
                if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true });
                }
                fs.copyFileSync(templateFilePath, projectFilePath);
              }
              result.autoMerged.push(change.path);
              break;

            case 'skip':
              // Keep project version, add to skipped
              result.skipped.push(change.path);
              break;

            case 'merge':
              // Save template version for manual merge (original behavior)
              result.conflicts.push(change.path);
              if (!this.dryRun) {
                fs.copyFileSync(templateFilePath, projectFilePath + '.template');
              }
              break;

            case 'nothing':
              // Leave file unchanged, don't add to any list
              // Just log that we skipped it
              break;
          }
        } catch (error: any) {
          result.errors.push(`${change.path}: ${error.message}`);
        }
      }
    }

    return result;
  }

  private printResults(result: SyncResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC RESULTS');
    console.log('='.repeat(60));

    if (result.autoMerged.length > 0) {
      console.log(`\n✅ Applied successfully (${result.autoMerged.length} files):`);
      result.autoMerged.forEach(f => console.log(`   ${f}`));
    }

    if (result.conflicts.length > 0) {
      console.log(`\n🔀 Needs manual merge (${result.conflicts.length} files):`);
      result.conflicts.forEach(f => {
        console.log(`   ${f}`);
        console.log(`      → Template version saved to: ${f}.template`);
      });
    }

    if (result.projectOnlyChanges && result.projectOnlyChanges.length > 0) {
      console.log(`\n✅ Project customizations kept (${result.projectOnlyChanges.length} files):`);
      console.log('   These files were only changed in your project:');
      result.projectOnlyChanges.forEach(f => console.log(`   ${f}`));
    }

    if (result.skipped.length > 0) {
      console.log(`\n⏭️  Skipped (${result.skipped.length} files):`);
      result.skipped.forEach(f => console.log(`   ${f}`));
    }

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors (${result.errors.length}):`);
      result.errors.forEach(e => console.log(`   ${e}`));
    }

    console.log('\n' + '='.repeat(60));

    if (result.conflicts.length > 0) {
      console.log('\n💡 Next steps for manual merges:');
      console.log('   1. Review each conflict file');
      console.log('   2. Compare with the .template version');
      console.log('   3. Manually merge the changes');
      console.log('   4. Delete the .template files when done');
      console.log('   5. Commit your changes');
    }
  }

  /**
   * Get the list of template commits since the last sync.
   * Returns commit messages in format: "hash - message"
   */
  private getTemplateCommitsSinceLastSync(): string[] {
    if (!this.config.lastSyncCommit) {
      return []; // First sync, no previous commits to show
    }

    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);

    try {
      // Get commits between lastSyncCommit and HEAD
      const log = this.exec(
        `git log ${this.config.lastSyncCommit}..HEAD --oneline --no-decorate`,
        { cwd: templatePath, silent: true }
      );

      if (!log.trim()) {
        return [];
      }

      return log.trim().split('\n').filter(line => line.trim());
    } catch {
      // If lastSyncCommit doesn't exist in template (force push, etc.), return empty
      return [];
    }
  }

  /**
   * Format template commits for the sync commit message.
   */
  private formatSyncCommitMessage(templateCommit: string, templateCommits: string[]): string {
    const shortCommit = templateCommit.slice(0, 7);
    
    if (templateCommits.length === 0) {
      return `chore: sync template (${shortCommit})`;
    }

    const header = `chore: sync template (${shortCommit})`;
    const body = '\n\nTemplate commits synced:\n' + templateCommits.map(c => `- ${c}`).join('\n');
    
    return header + body;
  }

  private generateFileDiff(filePath: string): string {
    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);
    const templateFilePath = path.join(templatePath, filePath);
    const projectFilePath = path.join(this.projectRoot, filePath);

    const templateExists = fs.existsSync(templateFilePath);
    const projectExists = fs.existsSync(projectFilePath);

    if (!templateExists) {
      return '';
    }

    if (!projectExists) {
      // New file in template - show full content
      const content = fs.readFileSync(templateFilePath, 'utf-8');
      return `+++ NEW FILE +++\n${content}`;
    }

    // Both exist - generate unified diff
    try {
      const diff = this.exec(
        `diff -u "${projectFilePath}" "${templateFilePath}" || true`,
        { silent: true }
      );

      if (diff) {
        // Replace file paths in diff header for clarity
        return diff
          .replace(projectFilePath, `a/${filePath} (current)`)
          .replace(templateFilePath, `b/${filePath} (template)`);
      }
      return '(no differences)';
    } catch {
      return '(unable to generate diff)';
    }
  }

  private async runDiffSummary(): Promise<void> {
    console.log('📋 Generating Diff Summary');
    console.log('='.repeat(60));

    // Clone template
    this.cloneTemplate();

    try {
      // Get template commit
      const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);
      const templateCommit = this.exec('git rev-parse HEAD', {
        cwd: templatePath,
        silent: true,
      });

      console.log(`📍 Template commit: ${templateCommit}\n`);

      // Compare files - get ALL changes (we'll handle skipped differently for diff-summary)
      console.log('🔍 Analyzing changes...');
      const changes = this.compareFiles();

      if (changes.length === 0) {
        console.log('✅ No changes detected. Your project is up to date!');
        return;
      }

      // Build the diff summary
      const lines: string[] = [];
      lines.push('# Template Diff Summary');
      lines.push('');
      lines.push(`Generated: ${new Date().toISOString()}`);
      lines.push(`Template: ${this.config.templateRepo}`);
      lines.push(`Template Commit: ${templateCommit}`);
      lines.push('');
      lines.push('This file shows all differences between the template and your current project.');
      lines.push('Only changes in the template are shown (files that exist only in your project are not included).');
      lines.push('');
      lines.push('---');
      lines.push('');

      // Categorize changes
      const safeChanges: FileChange[] = [];
      const conflictChanges: FileChange[] = [];
      const projectOnlyChanges: FileChange[] = [];
      const skippedChanges: FileChange[] = [];

      for (const change of changes) {
        if (this.shouldIgnoreByProjectSpecificFiles(change.path)) {
          skippedChanges.push(change);
        } else if (change.status === 'added') {
          safeChanges.push(change);
        } else if (change.status === 'modified') {
          const templateChanged = this.hasTemplateChanges(change.path);
          const projectChanged = this.hasProjectChanges(change.path);

          if (templateChanged && projectChanged) {
            conflictChanges.push(change);
          } else if (templateChanged && !projectChanged) {
            safeChanges.push(change);
          } else if (!templateChanged && projectChanged) {
            projectOnlyChanges.push(change);
          }
        }
      }

      // Summary section
      lines.push('## Summary');
      lines.push('');
      lines.push(`- **Safe changes** (can be auto-merged): ${safeChanges.length} files`);
      lines.push(`- **Potential conflicts** (changed in both): ${conflictChanges.length} files`);
      lines.push(`- **Project customizations** (kept as-is): ${projectOnlyChanges.length} files`);
      lines.push(`- **Skipped** (project-specific): ${skippedChanges.length} files`);
      lines.push(`- **Total**: ${changes.length} files`);
      lines.push('');

      // Table of contents
      lines.push('## Table of Contents');
      lines.push('');

      if (safeChanges.length > 0) {
        lines.push('### Safe Changes');
        safeChanges.forEach((c, i) => {
          const anchor = c.path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
          lines.push(`${i + 1}. [${c.path}](#${anchor}) (${c.status})`);
        });
        lines.push('');
      }

      if (conflictChanges.length > 0) {
        lines.push('### Potential Conflicts');
        conflictChanges.forEach((c, i) => {
          const anchor = c.path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
          lines.push(`${i + 1}. [${c.path}](#${anchor}) (${c.status})`);
        });
        lines.push('');
      }

      if (projectOnlyChanges.length > 0) {
        lines.push('### Project Customizations (Kept As-Is)');
        projectOnlyChanges.forEach((c, i) => {
          const anchor = `project-${c.path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
          lines.push(`${i + 1}. [${c.path}](#${anchor}) (${c.status})`);
        });
        lines.push('');
      }

      if (skippedChanges.length > 0) {
        lines.push('### Skipped (Project-Specific)');
        skippedChanges.forEach((c, i) => {
          const anchor = `skipped-${c.path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
          lines.push(`${i + 1}. [${c.path}](#${anchor}) (${c.status})`);
        });
        lines.push('');
      }

      lines.push('---');
      lines.push('');

      // Generate diffs for each category
      const addDiffSection = (title: string, changes: FileChange[], prefix = '') => {
        if (changes.length === 0) return;

        lines.push(`## ${title}`);
        lines.push('');

        for (const change of changes) {
          const anchor = prefix ? `${prefix}-${change.path}` : change.path;
          lines.push(`### ${anchor}`);
          lines.push('');
          lines.push(`**Status**: ${change.status}`);
          lines.push('');
          lines.push('```diff');
          lines.push(this.generateFileDiff(change.path));
          lines.push('```');
          lines.push('');
          lines.push('---');
          lines.push('');
        }
      };

      addDiffSection('Safe Changes (Can Auto-Merge)', safeChanges);
      addDiffSection('Potential Conflicts (Changed in Both)', conflictChanges);
      addDiffSection('Project Customizations (Kept As-Is)', projectOnlyChanges, 'project');
      addDiffSection('Skipped Files (Project-Specific)', skippedChanges, 'skipped');

      // Write to file
      const outputPath = path.join(this.projectRoot, DIFF_SUMMARY_FILE);
      fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');

      console.log('\n' + '='.repeat(60));
      console.log('📊 DIFF SUMMARY GENERATED');
      console.log('='.repeat(60));
      console.log(`\n✅ Output written to: ${DIFF_SUMMARY_FILE}`);
      console.log(`\n📈 Summary:`);
      console.log(`   • Safe changes: ${safeChanges.length} files`);
      console.log(`   • Potential conflicts: ${conflictChanges.length} files`);
      console.log(`   • Project customizations: ${projectOnlyChanges.length} files`);
      console.log(`   • Skipped: ${skippedChanges.length} files`);
      console.log(`   • Total: ${changes.length} files`);
      console.log('\n💡 Next steps:');
      console.log(`   1. Open ${DIFF_SUMMARY_FILE} to review all diffs`);
      console.log('   2. Decide which changes you want to apply');
      console.log('   3. Run "yarn sync-template" to apply changes');
      console.log('   4. Or manually copy specific changes from the diff');

    } finally {
      this.cleanupTemplate();
    }
  }

  async run(): Promise<void> {
    console.log('🔄 Template Sync Tool');
    console.log('='.repeat(60));

    // Handle diff-summary mode
    if (this.diffSummary) {
      await this.runDiffSummary();
      this.rl.close();
      return;
    }

    if (this.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    // Step 1: Check git status
    if (!this.dryRun && !this.force) {
      this.checkGitStatus();
    }

    // Step 2: Clone template
    try {
      this.cloneTemplate();

      // Step 3: Get template commit
      const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);
      const templateCommit = this.exec('git rev-parse HEAD', {
        cwd: templatePath,
        silent: true,
      });

      console.log(`📍 Template commit: ${templateCommit}`);
      
      // Show template commits since last sync
      const templateCommits = this.getTemplateCommitsSinceLastSync();
      if (templateCommits.length > 0) {
        console.log(`\n📜 Template commits since last sync (${templateCommits.length}):`);
        templateCommits.slice(0, 10).forEach(c => console.log(`   ${c}`));
        if (templateCommits.length > 10) {
          console.log(`   ... and ${templateCommits.length - 10} more`);
        }
      } else if (this.config.lastSyncCommit) {
        console.log('\n📜 No new template commits since last sync.');
      }
      console.log('');

      // Step 4: Compare files
      console.log('🔍 Analyzing changes...');
      const changes = this.compareFiles();

      if (changes.length === 0) {
        console.log('✅ No changes detected. Your project is up to date!');
        this.rl.close();
        return;
      }

      // Step 5: Analyze changes (categorize into safe/conflict)
      const analysis = this.analyzeChanges(changes);

      // Check if all changes are skipped or project-only (nothing to sync from template)
      const hasChangesToSync = analysis.safeChanges.length > 0 || analysis.conflictChanges.length > 0;

      if (!hasChangesToSync) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 ANALYSIS SUMMARY');
        console.log('='.repeat(60));

        if (analysis.projectOnlyChanges.length > 0) {
          console.log(`\n✅ Project customizations (${analysis.projectOnlyChanges.length} files):`);
          console.log('   Changed only in your project (template unchanged):');
          analysis.projectOnlyChanges.forEach(f => console.log(`   • ${f.path}`));
        }

        if (analysis.skipped.length > 0) {
          console.log(`\n⏭️  Skipped files (${analysis.skipped.length} files):`);
          console.log('   These files are in your ignored/project-specific list.');
          analysis.skipped.forEach(f => console.log(`   • ${f}`));
        }

        console.log('\n' + '='.repeat(60));
        console.log('\n✅ Nothing to sync. The template has no new changes for your project.');
        if (analysis.projectOnlyChanges.length > 0) {
          console.log('   Your project customizations will be kept as-is.');
        }
        this.rl.close();
        return;
      }

      // Step 6: Prompt user for choice (unless auto mode or dry-run)
      let mode: SyncMode;
      let conflictResolutions: ConflictResolutionMap = {};

      if (this.dryRun) {
        // In dry-run, show analysis but don't apply
        mode = 'all'; // Show everything
        const result = await this.syncFiles(analysis, mode);
        this.printResults(result);
        console.log('\n🔍 DRY RUN - No changes were actually applied.');
        this.rl.close();
        return;
      } else if (this.autoMode !== 'none') {
        // Auto mode: apply based on the specific auto flag
        const autoModeLabels: Record<AutoMode, string> = {
          'none': '',
          'safe-only': 'AUTO SAFE ONLY - Applying only safe changes, skipping conflicts...',
          'merge-conflicts': 'AUTO MERGE - Applying all changes, conflicts will need manual merge...',
          'override-conflicts': 'AUTO OVERRIDE - Applying all changes, conflicts will be overridden with template...',
          'skip-conflicts': 'AUTO SKIP - Applying safe changes, skipping all conflicts...',
        };
        console.log(`\n🤖 ${autoModeLabels[this.autoMode]}`);

        switch (this.autoMode) {
          case 'safe-only':
            mode = 'safe';
            break;
          case 'merge-conflicts':
            mode = 'all';
            for (const conflict of analysis.conflictChanges) {
              conflictResolutions[conflict.path] = 'merge';
            }
            break;
          case 'override-conflicts':
            mode = 'all';
            for (const conflict of analysis.conflictChanges) {
              conflictResolutions[conflict.path] = 'override';
            }
            break;
          case 'skip-conflicts':
            mode = 'all';
            for (const conflict of analysis.conflictChanges) {
              conflictResolutions[conflict.path] = 'skip';
            }
            break;
          default:
            mode = 'safe';
        }
      } else {
        // Interactive mode: ask user
        mode = await this.promptUser(analysis);

        // If user chose 'all' and there are conflicts, handle them interactively
        if (mode === 'all' && analysis.conflictChanges.length > 0) {
          conflictResolutions = await this.handleConflictResolution(analysis.conflictChanges);
          this.printConflictResolutionSummary(conflictResolutions);

          // Confirm before proceeding
          const proceed = await new Promise<boolean>((resolve) => {
            this.rl.question('Proceed with these actions? (y/n): ', (answer) => {
              resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
            });
          });

          if (!proceed) {
            console.log('\n✅ No changes applied.');
            this.rl.close();
            return;
          }
        }
      }

      this.rl.close();

      if (mode === 'none') {
        console.log('\n✅ No changes applied.');
        return;
      }

      // Step 7: Apply changes based on mode (mode is 'safe' or 'all' here)
      const result = await this.syncFiles(analysis, mode, conflictResolutions);

      // Step 8: Print results
      this.printResults(result);

      // Step 9: Auto-commit synced files and update config (only if not dry-run and changes were made)
      if (!this.dryRun && result.autoMerged.length > 0) {
        console.log('\n📦 Committing synced files...');
        
        // Get template commits for the commit message (before cleanup)
        const templateCommits = this.getTemplateCommitsSinceLastSync();
        
        if (templateCommits.length > 0) {
          console.log(`\n📜 Template commits being synced (${templateCommits.length}):`);
          templateCommits.forEach(c => console.log(`   ${c}`));
        }
        
        try {
          // Stage all changes (including .template-sync.json which we'll update)
          this.exec('git add -A', { silent: true });
          
          // Create commit with template commits in message
          const commitMessage = this.formatSyncCommitMessage(templateCommit, templateCommits);
          // Use a temp file for multi-line commit message
          const tempFile = path.join(this.projectRoot, '.sync-commit-msg.tmp');
          fs.writeFileSync(tempFile, commitMessage, 'utf-8');
          this.exec(`git commit -F "${tempFile}"`, { silent: true });
          fs.unlinkSync(tempFile);
          
          // Now get the commit that INCLUDES the sync changes
          const projectCommit = this.exec('git rev-parse HEAD', { silent: true });
          this.config.lastSyncCommit = templateCommit;
          this.config.lastProjectCommit = projectCommit;
          this.config.lastSyncDate = new Date().toISOString();
          this.saveConfig();
          
          // Amend commit to include updated config
          this.exec('git add .template-sync.json', { silent: true });
          this.exec('git commit --amend --no-edit', { silent: true });
          
          const finalCommit = this.exec('git rev-parse --short HEAD', { silent: true });
          console.log(`\n   ✅ Committed as ${finalCommit}`);
        } catch (error: any) {
          console.log(`   ⚠️  Auto-commit failed: ${error.message}`);
          console.log('   Please commit the changes manually.');
          
          // Still update config even if commit fails
          this.config.lastSyncCommit = templateCommit;
          this.config.lastSyncDate = new Date().toISOString();
          this.saveConfig();
        }
      } else if (!this.dryRun) {
        // No changes applied, just update the sync timestamp
        this.config.lastSyncCommit = templateCommit;
        this.config.lastSyncDate = new Date().toISOString();
        this.saveConfig();
      }

      if (result.autoMerged.length > 0) {
        console.log('\n✅ Template sync completed!');
        if (result.conflicts.length === 0) {
          console.log('   All changes were applied and committed.');
        } else {
          console.log('   Safe changes committed. Review .template files for manual merges.');
        }
      }
    } catch (error: any) {
      this.rl.close();
      throw error;
    } finally {
      // Cleanup
      this.cleanupTemplate();
    }
  }
}

// Main execution
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const diffSummary = args.includes('--diff-summary');

// Parse auto mode flags (mutually exclusive)
let autoMode: AutoMode = 'none';
if (args.includes('--auto-safe-only')) {
  autoMode = 'safe-only';
} else if (args.includes('--auto-merge-conflicts')) {
  autoMode = 'merge-conflicts';
} else if (args.includes('--auto-override-conflicts')) {
  autoMode = 'override-conflicts';
} else if (args.includes('--auto-skip-conflicts')) {
  autoMode = 'skip-conflicts';
}

const tool = new TemplateSyncTool(dryRun, force, autoMode, diffSummary);
tool.run().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

