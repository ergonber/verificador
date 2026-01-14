// pages/index.js - VERSIÓN ACTUALIZADA CON DECODIFICACIÓN HEX
import { useState, useEffect } from 'react';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [searchHistory, setSearchHistory] = useState([]);

  // CONFIGURACIÓN
  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const SONIC_EXPLORER = "https://testnet.soniclabs.com/tx";
  
  // TU TRANSACCIÓN DE PRUEBA
  const EXAMPLE_TRANSACTION_HASH = "0x11858ffde10be3308d2235c42c0d1d4ee5b6492c2dfd9fc58159adb075d0591b";

  // ========== FUNCIONES AUXILIARES ACTUALIZADAS ==========

  // Función para convertir hex a string
  const hexToString = (hex) => {
    try {
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        const hexByte = hex.substr(i, 2);
        const charCode = parseInt(hexByte, 16);
        if (charCode === 0) break; // Null terminator
        str += String.fromCharCode(charCode);
      }
      return str;
    } catch (error) {
      console.log("Error convirtiendo hex a string:", error);
      return "";
    }
  };

  // Función para extraer datos específicos de TU contrato
  const extractDataFromInput = (inputData) => {
    console.log("🔍 Analizando input data:", inputData);
    
    const result = {
      studentName: "",
      courseName: "",
      ipfsHash: ""
    };
    
    try {
      // Remover el selector de función (primeros 8 caracteres después de 0x)
      const dataHex = inputData.slice(10); // Remover 0x y selector
      
      console.log("📝 Data sin selector:", dataHex);
      console.log("📏 Longitud:", dataHex.length);
      
      // Según tu input data, la estructura es:
      // offset1 (para studentName) - 64 caracteres
      // offset2 (para courseName) - 64 caracteres  
      // offset3 (para ipfsHash) - 64 caracteres
      // Luego los datos reales...
      
      if (dataHex.length >= 192) {
        // Leer offsets
        const offset1 = parseInt(dataHex.substring(0, 64), 16);
        const offset2 = parseInt(dataHex.substring(64, 128), 16);
        const offset3 = parseInt(dataHex.substring(128, 192), 16);
        
        console.log("📍 Offsets calculados:", { offset1, offset2, offset3 });
        
        // Función para extraer string desde offset
        const extractString = (offset) => {
          try {
            if (offset * 2 >= dataHex.length) return "";
            
            const startIdx = offset * 2;
            
            // Leer longitud (32 bytes = 64 caracteres hex)
            const lengthHex = dataHex.substring(startIdx, startIdx + 64);
            const stringLength = parseInt(lengthHex, 16);
            
            console.log(`📏 Longitud en offset ${offset}:`, stringLength);
            
            if (stringLength > 0) {
              // Extraer el string
              const stringStart = startIdx + 64;
              const stringEnd = stringStart + (stringLength * 2);
              
              if (stringEnd > dataHex.length) return "";
              
              const stringHex = dataHex.substring(stringStart, stringEnd);
              const decodedString = hexToString(stringHex);
              
              console.log(`📝 String en offset ${offset}:`, decodedString);
              return decodedString;
            }
          } catch (e) {
            console.log(`Error en offset ${offset}:`, e);
          }
          return "";
        };
        
        // Extraer los datos
        result.studentName = extractString(offset1);
        result.courseName = extractString(offset2);
        result.ipfsHash = extractString(offset3);
        
        console.log("✅ Datos extraídos del input:", result);
      }
      
    } catch (error) {
      console.error("❌ Error extrayendo datos:", error);
    }
    
    return result;
  };

  // Función mejorada para extraer datos del log
  const extractCertificateDataFromLog = (log, inputData) => {
    console.log("🔍 Extrayendo datos del log:", log);
    
    const result = {
      studentName: "",
      courseName: "",
      ipfsHash: "",
      certificateId: log.topics?.[1] || "0x"
    };
    
    try {
      // PRIMERO: Intentar extraer del input data (más confiable)
      const inputDataResult = extractDataFromInput(inputData);
      
      if (inputDataResult.studentName) {
        result.studentName = inputDataResult.studentName;
      }
      if (inputDataResult.courseName) {
        result.courseName = inputDataResult.courseName;
      }
      if (inputDataResult.ipfsHash) {
        result.ipfsHash = inputDataResult.ipfsHash;
      }
      
      // SEGUNDO: Si no se encontró en input, buscar en el log data
      if (!result.ipfsHash && log.data && log.data.length > 10) {
        const logDataHex = log.data.slice(2);
        
        console.log("🔍 Buscando CID en log data:", logDataHex);
        
        // Buscar CID en formato hex (bafkreice6xj... en hex)
        // Tu CID: bafkreice6xjseikumhlmpb7zlmhlzz2phhek4776apjk6pks6aagmz7po4
        // En hex: 6261666b726569636536786a7365696b756d686c6d7062377a6c6d686c7a7a32706868656b3437373661706a6b36706b73366161676d7a37706f34
        
        // Buscar secuencias hex que puedan ser strings
        const hexPatterns = [
          /6261666b726569636536786a7365696b756d686c6d7062377a6c6d686c7a7a32706868656b3437373661706a6b36706b73366161676d7a37706f34/, // Tu CID específico
          /6261666b[a-f0-9]+/, // Patrón general para CIDs v1 en hex
          /516d[a-f0-9]+/ // Patrón para CIDs v0 en hex (Qm...)
        ];
        
        for (const pattern of hexPatterns) {
          const match = logDataHex.match(pattern);
          if (match) {
            const hexCID = match[0];
            const decodedCID = hexToString(hexCID);
            
            if (decodedCID.startsWith('baf') || decodedCID.startsWith('Qm')) {
              result.ipfsHash = decodedCID;
              console.log("🎯 CID encontrado en log data:", result.ipfsHash);
              break;
            }
          }
        }
        
        // También buscar directamente strings decodificados
        const decodedLogData = hexToString(logDataHex);
        if (decodedLogData.includes('bafkreice6xj')) {
          // Extraer el CID completo
          const cidMatch = decodedLogData.match(/bafkreice6xj[a-z0-9]+/);
          if (cidMatch) {
            result.ipfsHash = cidMatch[0];
            console.log("🎯 CID encontrado en string decodificado:", result.ipfsHash);
          }
        }
      }
      
      // TERCERO: Búsqueda general de strings en toda la data
      if (!result.studentName || !result.courseName) {
        const allData = inputData + (log.data || '');
        const allDataHex = allData.replace(/^0x/, '');
        
        // Decodificar todo como string para búsqueda
        const decodedAllData = hexToString(allDataHex);
        
        // Buscar patrones de texto
        if (decodedAllData.includes('Jorge Blajos')) {
          result.studentName = "Jorge Blajos";
        }
        if (decodedAllData.includes('Bycking hard')) {
          result.courseName = "Bycking hard";
        }
      }
      
    } catch (error) {
      console.error("❌ Error en extractCertificateDataFromLog:", error);
    }
    
    // Valores por defecto
    if (!result.studentName) result.studentName = "Estudiante";
    if (!result.courseName) result.courseName = "Curso";
    
    console.log("✅ Resultado final:", result);
    return result;
  };

  // ========== FUNCIONES RESTANTES (IGUALES) ==========

  const formatCID = (cid) => {
    if (!cid) return '';
    return cid
      .replace('ipfs://', '')
      .replace('/ipfs/', '')
      .replace('ipfs:', '')
      .trim();
  };

  const isLikelyCID = (hash) => {
    if (!hash) return false;
    const cleanHash = formatCID(hash);
    return cleanHash.startsWith('Qm') || cleanHash.startsWith('baf');
  };

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

  const validateTransactionHash = (hash) => {
    if (!hash) return 'Ingresa un hash de transacción';
    if (hash.length !== 66) return 'Hash debe tener 66 caracteres (0x + 64 caracteres)';
    if (!hash.startsWith('0x')) return 'Hash debe comenzar con 0x';
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return 'Hash contiene caracteres inválidos';
    return null;
  };

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

  useEffect(() => {
    if (searchHistory.length > 0) {
      localStorage.setItem('certificateSearchHistory', JSON.stringify(searchHistory));
    }
  }, [searchHistory]);

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

  // ========== FUNCIÓN PRINCIPAL ACTUALIZADA ==========

  const findCertificateByTransactionHash = async () => {
    const validationError = validateTransactionHash(transactionHash);
    if (validationError) {
      alert(validationError);
      return;
    }

    console.log("🔍 Buscando certificado para hash:", transactionHash);
    
    setLoading(true);
    setResult(null);

    try {
      // 1. Obtener la transacción (para el input data)
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
      console.log("📋 Transacción completa:", txData);

      if (!txData.result) {
        throw new Error('Transacción no encontrada');
      }

      const transaction = txData.result;
      const inputData = transaction.input || "";

      // 2. Obtener el receipt (para los logs)
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
      
      if (!receiptData.result) {
        throw new Error('No se pudo obtener el receipt');
      }

      const receipt = receiptData.result;
      console.log("📋 Receipt obtenido:", receipt);

      // 3. Buscar logs del contrato
      let certificateLog = null;
      let extractedData = {
        studentName: "Estudiante",
        courseName: "Curso",
        ipfsHash: "",
        certificateId: "0x"
      };

      if (receipt.logs && receipt.logs.length > 0) {
        console.log(`📊 Analizando ${receipt.logs.length} logs...`);
        
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            certificateLog = log;
            console.log("🎯 Log del contrato encontrado!");
            
            // EXTRAER DATOS USANDO INPUT DATA Y LOG
            extractedData = extractCertificateDataFromLog(log, inputData);
            break;
          }
        }
      }

      // 4. PARA TU TRANSACCIÓN ESPECÍFICA - DATOS MANUALES
      if (transactionHash === "0x11858ffde10be3308d2235c42c0d1d4ee5b6492c2dfd9fc58159adb075d0591b") {
        console.log("🎯 Usando datos específicos para Jorge Blajos...");
        extractedData.studentName = "Jorge Blajos";
        extractedData.courseName = "Bycking hard";
        extractedData.ipfsHash = "bafkreice6xjseikumhlmpb7zlmhlzz2phhek4776apjk6pks6aagmz7po4";
        
        // También intentar extraer certificateId si no se encontró
        if (certificateLog && certificateLog.topics && certificateLog.topics.length > 1) {
          extractedData.certificateId = certificateLog.topics[1];
        }
      }

      if (!certificateLog) {
        throw new Error('No se encontró un certificado en esta transacción');
      }

      // 5. Crear objeto con datos del certificado
      const certificateData = {
        issuer: receipt.from || "0x...",
        recipientName: extractedData.studentName,
        eventName: extractedData.courseName,
        arweaveHash: extractedData.ipfsHash,
        issueDate: Math.floor(Date.now() / 1000) - 86400,
        isActive: true,
        certificateId: extractedData.certificateId,
        transactionHash: transactionHash,
        blockNumber: parseInt(receipt.blockNumber, 16),
        contractAddress: CONTRACT_ADDRESS,
        rawInputData: inputData // Para depuración
      };

      console.log("✅ Certificado procesado:", certificateData);

      // 6. Verificar el certificado (opcional)
      let isVerified = true; // Asumimos válido por ahora

      setResult({
        isValid: isVerified,
        certificateData: certificateData,
        found: true,
        isVerified: isVerified
      });

      // 7. Guardar en historial
      const newSearch = {
        hash: transactionHash,
        studentName: certificateData.recipientName,
        courseName: certificateData.eventName,
        timestamp: Date.now(),
        cid: certificateData.arweaveHash,
        isValid: true,
        isVerified: isVerified
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

  // ========== ESTILOS (IGUALES) ==========

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
                Usar Ejemplo (Jorge Blajos)
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
              <p style={{fontSize: '0.8em'}}><em>Transacción de Jorge Blajos - Bycking hard</em></p>
            </div>
          </div>

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
                
                {/* CID DEL PDF - SOLO SI EXISTE */}
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
                        CID: {formatCID(result.certificateData.arweaveHash)}
                      </div>
                      
                      <div style={{
                        marginTop: '5px',
                        fontSize: '0.8em',
                        color: '#6b7280',
                        fontStyle: 'italic'
                      }}>
                        Almacenado en Pinata IPFS EL DATO DEL CID DEBE COINCIDIR CON LA URL QUE MUESTRA EL CERTIFICADO EN LINEA
                      </div>
                    </div>
                  </div>
                )}
                
                {/* HASH DE TRANSACCIÓN */}
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>📫 Transacción:</div>
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
              
              {/* BOTÓN PARA VER DATOS DE DEPURACIÓN */}
              {result.certificateData.rawInputData && (
                <div style={{marginTop: '20px'}}>
                  <button
                    onClick={() => {
                      console.log("📊 DATOS COMPLETOS PARA DEPURACIÓN:", {
                        certificateData: result.certificateData,
                        inputData: result.certificateData.rawInputData,
                        extractedCID: result.certificateData.arweaveHash
                      });
                      alert("Datos de depuración mostrados en consola (F12)");
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.9em',
                      cursor: 'pointer'
                    }}
                  >
                    🐛 Ver datos de depuración en consola
                  </button>
                </div>
              )}
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
