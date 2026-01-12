// pages/index.js - ELIMINA esta línea del inicio:
// import '../styles/globals.css';

import { useState, useEffect } from 'react';
import Web3 from 'web3';

export default function Home() {
  // ... (todo tu código JavaScript original SIN cambios) ...
  
  // ESTILOS EN OBJETO JAVASCRIPT
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      padding: '30px',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
      paddingBottom: '20px',
      borderBottom: '2px solid #f0f0f0'
    },
    h1: {
      fontSize: '2.5em',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '10px'
    },
    subtitle: {
      color: '#666',
      fontSize: '1.1em',
      marginBottom: '20px'
    },
    inputSection: {
      background: '#f8fafc',
      padding: '25px',
      borderRadius: '15px',
      marginBottom: '30px',
      border: '2px solid #e2e8f0'
    },
    inputGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#2d3748'
    },
    input: {
      width: '100%',
      padding: '15px',
      border: '2px solid #cbd5e0',
      borderRadius: '10px',
      fontSize: '16px',
      fontFamily: 'monospace',
      marginBottom: '15px'
    },
    button: {
      padding: '15px 30px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      marginRight: '10px'
    },
    networkStatus: {
      display: 'inline-block',
      padding: '12px 24px',
      borderRadius: '50px',
      fontWeight: '600',
      marginTop: '10px'
    },
    networkConnected: {
      background: '#d1fae5',
      color: '#065f46',
      border: '2px solid #10b981'
    },
    // ... añade más estilos según necesites
  };

  // Determinar estilo de red
  const networkStyle = {
    ...styles.networkStatus,
    ...(networkStatus === 'connected' ? styles.networkConnected : 
        networkStatus === 'disconnected' ? { background: '#fee2e2', color: '#991b1b', border: '2px solid #ef4444' } :
        { background: '#fef3c7', color: '#92400e', border: '2px solid #f59e0b' })
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.h1}>🔍 Verificador de Certificados</h1>
        <p style={styles.subtitle}>
          Verifica certificados por <strong>Transaction Hash</strong> en SONIC TESTNET
        </p>
        
        <div style={networkStyle}>
          {networkStatus === 'checking' && 'Conectando a Sonic Testnet...'}
          {networkStatus === 'connected' && '✅ CONECTADO A SONIC TESTNET'}
          {networkStatus === 'disconnected' && '❌ ERROR DE CONEXIÓN'}
        </div>
      </header>

      <main>
        <div style={styles.inputSection}>
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="transactionHash">
              Hash de la Transacción:
            </label>
            <input
              id="transactionHash"
              type="text"
              placeholder="Ingresa el hash de la transacción (0x...)"
              value={transactionHash}
              onChange={(e) => setTransactionHash(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && findCertificateByTransactionHash()}
              style={styles.input}
            />
            <button 
              onClick={() => findCertificateByTransactionHash()}
              disabled={loading || networkStatus !== 'connected'}
              style={{...styles.button, opacity: (loading || networkStatus !== 'connected') ? 0.6 : 1}}
            >
              {loading ? '🔍 Buscando...' : '✅ Buscar Certificado'}
            </button>
            
            <button 
              onClick={useExampleTransaction}
              disabled={networkStatus !== 'connected'}
              style={{
                ...styles.button,
                background: '#f3f4f6',
                color: '#374151',
                border: '2px solid #d1d5db'
              }}
            >
              Usar Ejemplo
            </button>
          </div>
        </div>
        
        {/* ... resto de tu JSX con estilos en línea ... */}
      </main>
    </div>
  );
}
