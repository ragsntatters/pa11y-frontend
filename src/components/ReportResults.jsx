import React, { useState, useMemo } from 'react';
import { Download, Mail, ExternalLink, AlertTriangle, CheckCircle, XCircle, Info, Eye, Calendar, Globe, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';

export default function ReportResults({ report, onDownloadPdf, onSendEmail }) {
  const [activeTab, setActiveTab] = useState('issues');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showCloudflareModal, setShowCloudflareModal] = useState(false);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  if (!report) return null;

  // Calculate scores and counts using the same filtered data as tabs
  const allResults = useMemo(() => {
    const results = [];
    const wcagLevel = report.wcagLevel || 'AA'; // Default to AA if not specified

    // Add Pa11y issues matching WCAG level
    (report.pa11y?.issues || []).forEach(issue => {
      if (matchesWcagLevel({ ...issue, type: 'pa11y' }, wcagLevel)) {
        results.push({
          ...issue,
          type: 'pa11y',
          severity: issue.type === 'error' ? 'critical' : issue.type === 'warning' ? 'serious' : 'moderate',
          passed: false
        });
      }
    });

    // Add Axe violations matching WCAG level
    (report.axe?.violations || []).forEach(violation => {
      if (matchesWcagLevel({ ...violation, type: 'axe' }, wcagLevel)) {
        violation.nodes.forEach(node => {
          results.push({
            ...violation,
            ...node,
            type: 'axe',
            severity: violation.impact === 'critical' ? 'critical' : violation.impact === 'serious' ? 'serious' : 'moderate',
            message: violation.description,
            selector: node.target?.[0],
            context: node.html,
            screenshot: node.screenshot,
            help: violation.help,
            helpUrl: violation.helpUrl,
            impact: violation.impact,
            tags: violation.tags,
            passed: false
          });
        });
      }
    });

    // Add Pa11y passed tests matching WCAG level
    (report.pa11y?.passed || []).forEach(passed => {
      if (matchesWcagLevel({ ...passed, type: 'pa11y' }, wcagLevel)) {
        results.push({ ...passed, type: 'pa11y', severity: 'passed', passed: true });
      }
    });

    // Add Axe passed tests matching WCAG level
    (report.axe?.passes || []).forEach(pass => {
      if (matchesWcagLevel({ ...pass, type: 'axe' }, wcagLevel)) {
        pass.nodes.forEach(node => {
          results.push({
            ...pass,
            ...node,
            type: 'axe',
            severity: 'passed',
            message: pass.description,
            selector: node.target?.[0],
            context: node.html,
            screenshot: node.screenshot,
            help: pass.help,
            helpUrl: pass.helpUrl,
            impact: 'passed',
            tags: pass.tags,
            passed: true
          });
        });
      }
    });

    // Sort by severity (critical first, then passed tests)
    return results.sort((a, b) => {
      const severityOrder = { critical: 0, serious: 1, moderate: 2, passed: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [report]);

  // Calculate scores and counts using the filtered allResults
  const totalIssues = allResults.filter(r => !r.passed).length;
  const totalPassed = allResults.filter(r => r.passed).length;
  const totalTests = totalIssues + totalPassed;
  const score = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  const wcagLevel = report.wcagLevel || 'AA';
  const compliant = score >= 95;

  const handleDownloadPdf = async () => {
    setIsPdfGenerating(true);
    await onDownloadPdf();
    setIsPdfGenerating(false);
  };

  const handleSendEmail = async () => {
    setModalType('email');
    setShowModal(true);
  };

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const CircularProgress = ({ score }) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={getScoreColor(score)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <div className="text-xs text-gray-500">SCORE</div>
          </div>
        </div>
      </div>
    );
  };

  // Helper: check if issue matches selected WCAG level
  function matchesWcagLevel(issue, wcagLevel) {
    // For Axe issues, check if it matches the current WCAG level
    if (issue.type === 'axe' && issue.tags && Array.isArray(issue.tags)) {
      return issue.tags.some(tag => tag.includes(`wcag2${wcagLevel.toLowerCase()}`));
    }
    // For Pa11y issues, check if it matches the WCAG level
    if (issue.type === 'pa11y') {
      const code = (issue.code || '').toLowerCase();
      const helpUrl = (issue.helpUrl || '').toLowerCase();
      return (
        code.includes(`wcag2${wcagLevel.toLowerCase()}`) || 
        helpUrl.includes(`wcag2${wcagLevel.toLowerCase()}`) ||
        (code.includes('wcag2') && helpUrl.includes(wcagLevel.toLowerCase()))
      );
    }
    return false;
  }

  // Filter results based on active tab
  const filteredResults = useMemo(() => {
    if (activeTab === 'passed') return allResults.filter(r => r.passed);
    return allResults.filter(r => !r.passed);
  }, [allResults, activeTab]);

  // WCAG-relevant categories mapping with improved matching
  const CATEGORY_MAP = [
    {
      key: 'screenreader',
      label: 'Screen Reader and Assistive Technology Tests',
      match: (issue) => (
        /heading|aria|label|name|screen reader|alt text|descernible|role|semantic|landmark/i.test(issue.message || '') ||
        /aria|heading|label|name|descernible|role|semantic|landmark/i.test(issue.code || '') ||
        /aria|heading|label|name|descernible|role|semantic|landmark/i.test(issue.help || '')
      ),
    },
    {
      key: 'visual',
      label: 'Visual and Structural Accessibility Tests',
      match: (issue) => (
        /contrast|color|visual|structure|font|background|spacing|layout|responsive|zoom|text size/i.test(issue.message || '') ||
        /contrast|color|visual|structure|font|background|spacing|layout|responsive|zoom|text size/i.test(issue.code || '') ||
        /contrast|color|visual|structure|font|background|spacing|layout|responsive|zoom|text size/i.test(issue.help || '')
      ),
    },
    {
      key: 'navigation',
      label: 'Interaction and Navigation Tests',
      match: (issue) => (
        /keyboard|focus|tab|navigation|skip|order|interactive|click|hover|pointer|target|link|button/i.test(issue.message || '') ||
        /keyboard|focus|tab|navigation|skip|order|interactive|click|hover|pointer|target|link|button/i.test(issue.code || '') ||
        /keyboard|focus|tab|navigation|skip|order|interactive|click|hover|pointer|target|link|button/i.test(issue.help || '')
      ),
    },
    {
      key: 'content',
      label: 'Content and Language Tests',
      match: (issue) => (
        /language|content|text|readable|understandable|language|translation|localization/i.test(issue.message || '') ||
        /language|content|text|readable|understandable|language|translation|localization/i.test(issue.code || '') ||
        /language|content|text|readable|understandable|language|translation|localization/i.test(issue.help || '')
      ),
    },
  ];

  function categorizeIssues(issues) {
    const categories = {};
    CATEGORY_MAP.forEach(cat => { categories[cat.key] = []; });
    categories.other = [];
    issues.forEach(issue => {
      const found = CATEGORY_MAP.find(cat => cat.match(issue));
      if (found) {
        categories[found.key].push(issue);
      } else {
        categories.other.push(issue);
      }
    });
    return categories;
  }

  // Only show failing issues (not passed)
  const failingResults = filteredResults.filter(r => !r.passed);
  const passedResults = filteredResults.filter(r => r.passed);
  const categorized = useMemo(() => categorizeIssues(activeTab === 'passed' ? passedResults : failingResults), [activeTab, failingResults, passedResults]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar/Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 mr-4">Accessibility Report</h1>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Globe className="w-4 h-4" />
                <span className="truncate max-w-xs" title={report.url}>{report.url}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
              </div>
              <Badge variant="info">WCAG {wcagLevel}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendEmail}
              className="flex items-center gap-2 border border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold py-2 px-4 rounded-lg transition"
            >
              <Mail className="w-5 h-5" /> Email Report
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              disabled={isPdfGenerating}
            >
              <Download className="w-5 h-5" /> Download PDF
            </button>
          </div>
        </div>
      </div>
      {/* Header with screenshot and summary grid */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8">
            {/* Screenshot on the left (desktop), above grid (mobile) */}
            {report.pageScreenshot && (
              <div className="mb-6 lg:mb-0 flex-shrink-0 flex justify-center items-center w-full lg:w-auto">
                <button
                  type="button"
                  className="focus:outline-none"
                  onClick={() => setShowScreenshotModal(true)}
                  aria-label="View full screenshot"
                >
                  <img
                    src={report.pageScreenshot}
                    alt="Page screenshot"
                    className="rounded-lg shadow-lg w-full max-w-xs h-auto border border-gray-200 hover:opacity-90 transition"
                    style={{ maxHeight: '260px', objectFit: 'contain' }}
                  />
                </button>
              </div>
            )}
            {/* 2x2 grid of summary tiles on the right, always 2 columns */}
            <div className="flex-1 w-full">
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex flex-col items-center justify-center h-full">
                    <CircularProgress score={score} />
                    <h3 className="text-lg font-semibold text-gray-900 mt-2 text-center">
                      Accessibility Score
                    </h3>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className={`text-3xl font-bold mb-2 ${compliant ? 'text-green-600' : 'text-red-600'}`}> 
                      {compliant ? (
                        <CheckCircle className="w-12 h-12 mx-auto" />
                      ) : (
                        <XCircle className="w-12 h-12 mx-auto" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 text-center">
                      WCAG Compliance
                    </h3>
                    <Badge variant={compliant ? 'success' : 'error'}>
                      {compliant ? 'Compliant' : 'Non-compliant'}
                    </Badge>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-3xl font-bold text-red-600 mb-2">
                      {totalIssues}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 text-center">
                      Issues Found
                    </h3>
                    <p className="text-sm text-gray-600 text-center">
                      Requiring attention
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {totalPassed}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 text-center">
                      Tests Passed
                    </h3>
                    <p className="text-sm text-gray-600 text-center">
                      Working correctly
                    </p>
                  </div>
                </div>
              </div>
              {/* Report meta info */}
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Globe className="w-4 h-4" />
                  <span>{report.url}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Badge variant="info">WCAG {wcagLevel}</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Screenshot Modal */}
        {showScreenshotModal && report.pageScreenshot && (
          <Modal isOpen={showScreenshotModal} onClose={() => setShowScreenshotModal(false)} title="Page Screenshot" size="lg">
            <div className="p-4 flex justify-center items-center">
              <img
                src={report.pageScreenshot}
                alt="Full page screenshot"
                className="rounded-lg shadow-lg max-w-full h-auto border border-gray-200"
                style={{ maxHeight: '80vh', objectFit: 'contain' }}
              />
            </div>
          </Modal>
        )}
      </header>

      {((report?.pa11y?.error && report.pa11y.error.includes('Cloudflare protection detected')) || 
        (report?.result?.error && report.result.error.includes('Cloudflare protection detected'))) && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded">
          <div className="flex items-center justify-between">
            <span>
              <strong>Cloudflare Protection Detected:</strong> This website is protected by Cloudflare, which may block automated accessibility scans.<br/>
              If you control this website, <button className="underline text-blue-700 hover:text-blue-900" onClick={() => setShowCloudflareModal(true)}>click here for instructions on whitelisting our scanner</button>.
            </span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('issues')}
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-1 ${
                  activeTab === 'issues'
                    ? 'border-red-500 text-red-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-white'
                }`}
              >
                Issues <span className={activeTab === 'issues' ? 'text-red-600' : 'text-gray-500'}>({allResults.filter(r => !r.passed).length})</span>
              </button>
              <button
                onClick={() => setActiveTab('passed')}
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-1 ${
                  activeTab === 'passed'
                    ? 'border-green-500 text-green-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-white'
                }`}
              >
                Passed <span className={activeTab === 'passed' ? 'text-green-600' : 'text-gray-500'}>({allResults.filter(r => r.passed).length})</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Results list */}
        <div className="space-y-8">
          {Object.entries(categorized).map(([catKey, issues]) =>
            issues.length > 0 && (
              <div key={catKey} className="bg-white rounded-lg shadow-sm">
                <button
                  onClick={() => toggleCategory(catKey)}
                  className="w-full p-6 border-b flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    {catKey === 'screenreader' && <AlertTriangle className="w-6 h-6 text-red-600" />}
                    {catKey === 'visual' && <AlertTriangle className="w-6 h-6 text-orange-600" />}
                    {catKey === 'navigation' && <AlertTriangle className="w-6 h-6 text-yellow-600" />}
                    {catKey === 'content' && <AlertTriangle className="w-6 h-6 text-blue-600" />}
                    <h2 className="text-xl font-bold text-gray-900">
                      {CATEGORY_MAP.find(c => c.key === catKey)?.label || 'Other Accessibility Issues'}
                    </h2>
                    <Badge variant="neutral" className="ml-2">
                      {issues.length}
                    </Badge>
                  </div>
                  {expandedCategories[catKey] ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {expandedCategories[catKey] && (
                  <div className="divide-y">
                    {issues.map((result, index) => (
                      <div key={`${result.type}-${index}`} className="p-6">
                        <div className="flex flex-col lg:flex-row lg:space-x-6">
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <Badge
                                variant={result.severity === 'critical' ? 'error' : result.severity === 'serious' ? 'warning' : 'info'}
                              >
                                {result.severity === 'critical' ? 'Critical' : result.severity === 'serious' ? 'Serious' : 'Moderate'}
                              </Badge>
                              {result.helpUrl && (
                                <a
                                  href={result.helpUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  <span>Learn more</span>
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {result.message}
                            </h3>
                            <div className="space-y-2 text-sm text-gray-600">
                              {result.selector && (
                                <p>
                                  <strong>Element:</strong>{' '}
                                  <code className="bg-gray-100 px-2 py-1 rounded text-gray-800">
                                    {result.selector}
                                  </code>
                                </p>
                              )}
                              {result.code && (
                                <p><strong>Code:</strong> {result.code}</p>
                              )}
                              {result.context && (
                                <div>
                                  <strong>Context:</strong>
                                  <pre className="bg-gray-100 p-2 rounded mt-1 text-xs text-gray-800 whitespace-pre-wrap break-words max-w-full overflow-x-auto">
                                    {result.context}
                                  </pre>
                                </div>
                              )}
                              {result.help && (
                                <p className="mt-2">{result.help}</p>
                              )}
                            </div>
                          </div>
                          {result.screenshot && (
                            <div className="mt-4 lg:mt-0 lg:flex-shrink-0 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setSelectedIssue(result)}
                                className="focus:outline-none"
                                style={{ maxWidth: '128px', maxHeight: '128px', display: 'block' }}
                                aria-label="View screenshot"
                              >
                                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-colors bg-white flex items-center justify-center">
                                  <img
                                    src={result.screenshot}
                                    alt="Issue screenshot"
                                    className="object-contain w-full h-full cursor-pointer"
                                    style={{ maxWidth: '128px', maxHeight: '128px' }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <Eye className="w-8 h-8 text-white bg-black bg-opacity-50 rounded-full p-1" />
                                  </div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* No Issues Found */}
          {activeTab === 'issues' && failingResults.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No Critical Issues Found
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Congratulations! Your website passed all accessibility tests. 
                However, manual testing is still recommended for comprehensive coverage.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Screenshot Modal */}
      {selectedIssue && (
        <Modal
          isOpen={!!selectedIssue}
          onClose={() => setSelectedIssue(null)}
          title="Issue Screenshot"
          size="lg"
        >
          <div className="p-4">
            <img
              src={selectedIssue.screenshot}
              alt="Enlarged screenshot"
              className="w-full h-auto rounded-lg"
            />
          </div>
        </Modal>
      )}

      {/* Email Modal */}
      {showModal && modalType === 'email' && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Send Report via Email"
        >
          <div className="p-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              type="email"
              id="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter email address"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={async () => {
                  if (!emailAddress) {
                    setError('Please enter an email address');
                    return;
                  }
                  setIsSending(true);
                  setError(null);
                  try {
                    await onSendEmail(emailAddress);
                    setShowModal(false);
                  } catch (err) {
                    setError(err.message || 'Failed to send email');
                  } finally {
                    setIsSending(false);
                  }
                }}
                disabled={isSending}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSending ? 'Sending...' : 'Send Report'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cloudflare Modal */}
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
    </div>
  );
} 
