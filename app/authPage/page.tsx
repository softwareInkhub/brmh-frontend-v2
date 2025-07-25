"use client";
import React, { useState } from "react";

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ username: '', password: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const endpoint = tab === 'login' ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login` : `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/signup`;
    const body = tab === 'login'
      ? { username: form.username, password: form.password }
      : { username: form.username, password: form.password, email: form.email };
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Success!');
      } else {
        setMessage(data.error || 'Failed.');
      }
    } catch (err) {
      setMessage('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex mb-6">
          <button
            className={`flex-1 py-2 font-bold rounded-l-lg ${tab === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setTab('login')}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 font-bold rounded-r-lg ${tab === 'signup' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setTab('signup')}
          >
            Signup
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
            required
          />
          {tab === 'signup' && (
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              required
            />
          )}
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? 'Please wait...' : tab === 'login' ? 'Login' : 'Signup'}
          </button>
        </form>
        {message && <div className="mt-4 text-center text-sm text-red-500">{message}</div>}
      </div>
    </div>
  );
}
