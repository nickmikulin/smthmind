# Opt-in sync setup (Supabase)

Sync is off by default. The app stays fully local (IndexedDB via Dexie) unless
the user signs in from the Sync panel.

## 1. Create the Supabase project

1. Create a free project at https://supabase.com (give it a secure database
   password; you won't need it in the client).
2. In **Authentication > Providers**, keep **Email** enabled and turn
   **Confirm email** on — magic links rely on it.
3. In **Authentication > URL Configuration**, set the Site URL to your app's
   URL (e.g. `https://smthmind.com`) and add any preview URLs to the
   redirect allow-list.

## 2. Apply the schema

Open **SQL Editor**, paste the contents of `supabase/migration.sql`, and run
it. This creates the `entries` table with Row Level Security: each
authenticated user can only read and write rows where `user_id` matches
their own auth UID.

## 3. Configure the client

Copy the project URL and the `anon` public key from **Settings > API** into
`js/sync-config.js`:

```js
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-public-key";
```

The `anon` key is safe to ship in client code; access control is enforced by
RLS. Until real values replace the placeholders, the sync panel shows a
configuration warning and no network calls are made.

## How sync works

- **Push**: local entries are upserted to `entries` keyed by their timestamp
  ID (`onConflict: "id"`), so re-syncing never duplicates.
- **Pull**: remote rows without `deleted_at` that are missing locally are
  inserted into Dexie, then the list re-renders.
- **Deletes**: local deletes are recorded as tombstones and pushed as
  `deleted_at` timestamps; other devices pull them and remove the rows.
- **Conflict-ready**: each row carries `updated_at`. Editing isn't in the app
  yet, but when it lands, last-write-wins on `updated_at` needs no schema
  change.
