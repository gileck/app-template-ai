# App Template AI

A modern, production-ready Next.js template with AI capabilities, MongoDB, React Query, Zustand state management, and shadcn/ui components.

## Features

- ⚡️ **Next.js 15** with Turbopack
- 🎨 **shadcn/ui** - Beautiful, accessible UI components
- 🗄️ **MongoDB** - NoSQL database with connection pooling
- 🔐 **Authentication** - JWT-based auth with bcrypt
- 🌐 **Offline Support** - PWA with offline-first architecture
- 📡 **React Query** - Powerful data fetching and caching
- 🏪 **Zustand** - Lightweight state management
- 🤖 **AI Integration** - OpenAI, Anthropic, Google AI support
- 📱 **Responsive** - Mobile-first design
- 🌙 **Dark Mode** - Built-in theme support
- 📦 **TypeScript** - Full type safety
- 🧪 **Linting** - ESLint with custom rules

## Quick Start

### 1. Clone or Use as Template

**Option A: Create, clone, and initialize automatically**
```bash
yarn create-project my-app
```

This requires the GitHub CLI (`gh`) to be installed and authenticated. It creates a new repository from this template in your GitHub account, clones it into `~/Projects`, installs dependencies, and runs `yarn init-project`. If you omit the project name, it prompts for one.

**Option B: Use as GitHub Template**
1. Click "Use this template" on GitHub
2. Create your new repository
3. Clone your new repository

**Option C: Clone Directly**
```bash
git clone https://github.com/yourusername/app-template-ai.git my-app
cd my-app
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/myapp

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-key-here

# Admin (optional)
# Matches authenticated user.id (Mongo _id string)
ADMIN_USER_ID=your-admin-user-id-here

# AI APIs (optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
```

### 4. Run Development Server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

## Template Sync System

This template includes a powerful sync system that allows you to merge updates from the template into your project.

### For New Projects

When starting a new project from this template:

```bash
# Initialize template tracking
yarn init-template https://github.com/yourusername/app-template-ai.git
```

### Sync Updates

```bash
# Preview changes
yarn sync-template --dry-run

# Apply updates (interactive)
yarn sync-template
```

The sync system will:
1. **Analyze changes** and show you what's different
2. **Ask you to choose**:
   - Apply only safe changes (no conflicts)
   - Apply all changes (may need manual merge)
   - Cancel
3. **Auto-merge** or **flag conflicts** based on your choice
4. **Preserve** your project-specific code

**📚 Full Documentation:** [docs/template-sync/template-sync.md](docs/template-sync/template-sync.md)

## Project Structure

```
├── src/
│   ├── client/              # Client-side code
│   │   ├── components/      # Shared UI components (shadcn/ui)
│   │   ├── features/        # Feature modules with stores
│   │   ├── routes/          # Next.js pages
│   │   ├── stores/          # Zustand store factory
│   │   └── config/          # Client configuration
│   ├── server/              # Server-side code
│   │   ├── db/              # Database utilities
│   │   └── middleware/      # Express middleware
│   ├── apis/                # API definitions (client + server)
│   └── shared/              # Shared types and utilities
├── scripts/                 # Build and utility scripts
├── docs/                    # Documentation
└── .ai/commands/        # Slash Commands
```

## Key Documentation

- 📖 [Template Sync Guide](docs/template-sync/template-sync.md) - Keep your project up-to-date with template changes
- 🏪 [State Management](docs/state-management.md) - React Query + Zustand patterns
- 🏗️ [Zustand Stores](docs/zustand-stores.md) - Store factory usage
- 🎨 [shadcn/ui Components](docs/shadcn-component-library.md) - UI component library
- 🔌 [API Communication](docs/template/project-guidelines/client-server-communications.md) - Client-server patterns
- 📁 [Feature Structure](docs/template/project-guidelines/feature-based-structure.md) - Code organization
- 🗄️ [MongoDB Usage](docs/template/project-guidelines/mongodb-usage.md) - Database patterns

## Available Scripts

