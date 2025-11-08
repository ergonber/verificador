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
  
  // CONFIGURACIÓN EXACTA de Sonic Testnet
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const SONIC_NETWORK = {
    chainId: "0x3911", // 14601 en hexadecimal
    chainName: "Sonic Testnet",
    rpcUrls: [SONIC_RPC_URL],
    blockExplorerUrls: ["https://testnet.sonicscan.org"],
    nativeCurrency: {
      name: "Sonic",
      symbol: "S",
      decimals: 18
    }
  };

  // ABI simplificado - solo las funciones que necesitamos
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
    }
  ];

  useEffect(() => {
    console.log("🚀 Iniciando verificador de certificados...");
    console.log("🔧 Configuración Sonic Testnet:");
    console.log("   RPC:", SONIC_RPC_URL);
    console.log("   ChainID:", SONIC_NETWORK.chainId);
    console.log("   Contrato:", CONTRACT_ADDRESS);
    checkNetworkStatus();
  }, []);

  const checkNetworkStatus = async () => {
    setNetworkStatus('checking');
    console.log(`🔍 Conectando a Sonic Testnet...`);
    
    try {
      const web3 = new Web3(SONIC_RPC_URL);
      
      // Probar la conexión obteniendo el block number
      const blockNumber = await web3.eth.getBlockNumber();
      console.log(`✅ CONEXIÓN EXITOSA - Block: ${blockNumber}`);
      
      // Probar el contrato
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
      const certificateCount = await contract.methods.certificateCount().call();
      console.log(`📊 Certificados en contrato: ${certificateCount}`);
      
      setNetworkStatus('connected');
      setCurrentRPC(SONIC_RPC_URL);
      
    } catch (error) {
      console.log(`❌ ERROR DE CONEXIÓN: ${error.message}`);
      setNetworkStatus('disconnected');
      setCurrentRPC('');
    }
  };

  const verifyCertificate = async () => {
    if (!searchInput.trim()) {
      alert("Por favor ingresa el ID del certificado");
      return;
    }

    // Validar formato de certificateId
    if (searchInput.length !== 66 || !searchInput.startsWith('0x')) {
      alert("El ID del certificado debe tener 66 caracteres y comenzar con '0x'");
      return;
    }

    console.log("🚀 INICIANDO VERIFICACIÓN...");
    console.log(`🔍 CertificateId: ${searchInput}`);
    
    setLoading(true);
    setResult(null);

    try {
      if (networkStatus === 'disconnected') {
        throw new Error("No hay conexión a Sonic Testnet. Recarga la página.");
      }

      const web3 = new Web3(SONIC_RPC_URL);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

      console.log("🔍 Verificando validez del certificado...");
      
      // 1. Primero verificar si el certificado es válido
      const isValid = await contract.methods.verifyCertificate(searchInput).call();
      console.log(`✅ Certificado válido: ${isValid}`);

      if (!isValid) {
        throw new Error("El certificado no es válido o ha sido revocado");
      }

      console.log("📋 Obteniendo datos del certificado...");
      
      // 2. Obtener todos los datos del certificado
      const certificateData = await contract.methods.getCertificate(searchInput).call();
      console.log("📊 Datos obtenidos:", certificateData);

      setResult({
        isValid: true,
        certificateData: {
          ...certificateData,
          certificateId: searchInput
        },
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

  // Ejemplo con el CERTIFICATE_ID real de tu contrato
  const testExample = {
    type: "ID del Certificado",
    value: "0xd6744e56044c09b08b250164f512a6c26aeabbedb46403288e84f0550f122ea1",
    description: "Certificado de Jesus tincona - Crypto Cocha"
  };

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
              <div className="network-details">
                <p><strong>ChainID:</strong> {SONIC_NETWORK.chainId} (14601)</p>
                <p><strong>RPC:</strong> {SONIC_RPC_URL}</p>
                <p><strong>Contrato:</strong> {CONTRACT_ADDRESS}</p>
              </div>
            </div>
          )}
          {networkStatus === 'disconnected' && (
            <div className="status-disconnected">
              <span className="status-dot disconnected"></span>
              ❌ DESCONECTADO DE SONIC TESTNET
              <div className="retry-section">
                <p>No se pudo conectar al RPC de Sonic Testnet</p>
                <button onClick={checkNetworkStatus} className="retry-btn">
                  Reintentar Conexión
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main>
        <div className="search-box">
          <input
            type="text"
            placeholder="Ingresa el ID del certificado (0x...)"
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

        {/* Ejemplo con certificateId real */}
        <div className="examples">
          <h3>💡 Ejemplo para probar (certificado real):</h3>
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
              Probar este certificado
            </button>
          </div>
        </div>

        {result && (
          <div className={`result ${result.isValid ? 'valid' : 'invalid'}`}>
            {result.error ? (
              <div>
                <h3>❌ Error en la Verificación</h3>
                <p>{result.error}</p>
                <div className="help-text">
                  <p><strong>Para solucionar:</strong></p>
                  <ul>
                    <li>Verifica que el ID del certificado sea correcto</li>
                    <li>Asegúrate de que el certificado existe en el contrato</li>
                    <li>Confirma que el contrato está en Sonic Testnet</li>
                    <li>Revisa la consola (F12) para más detalles</li>
                  </ul>
                  <p><strong>ID probado:</strong> <code>{searchInput}</code></p>
                </div>
              </div>
            ) : result.found && result.isValid ? (
              <div>
                <h3>✅ CERTIFICADO VERIFICADO</h3>
                <div className="certificate-info">
                  <p><strong>👤 Estudiante:</strong> {result.certificateData.recipientName}</p>
                  <p><strong>🎓 Curso/Evento:</strong> {result.certificateData.eventName}</p>
                  <p><strong>📅 Fecha de Emisión:</strong> {new Date(result.certificateData.issueDate * 1000).toLocaleDateString('es-ES')}</p>
                  <p><strong>🆔 ID del Certificado:</strong></p>
                  <code className="certificate-id">{result.certificateData.certificateId}</code>
                  <p><strong>✅ Estado:</strong> {result.certificateData.isActive ? "Activo" : "Revocado"}</p>
                  <p><strong>🏢 Emitido por:</strong> {result.certificateData.issuer}</p>
                  
                  <div className="blockchain-proof">
                    <p>✅ <strong>Verificado en Sonic Testnet</strong></p>
                    <small>Datos consultados directamente desde el contrato inteligente</small>
                    <br />
                    <small>ChainID: {SONIC_NETWORK.chainId} | RPC: {SONIC_RPC_URL}</small>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3>❌ CERTIFICADO NO ENCONTRADO</h3>
                <p>No se pudo verificar el certificado con el ID proporcionado.</p>
              </div>
            )}
          </div>
        )}

        <div className="instructions">
          <h3>📋 Cómo usar el verificador:</h3>
          <div className="steps">
            <div className="step">
              <strong>1. Obtén el ID del certificado</strong>
              <p>El ID es un código único de 66 caracteres que comienza con "0x"</p>
            </div>
            <div className="step">
              <strong>2. Pega el ID en el campo de búsqueda</strong>
              <p>Usa el ejemplo proporcionado para probar</p>
            </div>
            <div className="step">
              <strong>3. Haz clic en "Verificar Certificado"</strong>
              <p>El sistema consultará directamente la blockchain Sonic Testnet</p>
            </div>
          </div>
          
          <div className="technical-info">
            <h4>🔧 Información Técnica:</h4>
            <p><strong>Método:</strong> Consulta directa al contrato inteligente</p>
            <p><strong>Función:</strong> verifyCertificate() + getCertificate()</p>
            <p><strong>Blockchain:</strong> Sonic Testnet (ChainID: 14601)</p>
            <p><strong>Contrato:</strong> {CONTRACT_ADDRESS}</p>
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
        .network-details {
          margin-top: 10px;
          font-size: 14px;
          text-align: left;
          background: rgba(255,255,255,0.7);
          padding: 15px;
          border-radius: 8px;
        }
        .retry-section {
          margin-top: 10px;
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
          margin-top: 10px;
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
          border: 1px solid #dee2e6;
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
          border-left: 4px solid #28a745;
        }
        .help-text {
          margin-top: 15px;
          padding: 15px;
          background: #fff3cd;
          border-radius: 8px;
          border-left: 4px solid #ffc107;
        }
        .help-text ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .instructions {
          background: white;
          padding: 25px;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .steps {
          display: grid;
          gap: 15px;
          margin-top: 15px;
        }
        .step {
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #2c5530;
        }
        .technical-info {
          margin-top: 20px;
          padding: 15px;
          background: #e7f3ff;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }
      `}</style>
    </div>
  );
}
