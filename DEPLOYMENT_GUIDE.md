# 🔧 Deployment & Troubleshooting Guide

## ✅ Pre-Deployment Checklist

### Code Quality
- [ ] All code follows JavaScript/React best practices
- [ ] No console.logs in production code
- [ ] Error handling implemented on all API calls
- [ ] Environment variables configured
- [ ] No hardcoded credentials
- [ ] All TODOs resolved
- [ ] Code reviewed by senior engineer

### Testing
- [ ] All 5 API endpoints tested with cURL
- [ ] Frontend loads without errors
- [ ] Vendor click functionality works
- [ ] Audit modal opens and closes
- [ ] Modal fetches data correctly
- [ ] Risk scores display properly
- [ ] Traversal paths table populates
- [ ] No console errors in browser
- [ ] Responsive design works on mobile
- [ ] Performance acceptable (< 1 sec response time)

### Database
- [ ] Neo4j is running
- [ ] Credentials correct (neo4j / asdf@123)
- [ ] Test data exists
- [ ] Sample vendors available for testing
- [ ] Indexes created for performance
- [ ] Database backup taken

### Infrastructure
- [ ] Node.js v18+ installed
- [ ] npm packages installed (both backend + frontend)
- [ ] Port 5000 available (backend)
- [ ] Port 5173 available (frontend)
- [ ] Firewall configured
- [ ] Network connectivity verified

### Security
- [ ] CORS properly configured
- [ ] Input validation in place
- [ ] Error messages don't leak sensitive info
- [ ] JWT authentication ready (for future)
- [ ] HTTPS configured (production)
- [ ] Rate limiting considered

---

## 🚀 Deployment Steps

### Local Development Deployment

#### Step 1: Start Neo4j Database
```bash
# Verify Neo4j is running
curl -I bolt://localhost:7687

# Expected: Connection established
```

#### Step 2: Start Backend Server
```bash
cd gst-backend
node server.js

# Expected Output:
# 🚀 Server running on http://localhost:5000
```

#### Step 3: Start Frontend Dev Server
```bash
cd gst-frontend
npm run dev

# Expected Output:
# VITE v7.3.1 running at:
# ➜  Local:   http://localhost:5173/
```

#### Step 4: Test APIs
```bash
# Test each endpoint
curl http://localhost:5000/api/risk-summary | jq
curl http://localhost:5000/api/itc-leakage | jq
curl http://localhost:5000/api/top-vendors | jq
curl http://localhost:5000/api/fraud-graph | jq
curl "http://localhost:5000/api/vendor-details/Alpha%20Corp" | jq
```

#### Step 5: Verify Frontend
```bash
# Open in browser
http://localhost:5173

# Check:
- Dashboard loads
- Risk summary visible
- Vendor table populated
- Click on vendor opens modal
- Modal displays data correctly
```

---

### Production Deployment

#### Option 1: Traditional Server (Linux/Windows)

**Prerequisites**:
- Ubuntu 20.04+ or Windows Server 2019+
- Node.js v18 LTS
- Neo4j Enterprise
- PM2 for process management

**Steps**:
```bash
# 1. Clone repository
cd /opt/gst-app
git clone <repo-url> .

# 2. Install backend dependencies
cd gst-backend
npm install --production

# 3. Build frontend
cd ../gst-frontend
npm install
npm run build

# 4. Install PM2
npm install -g pm2

# 5. Create PM2 config (ecosystem.config.js)
module.exports = {
  apps: [{
    name: 'gst-backend',
    script: './server.js',
    cwd: './gst-backend',
    instances: 4,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      NEO4J_URL: 'bolt://localhost:7687',
      NEO4J_USER: 'neo4j',
      NEO4J_PASS: process.env.NEO4J_PASSWORD
    }
  }]
};

# 6. Start application
pm2 start ecosystem.config.js

# 7. Configure reverse proxy (Nginx)
# See nginx.conf below
```

**Nginx Configuration**:
```nginx
upstream backend {
  server localhost:5000;
}

upstream frontend {
  server localhost:5173;
}

server {
  listen 80;
  server_name gst-app.example.com;
  client_max_body_size 10M;

  # Static frontend files
  location / {
    proxy_pass http://frontend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
  }

  # API routes
  location /api/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # HTTPS redirect
  listen 443 ssl http2;
  ssl_certificate /etc/ssl/certs/cert.pem;
  ssl_certificate_key /etc/ssl/private/key.pem;
}
```

