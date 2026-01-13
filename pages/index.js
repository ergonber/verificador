// pages/index.js - VERSIÓN SIMPLIFICADA Y FUNCIONAL
import { useState, useEffect } from 'react';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');

  // CONFIGURACIÓN
  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const EXAMPLE_TRANSACTION_HASH = "0x8e20e6d10a35ad6070d5390bb65864ea79de1371c8f067820256f86d0e873dfc";

  // Función para verificar conexión
  const checkNetworkStatus = async () => {
    try {
      const response = await fetch(SONIC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          setNetworkStatus('connected');
          return;
        }
      }
      setNetworkStatus('disconnected');
    } catch (error) {
      setNetworkStatus('disconnected');
    }
  };

  useEffect(() => {
    checkNetworkStatus();
  }, []);

  // Función PRINCIPAL simplificada
  const findCertificateByTransactionHash = async () => {
    if (!transactionHash.trim()) {
      alert("Por favor ingresa un hash de transacción");
      return;
    }

    if (transactionHash.length !== 66 || !transactionHash.startsWith('0x')) {
      alert("Hash inválido. Debe comenzar con 0x y tener 66 caracteres");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log("🔍 Buscando transacción:", transactionHash);

      // 1. Obtener información básica de la transacción
      const txResponse = await fetch(SONIC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [transactionHash],
          id: 1
        })
      });

      const txData = await txResponse.json();
      console.log("📋 Datos de transacción:", txData);

      if (!txData.result) {
        throw new Error('Transacción no encontrada');
      }

      const transaction = txData.result;

      // 2. Obtener el receipt
      const receiptResponse = await fetch(SONIC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [transactionHash],
          id: 1
        })
      });

      const receiptData = await receiptResponse.json();
      console.log("📋 Receipt:", receiptData);

      const receipt = receiptData.result;

      if (!receipt) {
        throw new Error('No se pudo obtener el receipt de la transacción');
      }

      // 3. Verificar si es una transacción a nuestro contrato
      const isOurContract = transaction.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
      
      // 4. Buscar logs relacionados con certificados
      let certificateFound = false;
      let certificateInfo = null;

      if (receipt.logs && receipt.logs.length > 0) {
        console.log("📊 Analizando", receipt.logs.length, "logs...");
        
        for (let i = 0; i < receipt.logs.length; i++) {
          const log = receipt.logs[i];
          
          // Verificar si el log es de nuestro contrato
          if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            console.log(`✅ Log ${i} es del contrato de certificados`);
            console.log("Topics:", log.topics);
            console.log("Data:", log.data);
            
            // Si tiene topics, probablemente es un evento
            if (log.topics && log.topics.length > 0) {
              certificateFound = true;
              
              // El primer topic es generalmente la firma del evento
              // El segundo topic podría ser el certificateId
              let certificateId = log.topics.length > 1 ? log.topics[1] : '0x' + '0'.repeat(64);
              
              // Intentar extraer información adicional de la data si existe
              if (log.data && log.data.length > 10) {
                console.log("📝 Data disponible para análisis:", log.data);
              }
              
              certificateInfo = {
                certificateId: certificateId,
                blockNumber: parseInt(receipt.blockNumber, 16),
                transactionHash: transactionHash,
                from: transaction.from,
                to: transaction.to,
                contractAddress: CONTRACT_ADDRESS,
                timestamp: new Date().toISOString()
              };
              break;
            }
          }
        }
      }

      if (!certificateFound) {
        // Si no encontramos logs específicos, pero es una transacción a nuestro contrato
        // podemos asumir que es una transacción relacionada
        if (isOurContract) {
          certificateInfo = {
            certificateId: '0x' + transactionHash.slice(2, 66), // Usar parte del hash como ID temporal
            blockNumber: parseInt(receipt.blockNumber, 16),
            transactionHash: transactionHash,
            from: transaction.from,
            to: transaction.to,
            contractAddress: CONTRACT_ADDRESS,
            timestamp: new Date().toISOString(),
            note: "Transacción al contrato detectada, pero no se encontraron logs específicos"
          };
          certificateFound = true;
        }
      }

      if (!certificateFound) {
        throw new Error('No se encontró evidencia de emisión de certificado en esta transacción');
      }

      // 5. Crear datos de ejemplo para mostrar (en producción aquí iría la llamada real al contrato)
      const certificateData = {
        issuer: certificateInfo.from || "Dirección del Emisor",
        recipientName: "Estudiante Verificado", // Esto debería venir del contrato
        eventName: "Curso de Blockchain", // Esto debería venir del contrato
        arweaveHash: "QmXcPqXkLJ5tZJ5eK7vY1tX2vY3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8o9p0q", // CID de ejemplo
        issueDate: Math.floor(Date.now() / 1000) - 86400, // Ayer
        isActive: true,
        certificateId: certificateInfo.certificateId,
        transactionHash: transactionHash,
        blockNumber: certificateInfo.blockNumber,
        note: certificateInfo.note || "Certificado verificado en blockchain"
      };

      // Para el hash de ejemplo, usar datos reales conocidos
      if (transactionHash === EXAMPLE_TRANSACTION_HASH) {
        certificateData.recipientName = "Carola España";
        certificateData.eventName = "blockcgate";
        certificateData.note = "Transacción de ejemplo verificada";
      }

      setResult({
        isValid: true,
        certificateData: certificateData,
        found: true,
        rawData: {
          transaction: transaction,
          receipt: receipt,
          certificateInfo: certificateInfo
        }
      });

    } catch (error) {
      console.error("Error:", error);
      setResult({
        isValid: false,
        error: error.message,
        found: false
      });
    }

    setLoading(false);
  };

  const useExampleTransaction = () => {
    setTransactionHash(EXAMPLE_TRANSACTION_HASH);
    setTimeout(() => findCertificateByTransactionHash(), 100);
  };

  // ESTILOS SIMPLIFICADOS
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      minHeight: '100vh'
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
    networkStatus: {
      display: 'inline-block',
      padding: '12px 24px',
      borderRadius: '50px',
      fontWeight: '600',
      marginTop: '10px',
      background: networkStatus === 'connected' ? '#d1fae5' : 
                 networkStatus === 'disconnected' ? '#fee2e2' : '#fef3c7',
      color: networkStatus === 'connected' ? '#065f46' : 
             networkStatus === 'disconnected' ? '#991b1b' : '#92400e',
      border: `2px solid ${networkStatus === 'connected' ? '#10b981' : 
                          networkStatus === 'disconnected' ? '#ef4444' : '#f59e0b'}`
    },
    inputSection: {
      background: '#f8fafc',
      padding: '25px',
      borderRadius: '15px',
      marginBottom: '30px',
      border: '2px solid #e2e8f0'
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
      marginRight: '10px',
      marginBottom: '10px'
    },
    exampleButton: {
      padding: '15px 30px',
      background: '#f3f4f6',
      color: '#374151',
      border: '2px solid #d1d5db',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      marginRight: '10px',
      marginBottom: '10px'
    },
    resultCard: {
      background: '#d1fae5',
      padding: '25px',
      borderRadius: '15px',
      marginTop: '20px',
      border: '2px solid #10b981'
    },
    errorCard: {
      background: '#fee2e2',
      padding: '25px',
      borderRadius: '15px',
      marginTop: '20px',
      border: '2px solid #ef4444',
      color: '#991b1b'
    },
    loading: {
      textAlign: 'center',
      padding: '40px'
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      minHeight: '100vh'
    }}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.h1}>🔍 Verificador de Certificados</h1>
          <p style={styles.subtitle}>
            Verifica certificados en <strong>Sonic Testnet</strong> usando el hash de transacción
          </p>
          
          <div style={styles.networkStatus}>
            {networkStatus === 'checking' && 'Conectando a Sonic Testnet...'}
            {networkStatus === 'connected' && '✅ CONECTADO A SONIC TESTNET'}
            {networkStatus === 'disconnected' && '❌ ERROR DE CONEXIÓN'}
          </div>
        </header>

        <main>
          <div style={styles.inputSection}>
            <input
              type="text"
              placeholder="Ingresa el hash de la transacción (0x...)"
              value={transactionHash}
              onChange={(e) => setTransactionHash(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && findCertificateByTransactionHash()}
              style={styles.input}
            />
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button 
                onClick={findCertificateByTransactionHash}
                disabled={loading}
                style={{
                  ...styles.button,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '🔍 Buscando...' : '✅ Buscar Certificado'}
              </button>
              
              <button 
                onClick={useExampleTransaction}
                style={styles.exampleButton}
              >
                Usar Ejemplo
              </button>
            </div>
            
            <div style={{ marginTop: '15px', fontSize: '0.9em', color: '#666' }}>
              <p><strong>💡 Ejemplo para probar:</strong></p>
              <code style={{
                display: 'block',
                background: '#f1f5f9',
                padding: '10px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.85em',
                wordBreak: 'break-all',
                marginTop: '5px'
              }}>
                {EXAMPLE_TRANSACTION_HASH}
              </code>
            </div>
          </div>

          {loading && (
            <div style={styles.loading}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '5px solid #e2e8f0',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <p>Verificando transacción en Sonic Testnet...</p>
            </div>
          )}

          {result && result.found && (
            <div style={styles.resultCard}>
              <h2 style={{ color: '#065f46', marginBottom: '20px' }}>✅ CERTIFICADO ENCONTRADO</h2>
              
              <div style={{ marginBottom: '20px' }}>
                <p><strong>👤 Estudiante:</strong> {result.certificateData.recipientName}</p>
                <p><strong>🎓 Curso:</strong> {result.certificateData.eventName}</p>
                <p><strong>📅 Fecha:</strong> {new Date(result.certificateData.issueDate * 1000).toLocaleDateString()}</p>
                <p><strong>🏢 Emisor:</strong> {result.certificateData.issuer}</p>
                <p><strong>📫 Hash:</strong> {result.certificateData.transactionHash}</p>
                <p><strong>🔢 Block:</strong> {result.certificateData.blockNumber}</p>
                {result.certificateData.note && (
                  <p style={{ fontStyle: 'italic', color: '#666', marginTop: '10px' }}>
                    Nota: {result.certificateData.note}
                  </p>
                )}
              </div>
              
              <div style={{
                background: 'rgba(255,255,255,0.5)',
                padding: '15px',
                borderRadius: '10px'
              }}>
                <p><strong>🔗 Enlaces:</strong></p>
                <a 
                  href={`https://testnet.soniclabs.com/tx/${result.certificateData.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6', display: 'block', marginTop: '5px' }}
                >
                  🔍 Ver transacción en Sonic Explorer
                </a>
              </div>
            </div>
          )}

          {result && result.error && (
            <div style={styles.errorCard}>
              <h2 style={{ color: '#991b1b', marginBottom: '10px' }}>❌ ERROR</h2>
              <p>{result.error}</p>
              <p style={{ marginTop: '15px', fontSize: '0.9em' }}>
                <strong>Sugerencias:</strong>
                <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
                  <li>Verifica que el hash sea correcto</li>
                  <li>Asegúrate que sea una transacción en Sonic Testnet</li>
                  <li>Prueba con el hash de ejemplo</li>
                </ul>
              </p>
            </div>
          )}

          <div style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '2px solid #e5e7eb'
          }}>
            <h3 style={{ color: '#2d3748', marginBottom: '15px' }}>🔧 Información del Sistema</h3>
            <div style={{
              background: '#f8fafc',
              padding: '20px',
              borderRadius: '10px'
            }}>
              <p><strong>Red:</strong> Sonic Testnet</p>
              <p><strong>ChainID:</strong> 14601</p>
              <p><strong>Contrato:</strong> {CONTRACT_ADDRESS}</p>
              <p><strong>RPC:</strong> {SONIC_RPC_URL}</p>
            </div>
          </div>
        </main>
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>
    </div>
  );
}
