# Deployment Guide

## Quick Start

### For Railway/Render (Easiest)

1. Connect your GitHub repository
2. Set environment variables in the platform dashboard
3. Deploy automatically on push to `main`

### For VPS with GitHub Actions

1. Follow `server-setup.md` to set up your server
2. Add GitHub Secrets (see `server-setup.md`)
3. Push to `dev` branch → Auto-deploys to dev
4. Merge `dev` to `main` → Auto-deploys to production

## Branch Strategy

- **`dev`**: Development branch → Auto-deploys to dev server
- **`main`**: Production branch → Auto-deploys to production server

## GitHub Actions Workflows

- `.github/workflows/deploy-dev.yml`: Deploys on push to `dev`
- `.github/workflows/deploy-main.yml`: Deploys on push to `main`
- `.github/workflows/merge-dev-to-main.yml`: Optional auto-merge workflow

## Manual Deployment

If you need to deploy manually:

```bash
# On your server
cd /path/to/project
./deploy.sh
```

Or use the deploy script directly:

```bash
git pull origin main
source myenv/bin/activate
pip install -r requirements.txt
npm ci
npm run build
pm2 restart all
```

## Environment Variables

Make sure all required environment variables are set on your server:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CALENDLY_API_KEY`
- `CALENDLY_USERNAME`
- `CALENDLY_EVENT_TYPE_UUID`

## Calendly Webhook Setup

Once deployed, set up your Calendly webhook:

1. Go to Calendly → Settings → Integrations → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/calendly`
3. Select events: `invitee.created` and `invitee.canceled`



