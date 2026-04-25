# Railway Deployment Guide

Deploy VibeCheck to Railway in minutes.

## Prerequisites

- Railway account (create at https://railway.app)
- Railway CLI installed

## Installation

### Install Railway CLI

```bash
# macOS/Linux
curl -fsSL https://railway.app/install.sh | bash

# Windows (PowerShell)
iwr https://railway.app/install.ps1 -useb | iex

# Or with npm
npm install -g @railway/cli
```

## Deployment Steps

### 1. Authenticate with Railway

```bash
railway login
```
This opens a browser to authenticate your Railway account.

### 2. Initialize Railway Project

```bash
cd /path/to/vibecheck
railway init
```

Select options:
- **Project name**: `vibecheck`
- **Environment**: `production`
- **Service name**: `vibecheck-api`

### 3. Add PostgreSQL Database (Recommended)

```bash
railway add
```

Select `PostgreSQL` from the list. Railway automatically creates the database and provides the `DATABASE_URL`.

### 4. Set Environment Variables

```bash
railway variables set SECRET_KEY=your-secret-key-here
railway variables set GEMINI_API_KEY=your-gemini-api-key
```

The `DATABASE_URL` is automatically set by Railway when you add PostgreSQL.

### 5. Deploy

```bash
railway up
```

This builds and deploys your application. You'll see the logs in real-time.

### 6. View Your App

```bash
railway open
```

Opens your deployed app in the browser.

## Verify Deployment

Once deployed, check:

1. **Health Check**: `https://your-app.railway.app/api/health`
2. **API Docs**: `https://your-app.railway.app/docs`
3. **Frontend**: `https://your-app.railway.app/`

## Environment Variables (Railway Dashboard)

In the Railway dashboard, add these variables:

| Variable | Value |
|----------|-------|
| `SECRET_KEY` | Generate a secure random string |
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `DATABASE_URL` | Auto-set by Railway (PostgreSQL) |

## Troubleshooting

### Build Fails

Check logs:
```bash
railway logs
```

Common issues:
- Missing dependencies in `requirements.txt`
- Node version incompatibility

### Database Connection Error

Ensure `DATABASE_URL` is set:
```bash
railway variables list
```

### Frontend Not Loading

The build script must complete successfully:
1. Check that `npm run build` works locally
2. Ensure `build.sh` has proper permissions
3. Review Railway build logs

## Monitoring

```bash
# View logs
railway logs --follow

# View status
railway status

# View variables
railway variables list

# Open dashboard
railway open --browser
```

## Database Migrations

If you need to update the database schema:

```bash
# SSH into the container
railway shell

# Inside container
cd /app/backend
python -c "from database import engine, Base; Base.metadata.create_all(bind=engine)"
```

## Rollback

To revert to a previous deployment:

```bash
railway deployments
railway deploy <deployment-id>
```

## Custom Domain

In Railway dashboard:
1. Go to your project
2. Settings → Domains
3. Add custom domain

## Scaling

Adjust resources in Railway dashboard:
- Memory allocation
- CPU allocation
- Number of replicas

## Cost Optimization

- Use PostgreSQL shared tier for development
- Enable auto-sleep during off-peak hours
- Monitor resource usage

## Next Steps

1. Set up monitoring/alerts
2. Configure auto-deployments from GitHub
3. Set up staging environment
4. Configure custom domain

## Support

- Railway Docs: https://docs.railway.app
- Community: https://railway.app/community
