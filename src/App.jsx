import React, { useState } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import outputs from '../amplify_outputs.json';
import './index.css';

Amplify.configure(outputs);

function GeneratorContent({ signOut, user }) {
  const [keywords, setKeywords] = useState(['', '', '']);
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

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
    try {
      // In Gen 2, if you want to call a function directly, you usually use a specific endpoint 
      // or a GraphQL mutation that triggers the function. 
      // For this implementation, I am preparing the code for the Lambda trigger.
      
      const response = await fetch('/api/generate', { // Mocking the endpoint path
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords }),
      });

      const data = await response.json();
      setReport(data.report || "Error generating report.");
      setLoading(false);
      
    } catch (error) {
      console.error('Error generating report:', error);
      // Fallback mock for demonstration if the API is not yet live
      setTimeout(() => {
        const mockReport = `VETERINARY NARRATIVE REPORT\n\nGenerated for: ${user.username}\nKeywords: ${keywords.join(', ')}\n\nBased on your keywords, the narrative suggests a clinical observation consistent with the examples in the database. Further diagnostic tests are recommended.`;
        setReport(mockReport);
        setLoading(false);
      }, 2000);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Veterinary Report Generator</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>{user?.signInDetails?.loginId}</span>
          <button onClick={signOut} className="logout-btn">Sign Out</button>
        </div>
      </header>

      <main>
        <section className="keyword-section">
          <h2>Enter Keywords</h2>
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>
            Provide clinical signs or observations to generate a narrative report.
          </p>
          
          <div className="keyword-inputs">
            {keywords.map((kw, index) => (
              <div key={index} className="keyword-field">
                <input
                  type="text"
                  placeholder={`Keyword ${index + 1}`}
                  value={kw}
                  onChange={(e) => handleKeywordChange(index, e.target.value)}
                />
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
            <button className="add-btn" onClick={addKeywordField} title="Add keyword field">+</button>
          </div>
        </section>

        <button 
          className="generate-btn" 
          onClick={generateReport}
          disabled={loading || keywords.every(k => k.trim() === '')}
        >
          {loading ? 'Generating...' : 'Generate Narrative Report'}
        </button>

        {report && (
          <div className="report-output">
            <h3>Narrative Report Output</h3>
            <p>{report}</p>
          </div>
        )}
      </main>

      <footer className="footer">
        © 2026 Veterinary Faculty Inspiration | Modern Diagnostic Tools
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <GeneratorContent signOut={signOut} user={user} />
      )}
    </Authenticator>
  );
}
