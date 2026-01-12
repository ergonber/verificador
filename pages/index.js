// pages/index.js
import { useState } from 'react';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '30px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{
          fontSize: '2.5em',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          🔍 Verificador de Certificados
        </h1>
        
        <p style={{
          textAlign: 'center',
          color: '#666',
          marginBottom: '30px'
        }}>
          Verifica certificados por <strong>Transaction Hash</strong> en SONIC TESTNET
        </p>
        
        <div style={{
          background: '#f8fafc',
          padding: '25px',
          borderRadius: '15px',
          marginBottom: '30px'
        }}>
          <input
            type="text"
            placeholder="Ingresa el hash de la transacción (0x...)"
            value={transactionHash}
            onChange={(e) => setTransactionHash(e.target.value)}
            style={{
              width: '100%',
              padding: '15px',
              border: '2px solid #cbd5e0',
              borderRadius: '10px',
              fontSize: '16px',
              marginBottom: '15px',
              fontFamily: 'monospace'
            }}
          />
          
          <button
            onClick={() => alert('Buscando: ' + transactionHash)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {loading ? '🔍 Buscando...' : '✅ Buscar Certificado'}
          </button>
        </div>
        
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: '#f0f9ff',
          borderRadius: '10px',
          border: '2px solid #bae6fd'
        }}>
          <p><strong>ℹ️ Información del Sistema:</strong></p>
          <p>Red: Sonic Testnet (ChainID: 14601)</p>
          <p>Contrato: 0xAe48Ed8cD53e6e595E857872b1ac338E17F08549</p>
        </div>
      </div>
    </div>
  );
}
