import React, { useState } from 'react';
import { Badge } from './ui/Badge';

export default function LandingPage({ onScanStart }) {
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [wcagLevel, setWcagLevel] = useState('AA');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email || !url) {
      setError('Please enter both email and URL.');
      return;
    }
    onScanStart({ email, url, wcagLevel });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-blue-700 text-center mb-6">Accessibility Checker</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Your Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border border-blue-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
          />
          <input
            type="url"
            placeholder="Website URL"
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
            className="w-full border border-blue-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
          />
          <div>
            <label htmlFor="wcagLevel" className="block text-sm font-medium text-gray-700 mb-1">WCAG Level</label>
            <select
              id="wcagLevel"
              value={wcagLevel}
              onChange={e => setWcagLevel(e.target.value)}
              className="w-full border border-blue-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
            >
              <option value="AA">WCAG 2.1 AA</option>
              <option value="AAA">WCAG 2.1 AAA</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Run Scan
          </button>
        </form>
        {error && <div className="mt-4 text-red-500 text-center">{error}</div>}
        <div className="mt-6 flex justify-center">
          <Badge color="primary">Powered by Pa11y & axe-core</Badge>
        </div>
      </div>
    </div>
  );
} 