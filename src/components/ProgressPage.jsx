import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal } from './ui/Modal';

export default function ProgressPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);
  const [showCloudflareModal, setShowCloudflareModal] = useState(false);

  // Debug logging for render
  console.log('ProgressPage render:', { status, error, showCloudflareModal });
  console.log('Error check:', error && error.includes('Cloudflare protection detected'));

  useEffect(() => {
    let interval;
    const poll = async () => {
      try {
        const res = await fetch(`/api/report/${id}`);
        if (!res.ok) throw new Error('Failed to fetch report');
        const report = await res.json();
        console.log('Progress poll result:', { 
          status: report.status, 
          error: report.result?.error,
          fullReport: report 
        });
        setStatus(report.status);
        if (report.status === 'complete') {
          navigate(`/report/${id}`);
        } else if (report.status === 'error') {
          const errorMessage = report.result?.error || 'Scan failed';
          console.log('Setting error:', errorMessage);
          console.log('Error includes Cloudflare:', errorMessage.includes('Cloudflare protection detected'));
          setError(errorMessage);
        }
      } catch (err) {
        console.error('Poll error:', err);
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
        {status === 'error' && error && (
          <>
            {error.includes('Cloudflare protection detected') ? (
              <>
                <div className="text-yellow-400 mt-4 mb-4">
                  <strong>Cloudflare Protection Detected:</strong> This website is protected by Cloudflare, which may block automated accessibility scans.
                </div>
                <div className="text-gray-300 mb-4">
                  If you control this website, <button className="underline text-blue-300 hover:text-blue-100" onClick={() => setShowCloudflareModal(true)}>click here for instructions on whitelisting our scanner</button>.
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  Error details: {error}
                </div>
              </>
            ) : (
              <div className="text-red-500 mt-4">
                <div className="font-semibold mb-2">Scan Failed</div>
                <div className="text-sm">{error}</div>
              </div>
            )}
            {showCloudflareModal && (
              <Modal isOpen={showCloudflareModal} onClose={() => setShowCloudflareModal(false)} title="Allow Accessibility Scans through Cloudflare">
                <div className="p-4 space-y-4">
                  <h2 className="text-lg font-bold">How to Allow Accessibility Scans</h2>
                  <p>
                    Our scanner runs on <strong>Google Cloud Platform (GCP)</strong> via Railway. Cloudflare may block automated scans unless you whitelist the GCP IP range.
                  </p>
                  <ol className="list-decimal ml-6 space-y-2">
                    <li>Go to your <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer" className="underline text-blue-700">Cloudflare dashboard</a>.</li>
                    <li>Add a firewall rule to <strong>allow</strong> all traffic from the <a href="https://cloud.google.com/compute/docs/faq#find_ip_range" target="_blank" rel="noopener noreferrer" className="underline text-blue-700">GCP IP ranges</a>.</li>
                    <li>Save and deploy the rule.</li>
                  </ol>
                  <p>
                    For more details, see <a href="https://developers.cloudflare.com/firewall/cf-firewall-rules/actions/allow/" target="_blank" rel="noopener noreferrer" className="underline text-blue-700">Cloudflare: How to whitelist IPs</a>.
                  </p>
                  <p className="text-xs text-gray-500">If you need help, contact your site administrator or Cloudflare support.</p>
                </div>
              </Modal>
            )}
          </>
        )}
      </div>
    </div>
  );
} 
