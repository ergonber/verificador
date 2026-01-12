// pages/index.js
import { useState, useEffect } from 'react';
import Web3 from 'web3';
import '../styles/globals.css';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [searchHistory, setSearchHistory] = useState([]);
  const [pdfAvailable, setPdfAvailable] = useState(null);

  // CONFIGURACIÓN
  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  
  // TRANSACTION HASH de ejemplo
  const EXAMPLE_TRANSACTION_HASH = "0x8e20e6d10a35ad6070d5390bb65864ea79de1371c8f067820256f86d0e873dfc";

  const CONTRACT_ABI = [
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_certificateId",
          "type": "bytes32"
        }
      ],
      "name": "getCertificate",
      "outputs": [
        {
          "internalType": "address",
          "name": "issuer",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "recipientName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "eventName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "arweaveHash",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "issueDate",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_certificateId",
          "type": "bytes32"
        }
      ],
      "name": "verifyCertificate",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  // Función para formatear CID
  const formatCID = (cid) => {
    if (!cid) return '';
    
    const cleanCID = cid
      .replace('ipfs://', '')
      .replace('/ipfs/', '')
      .replace('ipfs:', '')
      .trim();
    
    return cleanCID;
  };

  // Función para verificar si es un CID válido
  const isLikelyCID = (hash) => {
    if (!hash) return false;
    
    const cleanHash = formatCID(hash);
    
    const cidPatterns = [
      /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/,
      /^bafy[a-zA-Z0-9]{50,}$/,
      /^bafk[a-zA-Z0-9]{50,}$/,
      /^[A-Za-z0-9]{46,59}$/
    ];
    
    return cidPatterns.some(pattern => pattern.test(cleanHash));
  };

  // Función para abrir PDF desde Pinata
  const openPDFFromCID = async (cid) => {
    if (!cid) {
      alert('No hay certificado PDF disponible');
      return;
    }
    
    const cleanCID = formatCID(cid);
    
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${cleanCID}`,
      `https://ipfs.io/ipfs/${cleanCID}`,
      `https://cloudflare-ipfs.com/ipfs/${cleanCID}`
    ];
    
    const pdfUrl = gateways[0];
    console.log("🔗 Abriendo PDF desde:", pdfUrl);
    
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  // Función para verificar disponibilidad del PDF
  const checkPDFAvailability = async (cid) => {
    try {
      const cleanCID = formatCID(cid);
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cleanCID}`, {
        method: 'HEAD'
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error verificando PDF:', error);
      return false;
    }
  };

  // Validación de hash de transacción
  const validateTransactionHash = (hash) => {
    if (!hash) return 'Ingresa un hash de transacción';
    
    const cleanHash = hash.trim();
    
    if (cleanHash.length !== 66) {
      return 'El hash debe tener 66 caracteres (0x + 64 caracteres hex)';
    }
    
    if (!cleanHash.startsWith('0x')) {
      return 'El hash debe comenzar con 0x';
    }
    
    if (!/^0x[0-9a-fA-F]{64}$/.test(cleanHash)) {
      return 'El hash contiene caracteres inválidos';
    }
    
    return null;
  };

  useEffect(() => {
    console.log("🚀 Verificador de Certificados listo");
    console.log("🔧 Configuración:");
    console.log("   RPC:", SONIC_RPC_URL);
    console.log("   Contrato:", CONTRACT_ADDRESS);
    
    // Cargar historial desde localStorage
    const savedHistory = localStorage.getItem('certificateSearchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
    
    checkNetworkStatus();
  }, []);

  // Guardar historial en localStorage
  useEffect(() => {
    if (searchHistory.length > 0) {
      localStorage.setItem('certificateSearchHistory', JSON.stringify(searchHistory));
    }
  }, [searchHistory]);

  // Verificar disponibilidad de PDF cuando se obtienen resultados
  useEffect(() => {
    const verifyPDF = async () => {
      if (result?.certificateData?.arweaveHash && isLikelyCID(result.certificateData.arweaveHash)) {
        setPdfAvailable('checking');
        const available = await checkPDFAvailability(result.certificateData.arweaveHash);
        setPdfAvailable(available ? 'available' : 'unavailable');
      } else {
        setPdfAvailable(null);
      }
    };
    
    verifyPDF();
  }, [result]);

  const checkNetworkStatus = async () => {
    setNetworkStatus('checking');

    try {
      const web3 = new Web3(SONIC_RPC_URL);
      const blockNumber = await web3.eth.getBlockNumber();
      console.log(`✅ Conectado a Sonic Testnet - Block: ${blockNumber}`);
      setNetworkStatus('connected');
    } catch (error) {
      console.log(`❌ Error de conexión: ${error.message}`);
      setNetworkStatus('disconnected');
    }
  };

  const convertBigIntToNumber = (bigIntValue) => {
    if (typeof bigIntValue === 'bigint') {
      return Number(bigIntValue);
    }
    return Number(bigIntValue);
  };

  const findCertificateByTransactionHash = async (hashToSearch = transactionHash) => {
    // Validar input
    const validationError = validateTransactionHash(hashToSearch);
    if (validationError) {
      alert(validationError);
      return;
    }

    console.log("🚀 BUSCANDO CERTIFICADO POR TRANSACTION HASH...");
    console.log(`🔍 Transaction Hash: ${hashToSearch}`);
    
    setLoading(true);
    setResult(null);
    setPdfAvailable(null);

    try {
      if (networkStatus === 'disconnected') {
        throw new Error("No hay conexión a Sonic Testnet");
      }

      const web3 = new Web3(SONIC_RPC_URL);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

      console.log("📄 Obteniendo receipt de la transacción...");
      
      const transactionReceipt = await web3.eth.getTransactionReceipt(hashToSearch);
      console.log("📋 Transaction receipt:", transactionReceipt);

      if (!transactionReceipt) {
        throw new Error("Transacción no encontrada");
      }

      if (!transactionReceipt.logs || transactionReceipt.logs.length === 0) {
        throw new Error("No se encontraron logs en la transacción");
      }

      let certificateId = null;
      
      console.log("📋 Logs encontrados:", transactionReceipt.logs.length);
      
      for (let i = 0; i < transactionReceipt.logs.length; i++) {
        const log = transactionReceipt.logs[i];
        console.log(`🔍 Log ${i}:`, log);
        
        if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
          console.log("🎯 Log del contrato de certificados encontrado");
          
          if (log.topics && log.topics.length > 1) {
            certificateId = log.topics[1];
            console.log("🎯 CertificateId encontrado en topics:", certificateId);
            break;
          }
        }
      }

      if (!certificateId) {
        throw new Error("No se pudo encontrar el certificateId en los logs de la transacción");
      }

      console.log("🔍 Verificando certificado con ID:", certificateId);
      
      const isValid = await contract.methods.verifyCertificate(certificateId).call();
      console.log(`✅ Certificado válido: ${isValid}`);

      if (!isValid) {
        throw new Error("El certificado no es válido o ha sido revocado");
      }

      console.log("📋 Obteniendo datos del certificado...");
      
      const rawData = await contract.methods.getCertificate(certificateId).call();
      console.log("📊 Datos obtenidos:", rawData);

      const certificateData = {
        issuer: rawData.issuer,
        recipientName: rawData.recipientName,
        eventName: rawData.eventName,
        arweaveHash: rawData.arweaveHash,
        issueDate: convertBigIntToNumber(rawData.issueDate),
        isActive: rawData.isActive,
        certificateId: certificateId,
        transactionHash: hashToSearch,
        blockNumber: convertBigIntToNumber(transactionReceipt.blockNumber)
      };

      const resultData = {
        isValid: true,
        certificateData: certificateData,
        found: true
      };

      setResult(resultData);

      // Guardar en historial
      const newSearch = {
        hash: hashToSearch,
        studentName: certificateData.recipientName,
        courseName: certificateData.eventName,
        timestamp: Date.now(),
        cid: certificateData.arweaveHash,
        isValid: true
      };
      
      setSearchHistory(prev => {
        const filtered = prev.filter(item => item.hash !== hashToSearch);
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

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container">
      <header>
        <h1>🔍 Verificador de Certificados</h1>
        <p className="subtitle">Verifica certificados por <strong>Transaction Hash</strong> en SONIC TESTNET</p>
        
        <div className={`network-status ${networkStatus}`}>
          {networkStatus === 'checking' && (
            <div className="status-checking">
              <span className="status-dot checking"></span>
              Conectando a Sonic Testnet...
            </div>
          )}
          {networkStatus === 'connected' && (
            <div className="status-connected">
              <span className="status-dot connected"></span>
              ✅ CONECTADO A SONIC TESTNET
            </div>
          )}
          {networkStatus === 'disconnected' && (
            <div className="status-disconnected">
              <span className="status-dot disconnected"></span>
              ❌ ERROR DE CONEXIÓN
              <button onClick={checkNetworkStatus} className="retry-btn small">
                Reintentar
              </button>
            </div>
          )}
        </div>
      </header>

      <main>
        <div className="input-section">
          <div className="input-group">
            <label htmlFor="transactionHash">Hash de la Transacción:</label>
            <input
              id="transactionHash"
              type="text"
              placeholder="Ingresa el hash de la transacción (0x...)"
              value={transactionHash}
              onChange={(e) => setTransactionHash(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && findCertificateByTransactionHash()}
            />
            <div className="input-buttons">
              <button 
                onClick={() => findCertificateByTransactionHash()}
                disabled={loading || networkStatus !== 'connected'}
                className="verify-btn"
              >
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Buscando...
                  </>
                ) : '✅ Buscar Certificado'}
              </button>
              <button 
                onClick={useExampleTransaction}
                disabled={networkStatus !== 'connected'}
                className="example-btn"
              >
                Usar Ejemplo
              </button>
            </div>
          </div>

          <div className="example-hash">
            <p><strong>💡 Ejemplo para probar:</strong></p>
            <code className="hash-example">{EXAMPLE_TRANSACTION_HASH}</code>
            <p><small>Transacción de Carola España - blockcgate</small></p>
          </div>
        </div>

        {searchHistory.length > 0 && (
          <div className="search-history">
            <div className="history-header">
              <h3>📚 Historial de Búsquedas</h3>
              <button onClick={clearHistory} className="clear-history-btn">
                Limpiar
              </button>
            </div>
            <div className="history-list">
              {searchHistory.map((item, index) => (
                <div 
                  key={index} 
                  className={`history-item ${item.isValid ? 'valid' : 'invalid'}`}
                  onClick={() => {
                    setTransactionHash(item.hash);
                    findCertificateByTransactionHash(item.hash);
                  }}
                >
                  <div className="history-content">
                    <div className="history-main">
                      <strong>{item.studentName || 'Sin nombre'}</strong>
                      <span className="history-course">{item.courseName || 'Sin curso'}</span>
                    </div>
                    <div className="history-meta">
                      <span className="history-time">{formatDate(item.timestamp)}</span>
                      <span className="history-hash">
                        {item.hash.substring(0, 8)}...{item.hash.substring(58)}
                      </span>
                    </div>
                  </div>
                  <div className="history-status">
                    {item.isValid ? '✅' : '❌'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="loading" style={{display: 'block'}}>
            <div className="spinner"></div>
            <p>Buscando certificado en blockchain...</p>
          </div>
        )}

        {result && result.found && result.isValid ? (
          <div className="result valid" style={{display: 'block'}}>
            <div className="success-header">
              <h2>🎉 CERTIFICADO ENCONTRADO EXITOSAMENTE</h2>
              <p>El certificado existe y es válido en Sonic Testnet</p>
            </div>
            
            <div className="certificate-card">
              <div className="certificate-header">
                <h3>📜 Certificado Digital</h3>
                <div className="status-badge valid">✅ VÁLIDO</div>
              </div>
              
              <div className="certificate-details">
                <div className="detail-row">
                  <strong>👤 Estudiante:</strong>
                  <span>{result.certificateData.recipientName}</span>
                </div>
                
                <div className="detail-row">
                  <strong>🎓 Curso/Evento:</strong>
                  <span>{result.certificateData.eventName}</span>
                </div>
                
                <div className="detail-row">
                  <strong>📅 Fecha de Emisión:</strong>
                  <span>{new Date(result.certificateData.issueDate * 1000).toLocaleDateString('es-ES')}</span>
                </div>
                
                <div className="detail-row">
                  <strong>✅ Estado:</strong>
                  <span className="status-active">ACTIVO</span>
                </div>
                
                <div className="detail-row">
                  <strong>🏢 Emitido por:</strong>
                  <span>{result.certificateData.issuer}</span>
                </div>
                
                <div className="detail-row">
                  <strong>🆔 ID del Certificado:</strong>
                  <code className="certificate-id">{result.certificateData.certificateId}</code>
                </div>

                <div className="detail-row">
                  <strong>📫 Hash de Transacción:</strong>
                  <code className="transaction-hash">{result.certificateData.transactionHash}</code>
                </div>

                <div className="detail-row">
                  <strong>🔢 Block Number:</strong>
                  <span>{result.certificateData.blockNumber}</span>
                </div>

                {/* SECCIÓN PDF MEJORADA */}
                <div className="detail-row">
                  <strong>📄 Certificado PDF:</strong>
                  <div className="pdf-section">
                    {result.certificateData.arweaveHash ? (
                      isLikelyCID(result.certificateData.arweaveHash) ? (
                        <div className="pdf-available">
                          <button 
                            onClick={() => openPDFFromCID(result.certificateData.arweaveHash)}
                            className="pdf-view-btn"
                            disabled={pdfAvailable === 'checking'}
                          >
                            {pdfAvailable === 'checking' ? (
                              <>
                                <span className="spinner-small"></span>
                                Verificando...
                              </>
                            ) : (
                              <>
                                <span className="pdf-icon">📥</span>
                                Ver Certificado PDF
                                {pdfAvailable === 'available' && (
                                  <span className="pdf-badge">✓ DISPONIBLE</span>
                                )}
                                {pdfAvailable === 'unavailable' && (
                                  <span className="pdf-badge unavailable">✗ NO DISPONIBLE</span>
                                )}
                              </>
                            )}
                          </button>
                          <div className="cid-info">
                            <small>
                              CID: {formatCID(result.certificateData.arweaveHash).substring(0, 20)}...
                              {formatCID(result.certificateData.arweaveHash).substring(formatCID(result.certificateData.arweaveHash).length - 10)}
                            </small>
                            <br />
                            <small className="storage-info">Almacenado en Pinata IPFS</small>
                          </div>
                        </div>
                      ) : (
                        <div className="pdf-unavailable">
                          <span className="pdf-icon">❓</span>
                          <div>
                            <span>Hash no es un CID válido</span>
                            <small>Valor almacenado: {result.certificateData.arweaveHash}</small>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="pdf-unavailable">
                        <span className="pdf-icon">❌</span>
                        <span>No hay PDF asociado</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="blockchain-proof">
                <div className="proof-header">
                  <strong>🔗 Verificado en Blockchain</strong>
                </div>
                <div className="proof-details">
                  <p><strong>Red:</strong> Sonic Testnet (ChainID: 14601)</p>
                  <p><strong>Contrato:</strong> {CONTRACT_ADDRESS}</p>
                  <p><strong>RPC:</strong> {SONIC_RPC_URL}</p>
                  <p>
                    <strong>Explorer:</strong>{' '}
                    <a 
                      href={`https://testnet.soniclabs.com/tx/${result.certificateData.transactionHash}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="explorer-link"
                    >
                      Ver transacción en Sonic Explorer
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : result && result.error ? (
          <div className="result invalid" style={{display: 'block'}}>
            <div className="error-header">
              <h2>❌ ERROR EN LA BÚSQUEDA</h2>
              <p>{result.error}</p>
            </div>
            
            <div className="error-details">
              <div className="help-text">
                <p><strong>Información para debugging:</strong></p>
                <ul>
                  <li><strong>Transaction Hash probado:</strong> {transactionHash}</li>
                  <li><strong>Contrato:</strong> {CONTRACT_ADDRESS}</li>
                  <li><strong>RPC:</strong> {SONIC_RPC_URL}</li>
                  <li><strong>Estado de red:</strong> {networkStatus}</li>
                </ul>
              </div>
              
              <button onClick={retryVerification} className="retry-btn">
                🔄 Reintentar Búsqueda
              </button>
            </div>
          </div>
        ) : null}

        <div className="system-info">
          <h3>🔧 Información del Sistema</h3>
          <div className="info-grid">
            <div className="info-item">
              <strong>Red Blockchain:</strong> Sonic Testnet
            </div>
            <div className="info-item">
              <strong>ChainID:</strong> 14601
            </div>
            <div className="info-item">
              <strong>Contrato:</strong> 
              <code>{CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}</code>
            </div>
            <div className="info-item">
              <strong>RPC:</strong> 
              <code>{SONIC_RPC_URL}</code>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
