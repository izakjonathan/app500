# Deployment

Final production baseline based on the working V155 deployment.

## Vercel settings

Install Command:

```text
npm install --legacy-peer-deps --no-audit --no-fund
```

Build Command:

```text
npm run vercel-build
```

Node:

```text
20.x
```

## Supabase setup

Run these schema files in Supabase SQL Editor:

```text
SUPABASE_SCHEMA.sql
SUPABASE_MULTI_GAME_SCHEMA.sql
SUPABASE_GAME_LIBRARY_SCHEMA.sql
```

## Final test checklist

```text
Create 2-player game
Create 4-player game
Share invite link to another phone
Add rounds from both phones
Switch between saved games
Rename / archive / repair Saved Games
Auto-rotate starter after Add Round
Refresh page
Open shared URL directly
```