#### Option 2: Docker Containerization

**Backend Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY gst-backend/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application code
COPY gst-backend/server.js ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error('health check failed')})"

# Expose port
EXPOSE 5000

# Run application
CMD ["node", "server.js"]
```

**Frontend Dockerfile**:
```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

COPY gst-frontend/package*.json ./
RUN npm ci

COPY gst-frontend/ ./
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose**:
```yaml
version: '3.9'

services:
  neo4j:
    image: neo4j:latest
    environment:
      NEO4J_AUTH: neo4j/asdf@123
    ports:
      - "7687:7687"
      - "7474:7474"
    volumes:
      - neo4j_data:/data

  backend:
    build:
      context: .
      dockerfile: gst-backend/Dockerfile
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      NEO4J_URL: bolt://neo4j:7687
      NEO4J_USER: neo4j
      NEO4J_PASS: asdf@123
    depends_on:
      - neo4j
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: gst-frontend/Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  neo4j_data:
```

**Deploy with Docker Compose**:
```bash
docker-compose up -d
```

#### Option 3: Kubernetes Deployment

**Backend Deployment**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gst-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gst-backend
  template:
    metadata:
      labels:
        app: gst-backend
    spec:
      containers:
      - name: backend
        image: registry.example.com/gst-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: NEO4J_URL
          value: bolt://neo4j-service:7687
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: gst-backend-service
spec:
  selector:
    app: gst-backend
  ports:
  - port: 5000
    targetPort: 5000
  type: LoadBalancer
```

---

## 🐛 Troubleshooting Guide

### Issue 1: Backend Server Won't Start

**Error**: `Cannot find module 'express'`

**Solution**:
```bash
cd gst-backend
npm install
node server.js
```

**Error**: `Port 5000 already in use`

**Solution**:
```bash
# Find process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use different port
PORT=5001 node server.js
```

---

### Issue 2: Neo4j Connection Error

**Error**: `Failed to connect to Neo4j at bolt://localhost:7687`

**Solution**:
```bash
# 1. Verify Neo4j is running
curl -I bolt://localhost:7687

# 2. Check credentials
NEO4J_USER=neo4j NEO4J_PASS=asdf@123

# 3. Test connection in Neo4j Browser
# Open http://localhost:7474
# Try to connect with credentials

# 4. Check firewall
# Make sure port 7687 is not blocked

# 5. Verify Neo4j config
# Check BOLT listener is enabled
```

---

### Issue 3: Frontend Not Loading

**Error**: `Failed to fetch from http://localhost:5000`

**Solution**:
```bash
# 1. Verify backend is running
curl http://localhost:5000/api/risk-summary

# 2. Check CORS configuration in server.js
app.use(cors());

# 3. Check browser console for errors (F12)

# 4. Verify frontend is trying to access correct backend URL
# In VendorAuditPanel.jsx:
fetch('http://localhost:5000/api/vendor-details/...')

# 5. Clear browser cache
# Ctrl+Shift+Delete (Chrome)
```

---

### Issue 4: Vendor Data Not Showing

**Error**: `No vendor data available` in table

**Solution**:
```bash
# 1. Check if data exists in Neo4j
# Run in Neo4j Browser:
MATCH (t:Taxpayer) RETURN t LIMIT 5

# 2. Verify API returns data
curl http://localhost:5000/api/top-vendors

# 3. Check browser network tab for API response

# 4. Verify Taxpayer nodes have required properties:
# - name
# - riskScore
# - riskLevel
```

---

### Issue 5: Audit Modal Doesn't Open

**Error**: Modal remains closed when clicking vendor

**Solution**:
```javascript
// 1. Check browser console for JavaScript errors
// Open DevTools (F12) → Console tab

// 2. Verify event handler is working
// Add console log in handleVendorClick()
const handleVendorClick = (vendorName) => {
  console.log('Clicked vendor:', vendorName);  // Debug
  setSelectedVendor(vendorName);
  setIsPanelOpen(true);
};

// 3. Check VendorAuditPanel component is imported
import VendorAuditPanel from "./VendorAuditPanel";

// 4. Verify props are passed correctly
<VendorAuditPanel
  vendorName={selectedVendor}
  isOpen={isPanelOpen}
  onClose={handleClosePanel}
/>

// 5. Check React hooks are working
// Ensure useState and useEffect are properly imported
```

