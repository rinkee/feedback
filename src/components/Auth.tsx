'use client';

import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Ensure this path is correct

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true); // Toggle between Sign Up and Sign In
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      let response;
      if (isSignUp) {
        response = await supabase.auth.signUp({
          email,
          password,
        });
      } else {
        response = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }

      if (response.error) {
        throw response.error;
      }

      if (isSignUp && response.data.user && response.data.user.identities && response.data.user.identities.length === 0) {
        setMessage('Sign up successful, but email confirmation might be required. Please check your email.');
      } else if (isSignUp && response.data.user) {
        setMessage('Sign up successful! Please check your email to confirm.');
      } else if (!isSignUp && response.data.user) {
        setMessage('Sign in successful!');
        // You might want to redirect the user or update UI state here
      } else {
        // Fallback message if user object is null but no error, though unlikely for signInWithPassword
        setMessage('Action completed. Please check your email if signing up.');
      }

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Authentication error:', error);
      setError(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          {isSignUp ? 'Create an Account' : 'Sign In'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700 sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700 sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              className="block w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </div>
        </form>
        {message && <p className="mt-4 text-sm text-center text-green-600">{message}</p>}
        {error && <p className="mt-4 text-sm text-center text-red-600">{error}</p>}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage('');
              setError('');
            }}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
