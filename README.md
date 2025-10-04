# 🏪 General Store Management System

A comprehensive, production-ready store and warehouse management system built with Next.js 15, Supabase, shadcn/ui, and Tailwind CSS. This system provides complete inventory management, sales tracking, expense management, and multi-location support for retail stores and warehouses.

## ✨ Features

### 🏢 Multi-Location Management
- **Dual Location Types**: Separate management for stores and warehouses
- **Location Switching**: Seamless switching between different locations
- **Location-Specific Data**: Filtered dashboards and reports per location
- **Inventory Transfers**: Move products between locations with full tracking

### 📊 Dashboard & Analytics
- **Real-Time KPIs**: Revenue, expenses, inventory value, and customer metrics
- **Interactive Charts**: Sales trends, expense tracking, and revenue analytics using Recharts
- **Low Stock Alerts**: Automatic notifications for products running low
- **Top Products**: Track best-selling items and performance metrics
- **Activity Feed**: Real-time updates on sales, transfers, and expenses

### 📦 Inventory Management
- **Multi-Location Inventory**: Track stock levels across stores and warehouses
- **Product Categories**: Organize products with custom categories and attributes
- **Dynamic Attributes**: Flexible product attributes (text, number, decimal, date)
- **Stock Transfers**: Transfer inventory between locations with approval workflow
- **SKU Management**: Unique product identification and tracking
- **Reserved Quantity**: Handle pending orders and reservations

### 💰 Sales Management
- **POS-Style Interface**: Quick and easy sales processing
- **Customer Management**: Track customer information and purchase history
- **Sale Items**: Multi-item sales with quantity and pricing
- **Sale Status**: Track pending, completed, and cancelled sales
- **Receipt Generation**: PDF receipt generation for customers

### 💳 Expense Tracking
- **Expense Categories**: Organize expenses by category
- **Approval Workflow**: Pending, approved, and rejected expense statuses
- **Receipt Numbers**: Track vendor receipts and documentation
- **Vendor Management**: Record vendor information for expenses
- **Location-Based**: Track expenses by store or warehouse

### 📈 Reports & Analytics
- **Financial Reports**: Revenue, expenses, and profit analysis
- **Sales Reports**: Detailed sales analytics with filtering
- **Inventory Reports**: Stock levels, valuation, and movement
- **Product Reports**: Product performance and trends
- **Customer Reports**: Customer analytics and insights
- **PDF Export**: Generate professional PDF reports
- **Date Range Filtering**: Custom date ranges for all reports

### 👥 User Management
- **Role-Based Access**: Admin, warehouse manager, and store manager roles
- **Staff Management**: Manage employees and their assignments
- **Location Assignment**: Assign staff to specific locations
- **Profile Management**: User profiles with avatar upload
- **Activity Tracking**: Track user actions and changes

### � Authentication & Security
- **Secure Authentication**: Email/password authentication via Supabase
- **Row-Level Security**: Database-level security policies
- **Protected Routes**: Automatic route protection and redirection
- **Session Management**: Secure session handling with cookies
- **Password Reset**: Self-service password reset functionality

### 🌍 Internationalization
- **Multi-Language Support**: English, Farsi (Persian), and Pashto
- **RTL Support**: Right-to-left language support
- **Locale-aware Routing**: Automatic locale prefixes in URLs
- **Dynamic Translations**: JSON-based translation system
- **Number & Date Formatting**: Locale-specific formatting

### 🎨 UI/UX
- **Modern Design**: Beautiful, gradient-based UI with shadcn/ui components
- **Mobile Responsive**: Optimized for all device sizes
- **Sidebar Navigation**: Collapsible sidebar with icons and labels
- **Toast Notifications**: User-friendly feedback with Sonner
- **Loading States**: Skeleton loaders and loading indicators
- **Data Tables**: Sortable, filterable tables with pagination

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account

### 1. Clone and Install

```bash
git clone https://github.com/osama347/general-store-management-system.git
cd general-store-management-system
pnpm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to find your project URL and anon key
3. Run the database schema from `db.txt` in your Supabase SQL Editor
4. Run the RLS policies from `supabase-rls-policies.sql`
5. Create the `avatars` bucket in Storage (make it public)

### 4. Initial Data Setup

Create initial locations in your database:

```sql
-- Create a warehouse
INSERT INTO locations (name, address, location_type)
VALUES ('Main Warehouse', '123 Warehouse St', 'warehouse');

