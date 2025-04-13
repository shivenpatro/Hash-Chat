import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import EmojiPicker from "emoji-picker-react";
import { FaFile, FaImage, FaFilePdf, FaFileWord, FaExclamationTriangle, FaUserCircle, FaDownload } from "react-icons/fa";
import { TbSend } from "react-icons/tb";
import { IoMdAttach } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import { FaFileAlt } from "react-icons/fa";

//INTERNAL IMPORT
import Style from "./Chat.module.css";
import images from "../../../assets";
import { converTime } from "../../../Utils/apiFeature";
import { Loader } from "../../index";

// Function to compress images for previews (more general purpose)
const compressImage = async (dataUrl, fileType, quality = 0.7, maxDimension = 1200) => {
  // Simple, straightforward implementation that avoids complex async operations
  return new Promise((resolve, reject) => {
    try {
      // Validate input
      if (!dataUrl || typeof dataUrl !== 'string') {
        return reject(new Error("Invalid image data"));
      }
      
      // Create image element
      const img = document.createElement('img');
      
      // Set timeout for the operation
      const timeout = setTimeout(() => {
        reject(new Error("Image compression timed out"));
      }, 10000);
      
      // Image loaded handler
      img.onload = function() {
        clearTimeout(timeout);
        
        try {
          // Basic validation
          if (!img.width || !img.height) {
            return reject(new Error("Invalid image dimensions"));
          }
          
          // Create a canvas for compression
          const canvas = document.createElement('canvas');
          
          // Calculate dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          
          // Check if image needs to be resized at all
          const needsResize = width > maxDimension || height > maxDimension;
          
          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
          
          // Ensure dimensions are reasonable and non-zero
          width = Math.max(width, 1);
          height = Math.max(height, 1);
          
          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;
          
          // Get canvas context
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error("Could not get canvas context"));
          }
          
          // Fill with white background for JPEGs - IMPORTANT for PNGs with transparency
          if (fileType !== 'image/png' || quality < 0.8) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // For PNGs with severe compression, convert to JPEG for better results
          // For very low quality (below 0.3), always use JPEG regardless of input type
          let outputType = fileType;
          
          // Force JPEG for low quality or if specifically requested
          if (quality < 0.3 || fileType === 'image/jpeg' || fileType === 'image/jpg') {
            outputType = 'image/jpeg';
          }
          
          // For high quality PNGs, try to maintain PNG format
          if (fileType === 'image/png' && quality >= 0.6) {
            outputType = 'image/png';
          }
          
          // Convert to data URL with compression
          // For PNGs, quality is ignored, so we need to handle differently
          let compressedDataUrl;
          
          if (outputType === 'image/png') {
            // For PNGs, we rely on size reduction from dimension scaling
            compressedDataUrl = canvas.toDataURL('image/png');
            
            // If the PNG is still too large, force JPEG conversion
            if (compressedDataUrl.length > 150 * 1024) {
              console.log("PNG still too large, forcing JPEG conversion");
              outputType = 'image/jpeg';
              compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }
          } else {
            // For JPEGs, we can use quality setting
            compressedDataUrl = canvas.toDataURL(outputType, quality);
          }
          
          // Log compression results
          console.log(`Compressed from ${needsResize ? 'larger' : 'original'} dimensions to ${width}x${height}, type: ${outputType}, quality: ${quality}`);
          
          // Return the compressed image
          resolve(compressedDataUrl);
        } catch (err) {
          clearTimeout(timeout);
          reject(new Error(`Compression error: ${err.message}`));
        }
      };
      
      // Error handler
      img.onerror = function() {
        clearTimeout(timeout);
        reject(new Error("Failed to load image for compression"));
      };
      
      // Start loading the image
      img.src = dataUrl;
    } catch (error) {
      reject(new Error(`Image compression setup failed: ${error.message}`));
    }
  });
};

