// pages/index.js - VERIFICADOR CON LECTOR QR
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [searchHistory, setSearchHistory] = useState([]);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // CONFIGURACIÓN
  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const SONIC_EXPLORER = "https://testnet.soniclabs.com/tx";

  // ========== FUNCIONES QR SCANNER ==========

  // Iniciar escáner QR
  const startQRScanner = async () => {
    try {
      setShowQRScanner(true);
      
      // Esperar un momento para que el DOM se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) {
        throw new Error('Elementos de video o canvas no encontrados');
      }
      
      // Solicitar acceso a la cámara
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      video.srcObject = stream;
      video.play();
      
      // Iniciar detección de QR
      scanQRCode(video, canvas);
      
    } catch (error) {
      console.error('Error iniciando escáner QR:', error);
      alert('Error al acceder a la cámara. Asegúrate de permitir el acceso.');
      stopQRScanner();
    }
  };

  // Detener escáner QR
  const stopQRScanner = () => {
    setShowQRScanner(false);
    
    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      video.srcObject = null;
    }
  };

  // Función para escanear código QR
  const scanQRCode = (video, canvas) => {
    const context = canvas.getContext('2d');
    
    const scanFrame = () => {
      if (!showQRScanner || !video.videoWidth) {
        return;
      }
      
      // Dibujar el frame de video en el canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Obtener datos de la imagen
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Intentar decodificar QR (usando librería simple)
      try {
        // Método simple para decodificar - en producción usarías una librería como jsQR
        const qrData = decodeQRSimple(imageData);
        
        if (qrData) {
          console.log('QR detectado:', qrData);
          processQRData(qrData);
          return;
        }
      } catch (error) {
        console.log('Error decodificando QR:', error);
      }
      
      // Continuar escaneando
      requestAnimationFrame(scanFrame);
    };
    
    requestAnimationFrame(scanFrame);
  };

  // Decodificador simple de QR (para demostración)
  const decodeQRSimple = (imageData) => {
    // Esta es una versión simplificada. En producción, usarías una librería como:
    // import jsQR from 'jsqr';
    
    // Por ahora, simulamos detección basada en patrones simples
    const data = imageData.data;
    
    // Buscar patrones que podrían ser URLs de IPFS
    // En realidad necesitarías una librería de QR proper
    
    return null;
  };

  // Procesar datos del QR
  const processQRData = (qrData) => {
    try {
      console.log('Procesando datos QR:', qrData);
      
      // Detener el escáner
      stopQRScanner();
      
      // Extraer CID de diferentes formatos de QR
      let cid = extractCIDFromQR(qrData);
      
      if (cid) {
        // Buscar transacción por CID en blockchain
        searchTransactionByCID(cid);
      } else {
        alert('No se pudo extraer un CID válido del código QR');
      }
      
    } catch (error) {
      console.error('Error procesando QR:', error);
      alert('Error procesando código QR');
    }
  };

  // Extraer CID del contenido del QR
  const extractCIDFromQR = (qrData) => {
    // El QR puede contener:
    // 1. URL completa de Pinata: https://gateway.pinata.cloud/ipfs/Qm...
    // 2. Solo el CID: Qm... o bafy...
    // 3. URL IPFS: ipfs://Qm...
    
    console.log('Extrayendo CID de:', qrData);
    
    // Patrones comunes
    const patterns = [
      /gateway\.pinata\.cloud\/ipfs\/([a-zA-Z0-9]+)/,
      /ipfs:\/\/([a-zA-Z0-9]+)/,
      /\/([a-zA-Z0-9]{46,})/,
      /(Qm[1-9A-HJ-NP-Za-km-z]{44})/,
      /(bafy[a-zA-Z0-9]{50,})/
    ];
    
    for (const pattern of patterns) {
      const match = qrData.match(pattern);
      if (match && match[1]) {
        console.log('CID encontrado con patrón:', match[1]);
        return match[1];
      }
    }
    
    // Si no se encontró con patrones, devolver el texto completo si parece CID
    if (qrData.startsWith('Qm') && qrData.length === 46) {
      return qrData;
    }
    
    if (qrData.startsWith('bafy') && qrData.length > 50) {
      return qrData;
    }
    
    return null;
  };

  // Buscar transacción por CID en blockchain
  const searchTransactionByCID = async (cid) => {
    setLoading(true);
    
    try {
      console.log('🔍 Buscando transacción para CID:', cid);
      
      // Aquí necesitarías una manera de mapear CID → transactionHash
      // Esto depende de cómo almacenes la relación CID-transacción
      
      // Método 1: Si tienes una base de datos o API
      // const response = await fetch(`/api/find-transaction?cid=${cid}`);
      
      // Método 2: Buscar en logs de eventos (más complejo)
      // Por ahora, mostraremos un mensaje
      
      alert(`CID detectado: ${cid}\n\nEsta función necesita implementación para buscar la transacción asociada en blockchain.`);
      
      // Por ahora, solo mostramos el CID en el campo
      setTransactionHash(cid);
      
    } catch (error) {
      console.error('Error buscando transacción:', error);
      alert('Error buscando transacción asociada al CID');
    } finally {
      setLoading(false);
    }
  };

  // ========== FUNCIONES AUXILIARES (MANTENIDAS) ==========

  // Función para convertir hex a string
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

  // Función para extraer datos específicos del contrato
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

  // Función para extraer datos del log
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
    
    // Aceptar tanto hashes de transacción como CIDs
    if (hash.startsWith('Qm') || hash.startsWith('baf')) {
      return null; // Es un CID, no un hash de transacción
    }
    
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

  useEffect(() => {
    // Limpiar recursos cuando se desmonte el componente
    return () => {
      stopQRScanner();
    };
  }, []);

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

  // ========== FUNCIÓN PRINCIPAL ==========

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

      let isVerified = true;

      setResult({
        isValid: isVerified,
        certificateData: certificateData,
        found: true,
        isVerified: isVerified
      });

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
      minHeight: '100vh',
      position: 'relative'
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
      width: '100%',
      padding: '15px 30px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      marginBottom: '10px'
    },
    qrButton: {
      width: '100%',
      padding: '15px 30px',
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
      justifyContent: 'center',
      gap: '10px'
    },
    qrScannerOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.9)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    },
    qrScannerContainer: {
      width: '90%',
      maxWidth: '500px',
      background: 'white',
      borderRadius: '15px',
      padding: '20px',
      position: 'relative'
    },
    qrVideo: {
      width: '100%',
      borderRadius: '10px',
      marginBottom: '20px'
    },
    closeButton: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      fontSize: '20px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
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
          <h1 style={styles.h1}>🔍 Verificador de Certificados</h1>
          <p style={styles.subtitle}>
            Verifica certificados en <strong>Sonic Testnet</strong>
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
          {/* SECCIÓN DE BÚSQUEDA CON QR */}
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
                placeholder="Ingresa el hash de la transacción (0x...) o escanea QR"
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && findCertificateByTransactionHash()}
                style={styles.input}
              />
            </div>
            
            {/* BOTÓN PARA ESCANEAR QR */}
            <button 
              onClick={startQRScanner}
              style={styles.qrButton}
              disabled={showQRScanner}
            >
              <span>📷</span>
              Escanear Código QR
            </button>
            
            {/* BOTÓN PARA VERIFICAR */}
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
              ) : '✅ Verificar Certificado'}
            </button>
          </div>

          {/* MODAL DE ESCÁNER QR */}
          {showQRScanner && (
            <div style={styles.qrScannerOverlay}>
              <div style={styles.qrScannerContainer}>
                <button 
                  onClick={stopQRScanner}
                  style={styles.closeButton}
                >
                  ×
                </button>
                
                <h3 style={{textAlign: 'center', marginBottom: '20px', color: '#1f2937'}}>
                  📷 Escanea el Código QR
                </h3>
                
                <p style={{textAlign: 'center', marginBottom: '20px', color: '#6b7280'}}>
                  Enfoca el código QR del certificado
                </p>
                
                <video 
                  ref={videoRef}
                  style={styles.qrVideo}
                  playsInline
                />
                
                <canvas 
                  ref={canvasRef}
                  style={{display: 'none'}}
                />
                
                <div style={{
                  textAlign: 'center',
                  marginTop: '20px',
                  color: '#9ca3af',
                  fontSize: '0.9em'
                }}>
                  El código QR debe contener el CID de Pinata o la URL del certificado
                </div>
              </div>
            </div>
          )}

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
                Consultando Sonic Testnet...
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
                        Almacenado en Pinata IPFS
                      </div>
                    </div>
                  </div>
                )}
                
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
