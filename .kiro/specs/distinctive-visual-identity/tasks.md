# Implementation Plan

- [x] 1. Establish design token foundation

  - Update `frontend/app/globals.css` with sepia color palette, typography tokens, spacing system, and shadow definitions
  - Add CSS custom properties for all design tokens (colors, spacing, typography, shadows, border radius)
  - Implement warm sepia-toned animations (shimmer, slide-up, pulse)
  - Add subtle paper texture background using CSS or optimized image
  - Configure responsive typography with fluid scaling using clamp()
  - _Requirements: 1.1, 1.2, 2.1, 2.3, 2.5_

- [x] 2. Update Tailwind configuration

  - Modify `frontend/tailwind.config.ts` (or create if needed) to extend theme with sepia color palette
  - Add custom spacing, border radius, and shadow tokens
  - Configure responsive breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
  - Add custom font family configurations for Inter, Lora, and JetBrains Mono
  - _Requirements: 1.1, 1.2, 6.4_

- [x] 3. Redesign navigation component for desktop

  - Update `frontend/components/AppNav.tsx` with sepia-toned background and warm shadows
  - Replace blue/purple gradients with rust-to-amber warm gradients for user avatar
  - Implement organic hover states for navigation items (soft glow effect)
  - Update active state styling with warm sepia tones
  - Redesign demo mode badge and analysis indicator with muted sepia styling
  - Add custom underline animation for active navigation items
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 4.4_

- [ ] 4. Implement mobile-responsive navigation

  - Add responsive breakpoint logic to `frontend/components/AppNav.tsx`
  - Implement hamburger menu with smooth slide-in animation for mobile (< 768px)
  - Create bottom-fixed navigation bar for primary actions on mobile
  - Ensure all touch targets are minimum 44x44 pixels
  - Add mobile-specific layout with simplified header
  - Test navigation on various mobile screen sizes (375px, 414px, 768px)
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 5. Redesign button components

  - Update `frontend/components/ui/Button.tsx` with sepia-toned styling
  - Implement primary button with rust/amber gradient background
  - Add organic rounded corners and subtle texture overlay
  - Create smooth hover lift and warm glow effects
  - Implement secondary button with sepia border and transparent background
  - Add ghost button variant with warm hover background
  - Ensure minimum 44px height for mobile touch targets
  - Add full-width variant for mobile forms
  - _Requirements: 1.1, 2.1, 2.2, 4.4, 5.2, 6.2_

- [ ] 6. Redesign form input components

  - Update `frontend/components/ui/Input.tsx` with warm sepia borders and subtle texture
  - Implement organic focus states with warm glow (replace harsh blue)
  - Add comfortable padding and clear error states with rust color
  - Update `frontend/components/ui/Textarea.tsx` with matching styling
  - Ensure larger touch targets for mobile
  - Configure appropriate input types for mobile keyboards
  - Add clear focus indicators for accessibility
  - _Requirements: 1.1, 2.1, 2.2, 5.1, 5.2, 5.5, 6.2_

- [ ] 7. Redesign card components

  - Update `frontend/components/ui/Card.tsx` with warm sepia backgrounds and subtle texture
  - Implement organic rounded corners (12-16px) and layered shadows
  - Add warm tan borders and gentle hover states with lift and glow
  - Implement responsive padding (reduced on mobile)
  - Add full-width mobile layout with side margins
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 3.3, 4.2, 6.1_

- [ ] 8. Update loading skeleton components

  - Modify skeleton components in `frontend/components/ui/skeleton/` directory
  - Replace gray shimmer with warm sepia shimmer animation
  - Update `Skeleton.tsx`, `SkeletonCard.tsx`, `SkeletonText.tsx`, `SkeletonCircle.tsx`
  - Ensure organic shapes and subtle, calming motion
  - Maintain consistency with overall sepia aesthetic
  - _Requirements: 1.2, 2.2, 4.2_

- [ ] 9. Redesign landing page

  - Update `frontend/app/page.tsx` with warm sepia gradient background
  - Replace blue/purple gradients with sepia tones throughout
  - Implement organic flowing shapes in background using CSS or SVG
  - Update hero section with Lora serif font for display text
  - Redesign feature cards with layered depth and warm styling
  - Update CTA buttons with rust/amber gradient styling
  - Implement responsive single-column layout for mobile
  - Add larger hero text and full-width CTAs on mobile
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 4.1, 6.1, 6.4_

- [ ] 10. Update journal pages styling

  - Modify `frontend/app/journal/page.tsx` with sepia-toned backgrounds
  - Add paper-like texture to journal entry cards
  - Implement organic dividers between entries
  - Set comfortable reading width (max 65ch) with generous line spacing
  - Update `frontend/app/log/page.tsx` with matching styling
  - Implement full-width cards with margins on mobile
  - Increase text size for mobile readability
  - Add touch-friendly action buttons
  - _Requirements: 1.1, 1.2, 2.1, 2.3, 2.5, 6.1, 6.2_

