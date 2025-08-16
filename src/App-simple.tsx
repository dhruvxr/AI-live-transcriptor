function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0F172A', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          🎙️ AI Live Transcriptor
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#94A3B8', marginBottom: '2rem' }}>
          This is a test to see if the app is loading!
        </p>
        <div style={{ 
          width: '24px', 
          height: '24px', 
          border: '4px solid #3B82F6', 
          borderTop: '4px solid transparent', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
      </div>
    </div>
  );
}

export default App;
