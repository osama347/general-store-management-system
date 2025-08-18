# Setup Guide

This guide will walk you through setting up the Next.js Supabase Auth Template step by step.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18 or later** installed on your machine
- **pnpm** (recommended), npm, or yarn package manager
- A **Supabase account** (free tier available)
- **Git** for version control

## Step 1: Project Setup

### Clone the Repository

```bash
git clone <your-repository-url>
cd nextjs-supabase-auth
```

### Install Dependencies

Using pnpm (recommended):
```bash
pnpm install
```

Using npm:
```bash
npm install
```

Using yarn:
```bash
yarn install
```

## Step 2: Supabase Project Setup

### Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub (recommended) or create an account
4. Click "New Project"
5. Choose your organization
6. Fill in project details:
   - **Name**: Choose a descriptive name
   - **Database Password**: Use a strong password (save this!)
   - **Region**: Choose the closest region to your users
7. Click "Create new project"

### Wait for Project Initialization

The project creation process takes 2-3 minutes. You'll see a progress indicator.

### Get Your Project Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **Anon public key** (under "Project API keys")

## Step 3: Environment Configuration

### Create Environment File

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

### Update Environment Variables

Open `.env.local` and replace the placeholder values:

```env
# Replace with your actual Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Replace with your actual Supabase anon key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Service role key for admin operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 4: Supabase Authentication Setup

### Enable Email Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. **Email** should be enabled by default
3. Configure email settings:
   - **Enable email confirmations**: Recommended for production
   - **Enable email change confirmations**: Recommended for production

### Configure Site URL (Important!)

1. Go to **Authentication** → **URL Configuration**
2. Add your site URLs:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`

### Set Up OAuth Providers (Optional but Recommended)

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Configure OAuth consent screen if prompted
6. Set application type to "Web application"
7. Add authorized redirect URIs:
   - `https://your-project-id.supabase.co/auth/v1/callback`
8. Copy the **Client ID** and **Client Secret**

In Supabase:
1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Enter your Google **Client ID** and **Client Secret**
4. Save the configuration

## Step 5: Database Setup (Optional)

The template works with just authentication, but you can extend it with custom tables:

### Create Custom Tables

1. Go to **Database** → **Tables**
2. Click **Create a new table**
3. Example user profile table:

```sql
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Set up Realtime
alter publication supabase_realtime add table profiles;
```

### Create Functions (Optional)

Example function to handle new user registration:

```sql
-- Function to handle new user registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user registration
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## Step 6: Run the Application

### Start Development Server

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Test the Authentication Flow

1. **Visit the app**: Navigate to `http://localhost:3000`
2. **Redirect to auth**: You should be redirected to `/auth`
3. **Create account**: Click "Sign up" and create a test account
4. **Check email**: Look for confirmation email (check spam folder)
5. **Confirm email**: Click the confirmation link
6. **Sign in**: Return to the app and sign in
7. **Access dashboard**: You should be redirected to `/dashboard`

## Step 7: Customization

### Update Branding

1. **App name**: Update in `src/app/layout.tsx`
2. **Favicon**: Replace files in `public/`
3. **Colors**: Modify in `src/app/globals.css`

### Add Custom Components

1. Create new components in `src/components/`
2. Add new pages in `src/app/`
3. Update navigation as needed

## Troubleshooting

### Common Issues

#### "Invalid API key" Error
- Double-check your environment variables
- Ensure no extra spaces in the keys
- Restart the development server after changing env vars

#### OAuth Redirect Issues
- Verify redirect URLs in both Supabase and OAuth provider
- Check that URLs match exactly (including protocol)
- Ensure OAuth provider is enabled in Supabase

#### Email Confirmation Not Working
- Check spam folder
- Verify SMTP settings in Supabase
- Ensure site URL is configured correctly

#### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Clear node_modules: `rm -rf node_modules && pnpm install`
- Check for TypeScript errors: `pnpm build`

### Getting Help

1. **Check the logs**: Browser console and terminal output
2. **Supabase logs**: Check the Logs section in Supabase dashboard
3. **Documentation**: Refer to Supabase and Next.js documentation
4. **Community**: Join the Supabase Discord or GitHub discussions

## Production Deployment

### Environment Variables for Production

Update your production environment with:
- Production Supabase URL and keys
- Production site URL in Supabase settings
- OAuth redirect URLs for production domain

### Recommended Platforms

- **Vercel**: Seamless Next.js deployment
- **Netlify**: Good alternative with easy setup
- **Railway**: Simple deployment with database support

### Security Checklist

- [ ] Enable RLS on all custom tables
- [ ] Use service role key only on server-side
- [ ] Configure proper CORS settings
- [ ] Enable email confirmations
- [ ] Set up proper redirect URLs
- [ ] Use HTTPS in production
- [ ] Implement rate limiting if needed

---

You're now ready to build amazing applications with this template! 🚀

