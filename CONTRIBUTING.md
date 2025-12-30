# Contributing to Morpheus Deploy

Thank you for your interest in contributing to Morpheus Deploy! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker 24+
- Git

### Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/morpheus-deploy.git
cd morpheus-deploy

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Link CLI for testing
cd apps/cli && pnpm link --global
```

## Development Workflow

### Branch Naming

```
feature/short-description   # New features
fix/issue-number-description # Bug fixes
docs/what-changed           # Documentation
refactor/what-changed       # Code refactoring
test/what-tested            # Test additions
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```
feat(cli): add --dry-run flag to deploy command
fix(sdl): correct GPU resource calculation
docs(readme): update installation instructions
test(core): add unit tests for SDLSynthesizer
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with tests
3. Ensure all checks pass:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```
4. Submit PR with description
5. Address review feedback
6. Squash and merge

## Project Structure

```
morpheus-deploy/
├── apps/
│   └── cli/              # CLI application
├── packages/
│   ├── core/             # Core business logic
│   ├── contracts/        # Blockchain integrations
│   ├── adapters/         # Durability adapters
│   └── templates/        # Deployment templates
├── docker/               # Docker configurations
├── scripts/              # Utility scripts
└── docs/                 # Documentation
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Prefer interfaces over types for object shapes
- Use explicit return types for public functions

```typescript
// Good
interface DeploymentConfig {
  name: string;
  resources: ResourceRequirements;
}

export async function deploy(config: DeploymentConfig): Promise<DeploymentResult> {
  // ...
}

// Avoid
export async function deploy(config: any) {
  // ...
}
```

### Formatting

We use Prettier and ESLint:

```bash
# Format code
pnpm format

# Lint code
pnpm lint

# Fix lint issues
pnpm lint:fix
```

### File Organization

```typescript
// 1. Imports (external, then internal)
import { someExternalLib } from 'external-lib';
import { internalUtil } from '../utils';

// 2. Types/Interfaces
interface MyInterface {
  // ...
}

// 3. Constants
const DEFAULT_VALUE = 42;

// 4. Main exports
export class MyClass {
  // ...
}

// 5. Helper functions (private)
function helperFunction() {
  // ...
}
```

## Testing

### Test Structure

```
package/
├── src/
│   └── feature.ts
└── tests/
    ├── feature.test.ts      # Unit tests
    └── feature.integration.ts # Integration tests
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyClass } from '../src/feature';

describe('MyClass', () => {
  let instance: MyClass;

  beforeEach(() => {
    instance = new MyClass();
  });

  describe('methodName', () => {
    it('should do something', () => {
      const result = instance.methodName('input');
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      expect(() => instance.methodName(null)).toThrow();
    });
  });
});
```

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# Specific package
pnpm --filter @morpheus/core test
```

## Documentation

### Code Comments

```typescript
/**
 * Synthesizes an Akash SDL from the given configuration.
 *
 * @param config - The deployment configuration
 * @returns The generated SDL output
 * @throws {ValidationError} If configuration is invalid
 *
 * @example
 * ```typescript
 * const sdl = await synthesizer.synthesize({
 *   projectName: 'my-app',
 *   image: 'my-app:latest',
 *   resources: { cpu: 2, memory: '4Gi' },
 * });
 * ```
 */
export async function synthesize(config: SDLConfig): Promise<SDLOutput> {
  // ...
}
```

### README Updates

When adding features, update relevant documentation:
- `README.md` for user-facing changes
- `docs/` for detailed guides
- Code comments for API changes

## Adding Features

### New CLI Command

1. Create command file:
   ```typescript
   // apps/cli/src/commands/my-command.ts
   import { Command } from 'commander';

   export function registerMyCommand(program: Command): void {
     program
       .command('my-command')
       .description('Description of command')
       .option('-f, --flag <value>', 'Flag description')
       .action(async (options) => {
         // Implementation
       });
   }
   ```

2. Register in CLI:
   ```typescript
   // apps/cli/src/cli.ts
   import { registerMyCommand } from './commands/my-command';
   registerMyCommand(program);
   ```

3. Add tests:
   ```typescript
   // apps/cli/tests/my-command.test.ts
   ```

4. Update documentation:
   ```markdown
   // docs/CLI.md
   ```

### New Package

1. Create package structure:
   ```
   packages/my-package/
   ├── src/
   │   └── index.ts
   ├── tests/
   ├── package.json
   └── tsconfig.json
   ```

2. Configure package.json:
   ```json
   {
     "name": "@morpheus/my-package",
     "version": "0.1.0",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "scripts": {
       "build": "tsc",
       "test": "vitest run"
     }
   }
   ```

3. Add to workspace in root `pnpm-workspace.yaml`

### New Template

1. Create template:
   ```typescript
   // packages/templates/src/my-template/template.ts
   import { Template } from '../types';

   export const myTemplate: Template = {
     name: 'my-template',
     description: 'Template description',
     defaultResources: { /* ... */ },
     sidecars: { /* ... */ },
     generateSDL: async (config) => { /* ... */ },
   };
   ```

2. Register template:
   ```typescript
   // packages/templates/src/manager.ts
   import { myTemplate } from './my-template/template';
   this.templates.set('my-template', myTemplate);
   ```

3. Add tests and documentation

## Reporting Issues

### Bug Reports

Include:
- Morpheus version (`morpheus --version`)
- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative solutions considered

## Release Process

Releases are managed by maintainers:

1. Version bump in `package.json` files
2. Update `CHANGELOG.md`
3. Create release PR
4. Tag release after merge
5. Publish to npm

## Getting Help

- **Discord**: [Join our community](https://discord.gg/morpheus)
- **GitHub Discussions**: Ask questions
- **Issues**: Report bugs or request features

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
