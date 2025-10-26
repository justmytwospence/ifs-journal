# IFS Journal App - Implementation Tasks

## Overview

This implementation plan converts the IFS Journal App design into actionable coding tasks, organized in logical progression where each section builds on the previous one and delivers a working product to test at each stage.

## 1. UI Framework and Visual Foundation

- [x] 1.1 Initialize Next.js project with visual design system

  - Set up Next.js 15 project with App Router and TypeScript template
  - Configure Biome.js for ultra-fast linting and formatting
  - Configure Tailwind CSS with custom therapeutic design system and color palette
  - Create basic layout components and navigation structure
  - Install core dependencies (Framer Motion, Zustand, React Hook Form, TanStack Query, Zod)
  - Configure TypeScript with strict mode and path aliases
  - Build responsive landing page with therapeutic styling
  - **Deliverable:** Visually appealing, responsive website to review design system
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 1.2 Scaffold app structure with placeholder pages

  - Create route group for (auth) section
  - Build authentication pages (login, register, reset-password) with placeholder forms
  - Create main app pages directly under /app (journal, log, parts, parts/[id], profile) with placeholder content
  - Add Navigation component used across main app pages
  - Build placeholder pages with realistic sample data and UI
  - Ensure all navigation links work and pages are accessible
  - **Deliverable:** Complete app structure with working navigation and placeholder pages
  - _Requirements: 10.2, 10.3, 10.4_

## 2. Backend Data Layer

- [x] 2.1 Set up Neon PostgreSQL database with branching

  - Add DATABASE_URL to .env.local (paste the connection string from Neon)
  - Test database connection with a simple Prisma query
  - **Deliverable:** Neon database with branches accessible via connection string
  - _Requirements: 8.3, 8.4, 9.1, 9.2_

- [x] 2.2 Configure Prisma ORM and database schema

  - Initialize Prisma in Next.js project
  - Create Prisma schema based on ERD design
  - Define all core entities (User, JournalEntry, Part, PartAnalysis, PartConversation, PartsOperation)
  - Add database indexes for performance
  - Create initial migration
  - Run migration against Neon development branch
  - Configure database connection utilities in lib/db.ts
  - **Deliverable:** Database schema created and migrated
  - _Requirements: 8.3, 8.4, 9.1, 9.2_

- [x] 2.3 Create seed data for development

  - Create prisma/seed.ts script
  - Generate 2 test users (test@example.com, empty@example.com)
  - For primary test user, create:
    - 10 journal entries spanning 2 weeks
    - 4 discovered parts (one of each type: Protector, Manager, Firefighter, Exile)
    - Part analyses linking entries to parts with quotes
    - 1 parts operation for delete undo testing
  - Run seed script to populate database
  - **Deliverable:** Seeded development database with test data
  - _Requirements: 8.3, 8.4, 9.1, 9.2_

- [x] 2.4 Build basic API routes for data operations

  - Create basic CRUD API routes for journal entries
  - Create basic API routes for parts
  - Test API routes with seeded data
  - **Deliverable:** Working API endpoints to test data persistence
  - _Requirements: 8.3, 8.4, 9.1, 9.2_

## 3. Authentication System

- [x] 3.1 Implement user authentication system

  - Set up NextAuth.js v5 with credentials provider
  - Install bcryptjs for password hashing
  - Create registration and login pages with form validation using App Router
  - Implement secure password hashing with bcryptjs (12 rounds)
  - Add JWT session management and protected route middleware
  - Create password reset functionality with API routes
  - Configure authentication API routes in app/api/auth/
  - Set up route groups and middleware for protected pages
  - **Deliverable:** Complete auth system with user registration, login, and protected routes
  - _Requirements: 8.1, 8.2, 8.5, 8.6_

## 4. Core Journaling Interface

- [x] 4.1 Build journal writing interface

  - Create distraction-free writing component with word count
  - Implement optimistic UI for instant saving without blocking
  - Add background sync to database with TanStack Query
  - Create journal entry save/update API routes in app/api/journal/
  - Build journal page using App Router in app/(dashboard)/journal/
  - Add basic prompt display (static prompts for now)
  - Implement toast notifications for save success/errors
  - Ensure no loading states block writing or navigation
  - **Deliverable:** Functional journaling interface with instant, non-blocking saves
  - _Requirements: 2.1, 2.2, 2.5, 11.2, 11.6_

## 5. Voice Input Integration

