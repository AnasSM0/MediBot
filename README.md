# 🏥 MediBot - AI Medical Assistant

> **A smart, safe, and privacy-focused medical chatbot powered by AI**

MediBot is a full-stack web application that provides medical guidance through natural language conversations and image analysis. It uses a hybrid AI approach combining Google Gemini and OpenRouter APIs to deliver accurate, medically-safe responses while conserving API usage.

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-Frontend-black)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)](https://www.postgresql.org/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Database](#-database)
- [Deployment](#-deployment)
- [Monitoring](#-monitoring)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## ✨ Features

### Core Capabilities
- 💬 **Text-based Medical Chat** - Ask questions about symptoms, medications, and general health
- 🖼️ **Image Analysis** - Upload prescriptions, medicine packaging, or medical documents for OCR and analysis
- 📝 **Chat History** - Persistent conversation storage with session management
- 🔐 **User Authentication** - Secure login with NextAuth.js
- 🌐 **Real-time Streaming** - Server-Sent Events (SSE) for responsive AI interactions
- 🎯 **Severity Detection** - Automatic flagging of potentially urgent symptoms

### AI Features
- **Hybrid API Strategy** - Optimized use of Gemini (vision) and OpenRouter (reasoning)
- **Automatic Fallback** - Redundant providers ensure 99.9% uptime
- **API Conservation** - Smart routing reduces API costs by 90%
- **Medical Safety** - Built-in disclaimers and emergency detection
- **Context Awareness** - Maintains conversation history for better responses

### Technical Features
- 🐳 **Docker Support** - One-command deployment with docker-compose
- 📊 **API Monitoring** - Built-in usage tracking and analytics
- 🔄 **Database Migrations** - Alembic for schema versioning
- 🌍 **Cloud-Ready** - Supports NeonDB and other cloud PostgreSQL providers
- 📱 **Responsive UI** - Modern, mobile-friendly interface

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         MediBot                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Frontend   │  │   Backend    │  │  PostgreSQL  │     │
│  │  (Next.js)   │◄─┤  (FastAPI)   │◄─┤   Database   │     │
│  │              │  │              │  │              │     │
│  │  Port: 3000  │  │  Port: 8000  │  │  Port: 5432  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
│         │                 │                                │
│         │                 ▼                                │
│         │         ┌──────────────┐                         │
│         │         │  AI Services │                         │
│         │         ├──────────────┤                         │
│         │         │ • Gemini API │ (Vision/OCR)            │
│         │         │ • OpenRouter │ (Text Reasoning)        │
│         │         └──────────────┘                         │
│         │                                                  │
│         └─────────► User Interface                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### AI Request Flow

**Text Chat:**
```
User → OpenRouter (Primary) → Response
     ↓ (if unavailable)
     → Gemini (Fallback) → Response
     ↓ (if unavailable)
     → Local Rules → Response
```

**Image Upload:**
```
User → Gemini Vision (OCR) → JSON Analysis
     ↓ (if fails)
     → OpenRouter Gemma (Fallback) → JSON Analysis
     ↓
     → OpenRouter (Reasoning) → Medical Response
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **HTTP Client**: Fetch API with SSE support
- **UI Components**: Custom component library
- **State Management**: React Hooks

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database ORM**: SQLAlchemy (async)
- **Migrations**: Alembic
- **Authentication**: JWT tokens
- **AI Integration**: 
  - Google Gemini API (vision)
  - OpenRouter API (reasoning)
- **Streaming**: Server-Sent Events (SSE)

### Database
- **Primary**: PostgreSQL 15
- **Cloud Options**: NeonDB, Supabase, AWS RDS
- **Local Development**: Docker PostgreSQL container

### DevOps
- **Containerization**: Docker + Docker Compose
- **Monitoring**: Custom API usage tracker
- **Logging**: JSON-based structured logging

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Git
- At least ONE API key (Gemini or OpenRouter)

### 1-Minute Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd MediBot/MediBot

# Create environment file from template
copy env.example .env          # Windows
cp env.example .env            # Linux/Mac

# Edit .env and add your API keys
notepad .env                   # Windows
nano .env                      # Linux/Mac

# Start with Docker
docker-compose up --build
```

**Access the app**: http://localhost:3000

**📖 Detailed Setup Guide**: See `SINGLE_ENV_SETUP.md` for complete instructions

---

## 📦 Installation

### Option 1: Docker (Recommended)

#### Windows
```cmd
cd e:\work\MediBot\MediBot
start-docker.bat
```

#### Linux/Mac
```bash
cd /path/to/MediBot/MediBot
chmod +x start-docker.sh
./start-docker.sh
```

### Option 2: Manual Setup

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Set up environment
copy .env.example .env
notepad .env  # Add your API keys

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --reload --port 8000
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Set up environment
copy .env.example .env.local
notepad .env.local  # Configure settings

# Start development server
npm run dev
```

---

## ⚙️ Configuration

### Single .env File (Recommended)

MediBot uses a **single root `.env` file** for all configuration. This eliminates confusion and makes setup easier.

**Location**: `MediBot/.env` (root directory)

```bash
# ============================================
# API Keys (Required)
# ============================================

# At least ONE API key required
GEMINI_API_KEY=your_gemini_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# ============================================
# Authentication (Required)
# ============================================

NEXTAUTH_SECRET=generate_random_32_char_string
NEXTAUTH_URL=http://localhost:3000

# ============================================
# Database (Choose ONE)
# ============================================

# Option 1: Local PostgreSQL (Docker)
# DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/medibot

# Option 2: NeonDB (Cloud) - Recommended
DATABASE_URL=postgresql+asyncpg://user:pass@host.neon.tech/db?ssl=require

# ============================================
# Frontend Configuration
# ============================================

NEXT_PUBLIC_API_URL=http://localhost:8000
FRONTEND_ORIGIN=http://localhost:3000

# ============================================
# Optional: Model Configuration
# ============================================

GEMINI_MODEL=gemini-2.0-flash-exp
OPENROUTER_MODEL=nvidia/nemotron-nano-12b-v2-vl:free
```

### Generate NextAuth Secret

**Windows (PowerShell):**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

**Linux/Mac:**
```bash
openssl rand -base64 32
```

### API Keys

#### Gemini API (Optional - for best vision quality)
1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Create new API key
4. Free tier: 1,500 requests/day

#### OpenRouter API (Recommended - for all functionality)
1. Visit: https://openrouter.ai/keys
2. Sign up for account
3. Create API key
4. Free tier: Varies by model (200-1000 requests/day)

**📖 For detailed configuration guide, see `SINGLE_ENV_SETUP.md`**

---

## 💻 Usage

### Starting the Application

**With Docker:**
```bash
docker-compose up -d
```

**Without Docker:**
```bash
# Terminal 1 - Backend
cd backend
uvicorn main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Accessing Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432 (postgres/postgres)

### Using the Chat Interface

1. **Sign Up/Login** - Create an account or sign in
2. **Start Chatting** - Type your medical question
3. **Upload Images** - Click the image icon to upload prescriptions or medical documents
4. **View History** - Access previous conversations from the sidebar
5. **New Chat** - Start a fresh conversation anytime

### Example Queries

**Text Chat:**
- "I have a headache and fever. What should I do?"
- "What are the side effects of ibuprofen?"
- "How can I treat a minor burn at home?"

**Image Upload:**
- Upload prescription → "What medications are in this prescription?"
- Upload medicine bottle → "What is this medicine used for?"
- Upload medical report → "Can you explain these test results?"

---

## 📚 API Documentation

### Interactive API Docs
Visit http://localhost:8000/docs for full Swagger/OpenAPI documentation.

### Key Endpoints

#### Chat Endpoints

**POST /chat**
```json
{
  "message": "I have a headache",
  "session_id": "optional-session-id"
}
```
Response: Server-Sent Events (SSE) stream

**POST /chat/image**
```
Content-Type: multipart/form-data

file: <image file>
message: "What is this medicine?"
session_id: "optional-session-id"
```
Response: SSE stream with vision analysis + medical advice

#### History Endpoints

**GET /history**
Returns list of user's chat sessions

**GET /history/{session_id}**
Returns full conversation history for a session

#### Auth Endpoints

**GET /auth/verify**
Verifies JWT token and returns user info

---

## 🗄️ Database

### Schema

**Users Table:**
```sql
CREATE TABLE users (
    id VARCHAR PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Chat Sessions Table:**
```sql
CREATE TABLE chat_sessions (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR REFERENCES users(id),
    title VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Messages Table:**
```sql
CREATE TABLE messages (
    id VARCHAR PRIMARY KEY,
    session_id VARCHAR REFERENCES chat_sessions(id),
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Database Management

**Access Database:**
```bash
docker exec -it medibot-db psql -U postgres -d medibot
```

**Run Migrations:**
```bash
docker exec -it medibot-backend bash
alembic upgrade head
```

**Backup Database:**
```bash
docker exec medibot-db pg_dump -U postgres medibot > backup.sql
```

**Restore Database:**
```bash
docker exec -i medibot-db psql -U postgres medibot < backup.sql
```

### Using NeonDB (Cloud Database)

1. Create account at https://neon.tech
2. Create new project and database
3. Copy connection string
4. Update `docker-compose.yml`:
```yaml
environment:
  - DATABASE_URL=${DATABASE_URL}  # Use from .env
```
5. Create root `.env` file:
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@host/db?ssl=require
```
6. Restart containers:
```bash
docker-compose down
docker-compose up -d
```

---

## 🚢 Deployment

### Docker Deployment

**Production docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - FRONTEND_ORIGIN=https://yourdomain.com
    env_file:
      - ./backend/.env.production

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_URL: https://api.yourdomain.com
    restart: always
    environment:
      - NEXTAUTH_URL=https://yourdomain.com
    env_file:
      - ./frontend/.env.production
```

### Cloud Deployment Options

#### AWS EC2
```bash
# Install Docker
sudo yum update -y
sudo yum install docker -y
sudo service docker start

# Clone and deploy
git clone <repo>
cd MediBot/MediBot
docker-compose up -d
```

#### Heroku
```bash
heroku create medibot-app
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

#### Vercel (Frontend) + Railway (Backend)
- Frontend: Deploy to Vercel
- Backend: Deploy to Railway
- Database: Use NeonDB or Supabase

### Security Checklist

- [ ] Change default database password
- [ ] Use strong NEXTAUTH_SECRET
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Use environment-specific .env files
- [ ] Enable Docker secrets for sensitive data
- [ ] Set up regular database backups
- [ ] Configure log rotation
- [ ] Use non-root users in containers
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts

---

## 📊 Monitoring

### API Usage Monitoring

**View Usage Report:**
```bash
docker exec -it medibot-backend python api_monitor.py
```

**Sample Output:**
```
================================================
MediBot API Usage Report (Last 24 hours)
================================================

Total API Calls: 150
Success Rate: 98.7%
Errors: 2

By Provider:
  Gemini:      12 calls (vision only)
  OpenRouter: 130 calls (text + reasoning)
  Local:        8 calls (fallback)

By Request Type:
  Text:       130 calls
  Vision:      12 calls
  Reasoning:   12 calls

Efficiency Analysis:
  ✅ Gemini usage is optimized (vision only)
  ✅ API conservation working correctly
```

### View Logs

**All Services:**
```bash
docker-compose logs -f
```

**Specific Service:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

**API Usage Logs:**
```bash
cat backend/logs/api_usage.jsonl
```

### Container Status

```bash
# List running containers
docker-compose ps

# View resource usage
docker stats

# Health check
curl http://localhost:8000/healthz
```

---

## 🐛 Troubleshooting

### Common Issues

#### Containers Won't Start
```bash
# Check Docker is running
docker ps

# View logs
docker-compose logs

# Clean restart
docker-compose down -v
docker-compose up --build
```

#### Port Already in Use
```bash
# Windows - Find process
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
ports:
  - "3001:3000"
```

#### Database Connection Failed
```bash
# Check database status
docker-compose ps

# Restart database
docker-compose restart db

# View database logs
docker-compose logs db
```

#### API Keys Not Working
```bash
# Verify environment variables
docker exec medibot-backend env | grep API_KEY

# Restart backend
docker-compose restart backend
```

#### Frontend Can't Connect to Backend
```bash
# Check backend is running
curl http://localhost:8000/docs

# Verify network
docker network inspect medibot_medibot-network

# Restart both services
docker-compose restart backend frontend
```

#### Empty Chat History (NeonDB Issue)
If using NeonDB but seeing empty history:
1. Check `docker-compose.yml` uses `DATABASE_URL=${DATABASE_URL}`
2. Create root `.env` file with NeonDB connection string
3. Restart: `docker-compose down && docker-compose up -d`

### Debug Mode

**Enable Backend Debug Logging:**
```python
# In backend/database.py
engine = create_async_engine(DATABASE_URL, echo=True)  # Set echo=True
```

**Enable Frontend Debug:**
```bash
# In frontend/.env.local
NEXT_PUBLIC_DEBUG=true
```

---

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open Pull Request

### Code Style

**Python (Backend):**
- Follow PEP 8
- Use type hints
- Add docstrings
- Run: `black . && flake8`

**TypeScript (Frontend):**
- Follow ESLint rules
- Use TypeScript strict mode
- Run: `npm run lint`

### Testing

**Backend Tests:**
```bash
cd backend
pytest
```

**Frontend Tests:**
```bash
cd frontend
npm test
```

**Integration Tests:**
```bash
python backend/test_workflow.py
```

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Google Gemini** - Vision and OCR capabilities
- **OpenRouter** - Text reasoning and fallback vision
- **FastAPI** - High-performance Python backend
- **Next.js** - Modern React framework
- **PostgreSQL** - Reliable database
- **Docker** - Containerization platform

---

## 📞 Support

### Documentation
- **Full Docker Guide**: See `DOCKER_DEPLOYMENT_GUIDE.md` (archived)
- **API Conservation**: See `API_CONSERVATION_STRATEGY.md` (archived)
- **Hybrid Workflow**: See `HYBRID_WORKFLOW_SETUP.md` (archived)
- **Vision Fallback**: See `VISION_FALLBACK_IMPLEMENTATION.md` (archived)

### Quick Commands Reference

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild
docker-compose up --build

# Access backend shell
docker exec -it medibot-backend bash

# Access database
docker exec -it medibot-db psql -U postgres -d medibot

# Monitor API usage
docker exec -it medibot-backend python api_monitor.py

# Clean up Docker
docker system prune -a
```

---

## 🎯 Project Status

- ✅ Core chat functionality
- ✅ Image upload and analysis
- ✅ User authentication
- ✅ Chat history
- ✅ Docker deployment
- ✅ API monitoring
- ✅ Hybrid AI workflow
- ✅ Vision fallback
- ✅ Cloud database support (NeonDB)

---

**Built with ❤️ for safer, smarter medical guidance**

**Version**: 1.0  
**Last Updated**: December 2025  
**Status**: Production Ready 🚀
