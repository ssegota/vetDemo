import React, { useState } from 'react';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import outputs from '../amplify_outputs.json';
import './index.css';

Amplify.configure(outputs);
const client = generateClient();

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
    setReport('');
    try {
      // Call the Gen 2 mutation
      const { data, errors } = await client.mutations.generateReport({
        keywords: keywords.filter(k => k.trim() !== '')
      });

      if (errors) {
        console.error('GraphQL errors:', errors);
        setReport("Error: " + errors[0].message);
      } else {
        setReport(data || "No report generated.");
      }
    } catch (error) {
      console.error('Error calling generateReport:', error);
      setReport("Error: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
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
