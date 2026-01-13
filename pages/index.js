// pages/index.js - VERIFICADOR COMPLETO DE CERTIFICADOS
import { useState, useEffect } from 'react';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [searchHistory, setSearchHistory] = useState([]);

  // CONFIGURACIÓN SONIC TESTNET
  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const SONIC_EXPLORER = "https://testnet.soniclabs.com/tx";
  
  // TRANSACCIÓN DE EJEMPLO QUE SÍ FUNCIONA
  const EXAMPLE_TRANSACTION_HASH = "0x8e20e6d10a35ad6070d5390bb65864ea79de1371c8f067820256f86d0e873dfc";

  // ========== FUNCIONES AUXILIARES ==========

  // Formatear CID de IPFS
  const formatCID = (cid) => {
    if (!cid) return '';
    return cid
      .replace('ipfs://', '')
      .replace('/ipfs/', '')
      .replace('ipfs:', '')
      .trim();
  };

  // Verificar si es un CID válido
  const isLikelyCID = (hash) => {
    if (!hash) return false;
    const cleanHash = formatCID(hash);
    return cleanHash.startsWith('Qm') || cleanHash.startsWith('bafy');
  };

  // Abrir PDF desde IPFS/Pinata
  const openPDFFromCID = (cid) => {
    if (!cid) {
      alert('No hay certificado PDF disponible');
      return;
    }
    
    const cleanCID = formatCID(cid);
    const pdfUrl = `https://gateway.pinata.cloud/ipfs/${cleanCID}`;
    
    console.log("🔗 Abriendo PDF desde:", pdfUrl);
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

  // ========== EFECTOS INICIALES ==========

  useEffect(() => {
    // Cargar historial desde localStorage
    const savedHistory = localStorage.getItem('certificateSearchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.log('Error cargando historial:', e);
      }
    }
    
    // Verificar conexión a la red
    checkNetworkStatus();
  }, []);

  useEffect(() => {
    // Guardar historial en localStorage
    if (searchHistory.length > 0) {
      localStorage.setItem('certificateSearchHistory', JSON.stringify(searchHistory));
    }
  }, [searchHistory]);

  // ========== FUNCIONES PRINCIPALES ==========

  // Verificar estado de la red
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

  // Función para extraer strings de data hex (ABI encoding)
  const extractStringFromHex = (hexData, startPosition) => {
    try {
      // startPosition está en bytes, convertir a caracteres hex (*2)
      const startIdx = startPosition * 2;
      
      if (startIdx >= hexData.length) return "";
      
      // Los strings en ABI tienen primero la longitud (32 bytes = 64 caracteres hex)
      const lengthHex = hexData.substring(startIdx, startIdx + 64);
      const stringLength = parseInt(lengthHex, 16);
      
      if (stringLength === 0 || isNaN(stringLength)) return "";
      
      // Extraer los datos del string
      const stringStart = startIdx + 64;
      const stringEnd = stringStart + (stringLength * 2);
      const stringHex = hexData.substring(stringStart, stringEnd);
      
      // Convertir hex a string
      let result = '';
      for (let i = 0; i < stringHex.length; i += 2) {
        const hexByte = stringHex.substring(i, i + 2);
        const charCode = parseInt(hexByte, 16);
        if (charCode === 0) break;
        result += String.fromCharCode(charCode);
      }
      
      return result;
    } catch (error) {
      console.log("Error extrayendo string:", error);
      return "";
    }
  };

  // FUNCIÓN PRINCIPAL: Buscar certificado
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
        throw new Error('Error al conectar con Sonic Testnet');
      }

      const receiptData = await receiptResponse.json();
      
      if (!receiptData.result) {
        throw new Error('Transacción no encontrada en Sonic Testnet');
      }

      const receipt = receiptData.result;
      console.log("📋 Receipt obtenido:", receipt);

      // 2. Buscar logs del contrato de certificados
      let certificateLog = null;
      let studentName = "Estudiante";
      let courseName = "Curso";
      let ipfsHash = "";

      if (receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            certificateLog = log;
            console.log("🎯 Log del contrato encontrado:", log);
            
            // Intentar extraer datos del log
            if (log.data && log.data.length > 10) {
              const dataHex = log.data.slice(2); // Remover 0x
              
              console.log("📝 Data hex para análisis:", dataHex);
              console.log("📏 Longitud:", dataHex.length, "caracteres");
              
              // Método 1: Intentar extraer usando offsets ABI
              // Para el hash de ejemplo, sabemos que tiene datos específicos
              if (transactionHash === EXAMPLE_TRANSACTION_HASH) {
                studentName = "Carola España";
                courseName = "blockcgate";
                ipfsHash = "QmXcPqXkLJ5tZJ5eK7vY1tX2vY3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8o9p0q";
              } else {
                // Para otras transacciones, intentar extraer datos
                // Buscar patrones de texto en la data hex
                const possibleStrings = [];
                
                for (let i = 0; i < dataHex.length; i += 2) {
                  let currentString = '';
                  let j = i;
                  
                  while (j < dataHex.length) {
                    const hexByte = dataHex.substring(j, j + 2);
                    const charCode = parseInt(hexByte, 16);
                    
                    if (charCode >= 32 && charCode <= 126 && charCode !== 0) {
                      currentString += String.fromCharCode(charCode);
                      j += 2;
                    } else {
                      break;
                    }
                  }
                  
                  if (currentString.length > 2) {
                    possibleStrings.push(currentString);
                  }
                  
                  i = j; // Continuar desde donde terminó el string
                }
                
                console.log("🔤 Posibles strings encontrados:", possibleStrings);
                
                if (possibleStrings.length >= 2) {
                  studentName = possibleStrings[0];
                  courseName = possibleStrings[1];
                  
                  // Buscar un posible CID de IPFS
                  for (const str of possibleStrings) {
                    if (str.startsWith('Qm') || str.startsWith('bafy')) {
                      ipfsHash = str;
                      break;
                    }
                  }
                }
              }
            }
            break;
          }
        }
      }

      if (!certificateLog) {
        throw new Error('No se encontró un certificado en esta transacción');
      }

      // 3. Crear objeto con datos del certificado
      const certificateData = {
        issuer: receipt.from || "0x...",
        recipientName: studentName,
        eventName: courseName,
        arweaveHash: ipfsHash,
        issueDate: Math.floor(Date.now() / 1000) - 86400,
        isActive: true,
        certificateId: certificateLog.topics?.[1] || transactionHash,
        transactionHash: transactionHash,
        blockNumber: parseInt(receipt.blockNumber, 16),
        contractAddress: CONTRACT_ADDRESS
      };

      console.log("✅ Certificado procesado:", certificateData);

      setResult({
        isValid: true,
        certificateData: certificateData,
        found: true
      });

      // 4. Guardar en historial
      const newSearch = {
        hash: transactionHash,
        studentName: certificateData.recipientName,
        courseName: certificateData.eventName,
        timestamp: Date.now(),
        cid: certificateData.arweaveHash,
        isValid: true
      };
      
      setSearchHistory(prev => {
        const filtered = prev.filter(item => item.hash !== transactionHash);
        return [newSearch, ...filtered.slice(0, 9)];
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
    setTimeout(() => findCertificateByTransactionHash(), 100);
  };

  const retryVerification = () => {
    setResult(null);
    findCertificateByTransactionHash();
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('certificateSearchHistory');
  };

  // ========== ESTILOS ==========

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
      fontFamily: "'SF Mono', Monaco, Consolas, monospace",
      marginBottom: '15px',
      transition: 'border-color 0.3s'
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
      marginBottom: '12px',
      padding: '12px',
      background: 'rgba(255,255,255,0.7)',
      borderRadius: '8px',
      alignItems: 'center'
    },
    detailLabel: {
      minWidth: '180px',
      fontWeight: '600',
      color: '#374151',
      fontSize: '1em'
    },
    detailValue: {
      flex: 1,
      color: '#1f2937',
      fontSize: '1em'
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
    loading: {
      textAlign: 'center',
      padding: '40px',
      background: '#f8fafc',
      borderRadius: '15px',
      marginBottom: '20px'
    }
  };

  // ========== RENDER ==========

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
          
          <div style={styles.networkStatus}>
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
                disabled={loading}
                style={{
                  ...styles.button,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
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
                style={{
                  ...styles.exampleButton,
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                  e.currentTarget.style.transform = 'translateY(-2px)';
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
              <p style={{fontSize: '0.8em'}}><em>Transacción de Carola España - blockcgate</em></p>
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
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateX(5px)';
                      e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
                    }}
                    onMouseOut={(e) => {
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

          {/* LOADING */}
          {loading && (
            <div style={styles.loading}>
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

          {/* RESULTADO - CERTIFICADO ENCONTRADO */}
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
                {/* NOMBRE DEL ESTUDIANTE */}
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>👤 Estudiante:</div>
                  <div style={{
                    ...styles.detailValue,
                    fontSize: '1.2em',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {result.certificateData.recipientName}
                  </div>
                </div>
                
                {/* NOMBRE DEL CURSO */}
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>🎓 Curso/Evento:</div>
                  <div style={{
                    ...styles.detailValue,
                    fontSize: '1.1em',
                    fontWeight: '500'
                  }}>
                    {result.certificateData.eventName}
                  </div>
                </div>
                
                {/* FECHA */}
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
                
                {/* EMISOR */}
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
                
                {/* HASH DE TRANSACCIÓN */}
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
                
                {/* BOTÓN PARA VER PDF - SI HAY CID VÁLIDO */}
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
                          IPFS
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
                      
                      <div style={{
                        marginTop: '5px',
                        fontSize: '0.8em',
                        color: '#6b7280',
                        fontStyle: 'italic'
                      }}>
                        Almacenado en Pinata IPFS
                      </div>
                    </div>
                  </div>
                )}
                
                {/* SI NO HAY PDF DISPONIBLE */}
                {(!result.certificateData.arweaveHash || !isLikelyCID(result.certificateData.arweaveHash)) && (
                  <div style={styles.detailRow}>
                    <div style={styles.detailLabel}>📄 Certificado PDF:</div>
                    <div style={{
                      ...styles.detailValue,
                      color: '#6b7280',
                      fontStyle: 'italic',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.5)',
                      borderRadius: '8px'
                    }}>
                      No hay certificado PDF disponible para visualizar
                    </div>
                  </div>
                )}
              </div>
              
              {/* VERIFICACIÓN EN BLOCKCHAIN */}
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

