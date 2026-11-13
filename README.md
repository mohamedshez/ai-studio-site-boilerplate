# AI Studio site boilerplate

A starting point for a marketing website that can be edited in Google AI Studio and is delivered through GitHub to Google Cloud Run.

- A private **development site**: sign-in required, banner shown, hidden from search engines.
- A public **production site**.
- Every push to `dev` deploys the development site. Production changes only when a version tag such as `v1.2.0` is pushed.
- A contact form that sends each enquiry to the inbox for its topic.

The example company, Larkfield Labs, is fictional.

## Run it on your computer

You need Node.js 22.18 or later.

```bash
cp .env.example .env.local
npm install
npm test
npm run dev
```

Open http://localhost:3000 and sign in with the `DEV_AUTH_USER` and `DEV_AUTH_PASSWORD` values from `.env.local`.

With `SMTP_HOST` empty the form runs in dry-run mode: nothing is sent, and the page tells you which inbox the message would have gone to.

To run the container instead:

```bash
docker build -t site .
docker run --rm -p 8080:8080 -e SITE_ENV=production -e CONTACT_TO_GENERAL=hello@example.com site
```

## Settings

All settings are read when the site runs, not when it is built, so the same image serves both sites.

| Setting | Purpose |
|---|---|
| `SITE_ENV` | `production` makes the site public and indexable. Anything else is a development site. |
| `SITE_URL` | Public address, used in `robots.txt` and the sitemap. |
| `APP_VERSION` | Reported by `/api/health`. Set by the deploy workflows. |
| `DEV_AUTH_USER`, `DEV_AUTH_PASSWORD` | Development-site sign-in. If either is missing, a development site returns 503 for everything. |
| `CONTACT_TO_GENERAL` | Default inbox. Required. |
| `CONTACT_TO_SALES`, `CONTACT_TO_CAREERS`, `CONTACT_TO_SUPPORT` | Optional inbox per topic. Each falls back to the general inbox. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Mail server. Leave `SMTP_HOST` empty for dry-run mode. |

Never commit `.env.local` or any real value. Real values live in GitHub, as described below.

## Set up Google Cloud (once)

1. Create a Google Cloud project and attach billing.
2. Open Cloud Shell in that project, clone this repository, and run:

   ```bash
   PROJECT_ID=your-project-id GITHUB_REPO=your-name/your-repo bash scripts/gcp-setup.sh
   ```

   The default region is `europe-west1`. Set `REGION` to change it. Cloud Run domain mapping is not available in every region, so check before choosing another.

3. Keep the six values it prints for the next section.

The script creates an image repository, an account the site runs as (with no permissions), an account GitHub deploys as, and a trust link so GitHub Actions can deploy from this one repository without a stored key.

## Set up GitHub (once)

Under **Settings → Secrets and variables → Actions**, add the six values from the script as **repository variables**:

`GCP_PROJECT_ID`, `GCP_REGION`, `GAR_REPOSITORY`, `WIF_PROVIDER`, `DEPLOY_SERVICE_ACCOUNT`, `RUNTIME_SERVICE_ACCOUNT`

Under **Settings → Environments**, create two environments, `development` and `production`, and add these to each:

| Name | Kind | development | production |
|---|---|---|---|
| `SITE_URL` | variable | yes | yes |
| `CONTACT_TO_GENERAL` | variable | yes | yes |
| `CONTACT_TO_SALES`, `CONTACT_TO_CAREERS`, `CONTACT_TO_SUPPORT` | variable | optional | optional |
| `DEV_AUTH_USER`, `DEV_AUTH_PASSWORD` | secret | yes | no |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM` | variable | optional | optional |
| `SMTP_PASSWORD` | secret | optional | optional |

On `production`, add **required reviewers** so each production deploy waits for a named person to approve it.

## Day to day

- **Change something:** commit to `dev` and push. The development site updates in a few minutes.
- **Release:** merge `dev` into `main`, then tag and push:

  ```bash
  git tag v1.2.0
  git push origin v1.2.0
  ```

  The tag must be on `main`. The workflow refuses it otherwise.
- **Check what is live:** open `/api/health` on either site.

Each deploy replaces all settings on the Cloud Run service with the values held in GitHub. Change settings in GitHub, not in the Cloud console, or the next deploy will undo them.

## Custom domains

Cloud Run can serve a subdomain while DNS stays with your registrar:

1. `gcloud domains verify example.com`, then add the TXT record it gives you at your registrar.
2. Create a mapping for each site:

   ```bash
   gcloud beta run domain-mappings create --service site-prod --domain www.example.com --region europe-west1
   ```

3. Add the CNAME record it prints at your registrar and wait for the certificate.
4. Set `SITE_URL` for that environment in GitHub and deploy again.

## Where things are

| Path | Purpose |
|---|---|
| `src/app/` | Pages, and the `robots.txt` and sitemap rules. |
| `src/app/contact/ContactForm.tsx` | The form. |
| `src/app/api/contact/route.ts` | Receives the form, picks the inbox, sends the mail. |
| `src/app/api/health/route.ts` | Reports the live version. Not behind the sign-in. |
| `src/lib/contact.ts` | Topics, validation and inbox routing, with tests alongside. |
| `src/proxy.ts` | Development-site sign-in and the "do not index" header. Next.js 16 names this file `proxy`, not `middleware`. |
| `next.config.mjs` | Container output and example redirects. |
| `Dockerfile` | Builds the image. |
| `scripts/deploy.sh` | Build, deploy and confirm. Used by both deploy workflows. |
| `scripts/gcp-setup.sh` | One-time Google Cloud setup. |
| `.github/workflows/` | Checks, development deploy, production deploy. |

To add a contact topic, add it to `TOPICS` in `src/lib/contact.ts`, add its `CONTACT_TO_…` name to the list in `scripts/deploy.sh`, and pass it through in both deploy workflows.
