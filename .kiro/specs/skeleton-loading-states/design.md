# Design Document

## Overview

This design implements skeleton loading screens to replace spinner-based loading indicators across the IFS Journal application. The solution leverages React Query's built-in loading states and creates reusable skeleton components that match the application's existing design system. The skeleton screens will provide immediate visual feedback, reduce perceived loading time, and prevent layout shifts when content loads.

## Architecture

### Component Structure

```
frontend/components/ui/
├── skeleton/
│   ├── Skeleton.tsx          # Base skeleton component with shimmer animation
│   ├── SkeletonCard.tsx      # Card-shaped skeleton for parts/entries
│   ├── SkeletonText.tsx      # Text line skeleton with variable widths
│   ├── SkeletonCircle.tsx    # Circular skeleton for avatars/icons
│   └── index.ts              # Barrel export
```

### Page-Specific Skeleton Layouts

Each page will have its own skeleton layout component that composes the base skeleton primitives:

- `PartsPageSkeleton` - Grid of skeleton cards matching parts layout
- `LogPageSkeleton` - List of skeleton entry cards
- `PartDetailSkeleton` - Skeleton for part header, quotes, and conversation
- `JournalPageSkeleton` - Skeleton for journal writing interface (if needed)

### React Query Integration

The application already uses React Query in some pages (e.g., `log/page.tsx`). We will:

1. Migrate remaining pages to use React Query hooks
2. Use the `isLoading` state to conditionally render skeleton screens
3. Maintain existing query configurations (staleTime, caching, etc.)

## Components and Interfaces

### Base Skeleton Component

```typescript
// frontend/components/ui/skeleton/Skeleton.tsx

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  circle?: boolean
  animate?: boolean
}

export function Skeleton({
  className,
  width,
  height,
  circle = false,
  animate = true,
}: SkeletonProps): JSX.Element
```

**Features:**
- Base skeleton with shimmer animation using CSS
- Accepts custom dimensions via props
- Optional circle shape for avatars/icons
- Can disable animation if needed
- Uses Tailwind classes for styling

### SkeletonCard Component

```typescript
// frontend/components/ui/skeleton/SkeletonCard.tsx

interface SkeletonCardProps {
  className?: string
  showIcon?: boolean
  textLines?: number
}

export function SkeletonCard({
  className,
  showIcon = true,
  textLines = 3,
}: SkeletonCardProps): JSX.Element
```

**Features:**
- Matches the rounded-2xl card style used throughout the app
- Optional icon/avatar placeholder
- Configurable number of text lines
- Maintains consistent padding and spacing

### SkeletonText Component

```typescript
// frontend/components/ui/skeleton/SkeletonText.tsx

interface SkeletonTextProps {
  className?: string
  lines?: number
  widths?: string[]
}

export function SkeletonText({
  className,
  lines = 1,
  widths = ['100%'],
}: SkeletonTextProps): JSX.Element
```

**Features:**
- Renders multiple text line skeletons
- Variable widths to simulate natural text patterns
- Default widths: ['100%', '95%', '85%'] for multi-line text
- 8px height to match typical text line height

### Page Skeleton Layouts

```typescript
// frontend/components/ui/skeleton/PartsPageSkeleton.tsx
export function PartsPageSkeleton(): JSX.Element

// frontend/components/ui/skeleton/LogPageSkeleton.tsx
export function LogPageSkeleton(): JSX.Element

// frontend/components/ui/skeleton/PartDetailSkeleton.tsx
export function PartDetailSkeleton(): JSX.Element
```

Each page skeleton will:
- Match the exact layout structure of the loaded page
- Use the same grid/flex layouts
- Include proper spacing and gaps
- Render the appropriate number of skeleton items (e.g., 6 cards for parts grid)

## Data Models

No new data models are required. The implementation uses existing React Query states:

```typescript
// Existing React Query hook pattern
const { data, isLoading, isError, error } = useQuery({
  queryKey: ['resource-name'],
  queryFn: fetchFunction,
})

// Conditional rendering pattern
if (isLoading) return <SkeletonLayout />
if (isError) return <ErrorMessage error={error} />
return <ActualContent data={data} />
```

## Styling and Animation

