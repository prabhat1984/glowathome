# GlowAtHome PWA

Mobile-first on-call parlour booking app based on the supplied architecture blueprint.

## Run locally

```powershell
npm install
npm run dev
```

Without backend configuration, the app is in demo mode and stores bookings only in that browser. Do not share demo mode with clients as a live booking service.

## Connect Supabase

1. Create a Supabase project and open its SQL Editor.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. In Authentication, create an owner user with email and password.
4. In the SQL Editor, grant that specific user the admin role (replace the email):

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'owner@example.com';
   ```

   Sign out and back in after setting the role so the admin role is included in the new session.
5. In Project Settings > API, copy the Project URL and anon/public key.
6. Copy `.env.example` to `.env.local`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart the dev server.

Never put the `service_role` key in this app or in GitHub. The anon/public key is included in the browser app at build time, so storing it as a GitHub secret does not make it private. Database access must be protected by the policies in `supabase/schema.sql`.

## Deploy to GitHub Pages

1. Create an **empty public or private GitHub repository** (do not add a README or `.gitignore` if you already have this project locally).
2. Push this project to its `main` branch.
3. In repository Settings > Pages, choose **GitHub Actions** as the build and deployment source.
4. In Settings > Secrets and variables > Actions, add:
   - `VITE_SUPABASE_URL` — the Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` — the anon/public key (never the service-role key). It may be stored as a repository variable or secret.
5. Push to `main` or run the “Deploy GlowAtHome to GitHub Pages” workflow manually. GitHub Actions builds and publishes the app. The Pages URL appears in the workflow deployment.
6. In Supabase Authentication > URL Configuration, set the Site URL to the deployed Pages URL and add that URL to the redirect allow list.

The workflow handles both project Pages URLs (`https://OWNER.github.io/REPOSITORY/`) and user Pages repositories (`https://OWNER.github.io/`). The Pages version uses Supabase for shared bookings; verify a test booking appears in the Supabase table and in the admin queue before sending the link to clients. Customer booking lookup currently uses browser-local data, so it only shows bookings on the browser where they were made; cross-device tracking or verified phone lookup is not included yet.

## Add a custom domain later

Once you own the domain, add it under repository Settings > Pages > Custom domain. Configure the DNS records GitHub shows for that domain, wait for DNS verification, and enable Enforce HTTPS. Then update the Supabase Site URL and redirect allow list to the new HTTPS domain. Keep the GitHub Pages URL available until the custom domain is verified.

## Build

```powershell
npm run build
npm run preview
```
