# Music Manager & AI Studio - Design Plan

## Overview

A mobile music management app that allows users to organize their music library, sort by genre, generate AI lyrics, and create cover art. Built for iOS-style first-party experience with one-handed usage on portrait orientation (9:16).

## Screen List

1. **Home Screen** - Music library overview with quick actions
2. **Library Screen** - Browse all songs with search and filter options
3. **Genre View** - Organize and view music by genre categories
4. **Song Detail Screen** - View song information, lyrics, and cover art
5. **Lyrics Generator Screen** - AI-powered lyrics generation interface
6. **Cover Art Generator Screen** - AI-powered cover art creation
7. **Playlist Screen** - Create and manage custom playlists
8. **Settings Screen** - App preferences and configuration

## Primary Content and Functionality

### Home Screen
- **Content**: Quick stats (total songs, genres count), featured songs carousel, quick action buttons
- **Functionality**: 
  - Display total songs in library
  - Show recently added/played songs
  - Quick access to Generator features (Lyrics, Cover Art)
  - Navigation to Library, Playlists, and Settings

### Library Screen
- **Content**: Scrollable list of all songs with metadata (title, artist, duration, genre)
- **Functionality**:
  - Search by song title or artist
  - Filter by genre
  - Sort by name, artist, date added, or genre
  - Tap song to view details
  - Swipe to add to playlist or delete

### Genre View
- **Content**: Grid or list of genre categories with song count
- **Functionality**:
  - Tap genre to see all songs in that category
  - Auto-detect genres from metadata
  - Manual genre assignment option
  - Visual genre badges with colors

### Song Detail Screen
- **Content**: Song cover art, title, artist, duration, genre, lyrics display
- **Functionality**:
  - View full song metadata
  - Display lyrics (if available)
  - Generate new lyrics via AI
  - Generate cover art via AI
  - Add to playlist
  - Share song

### Lyrics Generator Screen
- **Content**: Input field for song prompt/description, AI-generated lyrics display
- **Functionality**:
  - Input song theme, mood, or description
  - Generate lyrics using OpenAI API
  - Copy generated lyrics to clipboard
  - Save lyrics to song metadata
  - Regenerate with different prompts

### Cover Art Generator Screen
- **Content**: Input field for art description, AI-generated image display
- **Functionality**:
  - Input art style, mood, or description
  - Generate cover art using OpenAI API
  - Preview generated image
  - Save to song metadata
  - Regenerate with different prompts

### Playlist Screen
- **Content**: List of created playlists with song counts
- **Functionality**:
  - Create new playlist
  - View playlist contents
  - Add/remove songs from playlist
  - Delete playlist
  - Share playlist

### Settings Screen
- **Content**: App preferences, about section
- **Functionality**:
  - Dark/Light mode toggle
  - Notification preferences
  - About app information
  - Clear cache option

## Key User Flows

### Flow 1: Browse and Organize Music
1. User opens app → Home Screen
2. User taps "Library" → Library Screen
3. User can search/filter/sort songs
4. User taps song → Song Detail Screen
5. User can add to playlist or view/generate lyrics

### Flow 2: Generate AI Lyrics
1. User navigates to Song Detail Screen
2. User taps "Generate Lyrics" button
3. App navigates to Lyrics Generator Screen
4. User enters song theme/description
5. AI generates lyrics
6. User can copy, save, or regenerate
7. Lyrics saved to song metadata

### Flow 3: Generate AI Cover Art
1. User navigates to Song Detail Screen
2. User taps "Generate Cover Art" button
3. App navigates to Cover Art Generator Screen
4. User enters art description/style
5. AI generates cover art image
6. User can preview, save, or regenerate
7. Cover art saved to song metadata

### Flow 4: Organize by Genre
1. User taps "Genres" tab
2. Genre View displays all genres
3. User taps genre → filtered Library Screen
4. User sees all songs in that genre
5. User can sort and manage songs within genre

## Color Choices

- **Primary**: `#0a7ea4` (Vibrant Blue) - Main accent, buttons, active states
- **Background**: `#ffffff` (Light) / `#151718` (Dark) - Screen background
- **Surface**: `#f5f5f5` (Light) / `#1e2022` (Dark) - Cards, elevated surfaces
- **Foreground**: `#11181C` (Light) / `#ECEDEE` (Dark) - Primary text
- **Muted**: `#687076` (Light) / `#9BA1A6` (Dark) - Secondary text
- **Success**: `#22C55E` (Green) - Success states, confirmations
- **Warning**: `#F59E0B` (Amber) - Warnings, cautions
- **Error**: `#EF4444` (Red) - Errors, destructive actions

### Genre Color Palette (for visual distinction)
- Rock: `#E74C3C` (Red)
- Pop: `#E91E63` (Pink)
- Hip-Hop: `#9C27B0` (Purple)
- Jazz: `#3498DB` (Blue)
- Classical: `#2ECC71` (Green)
- Electronic: `#F39C12` (Orange)
- R&B: `#1ABC9C` (Teal)
- Country: `#D4A574` (Brown)

## Design Principles

- **One-handed usage**: All interactive elements reachable with thumb
- **iOS-first**: Follow Apple HIG for consistent native feel
- **Minimal cognitive load**: Clear hierarchy, obvious navigation
- **Responsive feedback**: Haptic feedback on interactions, loading states visible
- **Accessibility**: High contrast, readable text sizes, clear labels
