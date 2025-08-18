# Contributing to Next.js Supabase Auth Template

Thank you for your interest in contributing to this project! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to avoid duplicates
2. **Use the issue template** if available
3. **Provide detailed information** including:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, etc.)
   - Screenshots or error messages

### Suggesting Features

We welcome feature suggestions! Please:

1. **Check existing feature requests** first
2. **Describe the use case** clearly
3. **Explain the expected behavior**
4. **Consider the scope** - keep it focused and relevant

### Code Contributions

#### Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/nextjs-supabase-auth.git
   ```
3. **Install dependencies**:
   ```bash
   cd nextjs-supabase-auth
   pnpm install
   ```
4. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Development Guidelines

##### Code Style

- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow the existing ESLint configuration
- **Prettier**: Code formatting is handled by Prettier
- **Naming**: Use descriptive, camelCase names for variables and functions

##### Component Guidelines

- **Functional components**: Use functional components with hooks
- **Props interface**: Define TypeScript interfaces for all props
- **Default exports**: Use default exports for components
- **File naming**: Use kebab-case for file names

Example component structure:
```tsx
interface ComponentNameProps {
  title: string
  isVisible?: boolean
}

export default function ComponentName({ title, isVisible = true }: ComponentNameProps) {
  // Component logic here
  
  return (
    <div>
      {/* JSX here */}
    </div>
  )
}
```

##### Styling Guidelines

- **Tailwind CSS**: Use Tailwind classes for styling
- **shadcn/ui**: Prefer shadcn/ui components when available
- **Responsive design**: Ensure mobile-first responsive design
- **Accessibility**: Follow WCAG guidelines

##### Authentication Guidelines

- **Supabase SSR**: Use the established SSR patterns
- **Error handling**: Implement proper error handling
- **Loading states**: Include loading states for async operations
- **Type safety**: Maintain type safety with Supabase types

#### Testing

While the template doesn't include tests yet, when contributing:

- **Write tests** for new functionality when possible
- **Test manually** across different browsers and devices
- **Verify auth flows** work correctly
- **Check responsive design** on various screen sizes

#### Commit Guidelines

Use conventional commits for clear history:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add password strength indicator
fix: resolve OAuth callback redirect issue
docs: update setup instructions
style: improve button hover states
```

#### Pull Request Process

1. **Update documentation** if needed
2. **Test your changes** thoroughly
3. **Update the README** if you've added features
4. **Create a pull request** with:
   - Clear title and description
   - Reference any related issues
   - Screenshots for UI changes
   - Testing instructions

##### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Tested locally
- [ ] Tested auth flows
- [ ] Tested responsive design
- [ ] Tested in multiple browsers

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #issue-number
```

## 🏗️ Project Structure

Understanding the project structure helps with contributions:

```
src/
├── app/                    # Next.js App Router
├── components/             # Reusable components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
└── middleware.ts          # Next.js middleware
```

## 🎯 Areas for Contribution

### High Priority

- **Testing implementation**: Add comprehensive test suite
- **Accessibility improvements**: Enhance WCAG compliance
- **Performance optimization**: Improve loading times
- **Error handling**: Better error messages and recovery

### Medium Priority

- **Additional auth providers**: Facebook, GitHub, etc.
- **User profile management**: Profile editing, avatar upload
- **Email templates**: Custom email designs
- **Dark mode toggle**: Implement theme switching

### Low Priority

- **Internationalization**: Multi-language support
- **Advanced dashboard**: More dashboard components
- **Documentation**: Video tutorials, examples
- **Deployment guides**: Platform-specific guides

## 🔧 Development Setup

### Environment Setup

1. **Node.js**: Version 18 or later
2. **Package manager**: pnpm (recommended)
3. **Supabase account**: For testing auth flows
4. **Code editor**: VS Code with recommended extensions

### Recommended VS Code Extensions

- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint

### Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run linting
pnpm lint

# Build for production
pnpm build
```

## 📋 Code Review Process

### What We Look For

- **Code quality**: Clean, readable, maintainable code
- **Type safety**: Proper TypeScript usage
- **Performance**: Efficient implementations
- **Accessibility**: WCAG compliance
- **Security**: Secure authentication practices
- **Documentation**: Clear comments and documentation

### Review Timeline

- **Initial response**: Within 48 hours
- **Full review**: Within 1 week
- **Follow-up**: As needed for revisions

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Notes

Each release includes:
- **New features** added
- **Bug fixes** resolved
- **Breaking changes** (if any)
- **Migration guide** (if needed)

## 📞 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time chat (if available)

### Response Times

- **Issues**: 24-48 hours
- **Pull requests**: 48-72 hours
- **Discussions**: Best effort

## 🙏 Recognition

Contributors will be:
- **Listed in README**: All contributors acknowledged
- **Tagged in releases**: Major contributors highlighted
- **Invited to maintain**: Active contributors may be invited as maintainers

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to make this template better for everyone! 🎉