---

### Issue 6: Slow Response Times

**Error**: API takes > 2 seconds to respond

**Solution**:
```bash
# 1. Add indexes in Neo4j
CREATE INDEX taxpayer_name ON :Taxpayer(name);
CREATE INDEX invoice_gst ON :Invoice(gst_amount);

# 2. Check Neo4j performance
# Open http://localhost:7474/browser

# 3. Limit query results
# Max 10 traversal paths per endpoint

# 4. Implement caching
// Add Redis caching layer

# 5. Cache vendor details in frontend state
const [vendorCache, setVendorCache] = useState({});
```

---

### Issue 7: CORS Errors

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:
```javascript
// In server.js, verify CORS is configured:
app.use(cors());

// Or more strict configuration:
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// For production:
app.use(cors({
  origin: 'https://gst-app.example.com',
  credentials: true
}));
```

---

### Issue 8: High Memory Usage

**Error**: Node process uses 1GB+ RAM

**Solution**:
```bash
# 1. Limit Node.js heap
node --max-old-space-size=512 server.js

# 2. Close unused database connections
session.close();

# 3. Implement connection pooling
const session = driver.session({
  connectionAcquisitionTimeout: 60000,
  connectionLivenessCheckTimeout: 60000
});

# 4. Monitor memory with PM2
pm2 monit
```

---

## 📊 Performance Monitoring

### Add Health Check Endpoint

```javascript
// Add to server.js
app.get('/health', async (req, res) => {
  try {
    const session = driver.session();
    await session.run('RETURN 1');
    await session.close();
    res.json({ status: 'healthy' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

### Monitor with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start with monitoring
pm2 start server.js --name "gst-backend"

# View live logs
pm2 logs

# Monitor resources
pm2 monit

# Setup alerts
pm2 install pm2-auto-pull
```

### Docker Health Check

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 5s
```

---

## 🔄 Continuous Deployment

### GitHub Actions Pipeline

```yaml
name: Deploy GST Application

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install backend deps
        run: cd gst-backend && npm install && npm run lint
      
      - name: Install frontend deps
        run: cd gst-frontend && npm install && npm run build
      
      - name: Run tests
        run: npm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to production
        run: |
          # Deploy steps here
          docker-compose up -d
```

---

## 🔒 Security Hardening

### Environment Variables

**Create `.env` file**:
```bash
# Backend .env
NODE_ENV=production
NEO4J_URL=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASS=your_secure_password
API_PORT=5000
LOG_LEVEL=error
```

**Never commit `.env` file! Add to `.gitignore`**:
```bash
echo ".env" >> .gitignore
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use(limiter);
```

### Input Validation

```javascript
const validator = require('express-validator');

app.get('/api/vendor-details/:name', [
  param('name').isString().trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // ... rest of handler
});
```

---

## 📈 Scaling Strategy

### Horizontal Scaling

```
Load Balancer
├─ Backend Server 1 (port 5001)
├─ Backend Server 2 (port 5002)
├─ Backend Server 3 (port 5003)
└─ Neo4j Cluster
    ├─ Primary
    ├─ Replica 1
    └─ Replica 2
```

### Caching Layer

```javascript
const redis = require('redis');
const client = redis.createClient();

async function getVendorDetails(name) {
  // Check cache first
  const cached = await client.get(`vendor:${name}`);
  if (cached) return JSON.parse(cached);
  
  // Fetch from database
  const data = await fetchFromDB(name);
  
  // Cache for 1 hour
  await client.setex(`vendor:${name}`, 3600, JSON.stringify(data));
  
  return data;
}
```

---

## 🚨 Rollback Procedure

### In Case of Failed Deployment

```bash
# 1. Identify last stable version
git log --oneline | head -5

# 2. Revert commit
git revert <commit-hash>

# 3. Redeploy
docker-compose down
docker-compose build
docker-compose up -d

# 4. Verify health
curl http://localhost:5000/health
curl http://localhost:3000

# 5. Monitor logs
pm2 logs
docker-compose logs -f
```

---

**🎯 Deployment Complete!**

Your GST Fraud Detection System is now ready for production. Monitor regularly and follow the security checklist.
