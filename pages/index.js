import { useState } from 'react';
import Web3 from 'web3';

export default function Home() {
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Vamos a probar diferentes RPCs de Sonic
  const SONIC_RPC_URLS = [
    "https://sonic-testnet.drpc.org",
    "https://rpc-testnet.sonicscan.org",
    "https://testnet.soniclabs.com",
    "https://rpc.soniclabs.com/testnet"
  ];

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
    }
  ];

  // Función para obtener los logs de emisión de certificados desde una transacción
  const getCertificateFromTransaction = async (web3, transactionHash) => {
    try {
      console.log("🔍 Obteniendo transacción:", transactionHash);
      
      // Obtener los receipt de la transacción
      const receipt = await web3.eth.getTransactionReceipt(transactionHash);
      console.log("📄 Receipt de la transacción:", receipt);
      
      if (!receipt || !receipt.logs) {
        throw new Error("Transacción no encontrada o sin logs");
      }

      // Crear una instancia temporal del contrato para decodificar logs
      const contract = new web3.eth.Contract(CONTRACT_ABI);
      
      // Buscar el evento CertificateIssued en los logs
      for (const log of receipt.logs) {
        try {
          // Intentar decodificar el log como evento CertificateIssued
          const decodedLog = contract._decodeEventABI({
            name: 'CertificateIssued',
            type: 'event',
            inputs: CONTRACT_ABI.find(abi => abi.name === 'CertificateIssued').inputs
          }, log);
          
          if (decodedLog) {
            console.log("✅ Evento CertificateIssued encontrado:", decodedLog);
            return {
              certificateId: decodedLog.returnValues.certificateId,
              recipientName: decodedLog.returnValues.recipientName,
              eventName: decodedLog.returnValues.eventName,
              issuer: decodedLog.returnValues.issuer,
              transactionHash: transactionHash,
              blockNumber: receipt.blockNumber,
              timestamp: Date.now() // Podríamos obtener el timestamp del bloque si el RPC lo permite
            };
          }
        } catch (error) {
          // Continuar con el siguiente log si este no es el evento que buscamos
          continue;
        }
      }
      
      throw new Error("No se encontró el evento CertificateIssued en la transacción");
      
    } catch (error) {
      console.error("Error obteniendo datos de la transacción:", error);
      throw error;
    }
  };

  const tryRPCConnection = async (rpcUrl) => {
    try {
      const web3 = new Web3(rpcUrl);
      // Probar la conexión obteniendo el block número más reciente
      const blockNumber = await web3.eth.getBlockNumber();
      console.log(`✅ RPC ${rpcUrl} funcionando. Block número:`, blockNumber);
      return { web3, rpcUrl, success: true, blockNumber };
    } catch (error) {
      console.log(`❌ RPC ${rpcUrl} falló:`, error.message);
      return { success: false, rpcUrl, error };
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
      console.log("🔗 Probando conexión a RPCs de Sonic Testnet...");
      
      // Probar diferentes RPCs hasta encontrar uno que funcione
      let workingConnection = null;
      
      for (const rpcUrl of SONIC_RPC_URLS) {
        const connection = await tryRPCConnection(rpcUrl);
        if (connection.success) {
          workingConnection = connection;
          break;
        }
      }

      if (!workingConnection) {
        throw new Error("No se pudo conectar a ningún RPC de Sonic Testnet. Todos los RPCs están fallando.");
      }

      const { web3, rpcUrl } = workingConnection;
      
      console.log("🔍 Buscando certificado por transacción:", searchInput);

      // Obtener los datos del certificado desde la transacción
      const certificateData = await getCertificateFromTransaction(web3, searchInput);

      setResult({
        isValid: true,
        certificateData,
        found: true,
        rpcUrl
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

  // Ejemplo con tu hash de transacción real
  const testExample = {
    type: "Hash de Transacción",
    value: "0xd3ed1584d1bf39c7f6e78d6d18b04c6b4b9fc510f6e58d3e918c56b3cf2da819",
    description: "Transacción de emisión para Jesus tincona - Crypto Cocha"
  };

  return (
    <div className="container">
      <header>
        <h1>🔍 Verificador de Certificados</h1>
        <p>Verifica certificados en <strong>SONIC TESTNET</strong> por Hash de Transacción</p>
        <div className="network-info">
          <p><strong>Método:</strong> Consulta directa a la blockchain por transacción</p>
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
          <button onClick={verifyCertificate} disabled={loading}>
            {loading ? '🔍 Verificando Transacción...' : 'Verificar por Transacción'}
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
                  <p><strong>Información para debugging:</strong></p>
                  <ul>
                    <li>El hash de transacción debe ser correcto</li>
                    <li>La transacción debe contener el evento CertificateIssued</li>
                    <li>Los RPCs de testnet pueden estar inestables</li>
                    <li>Revisa la consola del navegador (F12) para logs detallados</li>
                  </ul>
                  <p><strong>Hash probado:</strong> {searchInput}</p>
                </div>
              </div>
            ) : result.found && result.isValid ? (
              <div>
                <h3>✅ CERTIFICADO ENCONTRADO EN BLOCKCHAIN</h3>
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
                    <p>✅ <strong>Verificado en Blockchain SONIC</strong></p>
                    <small>Datos extraídos directamente del evento en la transacción</small>
                    <br />
                    <small><strong>RPC utilizado:</strong> {result.rpcUrl}</small>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3>❌ CERTIFICADO NO ENCONTRADO</h3>
                <p>No se pudo encontrar información del certificado en esta transacción.</p>
              </div>
            )}
          </div>
        )}

        <div className="instructions">
          <h3>📋 Cómo funciona:</h3>
          <div className="steps">
            <div className="step">
              <strong>1. Obtén el hash de la transacción</strong>
              <p>Es el hash único de cuando se emitió el certificado</p>
            </div>
            <div className="step">
              <strong>2. Pega el hash en el campo de búsqueda</strong>
              <p>Usa el botón de ejemplo para probar con datos reales</p>
            </div>
            <div className="step">
              <strong>3. El sistema lee los eventos de la blockchain</strong>
              <p>Extrae los datos del evento CertificateIssued</p>
            </div>
          </div>
          
          <div className="technical-info">
            <h4>🔧 Información Técnica:</h4>
            <p>Este método lee directamente los eventos emitidos por el contrato en la blockchain, sin necesidad de llamar a funciones del contrato.</p>
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
        .network-info {
          margin-top: 15px;
          padding: 10px;
          background: #e7f3ff;
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
        .technical-info {
          margin-top: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }
      `}</style>
    </div>
  );
}
