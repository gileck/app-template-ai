#!/usr/bin/env ts-node

/**
 * Template Sync Script
 * 
 * This script helps merge updates from the template repository into a project
 * that was created from the template.
 * 
 * Usage:
 *   yarn sync-template [--dry-run] [--force] [--auto] [--diff-summary]
 * 
 * Options:
 *   --dry-run       Show what would be done without making changes
 *   --force         Force update even if there are uncommitted changes
 *   --auto          Skip interactive prompts, take all changes (old behavior)
 *   --diff-summary  Generate a diff summary file showing all template changes
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
  skipped: string[];
  errors: string[];
}

interface AnalysisResult {
  safeChanges: FileChange[];    // Only changed in template
  conflictChanges: FileChange[]; // Changed in both
  skipped: string[];
}

type SyncMode = 'safe' | 'all' | 'none';

const CONFIG_FILE = '.template-sync.json';
const TEMPLATE_DIR = '.template-sync-temp';
const DIFF_SUMMARY_FILE = 'template-diff-summary.md';

class TemplateSyncTool {
  private config: TemplateSyncConfig;
  private projectRoot: string;
  private dryRun: boolean;
  private force: boolean;
  private auto: boolean;
  private diffSummary: boolean;
  private rl: readline.Interface;

  constructor(dryRun = false, force = false, auto = false, diffSummary = false) {
    this.projectRoot = process.cwd();
    this.dryRun = dryRun;
    this.force = force;
    this.auto = auto;
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
    this.exec(
      `git clone --branch ${this.config.templateBranch} --depth 1 ${this.config.templateRepo} ${TEMPLATE_DIR}`,
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

  private analyzeChanges(changes: FileChange[]): AnalysisResult {
    const result: AnalysisResult = {
      safeChanges: [],
      conflictChanges: [],
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
        // Check if project has changes
        const projectHasChanges = this.hasProjectChanges(change.path);
        
        if (!projectHasChanges) {
          // Only template changed - safe
          result.safeChanges.push(change);
        } else {
          // Both changed - conflict
          result.conflictChanges.push(change);
        }
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

    if (analysis.skipped.length > 0) {
      console.log(`\n⏭️  Skipped (${analysis.skipped.length} files):`);
      console.log('   Project-specific files (ignored):');
      analysis.skipped.forEach(f => 
        console.log(`   • ${f}`)
      );
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n🤔 What would you like to do?\n');
    console.log('  [1] Safe only  - Apply only safe changes (no conflicts)');
    console.log('  [2] All changes - Apply all changes (may need manual merge)');
    console.log('  [3] Cancel     - Don\'t apply any changes\n');

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

  private async syncFiles(analysis: AnalysisResult, mode: SyncMode): Promise<SyncResult> {
    const result: SyncResult = {
      autoMerged: [],
      conflicts: [],
      skipped: analysis.skipped,
      errors: [],
    };

    if (mode === 'none') {
      console.log('\n❌ Cancelled. No changes applied.');
      return result;
    }

    const templatePath = path.join(this.projectRoot, TEMPLATE_DIR);
    const changesToApply: FileChange[] = mode === 'safe' 
      ? analysis.safeChanges 
      : [...analysis.safeChanges, ...analysis.conflictChanges];

    console.log(`\n🔄 Applying ${changesToApply.length} changes...\n`);

    for (const change of changesToApply) {
      const templateFilePath = path.join(templatePath, change.path);
      const projectFilePath = path.join(this.projectRoot, change.path);
      const isConflict = analysis.conflictChanges.includes(change);

      try {
        if (change.status === 'added' || !isConflict) {
          // New file or safe change - copy directly
          if (!this.dryRun) {
            const dir = path.dirname(projectFilePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.copyFileSync(templateFilePath, projectFilePath);
          }
          result.autoMerged.push(change.path);
        } else {
          // Conflict - save template version for manual merge
          result.conflicts.push(change.path);
          
          if (!this.dryRun) {
            fs.copyFileSync(templateFilePath, projectFilePath + '.template');
          }
        }
      } catch (error: any) {
        result.errors.push(`${change.path}: ${error.message}`);
      }
    }

    return result;
  }

  private printResults(result: SyncResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC RESULTS');
    console.log('='.repeat(60));

    if (result.autoMerged.length > 0) {
      console.log(`\n✅ Auto-merged (${result.autoMerged.length} files):`);
      result.autoMerged.forEach(f => console.log(`   ${f}`));
    }

    if (result.conflicts.length > 0) {
      console.log(`\n⚠️  Conflicts - Manual merge needed (${result.conflicts.length} files):`);
      result.conflicts.forEach(f => {
        console.log(`   ${f}`);
        console.log(`      → Template version saved to: ${f}.template`);
      });
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
      console.log('\n💡 Next steps:');
      console.log('   1. Review each conflict file');
      console.log('   2. Compare with the .template version');
      console.log('   3. Manually merge the changes');
      console.log('   4. Delete the .template files when done');
      console.log('   5. Commit your changes');
    }
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
      const skippedChanges: FileChange[] = [];

      for (const change of changes) {
        if (this.shouldIgnoreByProjectSpecificFiles(change.path)) {
          skippedChanges.push(change);
        } else if (change.status === 'added') {
          safeChanges.push(change);
        } else if (change.status === 'modified') {
          const projectHasChanges = this.hasProjectChanges(change.path);
          if (projectHasChanges) {
            conflictChanges.push(change);
          } else {
            safeChanges.push(change);
          }
        }
      }

      // Summary section
      lines.push('## Summary');
      lines.push('');
      lines.push(`- **Safe changes** (can be auto-merged): ${safeChanges.length} files`);
      lines.push(`- **Potential conflicts** (changed in both): ${conflictChanges.length} files`);
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

      console.log(`📍 Template commit: ${templateCommit}\n`);

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

      // Check if all changes are skipped (nothing to sync)
      const hasChangesToSync = analysis.safeChanges.length > 0 || analysis.conflictChanges.length > 0;
      
      if (!hasChangesToSync) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 ANALYSIS SUMMARY');
        console.log('='.repeat(60));
        console.log(`\n⏭️  All changes skipped (${analysis.skipped.length} files):`);
        console.log('   These files are in your ignored/project-specific list.');
        analysis.skipped.forEach(f => console.log(`   • ${f}`));
        console.log('\n' + '='.repeat(60));
        console.log('\n✅ Nothing to sync. All template changes are in ignored files.');
        console.log('   Your project is effectively up to date!');
        this.rl.close();
        return;
      }

      // Step 6: Prompt user for choice (unless auto mode or dry-run)
      let mode: SyncMode;
      
      if (this.dryRun) {
        // In dry-run, show analysis but don't apply
        mode = 'all'; // Show everything
        const result = await this.syncFiles(analysis, mode);
        this.printResults(result);
        console.log('\n🔍 DRY RUN - No changes were actually applied.');
        this.rl.close();
        return;
      } else if (this.auto) {
        // Auto mode: apply all changes (old behavior)
        mode = 'all';
        console.log('\n🤖 AUTO MODE - Applying all changes...');
      } else {
        // Interactive mode: ask user
        mode = await this.promptUser(analysis);
      }

      this.rl.close();

      if (mode === 'none') {
        console.log('\n✅ No changes applied.');
        return;
      }

      // Step 7: Apply changes based on mode (mode is 'safe' or 'all' here)
      const result = await this.syncFiles(analysis, mode);

      // Step 8: Update config (only if not dry-run)
      if (!this.dryRun) {
        const projectCommit = this.exec('git rev-parse HEAD', { silent: true });
        this.config.lastSyncCommit = templateCommit;
        this.config.lastProjectCommit = projectCommit;
        this.config.lastSyncDate = new Date().toISOString();
        this.saveConfig();
      }

      // Step 9: Print results
      this.printResults(result);

      if (result.autoMerged.length > 0) {
        console.log('\n✅ Template sync completed!');
        if (result.conflicts.length === 0) {
          console.log('   All changes were auto-merged successfully.');
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
const auto = args.includes('--auto');
const diffSummary = args.includes('--diff-summary');

const tool = new TemplateSyncTool(dryRun, force, auto, diffSummary);
tool.run().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

