# Contributing to Warp CLI

Thank you for your interest in contributing to Warp CLI! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/aicli.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit with clear messages
7. Push to your fork
8. Open a Pull Request

## Development Setup

```bash
# Navigate to warp-cli
cd warp-cli

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

## Coding Standards

- Follow the existing code style
- Use TypeScript for all new code
- Add JSDoc comments for public APIs
- Keep functions focused and small
- Use meaningful variable names
- Add error handling for all external operations

## Commit Messages

Use clear, descriptive commit messages following this format:

```
<type>: <subject>

<body>

<footer>
```

Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:
```
feat: Add rate limiting for API providers

Implement rate limiter with configurable limits per provider
to prevent hitting API quotas. Includes exponential backoff
for retries.

Resolves #42
```

## Pull Request Process

1. **Update Documentation**: If you change functionality, update relevant docs
2. **Add Tests**: For new features, add appropriate tests (when test infrastructure is available)
3. **Run Linter**: Ensure `npm run lint` passes
4. **Build Successfully**: Ensure `npm run build` completes without errors
5. **Update CHANGELOG**: Add your changes to the unreleased section
6. **Describe Changes**: Write a clear PR description explaining what and why

## Testing

When the test suite is available:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Security

- **Never commit secrets**: API keys, tokens, passwords
- **Validate all input**: Use the security utilities in `src/utils/security.ts`
- **Sanitize errors**: Use `sanitizeErrorMessage()` for all error output
- **Follow least privilege**: Commands should have minimal necessary permissions

## Code Review

All submissions require review. We'll review your PR and may:
- Request changes
- Ask questions
- Provide feedback
- Merge your contribution

Please be patient and responsive to feedback.

## Reporting Bugs

Use the GitHub issue tracker. Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Relevant logs or error messages

## Suggesting Enhancements

We love new ideas! Open an issue with:
- Clear description of the enhancement
- Use cases and benefits
- Potential implementation approach
- Any concerns or drawbacks

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy toward others

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information
- Other unprofessional conduct

## Questions?

- Open an issue with the `question` label
- Check existing documentation in `/docs`
- Review closed issues for similar questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Warp CLI! 🎉
