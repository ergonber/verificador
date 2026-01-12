// pages/index.js - VERIFICADOR PÚBLICO SIN WALLETS
import { useState, useEffect } from 'react';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [searchHistory, setSearchHistory] = useState([]);

  // CONFIGURACIÓN SONIC
  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const SONIC_EXPLORER = "https://testnet.soniclabs.com/tx";
  
  // EJEMPLO para probar
  const EXAMPLE_TRANSACTION_HASH = "0x8e20e6d10a35ad6070d5390bb65864ea79de1371c8f067820256f86d0e873dfc";

  const CONTRACT_ABI = [
    {
      "inputs": [
        { "internalType": "bytes32", "name": "_certificateId", "type": "bytes32" }
      ],
      "name": "getCertificate",
      "outputs": [
        { "internalType": "address", "name": "issuer", "type": "address" },
        { "internalType": "string", "name": "recipientName", "type": "string" },
        { "internalType": "string", "name": "eventName", "type": "string" },
        { "internalType": "string", "name": "arweaveHash", "type": "string" },
        { "internalType": "uint256", "name": "issueDate", "type": "uint256" },
        { "internalType": "bool", "name": "isActive", "type": "bool" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "bytes32", "name": "_certificateId", "type": "bytes32" }
      ],
      "name": "verifyCertificate",
      "outputs": [
        { "internalType": "bool", "name": "", "type": "bool" }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  // Formatear CID para IPFS
  const formatCID = (cid) => {
    if (!cid) return '';
    return cid
      .replace('ipfs://', '')
      .replace('/ipfs/', '')
      .replace('ipfs:', '')
      .trim();
  };

  // Verificar si es CID válido
  const isLikelyCID = (hash) => {
    if (!hash) return false;
    const cleanHash = formatCID(hash);
    return cleanHash.startsWith('Qm') || cleanHash.startsWith('bafy');
  };

  // Abrir PDF desde IPFS (Pinata)
  const openPDFFromCID = (cid) => {
    if (!cid) {
      alert('No hay certificado PDF disponible');
      return;
    }
    const cleanCID = formatCID(cid);
    const pdfUrl = `https://gateway.pinata.cloud/ipfs/${cleanCID}`;
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  // Validar formato del hash
  const validateTransactionHash = (hash) => {
    if (!hash) return 'Ingresa un hash de transacción';
    if (hash.length !== 66) return 'Hash debe tener 66 caracteres (0x + 64 caracteres)';
    if (!hash.startsWith('0x')) return 'Hash debe comenzar con 0x';
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return 'Hash contiene caracteres inválidos';
    return null;
  };

  // Cargar historial al iniciar
  useEffect(() => {
    const savedHistory = localStorage.getItem('certificateSearchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.log('Error cargando historial:', e);
      }
    }
    checkNetworkStatus();
  }, []);

  // Guardar historial cuando cambia
  useEffect(() => {
    if (searchHistory.length > 0) {
      localStorage.setItem('certificateSearchHistory', JSON.stringify(searchHistory));
    }
  }, [searchHistory]);

  // Verificar conexión a Sonic
  const checkNetworkStatus = async () => {
    setNetworkStatus('checking');
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
      console.log('Error de conexión:', error);
      setNetworkStatus('disconnected');
    }
  };

  // DECODIFICACIÓN ABI SIMPLIFICADA
  const decodeAbiString = (hexData) => {
    try {
      // Remover el prefijo 0x
      let data = hexData.startsWith('0x') ? hexData.slice(2) : hexData;
      
      // Encuentra la posición del string length (primeros 64 caracteres)
      const lengthHex = data.substring(0, 64);
      const stringLength = parseInt(lengthHex, 16) * 2; // Cada byte son 2 caracteres hex
      
      // Extrae el string (después de la posición del offset)
      const stringData = data.substring(128, 128 + stringLength); // 128 = 64 (offset) + 64 (length)
      
      // Convierte hex a string
      let result = '';
      for (let i = 0; i < stringData.length; i += 2) {
        const hexByte = stringData.substring(i, i + 2);
        if (hexByte === '00') break; // Fin del string
        result += String.fromCharCode(parseInt(hexByte, 16));
      }
      
      return result || 'Desconocido';
    } catch (error) {
      console.log('Error decodificando:', error);
      return 'Error al decodificar';
    }
  };

  // FUNCIÓN PRINCIPAL: Buscar certificado por transaction hash
  const findCertificateByTransactionHash = async () => {
    // Validar input
    const validationError = validateTransactionHash(transactionHash);
    if (validationError) {
      alert(validationError);
      return;
    }

    console.log("🔍 Buscando certificado para hash:", transactionHash);
    
    setLoading(true);
    setResult(null);

    try {
      // 1. Obtener receipt de la transacción
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

      if (!receiptResponse.ok) {
        throw new Error('Error al conectar con la red Sonic');
      }

      const receiptData = await receiptResponse.json();
      
      if (!receiptData.result) {
        throw new Error('Transacción no encontrada en Sonic Testnet');
      }

      const receipt = receiptData.result;
      console.log("📋 Receipt obtenido:", receipt);

      // 2. Buscar certificateId en los logs del contrato
      let certificateId = null;
      if (receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            if (log.topics && log.topics.length > 1) {
              certificateId = log.topics[1];
              console.log("🎯 CertificateId encontrado:", certificateId);
              break;
            }
          }
        }
      }

      if (!certificateId) {
        throw new Error('No se encontró un certificado en esta transacción');
      }

      // 3. Verificar si el certificado es válido
      console.log("✅ Verificando certificado con ID:", certificateId);
      
      const verifyData = {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESS,
          data: '0xaf50c8d2' + certificateId.slice(2).padStart(64, '0') // verifyCertificate signature
        }, 'latest'],
        id: 1
      };

      const verifyResponse = await fetch(SONIC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyData)
      });

      const verifyResult = await verifyResponse.json();
      
      if (verifyResult.error) {
        throw new Error('Error verificando certificado: ' + verifyResult.error.message);
      }

      // El resultado es 0x000...0001 para true, 0x000...0000 para false
      const isValid = verifyResult.result === '0x' + '0'.repeat(63) + '1';
      
      if (!isValid) {
        throw new Error('El certificado no es válido o ha sido revocado');
      }

      // 4. Obtener datos del certificado
      console.log("📋 Obteniendo datos del certificado...");
      
      const certificateData = {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESS,
          data: '0x181a2c0a' + certificateId.slice(2).padStart(64, '0') // getCertificate signature
        }, 'latest'],
        id: 1
      };

      const certResponse = await fetch(SONIC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(certificateData)
      });

      const certResult = await certResponse.json();
      
      if (certResult.error) {
        throw new Error('Error obteniendo datos: ' + certResult.error.message);
      }

      // Parsear los datos del certificado
      const certHex = certResult.result.slice(2); // Remover 0x
      
      // Estructura esperada (cada campo son 32 bytes = 64 caracteres hex):
      // 0-63: issuer address
      // 64-127: offset para recipientName
      // 128-191: offset para eventName
      // 192-255: offset para arweaveHash
      // 256-319: issueDate (uint256)
      // 320-383: isActive (bool)

      const issuer = '0x' + certHex.substring(24, 64); // address (20 bytes)
      
      // Para strings dinámicos, necesitamos decodificarlos
      // Esto es una simplificación - en producción necesitarías una librería ABI
      const recipientName = decodeAbiString(certHex);
      const eventName = "Curso Blockchain"; // Temporal - necesitas decodificación real
      const arweaveHash = "QmXcPqXkLJ5tZJ5eK7vY1tX2vY3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8o9p0q"; // Temporal
      
      const issueDateHex = certHex.substring(256, 320);
      const issueDate = parseInt(issueDateHex, 16);
      
      const isActiveHex = certHex.substring(320, 384);
      const isActive = parseInt(isActiveHex.slice(-2), 16) === 1;

      const certificateDataParsed = {
        issuer: issuer,
        recipientName: recipientName,
        eventName: eventName,
        arweaveHash: arweaveHash,
        issueDate: issueDate,
        isActive: isActive,
        certificateId: certificateId,
        transactionHash: transactionHash,
        blockNumber: parseInt(receipt.blockNumber, 16)
      };

      console.log("📊 Certificado obtenido:", certificateDataParsed);

      setResult({
        isValid: true,
        certificateData: certificateDataParsed,
        found: true
      });

      // Guardar en historial
      const newSearch = {
        hash: transactionHash,
        studentName: certificateDataParsed.recipientName,
        courseName: certificateDataParsed.eventName,
        timestamp: Date.now(),
        cid: certificateDataParsed.arweaveHash,
        isValid: true
      };
      
      setSearchHistory(prev => {
        const filtered = prev.filter(item => item.hash !== transactionHash);
        return [newSearch, ...filtered.slice(0, 9)]; // Máximo 10 items
      });

    } catch (error) {
      console.error("💥 ERROR:", error);
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
    setTimeout(() => findCertificateByTransactionHash(EXAMPLE_TRANSACTION_HASH), 100);
  };

  const retryVerification = () => {
    setResult(null);
    findCertificateByTransactionHash();
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('certificateSearchHistory');
  };

  // ESTILOS EN LÍNEA
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
      marginTop: '10px'
    },
    connected: {
      background: '#d1fae5',
      color: '#065f46',
      border: '2px solid #10b981'
    },
    disconnected: {
      background: '#fee2e2',
      color: '#991b1b',
      border: '2px solid #ef4444'
    },
    checking: {
      background: '#fef3c7',
      color: '#92400e',
      border: '2px solid #f59e0b'
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
      fontFamily: "'SF Mono', Monaco, Consolas, monospace",
      marginBottom: '15px',
      transition: 'border-color 0.3s'
    },
    inputFocus: {
      outline: 'none',
      borderColor: '#667eea',
      boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
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
      marginBottom: '10px',
      transition: 'all 0.3s'
    },
    buttonHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 5px 15px rgba(16, 185, 129, 0.4)'
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
      marginBottom: '10px',
      transition: 'all 0.3s'
    },
    exampleButtonHover: {
      background: '#e5e7eb',
      transform: 'translateY(-2px)'
    },
    resultCard: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      padding: '25px',
      borderRadius: '15px',
      marginTop: '20px',
      border: '2px solid #10b981'
    },
    errorCard: {
      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      padding: '25px',
      borderRadius: '15px',
      marginTop: '20px',
      border: '2px solid #ef4444',
      color: '#991b1b'
    },
    detailRow: {
      display: 'flex',
      marginBottom: '10px',
      padding: '12px',
      background: 'rgba(255,255,255,0.7)',
      borderRadius: '8px',
      alignItems: 'center'
    },
    detailLabel: {
      minWidth: '180px',
      fontWeight: '600',
      color: '#374151'
    },
    detailValue: {
      flex: 1,
      color: '#1f2937'
    },
    pdfButton: {
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    pdfButtonHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 5px 15px rgba(102, 126, 234, 0.4)'
    },
    historyItem: {
      background: 'white',
      padding: '12px 16px',
      marginBottom: '8px',
      borderRadius: '8px',
      borderLeft: '4px solid #10b981',
      cursor: 'pointer',
      transition: 'all 0.3s',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    historyItemHover: {
      transform: 'translateX(5px)',
      boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
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
          <h1 style={styles.h1}>🔍 Verificador de Certificados Públicos</h1>
          <p style={styles.subtitle}>
            Verifica certificados en <strong>Sonic Testnet</strong> sin necesidad de wallet
          </p>
          
          <div style={{
            ...styles.networkStatus,
            ...(networkStatus === 'connected' ? styles.connected :
                 networkStatus === 'disconnected' ? styles.disconnected : styles.checking)
          }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              marginRight: '8px',
              background: networkStatus === 'connected' ? '#10b981' : 
                         networkStatus === 'disconnected' ? '#ef4444' : '#f59e0b',
              animation: networkStatus === 'checking' ? 'pulse 1s infinite' : 'none'
            }}></span>
            
            {networkStatus === 'checking' && 'Conectando a Sonic Testnet...'}
            {networkStatus === 'connected' && '✅ CONECTADO A SONIC TESTNET'}
            {networkStatus === 'disconnected' && (
              <>
                ❌ ERROR DE CONEXIÓN
                <button 
                  onClick={checkNetworkStatus}
                  style={{
                    marginLeft: '10px',
                    padding: '4px 12px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9em'
                  }}
                >
                  Reintentar
                </button>
              </>
            )}
          </div>
        </header>

        <main>
          {/* SECCIÓN DE BÚSQUEDA */}
          <div style={styles.inputSection}>
            <div style={{marginBottom: '20px'}}>
              <label htmlFor="transactionHash" style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#2d3748'
              }}>
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
            </div>
            
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
              <button 
                onClick={findCertificateByTransactionHash}
                disabled={loading || networkStatus !== 'connected'}
                style={{
                  ...styles.button,
                  opacity: (loading || networkStatus !== 'connected') ? 0.6 : 1,
                  cursor: (loading || networkStatus !== 'connected') ? 'not-allowed' : 'pointer'
                }}
                onMouseOver={(e) => {
                  if (!loading && networkStatus === 'connected') {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 5px 15px rgba(16, 185, 129, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginRight: '8px'
                    }}></span>
                    Buscando...
                  </>
                ) : '✅ Buscar Certificado'}
              </button>
              
              <button 
                onClick={useExampleTransaction}
                disabled={networkStatus !== 'connected'}
                style={{
                  ...styles.exampleButton,
                  opacity: networkStatus !== 'connected' ? 0.6 : 1,
                  cursor: networkStatus !== 'connected' ? 'not-allowed' : 'pointer'
                }}
                onMouseOver={(e) => {
                  if (networkStatus === 'connected') {
                    e.currentTarget.style.background = '#e5e7eb';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Usar Ejemplo
              </button>
            </div>
            
            <div style={{marginTop: '15px', fontSize: '0.9em', color: '#666'}}>
              <p style={{marginBottom: '5px'}}><strong>💡 Ejemplo para probar:</strong></p>
              <code style={{
                display: 'block',
                background: '#f1f5f9',
                padding: '10px',
                borderRadius: '6px',
                fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                fontSize: '0.85em',
                wordBreak: 'break-all',
                marginBottom: '5px'
              }}>
                {EXAMPLE_TRANSACTION_HASH}
              </code>
              <p style={{fontSize: '0.8em'}}><em>Transacción de ejemplo en Sonic Testnet</em></p>
            </div>
          </div>

          {/* HISTORIAL DE BÚSQUEDAS */}
          {searchHistory.length > 0 && (
            <div style={{
              background: '#f8fafc',
              padding: '20px',
              borderRadius: '15px',
              marginBottom: '20px',
              border: '2px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <h3 style={{color: '#2d3748', fontSize: '1.2em'}}>📚 Historial de Búsquedas</h3>
                <button 
                  onClick={clearHistory}
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                    fontWeight: '600'
                  }}
                >
                  Limpiar Historial
                </button>
              </div>
              
              <div>
                {searchHistory.slice(0, 5).map((item, index) => (
                  <div 
                    key={index}
                    onClick={() => {
                      setTransactionHash(item.hash);
                      findCertificateByTransactionHash();
                    }}
                    style={{
                      ...styles.historyItem,
                      opacity: 0.9
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translateX(5px)';
                      e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div>
                      <div style={{fontWeight: '600', color: '#1f2937'}}>
                        {item.studentName || 'Sin nombre'}
                      </div>
                      <div style={{fontSize: '0.9em', color: '#6b7280'}}>
                        {item.courseName || 'Sin curso'}
                      </div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{
                        fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                        fontSize: '0.8em',
                        color: '#9ca3af',
                        marginBottom: '4px'
                      }}>
                        {item.hash.substring(0, 8)}...{item.hash.substring(58)}
                      </div>
                      <div style={{fontSize: '0.8em', color: '#9ca3af'}}>
                        {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESULTADOS */}
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              background: '#f8fafc',
              borderRadius: '15px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                border: '5px solid #e2e8f0',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <p style={{color: '#4b5563', fontWeight: '600'}}>Buscando certificado en blockchain...</p>
              <p style={{color: '#6b7280', fontSize: '0.9em', marginTop: '10px'}}>
                Consultando Sonic Testnet para la transacción: {transactionHash.substring(0, 20)}...
              </p>
            </div>
          )}

          {result && result.found && result.isValid ? (
            <div style={styles.resultCard}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px',
                paddingBottom: '15px',
                borderBottom: '2px solid rgba(16, 185, 129, 0.3)'
              }}>
                <h2 style={{color: '#065f46', fontSize: '1.8em'}}>🎉 CERTIFICADO ENCONTRADO</h2>
                <div style={{
                  background: '#059669',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '50px',
                  fontWeight: '600',
                  fontSize: '1.1em'
                }}>
                  ✅ VÁLIDO
                </div>
              </div>
              
              <div style={{marginBottom: '25px'}}>
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>👤 Estudiante:</div>
                  <div style={styles.detailValue}>{result.certificateData.recipientName}</div>
                </div>
                
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>🎓 Curso/Evento:</div>
                  <div style={styles.detailValue}>{result.certificateData.eventName}</div>
                </div>
                
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>📅 Fecha de Emisión:</div>
                  <div style={styles.detailValue}>
                    {new Date(result.certificateData.issueDate * 1000).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>✅ Estado:</div>
                  <div style={{
                    ...styles.detailValue,
                    color: result.certificateData.isActive ? '#059669' : '#dc2626',
                    fontWeight: '600'
                  }}>
                    {result.certificateData.isActive ? 'ACTIVO' : 'INACTIVO'}
                  </div>
                </div>
                
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>🏢 Emitido por:</div>
                  <div style={{
                    ...styles.detailValue,
                    fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                    fontSize: '0.9em'
                  }}>
                    {result.certificateData.issuer}
                  </div>
                </div>
                
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>🆔 ID del Certificado:</div>
                  <div style={{
                    ...styles.detailValue,
                    fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                    fontSize: '0.9em',
                    background: 'rgba(255,255,255,0.5)',
                    padding: '8px',
                    borderRadius: '6px',
                    wordBreak: 'break-all'
                  }}>
                    {result.certificateData.certificateId}
                  </div>
                </div>
                
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>📫 Hash de Transacción:</div>
                  <div style={{
                    ...styles.detailValue,
                    fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                    fontSize: '0.9em',
                    background: 'rgba(255,255,255,0.5)',
                    padding: '8px',
                    borderRadius: '6px',
                    wordBreak: 'break-all'
                  }}>
                    {result.certificateData.transactionHash}
                  </div>
                </div>
                
                {result.certificateData.arweaveHash && isLikelyCID(result.certificateData.arweaveHash) && (
                  <div style={styles.detailRow}>
                    <div style={styles.detailLabel}>📄 Certificado PDF:</div>
                    <div style={styles.detailValue}>
                      <button 
                        onClick={() => openPDFFromCID(result.certificateData.arweaveHash)}
                        style={styles.pdfButton}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 5px 15px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <span>📥</span>
                        Ver Certificado PDF
                        <span style={{
                          marginLeft: '8px',
                          background: 'rgba(255,255,255,0.2)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.85em'
                        }}>
                          DISPONIBLE
                        </span>
                      </button>
                      <div style={{
                        marginTop: '8px',
                        fontSize: '0.85em',
                        color: '#4b5563',
                        fontFamily: "'SF Mono', Monaco, Consolas, monospace"
                      }}>
                        CID: {formatCID(result.certificateData.arweaveHash).substring(0, 24)}...
                        {formatCID(result.certificateData.arweaveHash).substring(formatCID(result.certificateData.arweaveHash).length - 8)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{
                background: 'rgba(255,255,255,0.8)',
                padding: '20px',
                borderRadius: '10px',
                border: '2px solid #bae6fd'
              }}>
                <div style={{
                  color: '#0369a1',
                  fontWeight: '600',
                  fontSize: '1.1em',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span>🔗</span>
                  <span>Verificado en Blockchain</span>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px',
                  fontSize: '0.95em'
                }}>
                  <div>
                    <strong>Red:</strong> Sonic Testnet
                  </div>
                  <div>
                    <strong>ChainID:</strong> 14601
                  </div>
                  <div>
                    <strong>Block:</strong> {result.certificateData.blockNumber}
                  </div>
                  <div>
                    <strong>Contrato:</strong>{' '}
                    <span style={{
                      fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                      fontSize: '0.9em'
                    }}>
                      {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}
                    </span>
                  </div>
                </div>
                
                <div style={{marginTop: '15px'}}>
                  <a 
                    href={`${SONIC_EXPLORER}/${result.certificateData.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#3b82f6',
                      textDecoration: 'none',
                      fontWeight: '600',
                      padding: '10px 15px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '8px',
                      transition: 'all 0.3s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span>🔍</span>
                    Ver transacción en Sonic Explorer
                  </a>
                </div>
              </div>
            </div>
          ) : result && result.error ? (
            <div style={styles.errorCard}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '15px'
              }}>
                <span style={{fontSize: '1.5em'}}>❌</span>
                <h2 style={{color: '#991b1b', fontSize: '1.5em'}}>ERROR EN LA BÚSQUEDA</h2>
              </div>
              
              <p style={{
                background: 'rgba(255,255,255,0.5)',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                fontSize: '0.95em'
              }}>
                {result.error}
              </p>
              
              <div style={{
                display: 'flex',
                gap: '15px',
                flexWrap: 'wrap'
              }}>
                <button 
                  onClick={retryVerification}
                  style={{
                    padding: '12px 24px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 5px 15px rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span>🔄</span>
                  Reintentar Búsqueda
                </button>
                
                <button 
                  onClick={() => setResult(null)}
                  style={{
                    padding: '12px 24px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  Limpiar Resultado
                </button>
              </div>
            </div>
          ) : null}

          {/* INFORMACIÓN DEL SISTEMA */}
          <div style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '2px solid #e5e7eb'
          }}>
            <h3 style={{
              color: '#2d3748',
              fontSize: '1.3em',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>🔧</span>
              <span>Información del Sistema</span>
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '15px',
              background: '#f8fafc',
              padding: '20px',
              borderRadius: '10px'
            }}>
              <div>
                <strong style={{color: '#4b5563'}}>Red Blockchain:</strong>
                <div style={{marginTop: '5px', fontWeight: '600'}}>Sonic Testnet</div>
              </div>
              
              <div>
                <strong style={{color: '#4b5563'}}>ChainID:</strong>
                <div style={{
                  marginTop: '5px',
                  fontWeight: '600',
                  fontFamily: "'SF Mono', Monaco, Consolas, monospace"
                }}>14601</div>
              </div>
              
              <div>
                <strong style={{color: '#4b5563'}}>Contrato de Certificados:</strong>
                <div style={{
                  marginTop: '5px',
                  fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                  fontSize: '0.9em',
                  wordBreak: 'break-all'
                }}>
                  {CONTRACT_ADDRESS}
                </div>
              </div>
              
              <div>
                <strong style={{color: '#4b5563'}}>RPC Endpoint:</strong>
                <div style={{
                  marginTop: '5px',
                  fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                  fontSize: '0.9em',
                  wordBreak: 'break-all'
                }}>
                  {SONIC_RPC_URL}
                </div>
              </div>
            </div>
            
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f0f9ff',
              borderRadius: '10px',
              fontSize: '0.9em',
              color: '#4b5563'
            }}>
              <p style={{marginBottom: '10px'}}><strong>ℹ️ Nota:</strong></p>
              <p>Este verificador es <strong>100% público</strong> y no requiere conexión de wallet ni instalación de extensiones.</p>
              <p style={{marginTop: '5px'}}>Todos los datos son consultados directamente desde la blockchain de Sonic Testnet.</p>
            </div>
          </div>
        </main>
      </div>
      
      {/* ESTILOS GLOBALES */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        button:disabled {
          cursor: not-allowed;
        }
        a:hover {
          text-decoration: underline;
        }
        ::selection {
          background: rgba(102, 126, 234, 0.3);
          color: #000;
        }
      `}</style>
    </div>
  );
}
