import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PublicScan() {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/public-scan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url, email })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      navigate(`/progress/${data.reportId}`);
    } catch (err) {
      setError(err.message);
      console.error('Scan error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] shadow-xl rounded-2xl p-8 w-full max-w-lg">
        <h1 className="text-3xl font-bold text-orange-500 text-center mb-6">
          Website Accessibility Checker
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Your Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-black border border-orange-500 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="url"
            placeholder="Website URL"
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
            className="w-full bg-black border border-orange-500 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold py-3 px-6 rounded-lg transition"
          >
            Run Scan
          </button>
        </form>

        {loading && <p className="mt-4 text-orange-400">Scanning...</p>}
        {error && <p className="mt-4 text-red-500">{error}</p>}
      </div>
    </div>
  );
}
