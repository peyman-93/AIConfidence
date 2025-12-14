# Server Setup Guide

## Recommended Hosting Options

### Option 1: Railway (Easiest) ⭐ Recommended
- **Pros**: Automatic deployments, free tier, easy setup
- **Cons**: Limited free tier resources
- **Setup**: Connect GitHub repo → Auto-deploy on push

### Option 2: Render
- **Pros**: Free tier, easy setup, auto-deploy
- **Cons**: Free tier spins down after inactivity
- **Setup**: Connect GitHub → Auto-deploy

### Option 3: DigitalOcean App Platform
- **Pros**: Reliable, good performance
- **Cons**: Paid (starts at $5/month)
- **Setup**: Connect GitHub → Auto-deploy

### Option 4: VPS (DigitalOcean Droplet, Linode, Vultr)
- **Pros**: Full control, cost-effective
- **Cons**: Requires manual setup
- **Setup**: See VPS setup instructions below

## VPS Setup Instructions

### 1. Server Requirements
- Ubuntu 20.04+ or Debian 11+
- 2GB RAM minimum
- Python 3.9+
- Node.js 20+
- Nginx (for reverse proxy)
- PM2 or systemd (for process management)

### 2. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and pip
sudo apt install python3 python3-pip python3-venv -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install nginx -y

# Install PM2 globally
sudo npm install -g pm2
```

### 3. Clone and Setup Project

```bash
# Clone your repository
cd /var/www
sudo git clone https://github.com/yourusername/Client-Portal.git
cd Client-Portal

# Create Python virtual environment
python3 -m venv myenv
source myenv/bin/activate

# Install dependencies
pip install -r requirements.txt
npm ci
npm run build

# Set up environment variables
cd backend
cp .env.example .env
nano .env  # Edit with your actual values
```

### 4. Setup PM2 for Process Management

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'client-portal-backend',
      script: 'python',
      args: 'backend/app.py',
      cwd: '/var/www/Client-Portal',
      interpreter: '/var/www/Client-Portal/myenv/bin/python',
      env: {
        FLASK_ENV: 'production',
        PORT: 5001
      }
    },
    {
      name: 'client-portal-frontend',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/Client-Portal',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
}
EOF

# Start services
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

### 5. Setup Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/client-portal
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/client-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 7. Configure GitHub Secrets

In your GitHub repository, go to Settings → Secrets and variables → Actions, add:

- `DEV_SERVER_HOST`: Your dev server IP/domain
- `DEV_SERVER_USER`: SSH username (usually `root` or `ubuntu`)
- `DEV_SERVER_SSH_KEY`: Your private SSH key
- `DEV_SERVER_PORT`: SSH port (usually 22)
- `DEV_SERVER_PATH`: Path to project on server (e.g., `/var/www/Client-Portal`)

For production:
- `PROD_SERVER_HOST`
- `PROD_SERVER_USER`
- `PROD_SERVER_SSH_KEY`
- `PROD_SERVER_PORT`
- `PROD_SERVER_PATH`

### 8. Generate SSH Key for GitHub Actions

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions.pub user@your-server

# Copy private key content to GitHub Secrets
cat ~/.ssh/github_actions
```

## Environment Variables

Make sure to set these in your server's `.env` file:

```bash
# Backend .env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CALENDLY_API_KEY=your_calendly_api_key
CALENDLY_USERNAME=bardia-rafieian
CALENDLY_EVENT_TYPE_UUID=your_event_type_uuid
FLASK_ENV=production
```

## Deployment Workflow

1. **Development**: Push to `dev` branch → Auto-deploys to dev server
2. **Production**: Merge `dev` to `main` → Auto-deploys to production server

The GitHub Actions workflows handle:
- Running tests
- Building the application
- Deploying to the server
- Restarting services

## Troubleshooting

- Check PM2 logs: `pm2 logs`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check service status: `pm2 status`
- Restart services: `pm2 restart all`



