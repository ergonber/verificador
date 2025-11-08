import { useState, useEffect } from 'react';
import Web3 from 'web3';

export default function Home() {
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [currentRPC, setCurrentRPC] = useState('');

  // CONTRATO en Sonic Testnet - TU CONTRATO REAL
  const CONTRACT_ADDRESS = "0xa3081cd8f09dee3e5f0bcff197a40ff90720a05f";
  
  // RPC de Sonic Testnet - USANDO TU URL
  const SONIC_RPC_URL = "https://testnet.soniclabs.com";

  // ABI completo del contrato
  const CONTRACT_ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
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
    },
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
    },
    {
      "inputs": [],
      "name": "certificateCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_arweaveHash",
          "type": "string"
        }
      ],
      "name": "verifyCertificateByHash",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        },
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "name": "hashToCertificateId",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  useEffect(() => {
    console.log("🚀 Iniciando verificador con Sonic Testnet...");
    console.log(`📡 RPC: ${SONIC_RPC_URL}`);
    console.log(`📄 Contrato: ${CONTRACT_ADDRESS}`);
    checkNetworkStatus();
  }, []);

  const checkNetworkStatus = async () => {
    setNetworkStatus('checking');
    console.log(`🔍 Conectando a: ${SONIC_RPC_URL}`);
    
    try {
      const web3 = new Web3(SONIC_RPC_URL);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
      
      // Probar la conexión obteniendo el block number
      const blockNumber = await web3.eth.getBlockNumber();
      console.log(`✅ Conectado a Sonic Testnet - Block: ${blockNumber}`);
      
      // Probar el contrato obteniendo el conteo de certificados
      const count = await contract.methods.certificateCount().call();
      console.log(`📊 Contrato accesible - Certificados totales: ${count}`);
      
      setNetworkStatus('connected');
      setCurrentRPC(SONIC_RPC_URL);
      
    } catch (error) {
      console.log(`❌ Error de conexión: ${error.message}`);
      setNetworkStatus('disconnected');
      setCurrentRPC('');
    }
  };

  const verifyCertificate = async () => {
    if (!searchInput.trim()) {
      alert("Por favor ingresa el ID del certificado o hash Arweave");
      return;
    }

    console.log("🚀 INICIANDO VERIFICACIÓN...");
    console.log(`🔍 Búsqueda: ${searchInput}`);
    
    setLoading(true);
    setResult(null);

    try {
      if (networkStatus === 'disconnected') {
        throw new Error("No hay conexión a Sonic Testnet. Recarga la página.");
      }

      const web3 = new Web3(SONIC_RPC_URL);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

      let isValid = false;
      let certificateData = null;
      let certificateId = null;
      let searchMethod = '';

      // PRIMERO: Intentar buscar por certificateId
      if (searchInput.length === 66 && searchInput.startsWith('0x')) {
        try {
          searchMethod = 'id';
          console.log("🔍 Buscando por certificateId...");
          certificateId = searchInput;
          isValid = await contract.methods.verifyCertificate(certificateId).call();
          console.log(`✅ Certificado válido: ${isValid}`);
          
          if (isValid) {
            certificateData = await contract.methods.getCertificate(certificateId).call();
            console.log("📊 Datos del certificado:", certificateData);
          }
        } catch (error) {
          console.log("❌ Error buscando por ID:", error.message);
        }
      }

      // SEGUNDO: Si no se encontró por ID, intentar por hash Arweave
      if (!certificateData && (searchInput.length === 43 || searchInput.startsWith('_') || searchInput === 'test-456')) {
        try {
          searchMethod = 'hash';
          console.log("🔍 Buscando por hash Arweave...");
          const result = await contract.methods.verifyCertificateByHash(searchInput).call();
          isValid = result[0];
          certificateId = result[1];
          console.log(`✅ Resultado por hash - Válido: ${isValid}, ID: ${certificateId}`);
          
          if (isValid && certificateId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            certificateData = await contract.methods.getCertificate(certificateId).call();
            console.log("📊 Datos del certificado:", certificateData);
          }
        } catch (error) {
          console.log("❌ Error buscando por hash:", error.message);
        }
      }

      if (certificateData) {
        setResult({
          isValid: true,
          certificateData: {
            ...certificateData,
            certificateId: certificateId
          },
          found: true,
          searchMethod
        });
      } else {
        throw new Error("No se encontró un certificado válido con los datos proporcionados");
      }

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

  // Ejemplos para probar
  const testExamples = [
    {
      type: "ID del Certificado",
      value: "0xd6744e56044c09b08b250164f512a6c26aeabbedb46403288e84f0550f122ea1",
      description: "Certificado de Jesus tincona - Crypto Cocha"
    },
    {
      type: "Hash Arweave", 
      value: "test-456",
      description: "Mismo certificado por hash"
    }
  ];

  return (
    <div className="container">
      <header>
        <h1>🔍 Verificador de Certificados</h1>
        <p>Verifica certificados en <strong>SONIC TESTNET</strong></p>
        
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
              <div className="network-info">
                <small>RPC: {SONIC_RPC_URL}</small>
                <br />
                <small>Contrato: {CONTRACT_ADDRESS}</small>
              </div>
            </div>
          )}
          {networkStatus === 'disconnected' && (
            <div className="status-disconnected">
              <span className="status-dot disconnected"></span>
              ❌ DESCONECTADO DE SONIC TESTNET
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
            placeholder="Ingresa ID del certificado (0x...) o hash Arweave"
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

        {/* Ejemplos para probar */}
        <div className="examples">
          <h3>💡 Ejemplos para probar:</h3>
          <div className="example-cards">
            {testExamples.map((example, index) => (
              <div key={index} className="example-card">
                <p><strong>{example.type}:</strong></p>
                <code>{example.value}</code>
                <p><small>{example.description}</small></p>
                <button 
                  onClick={() => {
                    setSearchInput(example.value);
                    setTimeout(verifyCertificate, 100);
                  }}
                  className="example-btn"
                  disabled={networkStatus !== 'connected'}
                >
                  Probar este
                </button>
              </div>
            ))}
          </div>
        </div>

        {result && (
          <div className={`result ${result.isValid ? 'valid' : 'invalid'}`}>
            {result.error ? (
              <div>
                <h3>❌ Error en la Verificación</h3>
                <p>{result.error}</p>
                <div className="help-text">
                  <p><strong>Solución:</strong></p>
                  <ul>
                    <li>Verifica que el ID o hash sean correctos</li>
                    <li>Asegúrate de que el certificado existe en el contrato</li>
                    <li>El certificado podría haber sido revocado</li>
                    <li>Revisa la consola (F12) para logs detallados</li>
                  </ul>
                </div>
              </div>
            ) : result.found && result.isValid ? (
              <div>
                <h3>✅ CERTIFICADO VERIFICADO</h3>
                <p><small>Búsqueda por: {result.searchMethod === 'hash' ? 'Hash Arweave' : 'ID del Certificado'}</small></p>
                <div className="certificate-info">
                  <p><strong>👤 Estudiante:</strong> {result.certificateData.recipientName}</p>
                  <p><strong>🎓 Curso/Evento:</strong> {result.certificateData.eventName}</p>
                  <p><strong>📅 Fecha de Emisión:</strong> {new Date(result.certificateData.issueDate * 1000).toLocaleDateString('es-ES')}</p>
                  <p><strong>🆔 ID del Certificado:</strong></p>
                  <code className="certificate-id">{result.certificateData.certificateId}</code>
                  <p><strong>📄 Hash Arweave:</strong> {result.certificateData.arweaveHash}</p>
                  <p><strong>🏢 Emitido por:</strong> {result.certificateData.issuer}</p>
                  
                  <div className="blockchain-proof">
                    <p>✅ <strong>Verificado en Sonic Testnet</strong></p>
                    <small>Datos consultados directamente desde el contrato inteligente</small>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3>❌ CERTIFICADO NO ENCONTRADO</h3>
                <p>No se pudo encontrar un certificado válido.</p>
              </div>
            )}
          </div>
        )}

        <div className="system-info">
          <h3>🔧 Información del Sistema</h3>
          <div className="info-grid">
            <div className="info-item">
              <strong>Red:</strong> Sonic Testnet
            </div>
            <div className="info-item">
              <strong>ChainID:</strong> 146
            </div>
            <div className="info-item">
              <strong>RPC:</strong> 
              <code>{SONIC_RPC_URL}</code>
            </div>
            <div className="info-item">
              <strong>Contrato:</strong> 
              <code>{CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}</code>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
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
        
        .network-status {
          margin-top: 20px;
          padding: 20px;
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
        .network-info {
          margin-top: 10px;
          font-size: 12px;
          font-weight: normal;
        }
        .status-dot {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 10px;
        }
        .status-dot.connected { background: #28a745; }
        .status-dot.disconnected { background: #dc3545; }
        .status-dot.checking { 
          background: #ffc107; 
          animation: pulse 1.5s infinite;
        }
        .retry-btn {
          margin-left: 15px;
          padding: 8px 15px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
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
        }
        .example-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }
        .example-card {
          background: white;
          padding: 20px;
          border-radius: 10px;
          border: 2px solid #e9ecef;
          text-align: center;
        }
        .example-btn {
          background: #6c757d;
          padding: 10px 20px;
          font-size: 14px;
          margin-top: 10px;
          color: white;
        }

        .result {
          padding: 25px;
          border-radius: 15px;
          margin-bottom: 30px;
          background: white;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .valid { border-left: 5px solid #28a745; }
        .invalid { border-left: 5px solid #dc3545; }
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
        }
        .blockchain-proof {
          margin-top: 20px;
          padding: 15px;
          background: #d4edda;
          border-radius: 8px;
        }
        .help-text {
          margin-top: 15px;
          padding: 15px;
          background: #fff3cd;
          border-radius: 8px;
        }

        .system-info {
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
      `}</style>
    </div>
  );
}
