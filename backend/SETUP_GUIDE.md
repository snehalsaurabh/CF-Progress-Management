# Setup Guide

## Prerequisites
- Node.js (v18+)
- MongoDB (v5+)
- npm or yarn

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd backend
   npm install
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configurations
   ```

3. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo

   # Or start local MongoDB service
   mongod
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Test API**
   - Server: http://localhost:5000
   - Health: http://localhost:5000/api/health

## Build for Production
```bash
npm run build
npm start
```
```

## Git Commit Message

Here's the appropriate commit message for your current progress:
