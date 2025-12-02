# WGYS Development Guidelines

## Code Quality Standards

### Import Organization
- **Grouped imports**: React hooks first, then external libraries, then internal modules
- **Type imports**: Use `type` keyword for TypeScript type-only imports
- **Consistent ordering**: React → External libraries → Internal services → Types → Components

```typescript
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Table, Card, Button, Space } from 'antd';
import type { RootState } from '../store/store';
import { peopleService } from '../services/firebasePeople';
import type { Person, PersonFormData } from '../types/person';
```

### TypeScript Standards
- **Strict typing**: All functions, variables, and props must have explicit types
- **Interface definitions**: Use interfaces for complex object types
- **Type assertions**: Avoid `any`, use proper type assertions with `as`
- **Optional properties**: Use `?` for optional properties in interfaces
- **Generic types**: Leverage generics for reusable components and functions

### Component Structure
- **Functional components**: Use function declarations with explicit return types
- **Props interfaces**: Define props interfaces above component definition
- **Default exports**: Use default exports for page components
- **Named exports**: Use named exports for utility components and services

## Semantic Patterns

### State Management Patterns
- **Redux Toolkit**: Use createSlice for state management
- **Async operations**: Use createAsyncThunk for async operations
- **Local state**: Use useState for component-specific state
- **Form state**: Use useForm from react-hook-form for complex forms

```typescript
const [loading, setLoading] = useState(true);
const [modalVisible, setModalVisible] = useState(false);
const { user } = useSelector((state: RootState) => state.auth);
const dispatch = useDispatch();
```

### Error Handling Patterns
- **Try-catch blocks**: Wrap async operations in try-catch
- **Console logging**: Use emoji prefixes for error logging (❌ for errors)
- **User feedback**: Show user-friendly error messages using Ant Design message
- **Error boundaries**: Implement error boundaries for component-level error handling

```typescript
try {
  await someAsyncOperation();
  message.success('Operation completed successfully');
} catch (error) {
  console.error('❌ Error performing operation:', error);
  message.error('Failed to complete operation');
}
```

### Firebase Service Patterns
- **Service abstraction**: Create dedicated service files for each Firebase feature
- **Consistent naming**: Use descriptive function names (createPerson, updatePerson, deletePerson)
- **Error propagation**: Let errors bubble up to component level for handling
- **Type safety**: Return properly typed data from service functions

### Form Handling Patterns
- **Ant Design Forms**: Use Form.useForm() hook for form management
- **Validation rules**: Define validation rules inline with form items
- **Form submission**: Handle form submission with async/await pattern
- **Form reset**: Reset forms after successful submission

### Authentication Patterns
- **Protected routes**: Use ProtectedRoute component for route protection
- **Role-based access**: Check user roles for admin-only features
- **Conditional rendering**: Show/hide UI elements based on authentication state
- **User context**: Access user data through Redux store

## Component Architecture Patterns

### Layout Components
- **Consistent structure**: Use MainLayout for authenticated pages, AuthLayout for auth pages
- **Responsive design**: Use Ant Design's grid system (Row, Col) for responsive layouts
- **Navigation**: Implement consistent navigation patterns across pages

### Data Display Patterns
- **Table components**: Use Ant Design Table with consistent column definitions
- **Loading states**: Show loading spinners during data fetching
- **Empty states**: Provide meaningful empty state messages
- **Pagination**: Implement pagination for large datasets

### Modal Patterns
- **Form modals**: Use modals for create/edit operations
- **Confirmation dialogs**: Use Popconfirm for destructive actions
- **Modal state**: Manage modal visibility with local state
- **Form integration**: Integrate forms within modals for data entry

## Styling Conventions

### Ant Design Theme
- **Custom theme**: Use centralized theme configuration in antdTheme.ts
- **Dark theme**: Implement consistent dark theme across all components
- **Color palette**: Use predefined color tokens for consistency
- **Component customization**: Override Ant Design component styles through theme config

### CSS Classes
- **Utility classes**: Use utility classes for common styling patterns
- **Component-specific styles**: Create component-specific CSS files when needed
- **Responsive design**: Use CSS Grid and Flexbox for responsive layouts
- **CSS variables**: Use CSS custom properties for theme values

## API Integration Patterns

### Firebase Integration
- **Environment variables**: Use Vite environment variables for Firebase config
- **Config validation**: Validate Firebase configuration on app startup
- **Real-time listeners**: Use Firebase listeners for real-time data updates
- **Offline handling**: Implement offline-first patterns where appropriate

### Service Layer
- **Abstraction**: Abstract Firebase operations behind service layer
- **Consistent API**: Maintain consistent API patterns across all services
- **Error handling**: Implement consistent error handling in service layer
- **Type safety**: Ensure all service functions are properly typed

## Performance Patterns

### Component Optimization
- **Lazy loading**: Use React.lazy for route-based code splitting
- **Memoization**: Use useMemo and useCallback for expensive operations
- **Effect dependencies**: Properly manage useEffect dependencies
- **State updates**: Batch state updates when possible

### Data Fetching
- **Loading states**: Show loading indicators during data fetching
- **Error boundaries**: Implement error boundaries for graceful error handling
- **Caching**: Implement appropriate caching strategies for frequently accessed data
- **Pagination**: Implement pagination for large datasets

## Security Patterns

### Authentication
- **Route protection**: Protect routes based on authentication status
- **Role-based access**: Implement role-based access control
- **Token management**: Securely handle authentication tokens
- **Session management**: Implement proper session management

### Data Validation
- **Input validation**: Validate all user inputs on both client and server
- **Type checking**: Use TypeScript for compile-time type checking
- **Sanitization**: Sanitize user inputs to prevent XSS attacks
- **Authorization**: Check user permissions before allowing operations

## Testing Patterns

### Component Testing
- **Unit tests**: Write unit tests for utility functions
- **Component tests**: Test component behavior and user interactions
- **Integration tests**: Test component integration with services
- **E2E tests**: Implement end-to-end tests for critical user flows

### Service Testing
- **Mock services**: Mock Firebase services for testing
- **Error scenarios**: Test error handling scenarios
- **Edge cases**: Test edge cases and boundary conditions
- **Performance tests**: Test performance under load

## Documentation Standards

### Code Comments
- **JSDoc comments**: Use JSDoc for function documentation
- **Inline comments**: Add comments for complex business logic
- **TODO comments**: Use TODO comments for future improvements
- **Type documentation**: Document complex types and interfaces

### README Documentation
- **Setup instructions**: Provide clear setup and installation instructions
- **Environment variables**: Document required environment variables
- **Development workflow**: Document development and deployment processes
- **API documentation**: Document API endpoints and data structures