# Next.js Supabase Auth Template

A comprehensive, production-ready authentication template built with Next.js 15, Supabase SSR, shadcn/ui, and Tailwind CSS. This template provides a complete authentication system with a beautiful, responsive dashboard that you can use as a starting point for your projects.

## ✨ Features

### Authentication
- 🔐 **Complete Auth Flow**: Sign up, sign in, password reset, email confirmation
- 🌐 **OAuth Integration**: Google OAuth (easily extensible to other providers)
- 🔒 **Protected Routes**: Automatic redirection and route protection
- 🍪 **SSR Support**: Server-side rendering with Supabase SSR
- 🔄 **Session Management**: Automatic session refresh and state management

### UI/UX
- 🎨 **Modern Design**: Beautiful, responsive UI with shadcn/ui components
- 🌙 **Dark Mode Ready**: Built-in dark mode support
- 📱 **Mobile Responsive**: Optimized for all device sizes
- ⚡ **Smooth Animations**: Micro-interactions and transitions
- 🎯 **Accessibility**: WCAG compliant components

### Developer Experience
- 🚀 **TypeScript**: Full type safety throughout the application
- 📦 **Component Library**: Pre-built, reusable components
- 🔧 **Easy Configuration**: Simple environment setup
- 📚 **Comprehensive Docs**: Detailed documentation and examples
- 🧪 **Testing Ready**: Structure prepared for testing implementation

### Internationalization
- 🌎 **Locale-aware Routing**: Automatic locale prefixes with Next.js middleware
- 🗂️ **Scoped Messages**: Organized JSON message catalogs per locale
- ♻️ **Reusable Utilities**: Helpers for locale-aware navigation and formatting
- ✅ **Consistency Checks**: Automated script to ensure message files stay in sync

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd nextjs-supabase-auth
pnpm install
```

### 2. Environment Setup

Copy the environment template:

```bash
cp .env.local.example .env.local
```

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to find your project URL and anon key
3. Enable authentication providers in Authentication > Providers
4. Configure OAuth providers (optional but recommended for Google)

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Legacy auth routes (redirect helpers)
│   ├── auth/                     # Redirects to default locale auth page
│   ├── [locale]/                 # Locale-scoped routes
│   │   ├── (auth)/               # Authentication group per locale
│   │   │   ├── callback/         # OAuth callback handler
│   │   │   └── reset-password/   # Password reset page
│   │   ├── (main)/               # Protected application shell
│   │   │   └── dashboard/        # Dashboard entry and modules
│   │   ├── auth/                 # Locale-aware auth entry
│   │   ├── layout.tsx            # Locale provider layout
│   │   └── page.tsx              # Redirects to default section per locale
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout with html lang
│   └── page.tsx                  # Redirects to default locale
├── i18n/                         # Internationalization utilities
│   ├── config.ts                 # Locale configuration
│   ├── request.ts                # next-intl request config
│   ├── routing.ts                # Locale-aware navigation helpers
│   └── messages/                 # JSON message catalogs
│       ├── en.json
│       └── es.json
├── components/                   # Reusable components
│   ├── auth/                     # Authentication components
│   │   ├── auth-form.tsx         # Main auth form
│   │   ├── auth-provider.tsx     # Auth context provider
│   │   └── protected-route.tsx   # Route protection wrapper
│   ├── dashboard/                # Dashboard components
│   └── ui/                       # shadcn/ui primitives
├── hooks/                        # Custom React hooks
│   └── use-auth.ts               # Authentication hook
├── lib/                          # Utility libraries
│   ├── auth/                     # Auth helpers
│   │   └── auth-redirect.ts      # Auth redirection logic
│   └── supabase/                 # Supabase configuration
│       ├── client.ts             # Client-side config
│       ├── middleware.ts         # Middleware config
│       └── server.ts             # Server-side config
└── middleware.ts                 # Next.js middleware (locale + session)
```

## 🔧 Configuration

### Supabase Configuration

The template uses Supabase SSR for optimal performance and SEO. Configuration files are located in `src/lib/supabase/`:

- **`client.ts`**: Client-side Supabase instance
- **`server.ts`**: Server-side Supabase instance  
- **`middleware.ts`**: Middleware configuration for auth state management

### Authentication Flow

1. **Unauthenticated users** → Redirected to `/{locale}/auth`
2. **Authentication success** → Redirected to `/{locale}/dashboard`
3. **Protected routes** → Automatic authentication check via middleware

3. **Protected routes** → Automatic authentication check via middleware

### Customizing the Auth Form

The main authentication form (`src/components/auth/auth-form.tsx`) supports:

- Sign in / Sign up toggle
- Password reset functionality
- OAuth providers (Google configured)
- Form validation and error handling
- Loading states and animations

## 🎨 Styling and Theming

### Tailwind CSS Configuration

The template uses Tailwind CSS v4 with custom configuration for:

- Custom color palette
- Typography scale
- Spacing system
- Responsive breakpoints

### shadcn/ui Components

Pre-installed components include:
- Button, Input, Label
- Card, Alert, Badge
- Avatar, Dropdown Menu
- Form components

Add more components as needed:

```bash
pnpm dlx shadcn@latest add [component-name]
```

### Dark Mode

Dark mode is configured and ready to use. Toggle implementation can be added using the `next-themes` package.

## 🔐 Security Features

### Route Protection

- **Middleware-based protection**: Automatic redirection for unauthenticated users
- **Component-level protection**: `ProtectedRoute` wrapper for sensitive components
- **Server-side validation**: Auth state verified on server

### Session Management

- **Automatic refresh**: Sessions refreshed automatically
- **Secure cookies**: HTTP-only cookies for session storage
- **CSRF protection**: Built-in CSRF protection via Supabase

## 📱 Responsive Design

The template is fully responsive with:

- **Mobile-first approach**: Optimized for mobile devices
- **Flexible layouts**: Adapts to different screen sizes
- **Touch-friendly**: Optimized for touch interactions
- **Performance**: Optimized images and lazy loading

## 🧪 Testing (Ready for Implementation)

The project structure is prepared for testing with:

- **Component testing**: Individual component tests
- **Integration testing**: Auth flow testing
- **E2E testing**: Full user journey testing

Recommended testing stack:
- Jest + React Testing Library
- Playwright for E2E testing
- MSW for API mocking

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The template works with any platform supporting Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔄 Customization Guide

### Adding New Auth Providers

1. Enable provider in Supabase dashboard
2. Add provider configuration to auth form
3. Update OAuth callback handling

### Extending the Dashboard

1. Create new components in `src/components/dashboard/`
2. Add new routes in `src/app/dashboard/`
3. Update navigation and layout as needed

### Database Integration

1. Create tables in Supabase
2. Generate TypeScript types
3. Create data fetching hooks
4. Implement CRUD operations

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [shadcn](https://twitter.com/shadcn) for the amazing UI components
- [Supabase](https://supabase.com) team for the excellent backend platform
- [Vercel](https://vercel.com) team for Next.js and deployment platform

---

**Happy coding! 🚀**

If you find this template helpful, please consider giving it a star ⭐

