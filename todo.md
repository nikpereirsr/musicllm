# Music Manager & AI Studio - TODO

## Core Features

- [x] Home screen with stats and quick actions
- [x] Library screen with song list, search, and filter
- [x] Genre view and genre-based sorting
- [ ] Song detail screen with metadata display
- [ ] Lyrics generator with AI integration
- [ ] Cover art generator with AI integration
- [x] Playlist creation and management
- [x] Settings screen with theme toggle
- [x] Tab navigation (Home, Library, Genres, Playlists, Settings)
- [ ] SFTP music import system
- [ ] Parse metadata from .txt files
- [ ] Genre detection/analysis from song content
- [ ] Download and cache MP3 files locally

## UI Components

- [x] Song card component
- [x] Genre badge component
- [x] Playlist card component
- [x] AI generation loading state
- [x] Image gallery/preview component

## Data Management

- [ ] Local music library storage (AsyncStorage)
- [ ] Song metadata structure (title, artist, genre, lyrics, cover art)
- [ ] Playlist data persistence
- [ ] Genre categorization system
- [ ] SFTP connection configuration
- [ ] Metadata parsing from Suno AI format
- [ ] Genre inference from lyrics and prompt

## API Integration

- [ ] OpenAI API setup for lyrics generation
- [ ] OpenAI API setup for cover art generation
- [ ] SFTP connection and file transfer
- [ ] Error handling for API calls
- [ ] Loading states during generation
- [ ] Genre inference API (or local ML model)

## Branding & Polish

- [x] Generate custom app logo and icon
- [x] Update app.config.ts with branding
- [x] Theme customization (colors, fonts)
- [x] Dark mode support
- [ ] Haptic feedback on interactions

## Testing & Delivery

- [ ] Test all user flows end-to-end
- [ ] Verify API integrations work correctly
- [ ] Test on iOS and Android
- [ ] Create checkpoint for delivery

## Phase 2.5 - SFTP Connection & Refresh Features

- [x] Test SFTP connection before saving library
- [x] Refresh individual library to sync music list
- [x] Show connection status (success/error feedback)
- [x] Loading states during connection test and refresh

## Phase 3 - Backend SFTP Integration

- [x] Create SFTP service with ssh2 library
- [x] Build tRPC API endpoints for SFTP operations
- [x] Implement testConnection endpoint
- [x] Implement listMusicFiles endpoint
- [x] Implement syncLibrary endpoint with metadata parsing
- [x] Integrate with Settings screen
- [x] Add comprehensive unit tests (25 tests passing)
- [ ] Test with real SFTP server connection


## Phase 3.5 - Debug SFTP Connection

- [ ] Fix test connection not showing feedback
- [ ] Debug SFTP connection timeout issues
- [ ] Verify ssh2 library is working correctly
- [ ] Test with real SFTP server (71.117.153.94:3456)
- [ ] Fix metadata parsing from .txt files
- [ ] Ensure songs load into library

## Bugs - Reported by User

- [ ] Delete library trash icon button not working (no alert, no deletion)
- [ ] Clear All Data button does nothing
- [ ] SSH sync library still not importing songs

## Local Sample Songs

- [ ] Extract sample MP3 and TXT files from user-provided zip
- [ ] Parse metadata from TXT files and create song entries
- [ ] Serve MP3 files from backend for playback
- [ ] Load songs into Library, Genres, and Home screens
- [ ] Build music player with playback controls
