# WGYS - Youth Sports Management System

A comprehensive React + TypeScript application for managing youth sports teams, built with Vite and Firebase.

## Features

- **Team Management**: Create and manage youth sports teams with budgets
- **Announcements**: Create, publish, and manage team announcements with rich text editor
- **Comments System**: Facebook/Instagram style commenting on announcements
- **User Authentication**: Firebase Auth with role-based permissions (admin/owner/user)
- **Real-time Database**: Firebase Realtime Database for live updates
- **Responsive Design**: Ant Design components with dark/light theme support
- **Professional UI**: Clean, modern interface optimized for sports management

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: Ant Design
- **Backend**: Firebase (Auth + Realtime Database)
- **Deployment**: GitHub Pages with GitHub Actions
- **Rich Text**: Lexical Editor
- **State Management**: Redux Toolkit

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Realtime Database enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/[username]/wgys.git
cd wgys
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure Firebase credentials in `.env.local`:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

5. Deploy Firebase security rules:
```bash
firebase deploy --only database
```

6. Start development server:
```bash
npm run dev
```

## Deployment

The app automatically deploys to GitHub Pages when pushing to the main branch. 

### Setup GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## User Roles

- **Owner**: Full system access
- **Admin**: Manage announcements, teams, and users
- **User**: View announcements, manage own teams, post comments

## Security

- Firebase security rules restrict announcement creation/editing to admin/owner roles
- Environment variables secured via GitHub Secrets
- Authentication required for all database operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

West Georgia Youth Sports, Inc. @Copyright 2025. All Rights Reserved.
Unauthorized copying of this file, via any medium is strictly prohibited.