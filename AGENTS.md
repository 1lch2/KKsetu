# AGENTS.md - KKSetu Project Guide

> This document provides coding standards and project context for AI agents working in this repository.

## Project Overview

KKSetu is a serverless image gallery SPA built with React 19, TypeScript, and Cloudflare Workers. It extracts images from TXT files and Xiaohongshu (小红书) posts.

## Build Commands

```bash
# Development server (port 3000)
npm start

# Cloudflare Wrangler dev
npm run dev

# Production build
npm run build

# Type checking (no tests configured)
npx tsc --noEmit
```

## Path Aliases

Configured in `tsconfig.json` and `webpack.config.js`:

| Alias | Path |
|-------|------|
| `@/*` | `src/*` |
| `@components/*` | `src/components/*` |
| `@hooks/*` | `src/hooks/*` |
| `@utils/*` | `src/utils/*` |
| `@styles/*` | `src/styles/*` |
| `@types/*` | `src/types/*` |

**Usage:**
```typescript
import Header from '@components/Header/Header';
import { BASE_URL } from '@utils/constants';
import { useQuery } from '@tanstack/react-query';
```

## Code Style

### Prettier Configuration

- **Print width:** 100 characters
- **Tab width:** 2 spaces
- **Semicolons:** Always
- **Quotes:** Single quotes for JS/TS, single quotes for JSX
- **Trailing commas:** ES5
- **Bracket spacing:** True
- **Arrow parens:** Always

### Formatting Examples

```typescript
// Good: Single quotes, semicolons, trailing commas
const config = {
  name: 'kksetu',
  version: '1.0.0',
};

// Good: Arrow functions with parens
const fetchData = async (id: string) => {
  return await fetch(`/api/${id}`);
};

// JSX with single quotes
<div className='container'>
  <input type='text' placeholder='Enter text...' />
</div>
```

## TypeScript Standards

### Type Definitions

- Use `interface` for object types
- Use `type` for unions, primitives, utility types
- Export interfaces from `src/types/index.ts`
- Use JSDoc comments for documentation

```typescript
// Good: Interface with JSDoc
export interface Metadata {
  /** A unique ID (e.g., UUID) linking to the image blob. */
  id: string;
  /** User-provided rating for the content. */
  rating: 'safe' | 'nsfw';
}
```

### Component Typing

```typescript
// Preferred: Simple function declaration (no React.FC)
const Header = () => {
  return <header className='header'>...</header>;
};

// Also acceptable: With React.FC
const Header: React.FC = () => {
  return <header className='header'>...</header>;
};

// With props
interface HeaderProps {
  title: string;
}

const Header = ({ title }: HeaderProps) => {
  return <header className='header'>{title}</header>;
};
```

### Error Handling

```typescript
// Good: Typed catch with console logging
try {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return await res.json();
} catch (err: any) {
  console.error('Request failed', err);
  return null;
}

// NEVER: Empty catch blocks
try {
  // ...
} catch (e) {} // FORBIDDEN
```

## Component Structure

### Directory Layout

```
src/components/
├── ComponentName/
│   ├── ComponentName.tsx      # Main component file
│   ├── ComponentName.css      # Co-located styles
│   └── __internal__/          # Private sub-components
│       └── SubComponent/
│           └── SubComponent.tsx
```

### Import Ordering

```typescript
// 1. React and external libraries
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal aliases (sorted by alias)
import Header from '@components/Header/Header';
import { BASE_URL } from '@utils/constants';

// 3. Relative imports
import ImageContainer from '../ImageContainer/ImageContainer';

// 4. Styles (last)
import './ComponentName.css';
```

## Hooks Pattern

```typescript
// src/hooks/useGetXhsImages.ts
import { useQuery } from '@tanstack/react-query';

export const useGetXhsImages = (shareContent: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['xiaohongshu', shareContent],
    queryFn: async () => {
      return await getXhsImageUrls(shareContent);
    },
    enabled: shareContent.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    imageUrls: data || [],
    isLoading,
    error,
  };
};
```

## Cloudflare Workers Functions

### Structure

Functions live in `functions/api/` directory. File name becomes the API route.

```
functions/api/fetchXhsImageUrls.ts → /api/fetchXhsImageUrls
```

### Handler Pattern

```typescript
// functions/api/example.ts
export const onRequestGet: PagesFunction = async (
  context: EventContext<Env, any, any>
) => {
  const { request } = context;
  const url = new URL(request.url);
  const param = url.searchParams.get('param');

  if (!param) {
    return new Response(JSON.stringify({ error: 'Missing param' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Processing logic
    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

## CSS Standards

### CSS Variables

Defined in `src/styles/global.css`:

```css
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --background-color: #f8f9fa;
  --font-color: #333;
  --card-background: #ffffff;
  --card-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  --border-color: #dee2e6;
  --success-color: #28a745;
  --warning-color: #dc3545;
}
```

### Usage

```css
/* ComponentName.css */
.component-name {
  background-color: var(--card-background);
  color: var(--font-color);
  box-shadow: var(--card-shadow);
}
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `XiaohongshuExtractPage` |
| Files (components) | PascalCase | `Header.tsx` |
| Hooks | camelCase with `use` prefix | `useGetXhsImages` |
| Utilities | camelCase | `extractPostInfo` |
| CSS classes | kebab-case | `image-container` |
| Constants | SCREAMING_SNAKE_CASE | `BASE_URL` |
| Interfaces | PascalCase | `Metadata`, `PostInfo` |

## Technology Stack

- **Frontend:** React 19, TypeScript, React Router DOM 7
- **State Management:** TanStack Query v5
- **Styling:** Plain CSS with CSS variables
- **Build:** Webpack 5, Babel, ts-loader
- **Backend:** Cloudflare Workers (Pages Functions)
- **Database:** Cloudflare D1 (SQLite) - prepared but not active

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root component with Router |
| `src/index.js` | Entry point |
| `src/types/index.ts` | Shared TypeScript interfaces |
| `src/utils/constants.ts` | Environment-aware base URL |
| `tsconfig.json` | TypeScript config (strict mode) |
| `webpack.config.js` | Development webpack config |
| `webpack.prod.js` | Production webpack config |
| `wrangler.json` | Cloudflare Workers config |

## Deployment

```bash
# Deploy to Cloudflare Pages
npx wrangler pages deploy

# Generate Cloudflare types
wrangler types --path=./functions/types.d.ts
```

## Constraints

- **No type suppression:** Never use `as any`, `@ts-ignore`, or `@ts-expect-error`
- **No empty catch blocks:** Always handle errors
- **No ESLint:** Use `npx tsc --noEmit` for type checking
- **Semicolons always:** Required by Prettier config
