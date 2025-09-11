# Manual Deployment Instructions for Supabase Edge Functions on Coolify

This guide provides step-by-step instructions for deploying the `process-face-embedding` Edge Function to your Coolify-hosted Supabase instance.

## Option 1: Using Coolify Dashboard

1. **Package the Edge Function**:
   ```bash
   cd /Users/gustavo/Desktop/zona-app/zona-gol/supabase/functions
   zip -r process-face-embedding.zip process-face-embedding
   ```

2. **Upload via Coolify Dashboard**:
   - Log in to your Coolify dashboard
   - Navigate to your Supabase service
   - Go to the "Edge Functions" section
   - Click "Upload Function"
   - Select the `process-face-embedding.zip` file
   - Click "Deploy"

## Option 2: Using Coolify CLI (if available)

1. **Install Coolify CLI** (if not already installed):
   ```bash
   npm install -g @coolify/cli
   ```

2. **Login to Coolify**:
   ```bash
   coolify login
   ```

3. **Deploy the Edge Function**:
   ```bash
   cd /Users/gustavo/Desktop/zona-app/zona-gol/supabase/functions
   coolify deploy function --name process-face-embedding --service your-supabase-service-id
   ```

## Option 3: Manual File Transfer

1. **Package the Edge Function**:
   ```bash
   cd /Users/gustavo/Desktop/zona-app/zona-gol/supabase/functions
   zip -r process-face-embedding.zip process-face-embedding
   ```

2. **Transfer to Your VPS**:
   - Use SFTP, SCP, or any file transfer method to upload the zip file to your VPS
   - Example using FileZilla or any SFTP client:
     - Connect to your VPS
     - Upload `process-face-embedding.zip` to `/tmp` or your preferred directory

3. **SSH into Your VPS** (if you have SSH access):
   ```bash
   ssh your-username@your-vps-hostname
   ```

4. **Extract and Deploy**:
   ```bash
   cd /path/to/your/supabase/installation
   unzip /path/to/process-face-embedding.zip -d functions/
   supabase functions deploy process-face-embedding
   ```

## Option 4: Coolify Git Integration

If your Coolify instance is set up with Git integration:

1. **Commit your changes**:
   ```bash
   git add supabase/functions/process-face-embedding
   git commit -m "Add face embedding edge function"
   git push
   ```

2. **Trigger Deployment**:
   - Coolify should automatically detect the changes and deploy the updated Edge Function
   - If not, manually trigger a deployment from the Coolify dashboard

## Verifying Deployment

After deployment, verify that the Edge Function is working:

1. **Check Function Status**:
   - In the Coolify dashboard, navigate to your Supabase service
   - Go to the "Edge Functions" section
   - Verify that `process-face-embedding` is listed and has a status of "Active"

2. **Test the Function**:
   - Create or update a player with a photo in your application
   - Check the console logs for successful face embedding processing
   - Verify in the database that the player record has been updated with face embedding data

## Troubleshooting

If face embeddings still aren't being generated:

1. **Check Function Logs**:
   - In the Coolify dashboard, view the logs for the `process-face-embedding` function
   - Look for any error messages or issues

2. **Verify Environment Variables**:
   - Ensure that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are properly set in your Coolify environment

3. **Check Function URL**:
   - Verify that the frontend is calling the correct URL for the Edge Function
   - The URL should be in the format: `https://your-supabase-url/functions/v1/process-face-embedding`

4. **Test Function Directly**:
   ```bash
   curl -X POST "https://your-supabase-url/functions/v1/process-face-embedding" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-anon-key" \
     -d '{"playerId": "test-player-id", "photoDataUrl": "data:image/jpeg;base64,..."}'
   ```