const Chat = ({
  functionName,
  readMessage,
  friendMsg,
  account,
  userName,
  loading,
  currentUserName,
  currentUserAddress,
  readUser,
}) => {
  //USE STATE
  const [message, setMessage] = useState("");
  const [chatData, setChatData] = useState({
    name: "",
    address: "",
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [isFileAttached, setIsFileAttached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [fileData, setFileData] = useState(null);
  const [blockchainInfoMessage, setBlockchainInfoMessage] = useState("");
  const [isFormatError, setIsFormatError] = useState(false);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    setChatData(router.query);
  }, [router.isReady]);

  useEffect(() => {
    if (chatData.address) {
      readMessage(chatData.address);
      readUser(chatData.address);
    }
  }, [chatData.address]);

  const handleEmojiClick = (emojiObject) => {
    setMessage((prevMessage) => prevMessage + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    setFileData(null);
    setFileError("");
    setBlockchainInfoMessage("");
    setIsFormatError(false);
    
    const file = e.target.files[0];
    if (file) {
      // Define supported file formats
      const supportedFormats = [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Documents
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        // Text
        'text/plain',
        // Other common formats
        'application/zip', 
        'application/x-zip-compressed'
      ];
      
      // Check file extension as well
      const supportedExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
        'pdf', 'docx', 'doc', 'txt', 'zip'
      ];
      
      // Extract file extension
      const fileExt = file.name.split('.').pop().toLowerCase();
      
      // Check if file format is supported
      const isFormatSupported = supportedFormats.includes(file.type) || supportedExtensions.includes(fileExt);
      
      if (!isFormatSupported) {
        // Still select the file but show an error
        setSelectedFile(file);
        setIsFileAttached(true);
        setFileError(`Unsupported file format: ${file.type || `.${fileExt}`}. Please select a supported file type.`);
        setIsFormatError(true);
        return;
      }
      
      // Identify file types
      const isImage = file.type.startsWith('image/') || 
                      ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => 
                        file.name.toLowerCase().endsWith('.' + ext));
                          
      const isPdf = file.type === 'application/pdf' || 
                    file.name.toLowerCase().endsWith('.pdf');
                    
      const isWordDocument = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                             file.name.toLowerCase().endsWith('.docx');
      
      // Get raw file size in KB
      const fileSizeKB = file.size / 1024;
      
      console.log(`File selected: ${file.name}, Type: ${file.type}, Size: ${fileSizeKB.toFixed(2)}KB`);
      
      // Size limits
      const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB general limit
      const BLOCKCHAIN_SIZE_LIMIT = 50 * 1024; // 50KB blockchain limit - reduced from 200KB
      
      // First check overall size limit
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File is too large (${Math.round(fileSizeKB)} KB). Maximum file size is 15MB.`);
      return;
    }

      // Notify about blockchain limitations for larger files
      if (file.size > BLOCKCHAIN_SIZE_LIMIT) {
        // Display appropriate message based on file type
        if (isImage) {
          setBlockchainInfoMessage(`This image (${Math.round(fileSizeKB)} KB) exceeds the blockchain capacity (50KB). It will be automatically compressed to fit blockchain requirements or stored as metadata only.`);
        } 
        else if (isPdf || isWordDocument) {
          const fileType = isPdf ? "PDF" : "Word document";
          setBlockchainInfoMessage(`This ${fileType} (${Math.round(fileSizeKB)} KB) exceeds blockchain capacity (50KB). Only file metadata will be stored. The blockchain has strict size limits to ensure transaction reliability.`);
        }
        else {
          setBlockchainInfoMessage(`This file (${Math.round(fileSizeKB)} KB) exceeds blockchain capacity (50KB). Only file metadata will be stored. The blockchain has strict size limits to ensure transaction reliability.`);
        }
      } else if (file.size > BLOCKCHAIN_SIZE_LIMIT * 0.8) {
        // Warning for files close to the limit (80% or more of the limit)
        setBlockchainInfoMessage(`This file (${Math.round(fileSizeKB)} KB) is close to the blockchain capacity limit (50KB). There's a small risk the transaction might fail.`);
      } else {
        // Clear any previous messages for small files
        setBlockchainInfoMessage("");
      }
      
      // Process the file
    setSelectedFile(file);
      setIsFileAttached(true);
    
      // Read small files (<= 50KB) directly
      const reader = new FileReader();
      reader.onload = function(event) {
        const result = event.target.result;
        setFileData(result);
        
        // For images, set preview
        if (file.type.startsWith('image/')) {
          setFilePreview(result);
        } else {
          setFilePreview(''); // Clear preview for non-image files
        }
      };
      
      // Use readAsDataURL to encode file as base64
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    try {
      // Check for empty messages
      if (!message.trim() && !selectedFile) {
        console.log("Cannot send empty message");
      return;
    }
    
      // Set loading state and prevent multiple submissions
      setIsLoading(true);
      setFileError("");
      
      // Initialize message data
      let messageData = {
        text: message.trim(),
        timestamp: new Date().getTime()
      };
      
      console.log("Preparing to send message");
      
      // Handle file upload
      if (selectedFile) {
        try {
          console.log(`Preparing file: ${selectedFile.name}, Type: ${selectedFile.type}, Size: ${(selectedFile.size/1024).toFixed(1)}KB`);
          
          // CRITICAL FIX: For ALL files under blockchain limit, always use the binary data approach
          // This ensures the data is actually included in the message
          if (selectedFile.size <= 50 * 1024) {  // Check raw file size here - Files under 50KB get full content
            console.log(`Small file (under 50KB): Including full content, size: ${(selectedFile.size/1024).toFixed(1)}KB`);
            
            // Use FileReader to get binary data
            const fileData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.onerror = (e) => reject(e);
              reader.readAsDataURL(selectedFile); // This gives us a data URL with proper encoding
            });
            
            // Validate the file data to make sure it's properly encoded
            if (!fileData || typeof fileData !== 'string' || !fileData.startsWith('data:')) {
              throw new Error("Failed to encode file data properly");
            }
            
            console.log(`File encoded successfully, data URL length: ${fileData.length} chars`);
            
            // Create message object with full binary data
            const fileMessage = {
              fileName: selectedFile.name,
              fileType: selectedFile.type,
              fileSize: fileData.length,
              originalSize: selectedFile.size,
              fileData: fileData,  // Include the full data URL with encoding
              timestamp: Date.now(),
              hasData: true
            };
            
            // Add type flags to ensure proper rendering
            if (selectedFile.type.startsWith('image/') || 
                selectedFile.name.toLowerCase().endsWith('.png') || 
                selectedFile.name.toLowerCase().endsWith('.jpg') || 
                selectedFile.name.toLowerCase().endsWith('.jpeg') || 
                selectedFile.name.toLowerCase().endsWith('.gif')) {
              fileMessage.isImage = true;
            }
            
            // Convert to JSON and send
            const jsonMessage = JSON.stringify(fileMessage);
            const txSizeKB = (jsonMessage.length/1024).toFixed(1);
            console.log(`Sending file message with full data (${txSizeKB}KB)`);
            
            // Warn if close to limits
            if (jsonMessage.length > 45 * 1024) {
              setFileError(`Warning: Transaction size (${txSizeKB}KB) is close to blockchain limits. Sending...`);
            } else {
              setFileError(`Sending file (${txSizeKB}KB)...`);
            }
            
            try {
              await functionName({
                msg: jsonMessage,
                address: router.query.address,
              });
              
              console.log("File sent successfully with full content");
              
              // Clear UI state
              setMessage("");
              setSelectedFile(null);
              setFilePreview("");
              setIsFileAttached(false);
              setFileError("");
              setIsLoading(false);
            } catch (error) {
              console.error("Error sending file:", error);
              
              // Check if it's a blockchain size error
              if (error.message && 
                 (error.message.toLowerCase().includes("too large") || 
                  error.message.toLowerCase().includes("exceeds") ||
                  error.message.toLowerCase().includes("size limit"))) {
                setFileError(`Blockchain transaction failed: File is too large for blockchain storage (${(jsonMessage.length/1024).toFixed(1)}KB). Try a smaller file.`);
              } else {
                setFileError(`Error sending file: ${error.message || "Unknown error"}`);
              }
              
              setIsLoading(false);
            }
            
            return;
          } 
          // For image files, ALWAYS try compressing to fit in blockchain limit
          else if (selectedFile.type.startsWith('image/') || 
                   selectedFile.name.toLowerCase().endsWith('.png') || 
                   selectedFile.name.toLowerCase().endsWith('.jpg') || 
                   selectedFile.name.toLowerCase().endsWith('.jpeg') || 
                   selectedFile.name.toLowerCase().endsWith('.gif')) {
            console.log("Image file detected - attempting compression");
            
            setFileError("Compressing image to fit blockchain limits...");
            
            try {
              // Get the raw file data first
              const rawFileData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsDataURL(selectedFile);
              });
              
              // Compress the image with increasingly aggressive settings until it fits
              let compressedData = rawFileData;
              let successfulCompression = false;
              let finalCompressedSize = 0;
              let finalQuality = 0;
              let finalDimension = 0;
              
              // Try multiple compression levels with increasing aggressiveness
              const compressionAttempts = [
                { quality: 0.7, maxDimension: 1000 },  // First attempt - mild compression
                { quality: 0.5, maxDimension: 800 },   // Second attempt - moderate compression
                { quality: 0.3, maxDimension: 600 },   // Third attempt - strong compression
                { quality: 0.2, maxDimension: 500 },   // Fourth attempt - stronger compression
                { quality: 0.1, maxDimension: 400 },   // Fifth attempt - very strong compression
                { quality: 0.05, maxDimension: 300 }   // Last resort - extreme compression
              ];
              
              // Try compression with each attempt until one succeeds
              for (const attempt of compressionAttempts) {
                try {
                  console.log(`Trying compression: quality=${attempt.quality}, maxDimension=${attempt.maxDimension}`);
                  
                  // Apply compression
                  compressedData = await compressImage(
                    compressedData, 
                    selectedFile.type,
                    attempt.quality, 
                    attempt.maxDimension
                  );
                  
                  finalCompressedSize = compressedData.length;
                  finalQuality = attempt.quality;
                  finalDimension = attempt.maxDimension;
                  
                  console.log(`Compression result: ${(compressedData.length/1024).toFixed(1)}KB`);
                  
                  // Consider it successful if below 45KB (giving some margin)
                  if (compressedData.length <= 45 * 1024) {
                    successfulCompression = true;
                    break;
                  }
                } catch (err) {
                  console.error("Compression attempt failed:", err);
                  // Continue to next attempt
                }
              }
              
              // If we couldn't compress below the limit with any attempt, try one more extreme measure for PNGs
              if (!successfulCompression && (selectedFile.type === 'image/png' || selectedFile.name.toLowerCase().endsWith('.png'))) {
                try {
                  console.log("Attempting PNG to JPEG conversion with extreme compression");
                  // Force JPEG conversion with minimum quality
                  compressedData = await compressImage(
                    rawFileData,
                    'image/jpeg', // Force JPEG 
                    0.01,         // Extremely low quality
                    250           // Very low resolution
                  );
                  
                  finalCompressedSize = compressedData.length;
                  finalQuality = 0.01;
                  finalDimension = 250;
                  
                  console.log(`PNG to JPEG conversion result: ${(compressedData.length/1024).toFixed(1)}KB`);
                  
                  if (compressedData.length <= 45 * 1024) {
                    successfulCompression = true;
                  }
                } catch (err) {
                  console.error("PNG conversion attempt failed:", err);
                }
              }
              
              if (successfulCompression) {
                console.log(`Successfully compressed image from ${(rawFileData.length/1024).toFixed(1)}KB to ${(compressedData.length/1024).toFixed(1)}KB`);
                
                // Determine final image type (may convert to JPEG for better compression)
                const finalType = compressedData.startsWith('data:image/jpeg') ? 'image/jpeg' : selectedFile.type;
                
                // Create file message with compressed data
                const fileMessage = {
                  fileName: selectedFile.name,
                  fileType: finalType,
                  fileSize: compressedData.length,
                  originalSize: selectedFile.size,
                  fileData: compressedData,
                  timestamp: Date.now(),
                  isImage: true,
                  hasData: true,
                  compressed: true,
                  compressionStats: {
                    originalSize: rawFileData.length,
                    compressedSize: finalCompressedSize,
                    quality: finalQuality,
                    dimension: finalDimension
                  }
                };
                
                const jsonMessage = JSON.stringify(fileMessage);
                
                setFileError(`Image compressed from ${(rawFileData.length/1024).toFixed(1)}KB to ${(compressedData.length/1024).toFixed(1)}KB. Sending...`);
                
                try {
                  await functionName({
                    msg: jsonMessage,
                    address: router.query.address,
                  });
                  
                  console.log("Compressed image sent successfully");
                  
                  // Clear UI state
                  setMessage("");
                  setSelectedFile(null);
                  setFilePreview("");
                  setIsFileAttached(false);
                  setFileError("");
                  setIsLoading(false);
                  
                  return;
                } catch (error) {
                  console.error("Error sending compressed image:", error);
                  
                  // Check if it's a blockchain size error
                  if (error.message && 
                     (error.message.toLowerCase().includes("too large") || 
                      error.message.toLowerCase().includes("exceeds") || 
                      error.message.toLowerCase().includes("size limit"))) {
                    setFileError(`Blockchain transaction failed: Image still too large for blockchain after compression (${(compressedData.length/1024).toFixed(1)}KB). Try a smaller image.`);
                  } else {
                    setFileError(`Error sending compressed image: ${error.message || "Unknown error"}`);
                  }
                  
                  setIsLoading(false);
                  return;
                }
              }
              else {
                console.log("Image too large even after maximum compression, sending metadata only");
                setFileError(`Image too large for blockchain even after maximum compression. Sending metadata only.`);
              }
            } catch (error) {
              console.error("Error reading image file:", error);
              setFileError(`Error reading image: ${error.message || "Unknown error"}`);
              setIsLoading(false);
              return;
            }
          }
          
          // For files that are too large for blockchain, send metadata only
          console.log("File too large for blockchain - sending metadata only");
          
          // Create a metadata-only file message
          const fileInfo = {
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            isLargeFile: true,
            metadataOnly: true,
            timestamp: Date.now(),
            // Add a message for the recipient about why this is metadata-only
            explanation: `This file exceeds the blockchain's 50KB size limit and could not be stored directly. Please ask the sender to share it through another method.`
          };
          
          // For image files, mark them as images even without data
          if (selectedFile.type.startsWith('image/') || 
              selectedFile.name.toLowerCase().endsWith('.png') || 
              selectedFile.name.toLowerCase().endsWith('.jpg') || 
              selectedFile.name.toLowerCase().endsWith('.jpeg') || 
              selectedFile.name.toLowerCase().endsWith('.gif')) {
            fileInfo.isImage = true;
          }
          
          // Send just the metadata as JSON
          const metadataMessage = JSON.stringify(fileInfo);
          
          setFileError(`File too large for blockchain storage. Sending metadata only.`);
          
          await functionName({
            msg: metadataMessage,
            address: router.query.address,
          });
          
          console.log("File metadata sent successfully");
          
          // Clear UI state after successful send
          setMessage("");
          setSelectedFile(null);
          setFilePreview("");
          setIsFileAttached(false);
          setFileError("");
          setIsLoading(false);
          
          return;
        } catch (fileError) {
          console.error("Error with file:", fileError);
          setFileError(`File error: ${fileError.message || "Unknown error"}`);
          setIsLoading(false);
          return;
        }
      } else {
        // Text-only message
        try {
          console.log("Sending text-only message");
        await functionName({
          msg: message,
          address: router.query.address,
        });
        setMessage("");
          console.log("Text message sent successfully");
        } catch (error) {
          console.error("Error sending text message:", error);
          setFileError(`Failed to send message: ${error.message || "Unknown error"}`);
        } finally {
        setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      setFileError(`Error: ${error.message || "Unknown error"}`);
      setIsLoading(false);
    }
  };

  const cancelFileAttachment = () => {
    setSelectedFile(null);
    setFilePreview("");
    setIsFileAttached(false);
    setFileError("");
    setFileData(null);
    setBlockchainInfoMessage("");
    setIsFormatError(false);
  };

  // Helper function to prepare file messages with consistent handling
  const prepareFileMessage = (message) => {
    try {
      // Extract file information
      const {
        fileName, 
        fileType, 
        fileSize,
        fileData
      } = message;
      
      // Define size thresholds
      const SMALL_FILE_THRESHOLD = 50 * 1024; // 50KB in bytes - reduced from 100KB
      
      // Calculate the actual size (either from fileSize or from fileData length)
      let actualFileSize = fileSize;
      if (fileData && typeof fileData === 'string') {
        // For base64 data, estimate the decoded size (approx 75% of base64 length)
        const base64WithoutHeader = fileData.split(',')[1] || '';
        actualFileSize = Math.round(base64WithoutHeader.length * 0.75);
      }
      
      // Determine if this is a small file (always gets full content)
      const isSmallFile = actualFileSize <= SMALL_FILE_THRESHOLD;
      
      // For small files, never use metadata-only
      const isMetadataOnly = !isSmallFile && (!fileData || fileData.length > SMALL_FILE_THRESHOLD);
      
      console.log(`File preparation: ${fileName} (${fileType}) - Size: ${actualFileSize} bytes, Small: ${isSmallFile}, Metadata-only: ${isMetadataOnly}`);
      
      // Return prepared message with consistent flags
      return {
        ...message,
        fileSize: actualFileSize,
        isSmallFile,
        isMetadataOnly,
        // Ensure fileData exists for small files (even if empty - will force download link)
        fileData: isSmallFile ? (fileData || 'data:application/octet-stream;base64,') : fileData
      };
    } catch (error) {
      console.error("Error preparing file message:", error);
      return message; // Return original message if any error occurs
    }
  };

  // Helper function to render message content based on type
  const renderMessageContent = (msg) => {
    try {
      // Parse message content if it's JSON (for file messages)
      let parsedContent;
      try {
        parsedContent = JSON.parse(msg);
      } catch (error) {
        // Not JSON, treat as plain text
        return msg;
      }

      // Check if it's a file message by looking for fileName and fileType
      if (parsedContent.fileName && parsedContent.fileType) {
        console.log(`Rendering file: ${parsedContent.fileName} (${parsedContent.fileType})`);
        
        // Process file message for consistent handling
        const fileMessage = prepareFileMessage(parsedContent);
        const { 
          fileName, 
          fileType, 
          fileSize, 
          fileData, 
          isSmallFile, 
          isMetadataOnly 
        } = fileMessage;
        
        console.log(`File render details: Small=${isSmallFile}, Metadata-only=${isMetadataOnly}, Size=${fileSize}B`);
        
        // PRIORITY CASE: Small files should always show download links
        if (isSmallFile) {
          console.log("Rendering small file with download link");
          // Get appropriate icon and text based on file type
          let fileIcon = <FaFile className={Style.fileIcon} />;
          let downloadText = "Download File";
          
          if (fileType.includes('image')) {
            fileIcon = <FaImage className={Style.fileIcon} />;
            downloadText = "Download Image";
          } else if (fileType.includes('pdf')) {
            fileIcon = <FaFilePdf className={Style.fileIcon} />;
            downloadText = "Download PDF";
          } else if (fileType.includes('word') || fileType.includes('document') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            fileIcon = <FaFileWord className={Style.fileIcon} />;
            downloadText = "Download Document";
          }
          
          // Always render download link for small files
          return (
            <div className={Style.fileMessage}>
              {fileIcon}
              <div className={Style.fileInfo}>
                <p className={Style.fileName}>{fileName}</p>
                <p className={Style.fileSize}>{(fileSize / 1024).toFixed(1)} KB</p>
              </div>
              <a 
                href={fileData || `data:${fileType};base64,`} 
                download={fileName}
                className={Style.downloadLink}
              >
                {downloadText}
              </a>
            </div>
          );
        }
        
        // CASE: Metadata-only files (too large for blockchain storage)
        if (isMetadataOnly) {
          console.log("Rendering metadata-only file");
          // Handle metadata-only file (too large for blockchain)
          let fileIcon = <FaFile className={Style.fileIcon} />;
          let explanation = "This file is too large for blockchain storage. Only metadata was saved.";
          
          if (fileType.includes('image')) {
            fileIcon = <FaImage className={Style.fileIcon} />;
            explanation = "This image is too large for blockchain storage. Only metadata was saved.";
          } else if (fileType.includes('pdf')) {
            fileIcon = <FaFilePdf className={Style.fileIcon} />;
            explanation = "This PDF is too large for blockchain storage. Only metadata was saved.";
          } else if (fileType.includes('word') || fileType.includes('document') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            fileIcon = <FaFileWord className={Style.fileIcon} />;
            explanation = "This document is too large for blockchain storage. Only metadata was saved.";
          }
          
          return (
            <div className={Style.fileMessage}>
              {fileIcon}
              <div className={Style.fileInfo}>
                <p className={Style.fileName}>{fileName}</p>
                <p className={Style.fileSize}>{(fileSize / 1024).toFixed(1)} KB</p>
                <p className={Style.fileMetaOnly}>{explanation}</p>
              </div>
            </div>
          );
        }

        // CASE: Files with data
        // Check if file data is valid
        if (!fileData || typeof fileData !== 'string' || !fileData.startsWith('data:')) {
          console.log("File data is invalid");
          return (
            <div className={Style.fileError}>
              <FaExclamationTriangle className={Style.errorIcon} />
              <p>File data is invalid. The file cannot be displayed.</p>
            </div>
          );
        }

        // Handle files with valid data based on type
        if (fileType.includes('image')) {
          console.log("Rendering image file");
          return (
            <div className={Style.imageContainer}>
              <img 
                src={fileData} 
                alt={fileName} 
                className={Style.imageMessage}
                onError={(e) => {
                  console.error("Image failed to load:", e);
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = `
                    <div class="${Style.fileError}">
                      <p>Image failed to load. <a href="${fileData}" download="${fileName}">Download instead</a></p>
                    </div>
                  `;
                }}
              />
              <a 
                href={fileData} 
                download={fileName}
                className={Style.downloadLink}
              >
                Download Image
              </a>
            </div>
          );
        } else if (fileType.includes('pdf')) {
          console.log("Rendering PDF file");
          return (
            <div className={Style.fileMessage}>
              <FaFilePdf className={Style.fileIcon} />
              <div className={Style.fileInfo}>
                <p className={Style.fileName}>{fileName}</p>
                <p className={Style.fileSize}>{(fileSize / 1024).toFixed(1)} KB</p>
              </div>
              <a 
                href={fileData} 
                download={fileName}
                className={Style.downloadLink}
              >
                Download PDF
              </a>
            </div>
          );
        } else if (fileType.includes('word') || fileType.includes('document') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
          console.log("Rendering Word document");
          return (
            <div className={Style.fileMessage}>
              <div className={Style.docIcon}>
                <div className={Style.docIconInner}>W</div>
              </div>
              <div className={Style.fileInfo}>
                <p className={Style.fileName}>{fileName}</p>
                <p className={Style.fileSize}>{(fileSize / 1024).toFixed(1)} KB</p>
              </div>
              <a 
                href={fileData || `data:${fileType};base64,`} 
                download={fileName}
                className={Style.downloadLink}
              >
                Download Document
              </a>
            </div>
          );
        } else {
          // Generic file handler for any other file type
          console.log("Rendering generic file");
          return (
            <div className={Style.fileMessage}>
              <FaFile className={Style.fileIcon} />
              <div className={Style.fileInfo}>
                <p className={Style.fileName}>{fileName}</p>
                <p className={Style.fileSize}>{(fileSize / 1024).toFixed(1)} KB</p>
              </div>
                <a 
                  href={fileData} 
                  download={fileName}
                className={Style.downloadLink}
                >
                Download File
                </a>
            </div>
          );
        }
      }

      // Default text rendering for non-file messages
      return msg;
    } catch (error) {
      console.error("Error rendering message:", error);
      return "Error displaying message: " + error.message;
    }
  };

  return (
    <div className={Style.Chat}>
      {/* TOP BAR (Similar to WhatsApp) */}
      {chatData.name && chatData.address && (
        <div className={Style.Chat_topbar}>
          <Image src={images.accountName} alt="profile" width={50} height={50} />
          <div className={Style.Chat_topbar_info}>
            <h4>{chatData.name}</h4>
            <p>{chatData.address}</p>
          </div>
          <div className={Style.Chat_topbar_encryption}>
            <span title="End-to-end encrypted">🔒</span>
          </div>
        </div>
      )}

      {/* MESSAGE AREA */}
      <div className={Style.Chat_messages}>
        {friendMsg.length === 0 ? (
          <div className={Style.no_messages}>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          friendMsg.map((el, i) => {
            // If message sender is the friend, show on the left; else on the right
            const isFriend = el.sender === chatData.address;
            
            // Check if the message is encrypted or was decrypted
            const isEncrypted = el.isEncrypted;
            const wasDecrypted = el.isDecrypted;
            
            return (
              <div
                key={i + 1}
                className={isFriend ? Style.Chat_box_left : Style.Chat_box_right}
              >
                <div className={Style.Chat_box_title}>
                  <Image
                    src={images.accountName}
                    alt="avatar"
                    width={35}
                    height={35}
                  />
                  <span>
                    {isFriend ? chatData.name : userName}
                  </span>
                  {wasDecrypted && (
                    <span className={Style.decryption_icon} title="Successfully decrypted">
                      🔓
                    </span>
                  )}
                  {isEncrypted && (
                    <span className={Style.encryption_icon} title="Could not decrypt this message">
                      🔐
                    </span>
                  )}
                </div>
                <div>
                  {isEncrypted ? (
                    <p className={Style.encrypted_msg}>
                      <em>Encrypted message (could not decrypt)</em>
                    </p>
                  ) : (
                    <div className={Style.message_content}>
                      {renderMessageContent(el.msg)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FILE PREVIEW */}
      {isFileAttached && (
        <div className={Style.file_preview}>
          <div className={Style.file_preview_content}>
            {filePreview ? (
              <img src={filePreview} alt="Preview" className={Style.image_preview} />
            ) : (
              <div className={`${Style.generic_file_preview} ${isFormatError ? Style.unsupported_file : ''}`}>
                {isFormatError ? (
                  <>
                    <FaExclamationTriangle style={{ fontSize: '2.5rem', color: 'var(--nord11)', marginBottom: '8px' }} />
                    <p style={{ color: 'var(--nord6)', backgroundColor: 'var(--nord3)', padding: '8px', borderRadius: '8px', width: '100%', textAlign: 'center', fontSize: '0.9rem' }}>
                      {selectedFile?.name}
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--nord11)', marginTop: '3px', fontStyle: 'italic' }}>
                        Unsupported Format
                      </span>
                    </p>
                  </>
                ) : selectedFile?.type.startsWith('image/') ? (
                  // Show loading spinner for images
                  <div className={Style.image_loading}>
                    <span>🔄</span>
                    <p>{selectedFile?.name}</p>
                  </div>
                ) : selectedFile?.type === 'application/pdf' ? (
                  <>
                    <FaFilePdf style={{ fontSize: '2.5rem', color: '#e74c3c', marginBottom: '8px' }} />
                    <p>{selectedFile?.name}</p>
                  </>
                ) : selectedFile?.type.includes('wordprocessing') || 
                   selectedFile?.type === 'application/msword' || 
                   selectedFile?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? (
                  <>
                    <div className={Style.docIcon}>
                      <div className={Style.docIconInner}>W</div>
                    </div>
                    <p>{selectedFile?.name}</p>
                  </>
                ) : (
                  <>
                    <FaFileAlt style={{ fontSize: '2.5rem', color: '#88c0d0', marginBottom: '8px' }} />
                <p>{selectedFile?.name}</p>
                  </>
                )}
              </div>
            )}
              <button 
                className={Style.cancel_file_btn}
                onClick={cancelFileAttachment}
                title="Cancel"
              >
              <IoClose size={16} />
              </button>
            <div className={Style.file_preview_actions}>
              <button 
                className={`${Style.send_file_btn} ${isFormatError ? Style.format_error_btn : ""}`}
                onClick={handleSendMessage}
                disabled={loading || isLoading || isFormatError}
                title={isFormatError ? "Cannot send unsupported file format" : "Send file"}
              >
                {isFormatError ? <span style={{ color: "white" }}>Unsupported Format</span> : "Send File"}
              </button>
            </div>
          </div>
          {fileError && !isFormatError && (
            <div className={Style.file_error}>
              <p style={{ fontSize: '0.9rem', fontWeight: 'normal', margin: '0 0 4px' }}>{fileError}</p>
            </div>
          )}
          {blockchainInfoMessage && (
            <div className={Style.file_info}>
              <p>{blockchainInfoMessage}</p>
            </div>
          )}
          
          {/* Additional standalone button outside other elements */}
          {isFormatError && (
            <div style={{
              textAlign: 'center',
              margin: '20px auto 12px',
              position: 'relative',
              zIndex: 30,
            }}>
              <button
                style={{
                  backgroundColor: 'var(--nord10)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 28px',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                  transition: 'transform 0.2s, background-color 0.2s',
                }}
                onClick={() => {
                  console.log("External Try Another File button clicked");
                  cancelFileAttachment();
                }}
              >
                Try Another File
              </button>
            </div>
          )}
        </div>
      )}

      {/* MESSAGE INPUT */}
      {currentUserName && currentUserAddress ? (
        <div className={Style.Chat_box_send}>
          <div className={Style.Chat_box_send_img}>
            <div className={Style.emoji_container}>
              <div 
                className={Style.emoji_icon} 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Image src={images.smile} alt="smile" width={20} height={20} />
              </div>
              {showEmojiPicker && (
                <div className={Style.emoji_picker_container}>
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>
            
            <form 
              className={Style.message_form}
              onSubmit={(e) => {
                e.preventDefault();
                if (message.trim() && !isLoading && !loading) {
                  console.log("Form submitted, sending message");
                  handleSendMessage();
                }
              }}
            >
              <input
                type="text"
                placeholder="Type your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isFileAttached}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isLoading && !loading && message.trim()) {
                    console.log("Enter key pressed, sending message");
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                ref={messageInputRef}
              />
              <button type="submit" style={{ display: 'none' }}>Submit</button>
            </form>
            
            <div className={Style.file_input_container}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div onClick={handleFileClick}>
                <Image src={images.file} alt="file" width={20} height={20} />
              </div>
            </div>

            {loading || isLoading ? (
              <Loader />
            ) : (
              <button 
                className={Style.send_button}
                onClick={handleSendMessage}
                title="Send message"
              >
                <TbSend size={30} style={{ transform: 'scale(1.8)', transformOrigin: 'center' }} color="#fff" />
              </button>
            )}
          </div>
          <div className={Style.encryption_note}>
            <span title="End-to-end encrypted">🔒</span> 
            {currentUserAddress === account ? (
              <span>Messaging yourself? Make sure you've updated your public key!</span>
            ) : (
              <span>End-to-end encrypted</span>
            )}
          </div>
        </div>
      ) : (
        ""
      )}
    </div>
  );
};

export default Chat;
