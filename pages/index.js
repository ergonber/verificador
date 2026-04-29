// pages/index.js - VERSIÓN DEFINITIVA (decodificación correcta por ABI)
import { useState, useEffect } from 'react';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [searchHistory, setSearchHistory] = useState([]);
  const [autoVerification, setAutoVerification] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  const CONTRACT_ADDRESS = "0x0196fb4ac891F47CC194AB5D6b0419C8e709085f";
  const SONIC_RPC_URL = "/api/rpc";
  const SONIC_EXPLORER = "https://testnet.soniclabs.com/tx";

  const EXAMPLE_HASH_SUBIRANA = "0x6285091c55f485612d03cfef254f14120749cb6d2747664a411063bf7207adf4";
  const EXAMPLE_HASH_GALO = "0x01e8bc7713de1324405ec5c5b964486ce1731a6006b88284c2834df21413671f";

  // ========== DECODIFICACIÓN CORRECTA POR ABI ==========
  const decodeABIInput = (inputData) => {
    if (!inputData || inputData === '0x') return null;
    
    try {
      // Remover el selector de función (4 bytes = 8 caracteres hex)
      let data = inputData.slice(10);
      console.log("📝 DataHex:", data);
      
      // Leer los 4 offsets (cada uno 32 bytes = 64 caracteres hex)
      const offset1 = parseInt(data.substring(0, 64), 16);
      const offset2 = parseInt(data.substring(64, 128), 16);
      const offset3 = parseInt(data.substring(128, 192), 16);
      const offset4 = parseInt(data.substring(192, 256), 16);
      const offset5 = parseInt(data.substring(256, 320), 16);
      
      console.log("📍 Offsets:", { offset1, offset2, offset3, offset4, offset5 });
      
      // Función para leer un string en una posición (offset en bytes, multiplicar por 2 para chars)
      const readString = (offset) => {
        if (offset === 0) return "";
        const startPos = offset * 2;
        // Leer longitud del string (32 bytes = 64 chars)
        const lengthHex = data.substring(startPos, startPos + 64);
        const length = parseInt(lengthHex, 16);
        if (length === 0 || length > 200) return "";
        // Leer el string (cada char = 2 bytes hex)
        const stringStart = startPos + 64;
        const stringHex = data.substring(stringStart, stringStart + (length * 2));
        // Convertir hex a texto
        let result = "";
        for (let i = 0; i < stringHex.length; i += 2) {
          const byte = stringHex.substr(i, 2);
          const code = parseInt(byte, 16);
          if (code === 0) break;
          result += String.fromCharCode(code);
        }
        return result;
      };
      
      const studentName = readString(offset1);
      const courseName = readString(offset2);
      const nota = readString(offset3);
      const timestamp = parseInt(data.substring(offset4 * 2, offset4 * 2 + 64), 16);
      const cid = readString(offset5);
      
      // Convertir timestamp a fecha
      let fecha = "";
      if (timestamp > 1700000000 && timestamp < 1800000000) {
        fecha = new Date(timestamp * 1000).toLocaleDateString('es-ES');
      } else {
        fecha = new Date().toLocaleDateString('es-ES');
      }
      
      console.log("✅ Datos decodificados por ABI:", {
        studentName, courseName, nota, fecha, cid
      });
      
      return { studentName, courseName, nota, fecha, cid };
      
    } catch (error) {
      console.error("Error decodificando ABI:", error);
      return null;
    }
  };

  const formatCID = (cid) => {
    if (!cid) return '';
    return cid.replace('ipfs://', '').replace('/ipfs/', '').replace('ipfs:', '').trim();
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

  const callRPC = async (method, params) => {
    const response = await fetch(SONIC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
    });
    return await response.json();
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const hashFromURL = () => {
      try {
        const url = new URL(window.location.href);
        const hashParam = url.searchParams.get('hash');
        if (hashParam && hashParam.startsWith('0x') && hashParam.length === 66) return hashParam;
        return null;
      } catch { return null; }
    };
    const hash = hashFromURL();
    if (hash) {
      setTransactionHash(hash);
      setAutoVerification(true);
      setTimeout(() => findCertificateByTransactionHash(), 500);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('certificateSearchHistory');
    if (saved) try { setSearchHistory(JSON.parse(saved)); } catch(e) {}
    checkNetworkStatus();
  }, []);

  useEffect(() => {
    if (searchHistory.length) {
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
    } catch { setNetworkStatus('disconnected'); return false; }
  };

  const findCertificateByTransactionHash = async () => {
    const error = validateTransactionHash(transactionHash);
    if (error) { alert(error); return; }

    setLoading(true);
    setResult(null);
    setAutoVerification(false);

    try {
      const txData = await callRPC('eth_getTransactionByHash', [transactionHash]);
      if (!txData.result) throw new Error('Transacción no encontrada');

      const transaction = txData.result;
      const inputData = transaction.input || "";
      if (!inputData || inputData === '0x') throw new Error('No hay datos de certificado');

      const decoded = decodeABIInput(inputData);
      if (!decoded || !decoded.studentName) throw new Error('No se pudieron extraer los datos');

      const receiptData = await callRPC('eth_getTransactionReceipt', [transactionHash]);
      const blockNumber = receiptData.result ? parseInt(receiptData.result.blockNumber, 16) : 0;

      const certificateData = {
        issuer: transaction.from || "0x...",
        recipientName: decoded.studentName,
        eventName: decoded.courseName,
        fecha: decoded.fecha,
        nota: decoded.nota,
        ipfsHash: decoded.cid,
        transactionHash: transactionHash,
        blockNumber: blockNumber,
        contractAddress: CONTRACT_ADDRESS
      };

      setResult({ isValid: true, certificateData, found: true, isVerified: true });

      const newSearch = {
        hash: transactionHash,
        studentName: certificateData.recipientName,
        courseName: certificateData.eventName,
        timestamp: Date.now(),
        cid: certificateData.ipfsHash,
        isValid: true
      };
      setSearchHistory(prev => [newSearch, ...prev.filter(item => item.hash !== transactionHash).slice(0, 9)]);

    } catch (err) {
      console.error(err);
      setResult({ isValid: false, error: err.message, found: false });
    }
    setLoading(false);
  };

  const retryVerification = () => { setResult(null); findCertificateByTransactionHash(); };

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;

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
    subtitle: { color: '#666', fontSize: isMobile ? '0.8em' : '0.9em' },
    networkStatus: {
      display: 'inline-block', padding: '8px 16px', borderRadius: '50px', fontSize: '12px',
      fontWeight: '600', marginTop: '10px',
      background: networkStatus === 'connected' ? '#d1fae5' : '#fee2e2',
      color: networkStatus === 'connected' ? '#065f46' : '#991b1b'
    },
    inputSection: {
      background: '#f8fafc', padding: isMobile ? '15px' : '20px', borderRadius: '15px', marginBottom: '20px'
    },
    input: {
      width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px',
      fontSize: '14px', fontFamily: 'monospace', marginBottom: '15px', boxSizing: 'border-box'
    },
    buttonGroup: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', marginBottom: '15px' },
    btnPrimary: {
      flex: 1, padding: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer'
    },
    btnSecondary: {
      padding: '12px 20px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
      borderRadius: '10px', fontWeight: '500', cursor: 'pointer'
    },
    resultCard: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      padding: isMobile ? '15px' : '20px', borderRadius: '15px', marginTop: '20px', border: '2px solid #10b981'
    },
    errorCard: {
      background: '#fee2e2', padding: isMobile ? '15px' : '20px', borderRadius: '15px',
      marginTop: '20px', border: '2px solid #ef4444', color: '#991b1b'
    },
    detailRow: {
      display: 'flex', flexDirection: isMobile ? 'column' : 'row', marginBottom: '10px',
      padding: '10px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px'
    },
    detailLabel: { minWidth: isMobile ? 'auto' : '140px', fontWeight: '600', marginBottom: isMobile ? '5px' : '0' },
    detailValue: { flex: 1, wordBreak: 'break-word' },
    pdfButton: {
      padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: '8px'
    }
  };

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
          <input type="text" placeholder="Hash de la transacción (0x...)" value={transactionHash}
            onChange={(e) => setTransactionHash(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && findCertificateByTransactionHash()}
            style={styles.input} />
          
          <div style={styles.buttonGroup}>
            <button onClick={() => setTransactionHash(EXAMPLE_HASH_SUBIRANA)} style={styles.btnSecondary}>📋 Ejemplo (Subirana)</button>
            <button onClick={() => setTransactionHash(EXAMPLE_HASH_GALO)} style={styles.btnSecondary}>📋 Ejemplo (Galo Salame)</button>
            <button onClick={() => { setTransactionHash(''); setResult(null); }} style={styles.btnSecondary}>🗑️ Limpiar</button>
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

        {result && result.isValid && result.certificateData && (
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
                  <button onClick={() => openPDFFromCID(result.certificateData.ipfsHash)} style={styles.pdfButton}>
                    👁️ Ver Certificado
                  </button>
                  <div style={{ fontSize: '10px', marginTop: '5px', color: '#666', wordBreak: 'break-all' }}>
                    CID: {result.certificateData.ipfsHash.substring(0, 35)}...
                  </div>
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
            <p>{result.error || 'No se pudo verificar el certificado.'}</p>
            <button onClick={retryVerification} style={{ marginTop: '10px', padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              🔄 Reintentar
            </button>
          </div>
        )}
      </div>
      
      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        input:focus { outline: none; border-color: #667eea; }
        button { cursor: pointer; transition: all 0.3s ease; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        button:hover:not(:disabled) { transform: translateY(-2px); }
        @media (max-width: 768px) { html { font-size: 14px; } input, button { font-size: 16px !important; } }
      `}</style>
    </div>
  );
}
