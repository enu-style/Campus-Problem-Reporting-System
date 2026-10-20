# Deployment Guide - Injibara Campus Reporting System

This guide covers production deployment of the backend and frontend.

## 1. Backend Production Setup

### 1.1 Environment Variables
Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Production Value | Notes |
|----------|-----------------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host:port/dbname` | Use a managed PostgreSQL instance (e.g., AWS RDS, DigitalOcean Managed DB) |
| `PORT` | `5000` or `80` | Behind a reverse proxy (nginx), use 80/443 |
| `NODE_ENV` | `production` | Enables production optimizations |
| `JWT_SECRET` | Strong random secret (32+ chars) | Generate with `openssl rand -base64 32` |
| `FRONTEND_URL` | `https://your-domain.com` | CORS allowed origin |
| `SMTP_HOST` | Your SMTP server | For email notifications |
| `SMTP_PORT` | `587` or `465` | |
| `SMTP_SECURE` | `false` (587) or `true` (465) | |
| `SMTP_USER` | Your SMTP username | |
| `SMTP_PASS` | Your SMTP password | |
| `MAIL_FROM` | `noreply@your-domain.com` | Sender email |
| `MAIL_FROM_NAME` | `Injibara Campus Reporting` | Display name |

### 1.2 Database Setup
1. Install PostgreSQL on the server or use a managed service
2. Create the database: `createdb injibara_campus_reporting`
3. Run migrations: `cd backend && npx prisma migrate deploy`
4. Generate Prisma Client: `npm run build`

### 1.3 Running the Backend
```bash
cd backend
npm install --production
npm start
```

For production, use a process manager like PM2:
```bash
npm install -g pm2
pm2 start src/server.js --name "campus-reporting-backend"
pm2 save
pm2 startup
```

### 1.4 HTTPS (Reverse Proxy with nginx)
Configure nginx to terminate SSL and proxy to the backend:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /path/to/backend/uploads/;
    }
}
```

Obtain SSL certificates via Let's Encrypt:
```bash
certbot --nginx -d your-domain.com
```

### 1.5 Database Backups
Set up a cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/backend && node scripts/backup-db.js >> /var/log/campus-backup.log 2>&1
```

## 2. Frontend Production Setup

### 2.1 Environment Variables
Copy `frontend/.env.example` to `frontend/.env` and set:
```
VITE_API_URL=https://your-backend-domain.com/api
```

### 2.2 Build and Deploy
```bash
cd frontend
npm install
npm run build
```

The production assets are in `frontend/dist/`. Serve them with nginx:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        ...
    }
}
```

## 3. Security Checklist

- [ ] `DATABASE_URL` uses strong password
- [ ] `JWT_SECRET` is a strong random string (not the default)
- [ ] `.env` files are NOT committed to git (check `.gitignore`)
- [ ] HTTPS is enabled (SSL/TLS certificates)
- [ ] SMTP credentials are not hardcoded
- [ ] File uploads are limited to 5MB each, max 5 files
- [ ] Only allowed file types (JPEG, PNG, WebP, PDF) are accepted
- [ ] Passwords are hashed with bcrypt (10 rounds)
- [ ] Role-based access control is enforced on all protected routes
- [ ] Admin user management (create/update/delete) requires ADMINISTRATOR role
- [ ] CORS is configured to only allow the frontend domain

## 4. Monitoring

- [ ] Health endpoint: `GET https://your-domain.com/api/health`
- [ ] Monitor PostgreSQL connections and disk space
- [ ] Set up log rotation for application logs
- [ ] Monitor email delivery (SMTP logs)

## 5. AI Integration Notes

The AI service (`backend/src/services/aiService.js`) uses keyword-based matching by default.
- No external API keys required
- No sensitive student data (name, email, ID) is sent to any AI service
- Only complaint title and description are analyzed for category suggestion and urgency flagging
- Staff retain full control over category assignment and urgency decisions

To integrate with an external AI provider (e.g., OpenAI), extend `aiService.js` with an optional API client.