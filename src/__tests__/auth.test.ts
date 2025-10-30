import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth';
import pool from '../config/database';
import { AuthUtils } from '../utils/auth';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Authentication API', () => {
  let testUser: any;

  beforeEach(async () => {
    // Create a test user
    const passwordHash = await AuthUtils.hashPassword('testpassword');
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, global_status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['test@example.com', passwordHash, 'Test', 'User', 'ACTIVE']
    );
    testUser = result.rows[0];
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('newuser@example.com');
    });

    it('should reject registration with existing email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('User already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid',
          password: 'short'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login for banned user', async () => {
      // Ban the user
      await pool.query('UPDATE users SET global_status = $1 WHERE id = $2', ['BANNED', testUser.id]);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Account is banned');
    });
  });

  describe('POST /auth/update-password', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Login to get access token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword'
        });
      accessToken = loginResponse.body.accessToken;
    });

    it('should update password successfully', async () => {
      const response = await request(app)
        .post('/auth/update-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'testpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password updated successfully');
    });

    it('should reject with wrong current password', async () => {
      const response = await request(app)
        .post('/auth/update-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Current password is incorrect');
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post('/auth/update-password')
        .send({
          currentPassword: 'testpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
    });
  });
});