import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, SignIn, RedirectToSignIn } from '@clerk/clerk-react';
import LandingPage from './components/LandingPage';
import ScanProgress from './components/ScanProgress';
import ReportResults from './components/ReportResults';
import AdminDashboard from './components/AdminDashboard';

function AppRoutes() {
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const navigate = useNavigate();

  // Handler for starting a scan
  const handleScanStart = async ({ email, url, wcagLevel }) => {
    setScanProgress(10);
    setScanStatus('Submitting scan request...');
    try {
      const res = await fetch('/api/public-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, url, wcagLevel })
      });
      if (res.status === 429) {
        alert('You have reached your scan limit for today. Please try again tomorrow or use a different email.');
        setScanStatus('Rate limited.');
        return;
      }
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || `Scan failed with status ${res.status}`);
        setScanStatus('Error: ' + (errorData.error || res.status));
        return;
      }
      const data = await res.json();
      setScanProgress(30);
      setScanStatus('Scan started. Waiting for results...');
      navigate(`/progress/${data.reportId}`);
    } catch (err) {
      alert('An error occurred: ' + err.message);
      setScanStatus('Error: ' + err.message);
    }
  };

  // Handler for downloading PDF
  const handleDownloadPdf = (id) => {
    window.open(`/api/report/${id}/pdf`, '_blank');
  };

  // Handler for sending email
  const handleSendEmail = async (id) => {
    await fetch(`/api/report/${id}/email`, { method: 'POST' });
    // Optionally show a toast/notification
  };

  // Progress page logic
  function ProgressWrapper() {
    const { id } = useParams();
    const [progress, setProgress] = useState(50);
    const [statusMessage, setStatusMessage] = useState('Running scan...');
    const navigate = useNavigate();
    React.useEffect(() => {
      let interval = setInterval(async () => {
        const res = await fetch(`/api/report/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'complete') {
            setProgress(100);
            setStatusMessage('Scan complete!');
            setTimeout(() => navigate(`/report/${id}`), 1000);
          } else if (data.status === 'error') {
            setStatusMessage('Scan failed.');
            clearInterval(interval);
          } else {
            setProgress((p) => Math.min(99, p + 5));
          }
        }
      }, 2000);
      return () => clearInterval(interval);
    }, [id, navigate]);
    return <ScanProgress progress={progress} statusMessage={statusMessage} />;
  }

  // Report page logic (Bolt-style)
  function ReportWrapper() {
    const { id } = useParams();
    const [report, setReport] = useState(null);
    React.useEffect(() => {
      fetch(`/api/report/${id}`).then(res => res.json()).then(data => {
        // Bolt expects pa11y, axe, and screenshot at the top level
        if (data.result && (data.result.pa11y || data.result.axe)) {
          setReport({ ...data, ...data.result });
        } else {
          setReport(data);
        }
      });
    }, [id]);
    return report ? (
      <ReportResults
        report={report}
        onDownloadPdf={() => handleDownloadPdf(id)}
        onSendEmail={() => handleSendEmail(id)}
      />
    ) : <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage onScanStart={handleScanStart} />} />
      <Route path="/progress/:id" element={<ProgressWrapper />} />
      <Route path="/report/:id" element={<ReportWrapper />} />
      <Route
        path="/admin"
        element={
          <>
            <SignedIn>
              <AdminDashboard onLogout={() => window.location.href = '/'} />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      />
      <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ClerkProvider>
  );
}
