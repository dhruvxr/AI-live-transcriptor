import { useState } from "react";
import { Dashboard } from "../components/Dashboard";
import { Settings } from "../components/Settings";
import { PastSessions } from "../components/PastSessions";
import { SimpleLiveTranscription } from "../components/SimpleLiveTranscription";

// Simple test component for Sessions Page
function SimpleSessionsPage({ onNavigate }: { onNavigate: any }) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0F172A', 
      color: 'white', 
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <button
            onClick={() => onNavigate('dashboard')}
            style={{
              backgroundColor: '#4B5563',
              color: 'white',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Session History</h1>
        </div>

        <div style={{ 
          backgroundColor: '#1E293B', 
          padding: '2rem', 
          borderRadius: '12px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Recent Sessions</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {[1, 2, 3].map(session => (
              <div key={session} style={{
                backgroundColor: '#334155',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #475569'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Session {session}
                    </h3>
                    <p style={{ color: '#94A3B8', fontSize: '0.875rem' }}>
                      Duration: {10 + session} minutes • Created: Jan {session + 10}, 2024
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button style={{
                      backgroundColor: '#3B82F6',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}>
                      View
                    </button>
                    <button style={{
                      backgroundColor: '#10B981',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}>
                      Export
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#1E293B', 
          padding: '2rem', 
          borderRadius: '12px'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Session Statistics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ backgroundColor: '#334155', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3B82F6' }}>12</div>
              <div style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Total Sessions</div>
            </div>
            <div style={{ backgroundColor: '#334155', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10B981' }}>4.2h</div>
              <div style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Total Time</div>
            </div>
            <div style={{ backgroundColor: '#334155', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#F59E0B' }}>247</div>
              <div style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Questions Asked</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const navigate = (page: string) => {
    setCurrentPage(page);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'transcription':
        return <SimpleLiveTranscription onNavigate={navigate} />;
      case 'settings':
        return <Settings onNavigate={navigate} />;
      case 'sessions':
        return <SimpleSessionsPage onNavigate={navigate} />;
      case 'past-sessions':
        return <PastSessions onNavigate={navigate} />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return renderCurrentPage();
}

export default App;
