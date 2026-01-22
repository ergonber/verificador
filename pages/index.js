// pages/index.js - VERIFICADOR AUTOMÁTICO (VERSIÓN RESPONSIVA)
import { useState, useEffect } from 'react';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [searchHistory, setSearchHistory] = useState([]);
  const [autoVerification, setAutoVerification] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  // CONFIGURACIÓN
  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const SONIC_EXPLORER = "https://testnet.soniclabs.com/tx";

  // ========== DETECCIÓN DE ANCHO DE PANTALLA ==========
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    // Inicializar
    handleResize();
    
    // Escuchar cambios
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ========== VERIFICACIÓN AUTOMÁTICA MEJORADA ==========
  useEffect(() => {
    const extractHashFromURL = () => {
      try {
        // Verificar si estamos en el navegador
        if (typeof window === 'undefined') return null;
        
        const url = new URL(window.location.href);
        const params = url.searchParams;
        
        // Buscar hash en múltiples parámetros posibles
        const possibleParams = ['tx', 'hash', 'transaction', 'txHash', 'th', 'h'];
        let hashValue = null;
        
        for (const param of possibleParams) {
          const value = params.get(param);
          if (value && value.startsWith('0x') && value.length === 66) {
            hashValue = value;
            break;
          }
        }
        
        // También buscar en el pathname (ej: /tx/0x...)
        if (!hashValue) {
          const pathMatch = window.location.pathname.match(/\/(0x[a-fA-F0-9]{64})\/?$/);
          if (pathMatch) {
            hashValue = pathMatch[1];
          }
        }
        
        return hashValue;
        
      } catch (error) {
        console.warn('Error extrayendo hash de URL:', error);
        return null;
      }
    };
    
    const hashFromURL = extractHashFromURL();
    
    if (hashFromURL) {
      console.log('🔗 Hash detectado en URL:', hashFromURL);
      
      // Limpiar URL después de extraer el hash (sin recargar)
      if (window.history.replaceState) {
        const newUrl = new URL(window.location.href);
        ['tx', 'hash', 'transaction', 'txHash', 'th', 'h'].forEach(param => {
          newUrl.searchParams.delete(param);
        });
        
        // También limpiar del pathname si está ahí
        const cleanPathname = window.location.pathname.replace(/\/(0x[a-fA-F0-9]{64})\/?$/, '');
        if (cleanPathname !== window.location.pathname) {
          newUrl.pathname = cleanPathname;
        }
        
        window.history.replaceState({}, document.title, newUrl.toString());
        console.log('🔄 URL limpiada:', newUrl.toString());
      }
      
      setTransactionHash(hashFromURL);
      setAutoVerification(true);
      
      // Verificación inmediata sin delay
      const validationError = validateTransactionHash(hashFromURL);
      if (validationError === null) {
        console.log('⚡ Verificando automáticamente...');
        
        // Pequeño delay para asegurar que el componente está montado
        const verifyTimer = setTimeout(() => {
          findCertificateByTransactionHash();
        }, 300);
        
        return () => clearTimeout(verifyTimer);
      } else {
        console.warn('❌ Hash inválido en URL:', validationError);
        setAutoVerification(false);
      }
    }
  }, []);

  // ========== FUNCIÓN PARA GENERAR URL COMPARTIBLE ==========
  const generateShareableURL = (hash) => {
    if (!hash || !hash.startsWith('0x')) return '';
    
    const baseURL = window.location.origin;
    const params = new URLSearchParams();
    
    // Usar parámetro corto y consistente
    params.set('tx', hash);
    
    return `${baseURL}?${params.toString()}`;
  };

  // ========== FUNCIONES AUXILIARES ==========
  
  const hexToString = (hex) => {
    try {
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        const hexByte = hex.substr(i, 2);
        const charCode = parseInt(hexByte, 16);
        if (charCode === 0) break;
        str += String.fromCharCode(charCode);
      }
      return str;
    } catch (error) {
      console.log("Error convirtiendo hex a string:", error);
      return "";
    }
  };

  const extractDataFromInput = (inputData) => {
    console.log("🔍 Analizando input data:", inputData);
    
    const result = {
      studentName: "",
      courseName: "",
      ipfsHash: ""
    };
    
    try {
      const dataHex = inputData.slice(10);
      
      if (dataHex.length >= 192) {
        const offset1 = parseInt(dataHex.substring(0, 64), 16);
        const offset2 = parseInt(dataHex.substring(64, 128), 16);
        const offset3 = parseInt(dataHex.substring(128, 192), 16);
        
        const extractString = (offset) => {
          try {
            if (offset * 2 >= dataHex.length) return "";
            
            const startIdx = offset * 2;
            const lengthHex = dataHex.substring(startIdx, startIdx + 64);
            const stringLength = parseInt(lengthHex, 16);
            
            if (stringLength > 0) {
              const stringStart = startIdx + 64;
              const stringEnd = stringStart + (stringLength * 2);
              
              if (stringEnd > dataHex.length) return "";
              
              const stringHex = dataHex.substring(stringStart, stringEnd);
              return hexToString(stringHex);
            }
          } catch (e) {
            console.log(`Error en offset ${offset}:`, e);
          }
          return "";
        };
        
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

  const extractCertificateDataFromLog = (log, inputData) => {
    console.log("🔍 Extrayendo datos del log:", log);
    
    const result = {
      studentName: "",
      courseName: "",
      ipfsHash: "",
      certificateId: log.topics?.[1] || "0x"
    };
    
    try {
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
      
      if (!result.ipfsHash && log.data && log.data.length > 10) {
        const logDataHex = log.data.slice(2);
        
        const hexPatterns = [
          /6261666b726569636536786a7365696b756d686c6d7062377a6c6d686c7a7a32706868656b3437373661706a6b36706b73366161676d7a37706f34/,
          /6261666b[a-f0-9]+/,
          /516d[a-f0-9]+/
        ];
        
        for (const pattern of hexPatterns) {
          const match = logDataHex.match(pattern);
          if (match) {
            const hexCID = match[0];
            const decodedCID = hexToString(hexCID);
            
            if (decodedCID.startsWith('baf') || decodedCID.startsWith('Qm')) {
              result.ipfsHash = decodedCID;
              break;
            }
          }
        }
        
        const decodedLogData = hexToString(logDataHex);
        if (decodedLogData.includes('bafkreice6xj')) {
          const cidMatch = decodedLogData.match(/bafkreice6xj[a-z0-9]+/);
          if (cidMatch) {
            result.ipfsHash = cidMatch[0];
          }
        }
      }
      
    } catch (error) {
      console.error("❌ Error en extractCertificateDataFromLog:", error);
    }
    
    if (!result.studentName) result.studentName = "Estudiante";
    if (!result.courseName) result.courseName = "Curso";
    
    return result;
  };

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

  const checkNetworkStatus = async () => {
    setNetworkStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(SONIC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          const blockNumber = parseInt(data.result, 16);
          setNetworkStatus('connected');
          console.log(`✅ Conectado a Sonic Testnet - Block: ${blockNumber}`);
          return true;
        }
      }
      setNetworkStatus('disconnected');
      return false;
    } catch (error) {
      console.log('Error de conexión:', error);
      setNetworkStatus('disconnected');
      return false;
    }
  };

  // ========== FUNCIÓN PRINCIPAL DE VERIFICACIÓN ==========
  const findCertificateByTransactionHash = async () => {
    const validationError = validateTransactionHash(transactionHash);
    if (validationError) {
      alert(validationError);
      return;
    }

    console.log("🔍 Buscando certificado para hash:", transactionHash);
    
    setLoading(true);
    setResult(null);
    setAutoVerification(false);

    try {
      // 1. Obtener la transacción
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
      console.log("📋 Transacción:", txData);

      if (!txData.result) {
        throw new Error('Transacción no encontrada en Sonic Testnet');
      }

      const transaction = txData.result;
      const inputData = transaction.input || "";

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
      
      if (!receiptData.result) {
        throw new Error('No se pudo obtener el receipt de la transacción');
      }

      const receipt = receiptData.result;
      console.log("📋 Receipt:", receipt);

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
            
            extractedData = extractCertificateDataFromLog(log, inputData);
            break;
          }
        }
      }

      if (!certificateLog) {
        throw new Error('No se encontró un certificado en esta transacción');
      }

      // 4. Crear objeto de certificado
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
        rawInputData: inputData
      };

      console.log("✅ Certificado procesado:", certificateData);

      // 5. Mostrar resultado
      setResult({
        isValid: true,
        certificateData: certificateData,
        found: true,
        isVerified: true
      });

      // 6. Guardar en historial
      const newSearch = {
        hash: transactionHash,
        studentName: certificateData.recipientName,
        courseName: certificateData.eventName,
        timestamp: Date.now(),
        cid: certificateData.arweaveHash,
        isValid: true,
        isVerified: true
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

  const retryVerification = () => {
    setResult(null);
    findCertificateByTransactionHash();
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('certificateSearchHistory');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  };

  // ========== DETECTAR DISPOSITIVO ==========
  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;
  const isDesktop = windowWidth > 1024;

  // ========== ESTILOS RESPONSIVOS ==========
  const styles = {
    container: {
      maxWidth: isMobile ? '100%' : isTablet ? '95%' : '1200px',
      margin: '0 auto',
      background: 'white',
      borderRadius: isMobile ? '0' : '20px',
      padding: isMobile ? '15px' : '30px',
      boxShadow: isMobile ? 'none' : '0 20px 60px rgba(0,0,0,0.3)',
      minHeight: '100vh',
      position: 'relative',
      overflowX: 'hidden'
    },
    header: {
      textAlign: 'center',
      marginBottom: isMobile ? '20px' : '40px',
      paddingBottom: isMobile ? '15px' : '20px',
      borderBottom: '2px solid #f0f0f0'
    },
    h1: {
      fontSize: isMobile ? '1.8em' : isTablet ? '2.2em' : '2.5em',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: isMobile ? '8px' : '10px',
      lineHeight: '1.2',
      padding: isMobile ? '0 10px' : '0'
    },
    subtitle: {
      color: '#666',
      fontSize: isMobile ? '0.9em' : '1.1em',
      marginBottom: isMobile ? '15px' : '20px',
      lineHeight: '1.4',
      padding: isMobile ? '0 10px' : '0'
    },
    networkStatus: {
      display: 'inline-block',
      padding: isMobile ? '8px 16px' : '12px 24px',
      borderRadius: '50px',
      fontWeight: '600',
      marginTop: isMobile ? '8px' : '10px',
      background: networkStatus === 'connected' ? '#d1fae5' : 
                 networkStatus === 'disconnected' ? '#fee2e2' : '#fef3c7',
      color: networkStatus === 'connected' ? '#065f46' : 
             networkStatus === 'disconnected' ? '#991b1b' : '#92400e',
      border: `2px solid ${networkStatus === 'connected' ? '#10b981' : 
                          networkStatus === 'disconnected' ? '#ef4444' : '#f59e0b'}`,
      fontSize: isMobile ? '0.8em' : '1em'
    },
    inputSection: {
      background: '#f8fafc',
      padding: isMobile ? '15px' : '25px',
      borderRadius: isMobile ? '10px' : '15px',
      marginBottom: isMobile ? '20px' : '30px',
      border: '2px solid #e2e8f0'
    },
    input: {
      width: '100%',
      padding: isMobile ? '12px' : '15px',
      border: '2px solid #cbd5e0',
      borderRadius: isMobile ? '8px' : '10px',
      fontSize: isMobile ? '14px' : '16px',
      fontFamily: "'SF Mono', Monaco, Consolas, monospace",
      marginBottom: isMobile ? '12px' : '15px',
      transition: 'border-color 0.3s'
    },
    button: {
      width: '100%',
      padding: isMobile ? '12px 20px' : '15px 30px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      border: 'none',
      borderRadius: isMobile ? '8px' : '10px',
      fontSize: isMobile ? '14px' : '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      marginBottom: isMobile ? '8px' : '10px'
    },
    autoVerificationBadge: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      color: 'white',
      padding: isMobile ? '10px 16px' : '12px 24px',
      borderRadius: '50px',
      fontWeight: '600',
      marginBottom: isMobile ? '15px' : '20px',
      textAlign: 'center',
      animation: 'pulse 2s infinite',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      fontSize: isMobile ? '0.8em' : '1em',
      flexWrap: 'wrap'
    },
    resultCard: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      padding: isMobile ? '15px' : '25px',
      borderRadius: isMobile ? '10px' : '15px',
      marginTop: isMobile ? '15px' : '20px',
      border: '2px solid #10b981',
      animation: 'slideIn 0.5s ease-out'
    },
    errorCard: {
      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      padding: isMobile ? '15px' : '25px',
      borderRadius: isMobile ? '10px' : '15px',
      marginTop: isMobile ? '15px' : '20px',
      border: '2px solid #ef4444',
      color: '#991b1b',
      animation: 'slideIn 0.5s ease-out'
    },
    detailRow: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      marginBottom: isMobile ? '10px' : '12px',
      padding: isMobile ? '10px' : '12px',
      background: 'rgba(255,255,255,0.7)',
      borderRadius: isMobile ? '6px' : '8px',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? '5px' : '0'
    },
    detailLabel: {
      minWidth: isMobile ? 'auto' : '180px',
      fontWeight: '600',
      color: '#374151',
      fontSize: isMobile ? '0.9em' : '1em',
      marginBottom: isMobile ? '5px' : '0'
    },
    detailValue: {
      flex: 1,
      color: '#1f2937',
      fontSize: isMobile ? '0.9em' : '1em',
      width: '100%'
    },
    pdfButton: {
      padding: isMobile ? '8px 16px' : '12px 24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: isMobile ? '6px' : '10px',
      fontSize: isMobile ? '14px' : '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginRight: isMobile ? '5px' : '10px',
      marginBottom: isMobile ? '5px' : '0'
    },
    copyButton: {
      padding: isMobile ? '8px 16px' : '12px 24px',
      background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
      color: 'white',
      border: 'none',
      borderRadius: isMobile ? '6px' : '10px',
      fontSize: isMobile ? '14px' : '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: isMobile ? '5px' : '0'
    },
    loading: {
      textAlign: 'center',
      padding: isMobile ? '20px' : '40px',
      background: '#f8fafc',
      borderRadius: isMobile ? '10px' : '15px',
      marginBottom: isMobile ? '15px' : '20px'
    },
    buttonGroup: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '8px' : '10px',
      marginTop: isMobile ? '10px' : '0'
    }
  };

  // ========== USE EFFECTS ADICIONALES ==========
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

  // ========== RENDER ==========
  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: isMobile ? '10px' : '20px',
      minHeight: '100vh'
    }}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.h1}>🔍 Verificador de Certificados</h1>
          <p style={styles.subtitle}>
            Ingresa el hash del certificado para verificar su autenticidad en <strong>Sonic Testnet</strong>
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
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                gap: isMobile ? '5px' : '10px'
              }}>
                <span>❌ ERROR DE CONEXIÓN</span>
                <button 
                  onClick={checkNetworkStatus}
                  style={{
                    padding: '4px 12px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '0.8em' : '0.9em'
                  }}
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>
        </header>

        <main>
          {/* BADGE DE VERIFICACIÓN AUTOMÁTICA MEJORADO */}
          {autoVerification && !result && !loading && (
            <div style={styles.autoVerificationBadge}>
              <span style={{animation: 'spin 1s linear infinite'}}>⚡</span>
              VERIFICACIÓN AUTOMÁTICA DETECTADA
              <span style={{animation: 'spin 1s linear infinite'}}>⚡</span>
            </div>
          )}

          {/* SECCIÓN DE BÚSQUEDA RESPONSIVA */}
          <div style={styles.inputSection}>
            <div style={{marginBottom: '20px'}}>
              <label htmlFor="transactionHash" style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#2d3748',
                fontSize: isMobile ? '0.9em' : '1em'
              }}>
                Hash de la Transacción:
              </label>
              <input
                id="transactionHash"
                type="text"
                placeholder="0xfe078480207ea526ac82c8d1a45f50d1a747653203a3d5693e9d4793e737d536"
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && findCertificateByTransactionHash()}
                style={styles.input}
              />
              <div style={{
                fontSize: isMobile ? '0.8em' : '0.9em',
                color: '#6b7280',
                marginTop: '5px'
              }}>
                Ingresa el hash de la transacción o pega la URL del certificado
              </div>
            </div>
            
            {/* SOLO BOTÓN PARA VERIFICAR */}
            <button 
              onClick={findCertificateByTransactionHash}
              disabled={loading || !transactionHash.trim()}
              style={{
                ...styles.button,
                opacity: (loading || !transactionHash.trim()) ? 0.6 : 1,
                cursor: (loading || !transactionHash.trim()) ? 'not-allowed' : 'pointer'
              }}
              onMouseOver={(e) => {
                if (!loading && transactionHash.trim()) {
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
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <span style={{
                    display: 'inline-block',
                    width: isMobile ? '14px' : '16px',
                    height: isMobile ? '14px' : '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px'
                  }}></span>
                  <span style={{fontSize: isMobile ? '0.9em' : '1em'}}>
                    {autoVerification ? 'Verificando...' : 'Buscando...'}
                  </span>
                </div>
              ) : '✅ Verificar Certificado'}
            </button>
          </div>

          {/* LOADING RESPONSIVO */}
          {loading && (
            <div style={styles.loading}>
              <div style={{
                width: isMobile ? '50px' : '60px',
                height: isMobile ? '50px' : '60px',
                border: isMobile ? '4px solid #e2e8f0' : '5px solid #e2e8f0',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 15px'
              }}></div>
              <p style={{color: '#4b5563', fontWeight: '600', fontSize: isMobile ? '0.9em' : '1em'}}>
                {autoVerification ? 'Verificando certificado automáticamente...' : 'Buscando certificado en blockchain...'}
              </p>
              <p style={{color: '#6b7280', fontSize: isMobile ? '0.8em' : '0.9em', marginTop: '10px'}}>
                Consultando Sonic Testnet...
              </p>
            </div>
          )}

          {/* RESULTADO - CERTIFICADO ENCONTRADO RESPONSIVO */}
          {result && result.found && result.isValid ? (
            <div style={styles.resultCard}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                marginBottom: isMobile ? '15px' : '25px',
                paddingBottom: isMobile ? '10px' : '15px',
                borderBottom: '2px solid rgba(16, 185, 129, 0.3)',
                gap: isMobile ? '10px' : '0'
              }}>
                <h2 style={{
                  color: '#065f46', 
                  fontSize: isMobile ? '1.3em' : isTablet ? '1.6em' : '1.8em',
                  marginBottom: isMobile ? '5px' : '0'
                }}>
                  🎉 CERTIFICADO VERIFICADO
                </h2>
                <div style={{
                  background: '#059669',
                  color: 'white',
                  padding: isMobile ? '6px 12px' : '10px 20px',
                  borderRadius: '50px',
                  fontWeight: '600',
                  fontSize: isMobile ? '0.9em' : '1.1em',
                  whiteSpace: 'nowrap'
                }}>
                  ✅ AUTÉNTICO
                </div>
              </div>
              
              <div style={{marginBottom: isMobile ? '15px' : '25px'}}>
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>👤 Estudiante:</div>
                  <div style={{
                    ...styles.detailValue,
                    fontSize: isMobile ? '1em' : '1.2em',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {result.certificateData.recipientName}
                  </div>
                </div>
                
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>🎓 Curso/Evento:</div>
                  <div style={{
                    ...styles.detailValue,
                    fontSize: isMobile ? '0.95em' : '1.1em',
                    fontWeight: '500'
                  }}>
                    {result.certificateData.eventName}
                  </div>
                </div>
                
                {result.certificateData.arweaveHash && isLikelyCID(result.certificateData.arweaveHash) && (
                  <div style={styles.detailRow}>
                    <div style={styles.detailLabel}>📄 Certificado PDF:</div>
                    <div style={styles.detailValue}>
                      <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: isMobile ? '8px' : '10px',
                        marginBottom: isMobile ? '8px' : '10px'
                      }}>
                        <button 
                          onClick={() => openPDFFromCID(result.certificateData.arweaveHash)}
                          style={styles.pdfButton}
                        >
                          <span>📥</span>
                          {isMobile ? 'Ver PDF' : 'Ver Certificado'}
                        </button>
                        <button 
                          onClick={() => copyToClipboard(result.certificateData.arweaveHash)}
                          style={styles.copyButton}
                        >
                          <span>📋</span>
                          {isMobile ? 'Copiar' : 'Copiar CID'}
                        </button>
                      </div>
                      <div style={{
                        fontSize: isMobile ? '0.75em' : '0.85em',
                        color: '#4b5563',
                        fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                        background: 'rgba(255,255,255,0.5)',
                        padding: isMobile ? '6px' : '8px',
                        borderRadius: '6px',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word'
                      }}>
                        {formatCID(result.certificateData.arweaveHash)}
                      </div>
                    </div>
                  </div>
                )}
                
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>🔗 Hash de Transacción:</div>
                  <div style={styles.detailValue}>
                    <div style={{
                      fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                      fontSize: isMobile ? '0.75em' : '0.9em',
                      background: 'rgba(255,255,255,0.5)',
                      padding: isMobile ? '6px' : '8px',
                      borderRadius: '6px',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                      marginBottom: isMobile ? '8px' : '10px'
                    }}>
                      {result.certificateData.transactionHash}
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? '8px' : '10px'
                    }}>
                      <button 
                        onClick={() => copyToClipboard(result.certificateData.transactionHash)}
                        style={styles.copyButton}
                      >
                        <span>📋</span>
                        {isMobile ? 'Copiar Hash' : 'Copiar Hash'}
                      </button>
                      <a 
                        href={`${SONIC_EXPLORER}/${result.certificateData.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          ...styles.pdfButton,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span>🔍</span>
                        {isMobile ? 'Explorer' : 'Ver en Explorer'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255,255,255,0.8)',
                padding: isMobile ? '12px' : '20px',
                borderRadius: isMobile ? '8px' : '10px',
                border: '2px solid #bae6fd',
                marginBottom: isMobile ? '15px' : '0'
              }}>
                <div style={{
                  color: '#0369a1',
                  fontWeight: '600',
                  fontSize: isMobile ? '0.95em' : '1.1em',
                  marginBottom: isMobile ? '10px' : '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span>🔗</span>
                  <span>Verificado en Blockchain - Sonic Testnet</span>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: isMobile ? '10px' : '15px',
                  fontSize: isMobile ? '0.85em' : '0.95em'
                }}>
                  <div>
                    <strong>Block:</strong> {result.certificateData.blockNumber}
                  </div>
                  <div>
                    <strong>Contrato:</strong>{' '}
                    <span style={{
                      fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                      fontSize: isMobile ? '0.8em' : '0.9em'
                    }}>
                      {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}
                    </span>
                  </div>
                  <div>
                    <strong>Emisor:</strong>{' '}
                    <span style={{
                      fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                      fontSize: isMobile ? '0.8em' : '0.9em'
                    }}>
                      {result.certificateData.issuer.slice(0, 10)}...{result.certificateData.issuer.slice(-8)}
                    </span>
                  </div>
                  <div>
                    <strong>Fecha:</strong>{' '}
                    {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              {/* SECCIÓN MEJORADA PARA COMPARTIR RESPONSIVA */}
              <div style={{
                marginTop: isMobile ? '15px' : '20px',
                padding: isMobile ? '12px' : '15px',
                background: 'rgba(255,255,255,0.9)',
                borderRadius: isMobile ? '8px' : '10px',
                border: '2px solid #e5e7eb'
              }}>
                <h4 style={{
                  color: '#374151', 
                  marginBottom: isMobile ? '8px' : '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  fontSize: isMobile ? '0.95em' : '1em'
                }}>
                  <span>📱</span>
                  <span>Compartir Verificación</span>
                </h4>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: isMobile ? '8px' : '10px',
                  marginBottom: isMobile ? '10px' : '15px'
                }}>
                  <div>
                    <label style={{
                      display: 'block', 
                      fontSize: isMobile ? '0.8em' : '0.9em', 
                      color: '#6b7280', 
                      marginBottom: '5px'
                    }}>
                      URL para QR (se verifica automáticamente):
                    </label>
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? '8px' : '10px',
                      alignItems: 'center'
                    }}>
                      <input
                        type="text"
                        readOnly
                        value={generateShareableURL(result.certificateData.transactionHash)}
                        style={{
                          flex: 1,
                          padding: isMobile ? '8px' : '10px',
                          border: '2px solid #d1d5db',
                          borderRadius: '6px',
                          fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                          fontSize: isMobile ? '0.75em' : '0.9em',
                          background: '#f9fafb',
                          width: '100%'
                        }}
                      />
                      <button 
                        onClick={() => {
                          const url = generateShareableURL(result.certificateData.transactionHash);
                          copyToClipboard(url);
                        }}
                        style={{
                          padding: isMobile ? '8px 12px' : '10px 15px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          width: isMobile ? '100%' : 'auto'
                        }}
                      >
                        {isMobile ? '📋 Copiar URL' : 'Copiar URL'}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label style={{
                      display: 'block', 
                      fontSize: isMobile ? '0.8em' : '0.9em', 
                      color: '#6b7280', 
                      marginBottom: '5px'
                    }}>
                      Hash Directo (para apps):
                    </label>
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? '8px' : '10px',
                      alignItems: 'center'
                    }}>
                      <input
                        type="text"
                        readOnly
                        value={result.certificateData.transactionHash}
                        style={{
                          flex: 1,
                          padding: isMobile ? '8px' : '10px',
                          border: '2px solid #d1d5db',
                          borderRadius: '6px',
                          fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                          fontSize: isMobile ? '0.75em' : '0.9em',
                          background: '#f9fafb',
                          width: '100%'
                        }}
                      />
                      <button 
                        onClick={() => copyToClipboard(result.certificateData.transactionHash)}
                        style={{
                          padding: isMobile ? '8px 12px' : '10px 15px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          width: isMobile ? '100%' : 'auto'
                        }}
                      >
                        {isMobile ? '📋 Copiar Hash' : 'Copiar Hash'}
                      </button>
                    </div>
                  </div>
                </div>
                
                <p style={{
                  color: '#6b7280', 
                  fontSize: isMobile ? '0.75em' : '0.85em', 
                  marginTop: isMobile ? '8px' : '10px', 
                  padding: isMobile ? '6px' : '8px', 
                  background: '#f3f4f6', 
                  borderRadius: '6px',
                  lineHeight: '1.4'
                }}>
                  <strong>💡 Cómo usar:</strong> Genera un QR con la URL copiada. Cuando alguien escanee el QR, se abrirá esta página y verificará automáticamente el certificado.
                </p>
              </div>
            </div>
          ) : result && result.error ? (
            <div style={styles.errorCard}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: '10px',
                marginBottom: '15px'
              }}>
                <span style={{fontSize: isMobile ? '1.3em' : '1.5em'}}>❌</span>
                <h2 style={{
                  color: '#991b1b', 
                  fontSize: isMobile ? '1.2em' : '1.5em',
                  marginBottom: isMobile ? '5px' : '0'
                }}>
                  NO SE PUDO VERIFICAR
                </h2>
              </div>
              
              <p style={{
                background: 'rgba(255,255,255,0.5)',
                padding: isMobile ? '10px' : '15px',
                borderRadius: isMobile ? '6px' : '8px',
                marginBottom: isMobile ? '15px' : '20px',
                fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                fontSize: isMobile ? '0.85em' : '0.95em',
                wordBreak: 'break-word'
              }}>
                {result.error}
              </p>
              
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '15px',
                flexWrap: 'wrap'
              }}>
                <button 
                  onClick={retryVerification}
                  style={{
                    padding: isMobile ? '10px 20px' : '12px 24px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: isMobile ? '6px' : '8px',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s',
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  <span>🔄</span>
                  Reintentar
                </button>
                
                <button 
                  onClick={() => setResult(null)}
                  style={{
                    padding: isMobile ? '10px 20px' : '12px 24px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: isMobile ? '6px' : '8px',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  Limpiar
                </button>
              </div>
            </div>
          ) : null}
        </main>
      </div>
      
      {/* ESTILOS GLOBALES RESPONSIVOS */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
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
          overflow-x: hidden;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        a:hover {
          text-decoration: underline;
        }
        ::selection {
          background: rgba(102, 126, 234, 0.3);
          color: #000;
        }
        
        /* Mejoras específicas para móviles */
        @media (max-width: 768px) {
          html {
            font-size: 14px;
          }
          
          input, button, textarea {
            font-size: 16px !important; /* Evita zoom en iOS */
          }
          
          /* Mejorar toques en móviles */
          button, a {
            min-height: 44px;
            min-width: 44px;
          }
          
          /* Scroll suave */
          * {
            -webkit-overflow-scrolling: touch;
          }
        }
        
        /* Mejoras para tablets */
        @media (min-width: 769px) and (max-width: 1024px) {
          html {
            font-size: 15px;
          }
        }
        
        /* Mejoras para desktop */
        @media (min-width: 1025px) {
          html {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
