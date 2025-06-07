import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const { getToken } = useAuth();
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [scanReportId, setScanReportId] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/reports', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setReports(data);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
        setError(err.message);
      }
    };

    fetchReports();
  }, [getToken]);

  const handleAdminScan = async (e) => {
    e.preventDefault();
    setScanLoading(true);
    setScanError(null);
    setScanReportId(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin-scan', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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
      setScanReportId(data.reportId);
      setUrl('');
      setEmail('');
    } catch (err) {
      setScanError(err.message);
    } finally {
      setScanLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-4 flex items-center justify-center">
        <div className="text-red-500">Error loading reports: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-3xl font-bold text-orange-500 mb-6 text-center">Admin Report Dashboard</h1>
      <div className="mb-8 max-w-xl mx-auto bg-[#1a1a1a] p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-orange-400">Run New Admin Scan</h2>
        <form onSubmit={handleAdminScan} className="flex flex-col gap-3">
          <input
            type="url"
            placeholder="Website URL"
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
            className="bg-black border border-orange-500 text-white rounded-lg px-4 py-2"
          />
          <input
            type="email"
            placeholder="Recipient Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-black border border-orange-500 text-white rounded-lg px-4 py-2"
          />
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-black font-semibold py-2 px-6 rounded-lg transition"
            disabled={scanLoading}
          >
            {scanLoading ? 'Running Scan...' : 'Run Admin Scan'}
          </button>
        </form>
        {scanError && <div className="text-red-500 mt-2">{scanError}</div>}
        {scanReportId && (
          <div className="text-green-400 mt-2">
            Scan started! <a href={`/progress/${scanReportId}`} className="underline">View progress</a>
          </div>
        )}
      </div>
      {reports.length === 0 ? (
        <div className="text-center text-gray-400">No reports found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-orange-500 text-sm">
            <thead>
              <tr className="bg-[#1a1a1a] text-orange-400">
                <th className="border px-4 py-2">Type</th>
                <th className="border px-4 py-2">URL</th>
                <th className="border px-4 py-2">Email</th>
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r._id} className="border-t border-gray-700">
                  <td className="border px-4 py-2">
                    {r.type === 'admin' ? (
                      <span className="bg-orange-500 text-black px-2 py-1 rounded text-xs font-bold">ADMIN</span>
                    ) : (
                      <span className="bg-gray-700 text-orange-300 px-2 py-1 rounded text-xs">USER</span>
                    )}
                  </td>
                  <td className="border px-4 py-2">{r.url}</td>
                  <td className="border px-4 py-2">{r.email}</td>
                  <td className="border px-4 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="border px-4 py-2">
                    <a href={`/api/report/${r._id}/pdf`} target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">Download PDF</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
