import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { Authenticator } from '@aws-amplify/ui-react';
import { 
  Plus, 
  Send, 
  Save, 
  Download, 
  History, 
  LogOut, 
  Stethoscope, 
  X,
  ChevronRight,
  Clock,
  FileText
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import '@aws-amplify/ui-react/styles.css';
import outputs from '../amplify_outputs.json';
import './index.css';

Amplify.configure(outputs);
const client = generateClient();

function GeneratorContent({ signOut, user }) {
  const [details, setDetails] = useState('');
  const [keywords, setKeywords] = useState(['', '', '']);
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await client.models.Diagnosis.list();
      setHistory(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleKeywordChange = (index, value) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };

  const addKeywordField = () => {
    setKeywords([...keywords, '']);
  };

  const generateReport = async () => {
    setLoading(true);
    setReport('');
    try {
      const { data, errors } = await client.mutations.generateReport({
        keywords: keywords.filter(k => k.trim() !== '')
      });

      if (errors) {
        console.error('GraphQL errors:', errors);
        setReport("Error generating report: " + errors[0].message);
      } else {
        // Clean up: if data is a technical string representation of a result object, parse it
        let cleanReport = data;
        if (typeof data === 'string' && (data.includes('statusCode=200') || data.startsWith('{'))) {
          try {
            // Attempt to parse if it's JSON, or handle the custom format seen in feedback
            if (data.startsWith('{')) {
              const parsed = JSON.parse(data);
              cleanReport = parsed.report || parsed.body || data;
            }
          } catch (e) {
            console.warn('Failed to parse report data as JSON, using raw string.');
          }
        }
        setReport(cleanReport || "No report generated.");
      }
    } catch (error) {
      console.error('Error calling generateReport:', error);
      setReport("Error: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const saveToStorage = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await client.models.Diagnosis.create({
        details: details,
        keywords: keywords.filter(k => k.trim() !== ''),
        report: report
      });
      alert('✅ Diagnosis successfully saved to your history!');
      fetchHistory(); // Refresh history if panel is open
    } catch (error) {
      console.error('Error saving diagnosis:', error);
      alert('❌ Failed to save diagnosis: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text('dAIgnostics Studio VetNarrative', 20, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on ${date} | Doctor: ${user?.signInDetails?.loginId || 'N/A'}`, 20, 28);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 32, 190, 32);
      
      // Clinical Details
      if (details) {
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Clinical Details:', 20, 42);
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);
        const splitDetails = doc.splitTextToSize(details, 170);
        doc.text(splitDetails, 20, 48);
      }
      
      const startY = details ? 55 + (doc.splitTextToSize(details, 170).length * 5) : 42;

      // Keywords
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Observations:', 20, startY);
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(keywords.filter(k => k.trim() !== '').join(', '), 20, startY + 7);
      
      // Narrative Report
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Narrative Report:', 20, startY + 20);
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      
      const splitText = doc.splitTextToSize(report, 170);
      doc.text(splitText, 20, startY + 27);
      
      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Confidential Veterinary Report - dAIgnostics Studio VetNarrative', 20, pageHeight - 10);
      
      doc.save(`vet-report-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check the console for details.');
    }
  };

  const loadFromHistory = (item) => {
    setDetails(item.details || '');
    setKeywords(item.keywords || []);
    setReport(item.report);
    setShowHistory(false);
  };

  return (
    <div className="app-container">
      <header>
        <h1><Stethoscope /> dAIgnostics Studio</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setShowHistory(true)} className="btn btn-ghost" title="Past Diagnoses">
            <History size={20} /> <span className="hide-mobile">History</span>
          </button>
          <div className="btn btn-secondary hide-mobile" style={{ cursor: 'default' }}>
            {user?.signInDetails?.loginId}
          </div>
          <button onClick={signOut} className="btn btn-ghost" title="Sign Out">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className={`main-content ${report ? 'with-report' : ''}`}>
        <section className="card keyword-section">
          <h2>Clinical Input</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            Provide case details and observations for a professional narrative analysis.
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="input-label">Case Details</label>
            <textarea
              className="details-textarea"
              placeholder="Enter patient details, history, or context..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
          
          <div>
            <label className="input-label">Clinical Observations (Keywords)</label>
            <div className="keyword-inputs">
              {keywords.map((kw, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={`Observation ${index + 1}...`}
                  value={kw}
                  onChange={(e) => handleKeywordChange(index, e.target.value)}
                />
              ))}
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={addKeywordField} title="Add another observation">
                <Plus size={16} /> Add Observation
              </button>
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '2rem' }}
            onClick={generateReport}
            disabled={loading || (keywords.every(k => k.trim() === '') && !details)}
          >
            {loading ? <div className="loading-spinner"></div> : <><Send size={18} /> Generate Narrative</>}
          </button>
        </section>

        {report && (
          <section className="card report-output">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} /> Narrative Report
              </h3>
              <div className="actions">
                <button className="btn btn-secondary" onClick={downloadPDF} title="Download as PDF">
                  <Download size={18} /> PDF
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={saveToStorage} 
                  disabled={saving}
                  title="Save to history"
                >
                  {saving ? <div className="loading-spinner"></div> : <><Save size={18} /> Save</>}
                </button>
              </div>
            </div>
            <textarea 
              className="report-text" 
              value={report} 
              onChange={(e) => setReport(e.target.value)}
              style={{ width: '100%', minHeight: '400px', border: 'none', resize: 'vertical', display: 'block' }}
            />
          </section>
        )}
      </main>

      {showHistory && (
        <div className="history-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-panel" onClick={e => e.stopPropagation()}>
            <div className="history-header">
              <h3 style={{ margin: 0 }}>Diagnosis History</h3>
              <button className="btn btn-ghost" onClick={() => setShowHistory(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="history-list">
              {loadingHistory ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <div className="loading-spinner"></div>
                </div>
              ) : history.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No saved diagnoses yet.</p>
              ) : (
                history.map(item => (
                  <div key={item.id} className="history-item" onClick={() => loadFromHistory(item)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ color: 'var(--primary)' }}>{item.details?.slice(0, 30) || item.keywords?.slice(0, 3).join(', ') || 'Diagnostic Report'}</h4>
                      <ChevronRight size={16} />
                    </div>
                    {item.details && <p style={{ fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>{item.details.slice(0, 60)}...</p>}
                    <p>{item.report}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Clock size={12} /> {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        © 2026 dAIgnostics Studio VetNarrative | Professional Diagnostic Toolkit
      </footer>
    </div>
  );
}

export default function App() {
  const components = {
    Header() {
      return (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--primary)' }}>
          <Stethoscope size={56} style={{ marginBottom: '0.75rem' }} />
          <h2 style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.025em' }}>dAIgnostics Studio</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>VetNarrative Diagnostic Toolkit</p>
        </div>
      );
    },
    Footer() {
      return (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          &copy; 2026 Veterinary Faculty Inspiration | dAIgnostics Studio
        </div>
      );
    },
  };

  return (
    <div className="auth-wrapper">
      <Authenticator components={components}>
        {({ signOut, user }) => (
          <GeneratorContent signOut={signOut} user={user} />
        )}
      </Authenticator>
    </div>
  );
}
