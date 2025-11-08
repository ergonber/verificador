import { useState } from 'react';
import Web3 from 'web3';

export default function Home() {
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // TUS DATOS REALES DE SONIC TESTNET
  const CONTRACT_ADDRESS = "0xa3081cd8f09dee3e5f0bcff197a40ff90720a05f";
  const SONIC_TESTNET_RPC = "https://rpc.soniclabs.com/testnet";

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
    }
  ];

  const verifyCertificate = async () => {
    if (!searchInput.trim()) {
      alert("Por favor ingresa el ID del certificado");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log("🔗 Conectando a Sonic Testnet...");
      
      // Conexión directa al RPC de Sonic Testnet
      const web3 = new Web3(SONIC_TESTNET_RPC);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

      // Verificar conexión obteniendo el conteo de certificados
      try {
        const certificateCount = await contract.methods.certificateCount().call();
        console.log("✅ Conexión exitosa. Total certificados:", certificateCount);
      } catch (error) {
        console.error("❌ Error en conexión:", error);
        throw new Error("No se pudo conectar al contrato en Sonic Testnet");
      }

      let isValid = false;
      let certificateData = null;
      const certificateId = searchInput;

      console.log("🔍 Buscando certificado:", certificateId);

      // Buscar directamente por certificateId
      try {
        isValid = await contract.methods.verifyCertificate(certificateId).call();
        console.log("✅ Certificado válido:", isValid);
        
        if (isValid) {
          certificateData = await contract.methods.getCertificate(certificateId).call();
          console.log("📄 Datos del certificado:", certificateData);
        } else {
          console.log("❌ Certificado no válido o revocado");
        }
      } catch (error) {
        console.log("❌ Error buscando certificado:", error.message);
        throw new Error("ID de certificado inválido o no encontrado");
      }

      setResult({
        isValid,
        certificateData,
        certificateId,
        found: !!certificateData
      });

    } catch (error) {
      console.error("Error general:", error);
      setResult({
        isValid: false,
        error: error.message,
        found: false
      });
    }

    setLoading(false);
  };

  // Solo el ID del certificado para probar
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
        <div className="contract-info">
          <p><strong>Contrato:</strong> <code>{CONTRACT_ADDRESS}</code></p>
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
          <button onClick={verifyCertificate} disabled={loading}>
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
            >
              Probar este certificado
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
                  <p><strong>Posibles soluciones:</strong></p>
                  <ul>
                    <li>Verifica que el ID del certificado sea correcto</li>
                    <li>Confirma que el certificado fue emitido en Sonic Testnet</li>
                    <li>Revisa la consola del navegador (F12) para más detalles</li>
                  </ul>
                </div>
              </div>
            ) : result.found && result.isValid ? (
              <div>
                <h3>✅ CERTIFICADO VÁLIDO</h3>
                <div className="certificate-info">
                  <p><strong>👤 Estudiante:</strong> {result.certificateData.recipientName}</p>
                  <p><strong>🎓 Curso/Evento:</strong> {result.certificateData.eventName}</p>
                  <p><strong>📅 Fecha de Emisión:</strong> {new Date(result.certificateData.issueDate * 1000).toLocaleDateString('es-ES')}</p>
                  <p><strong>🆔 ID del Certificado:</strong></p>
                  <code className="certificate-id">{result.certificateId}</code>
                  <p><strong>🏢 Emitido por:</strong> {result.certificateData.issuer}</p>
                  
                  <div className="blockchain-proof">
                    <p>✅ <strong>Verificado en Blockchain SONIC</strong></p>
                    <small>Los datos mostrados están almacenados directamente en el contrato inteligente</small>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3>❌ CERTIFICADO NO VÁLIDO</h3>
                <p>El certificado no existe o ha sido revocado.</p>
                <div className="help-text">
                  <p><strong>Verifica que:</strong></p>
                  <ul>
                    <li>El ID del certificado sea correcto</li>
                    <li>El certificado no haya sido revocado</li>
                    <li>El certificado exista en el contrato</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="instructions">
          <h3>📋 Cómo usar:</h3>
          <div className="steps">
            <div className="step">
              <strong>1. Obtén el ID del certificado</strong>
              <p>El ID es un código único que comienza con "0x..."</p>
            </div>
            <div className="step">
              <strong>2. Pega el ID en el campo de búsqueda</strong>
              <p>También puedes usar el botón de ejemplo para probar</p>
            </div>
            <div className="step">
              <strong>3. Haz clic en "Verificar Certificado"</strong>
              <p>El sistema consultará directamente la blockchain SONIC</p>
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
        .contract-info {
          margin-top: 15px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 8px;
          display: inline-block;
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
        button:hover {
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
          margin: 0 auto;
        }
        .example-btn {
          background: #6c757d;
          padding: 10px 20px;
          font-size: 14px;
          margin-top: 10px;
          color: white;
        }
        .example-btn:hover {
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
          border: 1px solid #dee2e6;
        }
        code {
          background: #f8f9fa;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          word-break: break-all;
          display: inline-block;
          margin: 5px 0;
          border: 1px solid #dee2e6;
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
      `}</style>
    </div>
  );
}
