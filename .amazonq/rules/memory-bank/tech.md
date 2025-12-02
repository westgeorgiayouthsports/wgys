# WGYS Technology Stack

## Core Technologies

### Frontend Framework
- **React 19.2.0**: Modern React with latest features
- **TypeScript 5.9.3**: Static type checking and enhanced developer experience
- **Vite 7.2.4**: Fast build tool and development server

### UI Framework and Styling
- **Ant Design 6.0.0**: Comprehensive React UI component library
- **Ant Design Icons 6.1.0**: Icon set for consistent UI
- **CSS**: Custom styling with CSS variables and global styles
- **Responsive Design**: Mobile-first approach

### State Management
- **Redux Toolkit 2.11.0**: Modern Redux with simplified API
- **React Redux 9.2.0**: React bindings for Redux
- **Redux 5.0.1**: Predictable state container

### Routing
- **React Router DOM 7.9.6**: Declarative routing for React applications

### Backend and Database
- **Firebase 12.6.0**: Backend-as-a-Service platform
  - **Firebase Authentication**: User authentication and authorization
  - **Firebase Realtime Database**: Real-time data synchronization
  - **Firebase Hosting**: Web application hosting

### Rich Text Editing
- **Lexical 0.38.2**: Extensible text editor framework
- **@lexical/react**: React integration for Lexical
- **@lexical/rich-text**: Rich text editing capabilities
- **@lexical/html**: HTML serialization/deserialization

### Form Management
- **React Hook Form 7.67.0**: Performant forms with easy validation

### Utility Libraries
- **Lodash 4.17.21**: Utility functions for JavaScript
- **Clsx 2.1.1**: Conditional className utility
- **Axios 1.13.2**: HTTP client for API requests
- **Lucide React 0.555.0**: Beautiful and consistent icons

### Document Generation
- **jsPDF 3.0.4**: PDF generation in JavaScript
- **ExcelJS 4.4.0**: Excel file generation and manipulation
- **docx 9.5.1**: Word document generation
- **PDFKit 0.17.2**: PDF generation library

## Development Tools

### Code Quality
- **ESLint 9.39.1**: JavaScript/TypeScript linting
- **TypeScript ESLint**: TypeScript-specific linting rules
- **ESLint Plugins**:
  - react, react-hooks, react-refresh
  - jsx-a11y (accessibility)
  - import (import/export validation)
  - jest (testing)

### Build and Development
- **Vite**: Development server with HMR (Hot Module Replacement)
- **TypeScript Compiler**: Type checking and compilation
- **ESLint**: Code linting and formatting

### Environment Configuration
- **Environment Variables**: .env files for different environments
- **Firebase Configuration**: Separate config for different environments

## Development Commands

### Primary Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Development Workflow
1. **Development**: `npm run dev` starts Vite dev server with HMR
2. **Type Checking**: TypeScript compiler runs alongside development
3. **Linting**: ESLint provides real-time code quality feedback
4. **Building**: `npm run build` creates optimized production bundle
5. **Preview**: `npm run preview` serves production build locally

## Project Configuration

### TypeScript Configuration
- **tsconfig.app.json**: Application TypeScript configuration
- **tsconfig.node.json**: Node.js TypeScript configuration
- **tsconfig.json**: Base TypeScript configuration

### Build Configuration
- **vite.config.ts**: Vite build and development configuration
- **React plugin**: @vitejs/plugin-react for React support

### Firebase Configuration
- **firebase.json**: Firebase project configuration
- **database.rules.json**: Firebase Realtime Database security rules
- **.firebaserc**: Firebase project aliases

### Code Quality Configuration
- **eslint.config.js**: ESLint configuration with TypeScript support
- **Multiple ESLint plugins**: Comprehensive code quality rules

## Dependencies Overview

### Production Dependencies (38 packages)
- Core React ecosystem
- Firebase backend services
- UI components and styling
- State management
- Document generation
- Utility libraries

### Development Dependencies (20 packages)
- TypeScript tooling
- ESLint and plugins
- Build tools
- Type definitions

## Browser Support
- Modern browsers with ES2020+ support
- Mobile browsers (responsive design)
- Progressive Web App capabilities through Vite