# IFS Journal App - Requirements Document

## Introduction

The IFS Journal App is a web-based journaling application designed to help users discover and understand their internal parts through guided writing, based on Internal Family Systems (IFS) therapy principles. The app uses AI to generate personalized prompts, analyze journal entries for parts expressions, and facilitate conversations with identified parts.

## Glossary

- **IFS (Internal Family Systems)**: A therapeutic approach that views the mind as having multiple parts with different roles and characteristics
- **Parts**: Different aspects of personality (Protectors, Managers, Firefighters, Exiles) that have distinct voices and functions
- **Self**: The core, undamaged essence that can lead and heal the internal system
- **Journal Entry**: A written response to a daily prompt that captures thoughts, feelings, and internal dialogue
- **Parts Analysis**: AI-powered identification of internal parts expressions within journal text
- **Part Conversation**: Interactive dialogue between user and an AI representation of their internal part
- **User Account**: Individual user profile with secure authentication and isolated data storage
- **Multi-tenant System**: Architecture supporting multiple users with complete data isolation

## Requirements

### Requirement 1: Daily Prompt Generation

**User Story:** As a user who struggles with knowing what to write about, I want to receive personalized daily journal prompts that help me discover my internal parts, so that I can engage in meaningful self-reflection without creative blocks.

#### Acceptance Criteria

1. WHEN a user visits the journaling tab, THE IFS_Journal_App SHALL generate a personalized prompt based on their previous entries and IFS principles
2. WHEN a user requests a new prompt, THE IFS_Journal_App SHALL provide a different prompt that avoids recent duplicates
3. WHILE generating prompts, THE IFS_Journal_App SHALL use context from the user's last 15 journal entries to create relevant suggestions
4. THE IFS_Journal_App SHALL ensure prompts focus on concrete situations and feelings rather than abstract concepts
5. THE IFS_Journal_App SHALL keep prompts under 100 words and conversational in tone

### Requirement 2: Journal Entry Creation and Management

**User Story:** As a user engaging in IFS work, I want to write and save journal entries with helpful guidance, so that I can explore my internal parts naturally through writing.

#### Acceptance Criteria

1. THE IFS_Journal_App SHALL provide a distraction-free writing interface with word count tracking
2. THE IFS_Journal_App SHALL support speech-to-text input for hands-free journaling
3. WHEN a user is writing, THE IFS_Journal_App SHALL optionally provide live writing tips to help explore parts more deeply
4. THE IFS_Journal_App SHALL allow users to toggle writing tips on/off based on their preference
5. WHEN a user saves an entry, THE IFS_Journal_App SHALL store it with the associated prompt and timestamp
6. THE IFS_Journal_App SHALL save journal entries optimistically without blocking the user interface
7. THE IFS_Journal_App SHALL automatically trigger parts analysis in the background after an entry is saved
8. THE IFS_Journal_App SHALL not block user navigation or writing while parts analysis is processing

### Requirement 3: Automatic Parts Discovery and Analysis

**User Story:** As a user who struggles to identify my internal parts, I want the app to automatically analyze my writing and identify parts expressions, so that I can understand my internal system without forcing the process.

#### Acceptance Criteria

1. WHEN a journal entry is saved, THE IFS_Journal_App SHALL analyze the content for internal parts expressions using existing parts as context
2. THE IFS_Journal_App SHALL process parts analysis asynchronously in the background without blocking the user
3. THE IFS_Journal_App SHALL track analysis status for each journal entry (pending, processing, completed, failed)
4. THE IFS_Journal_App SHALL identify and categorize parts as Protectors, Managers, Firefighters, or Exiles
5. THE IFS_Journal_App SHALL maintain a maximum of 10 distinct parts to ensure quality over quantity
6. WHEN similar parts are identified, THE IFS_Journal_App SHALL update existing parts with new quotes and insights rather than create duplicates
7. THE IFS_Journal_App SHALL extract specific quotes and highlight relevant phrases for each identified part
8. THE IFS_Journal_App SHALL use incremental analysis that builds on previous parts understanding for each new entry
9. THE IFS_Journal_App SHALL allow users to retry failed analyses manually

### Requirement 4: Parts Catalog and Management

**User Story:** As a user discovering my internal parts, I want to see an overview of all my identified parts with their characteristics and expressions, and manage them when needed, so that I can understand and curate my internal family system.

#### Acceptance Criteria

1. THE IFS_Journal_App SHALL display all discovered parts in a visual grid with names, roles, and descriptions
2. THE IFS_Journal_App SHALL assign unique colors to each part for consistent visual identification
3. THE IFS_Journal_App SHALL show key quotes and statistics for each part (number of appearances, recent expressions)
4. WHEN a user clicks on a part, THE IFS_Journal_App SHALL navigate to a detailed part view
5. THE IFS_Journal_App SHALL provide a "Reanalyze All Parts" function to comprehensively review the entire journal history
6. THE IFS_Journal_App SHALL allow users to delete parts that are no longer relevant or were incorrectly identified
7. WHEN a part is deleted, THE IFS_Journal_App SHALL update all associated journal entry highlights accordingly
8. WHEN a user deletes a part, THE IFS_Journal_App SHALL create an operation snapshot for undo functionality
9. THE IFS_Journal_App SHALL allow users to undo part deletion within 24 hours of execution
10. WHEN a user undoes a delete, THE IFS_Journal_App SHALL restore the part with all its quotes, analyses, and highlights
11. THE IFS_Journal_App SHALL display an undo notification with action button immediately after part deletion

### Requirement 5: Interactive Part Conversations

