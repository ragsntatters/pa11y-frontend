import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ProgressPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);

  useEffect(() => {
    let interval;
    const poll = async () => {
      try {
        const res = await fetch(`/api/report/${id}`);
        if (!res.ok) throw new Error('Failed to fetch report');
        const report = await res.json();
        setStatus(report.status);
        if (report.status === 'complete') {
          navigate(`/report/${id}`);
        } else if (report.status === 'error') {
          setError(report.result?.error || 'Scan failed');
        }
      } catch (err) {
        setError(err.message);
      }
    };
    poll();
    interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-black text-gray-100 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] shadow-xl rounded-2xl p-8 w-full max-w-lg text-center">
        <h1 className="text-2xl font-bold text-orange-500 mb-4">Running Accessibility Scan...</h1>
        {status === 'pending' && (
          <>
            <div className="w-full bg-gray-800 rounded-full h-4 mb-4">
              <div className="bg-orange-500 h-4 rounded-full animate-pulse" style={{ width: '80%' }}></div>
            </div>
            <p className="text-orange-400">Your report is being generated. This may take up to a minute.</p>
          </>
        )}
        {status === 'error' && (
          <p className="text-red-500 mt-4">{error || 'An error occurred while running the scan.'}</p>
        )}
      </div>
    </div>
  );
} 