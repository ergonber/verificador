// pages/404.js
import Link from 'next/link';

export default function Custom404() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      color: 'white',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '3em', marginBottom: '20px' }}>⚠️ Configuración de Ruta</h1>
      
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '30px',
        borderRadius: '15px',
        maxWidth: '600px',
        marginBottom: '30px'
      }}>
        <p style={{ marginBottom: '20px', fontSize: '1.2em' }}>
          Next.js está usando <strong>App Router</strong> pero tu proyecto tiene <strong>Pages Router</strong>.
        </p>
        
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '20px',
          textAlign: 'left'
        }}>
          <h3>📁 Tu estructura:</h3>
          <pre style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '10px', 
            borderRadius: '5px',
            overflowX: 'auto',
            fontSize: '14px'
          }}>
pages/
├── _app.js
├── index.js
└── verify-qr.js
          </pre>
        </div>
        
        <p style={{ marginBottom: '25px' }}>
          <strong>Solución:</strong> Agrega <code>experimental: appDir: false</code> en <code>next.config.js</code>
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" legacyBehavior>
          <a style={{
            padding: '12px 24px',
            background: '#10b981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600'
          }}>
            Ir a Home
          </a>
        </Link>
        
        <Link href="/verify-qr" legacyBehavior>
          <a style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600'
          }}>
            Ir a Verificador QR
          </a>
        </Link>
      </div>
    </div>
  );
}