-- Create a store
INSERT INTO locations (name, address, location_type)
VALUES ('Store #1', '456 Store Ave', 'store');
```

### 5. Create Admin User

1. Sign up through the application at `/auth`
2. Update the user role in Supabase:

```sql
UPDATE profiles 
SET role = 'admin', location_id = 1
WHERE email = 'your-admin-email@example.com';
```

### 6. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

Default routes:
- `/` - Redirects to default locale
- `/en/auth` - Login page (English)
- `/en/dashboard` - Main dashboard (after login)
- `/en/inventory` - Inventory management
- `/en/sales` - Sales management
- `/en/expenses` - Expense tracking
- `/en/reports` - Reports and analytics

## 📁 Project Structure

```
src/
├── app/                              # Next.js App Router
│   ├── [locale]/                     # Locale-scoped routes
│   │   ├── (auth)/                   # Authentication pages
│   │   │   ├── callback/             # OAuth callback handler
│   │   │   └── reset-password/       # Password reset page
│   │   ├── (main)/                   # Protected application routes
│   │   │   ├── dashboard/            # Main dashboard with KPIs and charts
│   │   │   ├── inventory/            # Inventory management
│   │   │   ├── sales/                # Sales and POS
│   │   │   ├── expenses/             # Expense tracking
│   │   │   ├── customers/            # Customer management
│   │   │   ├── products/             # Product catalog
│   │   │   ├── locations/            # Location management
│   │   │   ├── staff/                # Staff and user management
│   │   │   ├── reports/              # Reports and analytics
│   │   │   └── settings/             # User settings and profile
│   │   ├── auth/                     # Locale-aware auth entry
│   │   └── layout.tsx                # Locale provider layout
│   ├── globals.css                   # Global styles and Tailwind
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Root redirect
├── components/                       # Reusable components
│   ├── auth/                         # Authentication components
│   │   └── auth-form.tsx             # Login/signup form
│   ├── dashboard/                    # Dashboard widgets
│   │   ├── kpi-cards.tsx             # KPI metrics cards
│   │   ├── charts.tsx                # Sales and expense charts
│   │   ├── revenue-expense-chart.tsx # Combined revenue/expense chart
│   │   ├── recent-transactions.tsx   # Recent activity feed
│   │   ├── low-stock-alerts.tsx      # Low inventory alerts
│   │   ├── top-products.tsx          # Top selling products
│   │   └── skeletons.tsx             # Loading skeletons
│   ├── reports/                      # Report components
│   │   ├── SalesReport.tsx           # Sales analytics
│   │   ├── InventoryReport.tsx       # Inventory reports
│   │   ├── FinancialReport.tsx       # Financial analysis
│   │   ├── ProductReport.tsx         # Product performance
│   │   └── CustomerReport.tsx        # Customer insights
│   ├── ui/                           # shadcn/ui components
│   ├── app-sidebar.tsx               # Main navigation sidebar
│   ├── nav-main.tsx                  # Main navigation items
│   ├── nav-user.tsx                  # User profile dropdown
│   ├── language-switcher.tsx         # Language selector
│   └── location-switcher.tsx         # Location selector
├── contexts/                         # React contexts
│   └── LocationContext.tsx           # Location state management
├── hooks/                            # Custom React hooks
│   ├── use-auth.ts                   # Authentication hook
│   └── use-mobile.ts                 # Mobile detection hook
├── i18n/                             # Internationalization
│   ├── config.ts                     # Locale configuration
│   ├── request.ts                    # next-intl request config
│   ├── routing.ts                    # Locale-aware routing
│   └── messages/                     # Translation files
│       ├── en.json                   # English translations
│       ├── fa.json                   # Farsi (Persian) translations
│       └── ps.json                   # Pashto translations
├── lib/                              # Utility libraries
│   ├── supabase/                     # Supabase configuration
│   │   ├── client.ts                 # Client-side instance
│   │   ├── server.ts                 # Server-side instance
│   │   └── middleware.ts             # Auth middleware
│   ├── auth/                         # Auth utilities
│   ├── services/                     # API services
│   ├── pdf-generator.ts              # PDF report generation
│   ├── receipt-generator.ts          # Receipt generation
│   ├── data-validation.ts            # Data validation helpers
│   └── utils.ts                      # General utilities
├── types/                            # TypeScript type definitions
│   ├── index.ts                      # Common types
│   ├── product.d.ts                  # Product types
│   └── reports.ts                    # Report types
└── middleware.ts                     # Next.js middleware (auth + i18n)
```

## 🔧 Configuration

### Database Schema

The system uses the following main tables:

- **`profiles`**: User accounts with roles and location assignments
- **`locations`**: Stores and warehouses
- **`products`**: Product catalog with SKU and pricing
- **`categories`**: Product categories
- **`attributes`**: Dynamic product attributes
- **`inventory`**: Stock levels per location per product
- **`inventory_transfers`**: Transfer history between locations
- **`sales`**: Sales transactions
- **`sale_items`**: Individual items in each sale
- **`expenses`**: Expense records with approval workflow
- **`expense_categories`**: Expense categorization
- **`customers`**: Customer information
- **`loans`**: Customer loan tracking

### User Roles

The system supports three user roles:

1. **`admin`**: Full system access, can manage all locations
2. **`warehouse_manager`**: Warehouse operations, inventory transfers
3. **`store_manager`**: Store operations, sales, customers

### Authentication Flow

1. **Unauthenticated users** → Redirected to `/{locale}/auth`
2. **Authentication success** → Redirected to `/{locale}/dashboard`
3. **Protected routes** → Automatic authentication check via middleware
4. **Role-based access** → Different features based on user role

### Location Context

The system uses React Context for location management:

- **Admin users**: Can switch between all locations
- **Non-admin users**: Locked to their assigned location
- **Location-specific data**: All queries filtered by current location
- **Dashboard types**: Different KPIs for warehouse vs store

### Internationalization

Supported languages:
- **English (en)**: Default language
- **Farsi/Persian (fa)**: Right-to-left support
- **Pashto (ps)**: Right-to-left support

To add a new language:
1. Add locale to `src/i18n/config.ts`
2. Create `src/i18n/messages/{locale}.json`
3. Run `pnpm check:i18n` to validate

## 🎨 Styling and Theming

### Design System

The system uses a modern, gradient-based design with:

- **Primary Colors**: Teal and Emerald gradients
- **Accent Colors**: Green for success, Red for errors
- **Typography**: Clean, readable font hierarchy
- **Spacing**: Consistent spacing scale
- **Border Radius**: Rounded corners throughout

### Tailwind CSS Configuration

Custom Tailwind configuration includes:

- Gradient backgrounds for headers and cards
- Custom color palette (teal, emerald, green)
- Ring effects for focus states
- Hover transitions and animations
- Responsive breakpoints

### shadcn/ui Components

Pre-installed and customized components:

- **Forms**: Input, Label, Select, Checkbox, Textarea, Date Picker
- **Feedback**: Button, Badge, Alert, Toast (Sonner), Progress
- **Layout**: Card, Separator, Tabs, Sidebar, Sheet
- **Data Display**: Table, Avatar, Tooltip, Skeleton
- **Overlays**: Dialog, Dropdown Menu, Popover, Command

Add more components:

```bash
pnpm dlx shadcn@latest add [component-name]
```

### Theme Customization

To customize the theme, edit:
- `src/app/globals.css` - Color variables and base styles
- `tailwind.config.ts` - Tailwind configuration
- `components.json` - shadcn/ui configuration

## 🔐 Security Features

### Row-Level Security (RLS)

All database tables use Supabase RLS policies:

- Users can only access their own data
- Location-based data filtering
- Role-based permissions (admin, manager, staff)
- Secure file uploads to avatars bucket

### Route Protection

- **Middleware-based protection**: Automatic redirection for unauthenticated users
- **Role-based access**: Different features per user role
- **Server-side validation**: Auth state verified on server
- **Protected API routes**: Secure API endpoints

### Session Management

- **Automatic refresh**: Sessions refreshed automatically via middleware
- **Secure cookies**: HTTP-only cookies for session storage
- **CSRF protection**: Built-in CSRF protection via Supabase
- **Token validation**: JWT token validation on every request

### Data Security

- **Input validation**: Zod schemas for all forms
- **SQL injection prevention**: Parameterized queries via Supabase
- **XSS protection**: React's built-in XSS prevention
- **File upload validation**: Type and size validation for uploads

## 📱 Responsive Design

The system is fully responsive with:

- **Mobile-first approach**: Optimized for mobile devices
- **Collapsible sidebar**: Space-efficient navigation on mobile
- **Responsive tables**: Horizontal scroll for data tables
- **Touch-friendly**: Large touch targets and swipe gestures
- **Adaptive layouts**: Grid layouts that adjust to screen size
- **Mobile dashboard**: Stacked cards on mobile, grid on desktop

## 📊 Key Features Breakdown

### Dashboard

- Real-time KPIs (revenue, expenses, customers, inventory value)
- Interactive charts (sales trends, expense breakdown)
- Low stock alerts with product details
- Top performing products by sales
- Recent activity feed
- Location-specific filtering
- Month-to-date metrics

### Inventory Management

- Multi-location stock tracking
- Product search and filtering
- Stock level indicators
- Transfer between locations
- Category organization
- SKU-based identification
- Reserved quantity tracking

### Sales Management

- Quick sale entry
- Customer selection
- Multi-item sales
- Real-time total calculation
- Receipt generation
- Sale history with filtering
- Status tracking (Pending, Completed, Cancelled)

### Expense Tracking

- Category-based organization
- Approval workflow
- Vendor information
- Receipt number tracking
- Location assignment
- Status management
- Date-based filtering

### Reports & Analytics

- Financial reports (revenue, expenses, profit)
- Sales analytics (by date, product, customer)
- Inventory reports (stock levels, valuation)
- Product performance analysis
- Customer insights
- PDF export functionality
- Custom date ranges

## 🧪 Testing

Recommended testing approach:

- **Unit tests**: Test utility functions and helpers
- **Component tests**: Test React components with React Testing Library
- **Integration tests**: Test API routes and database queries
- **E2E tests**: Test complete user workflows with Playwright

Testing stack suggestions:
- Jest + React Testing Library
- Playwright for E2E testing
- MSW for API mocking
- Supabase local development for database testing

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Database Deployment

1. Use your production Supabase project
2. Run all SQL migrations from `db.txt`
3. Apply RLS policies from `supabase-rls-policies.sql`
4. Create storage buckets (avatars)
5. Set up admin user

### Environment Variables

Production environment variables needed:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Other Platforms

The system works with any platform supporting Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify
- Cloudflare Pages

## 🔄 Customization Guide

### Adding New Features

1. **New Page**: Create route in `src/app/[locale]/(main)/`
2. **New Component**: Add to `src/components/`
3. **New API Logic**: Add service to `src/lib/services/`
4. **New Types**: Define in `src/types/`

### Adding New Locations

```sql
INSERT INTO locations (name, address, location_type)
VALUES ('New Location', 'Address', 'store'); -- or 'warehouse'
```

### Adding Product Categories

```sql
INSERT INTO categories (name, description)
VALUES ('Electronics', 'Electronic products and accessories');
```

### Creating Custom Reports

1. Add new report component in `src/components/reports/`
2. Create data fetching function in `ReportsService.ts`
3. Add PDF generation logic in `pdf-generator.ts`
4. Add translations to message files

### Extending User Roles

1. Add role to database schema
2. Update RLS policies
3. Add role check in middleware
4. Update UI based on new role

### Adding Custom Attributes

```sql
-- Add attribute to category
INSERT INTO attributes (category_id, attribute_name, data_type)
VALUES (1, 'warranty_period', 'number');

