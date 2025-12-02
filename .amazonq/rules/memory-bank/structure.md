# WGYS Project Structure

## Directory Organization

### Root Configuration
- **package.json**: Project dependencies and scripts
- **vite.config.ts**: Vite build configuration
- **tsconfig.*.json**: TypeScript configuration files
- **eslint.config.js**: ESLint configuration
- **firebase.json**: Firebase project configuration
- **.env files**: Environment variables for different environments

### Source Code Structure (`src/`)

#### Core Application Files
- **main.tsx**: Application entry point
- **App.tsx**: Root application component
- **Router.tsx**: Application routing configuration
- **firebase.config.ts**: Firebase initialization and configuration

#### Components (`src/components/`)
Organized by feature domains:
- **AdminPages/**: Administrative interface components
- **Announcements/**: Announcement creation and display components
- **Auth/**: Authentication-related components (ProtectedRoute)
- **Chat/**: Real-time chat functionality
- **Events/**: Event management components
- **Layout/**: Application layout components (Header, Sidebar, MainLayout)
- **Profile/**: User profile management
- **Registrations/**: Registration form and management
- **RichTextEditor/**: Content editing functionality
- **Rosters/**: Team roster management

#### Pages (`src/pages/`)
Top-level page components:
- **Admin.tsx**: Administrative dashboard
- **Dashboard.tsx**: Main user dashboard
- **MyFamily.tsx**: Family management interface
- **Programs.tsx**: Sports program listings
- **Teams.tsx**: Team management
- **Auth pages**: SignIn.tsx, SignUp.tsx
- **Settings pages**: Settings.tsx, UserSettings.tsx

#### Services (`src/services/`)
Firebase service layer organized by domain:
- **firebase.ts**: Core Firebase configuration
- **firebaseAuth.ts**: Authentication services
- **firebaseChat.ts**: Chat functionality
- **firebaseAnnouncements.ts**: Announcement management
- **firebasePrograms.ts**: Program management
- **firebaseTeams.ts**: Team management
- **firebaseRegistrations.ts**: Registration handling
- **firebaseFamilies.ts**: Family data management

#### State Management (`src/store/`)
Redux Toolkit implementation:
- **store.ts**: Store configuration
- **slices/**: Feature-specific state slices
  - authSlice.ts, chatSlice.ts, announcementsSlice.ts
  - eventsSlice.ts, registrationsSlice.ts, teamsSlice.ts
  - themeSlice.ts

#### Type Definitions (`src/types/`)
TypeScript type definitions:
- **auth.ts**: Authentication types
- **family.ts**: Family and person types
- **program.ts**: Program and team types
- **contact.ts**: Contact information types
- **cms.ts**: Content management types

#### Styling (`src/styles/` and `src/theme/`)
- **globals.css**: Global styles
- **theme-variables.css**: CSS custom properties
- **antdTheme.ts**: Ant Design theme configuration
- **lightTheme.ts**: Light theme definitions
- **themeConfig.ts**: Theme management utilities

## Architectural Patterns

### Component Architecture
- **Feature-based organization**: Components grouped by business domain
- **Layout components**: Reusable layout structure (Header, Sidebar, MainLayout)
- **Page components**: Top-level route components
- **Shared components**: Cross-cutting functionality (Auth, RichTextEditor)

### State Management Pattern
- **Redux Toolkit**: Centralized state management
- **Feature slices**: Domain-specific state management
- **Async thunks**: Handling asynchronous operations
- **Selectors**: Computed state derivation

### Service Layer Pattern
- **Firebase abstraction**: Service layer abstracts Firebase operations
- **Domain-specific services**: Each business domain has dedicated service
- **Error handling**: Consistent error handling across services
- **Type safety**: Full TypeScript integration

### Routing Architecture
- **React Router**: Client-side routing
- **Protected routes**: Authentication-based route protection
- **Nested routing**: Hierarchical route structure
- **Route-based code splitting**: Lazy loading for performance

### Data Flow
1. **Components** dispatch actions to Redux store
2. **Redux slices** handle state updates and async operations
3. **Services** interact with Firebase backend
4. **Real-time updates** flow through Firebase listeners
5. **UI updates** triggered by state changes