import { useState } from 'react';
import Web3 from 'web3';

export default function Home() {
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // TUS DATOS REALES DE SONIC
  const CONTRACT_ADDRESS = "0xa3081cd8f09dee3e5f0bcff197a40ff90720a05f";
  const SONIC_RPC_URL = "https://rpc.soniclabs.com"; // RPC público de SONIC
  
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
    }
  ];

  const verifyCertificate = async () => {
    if (!searchInput.trim()) {
      alert("Por favor ingresa un ID del certificado o hash Arweave");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Conexión directa al RPC de SONIC - SIN necesidad de wallet
      const web3 = new Web3(SONIC_RPC_URL);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

      let isValid = false;
      let certificateData = null;
      let certificateId = null;
      let searchMethod = '';

      // Intentar buscar por hash Arweave
      if (searchInput.length === 43 || searchInput.startsWith('_') || searchInput === 'test-456') {
        try {
          searchMethod = 'hash';
          // Primero obtener el certificateId desde el hash
          certificateId = await contract.methods.hashToCertificateId(searchInput).call();
          
          if (certificateId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            // Si encontramos un certificateId, verificar y obtener datos
            isValid = await contract.methods.verifyCertificate(certificateId).call();
            if (isValid) {
              certificateData = await contract.methods.getCertificate(certificateId).call();
            }
          }
        } catch (error) {
          console.log("No se encontró certificado con este hash:", error);
        }
      }

      // Si no se encontró por hash, intentar directamente como certificateId
      if (!certificateData && searchInput.length === 66 && searchInput.startsWith('0x')) {
        try {
          searchMethod = 'id';
          certificateId = searchInput;
          isValid = await contract.methods.verifyCertificate(certificateId).call();
          if (isValid) {
            certificateData = await contract.methods.getCertificate(certificateId).call();
          }
        } catch (error) {
          console.log("No es un certificateId válido:", error);
        }
      }

      setResult({
        isValid,
        certificateData,
        certificateId,
        found: !!certificateData,
        searchMethod
      });

    } catch (error) {
      console.error("Error:", error);
      setResult({
        isValid: false,
        error: "Error conectando con la blockchain SONIC. Intenta nuevamente.",
        found: false
      });
    }

    setLoading(false);
  };

  // Datos de ejemplo para probar
  const testExamples = [
    {
      type: "ID del Certificado",
      value: "0xd6744e56044c09b08b250164f512a6c26aeabbedb46403288e84f0550f122ea1",
      description: "Certificado de Jesus tincona"
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
        <h1>🔍 Verificador de Certificados Asoblockchain</h1>
        <p>Verifica la autenticidad de certificados en la blockchain SONIC</p>
        <div className="contract-info">
          <p><strong>Contrato Verificado:</strong> <code>{CONTRACT_ADDRESS}</code></p>
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
          <button onClick={verifyCertificate} disabled={loading}>
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
                <h3>❌ Error de Conexión</h3>
                <p>{result.error}</p>
              </div>
            ) : result.found && result.isValid ? (
              <div>
                <h3>✅ CERTIFICADO VÁLIDO</h3>
                <p><small>Búsqueda por: {result.searchMethod === 'hash' ? 'Hash Arweave' : 'ID del Certificado'}</small></p>
                <div className="certificate-info">
                  <p><strong>👤 Nombre del Estudiante:</strong> {result.certificateData.recipientName}</p>
                  <p><strong>🎓 Evento/Curso:</strong> {result.certificateData.eventName}</p>
                  <p><strong>📅 Fecha de Emisión:</strong> {new Date(result.certificateData.issueDate * 1000).toLocaleDateString('es-ES')}</p>
                  <p><strong>🆔 ID del Certificado:</strong> </p>
                  <code className="certificate-id">{result.certificateId}</code>
                  <p><strong>📄 Hash Arweave:</strong> </p>
                  <code>{result.certificateData.arweaveHash}</code>
                  <p><strong>🏢 Emitido por:</strong> {result.certificateData.issuer}</p>
                  
                  <div className="blockchain-proof">
                    <p>✅ <strong>Verificado en Blockchain SONIC</strong></p>
                    <small>Datos consultados directamente desde el contrato inteligente</small>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3>❌ CERTIFICADO NO ENCONTRADO</h3>
                <p>No se encontró un certificado válido en la blockchain SONIC.</p>
                <div className="help-text">
                  <p><strong>Verifica que:</strong></p>
                  <ul>
                    <li>El ID o hash sea correcto</li>
                    <li>El certificado no haya sido revocado</li>
                    <li>El certificado exista en el contrato</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="instructions">
          <h3>¿Cómo funciona?</h3>
          <div className="steps">
            <div className="step">
              <strong>1. Ingresa los datos</strong>
              <p>Pega el <code>ID del certificado</code> o el <code>hash Arweave</code></p>
            </div>
            <div className="step">
              <strong>2. Consulta automática</strong>
              <p>El sistema consulta directamente el contrato en SONIC</p>
            </div>
            <div className="step">
              <strong>3. Resultado instantáneo</strong>
              <p>Muestra los datos almacenados en la blockchain</p>
            </div>
          </div>
          <div className="note">
            <p>💡 <strong>Nota:</strong> No se requiere conexión de wallet. Solo lectura pública de la blockchain.</p>
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
        }
        .example-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }
        .example-card {
          background: white;
          padding: 15px;
          border-radius: 10px;
          border: 2px solid #e9ecef;
          text-align: center;
        }
        .example-btn {
          background: #6c757d;
          padding: 8px 15px;
          font-size: 14px;
          margin-top: 10px;
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
          gap: 20px;
          margin-top: 15px;
        }
        .step {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 10px;
          border-left: 4px solid #2c5530;
        }
        .note {
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