- [x] 5.1 Add Web Speech API integration

  - Integrate Web Speech API for speech-to-text functionality
  - Add microphone button with visual feedback and permissions handling
  - Hide microphone button entirely in unsupported browsers
  - Implement voice input controls (start/stop/pause)
  - Add error handling for permissions
  - **Deliverable:** Voice-to-text functionality in supported browsers
  - _Requirements: 2.2_

## 6. AI-Powered Journaling Tips

- [x] 6.1 Implement AI prompt generation and writing tips system

  - Set up OpenAI API integration
  - Create editable prompt template system in lib/prompts/ directory
  - Create journal-prompt-generation.md and writing-tips.md template files
  - Build prompt template loader utility in lib/ai/prompt-loader.ts
  - Build daily prompt generation API routes in app/api/prompts/
  - Create small writing tips sidebar component with 3-second debounce
  - Implement toggle functionality for tips display with user preferences
  - Add explicit error handling for OpenAI API failures
  - Show clear error messages with retry button when API is unavailable
  - Add fallback prompts for API failures
  - **Deliverable:** AI-generated prompts and real-time writing tips with error handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.3, 2.4, 7.1, 7.2_

## 7. Journal History and Log

- [x] 7.1 Create journal log with visualization

  - Build chronological journal entries display
  - Integrate Chart.js for frequency visualization
  - Create bar chart showing which days had journal entries
  - Add text search functionality to filter entries by content
  - Add parts filter dropdown to show entries where specific parts appear
  - Implement client-side filtering for instant results
  - Show entry count when filters are active
  - Add "Clear filters" button
  - **Deliverable:** Complete journal history with activity visualization, search, and parts filtering
  - _Requirements: 6.1, 6.7, 6.8_

## 8. Parts Analysis and Discovery

- [ ] 8.1 Create parts analysis and discovery system

  - Create parts-analysis.md prompt template file with:
    - Instructions to receive existing parts as context (names, roles, descriptions, quotes)
    - **Priority instruction: FIRST match expressions to existing parts, THEN consider new parts**
    - Only create new parts when no existing part matches above 75% similarity
    - Maximum 3 new parts per entry, maximum 5 per batch
    - Sentence-based quote extraction (complete sentences only)
  - Build AI-powered parts analysis using OpenAI GPT-4.5 (o1)
  - Implement asynchronous background analysis triggered after journal save (fire and forget, no polling)
  - Add analysisStatus field to JournalEntry model (pending, processing, completed, failed)
  - Create background analysis API route in app/api/journal/entries/[id]/analyze/
  - Implement priority-based matching:
    - Fetch all existing parts for the user
    - Pass existing parts to AI prompt as context
    - AI FIRST attempts to match each expression to existing parts
    - AI ONLY creates new parts if no existing part matches above 75% similarity
    - Update existing parts with new quotes when matched
  - Implement duplicate detection with similarity scoring:
    - Name similarity check (80% threshold using Levenshtein distance)
    - Role matching (exact match required)
    - Description keyword overlap (minimum 2 shared keywords)
    - Overall similarity score (75% threshold for matching)
    - Weighted scoring: name (50%), role (25%), keywords (25%)
  - Implement analysis limits:
    - Maximum 3 new parts per single entry
    - Maximum 5 new parts per batch analysis
    - Prioritize highest confidence parts when limits reached
  - Create parts categorization (Protector, Manager, Firefighter, Exile)
  - Add logic to replace lowest confidence part when 11th part is identified
  - Extract and store complete sentences as meaningful quotes
  - Create parts analysis API routes in app/api/parts/
  - Add manual "Analyze" button for failed analyses
  - Implement parts highlighting in journal log using assigned colors
  - Add hover tooltips showing part names and click navigation
  - **Deliverable:** Automatic non-blocking parts discovery with highlighted journal entries, strict duplicate prevention, and analysis limits
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 6.2, 6.3, 6.4, 6.5_

## 9. Parts Catalog and Management

