import React, { useState } from 'react';

export default function PublicScan() {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://pa11y-backend.wookongmarketing.com/api/public-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email })
      });
      const result = await res.json();
      setReport(result);
    } catch (err) {
      setError(err.message);
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
        {report && (
          <div className="mt-6 p-4 bg-black border border-orange-500 rounded-xl">
            <h2 className="text-xl font-bold text-orange-400">Scan Results</h2>
            <p className="text-sm text-gray-300 mt-2"><strong>URL:</strong> {report.url}</p>
            <pre className="text-xs bg-[#1f1f1f] p-2 rounded mt-2 overflow-x-auto text-gray-100">
              {JSON.stringify(report.result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