-- Set attribute value for product
INSERT INTO product_attributes (product_id, attribute_id, value_number)
VALUES (1, 1, 12); -- 12 months warranty
```

## 📚 Technology Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **React 19**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS
- **shadcn/ui**: Component library
- **Lucide React**: Icon library
- **Recharts**: Data visualization
- **React Query**: Data fetching and caching
- **next-intl**: Internationalization

### Backend & Database
- **Supabase**: Backend as a Service
  - PostgreSQL database
  - Row-Level Security
  - Real-time subscriptions
  - Storage for file uploads
  - Authentication

### Additional Libraries
- **React Hook Form**: Form management
- **Zod**: Schema validation
- **date-fns**: Date manipulation
- **Sonner**: Toast notifications
- **jsPDF**: PDF generation
- **class-variance-authority**: CSS variants
- **tailwind-merge**: Tailwind class merging

## 🐛 Troubleshooting

### Common Issues

**Issue: RLS Policy Errors**
- Solution: Run `supabase-rls-policies.sql` to set up proper policies
- Verify policies in Supabase Dashboard → Authentication → Policies

**Issue: Avatar Upload Fails**
- Solution: Create `avatars` bucket in Supabase Storage
- Make sure bucket is set to public
- Check storage policies are applied

**Issue: Dashboard Not Loading After Login**
- Solution: Clear browser cache and cookies
- Verify Supabase URL and anon key in `.env.local`
- Check browser console for errors

**Issue: Translations Not Working**
- Solution: Run `pnpm check:i18n` to validate message files
- Ensure all locales have matching keys
- Check locale configuration in `src/i18n/config.ts`

**Issue: Location Context Not Loading**
- Solution: Ensure user has `location_id` set in profiles table
- Check that locations exist in database
- Verify RLS policies allow user to read locations

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [next-intl Documentation](https://next-intl-docs.vercel.app)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Osama347** - [GitHub Profile](https://github.com/osama347)

## 🙏 Acknowledgments

- [shadcn](https://twitter.com/shadcn) for the amazing UI components
- [Supabase](https://supabase.com) team for the excellent backend platform
- [Vercel](https://vercel.com) team for Next.js and deployment platform
- All contributors who help improve this project

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the documentation

---

**Built with ❤️ for store and warehouse management**

If you find this project helpful, please consider giving it a star ⭐

