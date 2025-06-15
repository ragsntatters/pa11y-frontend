import React, { useState, useMemo } from 'react';
import { Download, Mail, ExternalLink, AlertTriangle, CheckCircle, XCircle, Info, Eye, Calendar, Globe, Filter, X } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';

export default function ReportResults({ report, onDownloadPdf, onSendEmail }) {
  const [activeTab, setActiveTab] = useState('issues');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'pdf' or 'email'
  const [emailAddress, setEmailAddress] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  if (!report) return null;

  // Calculate scores and counts
  const totalIssues = (report.pa11y?.issues?.length || 0) + 
                     (report.axe?.violations?.reduce((sum, v) => sum + v.nodes.length, 0) || 0);
  const totalPassed = (report.pa11y?.passed?.length || 0) + 
                     (report.axe?.passes?.reduce((sum, p) => sum + p.nodes.length, 0) || 0);
  const totalTests = totalIssues + totalPassed;
  const score = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

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

  // Combine and sort all test results based on WCAG level
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

  // Filter results based on active tab (no 'all' tab)
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

  const handleDownloadPdf = async () => {
    setModalType('pdf');
    setShowModal(true);
  };

  const handleSendEmail = async () => {
    setModalType('email');
    setShowModal(true);
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

  const { url, pa11y, axe, email, type, createdAt } = report;
  const allIssues = pa11y?.issues || [];
  const criticalIssues = allIssues.filter(issue => issue.type === 'error' || issue.type === 'warning');
  const noticeIssues = allIssues.filter(issue => issue.type === 'notice');
  const issues = activeTab === 'issues' ? allIssues : criticalIssues;
  const passed = pa11y?.passed || [];
  const compliant = score >= 95;
  const axeViolations = axe?.violations || [];

  // Add WCAG level display to the header
  const wcagLevel = report.wcagLevel || 'AA';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with score and actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-6 mb-4 md:mb-0">
              <div className="relative">
                <svg className="w-24 h-24">
                  <circle
                    className="text-gray-200"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="44"
                    cx="48"
                    cy="48"
                  />
                  <circle
                    className={`${score >= 90 ? 'text-green-500' : 
                               score >= 70 ? 'text-yellow-500' : 
                               'text-red-500'}`}
                    strokeWidth="8"
                    strokeDasharray={`${score * 2.76} 276`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="44"
                    cx="48"
                    cy="48"
                    transform="rotate(-90 48 48)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{score}</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Accessibility Report</h1>
                <p className="text-sm text-gray-500 mt-1">
                  WCAG {wcagLevel} • {totalTests} total tests • {totalPassed} passed • {totalIssues} issues found
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={handleSendEmail}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Report
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('issues')}
                className={`${
                  activeTab === 'issues'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
              >
                Issues ({failingResults.length})
              </button>
              <button
                onClick={() => setActiveTab('passed')}
                className={`${
                  activeTab === 'passed'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
              >
                Passed ({passedResults.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Results list */}
        <div className="space-y-8">
          {Object.entries(categorized).map(([catKey, issues]) =>
            issues.length > 0 && (
              <div key={catKey}>
                <h2 className="text-lg font-bold mb-2">
                  {CATEGORY_MAP.find(c => c.key === catKey)?.label || 'Other Accessibility Issues'}
                </h2>
                <div className="space-y-4">
                  {issues.map((result, index) => (
                    <div
                      key={`${result.type}-${index}`}
                      className={`bg-white rounded-lg shadow-sm overflow-hidden border border-red-200`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={result.severity === 'critical' ? 'error' : result.severity === 'serious' ? 'warning' : 'info'}
                              >
                                {result.severity === 'critical' ? 'Critical' : result.severity === 'serious' ? 'Serious' : 'Moderate'}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {result.type === 'pa11y' ? 'Pa11y' : 'Axe'}
                              </span>
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                              {result.message}
                            </h3>
                            {result.context && (
                              <div className="mt-2">
                                <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto text-gray-800" style={{ color: '#1F2937' }}>
                                  {result.context}
                                </pre>
                              </div>
                            )}
                            {result.help && (
                              <p className="mt-2 text-sm text-gray-600">
                                {result.help}
                              </p>
                            )}
                            {result.helpUrl && (
                              <a
                                href={result.helpUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
                              >
                                Learn more
                                <ExternalLink className="h-4 w-4 ml-1" />
                              </a>
                            )}
                          </div>
                          {result.screenshot && (
                            <button
                              onClick={() => setSelectedIssue(result)}
                              className="ml-4 flex-shrink-0"
                            >
                              <img
                                src={result.screenshot}
                                alt="Issue screenshot"
                                className="h-20 w-20 object-cover rounded border border-gray-200 hover:border-blue-500 transition-colors"
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* Screenshot modal */}
        {selectedIssue && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full p-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedIssue.message}
                </h3>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <img
                src={selectedIssue.screenshot}
                alt="Issue screenshot"
                className="w-full rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Action modals */}
        {showModal && (
          <Modal
            onClose={() => setShowModal(false)}
          >
            {modalType === 'pdf' ? (
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  The PDF report will include all test results, screenshots, and recommendations.
                </p>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      onDownloadPdf();
                      setShowModal(false);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
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
            )}
          </Modal>
        )}
      </div>
    </div>
  );
} 
