// pages/verify-qr.js
import { useState } from 'react';
import Link from 'next/link';

export default function VerifyCertificateQR() {
  const [isScanning, setIsScanning] = useState(false);

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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <h1 style={{
            fontSize: '2.5em',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            📱 Verificador QR
          </h1>
          
          <Link href="/" legacyBehavior>
            <a style={{
              padding: '10px 20px',
              background: '#f3f4f6',
              color: '#4b5563',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ← Volver
            </a>
          </Link>
        </div>

        <p style={{
          color: '#666',
          fontSize: '1.1em',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          Escanea códigos QR para verificar certificados en <strong>Sonic Testnet</strong>
        </p>

        <div style={{
          background: '#f8fafc',
          padding: '40px',
          borderRadius: '15px',
          textAlign: 'center',
          marginBottom: '30px',
          border: '2px dashed #cbd5e0'
        }}>
          {isScanning ? (
            <>
              <div style={{
                width: '200px',
                height: '200px',
                margin: '0 auto 30px',
                background: '#e5e7eb',
                borderRadius: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  width: '70%',
                  height: '70%',
                  border: '3px solid #10b981',
                  borderRadius: '10px',
                  animation: 'pulse 2s infinite'
                }}></div>
                <div style={{
                  fontSize: '3em',
                  animation: 'spin 2s linear infinite'
                }}>
                  📷
                </div>
              </div>
              <p style={{ color: '#4b5563', marginBottom: '20px' }}>
                Escaneando código QR...
              </p>
              <button 
                onClick={() => setIsScanning(false)}
                style={{
                  padding: '12px 24px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ❌ Detener escaneo
              </button>
            </>
          ) : (
            <>
              <div style={{
                width: '200px',
                height: '200px',
                margin: '0 auto 30px',
                background: '#e5e7eb',
                borderRadius: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '4em' }}>📱</div>
              </div>
              <p style={{ color: '#4b5563', marginBottom: '20px' }}>
                Presiona el botón para iniciar el escáner de QR
              </p>
              <button 
                onClick={() => setIsScanning(true)}
                style={{
                  padding: '15px 30px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  margin: '0 auto'
                }}
              >
                📷 Iniciar Escáner QR
              </button>
            </>
          )}
        </div>

        <div style={{
          background: '#f0f9ff',
          padding: '25px',
          borderRadius: '15px',
          borderLeft: '4px solid #0ea5e9'
        }}>
          <h4 style={{ color: '#0369a1', marginBottom: '15px' }}>📋 Instrucciones</h4>
          <ol style={{
            paddingLeft: '20px',
            color: '#4b5563',
            lineHeight: '1.8',
            marginBottom: '20px'
          }}>
            <li>Haz clic en "Iniciar Escáner QR"</li>
            <li>Permite el acceso a la cámara</li>
            <li>Apunta al código QR del certificado</li>
            <li>Los datos se verificarán automáticamente</li>
          </ol>
          
          <div style={{
            padding: '15px',
            background: 'rgba(14, 165, 233, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(14, 165, 233, 0.3)'
          }}>
            <p style={{ color: '#0369a1', fontSize: '14px' }}>
              <strong>💡 Nota:</strong> No se requiere conexión de wallet. Solo lectura de blockchain.
            </p>
          </div>
        </div>

        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '2px solid #e5e7eb',
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          <p>Red: Sonic Testnet • ChainID: 14601 • Contrato: 0xAe48Ed8cD53e6e595E857872b1ac338E17F08549</p>
        </div>
      </div>
    </div>
  );
}
