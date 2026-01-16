import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Importar dinámicamente las dependencias que usan window
const QrScanner = dynamic(
  () => import('qr-scanner').then(mod => mod.default || mod),
  { 
    ssr: false 
  }
);

const QRCode = dynamic(
  () => import('qrcode.react'),
  { 
    ssr: false 
  }
);

export default function VerifyCertificateQR() {
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [qrDataInput, setQrDataInput] = useState('');
  const [networkStatus, setNetworkStatus] = useState('checking');
  
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  
  // CONFIGURACIÓN
  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const SONIC_EXPLORER = "https://testnet.soniclabs.com/tx";
  
  // Función para convertir hex a string
  const hexToString = (hex) => {
    try {
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        const hexByte = hex.substr(i, 2);
        const charCode = parseInt(hexByte, 16);
        if (charCode === 0) break;
        str += String.fromCharCode(charCode);
      }
      return str;
    } catch (error) {
      console.log("Error convirtiendo hex a string:", error);
      return "";
    }
  };

  // Verificar estado de red
  const checkNetworkStatus = async () => {
    setNetworkStatus('checking');
    try {
      const response = await fetch(SONIC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          setNetworkStatus('connected');
          return;
        }
      }
      setNetworkStatus('disconnected');
    } catch (error) {
      console.log('Error de conexión:', error);
      setNetworkStatus('disconnected');
    }
  };

  useEffect(() => {
    checkNetworkStatus();
  }, []);

  // Iniciar escaneo de QR
  const startScanner = async () => {
    try {
      setError(null);
      setVerificationResult(null);
      
      if (typeof window === 'undefined') return;
      
      if (networkStatus !== 'connected') {
        throw new Error('No hay conexión con Sonic Testnet. Verifica tu conexión a internet.');
      }
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraActive(true);
      setIsScanning(true);
      
      // Inicializar QR Scanner
      const QrScannerLib = await import('qr-scanner');
      const QrScanner = QrScannerLib.default || QrScannerLib;
      
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        result => handleQRScan(result),
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 3,
          returnDetailedScanResult: true
        }
      );
      
      await qrScannerRef.current.start();
      
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setError(`Error: ${err.message}`);
      stopScanner();
    }
  };

  // Detener escaneo
  const stopScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
    setIsScanning(false);
  };

  // Manejar resultado del QR
  const handleQRScan = async (result) => {
    if (loading || !result?.data) return;
    
    stopScanner();
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('📱 QR escaneado:', result.data);
      
      let qrData;
      try {
        qrData = JSON.parse(result.data);
      } catch (e) {
        qrData = { certificateId: result.data };
      }
      
      if (!qrData.certificateId && !qrData.transactionHash) {
        throw new Error('El QR no contiene un ID de certificado o hash válido');
      }
      
      const certificateId = qrData.certificateId || qrData.transactionHash;
      const verificationResult = await verifyCertificateOnChain(certificateId, qrData);
      setVerificationResult(verificationResult);
      
    } catch (err) {
      console.error('❌ Error en verificación:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verificar certificado en la blockchain
  const verifyCertificateOnChain = async (certificateId, qrData = {}) => {
    try {
      // Buscar transacción por el hash
      const response = await fetch(SONIC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [certificateId],
          id: 1
        })
      });

      const data = await response.json();
      
      if (!data.result) {
        // Si no se encuentra por receipt, intentar como transaction
        const txResponse = await fetch(SONIC_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionByHash',
            params: [certificateId],
            id: 2
          })
        });
        
        const txData = await txResponse.json();
        
        if (!txData.result) {
          throw new Error('Certificado no encontrado en la blockchain');
        }
        
        return {
          success: true,
          message: '✅ Transacción encontrada en blockchain',
          certificateData: {
            certificateId: certificateId,
            transactionHash: certificateId,
            from: txData.result.from,
            to: txData.result.to,
            status: 'Transacción pendiente de confirmación'
          },
          explorerUrl: `${SONIC_EXPLORER}/${certificateId}`,
          contractUrl: `https://testnet.soniclabs.com/address/${CONTRACT_ADDRESS}`,
          qrData: qrData
        };
      }

      const receipt = data.result;
      
      // Extraer datos del certificado
      let certificateData = {
        certificateId: certificateId,
        transactionHash: receipt.transactionHash,
        blockNumber: parseInt(receipt.blockNumber, 16),
        status: receipt.status === '0x1' ? '✅ Confirmado' : '❌ Fallido',
        from: receipt.from,
        to: receipt.to,
        contractAddress: CONTRACT_ADDRESS,
        qrData: qrData
      };

      // Buscar logs del contrato
      let contractLogFound = false;
      if (receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            contractLogFound = true;
            certificateData.contractLog = {
              address: log.address,
              topics: log.topics,
              data: log.data
            };
            break;
          }
        }
      }
      
      certificateData.contractLogFound = contractLogFound;

      return {
        success: true,
        message: '✅ Certificado verificado en blockchain',
        certificateData: certificateData,
        explorerUrl: `${SONIC_EXPLORER}/${certificateId}`,
        contractUrl: `https://testnet.soniclabs.com/address/${CONTRACT_ADDRESS}`,
        qrData: qrData
      };
      
    } catch (err) {
      console.error('Error verificando certificado:', err);
      return {
        success: false,
        message: '❌ Error verificando certificado',
        error: err.message,
        qrData: qrData
      };
    }
  };

  // Verificar manualmente con datos JSON
  const verifyManual = async () => {
    if (!qrDataInput.trim()) {
      setError('Por favor ingresa datos JSON o un hash de transacción');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let qrData;
      try {
        qrData = JSON.parse(qrDataInput);
      } catch (e) {
        qrData = { certificateId: qrDataInput.trim() };
      }
      
      const certificateId = qrData.certificateId || qrData.transactionHash || qrDataInput.trim();
      const verificationResult = await verifyCertificateOnChain(certificateId, qrData);
      setVerificationResult(verificationResult);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Limpiar resultados
  const clearResults = () => {
    setVerificationResult(null);
    setError(null);
    setQrDataInput('');
  };

  // Generar QR de ejemplo
  const generateExampleQR = () => {
    const exampleData = {
      certificateId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      studentName: "Juan Pérez",
      courseName: "Blockchain Avanzado",
      courseHash: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      date: "2024-01-16",
      grade: "95%",
      issuer: "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549",
      network: "Sonic Testnet"
    };
    
    setQrDataInput(JSON.stringify(exampleData, null, 2));
    setShowQRGenerator(true);
  };

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      minHeight: '100vh'
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
      paddingBottom: '20px',
      borderBottom: '2px solid #f0f0f0'
    },
    h1: {
      fontSize: '2.5em',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '10px'
    },
    subtitle: {
      color: '#666',
      fontSize: '1.1em',
      marginBottom: '20px'
    },
    networkStatus: {
      display: 'inline-block',
      padding: '12px 24px',
      borderRadius: '50px',
      fontWeight: '600',
      marginTop: '10px',
      background: networkStatus === 'connected' ? '#d1fae5' : 
                 networkStatus === 'disconnected' ? '#fee2e2' : '#fef3c7',
      color: networkStatus === 'connected' ? '#065f46' : 
             networkStatus === 'disconnected' ? '#991b1b' : '#92400e',
      border: `2px solid ${networkStatus === 'connected' ? '#10b981' : 
                          networkStatus === 'disconnected' ? '#ef4444' : '#f59e0b'}`
    }
  };

  return (
    <>
      <Head>
        <title>Verificador QR de Certificados - Sonic Testnet</title>
        <meta name="description" content="Verifica certificados con QR en la blockchain de Sonic Testnet" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        minHeight: '100vh'
      }}>
        <div style={styles.container}>
          <header style={styles.header}>
            <h1 style={styles.h1}>📱 Verificador QR de Certificados</h1>
            <p style={styles.subtitle}>
              Escanea códigos QR para verificar certificados en <strong>Sonic Testnet</strong>
            </p>
            
            <div style={{marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap'}}>
              <Link href="/" legacyBehavior>
                <a style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🔍 Verificar con Hash
                </a>
              </Link>
              <Link href="/create" legacyBehavior>
                <a style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🎓 Crear Certificado
                </a>
              </Link>
            </div>
            
            <div style={styles.networkStatus}>
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                marginRight: '8px',
                background: networkStatus === 'connected' ? '#10b981' : 
                           networkStatus === 'disconnected' ? '#ef4444' : '#f59e0b',
                animation: networkStatus === 'checking' ? 'pulse 1s infinite' : 'none'
              }}></span>
              
              {networkStatus === 'checking' && 'Conectando a Sonic Testnet...'}
              {networkStatus === 'connected' && '✅ CONECTADO A SONIC TESTNET'}
              {networkStatus === 'disconnected' && (
                <>
                  ❌ ERROR DE CONEXIÓN
                  <button 
                    onClick={checkNetworkStatus}
                    style={{
                      marginLeft: '10px',
                      padding: '4px 12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9em'
                    }}
                  >
                    Reintentar
                  </button>
                </>
              )}
            </div>
            
            <div style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#dbeafe',
              color: '#1e40af',
              borderRadius: '50px',
              fontWeight: '600',
              border: '2px solid #93c5fd'
            }}>
              🔗 SIN WALLET REQUERIDA - SOLO LECTURA
            </div>
          </header>

          <main>
            {/* Botón para escanear */}
            {!cameraActive && !verificationResult && (
              <div style={{
                background: '#f8fafc',
                padding: '40px',
                borderRadius: '15px',
                textAlign: 'center',
                marginBottom: '30px',
                border: '2px solid #e2e8f0'
              }}>
                <h2 style={{color: '#2d3748', marginBottom: '20px', fontSize: '1.8em'}}>
                  Escanea un código QR
                </h2>
                
                <button 
                  onClick={startScanner}
                  disabled={loading || isScanning || networkStatus !== 'connected'}
                  style={{
                    padding: '18px 36px',
                    background: networkStatus === 'connected' 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '20px',
                    fontWeight: '600',
                    cursor: networkStatus === 'connected' ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '15px',
                    marginBottom: '25px',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => {
                    if (networkStatus === 'connected' && !loading && !isScanning) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        border: '3px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <span style={{fontSize: '1.5em'}}>📷</span>
                      Iniciar Escáner QR
                    </>
                  )}
                </button>
                
                {networkStatus !== 'connected' && (
                  <p style={{color: '#dc2626', marginBottom: '15px', fontWeight: '600'}}>
                    ⚠️ Conecta a Sonic Testnet antes de escanear
                  </p>
                )}
                
                <p style={{color: '#6b7280', marginBottom: '20px', fontSize: '1.1em'}}>
                  O{' '}
                  <button 
                    onClick={() => setShowQRGenerator(!showQRGenerator)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      fontWeight: '600',
                      textDecoration: 'underline',
                      fontSize: '1.1em'
                    }}
                  >
                    ingresa los datos manualmente
                  </button>
                </p>
                
                <div style={{display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap'}}>
                  <button 
                    onClick={generateExampleQR}
                    style={{
                      padding: '12px 24px',
                      background: '#f3f4f6',
                      color: '#4b5563',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '500'
                    }}
                  >
                    Ver ejemplo de datos QR
                  </button>
                </div>
              </div>
            )}

            {/* Escáner de cámara */}
            {cameraActive && (
              <div style={{
                background: '#1f2937',
                padding: '25px',
                borderRadius: '15px',
                marginBottom: '30px',
                color: 'white'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '15px'
                }}>
                  <h3 style={{fontSize: '1.3em', display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <span style={{fontSize: '1.5em'}}>📱</span>
                    Escaneando código QR
                  </h3>
                  <button 
                    onClick={stopScanner}
                    style={{
                      padding: '10px 20px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>❌</span>
                    Detener Escáner
                  </button>
                </div>
                
                <div style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '600px',
                  margin: '0 auto',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '3px solid #374151'
                }}>
                  <video 
                    ref={videoRef}
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      borderRadius: '10px'
                    }}
                    playsInline
                    autoPlay
                  />
                  
                  {/* Overlay para guía de escaneo */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '70%',
                      height: '70%',
                      border: '4px solid #10b981',
                      borderRadius: '20px',
                      boxShadow: '0 0 0 1000px rgba(0, 0, 0, 0.7)',
                      animation: 'pulse 2s infinite'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      bottom: '30px',
                      left: 0,
                      width: '100%',
                      textAlign: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.1em',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                      padding: '0 20px'
                    }}>
                      Coloca el código QR dentro del marco
                    </div>
                  </div>
                </div>
                
                <p style={{
                  textAlign: 'center',
                  marginTop: '20px',
                  color: '#d1d5db',
                  fontSize: '0.95em'
                }}>
                  💡 Usa la cámara trasera para mejor calidad
                </p>
              </div>
            )}

            {/* Input manual */}
            {(showQRGenerator || qrDataInput) && !cameraActive && (
              <div style={{
                background: '#f8fafc',
                padding: '30px',
                borderRadius: '15px',
                marginBottom: '30px',
                border: '2px solid #e2e8f0'
              }}>
                <h3 style={{color: '#2d3748', marginBottom: '20px', fontSize: '1.4em'}}>
                  📝 Ingreso manual de datos
                </h3>
                
                <textarea
                  value={qrDataInput}
                  onChange={(e) => setQrDataInput(e.target.value)}
                  placeholder={`Pega aquí los datos JSON del QR. Ejemplo:\n{\n  "certificateId": "0x...",\n  "studentName": "Juan Pérez",\n  "courseName": "Blockchain Avanzado"\n}`}
                  style={{
                    width: '100%',
                    minHeight: '180px',
                    padding: '18px',
                    border: '2px solid #cbd5e0',
                    borderRadius: '10px',
                    fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                    fontSize: '15px',
                    marginBottom: '20px',
                    resize: 'vertical',
                    lineHeight: '1.5'
                  }}
                />
                
                <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                  <button 
                    onClick={verifyManual}
                    disabled={loading || !qrDataInput.trim() || networkStatus !== 'connected'}
                    style={{
                      padding: '14px 28px',
                      background: networkStatus === 'connected' ? '#3b82f6' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '600',
                      fontSize: '16px',
                      cursor: networkStatus === 'connected' ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flex: 1,
                      justifyContent: 'center'
                    }}
                  >
                    {loading ? (
                      <>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: 'white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Verificando...
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        Verificar Datos
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => setShowQRGenerator(false)}
                    style={{
                      padding: '14px 28px',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '16px',
                      flex: 1,
                      justifyContent: 'center'
                    }}
                  >
                    Cerrar
                  </button>
                </div>
                
                {/* Mostrar QR generado si hay datos */}
                {qrDataInput && (
                  <div style={{
                    marginTop: '30px',
                    padding: '25px',
                    background: 'white',
                    borderRadius: '12px',
                    textAlign: 'center',
                    border: '2px solid #e5e7eb'
                  }}>
                    <h4 style={{marginBottom: '20px', color: '#4b5563', fontSize: '1.2em'}}>
                      Código QR generado:
                    </h4>
                    <div style={{
                      display: 'inline-block',
                      padding: '25px',
                      background: 'white',
                      borderRadius: '12px',
                      border: '3px solid #e5e7eb',
                      boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
                    }}>
                      {typeof window !== 'undefined' && QRCode && (
                        <QRCode 
                          value={qrDataInput} 
                          size={220} 
                          level="H" 
                          includeMargin={true}
                          bgColor="#ffffff"
                          fgColor="#000000"
                        />
                      )}
                    </div>
                    <p style={{
                      marginTop: '15px',
                      fontSize: '0.95em',
                      color: '#6b7280',
                      maxWidth: '500px',
                      margin: '15px auto 0',
                      lineHeight: '1.5'
                    }}>
                      Escanea este código QR desde otro dispositivo para compartir los datos del certificado
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Mensajes de error */}
            {error && (
              <div style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '25px',
                borderRadius: '12px',
                marginBottom: '25px',
                border: '3px solid #ef4444'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  marginBottom: '15px'
                }}>
                  <span style={{fontSize: '2em'}}>❌</span>
                  <h3 style={{fontSize: '1.3em'}}>Error en la verificación</h3>
                </div>
                <p style={{
                  background: 'rgba(255,255,255,0.7)',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                  fontSize: '0.95em',
                  lineHeight: '1.5'
                }}>
                  {error}
                </p>
                <button 
                  onClick={() => setError(null)}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '16px'
                  }}
                >
                  Cerrar y reintentar
                </button>
              </div>
            )}

            {/* Resultados de verificación */}
            {verificationResult && (
              <div style={{
                background: verificationResult.success 
                  ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                  : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                padding: '30px',
                borderRadius: '15px',
                marginBottom: '30px',
                border: `3px solid ${verificationResult.success ? '#10b981' : '#ef4444'}`,
                color: verificationResult.success ? '#065f46' : '#991b1b',
                animation: 'fadeIn 0.5s ease'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '25px',
                  flexWrap: 'wrap',
                  gap: '15px'
                }}>
                  <div>
                    <h2 style={{
                      fontSize: '1.8em',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{fontSize: '1.5em'}}>
                        {verificationResult.success ? '✅' : '❌'}
                      </span>
                      {verificationResult.success ? 'Certificado Verificado' : 'Verificación Fallida'}
                    </h2>
                    <p style={{fontSize: '1.1em', opacity: 0.9}}>
                      {verificationResult.message}
                    </p>
                  </div>
                  <button 
                    onClick={clearResults}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(0,0,0,0.1)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '16px',
                      color: 'inherit'
                    }}
                  >
                    ✖ Cerrar
                  </button>
                </div>
                
                {verificationResult.success && verificationResult.certificateData && (
                  <div style={{
                    background: 'rgba(255,255,255,0.8)',
                    padding: '25px',
                    borderRadius: '12px',
                    color: '#1f2937',
                    marginTop: '20px'
                  }}>
                    <h4 style={{
                      marginBottom: '20px',
                      color: '#374151',
                      fontSize: '1.3em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span>📋</span>
                      Detalles del Certificado
                    </h4>
                    
                    <div style={{
                      display: 'grid',
                      gap: '15px',
                      marginBottom: '25px'
                    }}>
                      {verificationResult.certificateData.qrData?.studentName && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '15px',
                          background: 'rgba(255,255,255,0.9)',
                          borderRadius: '10px',
                          borderLeft: '4px solid #10b981'
                        }}>
                          <strong style={{minWidth: '200px', color: '#4b5563'}}>👤 Estudiante:</strong>
                          <span style={{fontSize: '1.1em', fontWeight: '600'}}>
                            {verificationResult.certificateData.qrData.studentName}
                          </span>
                        </div>
                      )}
                      
                      {verificationResult.certificateData.qrData?.courseName && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '15px',
                          background: 'rgba(255,255,255,0.9)',
                          borderRadius: '10px',
                          borderLeft: '4px solid #3b82f6'
                        }}>
                          <strong style={{minWidth: '200px', color: '#4b5563'}}>🎓 Curso:</strong>
                          <span style={{fontSize: '1.1em', fontWeight: '500'}}>
                            {verificationResult.certificateData.qrData.courseName}
                          </span>
                        </div>
                      )}
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '15px',
                        background: 'rgba(255,255,255,0.9)',
                        borderRadius: '10px',
                        borderLeft: '4px solid #f59e0b'
                      }}>
                        <strong style={{minWidth: '200px', color: '#4b5563'}}>📫 Hash de Transacción:</strong>
                        <code style={{
                          fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                          fontSize: '0.95em',
                          wordBreak: 'break-all',
                          background: 'rgba(0,0,0,0.05)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          flex: 1
                        }}>
                          {verificationResult.certificateData.transactionHash}
                        </code>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '15px',
                        background: 'rgba(255,255,255,0.9)',
                        borderRadius: '10px',
                        borderLeft: '4px solid #8b5cf6'
                      }}>
                        <strong style={{minWidth: '200px', color: '#4b5563'}}>🔢 Block Number:</strong>
                        <span style={{
                          fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                          fontWeight: '600',
                          fontSize: '1.1em'
                        }}>
                          {verificationResult.certificateData.blockNumber}
                        </span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '15px',
                        background: 'rgba(255,255,255,0.9)',
                        borderRadius: '10px',
                        borderLeft: '4px solid verificationResult.certificateData.status.includes("✅") ? #10b981 : #ef4444'
                      }}>
                        <strong style={{minWidth: '200px', color: '#4b5563'}}>📊 Estado:</strong>
                        <span style={{
                          padding: '8px 16px',
                          background: verificationResult.certificateData.status.includes("✅") ? '#10b981' : '#ef4444',
                          color: 'white',
                          borderRadius: '20px',
                          fontSize: '0.95em',
                          fontWeight: '600'
                        }}>
                          {verificationResult.certificateData.status}
                        </span>
                      </div>
                      
                      {verificationResult.certificateData.contractLogFound && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '15px',
                          background: 'rgba(255,255,255,0.9)',
                          borderRadius: '10px',
                          borderLeft: '4px solid #10b981'
                        }}>
                          <strong style={{minWidth: '200px', color: '#4b5563'}}>📄 Log del Contrato:</strong>
                          <span style={{
                            color: '#059669',
                            fontWeight: '600',
                            fontSize: '1.1em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>✅</span>
                            ENCONTRADO
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div style={{
                      marginTop: '25px',
                      display: 'flex',
                      gap: '20px',
                      flexWrap: 'wrap',
                      justifyContent: 'center'
                    }}>
                      <a 
                        href={verificationResult.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '14px 28px',
                          background: '#3b82f6',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '10px',
                          fontWeight: '600',
                          fontSize: '16px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.3s',
                          flex: 1,
                          justifyContent: 'center',
                          maxWidth: '300px'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.boxShadow = '0 7px 20px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <span style={{fontSize: '1.2em'}}>🔍</span>
                        Ver en Sonic Explorer
                      </a>
                      
                      <a 
                        href={verificationResult.contractUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '14px 28px',
                          background: '#6b7280',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '10px',
                          fontWeight: '600',
                          fontSize: '16px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.3s',
                          flex: 1,
                          justifyContent: 'center',
                          maxWidth: '300px'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.boxShadow = '0 7px 20px rgba(107, 114, 128, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <span style={{fontSize: '1.2em'}}>📄</span>
                        Ver Contrato
                      </a>
                    </div>
                    
                    {verificationResult.certificateData.qrData?.courseHash && (
                      <div style={{
                        marginTop: '25px',
                        padding: '20px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '10px',
                        borderLeft: '4px solid #3b82f6'
                      }}>
                        <h5 style={{
                          color: '#1e40af',
                          marginBottom: '10px',
                          fontSize: '1.1em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span>📁</span>
                          Documento del Certificado
                        </h5>
                        <p style={{color: '#4b5563', marginBottom: '15px'}}>
                          El certificado PDF está disponible en IPFS:
                        </p>
                        <code style={{
                          display: 'block',
                          background: 'rgba(255,255,255,0.9)',
                          padding: '12px',
                          borderRadius: '8px',
                          fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                          fontSize: '0.9em',
                          wordBreak: 'break-all',
                          marginBottom: '15px'
                        }}>
                          {verificationResult.certificateData.qrData.courseHash}
                        </code>
                        <a 
                          href={`https://gateway.pinata.cloud/ipfs/${verificationResult.certificateData.qrData.courseHash.replace('ipfs://', '').replace('/ipfs/', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '10px 20px',
                            background: '#8b5cf6',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '15px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}
                        >
                          <span>📥</span>
                          Ver Certificado PDF
                        </a>
                      </div>
                    )}
                  </div>
                )}
                
                {verificationResult.error && (
                  <div style={{
                    background: 'rgba(255,255,255,0.9)',
                    padding: '20px',
                    borderRadius: '10px',
                    marginTop: '20px',
                    borderLeft: '4px solid #ef4444'
                  }}>
                    <h5 style={{color: '#991b1b', marginBottom: '10px'}}>Detalles del Error:</h5>
                    <p style={{
                      fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                      fontSize: '0.95em',
                      color: '#991b1b',
                      background: 'rgba(239, 68, 68, 0.1)',
                      padding: '15px',
                      borderRadius: '8px'
                    }}>
                      {verificationResult.error}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Instrucciones */}
            <div style={{
              marginTop: '40px',
              padding: '30px',
              background: '#f8fafc',
              borderRadius: '15px',
              border: '2px solid #e2e8f0'
            }}>
              <h3 style={{
                color: '#2d3748',
                fontSize: '1.4em',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span>📋</span>
                Instrucciones de Uso
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '25px'
              }}>
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '15px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: '#10b981',
                      color: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '1.2em'
                    }}>1</div>
                    <h4 style={{color: '#374151', fontSize: '1.1em'}}>Haz clic en "Iniciar Escáner QR"</h4>
                  </div>
                  <p style={{color: '#6b7280', lineHeight: '1.6'}}>
                    Permite el acceso a la cámara cuando tu navegador lo solicite.
                  </p>
                </div>
                
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '15px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: '#3b82f6',
                      color: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '1.2em'
                    }}>2</div>
                    <h4 style={{color: '#374151', fontSize: '1.1em'}}>Apunta al código QR</h4>
                  </div>
                  <p style={{color: '#6b7280', lineHeight: '1.6'}}>
                    Coloca el código QR del certificado dentro del marco en pantalla.
                  </p>
                </div>
                
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '15px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: '#8b5cf6',
                      color: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '1.2em'
                    }}>3</div>
                    <h4 style={{color: '#374151', fontSize: '1.1em'}}>Verifica los resultados</h4>
                  </div>
                  <p style={{color: '#6b7280', lineHeight: '1.6'}}>
                    Los datos se verificarán automáticamente en Sonic Testnet.
                  </p>
                </div>
              </div>
              
              <div style={{
                padding: '20px',
                background: '#e7f3ff',
                borderRadius: '10px',
                borderLeft: '4px solid #3b82f6',
                marginTop: '20px'
              }}>
                <p style={{color: '#1e40af', lineHeight: '1.7', fontSize: '1.05em'}}>
                  <strong>💡 Nota importante:</strong> Esta herramienta solo lee datos de la blockchain de Sonic Testnet. 
                  No se requiere conexión de wallet. Para emitir certificados, usa la herramienta de creación.
                </p>
              </div>
            </div>

            {/* Información del sistema */}
            <div style={{
              marginTop: '40px',
              paddingTop: '25px',
              borderTop: '3px solid #e5e7eb'
            }}>
              <h3 style={{
                color: '#2d3748',
                fontSize: '1.4em',
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span>🔧</span>
                Información del Sistema
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                background: '#f8fafc',
                padding: '25px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0'
              }}>
                <div style={{
                  padding: '20px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb'
                }}>
                  <strong style={{color: '#4b5563', display: 'block', marginBottom: '8px'}}>🌐 Red Blockchain:</strong>
                  <div style={{
                    fontWeight: '600',
                    color: '#1f2937',
                    fontSize: '1.1em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      width: '12px',
                      height: '12px',
                      background: networkStatus === 'connected' ? '#10b981' : '#ef4444',
                      borderRadius: '50%',
                      display: 'inline-block'
                    }}></span>
                    Sonic Testnet
                  </div>
                </div>
                
                <div style={{
                  padding: '20px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb'
                }}>
                  <strong style={{color: '#4b5563', display: 'block', marginBottom: '8px'}}>🔗 ChainID:</strong>
                  <div style={{
                    fontWeight: '600',
                    fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                    color: '#1f2937',
                    fontSize: '1.1em'
                  }}>14601</div>
                </div>
                
                <div style={{
                  padding: '20px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb'
                }}>
                  <strong style={{color: '#4b5563', display: 'block', marginBottom: '8px'}}>📄 Contrato:</strong>
                  <div style={{
                    fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                    fontSize: '0.9em',
                    wordBreak: 'break-all',
                    color: '#6b7280'
                  }}>
                    {CONTRACT_ADDRESS}
                  </div>
                </div>
                
                <div style={{
                  padding: '20px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb'
                }}>
                  <strong style={{color: '#4b5563', display: 'block', marginBottom: '8px'}}>⚡ Tipo de Verificación:</strong>
                  <div style={{
                    fontWeight: '600',
                    color: '#059669',
                    fontSize: '1.1em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>🔓</span>
                    Lectura Directa (Sin Wallet)
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Estilos globales */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        button:hover:not(:disabled) {
          opacity: 0.9;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        a {
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        ::selection {
          background: rgba(102, 126, 234, 0.3);
          color: #000;
        }
        @media (max-width: 768px) {
          .container {
            padding: 15px !important;
          }
          h1 {
            font-size: 2em !important;
          }
        }
      `}</style>
    </>
  );
}
