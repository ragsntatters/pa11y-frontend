import React, { useEffect, useState } from 'react';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard({ onLogout }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedWidth, setEmbedWidth] = useState(400);
  const [embedHeight, setEmbedHeight] = useState(600);
  const [scanUrl, setScanUrl] = useState('');
  const [scanEmail, setScanEmail] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [scanReportId, setScanReportId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [scanWcagLevel, setScanWcagLevel] = useState('AA');
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const frontendUrl = "https://pa11y.wookongmarketing.com/";
  const embedCode = `<iframe\n  src=\"${frontendUrl}\"\n  width=\"${embedWidth}\"\n  height=\"${embedHeight}\"\n  style=\"border:none; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.1);\"\n  title=\"Accessibility Scan\"\n  allowtransparency=\"true\"\n></iframe>`;

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line
  }, []);

  const fetchReports = async () => {
    try {
      setError(null);
      const token = await getToken();
      const res = await fetch('/api/reports', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch reports');
      const data = await res.json();
      setReports(data);
    } catch (err) {
      setError(err.message);
    }
  };

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
        body: JSON.stringify({ url: scanUrl, email: scanEmail, wcagLevel: scanWcagLevel })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setScanReportId(data.reportId);
      setScanUrl('');
      setScanEmail('');
      setScanWcagLevel('AA');
      fetchReports();
      // Redirect to progress page after scan starts
      navigate(`/progress/${data.reportId}`);
    } catch (err) {
      setScanError(err.message);
    } finally {
      setScanLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/report/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }
      setReports(reports.filter(r => r._id !== id));
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 text-blue-900 p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Report Dashboard</h1>
        <div className="flex flex-col items-end">
          <button
            onClick={onLogout}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-4 rounded-lg text-sm mb-2"
          >
            Logout
          </button>
          <button
            onClick={() => setShowEmbed(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-4 rounded-lg text-sm"
          >
            Get Embed Code
          </button>
        </div>
      </div>
      {showEmbed && (
        <Modal open={showEmbed} onClose={() => setShowEmbed(false)}>
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">Embed This Form</h2>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2">
                Width:
                <input
                  type="number"
                  value={embedWidth}
                  onChange={e => setEmbedWidth(e.target.value)}
                  className="border px-2 py-1 rounded w-24"
                />
              </label>
              <label className="flex items-center gap-2">
                Height:
                <input
                  type="number"
                  value={embedHeight}
                  onChange={e => setEmbedHeight(e.target.value)}
                  className="border px-2 py-1 rounded w-24"
                />
              </label>
            </div>
            <textarea
              readOnly
              value={embedCode}
              className="w-full h-32 border rounded p-2 font-mono mb-4 text-sm bg-gray-50"
              rows="5"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(embedCode);
                }}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowEmbed(false)}
                className="bg-gray-300 hover:bg-gray-400 text-black font-semibold py-2 px-4 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
      <div className="mb-8 max-w-xl mx-auto bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-blue-600 text-center">Run New Scan</h2>
        <form onSubmit={handleAdminScan} className="space-y-4">
          <input
            type="url"
            placeholder="Website URL"
            value={scanUrl}
            onChange={e => {
              let val = e.target.value.trim();
              if (val && !/^https?:\/\//i.test(val)) {
                val = 'https://' + val;
              }
              setScanUrl(val);
            }}
            required
            className="w-full border border-blue-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
          />
          <input
            type="email"
            placeholder="Recipient Email"
            value={scanEmail}
            onChange={e => setScanEmail(e.target.value)}
            required
            className="w-full border border-blue-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
          />
          <div>
            <label htmlFor="wcagLevel" className="block text-sm font-medium text-gray-700 mb-1">WCAG Level</label>
            <select
              id="wcagLevel"
              value={scanWcagLevel}
              onChange={e => setScanWcagLevel(e.target.value)}
              className="w-full border border-blue-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
            >
              <option value="AA">WCAG 2.1 AA</option>
              <option value="AAA">WCAG 2.1 AAA</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            disabled={scanLoading}
          >
            {scanLoading ? 'Running Scan...' : 'Run Scan'}
          </button>
        </form>
        {scanError && <div className="text-red-500 mt-2">{scanError}</div>}
      </div>
      {deleteError && <div className="text-red-500 mb-2">{deleteError}</div>}
      {error && (
        <div className="text-center text-red-500 mb-4">
          {error} <button onClick={fetchReports} className="underline ml-2">Refresh</button>
        </div>
      )}
      {reports.length === 0 && !error ? (
        <div className="text-center text-blue-400">
          No reports found <button onClick={fetchReports} className="underline ml-2">Refresh</button>
        </div>
      ) : null}
      {reports.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border border-blue-300 text-sm">
            <thead>
              <tr className="bg-blue-100 text-blue-700">
                <th className="border px-4 py-2">Type</th>
                <th className="border px-4 py-2">URL</th>
                <th className="border px-4 py-2">Email</th>
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r._id} className="border-t border-blue-100">
                  <td className="border px-4 py-2">
                    <Badge variant={r.type === 'admin' ? 'success' : 'info'}>{r.type === 'admin' ? 'ADMIN' : 'USER'}</Badge>
                  </td>
                  <td className="border px-4 py-2">{r.url}</td>
                  <td className="border px-4 py-2">{r.email}</td>
                  <td className="border px-4 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="border px-4 py-2 flex gap-2 items-center">
                    <a href={`/api/report/${r._id}/pdf`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Download PDF</a>
                    <a href={`/report/${r._id}`} className="text-green-600 hover:underline ml-2">View Report</a>
                    <button
                      onClick={() => handleDelete(r._id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs ml-2"
                    >
                      Delete
                    </button>
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
