import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";

//INTERNAL IMPORT
import {
  CheckIfWalletConnected,
  connectWallet,
  connectingWithContract,
} from "../Utils/apiFeature";

// Import encryption utilities
import {
  getPublicKey,
  encryptMessage,
  decryptMessage,
  encryptWithMetaMask,
  decryptWithMetaMask
} from "../Utils/encryptionUtils";

export const ChatAppContect = React.createContext();

export const ChatAppProvider = ({ children }) => {
  //USESTATE
  const [account, setAccount] = useState("");
  const [userName, setUserName] = useState("");
  const [friendLists, setFriendLists] = useState([]);
  const [friendMsg, setFriendMsg] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLists, setUserLists] = useState([]);
  const [error, setError] = useState("");
  const [publicKeys, setPublicKeys] = useState({});
  const [myPublicKey, setMyPublicKey] = useState("");
  const [isChatCleared, setIsChatCleared] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  //CHAT USER DATA
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserAddress, setCurrentUserAddress] = useState("");

  const router = useRouter();

  // Get filtered friends list based on search query
  const filteredFriendLists = searchQuery
    ? friendLists.filter((friend) => 
        friend.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friendLists;

  //FETCH DATA TIME OF PAGE LOAD
  const fetchData = async () => {
    try {
      const address = await CheckIfWalletConnected();
      if (address) {
        //GET CONTRACT
        const contract = await connectingWithContract();
        //GET ACCOUNT
        const connectAccount = await connectWallet();
        setAccount(connectAccount);
        //GET USER NAME
        const userName = await contract.getUsername(connectAccount);
        setUserName(userName);
        //GET MY FRIEND LIST
        const friendLists = await contract.getMyFriendList();
        setFriendLists(friendLists);

        //GET ALL APP USER LIST
        const userList = await contract.getAllAppUser();
        const newArray = userList.filter(
          (user) => user.accountAddress.toLowerCase() !== address
        );

        const filterArray = filterUsersExcludingFriends(newArray, friendLists);
        console.log(filterArray);
        setUserLists(filterArray);
        
        // Get my public key
        try {
          const publicKey = await getPublicKey(connectAccount);
          setMyPublicKey(publicKey);
          console.log("My public key:", publicKey);
        } catch (error) {
          console.log("Error getting public key:", error);
        }
      }
    } catch (error) {
      // setError("Please Install And Connect Your Wallet");
      console.log(error);
    }
  };

  function filterUsersExcludingFriends(newArray, friendLists) {
    const friendAddresses = new Set(friendLists.map((friend) => friend.pubkey));

    return newArray.filter((user) => !friendAddresses.has(user.accountAddress));
  }
  useEffect(() => {
    fetchData();
  }, []);

  // Function to update public key
  const updatePublicKey = async () => {
    try {
      if (!account) {
        setError("Please connect your wallet first");
        return;
      }
      
      console.log("Requesting public key for account:", account);
      
      // This will trigger a MetaMask popup to allow access to the public key
      const publicKey = await getPublicKey(account);
      
      // Validate the public key
      if (!publicKey || typeof publicKey !== 'string') {
        throw new Error(`Invalid public key returned: ${publicKey}`);
      }
      
      if (publicKey.length === 0) {
        throw new Error('Empty public key returned');
      }
      
      console.log("Public key received:", publicKey);
      console.log("Public key length:", publicKey.length);
      console.log("Public key type:", typeof publicKey);
      
      setMyPublicKey(publicKey);
      
      // Also store in the publicKeys mapping for this account
      setPublicKeys(prev => ({...prev, [account]: publicKey}));
      
      console.log("Public key updated successfully and cached");
      
      alert("Public key updated successfully! You can now send and receive encrypted messages with this account.");
    } catch (error) {
      console.error("Error updating public key:", error);
      
      if (error.message?.includes("denied")) {
        setError("You denied the request. Please approve access to your encryption key in MetaMask.");
      } else {
        setError("Failed to update public key: " + (error.message || "Unknown error"));
      }
    }
  };
  
  // Function to test encryption (for demonstration)
  const testEncryption = async () => {
    try {
      if (!account) {
        alert("Please connect your wallet first");
        return;
      }
      
      console.log("Starting encryption test...");
      console.log("Account:", account);
      
      // 1. Get a fresh public key from MetaMask
      console.log("Getting fresh public key...");
      let freshPublicKey;
      try {
        freshPublicKey = await window.ethereum.request({
          method: 'eth_getEncryptionPublicKey',
          params: [account],
        });
        
        // Validate that we received a non-empty public key
        if (!freshPublicKey || freshPublicKey.length === 0) {
          throw new Error('MetaMask returned an empty public key');
        }
        
        console.log("Fresh public key received:", freshPublicKey);
        console.log("Public key length:", freshPublicKey.length);
        
        // Store the fresh public key
        setMyPublicKey(freshPublicKey);
        setPublicKeys(prev => ({...prev, [account]: freshPublicKey}));
      } catch (error) {
        console.error("Error getting public key:", error);
        alert("Failed to get public key. Please make sure you have approved the request in MetaMask.");
        return;
      }
      
      // 2. Create a test message
      const message = "This is a test encrypted message!";
      console.log("Original message:", message);
      
      // 3. Encrypt the message using our simplified encryption
      console.log("Encrypting message...");
      try {
        const encryptedMessage = await encryptMessage(freshPublicKey, message);
        console.log("Message encrypted:", encryptedMessage);
        
        // 4. Decrypt the message 
        console.log("Decrypting message...");
        const decryptedMessage = await decryptMessage(account, encryptedMessage);
        console.log("Decrypted message:", decryptedMessage);
        
        if (decryptedMessage === message) {
          alert(`✅ Test successful!\n\nOriginal: "${message}"\n\nDecrypted: "${decryptedMessage}"\n\nEncryption is working properly!`);
        } else {
          throw new Error("Decrypted message doesn't match original!");
        }
      } catch (error) {
        console.error("Encryption/decryption failed:", error);
        alert("Encryption test failed: " + error.message);
      }
    } catch (error) {
      console.error("Encryption test failed:", error);
      
      // Handle specific errors
      if (error.code === 4001) {
        alert("Test failed: You denied the request in MetaMask.");
      } else {
        alert("Test failed: " + error.message);
      }
    }
  };

  //READ MESSAGES FROM YOUR FRIEND
  const readMessage = async (friendAddress) => {
    try {
      if (!window.ethereum) return setError("Please install MetaMask");
      
      // Check if this chat was previously cleared
        const clearedChats = JSON.parse(localStorage.getItem('clearedChats') || '{}');
        const clearedTimestamp = clearedChats[friendAddress];
      console.log("Chat clear check:", friendAddress, clearedTimestamp ? new Date(clearedTimestamp).toLocaleString() : "No clear record");
        
        const contract = await connectingWithContract();
      const messages = await contract.readMessage(friendAddress);
      
      // Process messages
      const processedMessages = messages.map((msg) => {
        // Skip messages sent before the chat was cleared
        if (clearedTimestamp && parseInt(msg.timestamp) * 1000 < clearedTimestamp) {
          console.log("Skipping message from before chat was cleared:", new Date(parseInt(msg.timestamp) * 1000).toLocaleString());
          return null; // Will be filtered out
        }
        
        // Check if the message might be a file message
        if (msg.msg && msg.msg.startsWith("{") && msg.msg.endsWith("}")) {
          try {
            // Attempt to parse the message as JSON
            const parsed = JSON.parse(msg.msg);
            
            // Check if this is a file message by looking for file properties
            if (parsed.fileName && parsed.fileType) {
              // It's a file message
              console.log(`Processing file message: ${parsed.fileName}`);
              
              // Create a processed file message that isn't encrypted
              // The file message already contains binary content (if applicable) so no need to attempt decryption
              return {
                sender: msg.sender,
                receiver: msg.receiver,
                timestamp: parseInt(msg.timestamp),
                msg: msg.msg, // Keep the full JSON string
                isFile: true,
                isEncrypted: false,
                isDecrypted: true
              };
            }
          } catch (parseError) {
            // Not a valid JSON or not a file message
            console.log("Not a valid JSON file message, trying normal message processing");
          }
        }
        
        // For non-file messages, attempt decryption
        let decryptedMsg;
        try {
          // Attempt to decrypt the message using MetaMask
          if (msg.sender.toLowerCase() === account.toLowerCase()) {
            // Messages from current user don't need decryption
            decryptedMsg = msg.msg;
          } else {
            // Try to use cached public key
            const publicKey = publicKeys[msg.sender.toLowerCase()];
            
            if (publicKey) {
              try {
                console.log("Attempting to decrypt message with cached key");
                // Use a simpler approach without async/await here
                decryptedMsg = msg.msg; // Default to the original message
                
                // Mark that we attempted decryption but don't actually decrypt here
                // since we're in a non-async map function
                return {
                  sender: msg.sender,
                  receiver: msg.receiver,
                  timestamp: parseInt(msg.timestamp),
                  msg: msg.msg,
                  isEncrypted: false,
                  isDecrypted: false // Not actually decrypted
                };
              } catch (decryptError) {
                console.log("Decryption failed, message may not be encrypted");
                // Message might not be encrypted
                decryptedMsg = msg.msg;
              }
            } else {
              // No public key available, assume it's not encrypted
              decryptedMsg = msg.msg;
            }
          }
          
          return {
            sender: msg.sender,
            receiver: msg.receiver,
            timestamp: parseInt(msg.timestamp),
            msg: decryptedMsg,
            isEncrypted: false
          };
          
        } catch (error) {
          console.log("Error processing message:", error);
          // Message could not be decrypted
          return {
            sender: msg.sender,
            receiver: msg.receiver,
            timestamp: parseInt(msg.timestamp),
            msg: msg.msg,
            isEncrypted: true
          };
        }
      });
      
      // Filter out null messages (those from before chat was cleared) and sort by timestamp
      const filteredMessages = processedMessages
        .filter(msg => msg !== null)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      setFriendMsg(filteredMessages);
      console.log(`Loaded ${filteredMessages.length} messages with ${friendAddress} (filtered from ${messages.length})`);
      
    } catch (error) {
      setError("Error loading messages: " + error.message);
      console.log(error);
    }
  };

  //CREATE ACCOUNT
  const createAccount = async ({ name }) => {
    console.log(name, account);
    try {
      if (!name || !account)
        return setError("Name And Account Address, cannot be empty");

      const contract = await connectingWithContract();
      console.log(contract);
      const getCreatedUser = await contract.createAccount(name);

      setLoading(true);
      await getCreatedUser.wait();
      setLoading(false);
      window.location.reload();
    } catch (error) {
      setError("Error while creating your account Pleas reload browser");
    }
  };

  //ADD YOUR FRIENDS
  const addFriends = async ({ name, userAddress }) => {
    console.log(name, userAddress);
    try {
      if (!name || !userAddress) return setError("Please provide data");
      const contract = await connectingWithContract();
      const addMyFriend = await contract.addFriend(userAddress, name);
      setLoading(true);
      await addMyFriend.wait();
      setLoading(false);
      router.push("/");
      window.location.reload();
    } catch (error) {
      setError("Something went wrong while adding friends, try again");
    }
  };

  //SEND MESSAGE TO YOUR FRIEND
  const sendMessage = async ({ msg, address }) => {
    try {
      if (!msg || !address) return setError("Please Type your Message");

      // Check if this is a file message by trying to parse it
      let isFileMessage = false;
      let fileType = null;
      let fileSize = 0;
      let fileName = "";
      let fileData = null;
      let isMetadataOnly = false;
      
      try {
        // Try to parse the message as JSON to detect file messages
        const parsedMsg = JSON.parse(msg);
        if (parsedMsg.fileName && parsedMsg.fileType) {
          isFileMessage = true;
          fileType = parsedMsg.fileType;
          fileSize = parsedMsg.fileSize || parsedMsg.fileData?.length || 0;
          fileName = parsedMsg.fileName || "file";
          fileData = parsedMsg.fileData;
          isMetadataOnly = parsedMsg.metadataOnly || parsedMsg.isLargeFile;
          
          console.log(`Detected file message: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)`);
          
          // Special handling for Office documents - allow small ones to be sent directly
          const isOfficeDoc = fileType.includes('office') || 
                             fileType.includes('wordprocessing') ||
                             fileType.includes('presentation');
                               
          // Only use metadata-only for large office documents
          if (isOfficeDoc && fileSize > 100 * 1024) {
            console.log(`Large office document detected: ${fileName}. Using metadata-only approach.`);
            isMetadataOnly = true;
          }
          
          // For files with actual data (not metadata-only), validate size for blockchain
          if (!isMetadataOnly && fileData) {
            // Maximum reliable blockchain transaction size
            const MAX_BLOCKCHAIN_SIZE = 100 * 1024; // 100KB for safety
            
            // Convert to string length if not already
            const dataSize = typeof fileData === 'string' ? fileData.length : 0;
            
            if (dataSize > MAX_BLOCKCHAIN_SIZE) {
              console.warn(`File data too large for blockchain: ${(dataSize/1024).toFixed(1)}KB`);
              setError(`File "${fileName}" is too large for blockchain storage. Try sending a smaller file.`);
              return;
            }
            
            // Validate file data format for files with data
            if (!fileData.startsWith('data:')) {
              setError(`Invalid file data format for "${fileName}"`);
              return;
            }
          }
          
          // Check total message size to avoid blockchain transaction limits
          if (msg.length > 200 * 1024) { // 200KB general limit
            setError(`The message size (${(msg.length / 1024).toFixed(1)}KB) exceeds the blockchain transaction limit.`);
            return;
          }
        }
      } catch (parseError) {
        // Not a JSON message, continue with normal text message
        console.log("Not a file message, continuing with text message");
      }

      // Set loading state
      setLoading(true);
      
      // File messages and metadata-only messages are sent directly without encryption
      if (isFileMessage) {
        try {
          console.log(`Sending ${isMetadataOnly ? 'metadata-only' : 'file'} for "${fileName}" to blockchain`);
          
          try {
            const contract = await connectingWithContract();
            
            // Set up a timeout promise to handle long-running transactions
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Transaction timeout - network may be congested")), 60000)
            );
            
            // Track if the transaction is in progress
            let transactionStarted = false;
            
            try {
              transactionStarted = true;
              const sendPromise = contract.sendMessage(address, msg);
              
              // Use Promise.race to implement timeout
              const addMessage = await Promise.race([sendPromise, timeoutPromise]);
              await addMessage.wait();
              
              setLoading(false);
              console.log(`${isMetadataOnly ? 'Metadata' : 'File'} message sent successfully!`);
              window.location.reload();
              return;
            } catch (txError) {
              // Handle JSON-RPC errors specifically
              if (txError.message && (txError.message.includes("JSON-RPC") || txError.message.includes("transaction failed") || txError.message.includes("TRANSACTION_REPLACED"))) {
                console.error("Transaction failed with blockchain error:", txError);
                
                if (isMetadataOnly) {
                  // Even metadata failed - this is unusual, maybe network congestion
                  setError(`Blockchain transaction failed - network may be congested. Please try again later.`);
                } else {
                  // File data was too large
                  setError(`Blockchain transaction failed - "${fileName}" is too large for blockchain storage.`);
                }
                
                setLoading(false);
                return;
              }
              
              // Other transaction errors
              throw txError;
            }
          } catch (error) {
            console.error("Error sending file message:", error);
            setLoading(false);
            setError(`Failed to send file: ${error.message}`);
            return;
          }
        } catch (error) {
          console.error("Error preparing file message:", error);
          setLoading(false);
          setError(`Failed to prepare file: ${error.message}`);
          return;
        }
      }

      // For regular text messages, continue with existing logic
      // Get the friend's public key
      let recipientPublicKey;
      try {
        console.log("Preparing to send message to:", address);
        console.log("Current account:", account);
        
        // Try to get cached key if available
        if (publicKeys[address]) {
          console.log("Using cached public key for recipient");
          recipientPublicKey = publicKeys[address];
          
          try {
            // Encrypt and send the message
            const encryptedMsg = await encryptWithMetaMask(recipientPublicKey, msg);
            const contract = await connectingWithContract();
            const addMessage = await contract.sendMessage(address, encryptedMsg);
            
            await addMessage.wait();
            setLoading(false);
            console.log("Encrypted message sent successfully!");
            window.location.reload();
            return;
          } catch (encryptError) {
            console.error("Error with encryption, falling back to unencrypted:", encryptError);
            // Fall through to unencrypted fallback
          }
        }
        
        // If we couldn't encrypt for any reason, send unencrypted
        console.log("Sending unencrypted message as fallback");
        const contract = await connectingWithContract();
        
        try {
          const addMessage = await contract.sendMessage(address, msg);
          
          await addMessage.wait();
          setLoading(false);
          window.location.reload();
        } catch (txError) {
          if (txError.message && txError.message.includes("JSON-RPC")) {
            setError("Transaction failed - message may be too large for blockchain storage.");
            setLoading(false);
            return;
          }
          throw txError;
        }
        
      } catch (error) {
        setError("Send message error: " + (error.message || "Unknown error"));
        console.error("Send message error:", error);
        setLoading(false);
      }
    } catch (error) {
      setError("Please reload and try again: " + (error.message || "Unknown error"));
      console.error("Send message error:", error);
      setLoading(false);
    }
  };

  //READ INFO
  const readUser = async (userAddress) => {
    const contract = await connectingWithContract();
    const userName = await contract.getUsername(userAddress);
    setCurrentUserName(userName);
    setCurrentUserAddress(userAddress);
  };

  //CLEAR CHAT
  const clearChat = () => {
    try {
      // Store the current friend's address to know which chat was cleared
      const currentFriend = currentUserAddress;
      if (!currentFriend) {
        setError("No chat selected to clear");
        return false;
      }
      
      console.log("Clearing chat for:", currentFriend);
      
      // Get existing cleared chats from localStorage or initialize empty object
      const clearedChats = JSON.parse(localStorage.getItem('clearedChats') || '{}');
      
      // Set the timestamp when this chat was cleared
      clearedChats[currentFriend] = Date.now();
      
      // Save back to localStorage
      localStorage.setItem('clearedChats', JSON.stringify(clearedChats));
      
      // Clear from current state
      setFriendMsg([]);
      setError("");
      
      // Force reload friend message to reflect the changes
      readMessage(currentFriend);
      
      console.log("Chat cleared successfully for", currentFriend);
      return true;
    } catch (error) {
      console.error("Failed to clear chat:", error);
      setError("Failed to clear chat. Please try again.");
      return false;
    }
  };

  return (
    <ChatAppContect.Provider
      value={{
        readMessage,
        createAccount,
        addFriends,
        sendMessage,
        readUser,
        friendLists,
        userLists,
        account,
        userName,
        loading,
        friendMsg,
        currentUserName,
        currentUserAddress,
        error,
        clearChat,
        connectWallet,
        updatePublicKey,
        testEncryption,
        myPublicKey,
        searchQuery,
        setSearchQuery,
        filteredFriendLists,
      }}
    >
      {children}
    </ChatAppContect.Provider>
  );
};
