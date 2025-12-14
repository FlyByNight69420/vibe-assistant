# Quick-Start PRD Example

This is a minimal PRD example. For comprehensive projects, use `prd-template.md` instead.

---

# Project: [Your Project Name]

## Problem
[What problem are you solving? 1-2 sentences]

## Solution
[High-level description of what you're building. 2-3 sentences]

## Target Users
[Who will use this?]

## Core Features
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

## Tech Stack
- **Frontend:** [e.g., React, Vue, vanilla JS]
- **Backend:** [e.g., Node.js, Python, Go]
- **Database:** [e.g., PostgreSQL, MongoDB, SQLite]
- **Hosting:** [e.g., Vercel, AWS, self-hosted]

## Implementation Phases

### Phase 1: Foundation
- Project setup and configuration
- Database schema
- Basic API structure

### Phase 2: Core Features
- [Main feature implementation]
- [Another key feature]

### Phase 3: Polish & Deploy
- UI/UX improvements
- Testing
- Deployment setup

---

# Example: Simple Blog

## Problem
I want a personal blog but existing platforms are too bloated or too limiting.

## Solution
A minimal, fast blog with markdown support, deployed to Vercel with a simple CMS.

## Target Users
Me (single author), readers (public)

## Core Features
1. Write and publish blog posts in markdown
2. Tag and categorize posts
3. RSS feed for subscribers
4. Simple admin for managing posts

## Tech Stack
- **Frontend:** Next.js 14 with Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** SQLite (via Turso for production)
- **Hosting:** Vercel

## Implementation Phases

### Phase 1: Foundation
- Initialize Next.js project with TypeScript
- Set up Turso database connection
- Create Post model (id, title, slug, content, tags, publishedAt)
- Basic layout component

### Phase 2: Core Features
- Post list page with pagination
- Individual post page with markdown rendering
- Admin page for creating/editing posts
- Tag filtering

### Phase 3: Polish & Deploy
- RSS feed generation
- SEO meta tags
- Deploy to Vercel
- Set up custom domain
