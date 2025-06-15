import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function ReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/report/${id}`);
        if (!res.ok) throw new Error('Failed to fetch report');
        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const handleSendEmail = async () => {
    setEmailSent(false);
    setEmailError(null);
    try {
      const res = await fetch(`/api/report/${id}/email`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to send email');
      setEmailSent(true);
    } catch (err) {
      setEmailError(err.message);
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  if (error) return <div className="min-h-screen bg-black text-red-500 flex items-center justify-center">{error}</div>;
  if (!report) return null;

  const { url, result, status, email, type, createdAt } = report;
  const pa11y = result?.pa11y || result?.pa11y === undefined ? result?.pa11y : result;
  const axe = result?.axe;
  const issues = pa11y?.issues || result?.issues || [];
  const passed = pa11y?.passed || result?.passed || [];
  const score = pa11y?.score || result?.score || Math.max(0, 100 - (issues.length * 5));
  const compliant = score >= 95;
  const axeViolations = axe?.violations || [];

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col items-center p-4">
      <div className="bg-[#1a1a1a] shadow-xl rounded-2xl p-8 w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-orange-500 mb-2">Audit results for <a href={url} className="underline text-orange-400" target="_blank" rel="noopener noreferrer">{url}</a>:</h1>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <path className="text-gray-700" d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
              <path className={compliant ? 'text-green-400' : 'text-orange-500'} d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${score}, 100`} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{score}%</span>
          </div>
          <div>
            <div className="text-lg font-semibold">{compliant ? 'Compliant' : 'Not compliant'} under US law</div>
            <div className="text-xs text-gray-400">{type === 'admin' ? 'Admin report' : 'User report'} &middot; {new Date(createdAt).toLocaleString()}</div>
          </div>
        </div>
        <div className="mb-4">
          <a href={`/api/report/${id}/pdf`} target="_blank" rel="noopener noreferrer" className="bg-orange-500 hover:bg-orange-600 text-black font-semibold py-2 px-4 rounded-lg mr-2">Download as PDF</a>
          <button onClick={handleSendEmail} className="bg-black border border-orange-500 text-orange-400 font-semibold py-2 px-4 rounded-lg hover:bg-orange-900">Send to my email</button>
          {emailSent && <span className="ml-2 text-green-400">Email sent!</span>}
          {emailError && <span className="ml-2 text-red-500">{emailError}</span>}
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-orange-400 mb-2">Critical Issues (Pa11y/HTMLCS) ({issues.length})</h2>
          {issues.length === 0 ? <div className="text-green-400">No critical issues found!</div> : (
            <ul className="space-y-2">
              {issues.map((issue, idx) => (
                <li key={idx} className="bg-black border border-orange-500 rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-orange-300">{issue.message}</div>
                    <div className="text-xs text-gray-400">Selector: <span className="font-mono">{issue.selector}</span></div>
                    <div className="text-xs text-gray-400">Code: <span className="font-mono">{issue.code}</span></div>
                    <div className="text-xs text-gray-400">Type: {issue.type}</div>
                    <div className="text-xs text-gray-400">Context: <span className="font-mono">{issue.context}</span></div>
                  </div>
                  {issue.screenshot && (
                    <img
                      src={issue.screenshot}
                      alt="Issue screenshot"
                      className="w-40 h-32 object-contain border-2 border-orange-400 rounded-lg bg-black"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-orange-400 mb-2">Axe-core Issues & Recommended Fixes ({axeViolations.length})</h2>
          {axeViolations.length === 0 ? <div className="text-green-400">No axe-core issues found!</div> : (
            <ul className="space-y-2">
              {axeViolations.map((v, idx) => (
                <li key={idx} className="bg-black border border-blue-500 rounded-lg p-3">
                  <div className="font-semibold text-blue-300">{v.description}</div>
                  <div className="text-xs text-gray-400 mb-1">Impact: <span className="font-mono">{v.impact}</span></div>
                  <div className="text-xs text-gray-400 mb-1">Recommended Fix: <span className="font-mono">{v.help}</span></div>
                  <div className="text-xs text-gray-400 mb-1">Rule: <span className="font-mono">{v.id}</span></div>
                  <div className="text-xs text-gray-400 mb-1">More info: <a href={v.helpUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-400">{v.helpUrl}</a></div>
                  <div className="text-xs text-gray-400 mb-1">Affected Elements:</div>
                  <ul className="ml-4 list-disc text-xs text-gray-300">
                    {v.nodes.map((node, nidx) => (
                      <li key={nidx} className="flex items-center gap-2 mb-2">
                        <span className="font-mono">{node.target.join(', ')}</span>
                        {node.failureSummary && <span className="ml-2 text-gray-500">- {node.failureSummary}</span>}
                        {node.screenshot && (
                          <img
                            src={node.screenshot}
                            alt="Node screenshot"
                            className="w-32 h-24 object-contain border-2 border-blue-400 rounded-lg bg-black"
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-orange-400 mb-2">Passed Audits ({passed.length})</h2>
          {passed.length === 0 ? <div className="text-gray-400">No passed audits found.</div> : (
            <ul className="space-y-2">
              {passed.map((item, idx) => (
                <li key={idx} className="bg-black border border-green-500 rounded-lg p-3">
                  <div className="font-semibold text-green-300">{item.message}</div>
                  <div className="text-xs text-gray-400">Selector: <span className="font-mono">{item.selector}</span></div>
                  <div className="text-xs text-gray-400">Code: <span className="font-mono">{item.code}</span></div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="text-xs text-gray-500">Report generated for <span className="font-mono">{email}</span></div>
      </div>
    </div>
  );
} 