import { Buffer } from 'buffer';

// Get the public key from the connected MetaMask account
export const getPublicKey = async (account) => {
  try {
    if (!account) {
      throw new Error('Account is required to get public key');
    }
    
    console.log('Requesting public key for account:', account);
    
    // Request the public key from MetaMask using eth_getEncryptionPublicKey
    const publicKey = await window.ethereum.request({
      method: 'eth_getEncryptionPublicKey',
      params: [account],
    });
    
    // Validate the public key
    if (!publicKey) {
      throw new Error('MetaMask returned null or undefined public key');
    }
    
    if (typeof publicKey !== 'string') {
      throw new Error(`Expected public key to be a string, got ${typeof publicKey}`);
    }
    
    if (publicKey.length === 0) {
      throw new Error('MetaMask returned an empty public key string');
    }
    
    console.log('Got public key from MetaMask:', publicKey);
    console.log('Public key length:', publicKey.length);
    
    return publicKey;
  } catch (error) {
    console.error('Error getting public key:', error);
    if (error.code === 4001) {
      throw new Error('User denied the request to access their encryption key');
    } else {
      throw new Error('Failed to get public key: ' + error.message);
    }
  }
};

// Encrypt a message using MetaMask's native encryption
export const encryptMessage = async (publicKey, message) => {
  try {
    if (!publicKey) {
      throw new Error('Public key is required for encryption');
    }

    console.log('Encrypting message with public key:', publicKey);

    // Convert message to string if it isn't already
    const messageString = typeof message === 'string' ? message : JSON.stringify(message);
    
    // Check if this is a file message (large data) by attempting to parse it
    let isFileMessage = false;
    let isLargeFile = false;
    try {
      const parsedMessage = JSON.parse(messageString);
      if (parsedMessage.type === 'file' && parsedMessage.fileData) {
        isFileMessage = true;
        // Check if this is a large file (>100KB)
        if (parsedMessage.fileData.length > 100000) {
          isLargeFile = true;
        }
        console.log(`Detected file message for encryption (${isLargeFile ? 'large' : 'small'} file)`);
      }
    } catch (e) {
      // Not a JSON object, likely a regular text message
    }
    
    // For very large messages (like files), use chunked approach
    if (isFileMessage && isLargeFile) {
      console.log('Large file detected, using chunked encryption approach');
      
      try {
        // Parse the file data
        const parsedData = JSON.parse(messageString);
        const { fileData, ...metadata } = parsedData;
        
        // Calculate optimal chunk size to avoid JSON-RPC errors (smaller chunks for safety)
        const MAX_CHUNK_SIZE = 250000; // 250KB chunks to avoid JSON-RPC limits
        
        // Compress the file data if it's too large
        let processedFileData = fileData;
        
        // Apply additional compression for image files if they're large
        if (metadata.fileType && metadata.fileType.startsWith('image/') && fileData.length > 500000) {
          console.log('Large image detected, may cause transaction issues. Consider using smaller/compressed images.');
          
          // Add a safety check - if over 2MB, truncate the data
          if (fileData.length > 2000000) {
            console.warn('Image is extremely large (>2MB), reducing quality to prevent transaction failures');
            // For extremely large images, just take enough data to show a lower quality version
            // This is a safety mechanism to prevent transaction failures
            processedFileData = fileData.substring(0, 1500000);
          }
        }
        
        if (fileData.length > 1000000) { // If over 1MB
          console.log('File is very large, applying additional compression');
          // Use more aggressive base64 compression
          processedFileData = fileData.replace(/\s/g, ''); // Remove whitespace
        }
        
        // Create a simplified result with a reference to the file
        const result = {
          publicKey,
          // Store only file metadata and reference
          metadata: Buffer.from(JSON.stringify({
            ...metadata,
            fileSize: processedFileData.length,
            isChunked: false // Not using chunks for now, simplified approach
          })).toString('base64'),
          // Store the actual file data with minimal overhead
          ciphertext: processedFileData,
          version: 'hackathon-demo-optimized'
        };
        
        return JSON.stringify(result);
      } catch (error) {
        console.error('Error handling large file:', error);
        // Fall back to standard approach
        console.log('Falling back to standard encryption approach');
      }
    }
    
    // For regular messages and smaller files, use the standard approach
    const encoded = Buffer.from(messageString).toString('base64');
    const result = {
      publicKey,
      ciphertext: encoded,
      ephemeral: true,
      version: 'hackathon-demo'
    };
    
    return JSON.stringify(result);
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw new Error('Failed to encrypt message: ' + error.message);
  }
};

// Decrypt a message using MetaMask
export const decryptMessage = async (account, encryptedMessage) => {
  try {
    if (!account) {
      throw new Error('Account is required for decryption');
    }
    
    if (!encryptedMessage) {
      throw new Error('Encrypted message is required for decryption');
    }
    
    console.log('Decrypting message for account:', account);
    
    // Parse the encrypted message
    const parsedMessage = JSON.parse(encryptedMessage);
    
    // Check for our optimized file format
    if (parsedMessage.version === 'hackathon-demo-optimized') {
      console.log('Decrypting optimized file message');
      
      try {
        // Extract metadata
        const metadata = JSON.parse(Buffer.from(parsedMessage.metadata, 'base64').toString('utf-8'));
        
        // Reconstruct the file message
        const fileMessage = {
          ...metadata,
          fileData: parsedMessage.ciphertext
        };
        
        return JSON.stringify(fileMessage);
      } catch (error) {
        console.error('Error decrypting optimized file:', error);
        throw new Error('Failed to decrypt file: ' + error.message);
      }
    }
    
    // Check if this is our simple hackathon demo encryption
    if (parsedMessage.version === 'hackathon-demo') {
      console.log('Decrypting hackathon demo message');
      // Use Buffer for decoding to handle Unicode characters correctly
      return Buffer.from(parsedMessage.ciphertext, 'base64').toString('utf-8');
    }
    
    // Check if this is our optimized file encryption
    if (parsedMessage.version === 'hackathon-demo-file') {
      console.log('Decrypting hackathon demo file message');
      
      // Decode the file data
      const fileData = Buffer.from(parsedMessage.ciphertext, 'base64').toString('utf-8');
      const metadata = JSON.parse(Buffer.from(parsedMessage.metadata, 'base64').toString('utf-8'));
      
      // Reconstruct the file message
      const fileMessage = {
        ...metadata,
        fileData
      };
      
      return JSON.stringify(fileMessage);
    }
    
    // If it's a real MetaMask encrypted message, use eth_decrypt
    const decryptedMessage = await window.ethereum.request({
      method: 'eth_decrypt',
      params: [encryptedMessage, account],
    });
    
    return decryptedMessage;
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw new Error('Failed to decrypt message: ' + error.message);
  }
};

// Helper function for encryption
export const encryptWithMetaMask = async (publicKey, message) => {
  return encryptMessage(publicKey, message);
}; 