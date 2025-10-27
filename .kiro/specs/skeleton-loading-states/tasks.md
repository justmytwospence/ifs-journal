'# Implementation Plan

- [x] 1. Create base skeleton components

  - Create `frontend/components/ui/skeleton/Skeleton.tsx` with shimmer animation
  - Implement props interface for width, height, circle shape, and animation control
  - Add CSS keyframes for shimmer effect in component or globals.css
  - Include accessibility attributes (role="status", aria-busy)
  - Add support for prefers-reduced-motion media query
  - _Requirements: 1.5, 2.5_

- [x] 1.1 Create SkeletonText component

  - Create `frontend/components/ui/skeleton/SkeletonText.tsx`
  - Implement multi-line text skeleton with variable widths
  - Use default widths of ['100%', '95%', '85%'] for natural text appearance
  - Set height to 8px to match typical text line height
  - Add 8px gap between lines
  - _Requirements: 1.5, 2.3_

- [x] 1.2 Create SkeletonCard component

  - Create `frontend/components/ui/skeleton/SkeletonCard.tsx`
  - Match rounded-2xl card style with shadow-sm
  - Include optional icon/avatar placeholder using SkeletonCircle
  - Add configurable number of text lines using SkeletonText
  - Use consistent padding (p-6) matching actual cards
  - _Requirements: 1.5, 2.1, 2.2_

- [x] 1.3 Create SkeletonCircle component

  - Create `frontend/components/ui/skeleton/SkeletonCircle.tsx`
  - Implement circular skeleton for avatars and icons
  - Accept size prop with default of 48px (w-12 h-12)
  - Use rounded-full class
  - _Requirements: 1.5, 2.4_

- [x] 1.4 Create barrel export for skeleton components

  - Create `frontend/components/ui/skeleton/index.ts`
  - Export all skeleton components (Skeleton, SkeletonText, SkeletonCard, SkeletonCircle)
  - _Requirements: 1.5_

- [x] 2. Create PartsPageSkeleton component

  - Create `frontend/components/ui/skeleton/PartsPageSkeleton.tsx`
  - Implement grid layout matching parts page (md:grid-cols-2 lg:grid-cols-3)
  - Render 6 SkeletonCard components with icon placeholders
  - Include skeleton for page header and "Reanalyze" button area
  - Match spacing and gaps from actual parts page
  - Wrap in accessibility container with aria-label="Loading parts"
  - _Requirements: 1.1, 2.1, 2.2, 4.1_

- [x] 3. Create LogPageSkeleton component

  - Create `frontend/components/ui/skeleton/LogPageSkeleton.tsx`
  - Implement vertical list layout with space-y-4
  - Render 5 skeleton entry cards
  - Include skeleton for search bar and filter dropdown
  - Include skeleton for page header
  - Match entry card structure with date, prompt, and content areas
  - Wrap in accessibility container with aria-label="Loading journal entries"
  - _Requirements: 1.2, 2.1, 2.2, 4.1_

- [x] 4. Create PartDetailSkeleton component

  - Create `frontend/components/ui/skeleton/PartDetailSkeleton.tsx`
  - Implement skeleton for part header with large icon and title
  - Add skeleton for description text (3 lines)
  - Create skeleton for quotes section (3 quote items)
  - Add skeleton for actions section with 2 button placeholders
  - Include skeleton for conversation area
  - Match two-column grid layout (md:grid-cols-2)
  - Wrap in accessibility container with aria-label="Loading part details"
  - _Requirements: 1.3, 2.1, 2.2, 4.1_

- [x] 5. Migrate parts page to use React Query and skeleton

  - Update `frontend/app/parts/page.tsx` to use useQuery hook
  - Create query function for fetching parts from /api/parts
  - Replace useState and useEffect with useQuery
  - Replace spinner loading state with PartsPageSkeleton component
  - Maintain existing reanalysis functionality
  - Ensure error states display properly without skeleton
  - _Requirements: 1.1, 1.4, 1.5, 3.1, 3.2, 3.3, 4.2, 4.3_

- [x] 6. Update log page to use LogPageSkeleton

  - Update `frontend/app/log/page.tsx` to replace spinner with LogPageSkeleton
  - Page already uses React Query, only need to swap loading UI
  - Ensure skeleton displays for both entries and parts queries
  - Show skeleton until both queries complete
  - _Requirements: 1.2, 1.4, 1.5, 3.2, 4.2_

- [x] 7. Migrate part detail page to use React Query and skeleton

  - Update `frontend/app/parts/[id]/page.tsx` to use useQuery hooks
  - Create query function for fetching part details by slug
  - Create separate query for conversation history
  - Replace useState and useEffect with useQuery hooks
  - Replace "Loading part..." text with PartDetailSkeleton component
  - Maintain existing conversation functionality
  - Ensure error states display properly without skeleton
  - _Requirements: 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 4.2, 4.3_

- [x] 8. Add minimum display time for skeletons

  - Create utility hook `useMinimumLoadingTime` in `frontend/lib/hooks/`
  - Accept isLoading state and minimum time (default 200ms)
  - Return extended loading state that stays true for minimum duration
  - Prevents skeleton flashing on fast connections
  - Apply to all pages using skeleton screens
  - _Requirements: 4.5_

- [ ]\* 9. Add reduced motion support

  - Update skeleton shimmer animation CSS to respect prefers-reduced-motion
  - Add media query to disable animation when user prefers reduced motion
  - Test with browser/OS reduced motion settings
  - _Requirements: 2.5_

- [ ]\* 10. Verify accessibility and performance
  - Test all skeleton screens with screen reader (VoiceOver/NVDA)
  - Verify aria-busy and role="status" are announced correctly
  - Test keyboard navigation during loading states
  - Use React DevTools Profiler to measure skeleton render performance
  - Test on throttled network (Slow 3G) to verify skeleton display
  - Verify no layout shifts when content loads using Chrome DevTools
  - _Requirements: 4.1, 4.4_
