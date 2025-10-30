import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { startStandaloneServer } from '@apollo/server/standalone';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import authRoutes from './routes/auth';

// Import utilities
import logger from './utils/logger';
import pool from './config/database';
import { AuthUtils } from './utils/auth';
import { UserModel } from './models/User';
import type { JWTPayload } from './types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply rate limiting to all requests
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth routes (REST)
app.use('/auth', authRoutes);

// VAPID public key endpoint for push notifications
app.get('/vapid-public-key', (req, res) => {
  try {
    const pushService = require('./services/pushNotification').default;
    const publicKey = pushService.getVapidPublicKey();
    res.json({ publicKey });
  } catch (error) {
    res.status(500).json({ error: 'VAPID keys not configured' });
  }
});

// Placeholder for GraphQL setup - will be implemented next
let server: ApolloServer;

async function startServer() {
  try {
    // Load GraphQL schemas and resolvers
    const schemas = loadFilesSync(path.join(__dirname, './graphql/schemas'), { extensions: ['graphql'] });
    const resolvers = loadFilesSync(path.join(__dirname, './graphql/resolvers'), { extensions: ['ts', 'js'] });

    // Merge schemas and resolvers
    const typeDefs = mergeTypeDefs(schemas);
    const resolversMerged = mergeResolvers(resolvers);

    // Create executable schema
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: resolversMerged,
    });

    // Create Apollo Server
    server = new ApolloServer({
      schema,
      introspection: process.env.NODE_ENV !== 'production',
    });

    await server.start();

    // Apply GraphQL middleware to Express
    app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }: { req: express.Request }) => {
        // Authenticate user for GraphQL context
        try {
          const authHeader = req.headers.authorization;
          console.log('GraphQL context - Auth header:', authHeader ? 'Present' : 'Missing');
          const token = AuthUtils.extractTokenFromHeader(authHeader);
          console.log('GraphQL context - Token extracted:', token ? 'Yes' : 'No');

          let user: JWTPayload | undefined;
          if (token) {
            const payload = AuthUtils.verifyAccessToken(token);
            console.log('GraphQL context - Token verification result:', payload ? 'Valid' : 'Invalid');
            if (payload) {
              // Check if user still exists and is active
              const userRecord = await UserModel.findById(payload.userId);
              console.log('GraphQL context - User record found:', userRecord ? 'Yes' : 'No');
              if (userRecord && userRecord.globalStatus !== 'BANNED') {
                user = payload;
                console.log('GraphQL context - User authenticated:', user.email);
              } else {
                console.log('GraphQL context - User banned or not found');
              }
            }
          } else {
            console.log('GraphQL context - No token provided');
          }

          return {
            req,
            user,
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
          };
        } catch (error) {
          console.log('GraphQL context - Authentication error:', error);
          // If authentication fails, return context without user
          return {
            req,
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
          };
        }
      },
    }));

    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`🚀 Server ready at http://localhost:${PORT}`);
      console.log(`📊 Health check at http://localhost:${PORT}/health`);
      console.log(`🔗 GraphQL endpoint at http://localhost:${PORT}/graphql`);
    });

  } catch (error) {
    logger.error('Failed to start server', undefined, undefined, { error: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  try {
    if (server) {
      await server.stop();
    }

    await pool.end();
    logger.info('Database connection closed');

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', undefined, undefined, { error: error instanceof Error ? error.message : 'Unknown error' });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error('Unhandled error during server startup:', error);
  process.exit(1);
});