```bash
yarn dev              # Start development server
yarn build            # Build for production
yarn start            # Start production server
yarn ts               # Type check
yarn lint             # Lint code
yarn checks           # Run both checks, show ALL errors (alias to checks:ci)
yarn checks:ci        # Run both checks, show ALL errors (CI/CD)
yarn checks:dev       # Same as checks:ci
yarn watch-checks     # Watch mode for checks

# Template sync
yarn create-project [name] # Create a GitHub repo from this template, clone, and initialize
yarn init-template    # Initialize template tracking
yarn sync-template    # Sync with template updates
```

### Check Scripts Explained

**`yarn checks` or `yarn checks:ci`**
- Runs BOTH TypeScript and ESLint checks
- Shows output from BOTH (even if first fails)
- Fails if EITHER check fails
- **Why:** See all errors at once instead of fixing them one at a time
- Use before: commits, PRs, deployments, in CI/CD

**Example Output:**
```bash
$ yarn checks
🔍 Running TypeScript check...
Error: src/file.ts(10,5): error TS2339: Property 'foo' does not exist

🔍 Running ESLint check...
/src/other.ts
  15:1  error  'bar' is not defined  no-undef

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Checks failed:
   - TypeScript check failed (exit code: 2)
   - ESLint check failed (exit code: 1)
```

**Before this change:**
With `yarn ts && yarn lint`, TypeScript errors would hide ESLint errors. Developers had to fix TypeScript, re-run, then discover ESLint errors.

**After this change:**
All errors shown at once. Fix everything together.

## Guidelines Compliance

This template follows strict coding guidelines. Before committing:

```bash
yarn checks
```

All TypeScript and linting errors must be resolved.

## Tech Stack

### Frontend
- **Framework:** Next.js 15 with App Router
- **UI Library:** shadcn/ui (Radix UI + Tailwind CSS)
- **Styling:** Tailwind CSS 4
- **State:** Zustand + React Query
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js
- **Database:** MongoDB
- **Auth:** JWT + bcrypt
- **AI:** OpenAI, Anthropic, Google AI SDKs

### Development
- **Language:** TypeScript
- **Linting:** ESLint
- **Package Manager:** Yarn

## Features in Detail

### 🔐 Authentication
- JWT-based authentication
- Secure password hashing with bcrypt
- Protected routes and API endpoints
- User session management

### 🌐 Offline Support
- Progressive Web App (PWA)
- Offline-first architecture
- Request queue for offline mutations
- Automatic retry on reconnection

### 📡 Data Fetching
- React Query for server state
- Automatic caching and revalidation
- Optimistic updates
- Offline-aware mutations

### 🏪 State Management
- Zustand for client state
- Automatic localStorage persistence
- TTL-based cache invalidation
- Settings management

### 🎨 UI Components
- 30+ accessible components
- Dark mode support
- Mobile-first responsive design
- Semantic color tokens

## Contributing

This is a template repository. If you find issues or have improvements:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Customization

### Remove Unused Features

If you don't need certain features:

```bash
# Remove AI integrations
rm -rf src/server/template/ai

# Remove specific API modules
rm -rf src/apis/example
```

Update `src/apis/apis.ts` to remove deleted API modules.

### Add New Features

Follow the feature-based structure:

```bash
mkdir -p src/client/features/my-feature
touch src/client/features/my-feature/{index.ts,store.ts,hooks.ts,types.ts}
```

See [feature-based-structure](docs/template/project-guidelines/feature-based-structure.md) for details.

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build
CMD ["yarn", "start"]
```

### Environment Variables

Set these in your deployment platform:
- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_USER_ID` (optional)
- `OPENAI_API_KEY` (if using AI)
- `ANTHROPIC_API_KEY` (if using AI)
- `GOOGLE_AI_API_KEY` (if using AI)

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check MongoDB is running
mongosh

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env.local
```

### Type Errors

```bash
# Clear Next.js cache
rm -rf .next
yarn dev
```

### Template Sync Conflicts

See [Template Sync Guide](docs/template-sync/template-sync.md) for conflict resolution.

## License

MIT

## Support

- 📚 [Full Documentation](docs/)
- 🐛 [Report Issues](https://github.com/yourusername/app-template-ai/issues)
- 💬 [Discussions](https://github.com/yourusername/app-template-ai/discussions)

---

**Built with ❤️ using Next.js, MongoDB, and shadcn/ui**
