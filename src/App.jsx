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
  Clock
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import '@aws-amplify/ui-react/styles.css';
import outputs from '../amplify_outputs.json';
import './index.css';

Amplify.configure(outputs);
const client = generateClient();

function GeneratorContent({ signOut, user }) {
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
        // Handle both string and JSON object response
        const reportContent = typeof data === 'string' ? data : (data?.report || JSON.stringify(data));
        setReport(reportContent || "No report generated.");
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
        keywords: keywords.filter(k => k.trim() !== ''),
        report: report
      });
      alert('Diagnosis saved successfully!');
    } catch (error) {
      console.error('Error saving diagnosis:', error);
      alert('Failed to save diagnosis.');
    } finally {
      setSaving(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text('Veterinary Narrative Report', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date: ${date}`, 20, 30);
    doc.text(`Doctor: ${user?.signInDetails?.loginId || 'N/A'}`, 20, 40);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 45, 190, 45);
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Clinical Keywords:', 20, 55);
    doc.setFontSize(11);
    doc.text(keywords.filter(k => k.trim() !== '').join(', '), 20, 62);
    
    doc.setFontSize(14);
    doc.text('Diagnostic Findings:', 20, 75);
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    
    const splitText = doc.splitTextToSize(report, 170);
    doc.text(splitText, 20, 82);
    
    doc.save(`veterinary-report-${Date.now()}.pdf`);
  };

  const loadFromHistory = (item) => {
    setKeywords(item.keywords || []);
    setReport(item.report);
    setShowHistory(false);
  };

  return (
    <div className="app-container">
      <header>
        <h1><Stethoscope /> VetNarrative AI</h1>
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
          <h2>Clinical Indicators</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            Enter symptoms or clinical signs to generate a professional narrative report.
          </p>
          
          <div className="keyword-inputs">
            {keywords.map((kw, index) => (
              <input
                key={index}
                type="text"
                placeholder={`Clinical sign ${index + 1}...`}
                value={kw}
                onChange={(e) => handleKeywordChange(index, e.target.value)}
              />
            ))}
          </div>
          
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={addKeywordField} title="Add another indicator">
              <Plus size={18} /> Add More
            </button>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '2rem' }}
            onClick={generateReport}
            disabled={loading || keywords.every(k => k.trim() === '')}
          >
            {loading ? <div className="loading-spinner"></div> : <><Send size={18} /> Generate Narrative</>}
          </button>
        </section>

        {report && (
          <section className="card report-output">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Narrative Report</h3>
              <div className="actions">
                <button className="btn btn-secondary" onClick={downloadPDF} title="Export as PDF">
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
              style={{ width: '100%', minHeight: '300px', border: 'none', resize: 'vertical', display: 'block' }}
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
                      <h4>{item.keywords?.slice(0, 3).join(', ') || 'Report'}</h4>
                      <ChevronRight size={16} />
                    </div>
                    <p>{item.report}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Clock size={12} /> {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        © 2026 Veterinary Faculty | Professional Diagnostic Suite
      </footer>
    </div>
  );
}

export default function App() {
  const components = {
    Header() {
      return (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--primary)' }}>
          <Stethoscope size={48} style={{ marginBottom: '0.5rem' }} />
          <h2 style={{ margin: 0, fontWeight: 700 }}>VetNarrative AI</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Professional Diagnostic Suite</p>
        </div>
      );
    },
    Footer() {
      return (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          &copy; 2026 Veterinary Faculty Inspiration
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
