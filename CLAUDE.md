# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Termochi is a TypeScript-based terminal UI application built with React and [Ink](https://github.com/vadimdemedes/ink) for interactive CLI rendering. It uses Commander for argument parsing and Conf for persistent configuration.

## Commands

The project has no build scripts configured yet. Use these directly:

```bash
# Run a TypeScript file
npx tsx src/index.ts

# Type-check
npx tsc --noEmit

# Run tests (once configured)
npx vitest

# Run a single test file
npx vitest path/to/test.ts

# Lint
npx eslint .

# Format
npx prettier --write .
```

## TypeScript Configuration

Strict settings are enabled — pay attention to:
- `noUncheckedIndexedAccess`: array/object indexed access returns `T | undefined`
- `exactOptionalPropertyTypes`: optional props can't be set to `undefined` explicitly
- `verbatimModuleSyntax`: use `import type` for type-only imports
- `module: "nodenext"`: requires explicit file extensions in imports (e.g., `./foo.js` even for `.ts` files)
- `types: []`: no global types auto-included — add `@types/node` explicitly if needed via `"types": ["node"]`

## Stack

| Concern | Library |
|---|---|
| Terminal UI | Ink (React renderer for terminals) |
| CLI parsing | Commander |
| Config persistence | Conf |
| Validation | Zod |
| Terminal colors | Picocolors |
| Testing | Vitest |
