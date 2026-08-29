# StudySphere

## Overview
StudySphere is a collaborative study platform built with React, TypeScript, Vite, and Supabase. It provides features for tracking study sessions, managing tasks, connecting with friends, and organizing study groups.

## Tech Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS
- **Backend/Database**: Supabase
- **Icons**: Lucide React

## Project Structure
```
src/
├── components/     # React UI components
│   ├── AuthPage.tsx          # Authentication pages
│   ├── Calendar.tsx          # Calendar view
│   ├── Timer.tsx             # Study timer (Pomodoro)
│   ├── TodoList.tsx          # Task management
│   ├── FriendsList.tsx       # Social features
│   ├── Profile.tsx           # User profile
│   └── ...                   # More components
├── hooks/          # Custom React hooks
├── lib/            # Supabase client configuration
├── services/       # API service functions
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
public/             # Static assets
supabase/           # Database migrations
```

## Key Features
- User authentication with Supabase
- Pomodoro timer for focused study sessions
- Task/todo management
- Study calendar and scheduling
- Study groups and chat
- Friends list and social features
- Study statistics and leaderboards
- Theme customization
- Break-time mini-games

## Development
- **Dev Command**: `npm run dev`
- **Port**: 5000
- **Build**: `npm run build`

## Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous API key

## Deployment
Uses static deployment with `dist` as the public directory after running `npm run build`.

## Recent Changes
- December 7, 2025: Initial setup for Replit environment from Bolt export
