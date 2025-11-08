import { useState, useEffect } from 'react';
import Web3 from 'web3';

export default function Home() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState('checking');

  // CONFIGURACIÓN QUEMADA EN CÓDIGO
  const CONTRACT_ADDRESS = "0xa3081cd8f09dee3e5f0bcff197a40ff90720a05f";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  
  // CERTIFICATE_ID quemado - este es el ID que se generó en tu transacción
  const CERTIFICATE_ID = "0xf47444960241d3ae46ed20d44b143fb812e73a53b7796bd162c22071f906ae14";

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

  useEffect(() => {
    console.log("🚀 INICIANDO VERIFICACIÓN AUTOMÁTICA");
    console.log("🔧 Configuración:");
    console.log("   RPC:", SONIC_RPC_URL);
    console.log("   Contrato:", CONTRACT_ADDRESS);
    console.log("   CertificateId:", CERTIFICATE_ID);
    
    verifyCertificate();
  }, []);

  const convertBigIntToNumber = (bigIntValue) => {
    if (typeof bigIntValue === 'bigint') {
      return Number(bigIntValue);
    }
    return Number(bigIntValue);
  };

  const verifyCertificate = async () => {
    setLoading(true);
    setNetworkStatus('checking');

    try {
      console.log("🔍 Conectando a Sonic Testnet...");
      const web3 = new Web3(SONIC_RPC_URL);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

      // Probar conexión
      const blockNumber = await web3.eth.getBlockNumber();
      console.log(`✅ Conectado - Block: ${blockNumber}`);
      setNetworkStatus('connected');

      console.log("🔍 Verificando certificado...");
      
      // 1. Verificar si el certificado es válido
      const isValid = await contract.methods.verifyCertificate(CERTIFICATE_ID).call();
      console.log(`✅ Certificado válido: ${isValid}`);

      if (!isValid) {
        throw new Error("El certificado no es válido o ha sido revocado");
      }

      console.log("📋 Obteniendo datos del certificado...");
      
      // 2. Obtener todos los datos del certificado
      const rawData = await contract.methods.getCertificate(CERTIFICATE_ID).call();
      console.log("📊 Datos obtenidos:", rawData);

      // Procesar datos
      const certificateData = {
        issuer: rawData.issuer,
        recipientName: rawData.recipientName,
        eventName: rawData.eventName,
        arweaveHash: rawData.arweaveHash,
        issueDate: convertBigIntToNumber(rawData.issueDate),
        isActive: rawData.isActive,
        certificateId: CERTIFICATE_ID
      };

      setResult({
        isValid: true,
        certificateData: certificateData,
        found: true
      });

    } catch (error) {
      console.error("💥 ERROR:", error);
      setNetworkStatus('disconnected');
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
    verifyCertificate();
  };

  return (
    <div className="container">
      <header>
        <h1>✅ Verificador de Certificados</h1>
        <p>Verificación automática en <strong>SONIC TESTNET</strong></p>
        
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
            </div>
          )}
        </div>
      </header>

      <main>
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Verificando certificado en blockchain...</p>
          </div>
        ) : result && result.found && result.isValid ? (
          <div className="result valid">
            <div className="success-header">
              <h2>🎉 CERTIFICADO VERIFICADO EXITOSAMENTE</h2>
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
              </div>
              
              <div className="blockchain-proof">
                <div className="proof-header">
                  <strong>🔗 Verificado en Blockchain</strong>
                </div>
                <div className="proof-details">
                  <p><strong>Red:</strong> Sonic Testnet (ChainID: 14601)</p>
                  <p><strong>Contrato:</strong> {CONTRACT_ADDRESS}</p>
                  <p><strong>Transacción:</strong> 0xd3ed1584d1bf39c7f6e78d6d18b04c6b4b9fc510f6e58d3e918c56b3cf2da819</p>
                </div>
              </div>
            </div>
          </div>
        ) : result && result.error ? (
          <div className="result invalid">
            <div className="error-header">
              <h2>❌ ERROR EN LA VERIFICACIÓN</h2>
              <p>{result.error}</p>
            </div>
            
            <div className="error-details">
              <div className="help-text">
                <p><strong>Información para debugging:</strong></p>
                <ul>
                  <li><strong>CertificateId probado:</strong> {CERTIFICATE_ID}</li>
                  <li><strong>Contrato:</strong> {CONTRACT_ADDRESS}</li>
                  <li><strong>RPC:</strong> {SONIC_RPC_URL}</li>
                  <li><strong>Estado de red:</strong> {networkStatus}</li>
                </ul>
              </div>
              
              <button onClick={retryVerification} className="retry-btn">
                🔄 Reintentar Verificación
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
              <strong>CertificateId:</strong>
              <code>{CERTIFICATE_ID.slice(0, 20)}...</code>
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
        
        .status-dot.connected { background: #28a745; }
        .status-dot.disconnected { background: #dc3545; }
        .status-dot.checking { 
          background: #ffc107; 
          animation: pulse 1.5s infinite;
        }
        
        .loading {
          text-align: center;
          padding: 60px 20px;
        }
        
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #2c5530;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        
        .result {
          padding: 0;
          border-radius: 15px;
          margin-bottom: 30px;
          background: white;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        
        .result.valid {
          border: 2px solid #28a745;
        }
        
        .result.invalid {
          border: 2px solid #dc3545;
        }
        
        .success-header, .error-header {
          padding: 30px;
          text-align: center;
        }
        
        .success-header {
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
        }
        
        .error-header {
          background: linear-gradient(135deg, #dc3545, #e83e8c);
          color: white;
        }
        
        .certificate-card {
          padding: 30px;
        }
        
        .certificate-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e9ecef;
        }
        
        .status-badge {
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
        }
        
        .status-badge.valid {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .certificate-details {
          margin-bottom: 25px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 12px 0;
          border-bottom: 1px solid #f8f9fa;
        }
        
        .detail-row strong {
          color: #495057;
          min-width: 150px;
        }
        
        .status-active {
          color: #28a745;
          font-weight: bold;
        }
        
        .certificate-id {
          background: #f8f9fa;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          word-break: break-all;
          display: block;
          margin-top: 5px;
        }
        
        .blockchain-proof {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          border-left: 4px solid #007bff;
        }
        
        .proof-header {
          margin-bottom: 15px;
          color: #007bff;
        }
        
        .error-details {
          padding: 30px;
        }
        
        .help-text {
          background: #fff3cd;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #ffc107;
        }
        
        .help-text ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        
        .retry-btn {
          width: 100%;
          padding: 15px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        }
        
        .retry-btn:hover {
          background: #c82333;
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
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
        
        code {
          background: #e9ecef;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          word-break: break-all;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
