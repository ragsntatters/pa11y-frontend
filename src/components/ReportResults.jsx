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

  if (!report) return null;

  // Calculate scores and counts
  const totalIssues = (report.pa11y?.issues?.length || 0) + 
                     (report.axe?.violations?.reduce((sum, v) => sum + v.nodes.length, 0) || 0);
  const totalPassed = (report.pa11y?.passed?.length || 0) + 
                     (report.axe?.passes?.reduce((sum, p) => sum + p.nodes.length, 0) || 0);
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
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Accessibility Report
              </h1>
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
            <div className="flex space-x-3 mt-4 sm:mt-0">
              <button
                onClick={handleSendEmail}
                disabled={isSending}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>Email Report</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isPdfGenerating}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isPdfGenerating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-center">
              <CircularProgress score={score} />
              <h3 className="text-lg font-semibold text-gray-900 mt-2">
                Accessibility Score
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-center">
              <div className={`text-3xl font-bold mb-2 ${compliant ? 'text-green-600' : 'text-red-600'}`}>
                {compliant ? (
                  <CheckCircle className="w-12 h-12 mx-auto" />
                ) : (
                  <XCircle className="w-12 h-12 mx-auto" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                WCAG Compliance
              </h3>
              <Badge variant={compliant ? 'success' : 'error'}>
                {compliant ? 'Compliant' : 'Non-compliant'}
              </Badge>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {totalIssues}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Issues Found
              </h3>
              <p className="text-sm text-gray-600">
                Requiring attention
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {totalPassed}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Tests Passed
              </h3>
              <p className="text-sm text-gray-600">
                Working correctly
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('issues')}
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-1 ${
                  activeTab === 'issues'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Issues <span className={activeTab === 'issues' ? 'text-red-600' : 'text-gray-500'}>({failingResults.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('passed')}
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-1 ${
                  activeTab === 'passed'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Passed <span className={activeTab === 'passed' ? 'text-green-600' : 'text-gray-500'}>({passedResults.length})</span>
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
    </div>
  );
} 
