// pages/index.js
import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [input, setInput] = useState('');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '800px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{
          fontSize: '2.5em',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          🎓 Verificador de Certificados
        </h1>
        
        <p style={{
          color: '#666',
          fontSize: '1.1em',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          Verifica certificados en <strong>Sonic Testnet</strong>
        </p>

        <div style={{
          display: 'flex',
          gap: '20px',
          justifyContent: 'center',
          marginBottom: '40px',
          flexWrap: 'wrap'
        }}>
          <Link href="/verify-qr" legacyBehavior>
            <a style={{
              padding: '15px 30px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(59, 130, 246, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              📱 Verificar con QR
            </a>
          </Link>
          
          <button style={{
            padding: '15px 30px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '600',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(16, 185, 129, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            🔍 Verificar con Hash
          </button>
        </div>

        <div style={{
          background: '#f8fafc',
          padding: '25px',
          borderRadius: '15px',
          border: '2px solid #e2e8f0',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#2d3748', marginBottom: '15px' }}>Ingresa Hash de Transacción:</h3>
          <input
            type="text"
            placeholder="0x..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              width: '100%',
              padding: '15px',
              border: '2px solid #cbd5e0',
              borderRadius: '10px',
              fontSize: '16px',
              fontFamily: "'SF Mono', Monaco, Consolas, monospace",
              marginBottom: '15px'
            }}
          />
          <button style={{
            width: '100%',
            padding: '15px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            ✅ Verificar Certificado
          </button>
        </div>

        <div style={{
          background: '#f0f9ff',
          padding: '20px',
          borderRadius: '15px',
          borderLeft: '4px solid #0ea5e9'
        }}>
          <h4 style={{ color: '#0369a1', marginBottom: '10px' }}>ℹ️ Información del Sistema</h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            fontSize: '14px'
          }}>
            <div>
              <strong>Red:</strong> Sonic Testnet
            </div>
            <div>
              <strong>ChainID:</strong> 14601
            </div>
            <div>
              <strong>Contrato:</strong> 0xAe48Ed8c...
            </div>
            <div>
              <strong>Estado:</strong> <span style={{ color: '#10b981', fontWeight: '600' }}>Conectado</span>
            </div>
          </div>
        </div>
      </div>

      <p style={{
        color: 'white',
        marginTop: '30px',
        textAlign: 'center',
        opacity: 0.8
      }}>
        Sistema de verificación de certificados en blockchain • Sonic Testnet
      </p>
    </div>
  );
}
