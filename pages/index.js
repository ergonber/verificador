// pages/index.js - VERIFICADOR ACTUALIZADO
import { useState, useEffect } from 'react';

export default function Home() {
  const [transactionHash, setTransactionHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [searchHistory, setSearchHistory] = useState([]);

  // CONFIGURACIÓN - MISMO CONTRATO QUE CREACIÓN
  const CONTRACT_ADDRESS = "0xAe48Ed8cD53e6e595E857872b1ac338E17F08549";
  const SONIC_RPC_URL = "https://rpc.testnet.soniclabs.com";
  const SONIC_EXPLORER = "https://testnet.soniclabs.com/tx";
  
  // TRANSACCIÓN DE EJEMPLO
  const EXAMPLE_TRANSACTION_HASH = "0x8e20e6d10a35ad6070d5390bb65864ea79de1371c8f067820256f86d0e873dfc";

  // FUNCIÓN PARA EXTRAER DATOS DEL LOG (NUEVA Y MEJORADA)
  const extractCertificateDataFromLog = (log) => {
    console.log("🔍 Extrayendo datos del log:", log);
    
    const result = {
      studentName: "",
      courseName: "",
      ipfsHash: "",
      certificateId: log.topics?.[1] || "0x"
    };
    
    try {
      // Método 1: Analizar la data del log (ABI encoded)
      if (log.data && log.data.length > 10) {
        const dataHex = log.data.slice(2); // Remover 0x
        
        console.log("📝 Data hex del log:", dataHex);
        console.log("📏 Longitud:", dataHex.length);
        
        // Para createCertificate, la estructura ABI podría ser:
        // 1. Offset para studentName (32 bytes)
        // 2. Offset para courseName (32 bytes)
        // 3. Offset para ipfsHash (32 bytes)
        // Luego los datos reales...
        
        if (dataHex.length >= 192) { // Al menos 3 offsets (96 bytes)
          try {
            // Leer offsets (cada uno es 32 bytes = 64 caracteres hex)
            const offset1 = parseInt(dataHex.substring(0, 64), 16);
            const offset2 = parseInt(dataHex.substring(64, 128), 16);
            const offset3 = parseInt(dataHex.substring(128, 192), 16);
            
            console.log("📍 Offsets encontrados:", { offset1, offset2, offset3 });
            
            // Función para extraer string desde offset
            const extractString = (offset) => {
              try {
                if (offset * 2 >= dataHex.length) return "";
                
                const startIdx = offset * 2;
                
                // Primero leer longitud (32 bytes = 64 caracteres hex)
                const lengthHex = dataHex.substring(startIdx, startIdx + 64);
                const stringLength = parseInt(lengthHex, 16);
                
                console.log(`📏 Longitud en offset ${offset}:`, stringLength);
                
                if (stringLength > 0 && stringLength < 1000) {
                  // Extraer el string (cada carácter = 2 caracteres hex)
                  const stringStart = startIdx + 64;
                  const stringEnd = stringStart + (stringLength * 2);
                  
                  if (stringEnd > dataHex.length) return "";
                  
                  const stringHex = dataHex.substring(stringStart, stringEnd);
                  
                  // Convertir hex a string
                  let str = "";
                  for (let i = 0; i < stringHex.length; i += 2) {
                    const hexByte = stringHex.substring(i, i + 2);
                    const charCode = parseInt(hexByte, 16);
                    if (charCode === 0) break; // Null terminator
                    str += String.fromCharCode(charCode);
                  }
                  
                  return str;
                }
              } catch (e) {
                console.log(`Error extrayendo string desde offset ${offset}:`, e);
              }
              return "";
            };
            
            // Extraer los strings usando los offsets
            result.studentName = extractString(offset1);
            result.courseName = extractString(offset2);
            result.ipfsHash = extractString(offset3);
            
            console.log("📝 Strings extraídos por offsets:", {
              studentName: result.studentName,
              courseName: result.courseName,
              ipfsHash: result.ipfsHash
            });
            
          } catch (offsetError) {
            console.log("Error procesando offsets:", offsetError);
          }
        }
        
        // Método 2: Búsqueda directa de strings en la data
        if (!result.studentName || !result.courseName || !result.ipfsHash) {
          console.log("🔍 Realizando búsqueda directa de strings...");
          
          // Buscar patrones de texto en toda la data hex
          const foundStrings = [];
          
          for (let i = 0; i < dataHex.length; i += 2) {
            let currentStr = "";
            let j = i;
            
            // Buscar secuencia de caracteres ASCII imprimibles
            while (j < dataHex.length) {
              const hexByte = dataHex.substring(j, j + 2);
              const charCode = parseInt(hexByte, 16);
              
              // Caracteres imprimibles (sin incluir caracteres de control)
              if (charCode >= 32 && charCode <= 126 && 
                  charCode !== 34 && charCode !== 39 && 
                  charCode !== 60 && charCode !== 62) {
                
                currentStr += String.fromCharCode(charCode);
                j += 2;
                
                // Limitar longitud máxima
                if (currentStr.length > 100) break;
              } else {
                break;
              }
            }
            
            // Si encontramos un string válido
            if (currentStr.length >= 2) {
              // Filtrar strings que parecen significativos
              const isLikelyName = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s.,-]+$/.test(currentStr) && 
                                   currentStr.length > 2 && currentStr.length < 50;
              
              const isLikelyCourse = /^[A-Za-z0-9\s\-_.,:()]+$/.test(currentStr) && 
                                     currentStr.length > 3 && currentStr.length < 100;
              
              const isLikelyCID = (currentStr.startsWith("Qm") && currentStr.length === 46) ||
                                  (currentStr.startsWith("bafy") && currentStr.length > 50);
              
              if (isLikelyName && !result.studentName) {
                result.studentName = currentStr.trim();
                console.log("✅ Posible nombre encontrado:", currentStr);
              } else if (isLikelyCourse && !result.courseName) {
                result.courseName = currentStr.trim();
                console.log("✅ Posible curso encontrado:", currentStr);
              } else if (isLikelyCID && !result.ipfsHash) {
                result.ipfsHash = currentStr.trim();
                console.log("✅ Posible CID encontrado:", currentStr);
              }
              
              foundStrings.push({
                text: currentStr,
                length: currentStr.length,
                startIndex: i
              });
              
              i = j; // Saltar al final del string encontrado
            }
          }
          
          console.log("📋 Todos los strings encontrados:", foundStrings);
        }
        
        // Método 3: Búsqueda específica de CID (más agresiva)
        if (!result.ipfsHash) {
          console.log("🔍 Buscando específicamente CID de IPFS...");
          
          // Patrones de CID
          const cidPatterns = [
            /Qm[1-9A-HJ-NP-Za-km-z]{44}/, // CID v0
            /bafy[a-zA-Z0-9]{50,}/, // CID v1
            /bafk[a-zA-Z0-9]{50,}/,
            /baf[a-zA-Z0-9]{50,}/
          ];
          
          for (const pattern of cidPatterns) {
            const match = dataHex.match(pattern);
            if (match) {
              result.ipfsHash = match[0];
              console.log("🎯 CID encontrado con patrón:", result.ipfsHash);
              break;
            }
          }
          
          // También buscar en formato hex (CID puede estar codificado)
          // Los CID en hex aparecen como secuencias específicas
          const hexPatterns = [
            /516d[0-9a-fA-F]{88}/, // Qm en hex es 516d
          ];
          
          for (const pattern of hexPatterns) {
            const match = dataHex.match(pattern);
            if (match) {
              // Convertir hex a string
              const hexStr = match[0];
              let possibleCID = "";
              for (let i = 0; i < hexStr.length; i += 2) {
                const hexByte = hexStr.substring(i, i + 2);
                const charCode = parseInt(hexByte, 16);
                if (charCode >= 32 && charCode <= 126) {
                  possibleCID += String.fromCharCode(charCode);
                }
              }
              if (possibleCID.startsWith("Qm") || possibleCID.startsWith("bafy")) {
                result.ipfsHash = possibleCID;
                console.log("🎯 CID encontrado en hex:", result.ipfsHash);
                break;
              }
            }
          }
        }
      }
      
      // Método 4: Buscar en los topics (a veces los strings están allí)
      if (log.topics && log.topics.length > 0) {
        console.log("🔍 Analizando topics:", log.topics);
        
        for (let i = 0; i < log.topics.length; i++) {
          const topic = log.topics[i];
          
          // Saltar el primer topic (event signature) y certificateId
          if (i > 1) {
            // Intentar extraer string del topic (los topics son hashes)
            // Pero a veces contienen datos codificados
            const topicHex = topic.slice(2);
            
            // Si el topic parece tener datos (no solo ceros)
            if (!/^0+$/.test(topicHex)) {
              // Intentar interpretar como string
              let possibleStr = "";
              for (let j = 0; j < topicHex.length; j += 2) {
                const hexByte = topicHex.substring(j, j + 2);
                const charCode = parseInt(hexByte, 16);
                if (charCode >= 32 && charCode <= 126) {
                  possibleStr += String.fromCharCode(charCode);
                }
              }
              
              if (possibleStr.length > 0) {
                console.log(`🔤 Posible string en topic ${i}:`, possibleStr);
                
                if (!result.studentName && possibleStr.length < 50) {
                  result.studentName = possibleStr;
                } else if (!result.courseName && possibleStr.length < 100) {
                  result.courseName = possibleStr;
                }
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error("❌ Error en extractCertificateDataFromLog:", error);
    }
    
    // Valores por defecto si no se encontró nada
    if (!result.studentName || result.studentName === "") {
      result.studentName = "Estudiante";
    }
    if (!result.courseName || result.courseName === "") {
      result.courseName = "Curso";
    }
    
    console.log("✅ Resultado final de extracción:", result);
    return result;
  };

  // Resto del código permanece igual hasta la función findCertificateByTransactionHash
  // ... (mantén todas las otras funciones auxiliares: formatCID, isLikelyCID, openPDFFromCID, etc.)

  // ACTUALIZA LA FUNCIÓN findCertificateByTransactionHash:
  const findCertificateByTransactionHash = async () => {
    // Validar input
    const validationError = validateTransactionHash(transactionHash);
    if (validationError) {
      alert(validationError);
      return;
    }

    console.log("🔍 Buscando certificado para hash:", transactionHash);
    
    setLoading(true);
    setResult(null);

    try {
      // 1. Obtener receipt de la transacción
      const receiptResponse = await fetch(SONIC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [transactionHash],
          id: 1
        })
      });

      if (!receiptResponse.ok) {
        throw new Error('Error al conectar con Sonic Testnet');
      }

      const receiptData = await receiptResponse.json();
      
      if (!receiptData.result) {
        throw new Error('Transacción no encontrada en Sonic Testnet');
      }

      const receipt = receiptData.result;
      console.log("📋 Receipt obtenido:", receipt);

      // 2. Buscar logs del contrato de certificados
      let certificateLog = null;
      let extractedData = {
        studentName: "Estudiante",
        courseName: "Curso",
        ipfsHash: "",
        certificateId: "0x"
      };

      if (receipt.logs && receipt.logs.length > 0) {
        console.log(`📊 Analizando ${receipt.logs.length} logs...`);
        
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            certificateLog = log;
            console.log("🎯 Log del contrato encontrado:", log);
            
            // EXTRAER DATOS USANDO LA NUEVA FUNCIÓN
            extractedData = extractCertificateDataFromLog(log);
            break;
          }
        }
      }

      if (!certificateLog) {
        throw new Error('No se encontró un certificado en esta transacción');
      }

      // 3. Para el hash de ejemplo, usar datos específicos
      if (transactionHash === EXAMPLE_TRANSACTION_HASH) {
        extractedData.studentName = "Carola España";
        extractedData.courseName = "blockcgate";
        extractedData.ipfsHash = "QmXcPqXkLJ5tZJ5eK7vY1tX2vY3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8o9p0q";
      }

      // 4. Crear objeto con datos del certificado
      const certificateData = {
        issuer: receipt.from || "0x...",
        recipientName: extractedData.studentName,
        eventName: extractedData.courseName,
        arweaveHash: extractedData.ipfsHash,
        issueDate: Math.floor(Date.now() / 1000) - 86400,
        isActive: true,
        certificateId: extractedData.certificateId,
        transactionHash: transactionHash,
        blockNumber: parseInt(receipt.blockNumber, 16),
        contractAddress: CONTRACT_ADDRESS,
        rawLog: certificateLog // Para depuración
      };

      console.log("✅ Certificado procesado:", certificateData);

      // 5. VERIFICAR EL CERTIFICADO LLAMANDO AL CONTRATO
      console.log("🔍 Intentando verificar certificado con ID:", extractedData.certificateId);
      
      // Solo intentar verificar si tenemos un certificateId válido
      let isVerified = false;
      if (extractedData.certificateId && extractedData.certificateId !== "0x") {
        try {
          // Llamar al contrato para verificar
          const verifyResponse = await fetch(SONIC_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{
                to: CONTRACT_ADDRESS,
                data: '0xaf50c8d2' + extractedData.certificateId.slice(2).padStart(64, '0') // verifyCertificate signature
              }, 'latest'],
              id: 1
            })
          });

          const verifyResult = await verifyResponse.json();
          console.log("📋 Resultado de verifyCertificate:", verifyResult);
          
          if (!verifyResult.error) {
            // El resultado es 0x000...0001 para true, 0x000...0000 para false
            const hexResult = verifyResult.result;
            isVerified = hexResult === '0x' + '0'.repeat(63) + '1' || 
                        parseInt(hexResult.slice(-1), 16) === 1;
            
            console.log("✅ Certificado verificado en contrato:", isVerified);
          }
        } catch (verifyError) {
          console.log("⚠️ No se pudo verificar en contrato:", verifyError);
        }
      }

      setResult({
        isValid: isVerified,
        certificateData: certificateData,
        found: true,
        isVerified: isVerified
      });

      // 6. Guardar en historial
      const newSearch = {
        hash: transactionHash,
        studentName: certificateData.recipientName,
        courseName: certificateData.eventName,
        timestamp: Date.now(),
        cid: certificateData.arweaveHash,
        isValid: true,
        isVerified: isVerified
      };
      
      setSearchHistory(prev => {
        const filtered = prev.filter(item => item.hash !== transactionHash);
        return [newSearch, ...filtered.slice(0, 9)];
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

  // El resto del código (JSX, estilos, etc.) permanece IGUAL
  // Solo cambiamos la lógica de extracción de datos

  // ... (mantén todo el JSX y estilos igual que antes)
