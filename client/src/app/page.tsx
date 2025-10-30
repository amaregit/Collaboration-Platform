'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const endpoint = isLogin ? 'http://localhost:4000/auth/login' : 'http://localhost:4000/auth/register';
      const body = isLogin
        ? { email, password }
        : { email, password, firstName, lastName };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(isLogin ? 'Login successful! Redirecting...' : 'Registration successful! You can now log in.');
        if (isLogin) {
          console.log("Login response data:", data);
          console.log("Access token received:", data.accessToken ? "Yes" : "No");
          localStorage.setItem('token', data.accessToken);
          console.log("Token stored in localStorage:", localStorage.getItem('token') ? "Yes" : "No");
          setTimeout(() => {
            console.log("Redirecting to dashboard...");
            router.push('/dashboard');
          }, 1000);
        }
      } else {
        console.log("Login failed with response:", response.status, data);
        setMessage(data.error || 'An error occurred');
      }
    } catch (error) {
      setMessage('Network error. Make sure the backend is running on port 4000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Collaboration Platform
          </h1>
          <p className="text-lg text-gray-600">
            Full-Stack Demo with JWT & GraphQL
          </p>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          {isLogin ? 'Sign in to your account' : 'Create a new account'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required={!isLogin}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required={!isLogin}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {message && (
              <div className={`text-sm text-center p-3 rounded-md ${
                message.includes('successful') || message.includes('Redirecting')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  isLogin ? 'Sign in' : 'Create Account'
                )}
              </button>
            </div>

            {isLogin && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setMessage('');
                  setFirstName('');
                  setLastName('');
                }}
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 font-medium">Platform Features</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">🔐 Security & Auth</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• JWT Authentication with refresh tokens</li>
                  <li>• Device tracking and session management</li>
                  <li>• Role-based access control (6 levels)</li>
                  <li>• Admin user management</li>
                </ul>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">🚀 Real-time Features</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• GraphQL API with Apollo Server</li>
                  <li>• Live task status updates</li>
                  <li>• Real-time notifications</li>
                  <li>• Subscription-based architecture</li>
                </ul>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-900 mb-2">🤖 AI Integration</h3>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• Google Gemini API integration</li>
                  <li>• Task summarization</li>
                  <li>• AI-powered task generation</li>
                  <li>• Intelligent project assistance</li>
                </ul>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-purple-900 mb-2">🏗️ Technical Stack</h3>
                <ul className="text-xs text-purple-700 space-y-1">
                  <li>• Bun runtime & package manager</li>
                  <li>• PostgreSQL with Docker</li>
                  <li>• TypeScript & Express.js</li>
                  <li>• Comprehensive test suite</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Demo Account: <code className="bg-gray-100 px-1 py-0.5 rounded">demo@example.com</code> / <code className="bg-gray-100 px-1 py-0.5 rounded">password</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
