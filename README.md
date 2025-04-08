# Notebook Application Architecture

## Overview

Notebook is a meeting recording and note-taking application that integrates with calendar services to automate the process of recording, transcribing, and organizing meeting information. The application allows users to manage their calendar events, schedule recordings, view past recordings, and share them with colleagues. It was built nearly entirely with lovable.dev.

## Application Structure

The application follows a React-based architecture with the following key components:

1. **Frontend**: React with TypeScript
2. **Styling**: Tailwind CSS and shadcn/ui components
3. **Routing**: React Router for client-side navigation
4. **State Management**: React Query for server state, React hooks for local state
5. **Backend**: Supabase for authentication, database, and edge functions
6. **Third-party Integration**: Nylas API for calendar integration

## Pages

### Dashboard (Index)

**Path**: `/`

**Purpose**: Serves as the landing page after login, providing an overview of recent activity and key statistics.

**Functionality**:
- Displays welcome card with user information
- Shows statistics about recordings and meetings
- Lists recent recordings
- Displays upcoming meetings
- Provides quick access to key application features

**Implementation**:
The Dashboard fetches profile data using React Query to personalize the welcome message. It includes multiple card components (`WelcomeCard`, `StatsCard`, `RecentRecordings`, `UpcomingMeetings`) that display relevant information to the user. The page is wrapped in the `PageLayout` component which provides consistent navigation and layout.

### Authentication (Auth)

**Path**: `/auth`

**Purpose**: Handles user authentication and profile creation.

**Functionality**:
- User login/registration
- Profile creation for new users
- Authentication state management

**Implementation**:
The Auth page checks for an active session when loaded. If a session exists, it verifies if the user has a complete profile. Users without a complete profile are presented with a profile form. This page uses Supabase authentication services and updates the user's profile in the database once completed.

### Calendar

**Path**: `/calendar`

**Purpose**: Displays and manages user's calendar events.

**Functionality**:
- Connect to Nylas API for calendar synchronization
- Display upcoming and past calendar events
- Toggle recording status for events
- Navigate to meeting links

**Implementation**:
The Calendar page requires both authentication and Nylas integration. It first checks if the user has connected their calendar using Nylas. If not, it displays the `ConnectNylas` component. Once connected, it uses React Query to fetch events and displays them in tabs for upcoming and past events. Users can interact with events to toggle recording settings.

### Library

**Path**: `/library`

**Purpose**: Central repository for all recordings.

**Functionality**:
- Filter and search recordings
- View recording details
- Share recordings
- Toggle between different recording views

**Implementation**:
The Library page uses complex filtering and pagination to manage recordings. It separates recordings into "My Recordings", "Shared Recordings", and "Error Recordings" sections. The `RecordingGrid` component displays recordings in a grid layout, and users can select recordings to view details. The page also includes filters for date ranges, meeting types, and participants.

### Recordings

**Path**: `/recordings`

**Purpose**: Focused view for accessing and managing meeting recordings.

**Functionality**:
- Filter recordings by type (All, Internal, External)
- View recording details
- Access meeting information

**Implementation**:
The Recordings page uses React Query to fetch recording data from Supabase. It implements tabs to filter recordings by meeting type (internal vs. external) and displays them using the `RecordingCard` component. The page handles loading states and errors gracefully.

### Recurring Events

**Path**: `/recurring-events`

**Purpose**: Manage recurring calendar events and their recordings.

**Functionality**:
- View all recurring event series
- Access individual event instances
- Add notes to recurring event series

**Implementation**:
This page fetches recurring events from Supabase, identified by their `master_event_id`. It groups events by their master ID and displays information about each series, including the latest and next occurrence. Users can navigate to detailed views of each recurring event series.

### Recurring Event Series

**Path**: `/recurring-event-series/:masterId`

**Purpose**: Detailed view of a specific recurring event series.

**Functionality**:
- Display all instances of a recurring event
- Manage recording settings for the series
- Add and edit notes for the series

**Implementation**:
This page fetches event instances and notes for a specific master event ID. It displays event instances chronologically and allows users to toggle recording settings for the entire series. The notes functionality allows users to maintain persistent notes across all instances of a recurring event.

### Settings

**Path**: `/settings/*`

**Purpose**: Manage application settings and configurations.

**Functionality**:
- General settings
- Organization settings
- Recording preferences
- Sharing preferences
- Manual sync options
- Notetaker settings
- Webhook configurations

**Implementation**:
The Settings page uses nested routing to provide access to various configuration sections. Each section is implemented as a separate component that handles its specific settings. The page includes a sidebar for navigation between settings categories. User settings are stored in and retrieved from Supabase.

### Shared

**Path**: `/shared/:token`

**Purpose**: Public access to shared recordings.

**Functionality**:
- View shared recordings via token-based access
- Play video and audio recordings
- View meeting information without requiring authentication

**Implementation**:
This page fetches shared recording information using a token from the URL. It renders the `SharedVideoView` component which handles authentication-free access to shared recordings. The implementation ensures security while providing easy access to shared content.

## Key Components

### Authentication

Authentication is managed through Supabase Auth. The application includes:
- `AuthGuard` component to protect routes
- Login and registration flows
- Profile management
- Organization membership management

### Nylas Integration

The application integrates with Nylas for calendar access:
- OAuth authentication flow
- Calendar event synchronization
- Real-time updates via webhooks
- Event management

### Recording Management

Recording functionality includes:
- Scheduling recordings through Nylas calendar integration
- Capturing meeting content
- Video and audio processing
- Transcription services
- Storage in Supabase

### Sharing Functionality

The application provides multiple sharing options:
- Direct links with access tokens
- Email sharing
- Organization-level sharing
- Access control and permissions

## Database Structure

The Supabase database includes tables for:
- User profiles
- Organizations and members
- Calendar events
- Recordings
- Transcripts
- Sharing settings
- Webhook logs

## Frontend Architecture

### Component Organization

Components are organized by feature and functionality:
- Layout components (`Navbar`, `Footer`, `PageLayout`)
- Page-specific components (grouped by page)
- Shared/common components
- UI components (using shadcn/ui)

### State Management

- React Query for server state and data fetching
- React hooks for local state management
- Context API for shared state (authentication, etc.)

### Routing

The application uses React Router for navigation:
- Route-based code splitting
- Nested routes for complex pages
- Protected routes via guard components

## Real-time Features

The application leverages Supabase's real-time capabilities for:
- Calendar event updates
- Recording status changes
- Notification delivery

## Conclusion

The Notebook application architecture combines modern React patterns with Supabase's backend capabilities to create a cohesive meeting management platform. The modular structure allows for easy maintenance and future enhancements while providing a responsive and intuitive user experience.
