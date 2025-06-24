# Contexts

This directory contains React Context providers for managing application state.

## Available Contexts

### AssetContext

Manages asset data and search functionality.

- **Provider**: `AssetProvider`
- **Hook**: `useAssets`
- **Features**: Asset fetching, searching, loading states, error handling

### AuthContext

Manages authentication state and user information.

- **Provider**: `AuthProvider`
- **Hook**: `useAuth`
- **Features**: Login/logout, user session management, role-based access

### DashboardContext

Manages dashboard statistics and metrics.

- **Provider**: `DashboardProvider`
- **Hook**: `useDashboard`
- **Features**: Real-time stats, department-based filtering, admin overview

### DropdownContext

Manages dropdown data for forms and filters.

- **Provider**: `DropdownProvider`
- **Hook**: `useDropdowns`
- **Features**: Department, location, and user data for dropdowns

## Usage Pattern

All contexts follow a similar pattern:

```tsx
import { ContextProvider, useContextHook } from "./contexts/ContextName";

// Wrap your app or component
<ContextProvider>
  <YourComponent />
</ContextProvider>;

// Use in components
const { data, loading, error, fetchData } = useContextHook();
```

## Error Handling

All contexts include:

- Loading states
- Error handling with retry logic
- Authentication error detection
- Network error recovery

## Data Flow

1. Context providers manage state and API calls
2. Hooks provide easy access to context data
3. Components consume data through hooks
4. Automatic retry on network failures
5. Department-based filtering for regular users