**User Story:** As a user working with IFS, I want to have conversations with my identified parts, so that I can understand their needs, fears, and protective strategies in a therapeutic context.

#### Acceptance Criteria

1. WHEN viewing a part detail page, THE IFS_Journal_App SHALL provide a conversation interface
2. THE IFS_Journal_App SHALL generate contextual responses based on the part's previous expressions and journal appearances
3. THE IFS_Journal_App SHALL maintain conversation history within the session
4. THE IFS_Journal_App SHALL ensure part responses stay in character and reflect the part's established voice and concerns
5. THE IFS_Journal_App SHALL keep responses conversational and under 150 words

### Requirement 6: Journal History with Parts Highlighting 

**User Story:** As a user tracking my IFS journey, I want to see all my journal entries with parts expressions highlighted and visualize my journaling frequency over time, so that I can observe patterns, and understand when different parts are active, 

#### Acceptance Criteria

1. THE IFS_Journal_App SHALL display all journal entries in chronological order with full content
2. THE IFS_Journal_App SHALL highlight text phrases that correspond to specific parts using their assigned colors
3. WHEN a user hovers over highlighted text, THE IFS_Journal_App SHALL show a tooltip with the part name
4. WHEN a user clicks highlighted text, THE IFS_Journal_App SHALL navigate to that part's detail page
5. THE IFS_Journal_App SHALL only highlight meaningful phrases, not every word
6. THE IFS_Journal_App SHALL display a visual chart showing which days had journal entries
7. THE IFS_Journal_App SHALL provide a search function to find entries by text content
8. THE IFS_Journal_App SHALL allow users to filter entries by specific parts to see when each part was active

### Requirement 7: AI Prompt Management

**User Story:** As the app owner maintaining therapeutic quality, I want to control and iterate on AI prompts used for journal generation and parts analysis, so that I can ensure consistent therapeutic value and improve the experience over time.

#### Acceptance Criteria

1. THE IFS_Journal_App SHALL store AI prompt templates as files in the code repository
2. THE IFS_Journal_App SHALL prevent end users from modifying system prompts

### Requirement 8: User Authentication and Account Management

**User Story:** As a user of a web-based therapeutic tool, I want to create a secure account and have my data completely isolated from other users, so that my personal journaling remains private and accessible only to me.

#### Acceptance Criteria

1. THE IFS_Journal_App SHALL provide user registration with email and secure password
2. THE IFS_Journal_App SHALL implement secure user authentication with session management
3. THE IFS_Journal_App SHALL ensure complete data isolation between users
4. THE IFS_Journal_App SHALL require authentication for all journal-related functionality
5. THE IFS_Journal_App SHALL provide secure password reset functionality
6. THE IFS_Journal_App SHALL allow users to delete their account and all associated data
7. WHEN a user deletes their account, THE IFS_Journal_App SHALL immediately and permanently remove all journal entries, parts, conversations, and personal data
8. THE IFS_Journal_App SHALL provide clear confirmation and warning before account deletion

### Requirement 9: Data Privacy and Security

**User Story:** As a user sharing personal therapeutic content, I want my data to be secure and private, so that I can write freely without concerns about data misuse or exposure.

#### Acceptance Criteria

1. THE IFS_Journal_App SHALL store all user data in a secure cloud database with encryption
2. THE IFS_Journal_App SHALL not transmit journal content to external services except for AI analysis
3. THE IFS_Journal_App SHALL use environment variables for API keys and sensitive configuration
4. THE IFS_Journal_App SHALL provide clear information about data usage and AI processing
5. THE IFS_Journal_App SHALL allow users to export their data
6. THE IFS_Journal_App SHALL implement proper session security and CSRF protection

### Requirement 10: Responsive User Interface

**User Story:** As a user who journals on different devices, I want the app to work well on desktop and mobile, so that I can access my journaling practice anywhere.

#### Acceptance Criteria

1. THE IFS_Journal_App SHALL provide a responsive design that works on desktop and mobile devices
2. THE IFS_Journal_App SHALL use a tabbed interface for easy navigation between journaling, journal log, and parts views
3. THE IFS_Journal_App SHALL maintain visual consistency with color-coded parts across all interfaces
4. THE IFS_Journal_App SHALL provide intuitive navigation with clear visual feedback
5. THE IFS_Journal_App SHALL optimize the writing interface for distraction-free journaling

### Requirement 11: Performance and Reliability

**User Story:** As a user building a daily journaling habit, I want the app to be fast and reliable, so that technical issues don't interrupt my therapeutic practice.

#### Acceptance Criteria

1. THE IFS_Journal_App SHALL load the main interface within 2 seconds
2. THE IFS_Journal_App SHALL provide immediate feedback when saving journal entries (optimistic UI)
3. THE IFS_Journal_App SHALL complete journal entry saves within 1 second for the user experience
4. THE IFS_Journal_App SHALL handle AI service failures gracefully without losing user data
5. THE IFS_Journal_App SHALL provide clear error messages and recovery options
6. THE IFS_Journal_App SHALL auto-save draft content to prevent data loss

### Requirement 12: Deployment and Continuous Integration

**User Story:** As a developer maintaining the IFS Journal App, I want to deploy updates without downtime to users, so that I can iterate quickly while maintaining service reliability.

#### Acceptance Criteria

1. THE IFS_Journal_App SHALL support zero-downtime deployments
2. THE IFS_Journal_App SHALL use containerized deployment for consistent environments
3. THE IFS_Journal_App SHALL implement database migrations that are backward compatible
4. THE IFS_Journal_App SHALL provide health checks for deployment verification
5. THE IFS_Journal_App SHALL support rollback capabilities in case of deployment issues