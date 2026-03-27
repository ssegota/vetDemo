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
  FileText,
  Trash2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
        if (typeof data === 'string') {
          // Handle the weird python dictionary string format: {statusCode=200, headers={...}, body={"report": "..."}}
          if (data.includes('body={"report":') || data.includes("body={'report':")) {
            try {
              // Extract everything from {"report": ...} to the end (excluding the closing brace of the main object if possible)
              const bodyMatch = data.match(/body=(\{"report":\s*[\s\S]*?\})\s*\}$/);
              if (bodyMatch && bodyMatch[1]) {
                const parsedBody = JSON.parse(bodyMatch[1]);
                cleanReport = parsedBody.report || parsedBody.body || data;
              } else {
                 // Fallback regex if it's deeply nested
                 const directMatch = data.match(/"report":\s*"(.*)"\s*\}/s);
                 if (directMatch && directMatch[1]) {
                   // Replace escaped newlines
                   cleanReport = directMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                 }
              }
            } catch (e) {
              console.warn('Failed to parse complex report data string format, using fallback.');
            }
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

  const deleteFromHistory = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this diagnosis?')) return;
    
    try {
      console.log('Attempting to delete diagnosis with ID:', id);
      await client.models.Diagnosis.delete({ id: id });
      alert('🗑️ Diagnosis deleted from your history.');
      fetchHistory(); // Refresh the list
    } catch (error) {
      console.error('Error deleting diagnosis:', error);
      alert('❌ Failed to delete diagnosis: ' + (error.message || 'Unknown error'));
    }
  };

  const downloadPDF = async () => {
    try {
      const date = new Date().toLocaleDateString();
      const doctor = user?.signInDetails?.loginId || 'N/A';
      
      // Create a hidden but "visible to layout" container
      const tempDiv = document.createElement('div');
      tempDiv.id = 'pdf-render-container';
      tempDiv.style.position = 'fixed';
      tempDiv.style.top = '0';
      tempDiv.style.left = '-2000px'; // Far off-screen
      tempDiv.style.width = '700px'; 
      tempDiv.style.padding = '40px';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.fontFamily = "'Inter', sans-serif";
      tempDiv.style.color = '#0f172a';
      tempDiv.style.lineHeight = '1.6';
      
      let htmlContent = `
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">dAIgnostics Studio VetNarrative</h1>
          <p style="color: #64748b; font-size: 14px; margin: 10px 0 0 0;">
            Professional Veterinary Diagnostic Report
          </p>
        </div>
        
        <div style="margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p style="margin: 0; font-weight: 700; font-size: 12px; color: #64748b; text-transform: uppercase;">Generated On</p>
            <p style="margin: 5px 0 0 0; font-size: 16px;">${date}</p>
          </div>
          <div>
            <p style="margin: 0; font-weight: 700; font-size: 12px; color: #64748b; text-transform: uppercase;">Doctor</p>
            <p style="margin: 5px 0 0 0; font-size: 16px;">${doctor}</p>
          </div>
        </div>
      `;
      
      if (details) {
        htmlContent += `
          <div style="margin-bottom: 25px;">
            <p style="margin: 0 0 10px 0; font-weight: 700; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Case Details:</p>
            <p style="margin: 0; font-size: 14px; white-space: pre-wrap; color: #475569;">${details}</p>
          </div>
        `;
      }
      
      const activeKeywords = keywords.filter(k => k.trim() !== '').join(', ');
      if (activeKeywords) {
        htmlContent += `
          <div style="margin-bottom: 25px;">
            <p style="margin: 0 0 10px 0; font-weight: 700; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Observations:</p>
            <p style="margin: 0; font-size: 14px; color: #475569;">${activeKeywords}</p>
          </div>
        `;
      }
      
      htmlContent += `
        <div style="margin-bottom: 25px;">
          <p style="margin: 0 0 10px 0; font-weight: 700; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Narrative Report:</p>
          <div style="margin: 0; font-size: 14px; line-height: 1.8; color: #1e293b; white-space: pre-wrap;">${report}</div>
        </div>
        
        <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 10px;">
          This report was generated using dAIgnostics Studio VetNarrative AI. Confidential information for veterinary professional use only.
        </div>
      `;
      
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);
      
      // Wait for font/rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(tempDiv, {
        scale: 2, // Retina quality
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2] // Scale to actual dimensions
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2);
      
      const fileName = `veterinary_report_${new Date().getTime()}.pdf`;
      
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Open in a new tab to bypass the /tmp/ download interceptor issues.
      // The user can then see the report and use the browser's "Save" or "Download" icon.
      const newTab = window.open(blobUrl, '_blank');
      
      // Cleanup the DOM element
      document.body.removeChild(tempDiv);
      
      // If the tab opened successfully, we can't reliably set the title for a Blob URL in all browsers,
      // but the data is there for viewing. 
      if (!newTab) {
        // Fallback to download if popup is blocked
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Revoke after a delay to ensure the new tab has loaded it
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (error) {
      console.error('Error in PDF generation flow:', error);
      alert('❌ Failed to generate PDF: ' + (error.message || 'Unknown error'));
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
                      <h4 style={{ color: 'var(--primary)', flex: 1, margin: 0, paddingRight: '1rem' }}>
                        {item.details?.slice(0, 30) || item.keywords?.slice(0, 3).join(', ') || 'Diagnostic Report'}
                      </h4>
                      <button 
                        className="btn btn-ghost" 
                        style={{ padding: '0.25rem', color: '#ef4444' }} 
                        onClick={(e) => deleteFromHistory(e, item.id)}
                        title="Delete Diagnosis"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {item.details && <p style={{ fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '0.5rem', marginTop: '0.5rem' }}>{item.details.slice(0, 60)}...</p>}
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