- [ ] 9.1 Build parts catalog interface and management

  - Create visual grid displaying all discovered parts with color-coding
  - Add part statistics (appearances, recent expressions)
  - Build individual part detail pages using App Router dynamic routes
  - Create parts pages in app/(dashboard)/parts/ and app/(dashboard)/parts/[id]/
  - Create parts-reanalysis.md prompt template file
  - Add "Reanalyze All Parts" comprehensive review feature
  - Implement parts deletion with journal highlight updates
  - Build parts editing capabilities for names and descriptions
  - Implement PartsOperation tracking for delete operations only
  - Create simple undo system for delete with 24-hour expiration
  - Add toast notifications with "Undo" button after delete
  - Build undo API endpoint in app/api/parts/operations/[id]/undo/
  - Implement state restoration logic for delete undo
  - **Deliverable:** Complete parts management system with catalog, editing, and delete undo
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [ ] 9.2 Add interactive treemap visualization to parts page

  - Install recharts library for treemap visualization
  - Create PartsTreemap component in components/parts/
  - Transform parts data into treemap format (name, size, color, partId, role)
  - Configure Recharts Treemap component with:
    - Custom cell colors from part.color
    - Responsive container (400px desktop, 300px mobile)
    - Rounded corners and shadow matching design system
  - Implement hover tooltips showing part name, role, and appearance count
  - Add click handlers to navigate to /parts/[id] on rectangle click
  - Replace Activity Overview section on /parts page with PartsTreemap
  - Hide treemap when no parts exist (show empty state instead)
  - Ensure parts grid remains below treemap
  - **Deliverable:** Interactive treemap visualization replacing Activity Overview
  - _Requirements: 4.12, 4.13, 4.14, 4.15, 4.16_

## 10. Parts Conversation Interface

- [x] 10.1 Build part conversation interface

  - Create part-conversation.md prompt template file
  - Create chat-style conversation component
  - Implement OpenAI GPT-4.5 (o1) integration for part responses
  - Add conversation context from journal history
  - Build session-based conversation persistence
  - Add typing indicators and loading states
  - Create conversation API routes in app/api/conversations/
  - Add explicit error handling for OpenAI API failures with retry button
  - Show clear error messages when API is unavailable
  - **Deliverable:** Interactive conversations with discovered parts and error handling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

## 11. Account Management and Security

- [ ] 11.1 Build user profile and account management

  - Create user profile management interface
  - Implement account deletion with confirmation flow and immediate hard delete
  - Add data export functionality (JSON format)
  - Add comprehensive input validation and sanitization
  - Implement CSRF protection and security headers middleware
  - Create audit logging for sensitive operations
  - **Deliverable:** Complete account management with security features
  - _Requirements: 8.7, 8.8, 9.3, 9.4, 9.5, 9.6_

## 12. Production Deployment

### ⚠️ MANUAL SETUP REQUIRED: Vercel Deployment

**Before starting this section, you need to:**

1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables in Vercel dashboard:
   - `DATABASE_URL` - Get from Neon `main` branch connection string
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your production URL (e.g., https://ifs-journal.vercel.app)
   - `OPENAI_API_KEY` - Same key from development
   - `NODE_ENV` - Set to "production"
5. Keep Vercel dashboard open for deployment monitoring

- [ ] 12.1 Deploy application to production

  - Click "Deploy" in Vercel dashboard
  - Wait for build to complete (watch for any build errors)
  - Run production database migrations on Neon `production` branch
  - Test the deployed application thoroughly
  - Set up custom domain (optional)
  - Set up monitoring and error tracking (optional: Sentry)
  - Verify end-to-end functionality in production
  - **Deliverable:** Live, production-ready application
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

## 13. Performance Optimization

- [ ] 13.1 Implement performance optimization

  - Add database indexes for common queries
  - Implement API response caching where appropriate
  - Optimize bundle size and loading times
  - Add basic usage monitoring
  - **Deliverable:** Optimized app with performance improvements
  - _Requirements: 11.1, 11.3, 11.4_

## Optional Testing Tasks

- [ ]\* 14.1 Set up testing framework

  - Configure Jest and React Testing Library
  - Create unit tests for core components
  - Add integration tests for API endpoints
  - Set up Playwright for E2E testing
  - _Requirements: All requirements need testing coverage_

- [ ]\* 14.2 Create comprehensive test coverage
  - Write tests for authentication flows
  - Test journal entry creation and management
  - Test parts analysis and conversation features
  - Add performance and accessibility tests
  - _Requirements: All requirements need testing coverage_

## Success Criteria

Each section should deliver a working product that can be tested and demonstrated:

1. **UI Framework:** Beautiful, responsive design to review
2. **Backend:** Working database with data persistence
3. **Authentication:** Complete user system with protected routes
4. **Journaling:** Functional writing interface with auto-save
5. **Voice Input:** Speech-to-text functionality
6. **AI Tips:** Real-time writing guidance and prompts
7. **Journal Log:** History with streak visualization
8. **Parts Analysis:** Automatic discovery with highlighting
9. **Parts Catalog:** Management interface for parts
10. **Conversations:** Interactive part dialogues
11. **Account Management:** User profile and security features
12. **Deployment:** Live production application
13. **Performance:** Optimized app with performance improvements
