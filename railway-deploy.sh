#!/bin/bash
set -e

echo "🚀 VibeCheck Railway Deployment"
railway login
railway init
railway add
railway variables set GEMINI_API_KEY=$GEMINI_API_KEY
railway up
railway open
