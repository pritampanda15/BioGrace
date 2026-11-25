#!/usr/bin/env node
/**
 * BioGrace CLI — Publication DE/Single-Cell Plotter & Statistical Test Advisor
 * Runs headless from the terminal using the exact same TypeScript core as the web studio.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const tsxBin = path.join(projectRoot, 'node_modules', '.bin', 'tsx');
const cliEntry = path.join(projectRoot, 'src', 'cli', 'runCli.ts');

const result = spawnSync(tsxBin, [cliEntry, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

process.exit(result.status ?? 1);
