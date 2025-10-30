# Collaboration Platform

A comprehensive full-stack collaboration platform built with modern technologies, featuring JWT authentication, complex authorization hierarchies, real-time GraphQL subscriptions, and AI integration.

## 🚀 Features

### Core Functionality
- **JWT Authentication**: Secure login/logout with refresh tokens and device tracking
- **Complex Authorization**: Multi-level permission system (Workspace → Project → Task)
- **Real-time Updates**: GraphQL subscriptions for live task status changes
- **Task Management**: Complete CRUD operations with automatic notifications
- **AI Integration**: Gemini API for task summarization and generation
- **PostgreSQL Database**: Robust data modeling with Docker deployment

### Technical Stack
- **Runtime**: Bun (both runtime and package manager)
- **Framework**: Express.js with TypeScript
- **API**: GraphQL (Apollo Server) with REST endpoints for auth
- **Database**: PostgreSQL with raw SQL queries
- **Authentication**: JWT with separate access/refresh tokens
- **Real-time**: GraphQL Subscriptions with PubSub
- **Security**: Helmet, CORS, rate limiting, input validation
- **Logging**: Winston dual-logging (File + Database)

## 🏗️ Architecture

### Authorization Hierarchy
```
Workspace (OWNER/MEMBER/VIEWER)
├── Project (PROJECT_LEAD/CONTRIBUTOR/PROJECT_VIEWER)
    └── Task (Assigned users with notifications)
```

### API Structure
- **REST Endpoints**: Authentication (`/auth/login`, `/auth/logout`, `/auth/refresh`)
- **GraphQL**: All business logic (workspaces, projects, tasks, notifications, AI features)
- **Subscriptions**: Real-time task status updates

## 📋 Prerequisites

- **Bun**: `curl -fsSL https://bun.sh/install | bash`
- **Docker & Docker Compose**: For PostgreSQL database
- **Node.js 18+**: For compatibility

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd collaboration-platform
bun install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup
```bash
# Start PostgreSQL with Docker
docker compose up --build -d

# Initialize database schema
bun run db:migrate
```

### 4. Start the Application
```bash
# Backend (Terminal 1)
bun run dev

# Frontend (Terminal 2)
cd client && npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **GraphQL Playground**: http://localhost:4000/graphql
- **Health Check**: http://localhost:4000/health

## 🔧 Configuration

### Environment Variables (.env)
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/collaboration_db

# JWT
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=4000
NODE_ENV=development

# AI (Optional)
GEMINI_API_KEY=your-gemini-api-key

# Logging
LOG_LEVEL=info
LOG_FILE=logs/audit.log
```

## 📚 API Documentation

### Authentication (REST)
```bash
# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Logout
POST /auth/logout

# Refresh Token
POST /auth/refresh

# Update Password
POST /auth/update-password
{
  "currentPassword": "oldpass",
  "newPassword": "newpass"
}
```

### GraphQL Examples

#### Create Workspace
```graphql
mutation {
  createWorkspace(name: "My Workspace") {
    id
    name
    ownerId
  }
}
```

#### Create Task with Notifications
```graphql
mutation {
  createTask(
    projectId: "project-uuid"
    title: "Implement feature"
    description: "Detailed description"
    assignedToIds: ["user-uuid"]
  ) {
    id
    title
    status
    assignedUsers {
      id
      email
    }
  }
}
```

#### Real-time Task Updates
```graphql
subscription {
  taskStatusUpdated(workspaceId: "workspace-uuid") {
    id
    title
    status
    updatedAt
  }
}
```

#### AI Task Summarization
```graphql
query {
  summarizeTask(description: "Long task description here...")
}
```

## 🧪 Testing

```bash
# Run all tests
bun run test

# Run with coverage
bun run test:coverage

# Run specific test file
bun run test auth.test.ts
```

## 🐳 Docker Deployment

### Development
```bash
docker compose up --build
```

### Production
```bash
docker build -t collaboration-platform .
docker run -p 4000:4000 collaboration-platform
```

## 🔒 Security Features

- **JWT Authentication**: Stateless authentication with refresh tokens
- **Device Tracking**: IP address and user agent logging
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Joi schemas for all inputs
- **Security Headers**: Helmet.js configuration
- **Audit Logging**: Comprehensive security and activity logs
- **CORS**: Configured cross-origin policies

## 📊 Database Schema

### Core Tables
- `users`: User accounts with global status (ACTIVE/BANNED/ADMIN)
- `workspaces`: Collaborative spaces with ownership
- `workspace_members`: Membership with roles (OWNER/MEMBER/VIEWER)
- `projects`: Work containers within workspaces
- `project_memberships`: Project-specific roles (PROJECT_LEAD/CONTRIBUTOR/PROJECT_VIEWER)
- `tasks`: Work items with assignment and status tracking
- `notifications`: User notifications with delivery status
- `user_devices`: Session management and device tracking
- `audit_logs`: Security and activity logging

## 🤖 AI Integration

### Features
- **Task Summarization**: Generate concise summaries from detailed descriptions
- **Task Generation**: Create structured task lists from high-level prompts
- **Intelligent Assistance**: Powered by Google Gemini API

### Usage
```graphql
# Summarize a task
query {
  summarizeTask(description: "Implement user authentication with JWT tokens, including password hashing, refresh tokens, and device tracking...")
}

# Generate tasks from prompt
mutation {
  generateTasksFromPrompt(
    projectId: "project-uuid"
    prompt: "Build a user registration system"
  )
}
```

## 📈 Monitoring & Logging

### Log Categories
- **Security Logs**: Authentication failures, admin actions, bans
- **Activity Logs**: Task lifecycle, project/workspace management
- **System Logs**: Errors, critical events
- **User Logs**: Session management, device tracking

### Log Destinations
- **File**: `logs/audit.log` with Winston formatting
- **Database**: `audit_logs` table for compliance and querying

## 🚀 Production Deployment

### Environment Setup
```bash
export NODE_ENV=production
export DATABASE_URL=postgresql://prod-user:prod-pass@prod-host:5432/prod-db
export JWT_ACCESS_SECRET=strong-production-secret
export GEMINI_API_KEY=your-production-api-key
```

### Build & Deploy
```bash
bun run build
bun run start
```

## 🛠️ Development

### Project Structure
```
├── src/
│   ├── config/          # Database configuration
│   ├── graphql/
│   │   ├── schemas/     # GraphQL type definitions
│   │   └── resolvers/   # GraphQL resolvers
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models
│   ├── routes/          # REST API routes
│   ├── services/        # External services (AI)
│   ├── types/           # TypeScript definitions
│   └── utils/           # Utilities (auth, logger)
├── client/              # Next.js frontend
├── database-schema.sql  # PostgreSQL schema
├── docker-compose.yml   # Docker configuration
└── jest.config.js       # Test configuration
```

### Available Scripts
```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run test         # Run test suite
bun run lint         # Run ESLint
bun run db:migrate   # Initialize database
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Ensure Docker containers are running
docker compose ps

# Check database logs
docker compose logs postgres
```

**GraphQL Schema Errors**
```bash
# Validate schema
bun run dev  # Check console for schema validation errors
```

**Test Failures**
```bash
# Clean test database
docker compose down -v
docker compose up --build -d
bun run test
```

**AI Features Not Working**
```bash
# Verify GEMINI_API_KEY in .env
echo $GEMINI_API_KEY
```

## 📞 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the API documentation
3. Create an issue with detailed information
4. Include environment details and error logs

---

**Built with ❤️ using Bun, TypeScript, GraphQL, and PostgreSQL**
