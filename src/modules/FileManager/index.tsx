import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  addFileOnChain,
  ensureSepoliaNetwork,
  getProvider,
  verifyFileOnChain,
  getSigner,
  getWalletEncryptionKey,
} from '../Blockchain';
import UploadIcon from '../../assets/icons/UploadIcon';
import FoxIcon from '../../assets/icons/FoxIcon.svg';
import FileIcon from '../../assets/icons/FileIconn.svg';
import './styles/styles.css';
import { waitForTxConfirmation } from '../WaitForTx';

interface FileInfo {
  fileId: string;
  ipfsCid: string;
  originalFileHash: string;
  filename?: string;
  contentType?: string;
}

// --- Helper Functions ---

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string) => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

// З'єднує два масиви (IV + EncryptedData)
const concatenateBuffers = (buffer1: ArrayBuffer, buffer2: ArrayBuffer) => {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
};

export const FileManager: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [status, setStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) fetchMyFiles();
  }, [isAuthenticated]);

  const handleFileSelect = (file: File | null) => {
    if (file) uploadFile(file);
  };

  // --- Drag & Drop Handlers ---
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
  };
  const handleButtonClick = () => fileInputRef.current?.click();

  const uploadFile = async (file: File) => {
    try {
      setIsLoading(true);
      setStatus('Initializing encryption...');

      await ensureSepoliaNetwork();

      const fileKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

      setStatus('Encrypting file locally...');
      const fileIv = crypto.getRandomValues(new Uint8Array(12));
      const fileData = await file.arrayBuffer();
      const encryptedFileBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: fileIv }, fileKey, fileData);

      const hashBuf = await crypto.subtle.digest('SHA-256', fileData);
      const fileHashHex = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      setStatus('Please sign in MetaMask to secure your file key...');
      const signer = await getSigner();
      const walletKey = await getWalletEncryptionKey(signer);

      setStatus('Securing file key...');
      const rawFileKey = await crypto.subtle.exportKey('raw', fileKey);
      const keyIv = crypto.getRandomValues(new Uint8Array(12));

      const encryptedKeyBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: keyIv }, walletKey, rawFileKey);

      const combinedKeyData = concatenateBuffers(keyIv.buffer, encryptedKeyBuf);

      setStatus('Submitting transaction to blockchain...');
      const txHash = await addFileOnChain(fileHashHex, fileHashHex);

      setStatus('Transaction sent. Waiting for confirmation...');
      const provider = getProvider();
      await waitForTxConfirmation(provider, txHash, setStatus);

      setStatus('Transaction confirmed. Uploading encrypted data...');
      const form = new FormData();

      form.append('encrypted_file', new Blob([encryptedFileBuf], { type: file.type }), file.name);
      form.append('file_type', file.type);
      form.append('original_file_hash', fileHashHex);

      form.append('iv', arrayBufferToBase64(fileIv.buffer));

      form.append('encrypted_aes_key', arrayBufferToBase64(combinedKeyData));

      await axios.post('https://safetransfer.myftp.org/api/v1/files/upload', form, {
        withCredentials: true,
        headers: { Accept: 'application/json' },
      });

      const resp = await axios.get<FileInfo[]>('https://safetransfer.myftp.org/api/v1/files/my', {
        withCredentials: true,
      });
      const lastFile = resp.data[resp.data.length - 1];
      setFiles((prev) => [...prev, lastFile]);

      setStatus('Success! File uploaded and secured.');
    } catch (err: any) {
      console.error('Upload error:', err);
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        setStatus('Operation cancelled by user');
      } else if (err.message?.includes('insufficient funds')) {
        setStatus('Failed: not enough ETH for gas');
      } else {
        setStatus('Error: ' + (err.response?.data?.detail || err.message || String(err)));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyFiles = async () => {
    try {
      const resp = await axios.get<FileInfo[]>('https://safetransfer.myftp.org/api/v1/files/my', {
        withCredentials: true,
      });
      setFiles(resp.data);
    } catch (e) {
      console.error('Fetch files error:', e);
      setStatus('Failed to load files');
    }
  };

  const downloadAndDecrypt = async (f: FileInfo) => {
    try {
      setIsLoading(true);
      setStatus('Downloading encrypted data...');

      const isNewFile = f.ipfsCid === files[files.length - 1]?.ipfsCid;
      if (!isNewFile) {
        const hashOk = await verifyFileOnChain(f.originalFileHash);
        if (!hashOk) throw new Error('Integrity check failed: Blockchain hash mismatch.');
      }

      const resp = await axios.get(`https://safetransfer.myftp.org/api/v1/files/${f.fileId}/download-info`, {
        withCredentials: true,
      });
      const { encryptedFileData, encryptedAesKey, iv } = resp.data;

      setStatus('Please sign to unlock encryption key...');
      const signer = await getSigner();
      const walletKey = await getWalletEncryptionKey(signer);

      const combinedKeyData = base64ToArrayBuffer(encryptedAesKey);
      const keyIv = combinedKeyData.slice(0, 12);
      const encryptedKeyCipher = combinedKeyData.slice(12);

      setStatus('Decrypting file key...');
      const rawFileKey = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: keyIv }, walletKey, encryptedKeyCipher);
      const fileKey = await crypto.subtle.importKey('raw', rawFileKey, 'AES-GCM', false, ['decrypt']);

      setStatus('Decrypting file content...');
      const fileIvBytes = new Uint8Array(
        atob(iv)
          .split('')
          .map((c) => c.charCodeAt(0))
      );
      const encryptedFileBytes = base64ToArrayBuffer(encryptedFileData);

      const decryptedBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fileIvBytes },
        fileKey,
        encryptedFileBytes
      );

      const blob = new Blob([decryptedBuf], { type: f.contentType ?? 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.filename ?? f.ipfsCid ?? 'download.bin';
      a.click();
      URL.revokeObjectURL(url);

      setStatus('File successfully decrypted and downloaded');
    } catch (err: any) {
      console.error(err);
      setStatus(
        'Decryption error: ' + (err.response?.data?.detail || err.message || 'Signature mismatch or data corrupted')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="file-manager-container">
      {user && (
        <div className="user-info">
          <img src={FoxIcon} alt="MetaMask" className="fox-icon" />
          <p>
            Connected: <span>{user.address}</span>
          </p>
        </div>
      )}

      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleButtonClick}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
        />
        <button className="upload-button" type="button">
          <UploadIcon /> Upload Secure File
        </button>
        <p className="upload-prompt">or drag and drop your file here</p>
      </div>

      {status && (
        <p className="status-message">
          {isLoading ? (
            <>
              <span className="spinner"></span> {status}...
            </>
          ) : (
            <span>{status}</span>
          )}
        </p>
      )}

      <div className="file-list-container">
        <h3 className="file-list-title">My Files</h3>
        <div className="file-list">
          {files.length === 0 ? (
            <p className="status-message">No files uploaded yet</p>
          ) : (
            files.map((f) => (
              <div key={f.fileId} className="file-item">
                <img src={FileIcon} alt="file" className="file-icon" />
                <span className="file-name">{f.filename || f.ipfsCid}</span>
                <button className="download-button" onClick={() => downloadAndDecrypt(f)}>
                  Download & Decrypt
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
