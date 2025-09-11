#!/bin/bash

# Script to deploy Edge Functions to a Coolify-hosted Supabase instance
# Usage: ./deploy-edge-function.sh <function-name> <vps-host> <vps-user>

FUNCTION_NAME=$1
VPS_HOST=$2
VPS_USER=$3

if [ -z "$FUNCTION_NAME" ] || [ -z "$VPS_HOST" ] || [ -z "$VPS_USER" ]; then
  echo "Usage: ./deploy-edge-function.sh <function-name> <vps-host> <vps-user>"
  echo "Example: ./deploy-edge-function.sh process-face-embedding example.com admin"
  exit 1
fi

echo "Packaging Edge Function: $FUNCTION_NAME"
cd "$(dirname "$0")"
tar -czf "${FUNCTION_NAME}.tar.gz" "$FUNCTION_NAME"

echo "Uploading to VPS: $VPS_HOST"
scp "${FUNCTION_NAME}.tar.gz" "${VPS_USER}@${VPS_HOST}:/tmp/"

echo "Deploying Edge Function on VPS"
ssh "${VPS_USER}@${VPS_HOST}" "
  cd /path/to/supabase/installation && \
  mkdir -p functions/${FUNCTION_NAME} && \
  tar -xzf /tmp/${FUNCTION_NAME}.tar.gz -C functions/ && \
  supabase functions deploy ${FUNCTION_NAME} && \
  rm /tmp/${FUNCTION_NAME}.tar.gz
"

echo "Cleaning up local files"
rm "${FUNCTION_NAME}.tar.gz"

echo "Deployment complete!"
