// pages/index.js
import { useState, useEffect } from 'react';
import Web3 from 'web3';
import '../styles/globals.css';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');

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

  // Función para abrir PDF desde Pinata
  const openPDFFromCID = (cid) => {
    if (!cid) {
      alert('No hay certificado PDF disponible');
      return;
    }
    
    // Limpiar el CID si tiene prefijo ipfs
    const cleanCID = cid.replace('ipfs://', '').replace('/ipfs/', '');
    
    // URL del gateway de Pinata
    const pdfUrl = `https://gateway.pinata.cloud/ipfs/${cleanCID}`;
    
    // Abrir en nueva pestaña
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  // Función para verificar si es un CID válido
  const isLikelyCID = (hash) => {
    if (!hash) return false;
    
    const cleanHash = hash.trim();
    return (
      cleanHash.startsWith('Qm') ||
      cleanHash.startsWith('bafy') ||
      cleanHash.includes('ipfs') ||
      cleanHash.length === 46 ||
      /^[A-Za-z0-9]{46,59}$/.test(cleanHash)
    );
  };

  useEffect(() => {
    console.log("🚀 Verificador de Certificados listo");
    console.log("🔧 Configuración:");
    console.log("   RPC:", SONIC_RPC_URL);
    console.log("   Contrato:", CONTRACT_ADDRESS);
    
    checkNetworkStatus();
  }, []);

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
    if (!hashToSearch.trim()) {
      alert("Por favor ingresa el hash de la transacción");
      return;
    }

    if (hashToSearch.length !== 66 || !hashToSearch.startsWith('0x')) {
      alert("El hash de transacción debe tener 66 caracteres y comenzar con '0x'");
      return;
    }

    console.log("🚀 BUSCANDO CERTIFICADO POR TRANSACTION HASH...");
    console.log(`🔍 Transaction Hash: ${hashToSearch}`);
    
    setLoading(true);
    setResult(null);

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

      setResult({
        isValid: true,
        certificateData: certificateData,
        found: true
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
            <button 
              onClick={() => findCertificateByTransactionHash()}
              disabled={loading || networkStatus !== 'connected'}
              className="verify-btn"
            >
              {loading ? '🔍 Buscando...' : '✅ Buscar Certificado'}
            </button>
          </div>

          <div className="example-hash">
            <p><strong>💡 Ejemplo para probar:</strong></p>
            <code>{EXAMPLE_TRANSACTION_HASH}</code>
            <p><small>Transacción de Carola España - blockcgate</small></p>
            <button 
              onClick={useExampleTransaction}
              disabled={networkStatus !== 'connected'}
              className="example-btn"
            >
              Usar este ejemplo
            </button>
          </div>
        </div>

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
                  <code className="certificate-id">{result.certificateData.transactionHash}</code>
                </div>

                <div className="detail-row">
                  <strong>🔢 Block Number:</strong>
                  <span>{result.certificateData.blockNumber}</span>
                </div>

                {/* NUEVA SECCIÓN: ENLACE AL PDF */}
                {result.certificateData.arweaveHash && isLikelyCID(result.certificateData.arweaveHash) && (
                  <div className="detail-row">
                    <strong>📄 Certificado PDF:</strong>
                    <div className="pdf-link-container">
                      <button 
                        onClick={() => openPDFFromCID(result.certificateData.arweaveHash)}
                        className="pdf-view-btn"
                      >
                        <span className="pdf-icon">📥</span>
                        Ver Certificado PDF
                        <span className="pdf-cid">
                          ({result.certificateData.arweaveHash.substring(0, 10)}...{result.certificateData.arweaveHash.substring(result.certificateData.arweaveHash.length - 10)})
                        </span>
                      </button>
                      <p className="pdf-info">
                        <small>CID: {result.certificateData.arweaveHash}</small>
                        <br />
                        <small>Almacenado en Pinata IPFS</small>
                      </p>
                    </div>
                  </div>
                )}
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
