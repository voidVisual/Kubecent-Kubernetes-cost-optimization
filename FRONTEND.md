# Frontend Development Guide

## Architecture Overview

The frontend follows modern React patterns with TypeScript:

```
src/
├── components/        # React components
├── hooks/            # Custom React hooks
├── services/         # API client
├── types/            # TypeScript type definitions
└── utils/            # Helper functions
```

## Component Structure

### Page Components
Top-level page components that correspond to routes:
- `Overview.tsx` - Dashboard main view
- `Namespaces.tsx` - Namespace cost breakdown
- `Optimization.tsx` - Recommendations

### Presentational Components
- `Header.tsx` - Navigation and branding

## Custom Hooks

### Data Fetching Hooks
Encapsulate API calls with loading/error states:

```typescript
const { data, loading, error } = useClusterCost()

if (loading) return <Spinner />
if (error) return <ErrorBanner error={error} />
return <Dashboard data={data} />
```

### Creating Custom Hooks

```typescript
// src/hooks/myHook.ts
export function useMyData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiClient.getMyData()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
```

## API Client

Centralized API communication:

```typescript
import { apiClient } from '../services/apiClient'

// Automatically includes auth token
const cost = await apiClient.getClusterCost()
```

### Adding New API Methods

```typescript
// src/services/apiClient.ts
async getMyResource(): Promise<MyType> {
  const { data } = await this.client.get('/resource')
  return data
}
```

## Type Safety

All API responses are fully typed:

```typescript
interface ClusterCost {
  cluster_name: string
  allocation: CostAllocation
  timestamp: string
}

// Type-safe usage
const cost: ClusterCost = data
```

## Styling with Tailwind

Use Tailwind utility classes:

```tsx
<div className="bg-gray-900 text-gray-50 p-4 rounded-lg">
  <h1 className="text-2xl font-bold mb-4">Title</h1>
  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
    Click me
  </button>
</div>
```

Custom classes in `src/index.css`:
```css
.card {
  @apply bg-gray-800 border border-gray-700 rounded-lg shadow-lg;
}
```

## Building Components

### Step 1: Define Types
```typescript
// src/types/index.ts
export interface MyData {
  id: string
  value: number
}
```

### Step 2: Create Hook
```typescript
// src/hooks/useMyData.ts
export function useMyData() {
  return useQuery<MyData>(() => apiClient.getMyData())
}
```

### Step 3: Build Component
```typescript
// src/components/MyComponent.tsx
export function MyComponent() {
  const { data, loading, error } = useMyData()
  
  if (loading) return <Loading />
  if (error) return <ErrorBanner />
  
  return (
    <div className="card p-6">
      <h2>{data.value}</h2>
    </div>
  )
}
```

## Error Handling

Graceful error handling with user feedback:

```tsx
if (error) {
  return (
    <div className="bg-red-900 border border-red-700 p-4 rounded-lg flex gap-3">
      <AlertCircle className="w-5 h-5" />
      <div>
        <h3 className="font-bold">Error loading data</h3>
        <p className="text-sm">{error.message}</p>
      </div>
    </div>
  )
}
```

## Performance Best Practices

1. **Memoization**
   ```typescript
   const MemoComponent = React.memo(MyComponent)
   ```

2. **Lazy Loading**
   ```typescript
   const Overview = lazy(() => import('./components/Overview'))
   ```

3. **Code Splitting**
   Routes are automatically code-split with Vite

## Build and Deployment

### Development
```bash
npm run dev      # Hot reload at localhost:5173
npm run lint     # ESLint check
npm run type-check  # TypeScript checking
```

### Production
```bash
npm run build    # Build optimized dist/
```

The Docker build will automatically run these steps.

## Testing

Add tests for components:

```typescript
// src/components/Overview.test.tsx
import { render, screen } from '@testing-library/react'
import { Overview } from './Overview'

test('renders cost summary', () => {
  render(<Overview />)
  expect(screen.getByText(/Total Cost/i)).toBeInTheDocument()
})
```

Run tests:
```bash
npm run test
```

## Accessibility

Follow WCAG guidelines:
- Use semantic HTML
- Include alt text for images
- Maintain color contrast (WCAG AA minimum)
- Support keyboard navigation
- Include aria labels where needed

## Browser Support

Targets modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers
