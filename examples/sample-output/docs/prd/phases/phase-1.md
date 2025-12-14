# Phase 1: Foundation

## Overview
Set up the project foundation including Next.js configuration, database connection, and core type definitions.

## Entry Criteria
- Clean project directory
- Node.js 18+ installed
- PostgreSQL database available

## Tasks

### 1. Initialize Next.js Project
**ID:** `phase1-task1`
**Dependencies:** None
**Parallelizable:** No

Initialize a new Next.js 14 project with TypeScript, ESLint, and Tailwind CSS.

**Acceptance Criteria:**
- Project runs with `npm run dev`
- TypeScript compilation succeeds
- Tailwind classes work in components

**Files to create:**
- `package.json`
- `tsconfig.json`
- `tailwind.config.js`
- `src/app/page.tsx`

---

### 2. Set Up Database
**ID:** `phase1-task2`
**Dependencies:** `phase1-task1`
**Parallelizable:** No

Configure Prisma ORM with PostgreSQL connection.

**Acceptance Criteria:**
- Prisma client generates without errors
- Can connect to database
- Migrations run successfully

**Files to create:**
- `prisma/schema.prisma`
- `.env` (database URL)

---

### 3. Define Core Data Models
**ID:** `phase1-task3`
**Dependencies:** `phase1-task2`
**Parallelizable:** No

Create Prisma models for User, Task, and Category.

**Acceptance Criteria:**
- Models have proper relationships
- Timestamps auto-populate
- Indexes on frequently queried fields

**Models:**
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  tasks     Task[]
  createdAt DateTime @default(now())
}

model Task {
  id          String    @id @default(cuid())
  title       String
  description String?
  completed   Boolean   @default(false)
  dueDate     DateTime?
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Category {
  id    String @id @default(cuid())
  name  String
  color String
  tasks Task[]
}
```

---

### 4. Create Base API Structure
**ID:** `phase1-task4`
**Dependencies:** `phase1-task3`
**Parallelizable:** No

Set up the API route structure with error handling.

**Acceptance Criteria:**
- API routes respond to requests
- Error handling returns proper status codes
- CORS configured for development

**Files to create:**
- `src/app/api/health/route.ts`
- `src/lib/api-utils.ts`

---

## Exit Criteria
- [ ] `npm run build` succeeds
- [ ] Database connection verified
- [ ] `/api/health` returns 200
- [ ] All models defined in Prisma schema

## Completion Checklist
When all tasks are done, run `/checkpoint` to save progress.
