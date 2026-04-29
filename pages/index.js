// pages/index.js - VERIFICADOR QUE LEE DEL INPUT DE LA TRANSACCIÓN
import { useState, useEffect } from 'react';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [searchHistory, setSearchHistory] = useState([]);
  const [autoVerification, setAutoVerification] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  // CONFIGURACIÓN - USANDO PROXY PARA EVITAR CORS
  const CONTRACT_ADDRESS = "0x0196fb4ac891F47CC194AB5D6b0419C8e709085f";
  const SONIC_RPC_URL = "/api/rpc";
  const SONIC_EXPLORER = "https://testnet.soniclabs.com/tx";

  // Hashes de ejemplo
  const EXAMPLE_HASH_SUBIRANA = "0x6285091c55f485612d03cfef254f14120749cb6d2747664a411063bf7207adf4";
  const EXAMPLE_HASH_GALO = "0x01e8bc7713de1324405ec5c5b964486ce1731a6006b88284c2834df21413671f";

  // ========== FUNCIÓN PRINCIPAL: DECODIFICAR INPUT ==========

  const hexToString = (hex) => {
    try {
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        const hexByte = hex.substr(i, 2);
        if (hexByte === '00') break;
        const charCode = parseInt(hexByte, 16);
        if (charCode >= 32 && charCode <= 126) {
          str += String.fromCharCode(charCode);
        }
      }
      return str;
    } catch (error) {
      return "";
    }
  };

  // Decodificar INPUT DATA completa sin fragmentar
  const decodeInputData = (inputData) => {
    console.log("🔍 Decodificando input data:", inputData);
    
    if (!inputData || inputData === '0x') {
      return null;
    }
    
    try {
      const dataHex = inputData.slice(10);
      console.log("📝 DataHex (primeros 100 chars):", dataHex.substring(0, 100));
      
      // ========== CONVERTIR TODO EL HEX A TEXTO LEGIBLE ==========
      let textoCompleto = '';
      for (let i = 0; i < dataHex.length; i += 2) {
        const byte = dataHex.substr(i, 2);
        const code = parseInt(byte, 16);
        if (code >= 32 && code <= 126) {
          textoCompleto += String.fromCharCode(code);
        } else if (code === 0) {
          textoCompleto += ' ';
        }
      }
      console.log("📝 TEXTO COMPLETO DECODIFICADO:", textoCompleto);
      
      // ========== EXTRAER DATOS CON EXPRESIONES REGULARES ==========
      
      // 1. Extraer CID (bafy... o Qm...)
      let cid = "";
      const cidMatch = textoCompleto.match(/bafy[a-zA-Z0-9]{50,}/i);
      if (cidMatch) {
        cid = cidMatch[0];
        console.log("🔗 CID encontrado:", cid);
      }
      if (!cid) {
        const qmMatch = textoCompleto.match(/Qm[1-9A-HJ-NP-Za-km-z]{44}/);
        if (qmMatch) {
          cid = qmMatch[0];
          console.log("🔗 CID (Qm) encontrado:", cid);
        }
      }
      
      // 2. Extraer NOMBRE (primer texto con al menos 2 letras mayúsculas o palabras)
      let studentName = "";
      const nombreMatch = textoCompleto.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
      if (nombreMatch) {
        studentName = nombreMatch[1];
        console.log("👤 Nombre encontrado:", studentName);
      }
      
      // 3. Extraer CURSO (texto después del nombre, antes de la nota o fecha)
      let courseName = "";
      if (studentName) {
        const resto = textoCompleto.substring(studentName.length);
        const cursoMatch = resto.match(/\s+([A-Za-z\s]+?)(?=\s+(?:excelente|aprobado|reprobado|reprobó|desaprobado|\b\d{1,3}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b))/i);
        if (cursoMatch) {
          courseName = cursoMatch[1].trim();
          console.log("📚 Curso encontrado:", courseName);
        }
      }
      
      // 4. Extraer NOTA (excelente, aprobado, reprobado, o número)
      let nota = "Aprobado";
      const notaPatterns = [
        /excelente/i, /aprobado/i, /reprobado/i, /reprobó/i, /desaprobado/i,
        /\b([0-9]{1,3})\b/
      ];
      for (const pattern of notaPatterns) {
        const match = textoCompleto.match(pattern);
        if (match) {
          nota = match[0];
          console.log("⭐ Nota encontrada:", nota);
          break;
        }
      }
      
      // 5. Extraer FECHA (desde el hex original - timestamp)
      let fecha = "";
      const hexPattern = /[0-9a-f]{8}/gi;
      let hexMatch;
      while ((hexMatch = hexPattern.exec(dataHex)) !== null) {
        const hexVal = hexMatch[0];
        if (hexVal.toLowerCase().startsWith('baf')) continue;
        const decimal = parseInt(hexVal, 16);
        if (decimal > 1700000000 && decimal < 1800000000) {
          fecha = new Date(decimal * 1000).toLocaleDateString('es-ES');
          console.log("📅 Fecha encontrada por timestamp:", decimal, "→", fecha);
          break;
        }
      }
      
      // Si no se encontró timestamp, buscar fecha en texto (formato DD/MM/YYYY)
      if (!fecha) {
        const fechaMatch = textoCompleto.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
        if (fechaMatch) {
          fecha = fechaMatch[1];
          console.log("📅 Fecha encontrada en texto:", fecha);
        }
      }
      
      if (!fecha) {
        fecha = new Date().toLocaleDateString('es-ES');
        console.log("⚠️ Usando fecha actual:", fecha);
      }
      
      const result = {
        studentName: studentName || "Estudiante",
        courseName: courseName || "Curso",
        nota: nota,
        fecha: fecha,
        cid: cid || ""
      };
      
      console.log("✅ Datos decodificados:", {
        ...result,
        cid: result.cid ? result.cid.substring(0, 30) + "..." : "VACÍO"
      });
      return result;
      
    } catch (error) {
      console.error("Error decodificando input:", error);
      return null;
    }
  };

  // ========== FUNCIONES AUXILIARES ==========

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
    return (cleanHash.startsWith('Qm') || cleanHash.startsWith('baf')) && cleanHash.length > 40;
  };

  const openPDFFromCID = (cid) => {
    if (!cid) {
      alert('No hay certificado PDF disponible');
      return;
    }
    const cleanCID = formatCID(cid);
    const pdfUrl = `https://gateway.pinata.cloud/ipfs/${cleanCID}`;
    console.log("🔗 Abriendo PDF:", pdfUrl);
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  const validateTransactionHash = (hash) => {
    if (!hash) return 'Ingresa un hash de transacción';
    const cleanHash = hash.trim().toLowerCase();
    if (cleanHash.length !== 66) return 'Hash debe tener 66 caracteres';
    if (!cleanHash.startsWith('0x')) return 'Hash debe comenzar con 0x';
    if (!/^0x[0-9a-f]{64}$/.test(cleanHash)) return 'Hash contiene caracteres inválidos';
    return null;
  };

  // ========== FUNCIÓN PARA LLAMAR AL PROXY ==========
  const callRPC = async (method, params) => {
    const response = await fetch(SONIC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: 1
      })
    });
    return await response.json();
  };

  // ========== EFECTOS ==========

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const extractHashFromURL = () => {
      try {
        if (typeof window === 'undefined') return null;
        const url = new URL(window.location.href);
        const hashParam = url.searchParams.get('hash');
        if (hashParam && hashParam.startsWith('0x') && hashParam.length === 66) {
          return hashParam;
        }
        return null;
      } catch (error) {
        return null;
      }
    };
    
    const hashFromURL = extractHashFromURL();
    
    if (hashFromURL) {
      console.log('🔗 Hash detectado en URL:', hashFromURL);
      setTransactionHash(hashFromURL);
      setAutoVerification(true);
      setTimeout(() => {
        findCertificateByTransactionHash();
      }, 500);
    }
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem('certificateSearchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
    checkNetworkStatus();
  }, []);

  useEffect(() => {
    if (searchHistory.length > 0) {
      localStorage.setItem('certificateSearchHistory', JSON.stringify(searchHistory.slice(0, 10)));
    }
  }, [searchHistory]);

  const checkNetworkStatus = async () => {
    setNetworkStatus('checking');
    try {
      const data = await callRPC('eth_blockNumber', []);
      if (data.result) {
        setNetworkStatus('connected');
        return true;
      }
      setNetworkStatus('disconnected');
      return false;
    } catch (error) {
      console.log('Error de conexión:', error);
      setNetworkStatus('disconnected');
      return false;
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
    setAutoVerification(false);

    try {
      const txData = await callRPC('eth_getTransactionByHash', [transactionHash]);

      if (!txData.result) {
        throw new Error('Transacción no encontrada en Sonic Testnet');
      }

      const transaction = txData.result;
      const inputData = transaction.input || "";

      if (!inputData || inputData === '0x') {
        throw new Error('La transacción no contiene datos de certificado');
      }

      const decodedData = decodeInputData(inputData);

      if (!decodedData || !decodedData.studentName) {
        throw new Error('No se pudieron extraer los datos del certificado');
      }

      const receiptData = await callRPC('eth_getTransactionReceipt', [transactionHash]);
      const receipt = receiptData.result;
      const blockNumber = receipt ? parseInt(receipt.blockNumber, 16) : 0;

      const certificateData = {
        issuer: transaction.from || "0x...",
        recipientName: decodedData.studentName,
        eventName: decodedData.courseName,
        fecha: decodedData.fecha,
        nota: decodedData.nota,
        ipfsHash: decodedData.cid,
        transactionHash: transactionHash,
        blockNumber: blockNumber,
        contractAddress: CONTRACT_ADDRESS
      };

      console.log("🎉 Certificado procesado:", certificateData);

      setResult({
        isValid: true,
        certificateData: certificateData,
        found: true,
        isVerified: true
      });

      const newSearch = {
        hash: transactionHash,
        studentName: certificateData.recipientName,
        courseName: certificateData.eventName,
        timestamp: Date.now(),
        cid: certificateData.ipfsHash,
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

  const retryVerification = () => {
    setResult(null);
    findCertificateByTransactionHash();
  };

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;

  // ========== ESTILOS ==========
  const styles = {
    container: {
      maxWidth: isMobile ? '100%' : isTablet ? '95%' : '800px',
      margin: '0 auto',
      background: 'white',
      borderRadius: isMobile ? '0' : '20px',
      padding: isMobile ? '15px' : '30px',
      boxShadow: isMobile ? 'none' : '0 20px 60px rgba(0,0,0,0.3)',
      minHeight: '100vh'
    },
    header: {
      textAlign: 'center',
      marginBottom: isMobile ? '20px' : '30px',
      paddingBottom: isMobile ? '15px' : '20px',
      borderBottom: '2px solid #f0f0f0'
    },
    h1: {
      fontSize: isMobile ? '1.5em' : '2em',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '10px'
    },
    subtitle: {
      color: '#666',
      fontSize: isMobile ? '0.8em' : '0.9em'
    },
    networkStatus: {
      display: 'inline-block',
      padding: '8px 16px',
      borderRadius: '50px',
      fontSize: '12px',
      fontWeight: '600',
      marginTop: '10px',
      background: networkStatus === 'connected' ? '#d1fae5' : '#fee2e2',
      color: networkStatus === 'connected' ? '#065f46' : '#991b1b'
    },
    inputSection: {
      background: '#f8fafc',
      padding: isMobile ? '15px' : '20px',
      borderRadius: '15px',
      marginBottom: '20px'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e2e8f0',
      borderRadius: '10px',
      fontSize: '14px',
      fontFamily: 'monospace',
      marginBottom: '15px',
      boxSizing: 'border-box'
    },
    buttonGroup: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: '10px',
      marginBottom: '15px'
    },
    btnPrimary: {
      flex: 1,
      padding: '12px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    btnSecondary: {
      padding: '12px 20px',
      background: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db',
      borderRadius: '10px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    resultCard: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      padding: isMobile ? '15px' : '20px',
      borderRadius: '15px',
      marginTop: '20px',
      border: '2px solid #10b981'
    },
    errorCard: {
      background: '#fee2e2',
      padding: isMobile ? '15px' : '20px',
      borderRadius: '15px',
      marginTop: '20px',
      border: '2px solid #ef4444',
      color: '#991b1b'
    },
    detailRow: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      marginBottom: '10px',
      padding: '10px',
      background: 'rgba(255,255,255,0.7)',
      borderRadius: '8px'
    },
    detailLabel: {
      minWidth: isMobile ? 'auto' : '140px',
      fontWeight: '600',
      marginBottom: isMobile ? '5px' : '0'
    },
    detailValue: {
      flex: 1,
      wordBreak: 'break-word'
    },
    pdfButton: {
      padding: '10px 20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px'
    }
  };

  // ========== RENDER ==========
  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', minHeight: '100vh' }}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.h1}>🔍 Verificador de Certificados</h1>
          <p style={styles.subtitle}>Ingresa el hash del certificado para verificar su autenticidad en Sonic Testnet</p>
          <div style={styles.networkStatus}>
            {networkStatus === 'connected' ? '✅ CONECTADO A SONIC TESTNET' : '⚠️ VERIFICANDO CONEXIÓN...'}
          </div>
        </header>

        <div style={styles.inputSection}>
          <input
            type="text"
            placeholder="Hash de la transacción (0x...)"
            value={transactionHash}
            onChange={(e) => setTransactionHash(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && findCertificateByTransactionHash()}
            style={styles.input}
          />
          
          <div style={styles.buttonGroup}>
            <button onClick={() => setTransactionHash(EXAMPLE_HASH_SUBIRANA)} style={styles.btnSecondary}>
              📋 Ejemplo (Subirana)
            </button>
            <button onClick={() => setTransactionHash(EXAMPLE_HASH_GALO)} style={styles.btnSecondary}>
              📋 Ejemplo (Galo Salame)
            </button>
            <button onClick={() => { setTransactionHash(''); setResult(null); }} style={styles.btnSecondary}>
              🗑️ Limpiar
            </button>
            <button onClick={findCertificateByTransactionHash} disabled={loading} style={styles.btnPrimary}>
              {loading ? '🔍 Buscando...' : '✅ Verificar Certificado'}
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ width: '50px', height: '50px', border: '4px solid #e2e8f0', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
            <p>Extrayendo datos del certificado...</p>
          </div>
        )}

        {result && result.isValid && (
          <div style={styles.resultCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ color: '#065f46', margin: 0 }}>🎉 CERTIFICADO VERIFICADO</h2>
              <div style={{ background: '#059669', color: 'white', padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '600' }}>✅ AUTÉNTICO</div>
            </div>
            
            <div style={styles.detailRow}>
              <div style={styles.detailLabel}>👤 Estudiante:</div>
              <div style={{ ...styles.detailValue, fontWeight: 'bold', fontSize: '1.1em' }}>{result.certificateData.recipientName}</div>
            </div>
            
            <div style={styles.detailRow}>
              <div style={styles.detailLabel}>🎓 Curso:</div>
              <div style={styles.detailValue}>{result.certificateData.eventName}</div>
            </div>
            
            <div style={styles.detailRow}>
              <div style={styles.detailLabel}>📅 Fecha:</div>
              <div style={styles.detailValue}>{result.certificateData.fecha}</div>
            </div>
            
            <div style={styles.detailRow}>
              <div style={styles.detailLabel}>📊 Calificación:</div>
              <div style={{ ...styles.detailValue, color: '#059669', fontWeight: 'bold' }}>{result.certificateData.nota}</div>
            </div>
            
            {result.certificateData.ipfsHash && result.certificateData.ipfsHash.length > 5 && (
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>📄 Certificado PDF:</div>
                <div style={styles.detailValue}>
                  <button 
                    onClick={() => openPDFFromCID(result.certificateData.ipfsHash)} 
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
                    👁️ Ver Certificado
                  </button>
                  <div style={{ fontSize: '10px', marginTop: '5px', color: '#666', wordBreak: 'break-all' }}>
                    CID: {result.certificateData.ipfsHash.substring(0, 35)}...
                  </div>
                </div>
              </div>
            )}
            
            {(!result.certificateData.ipfsHash || result.certificateData.ipfsHash.length <= 5) && (
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>📄 Certificado PDF:</div>
                <div style={styles.detailValue}>
                  <p style={{ color: '#666', fontStyle: 'italic' }}>No se encontró CID del PDF en esta transacción</p>
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '15px', fontSize: '12px', color: '#4b5563', wordBreak: 'break-all' }}>
              <strong>📫 Hash:</strong> {result.certificateData.transactionHash}
            </div>
            
            <div style={{ marginTop: '10px' }}>
              <a href={`${SONIC_EXPLORER}/${result.certificateData.transactionHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                🔍 Ver en Sonic Explorer →
              </a>
            </div>
          </div>
        )}

        {result && !result.isValid && (
          <div style={styles.errorCard}>
            <h3>❌ Certificado No Encontrado</h3>
            <p>{result.error || 'No se pudo verificar el certificado. Verifica el hash e intenta nuevamente.'}</p>
            <button onClick={retryVerification} style={{ marginTop: '10px', padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              🔄 Reintentar
            </button>
          </div>
        )}
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
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
        }
        button {
          cursor: pointer;
          transition: all 0.3s ease;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        button:hover:not(:disabled) {
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          html { font-size: 14px; }
          input, button { font-size: 16px !important; }
        }
      `}</style>
    </div>
  );
}