### Shimmer Animation

The shimmer effect will be implemented using CSS animations:

```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #f0f0f0 0%,
    #f8f8f8 50%,
    #f0f0f0 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear;
}
```

### Color Scheme

- Base skeleton color: `bg-gray-200` (#e5e7eb)
- Shimmer highlight: `bg-gray-100` (#f3f4f6)
- Matches the existing gray-50 background used throughout the app

### Border Radius

All skeleton elements will use the same border radius as actual components:
- Cards: `rounded-2xl` (16px)
- Small elements: `rounded-lg` (8px)
- Circles: `rounded-full`

## Migration Strategy

### Phase 1: Create Skeleton Components
1. Build base `Skeleton` component with shimmer animation
2. Build primitive components (`SkeletonCard`, `SkeletonText`, `SkeletonCircle`)
3. Export all components from `frontend/components/ui/skeleton/index.ts`

### Phase 2: Create Page Skeletons
1. Build `PartsPageSkeleton` matching parts grid layout
2. Build `LogPageSkeleton` matching entry list layout
3. Build `PartDetailSkeleton` matching detail page layout

### Phase 3: Integrate with Pages
1. Migrate `parts/page.tsx` to use React Query and `PartsPageSkeleton`
2. Update `log/page.tsx` to use `LogPageSkeleton` (already uses React Query)
3. Migrate `parts/[id]/page.tsx` to use React Query and `PartDetailSkeleton`
4. Remove all spinner loading states

### Phase 4: Polish
1. Test on slow connections to ensure skeletons display appropriately
2. Verify no layout shifts occur when content loads
3. Ensure minimum display time prevents flashing on fast connections
4. Add accessibility attributes (aria-busy, aria-label)

## Error Handling

Error states will continue to use existing error UI patterns:

```typescript
if (isError) {
  return (
    <div className="text-center py-12">
      <p className="text-red-600 mb-4">Failed to load data</p>
      <button onClick={() => refetch()}>Try Again</button>
    </div>
  )
}
```

Skeleton screens will only display during the `isLoading` state, not during errors.

## Testing Strategy

### Visual Testing
- Manually test each page with network throttling (Slow 3G)
- Verify skeleton layouts match actual content layouts
- Confirm no layout shifts when content loads
- Test shimmer animation smoothness

### Functional Testing
- Verify React Query loading states trigger skeleton display
- Confirm skeleton disappears when data loads
- Test error states don't show skeletons
- Verify cached data doesn't show skeletons on subsequent visits

### Accessibility Testing
- Ensure screen readers announce loading state
- Verify keyboard navigation works during loading
- Test with reduced motion preferences (disable shimmer animation)

### Performance Testing
- Measure time to first skeleton render (should be < 16ms)
- Verify skeleton components don't cause performance degradation
- Test with React DevTools Profiler

## Accessibility Considerations

All skeleton screens will include:

```typescript
<div role="status" aria-busy="true" aria-label="Loading content">
  {/* Skeleton components */}
  <span className="sr-only">Loading...</span>
</div>
```

For users with `prefers-reduced-motion`, the shimmer animation will be disabled:

```css
@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer {
    animation: none;
  }
}
```

## Performance Considerations

### Bundle Size
- Skeleton components are lightweight (< 2KB total)
- No external dependencies required
- CSS animations are hardware-accelerated

### Rendering Performance
- Skeleton components use simple DOM structure
- No complex calculations or effects
- Shimmer animation uses CSS transform (GPU-accelerated)

### React Query Optimization
- Existing cache configuration prevents unnecessary loading states
- `staleTime: 5 minutes` means skeletons rarely show for cached data
- Background refetching doesn't trigger skeleton display

## Future Enhancements

Potential improvements for future iterations:

1. **Progressive Loading**: Show partial content as it becomes available
2. **Skeleton Variants**: Different skeleton styles for different content types
3. **Smart Skeleton Counts**: Dynamically adjust skeleton count based on viewport size
4. **Skeleton Presets**: Pre-built skeleton layouts for common patterns
5. **Storybook Integration**: Document skeleton components in Storybook
6. **Animation Customization**: Allow customization of shimmer speed and direction
