import { useState } from 'react';
import Web3 from 'web3';

export default function Home() {
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // CONFIGURA ESTO CON TU CONTRATO REAL
  const CONTRACT_ADDRESS = "0xTU_CONTRACT_ADDRESS_AQUI";
  const CONTRACT_ABI = [
    {
      "inputs": [
        {"internalType": "bytes32", "name": "_certificateId", "type": "bytes32"}
      ],
      "name": "verifyCertificate",
      "outputs": [
        {"internalType": "bool", "name": "", "type": "bool"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "string", "name": "_arweaveHash", "type": "string"}
      ],
      "name": "verifyCertificateByHash",
      "outputs": [
        {"internalType": "bool", "name": "", "type": "bool"},
        {"internalType": "bytes32", "name": "", "type": "bytes32"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "bytes32", "name": "_certificateId", "type": "bytes32"}
      ],
      "name": "getCertificate",
      "outputs": [
        {"internalType": "address", "name": "issuer", "type": "address"},
        {"internalType": "string", "name": "recipientName", "type": "string"},
        {"internalType": "string", "name": "eventName", "type": "string"},
        {"internalType": "string", "name": "arweaveHash", "type": "string"},
        {"internalType": "uint256", "name": "issueDate", "type": "uint256"},
        {"internalType": "bool", "name": "isActive", "type": "bool"}
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  const verifyCertificate = async () => {
    if (!searchInput.trim()) {
      alert("Por favor ingresa un hash o ID del certificado");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask no detectado");
      }

      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

      let isValid = false;
      let certificateData = null;
      let certificateId = null;

      // Intentar como hash Arweave
      if (searchInput.length === 43 || searchInput.startsWith('_')) {
        try {
          const result = await contract.methods.verifyCertificateByHash(searchInput).call();
          isValid = result[0];
          certificateId = result[1];
          
          if (isValid) {
            certificateData = await contract.methods.getCertificate(certificateId).call();
          }
        } catch (error) {
          console.log("No es un hash válido");
        }
      }

      // Intentar como certificateId
      if (!isValid && searchInput.length === 66 && searchInput.startsWith('0x')) {
        try {
          isValid = await contract.methods.verifyCertificate(searchInput).call();
          if (isValid) {
            certificateData = await contract.methods.getCertificate(searchInput).call();
            certificateId = searchInput;
          }
        } catch (error) {
          console.log("No es un ID válido");
        }
      }

      setResult({
        isValid,
        certificateData,
        certificateId
      });

    } catch (error) {
      setResult({
        isValid: false,
        error: error.message
      });
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <header>
        <h1>🔍 Verificador de Certificados</h1>
        <p>Verifica la autenticidad de tus certificados en blockchain</p>
      </header>

      <main>
        <div className="search-box">
          <input
            type="text"
            placeholder="Ingresa ID (0x...) o hash Arweave"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && verifyCertificate()}
          />
          <button onClick={verifyCertificate} disabled={loading}>
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </div>

        {result && (
          <div className={`result ${result.isValid ? 'valid' : 'invalid'}`}>
            {result.error ? (
              <div>
                <h3>❌ Error</h3>
                <p>{result.error}</p>
              </div>
            ) : result.isValid ? (
              <div>
                <h3>✅ CERTIFICADO VÁLIDO</h3>
                <div className="certificate-info">
                  <p><strong>Nombre:</strong> {result.certificateData.recipientName}</p>
                  <p><strong>Evento:</strong> {result.certificateData.eventName}</p>
                  <p><strong>Fecha:</strong> {new Date(result.certificateData.issueDate * 1000).toLocaleDateString()}</p>
                </div>
              </div>
            ) : (
              <div>
                <h3>❌ CERTIFICADO NO VÁLIDO</h3>
                <p>No se encontró o fue revocado</p>
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        header {
          text-align: center;
          margin-bottom: 40px;
        }
        h1 {
          color: #333;
        }
        .search-box {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        input {
          flex: 1;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
        }
        button {
          padding: 12px 24px;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        button:disabled {
          background: #ccc;
        }
        .result {
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .valid {
          background: #f0fff0;
          border-left: 5px solid green;
        }
        .invalid {
          background: #fff0f0;
          border-left: 5px solid red;
        }
        .certificate-info {
          margin-top: 15px;
        }
      `}</style>
    </div>
  );
}
