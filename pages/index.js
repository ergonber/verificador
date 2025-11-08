import { useState, useEffect } from 'react';
import Web3 from 'web3';

export default function Home() {
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');

  // RPCs de Sonic Testnet
  const SONIC_RPC_URLS = [
    "https://sonic-testnet.drpc.org",
    "https://rpc-testnet.sonicscan.org", 
    "https://testnet.soniclabs.com",
    "https://rpc.soniclabs.com/testnet"
  ];

  const CONTRACT_ABI = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "certificateId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "issuer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "recipientName",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "eventName",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "arweaveHash",
          "type": "string"
        }
      ],
      "name": "CertificateIssued",
      "type": "event"
    }
  ];

  // Verificar estado de la red al cargar la página
  useEffect(() => {
    checkNetworkStatus();
  }, []);

  const checkNetworkStatus = async () => {
    setNetworkStatus('checking');
    
    for (const rpcUrl of SONIC_RPC_URLS) {
      try {
        const web3 = new Web3(rpcUrl);
        const blockNumber = await web3.eth.getBlockNumber();
        console.log(`✅ RPC funcionando: ${rpcUrl} - Block: ${blockNumber}`);
        setNetworkStatus('connected');
        return;
      } catch (error) {
        console.log(`❌ RPC falló: ${rpcUrl}`);
        continue;
      }
    }
    
    setNetworkStatus('disconnected');
  };

  const getWorkingRPC = async () => {
    for (const rpcUrl of SONIC_RPC_URLS) {
      try {
        const web3 = new Web3(rpcUrl);
        await web3.eth.getBlockNumber();
        return web3;
      } catch (error) {
        continue;
      }
    }
    throw new Error("No hay RPCs de Sonic Testnet disponibles");
  };

  const getCertificateFromTransaction = async (web3, transactionHash) => {
    try {
      console.log("🔍 Obteniendo transacción:", transactionHash);
      
      const receipt = await web3.eth.getTransactionReceipt(transactionHash);
      console.log("📄 Receipt:", receipt);
      
      if (!receipt || !receipt.logs) {
        throw new Error("Transacción no encontrada");
      }

      const contract = new web3.eth.Contract(CONTRACT_ABI);
      
      for (const log of receipt.logs) {
        try {
          const decodedLog = contract._decodeEventABI({
            name: 'CertificateIssued',
            type: 'event',
            inputs: CONTRACT_ABI[0].inputs
          }, log);
          
          if (decodedLog) {
            console.log("✅ Evento encontrado:", decodedLog);
            return {
              certificateId: decodedLog.returnValues.certificateId,
              recipientName: decodedLog.returnValues.recipientName,
              eventName: decodedLog.returnValues.eventName,
              issuer: decodedLog.returnValues.issuer,
              transactionHash: transactionHash,
              blockNumber: receipt.blockNumber
            };
          }
        } catch (error) {
          continue;
        }
      }
      
      throw new Error("No se encontró evento CertificateIssued");
      
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  };

  const verifyCertificate = async () => {
    if (!searchInput.trim()) {
      alert("Por favor ingresa el hash de la transacción");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      if (networkStatus === 'disconnected') {
        throw new Error("No hay conexión a Sonic Testnet. Intenta recargar la página.");
      }

      const web3 = await getWorkingRPC();
      const certificateData = await getCertificateFromTransaction(web3, searchInput);

      setResult({
        isValid: true,
        certificateData,
        found: true
      });

    } catch (error) {
      console.error("Error:", error);
      setResult({
        isValid: false,
        error: error.message,
        found: false
      });
    }

    setLoading(false);
  };

  const testExample = {
    type: "Hash de Transacción",
    value: "0xd3ed1584d1bf39c7f6e78d6d18b04c6b4b9fc510f6e58d3e918c56b3cf2da819",
    description: "Transacción de Jesus tincona - Crypto Cocha"
  };

  return (
    <div className="container">
      <header>
        <h1>🔍 Verificador de Certificados</h1>
        <p>Verifica certificados en <strong>SONIC TESTNET</strong></p>
        
        {/* Indicador de Estado de Red */}
        <div className={`network-status ${networkStatus}`}>
          {networkStatus === 'checking' && (
            <div className="status-checking">
              <span className="status-dot checking"></span>
              Verificando conexión a Sonic Testnet...
            </div>
          )}
          {networkStatus === 'connected' && (
            <div className="status-connected">
              <span className="status-dot connected"></span>
              ✅ Conectado a Sonic Testnet
            </div>
          )}
          {networkStatus === 'disconnected' && (
            <div className="status-disconnected">
              <span className="status-dot disconnected"></span>
              ❌ Desconectado de Sonic Testnet
              <button onClick={checkNetworkStatus} className="retry-btn">
                Reintentar Conexión
              </button>
            </div>
          )}
        </div>
      </header>

      <main>
        <div className="search-box">
          <input
            type="text"
            placeholder="Ingresa el hash de la transacción (0x...)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && verifyCertificate()}
          />
          <button 
            onClick={verifyCertificate} 
            disabled={loading || networkStatus !== 'connected'}
          >
            {loading ? '🔍 Verificando...' : 'Verificar Certificado'}
          </button>
        </div>

        {/* Ejemplo para probar */}
        <div className="examples">
          <h3>💡 Ejemplo para probar:</h3>
          <div className="example-card">
            <p><strong>{testExample.type}:</strong></p>
            <code>{testExample.value}</code>
            <p><small>{testExample.description}</small></p>
            <button 
              onClick={() => {
                setSearchInput(testExample.value);
                setTimeout(verifyCertificate, 100);
              }}
              className="example-btn"
              disabled={networkStatus !== 'connected'}
            >
              Probar esta transacción
            </button>
          </div>
        </div>

        {result && (
          <div className={`result ${result.isValid ? 'valid' : 'invalid'}`}>
            {result.error ? (
              <div>
                <h3>❌ Error</h3>
                <p>{result.error}</p>
                <div className="help-text">
                  <p><strong>Hash probado:</strong> {searchInput}</p>
                  <p><strong>Estado de red:</strong> {networkStatus}</p>
                </div>
              </div>
            ) : result.found && result.isValid ? (
              <div>
                <h3>✅ CERTIFICADO ENCONTRADO</h3>
                <div className="certificate-info">
                  <p><strong>👤 Estudiante:</strong> {result.certificateData.recipientName}</p>
                  <p><strong>🎓 Curso/Evento:</strong> {result.certificateData.eventName}</p>
                  <p><strong>🆔 ID del Certificado:</strong></p>
                  <code className="certificate-id">{result.certificateData.certificateId}</code>
                  <p><strong>🏢 Emitido por:</strong> {result.certificateData.issuer}</p>
                  <p><strong>📦 Hash de Transacción:</strong></p>
                  <code>{result.certificateData.transactionHash}</code>
                  <p><strong>🔗 Block Number:</strong> {result.certificateData.blockNumber}</p>
                  
                  <div className="blockchain-proof">
                    <p>✅ <strong>Verificado en Sonic Testnet</strong></p>
                    <small>Datos extraídos directamente de la blockchain</small>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3>❌ CERTIFICADO NO ENCONTRADO</h3>
                <p>No se encontró información del certificado en esta transacción.</p>
              </div>
            )}
          </div>
        )}

        {/* Información de la Red */}
        <div className="network-info">
          <h3>🌐 Información de la Red</h3>
          <div className="info-grid">
            <div className="info-item">
              <strong>Red:</strong> Sonic Testnet
            </div>
            <div className="info-item">
              <strong>ChainID:</strong> 146
            </div>
            <div className="info-item">
              <strong>Estado:</strong> 
              <span className={`status-text ${networkStatus}`}>
                {networkStatus === 'connected' && ' Conectado'}
                {networkStatus === 'disconnected' && ' Desconectado'}
                {networkStatus === 'checking' && ' Verificando...'}
              </span>
            </div>
            <div className="info-item">
              <strong>Método:</strong> Consulta por transacción
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .container {
          max-width: 700px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
          min-height: 100vh;
        }
        header {
          text-align: center;
          margin-bottom: 40px;
          padding: 30px;
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        h1 {
          color: #2c5530;
          margin-bottom: 10px;
        }
        
        /* Indicador de Estado de Red */
        .network-status {
          margin-top: 20px;
          padding: 15px;
          border-radius: 10px;
          font-weight: bold;
        }
        .network-status.connected {
          background: #d4edda;
          border: 2px solid #28a745;
          color: #155724;
        }
        .network-status.disconnected {
          background: #f8d7da;
          border: 2px solid #dc3545;
          color: #721c24;
        }
        .network-status.checking {
          background: #fff3cd;
          border: 2px solid #ffc107;
          color: #856404;
        }
        .status-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 10px;
        }
        .status-dot.connected {
          background: #28a745;
        }
        .status-dot.disconnected {
          background: #dc3545;
        }
        .status-dot.checking {
          background: #ffc107;
          animation: pulse 1.5s infinite;
        }
        .retry-btn {
          margin-left: 15px;
          padding: 5px 10px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        .retry-btn:hover {
          background: #c82333;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .search-box {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
        }
        input {
          flex: 1;
          padding: 15px;
          border: 2px solid #ddd;
          border-radius: 10px;
          font-size: 16px;
        }
        input:focus {
          outline: none;
          border-color: #2c5530;
        }
        button {
          padding: 15px 25px;
          background: #2c5530;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
        }
        button:hover:not(:disabled) {
          background: #1e3a24;
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .examples {
          margin-bottom: 30px;
          text-align: center;
        }
        .example-card {
          background: white;
          padding: 20px;
          border-radius: 10px;
          border: 2px solid #e9ecef;
          display: inline-block;
        }
        .example-btn {
          background: #6c757d;
          padding: 10px 20px;
          font-size: 14px;
          margin-top: 10px;
          color: white;
        }
        .example-btn:hover:not(:disabled) {
          background: #5a6268;
        }
        .result {
          padding: 25px;
          border-radius: 15px;
          margin-bottom: 30px;
          background: white;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .valid {
          border-left: 5px solid #28a745;
        }
        .invalid {
          border-left: 5px solid #dc3545;
        }
        .certificate-info {
          margin-top: 20px;
          line-height: 1.8;
        }
        .certificate-id {
          display: block;
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          margin: 8px 0;
          font-size: 14px;
          word-break: break-all;
        }
        code {
          background: #f8f9fa;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          word-break: break-all;
          display: inline-block;
          margin: 5px 0;
        }
        .blockchain-proof {
          margin-top: 20px;
          padding: 15px;
          background: #d4edda;
          border-radius: 8px;
          border-left: 4px solid #28a745;
        }
        .help-text {
          margin-top: 15px;
          padding: 15px;
          background: #fff3cd;
          border-radius: 8px;
        }
        .network-info {
          background: white;
          padding: 25px;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 15px;
        }
        .info-item {
          padding: 10px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .status-text.connected {
          color: #28a745;
          font-weight: bold;
        }
        .status-text.disconnected {
          color: #dc3545;
          font-weight: bold;
        }
        .status-text.checking {
          color: #ffc107;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
