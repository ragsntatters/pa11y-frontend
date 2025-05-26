import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const { getToken } = useAuth();

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const res = await fetch('https://pa11y-backend.wookongmarketing.com/api/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setReports(data);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-3xl font-bold text-orange-500 mb-6 text-center">Admin Report Dashboard</h1>
      <div className="overflow-x-auto">
        <table className="w-full border border-orange-500 text-sm">
          <thead>
            <tr className="bg-[#1a1a1a] text-orange-400">
              <th className="border px-4 py-2">URL</th>
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Date</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r._id} className="border-t border-gray-700">
                <td className="border px-4 py-2">{r.url}</td>
                <td className="border px-4 py-2">{r.email}</td>
                <td className="border px-4 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="border px-4 py-2">
                  <a href={`https://pa11y-backend.wookongmarketing.com/api/report/${r._id}/pdf`} target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">Download PDF</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
