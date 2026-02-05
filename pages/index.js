// pages/index.js - VERIFICADOR AUTOMÁTICO MEJORADO PARA PINATA Y SONIC
import { useState, useEffect } from 'react';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [searchHistory, setSearchHistory] = useState([]);
  const [autoVerification, setAutoVerification] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [pdfUrl, setPdfUrl] = useState('');
  const [showPdf, setShowPdf] = useState(false);

  // CONFIGURACIÓN ACTUALIZADA
  const CONTRACT_ADDRESS = "0x7ba96b6463ba70b4c5187a3606f583c101e83a16"; // Tu contrato real
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const SONIC_EXPLORER = "https://testnet.soniclabs.com/tx";

  // ========== DETECCIÓN DE ANCHO DE PANTALLA ==========
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ========== VERIFICACIÓN AUTOMÁTICA MEJORADA ==========
  useEffect(() => {
    const extractHashFromURL = () => {
      try {
        if (typeof window === 'undefined') return null;
        
        const url = new URL(window.location.href);
        const params = url.searchParams;
        
        const possibleParams = ['tx', 'hash', 'transaction', 'txHash', 'th', 'h'];
        let hashValue = null;
        
        for (const param of possibleParams) {
          const value = params.get(param);
          if (value && value.startsWith('0x') && value.length === 66) {
            hashValue = value;
            break;
          }
        }
        
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
      
      if (window.history.replaceState) {
        const newUrl = new URL(window.location.href);
        ['tx', 'hash', 'transaction', 'txHash', 'th', 'h'].forEach(param => {
          newUrl.searchParams.delete(param);
        });
        
        const cleanPathname = window.location.pathname.replace(/\/(0x[a-fA-F0-9]{64})\/?$/, '');
        if (cleanPathname !== window.location.pathname) {
          newUrl.pathname = cleanPathname;
        }
        
        window.history.replaceState({}, document.title, newUrl.toString());
        console.log('🔄 URL limpiada:', newUrl.toString());
      }
      
      setTransactionHash(hashFromURL);
      setAutoVerification(true);
      
      const validationError = validateTransactionHash(hashFromURL);
      if (validationError === null) {
        console.log('⚡ Verificando automáticamente...');
        
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
    params.set('tx', hash);
    
    return `${baseURL}?${params.toString()}`;
  };

  // ========== FUNCIONES AUXILIARES MEJORADAS ==========
  
  const hexToString = (hex) => {
    try {
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        const hexByte = hex.substr(i, 2);
        if (hexByte === '00') break;
        const charCode = parseInt(hexByte, 16);
        if (charCode >= 32 && charCode <= 126) { // Solo caracteres imprimibles
          str += String.fromCharCode(charCode);
        }
      }
      return str;
    } catch (error) {
      console.log("Error convirtiendo hex a string:", error);
      return "";
    }
  };

  // Función para extraer strings dinámicamente
  const extractDynamicString = (dataHex, offset) => {
    try {
      const startIdx = offset * 2;
      if (startIdx >= dataHex.length) return "";
      
      const lengthHex = dataHex.substring(startIdx, startIdx + 64);
      const stringLength = parseInt(lengthHex, 16);
      
      if (stringLength > 0 && stringLength < 100) {
        const stringStart = startIdx + 64;
        const stringEnd = stringStart + (stringLength * 2);
        
        if (stringEnd <= dataHex.length) {
          const stringHex = dataHex.substring(stringStart, stringEnd);
          return hexToString(stringHex);
        }
      }
    } catch (e) {
      console.log(`Error en offset ${offset}:`, e);
    }
    return "";
  };

  const extractDataFromInput = (inputData) => {
    console.log("🔍 Analizando input data:", inputData);
    
    const result = {
      studentName: "",
      courseName: "",
      fecha: "",
      nota: "",
      ipfsHash: ""
    };
    
    try {
      // Remover selector de función (0xb6d239b9)
      const dataHex = inputData.slice(10);
      
      console.log("📊 Longitud dataHex:", dataHex.length);
      
      if (dataHex.length >= 192) {
        // Leer offsets para nombre, curso y timestamp
        const offset1 = parseInt(dataHex.substring(0, 64), 16);
        const offset2 = parseInt(dataHex.substring(64, 128), 16);
        const offset3Hex = dataHex.substring(128, 192);
        const timestampValue = parseInt(offset3Hex, 16);
        
        console.log("📍 Offsets básicos:", { offset1, offset2, timestampValue });
        
        // Extraer nombre y curso
        result.studentName = extractDynamicString(dataHex, offset1);
        result.courseName = extractDynamicString(dataHex, offset2);
        
        // Convertir timestamp a fecha legible
        if (timestampValue > 0) {
          const date = new Date(timestampValue * 1000);
          result.fecha = date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        
        // Buscar nota en datos adicionales (puede estar en bytes extras)
        if (dataHex.length > 256) {
          // Buscar patrones de números en hex
          for (let i = 192; i < dataHex.length - 64; i += 64) {
            const chunk = dataHex.substring(i, i + 64);
            const numericValue = parseInt(chunk, 16);
            if (numericValue > 0 && numericValue <= 100) {
              result.nota = numericValue.toString();
              break;
            }
          }
        }
        
        console.log("✅ Datos básicos extraídos:", result);
      }
      
    } catch (error) {
      console.error("❌ Error extrayendo datos del input:", error);
    }
    
    // Valores por defecto
    if (!result.studentName) result.studentName = "No especificado";
    if (!result.courseName) result.courseName = "Curso no especificado";
    if (!result.fecha) result.fecha = "Fecha no disponible";
    if (!result.nota) result.nota = "N/A";
    
    return result;
  };

  const extractCertificateDataFromLog = (log, inputData) => {
    console.log("🔍 Extrayendo datos del log:", log);
    
    const result = {
      studentName: "",
      courseName: "",
      fecha: "",
      nota: "",
      ipfsHash: "",
      certificateId: log.topics?.[1] || "0x"
    };
    
    try {
      // 1. Extraer datos básicos del input
      const inputDataResult = extractDataFromInput(inputData);
      
      result.studentName = inputDataResult.studentName;
      result.courseName = inputDataResult.courseName;
      result.fecha = inputDataResult.fecha;
      result.nota = inputDataResult.nota;
      
      // 2. Buscar CID/IPFS hash en los datos del log
      if (log.data && log.data.length > 10) {
        const logDataHex = log.data.slice(2);
        
        console.log("🔎 Buscando CID en log data (longitud:", logDataHex.length, ")");
        
        // Patrones para CID de IPFS
        const cidPatterns = [
          /516d[a-f0-9]{44}/,                    // CID v0: Qm + 44 caracteres
          /6261666b726569[a-f0-9]{50,54}/,       // CID v1: bafkreie + 50-54
          /626166796265[a-f0-9]{54,58}/,         // CID v1: bafybe + 54-58
          /626166[a-f0-9]{56,60}/,               // CID v1 genérico
        ];
        
        // Buscar CID con patrones
        for (const pattern of cidPatterns) {
          const match = logDataHex.match(pattern);
          if (match) {
            const hexCID = match[0];
            const decodedCID = hexToString(hexCID);
            
            // Verificar si es un CID válido
            if (decodedCID.startsWith('Qm') || decodedCID.startsWith('baf')) {
              result.ipfsHash = decodedCID;
              console.log("✅ CID encontrado con patrón:", result.ipfsHash);
              break;
            } else {
              // Intentar usar el hex directamente
              const testCID = hexToString(hexCID);
              if (testCID.startsWith('Qm') || testCID.startsWith('baf')) {
                result.ipfsHash = testCID;
                console.log("✅ CID extraído de hex:", result.ipfsHash);
                break;
              }
            }
          }
        }
        
        // Si no encontramos con patrones, buscar manualmente
        if (!result.ipfsHash) {
          const decodedLogData = hexToString(logDataHex);
          console.log("📝 Log data decodificado completo:", decodedLogData);
          
          // Buscar CID en texto decodificado
          const cidRegex = /(Qm[1-9A-HJ-NP-Za-km-z]{44})|(baf[0-9a-z]{50,})/;
          const cidMatch = decodedLogData.match(cidRegex);
          
          if (cidMatch) {
            result.ipfsHash = cidMatch[0];
            console.log("✅ CID encontrado en texto:", result.ipfsHash);
          } else {
            // Buscar en chunks pequeños
            for (let i = 0; i < logDataHex.length - 50; i += 2) {
              const chunk = logDataHex.substring(i, i + 100);
              const decodedChunk = hexToString(chunk);
              if (decodedChunk.includes('Qm') || decodedChunk.includes('baf')) {
                const match = decodedChunk.match(/(Qm[1-9A-HJ-NP-Za-km-z]{44})|(baf[0-9a-z]{50,})/);
                if (match) {
                  result.ipfsHash = match[0];
                  console.log("✅ CID encontrado en chunk:", result.ipfsHash);
                  break;
                }
              }
            }
          }
        }
        
        // 3. Buscar nota específica en el log
        if (result.nota === "N/A") {
          const decodedLogData = hexToString(logDataHex);
          const notaMatch = decodedLogData.match(/(\d{1,3}\.\d{1,2})|\b(100|\d{1,2})\b/);
          if (notaMatch) {
            result.nota = notaMatch[0];
            console.log("📊 Nota encontrada en log:", result.nota);
          }
        }
      }
      
    } catch (error) {
      console.error("❌ Error en extractCertificateDataFromLog:", error);
    }
    
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

  const openPDFFromCID = async (cid) => {
    if (!cid) {
      alert('No hay certificado PDF disponible');
      return;
    }
    
    const cleanCID = formatCID(cid);
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${cleanCID}`,
      `https://ipfs.io/ipfs/${cleanCID}`,
      `https://cloudflare-ipfs.com/ipfs/${cleanCID}`,
      `https://dweb.link/ipfs/${cleanCID}`
    ];
    
    // Intentar con cada gateway
    for (const gatewayUrl of gateways) {
      try {
        console.log("🔗 Probando gateway:", gatewayUrl);
        const response = await fetch(gatewayUrl, { method: 'HEAD' });
        if (response.ok) {
          setPdfUrl(gatewayUrl);
          setShowPdf(true);
          window.open(gatewayUrl, '_blank', 'noopener,noreferrer');
          return;
        }
      } catch (error) {
        console.log(`Gateway fallido ${gatewayUrl}:`, error.message);
        continue;
      }
    }
    
    // Si todos fallan, mostrar el CID
    alert(`No se pudo acceder al certificado. CID: ${cleanCID}\n\nPuedes intentar manualmente en:\nhttps://gateway.pinata.cloud/ipfs/${cleanCID}`);
  };

  const fetchCertificateMetadata = async (cid) => {
    if (!cid) return null;
    
    const cleanCID = formatCID(cid);
    const endpoints = [
      `https://gateway.pinata.cloud/ipfs/${cleanCID}/metadata.json`,
      `https://gateway.pinata.cloud/ipfs/${cleanCID}`,
      `https://ipfs.io/ipfs/${cleanCID}/metadata.json`
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log("🌐 Consultando metadata en:", endpoint);
        const response = await fetch(endpoint, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log("📄 Metadata encontrada:", data);
            return data;
          }
        }
      } catch (error) {
        console.log("❌ Error en endpoint:", endpoint, error.message);
        continue;
      }
    }
    
    return null;
  };

  const validateTransactionHash = (hash) => {
    if (!hash) return 'Ingresa un hash de transacción';
    
    const cleanHash = hash.trim().toLowerCase();
    
    if (cleanHash.length !== 66) return 'Hash debe tener 66 caracteres (0x + 64 caracteres)';
    if (!cleanHash.startsWith('0x')) return 'Hash debe comenzar con 0x';
    if (!/^0x[0-9a-f]{64}$/.test(cleanHash)) return 'Hash contiene caracteres inválidos (solo 0-9, a-f)';
    
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

  // ========== FUNCIÓN PRINCIPAL DE VERIFICACIÓN MEJORADA ==========
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
    setShowPdf(false);

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
        studentName: "No especificado",
        courseName: "Curso no especificado",
        fecha: "Fecha no disponible",
        nota: "N/A",
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

      // 4. Crear objeto de certificado con todos los datos
      const certificateData = {
        issuer: receipt.from || "0x...",
        recipientName: extractedData.studentName,
        eventName: extractedData.courseName,
        fecha: extractedData.fecha,
        nota: extractedData.nota,
        ipfsHash: extractedData.ipfsHash,
        certificateId: extractedData.certificateId,
        transactionHash: transactionHash,
        blockNumber: parseInt(receipt.blockNumber, 16),
        contractAddress: CONTRACT_ADDRESS,
        rawInputData: inputData,
        timestamp: new Date().toISOString()
      };

      console.log("✅ Certificado procesado:", certificateData);

      // 5. Intentar obtener metadata adicional si hay CID
      if (certificateData.ipfsHash && isLikelyCID(certificateData.ipfsHash)) {
        try {
          const metadata = await fetchCertificateMetadata(certificateData.ipfsHash);
          if (metadata) {
            // Actualizar con metadata encontrada
            if (metadata.nombre) certificateData.recipientName = metadata.nombre;
            if (metadata.curso) certificateData.eventName = metadata.curso;
            if (metadata.fecha) certificateData.fecha = metadata.fecha;
            if (metadata.nota || metadata.calificacion) certificateData.nota = metadata.nota || metadata.calificacion;
          }
        } catch (metadataError) {
          console.log("ℹ️ No se pudo obtener metadata:", metadataError);
        }
      }

      // 6. Mostrar resultado
      setResult({
        isValid: true,
        certificateData: certificateData,
        found: true,
        isVerified: true
      });

      // 7. Guardar en historial
      const newSearch = {
        hash: transactionHash,
        studentName: certificateData.recipientName,
        courseName: certificateData.eventName,
        fecha: certificateData.fecha,
        nota: certificateData.nota,
        cid: certificateData.ipfsHash,
        timestamp: Date.now(),
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

  // Ejemplo de transacción para pruebas
  const exampleTransaction = "0x31e6dbdf67b0dc5095d473a1c0db063f01f4e2df502dcb1b9a560e7e6f80a2b8";

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
          {/* BADGE DE VERIFICACIÓN AUTOMÁTICA */}
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
                placeholder="0x31e6dbdf67b0dc5095d473a1c0db063f01f4e2df502dcb1b9a560e7e6f80a2b8"
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
            
            {/* BOTONES DE EJEMPLO Y ACCIÓN */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '10px' : '15px',
              marginBottom: '15px'
            }}>
              <button 
                onClick={() => setTransactionHash(exampleTransaction)}
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                📋 Cargar Ejemplo (Ernesto)
              </button>
              <button 
                onClick={() => {
                  setTransactionHash('');
                  setResult(null);
                }}
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                🗑️ Limpiar
              </button>
            </div>
            
            {/* BOTÓN PRINCIPAL DE VERIFICACIÓN */}
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
                    {autoVerification ? 'Verificando...' : 'Buscando certificado...'}
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
                Consultando Sonic Testnet y verificando datos...
              </p>
            </div>
          )}

          {/* RESULTADO - CERTIFICADO ENCONTRADO */}
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
                {/* NOMBRE DEL ESTUDIANTE */}
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>👤 Estudiante:</div>
                  <div style={{
                    ...styles.detailValue,
                    fontSize: isMobile ? '1.1em' : '1.3em',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {result.certificateData.recipientName}
                  </div>
                </div>
                
                {/* CURSO/EVENTO */}
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>🎓 Curso/Evento:</div>
                  <div style={{
                    ...styles.detailValue,
                    fontSize: isMobile ? '1em' : '1.2em',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    {result.certificateData.eventName}
                  </div>
                </div>
                
                {/* FECHA */}
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>📅 Fecha de Emisión:</div>
                  <div style={styles.detailValue}>
                    {result.certificateData.fecha}
                  </div>
                </div>
                
                {/* NOTA/CALIFICACIÓN */}
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>📊 Calificación:</div>
                  <div style={{
                    ...styles.detailValue,
                    fontSize: isMobile ? '1.1em' : '1.3em',
                    fontWeight: 'bold',
                    color: result.certificateData.nota !== "N/A" && parseFloat(result.certificateData.nota) >= 60 ? '#059669' : 
                           result.certificateData.nota !== "N/A" ? '#dc2626' : '#6b7280'
                  }}>
                    {result.certificateData.nota} {result.certificateData.nota !== "N/A" ? "puntos" : ""}
                  </div>
                </div>
                
                {/* CID/IPFS HASH */}
                {result.certificateData.ipfsHash && isLikelyCID(result.certificateData.ipfsHash) && (
                  <div style={styles.detailRow}>
                    <div style={styles.detailLabel}>📄 Certificado PDF (Pinata):</div>
                    <div style={styles.detailValue}>
                      <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: isMobile ? '10px' : '15px',
                        marginBottom: isMobile ? '10px' : '15px',
                        flexWrap: 'wrap'
                      }}>
                        <button 
                          onClick={() => openPDFFromCID(result.certificateData.ipfsHash)}
                          style={styles.pdfButton}
                        >
                          <span>📥</span>
                          {isMobile ? 'Ver PDF' : 'Ver Certificado PDF'}
                        </button>
                        <button 
                          onClick={() => copyToClipboard(result.certificateData.ipfsHash)}
                          style={styles.copyButton}
                        >
                          <span>📋</span>
                          {isMobile ? 'Copiar CID' : 'Copiar CID IPFS'}
                        </button>
                        <a 
                          href={`https://gateway.pinata.cloud/ipfs/${formatCID(result.certificateData.ipfsHash)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            ...styles.pdfButton,
                            textDecoration: 'none',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                          }}
                        >
                          <span>🌐</span>
                          {isMobile ? 'Pinata' : 'Abrir en Pinata'}
                        </a>
                      </div>
                      <div style={{
                        fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                        fontSize: isMobile ? '0.75em' : '0.85em',
                        background: 'rgba(255,255,255,0.5)',
                        padding: isMobile ? '8px' : '12px',
                        borderRadius: '6px',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word',
                        border: '1px solid #d1d5db'
                      }}>
                        CID: {formatCID(result.certificateData.ipfsHash)}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* HASH DE TRANSACCIÓN */}
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>🔗 Hash de Transacción:</div>
                  <div style={styles.detailValue}>
                    <div style={{
                      fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                      fontSize: isMobile ? '0.75em' : '0.9em',
                      background: 'rgba(255,255,255,0.5)',
                      padding: isMobile ? '8px' : '12px',
                      borderRadius: '6px',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                      marginBottom: isMobile ? '10px' : '15px',
                      border: '1px solid #d1d5db'
                    }}>
                      {result.certificateData.transactionHash}
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? '10px' : '15px',
                      flexWrap: 'wrap'
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
              
              {/* INFORMACIÓN DE BLOCKCHAIN */}
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
                    <strong>ID Certificado:</strong>{' '}
                    <span style={{
                      fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                      fontSize: isMobile ? '0.8em' : '0.9em'
                    }}>
                      {result.certificateData.certificateId.slice(0, 10)}...
                    </span>
                  </div>
                </div>
              </div>
              
              {/* SECCIÓN PARA COMPARTIR */}
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
                      URL para QR (verificación automática):
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
                  <strong>💡 Cómo usar:</strong> Genera un QR con la URL copiada. Cualquier persona que escanee el QR podrá verificar automáticamente este certificado.
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
        
        /* Mejoras para móviles */
        @media (max-width: 768px) {
          html {
            font-size: 14px;
          }
          
          input, button, textarea {
            font-size: 16px !important;
          }
          
          button, a {
            min-height: 44px;
            min-width: 44px;
          }
          
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
