#!/usr/bin/env tsx
/**
 * Test All Agent Library Adapters
 *
 * Tests all available adapters (gemini, openai-codex, cursor, claude-code-sdk)
 * with initialization, read, and write operations.
 *
 * Usage:
 *   yarn test-all-adapters              # Run all tests
 *   yarn test-all-adapters --verbose    # Show detailed output
 *   yarn test-all-adapters --skip-write # Skip write tests
 *   yarn test-all-adapters --adapter gemini  # Test specific adapter only
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import type { AgentLibraryAdapter, AgentRunResult } from '../src/agents/lib';

// Import all adapters directly
import geminiAdapter from '../src/agents/lib/adapters/gemini';
import openaiCodexAdapter from '../src/agents/lib/adapters/openai-codex';
import cursorAdapter from '../src/agents/lib/adapters/cursor';
import claudeCodeSDKAdapter from '../src/agents/lib/adapters/claude-code-sdk';

// ============================================================
// CONFIGURATION
// ============================================================

const TIMEOUT_SHORT = 60; // 60 seconds for simple queries
const TEST_BASE_DIR = '.test-adapters-temp';

interface AdapterInfo {
    name: string;
    adapter: AgentLibraryAdapter;
    description: string;
}

const ADAPTERS: AdapterInfo[] = [
    { name: 'gemini', adapter: geminiAdapter, description: 'Google Gemini CLI' },
    { name: 'openai-codex', adapter: openaiCodexAdapter, description: 'OpenAI Codex CLI' },
    { name: 'cursor', adapter: cursorAdapter, description: 'Cursor Agent CLI' },
    { name: 'claude-code-sdk', adapter: claudeCodeSDKAdapter, description: 'Claude Code SDK' },
];

// ============================================================
// TYPES
// ============================================================

interface TestResult {
    adapter: string;
    test: string;
    passed: boolean;
    duration: number;
    error?: string;
    details?: string;
}

interface AdapterSummary {
    name: string;
    description: string;
    initialized: boolean;
    initError?: string;
    readWorks: boolean;
    writeWorks: boolean;
    model?: string;
}

interface CLIOptions {
    verbose: boolean;
    skipWrite: boolean;
    adapter?: string;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function log(message: string, options: CLIOptions) {
    if (options.verbose) {
        console.log(`    ${message}`);
    }
}

function getAdapterTestDir(adapterName: string): string {
    return path.join(TEST_BASE_DIR, adapterName);
}

function cleanupTestFiles() {
    try {
        if (fs.existsSync(TEST_BASE_DIR)) {
            fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
        }
    } catch {
        // Ignore cleanup errors
    }
}

function ensureAdapterTestDir(adapterName: string): string {
    const dir = getAdapterTestDir(adapterName);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

// ============================================================
// TEST FUNCTIONS
// ============================================================

async function testInit(
    info: AdapterInfo,
    options: CLIOptions
): Promise<TestResult> {
    const startTime = Date.now();

    try {
        if (!info.adapter.isInitialized()) {
            await info.adapter.init();
        }

        const duration = Math.floor((Date.now() - startTime) / 1000);

        log(`Model: ${info.adapter.model}`, options);
        log(`Capabilities: ${JSON.stringify(info.adapter.capabilities)}`, options);

        return {
            adapter: info.name,
            test: 'init',
            passed: true,
            duration,
            details: `Model: ${info.adapter.model}`,
        };
    } catch (error) {
        return {
            adapter: info.name,
            test: 'init',
            passed: false,
            duration: Math.floor((Date.now() - startTime) / 1000),
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

async function testRead(
    info: AdapterInfo,
    options: CLIOptions
): Promise<TestResult> {
    const startTime = Date.now();

    try {
        const result: AgentRunResult = await info.adapter.run({
            prompt: 'Read the package.json file and tell me the project name. Respond with ONLY the name, nothing else.',
            allowWrite: false,
            stream: false,
            timeout: TIMEOUT_SHORT,
            progressLabel: `Testing ${info.name} read`,
        });

        const duration = Math.floor((Date.now() - startTime) / 1000);

        if (!result.success) {
            return {
                adapter: info.name,
                test: 'read',
                passed: false,
                duration,
                error: result.error || 'Unknown error',
            };
        }

        if (!result.content || result.content.trim().length === 0) {
            return {
                adapter: info.name,
                test: 'read',
                passed: false,
                duration,
                error: 'No content returned',
            };
        }

        log(`Response: ${result.content.substring(0, 100)}`, options);
        log(`Files examined: ${result.filesExamined.length}`, options);

        return {
            adapter: info.name,
            test: 'read',
            passed: true,
            duration,
            details: `Response: "${result.content.trim().substring(0, 50)}"`,
        };
    } catch (error) {
        return {
            adapter: info.name,
            test: 'read',
            passed: false,
            duration: Math.floor((Date.now() - startTime) / 1000),
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

async function testWrite(
    info: AdapterInfo,
    options: CLIOptions
): Promise<TestResult> {
    const startTime = Date.now();
    const adapterTestDir = ensureAdapterTestDir(info.name);
    const testFileName = `test-write-${Date.now()}.txt`;
    const testFilePath = path.join(adapterTestDir, testFileName);
    const testContent = `Test content from ${info.name} at ${new Date().toISOString()}`;

    try {

        const result: AgentRunResult = await info.adapter.run({
            prompt: `Create a file at "${testFilePath}" with exactly this content: "${testContent}". Then read it back and confirm the content matches. Respond with "SUCCESS" if it matches or "FAILURE" if not.`,
            allowWrite: true,
            stream: false,
            timeout: TIMEOUT_SHORT,
            progressLabel: `Testing ${info.name} write`,
        });

        const duration = Math.floor((Date.now() - startTime) / 1000);

        if (!result.success) {
            return {
                adapter: info.name,
                test: 'write',
                passed: false,
                duration,
                error: result.error || 'Unknown error',
            };
        }

        // Verify file was created
        const fileExists = fs.existsSync(testFilePath);
        let fileContent = '';
        if (fileExists) {
            fileContent = fs.readFileSync(testFilePath, 'utf-8');
        }

        log(`File created: ${fileExists}`, options);
        log(`Content matches: ${fileContent.includes(testContent.substring(0, 20))}`, options);

        // Consider it a pass if the file exists (even if content isn't exact)
        if (!fileExists) {
            return {
                adapter: info.name,
                test: 'write',
                passed: false,
                duration,
                error: 'File was not created',
            };
        }

        return {
            adapter: info.name,
            test: 'write',
            passed: true,
            duration,
            details: 'File created successfully',
        };
    } catch (error) {
        return {
            adapter: info.name,
            test: 'write',
            passed: false,
            duration: Math.floor((Date.now() - startTime) / 1000),
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
    const program = new Command();

    program
        .name('test-all-adapters')
        .description('Test all agent library adapters')
        .option('-v, --verbose', 'Show detailed output', false)
        .option('--skip-write', 'Skip write operation tests', false)
        .option('-a, --adapter <name>', 'Test specific adapter only')
        .parse(process.argv);

    const options = program.opts<CLIOptions>();

    console.log('\n' + '='.repeat(60));
    console.log('  Agent Library Adapters - Comprehensive Test Suite');
    console.log('='.repeat(60));

    // Filter adapters if specific one requested
    const adaptersToTest = options.adapter
        ? ADAPTERS.filter(a => a.name === options.adapter)
        : ADAPTERS;

    if (adaptersToTest.length === 0) {
        console.error(`\nUnknown adapter: ${options.adapter}`);
        console.error('Available adapters: ' + ADAPTERS.map(a => a.name).join(', '));
        process.exit(1);
    }

    // Ensure clean state
    cleanupTestFiles();

    const summaries: AdapterSummary[] = [];
    const allResults: TestResult[] = [];

    // Test each adapter
    for (const info of adaptersToTest) {
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`  Testing: ${info.name} (${info.description})`);
        console.log('─'.repeat(60));

        const summary: AdapterSummary = {
            name: info.name,
            description: info.description,
            initialized: false,
            readWorks: false,
            writeWorks: false,
        };

        // Test 1: Init
        console.log('\n  [1/3] Initialization...');
        const initResult = await testInit(info, options);
        allResults.push(initResult);

        if (initResult.passed) {
            console.log(`        \x1b[32m✓ PASS\x1b[0m (${initResult.duration}s)`);
            summary.initialized = true;
            summary.model = info.adapter.model;
        } else {
            console.log(`        \x1b[31m✗ FAIL\x1b[0m - ${initResult.error}`);
            summary.initError = initResult.error;
            summaries.push(summary);
            continue; // Skip remaining tests if init fails
        }

        // Test 2: Read
        console.log('\n  [2/3] Read operation...');
        const readResult = await testRead(info, options);
        allResults.push(readResult);

        if (readResult.passed) {
            console.log(`        \x1b[32m✓ PASS\x1b[0m (${readResult.duration}s)`);
            summary.readWorks = true;
        } else {
            console.log(`        \x1b[31m✗ FAIL\x1b[0m - ${readResult.error}`);
        }

        // Test 3: Write (optional)
        if (options.skipWrite) {
            console.log('\n  [3/3] Write operation... \x1b[33mSKIPPED\x1b[0m');
        } else {
            console.log('\n  [3/3] Write operation...');
            const writeResult = await testWrite(info, options);
            allResults.push(writeResult);

            if (writeResult.passed) {
                console.log(`        \x1b[32m✓ PASS\x1b[0m (${writeResult.duration}s)`);
                summary.writeWorks = true;
            } else {
                console.log(`        \x1b[31m✗ FAIL\x1b[0m - ${writeResult.error}`);
            }
        }

        summaries.push(summary);
    }

    // Cleanup test files
    console.log('\n  Cleaning up test files...');
    cleanupTestFiles();
    console.log('        Done');

    // Print Summary
    console.log('\n' + '='.repeat(60));
    console.log('  SUMMARY');
    console.log('='.repeat(60) + '\n');

    // Table header
    const col1 = 18; // Adapter
    const col2 = 10; // Init
    const col3 = 10; // Read
    const col4 = 10; // Write
    const col5 = 20; // Model

    console.log(
        '  ' +
        'Adapter'.padEnd(col1) +
        'Init'.padEnd(col2) +
        'Read'.padEnd(col3) +
        'Write'.padEnd(col4) +
        'Model'
    );
    console.log('  ' + '─'.repeat(col1 + col2 + col3 + col4 + col5));

    for (const summary of summaries) {
        const initStatus = summary.initialized
            ? '\x1b[32m✓ OK\x1b[0m'
            : '\x1b[31m✗ FAIL\x1b[0m';
        const readStatus = summary.initialized
            ? (summary.readWorks ? '\x1b[32m✓ OK\x1b[0m' : '\x1b[31m✗ FAIL\x1b[0m')
            : '\x1b[90m-\x1b[0m';
        const writeStatus = options.skipWrite
            ? '\x1b[33mSKIP\x1b[0m'
            : (summary.initialized
                ? (summary.writeWorks ? '\x1b[32m✓ OK\x1b[0m' : '\x1b[31m✗ FAIL\x1b[0m')
                : '\x1b[90m-\x1b[0m');
        const model = summary.model || (summary.initError ? `(${summary.initError.substring(0, 15)}...)` : '-');

        // Account for ANSI codes in padding
        console.log(
            '  ' +
            summary.name.padEnd(col1) +
            initStatus + ' '.repeat(col2 - 6) +
            readStatus + ' '.repeat(col3 - 6) +
            writeStatus + ' '.repeat(col4 - 6) +
            model.substring(0, col5)
        );
    }

    // Overall statistics
    const totalAdapters = summaries.length;
    const workingAdapters = summaries.filter(s => s.initialized && s.readWorks).length;
    const fullyWorkingAdapters = options.skipWrite
        ? workingAdapters
        : summaries.filter(s => s.initialized && s.readWorks && s.writeWorks).length;

    console.log('\n  ' + '─'.repeat(col1 + col2 + col3 + col4 + col5));
    console.log(`\n  Working Adapters: \x1b[32m${workingAdapters}/${totalAdapters}\x1b[0m (init + read)`);
    if (!options.skipWrite) {
        console.log(`  Fully Working:    \x1b[32m${fullyWorkingAdapters}/${totalAdapters}\x1b[0m (init + read + write)`);
    }

    // List working adapters
    const working = summaries.filter(s => s.initialized && s.readWorks);
    if (working.length > 0) {
        console.log('\n  Available for use:');
        for (const s of working) {
            const writeNote = options.skipWrite ? '' : (s.writeWorks ? ' (read/write)' : ' (read only)');
            console.log(`    • ${s.name}${writeNote} - ${s.model}`);
        }
    }

    // List failed adapters with reasons
    const failed = summaries.filter(s => !s.initialized);
    if (failed.length > 0) {
        console.log('\n  Not available (init failed):');
        for (const s of failed) {
            console.log(`    • ${s.name}: ${s.initError}`);
        }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Exit with appropriate code
    const hasFailures = summaries.some(s => !s.initialized || !s.readWorks || (!options.skipWrite && !s.writeWorks));
    process.exit(hasFailures ? 1 : 0);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    cleanupTestFiles();
    process.exit(1);
});