- [ ] 11. Update log entry detail page

  - Modify `frontend/app/log/[id]/page.tsx` with sepia aesthetic
  - Implement warm color scheme for entry content
  - Add organic styling to action buttons and interactive elements
  - Ensure responsive layout for mobile devices
  - _Requirements: 1.1, 1.2, 6.1_

- [ ] 12. Redesign parts pages

  - Update `frontend/app/parts/page.tsx` with sepia-toned styling
  - Modify `frontend/app/parts/[id]/page.tsx` for individual part details
  - Implement warm color coding for part types (Protectors: rust, Managers: amber, Firefighters: clay, Exiles: slate)
  - Add organic shapes and subtle textures to part cards
  - Ensure responsive layouts for mobile
  - _Requirements: 1.1, 2.1, 3.2, 3.3, 6.1_

- [ ] 13. Update parts treemap visualization

  - Modify `frontend/components/parts/PartsTreemap.tsx` with warm color palette
  - Implement part-type-specific colors (rust, amber, clay, slate)
  - Add organic shapes instead of rigid rectangles where possible
  - Implement subtle textures and depth effects
  - Add smooth transitions for interactions
  - Create simplified mobile visualization
  - Ensure touch-friendly interaction on mobile
  - _Requirements: 1.1, 3.2, 3.3, 4.4, 6.1, 6.2_

- [ ] 14. Update authentication pages

  - Modify `frontend/app/(auth)/login/page.tsx` with sepia aesthetic
  - Update `frontend/app/(auth)/register/page.tsx` with warm styling
  - Modify `frontend/app/(auth)/reset-password/page.tsx` with matching design
  - Update `frontend/app/(auth)/layout.tsx` with sepia background
  - Ensure forms use updated input components
  - Implement responsive layouts for mobile
  - _Requirements: 1.1, 1.2, 6.1_

- [ ] 15. Update profile page

  - Modify `frontend/app/profile/page.tsx` with sepia-toned styling
  - Implement warm color scheme for user information display
  - Update action buttons with new button component styling
  - Ensure responsive layout for mobile devices
  - _Requirements: 1.1, 1.2, 6.1_

- [ ] 16. Update toast notification component

  - Modify `frontend/components/ui/Toast.tsx` with warm sepia styling
  - Replace harsh colors with warm rust for errors, amber for warnings, sage for success
  - Implement organic rounded corners and subtle shadows
  - Ensure gentle, supportive visual treatment
  - Add warm slide-up animation
  - _Requirements: 1.1, 2.2, 4.4_

- [ ] 17. Update confirm modal component

  - Modify `frontend/components/ui/ConfirmModal.tsx` with sepia aesthetic
  - Implement warm background with subtle texture
  - Update button styling to use new button variants
  - Add organic rounded corners and warm shadows
  - Ensure responsive sizing for mobile
  - _Requirements: 1.1, 2.1, 6.1_

- [ ] 18. Implement accessibility improvements

  - Verify WCAG AA contrast ratios for all sepia color combinations in `globals.css`
  - Test keyboard navigation across all updated components
  - Add focus-visible styles with warm glow for keyboard users
  - Implement prefers-reduced-motion media query for all animations
  - Test with screen readers (VoiceOver, NVDA)
  - Test with color blindness simulators
  - _Requirements: 5.1, 5.2_

- [ ] 19. Optimize performance

  - Optimize texture images and convert to WebP with fallbacks
  - Implement lazy loading for below-the-fold images
  - Configure font-display: swap for Inter, Lora, and JetBrains Mono
  - Minimize CSS repaints by using transform/opacity for animations
  - Test load times and verify performance budgets (FCP < 1.5s, LCP < 2.5s)
  - Test on lower-end mobile devices
  - _Requirements: 5.4_

- [ ] 20. Conduct responsive testing

  - Test all pages at breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop), 1440px (large desktop)
  - Verify touch targets are minimum 44x44px on mobile
  - Test orientation changes (portrait/landscape) on mobile devices
  - Verify layouts adapt appropriately at all breakpoints
  - Test on actual mobile devices (iOS Safari, Android Chrome)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 21. Final polish and refinement
  - Add micro-interactions to enhance user experience (button hover, card lift, etc.)
  - Refine animation timing and easing for organic feel
  - Ensure consistent spacing and alignment across all pages
  - Review and adjust color intensity for optimal warmth
  - Conduct final visual review comparing before/after
  - _Requirements: 1.2, 2.2, 4.2, 4.4_
