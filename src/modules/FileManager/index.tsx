/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { encrypt as ethEncrypt } from '@metamask/eth-sig-util';
import { useAuth } from '../../context/AuthContext';
import './styles/styles.css';
import UploadIcon from '../../assets/icons/UploadIcon';
import { ReactComponent as FoxIcon } from '../../assets/icons/FoxIcon.svg';
import FileIcon from '../../assets/icons/FileIconn.png';

interface FileInfo {
  fileId: string;
  ipfsCid: string;
  originalFileHash: string;
  filename?: string;
}

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

export const FileManager: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [status, setStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) fetchMyFiles();
  }, [isAuthenticated]);

  const handleFileSelect = (file: File | null) => {
    if (file) {
      uploadFile(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Necessary to allow drop
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // ---------- UPLOAD ----------
  const uploadFile = async (file: File) => {
    try {
      setStatus('🔐 Preparing encryption...');

      // 1) Generate AES key + IV
      const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', aesKey));
      const iv = crypto.getRandomValues(new Uint8Array(16));

      // 2) Encrypt file with AES-GCM
      const fileData = await file.arrayBuffer();
      setStatus('🔐 Encrypting file...');
      const encryptedFileBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, fileData);

      // 3) SHA-256 of original file
      const hashBuf = await crypto.subtle.digest('SHA-256', fileData);
      const fileHashHex = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // 4) Request MetaMask public key
      if (!(window as any).ethereum) throw new Error('MetaMask not available');
      const eth = (window as any).ethereum;
      setStatus('🔑 Requesting encryption public key from MetaMask...');
      const encryptionPublicKey = await eth.request({
        method: 'eth_getEncryptionPublicKey',
        params: [user?.address],
      });

      // 5) Encrypt AES key using MetaMask public key
      setStatus('🔐 Encrypting AES key with MetaMask public key...');
      const encResult = ethEncrypt({
        publicKey: encryptionPublicKey,
        data: arrayBufferToBase64(rawKey.buffer),
        version: 'x25519-xsalsa20-poly1305',
      });
      const encryptedAesKeyForBackend = btoa(JSON.stringify(encResult));

      // 6) Convert IV to hex
      const ivHex = Array.from(iv)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // 7) Upload to backend
      const formData = new FormData();
      formData.append('encrypted_file', new Blob([encryptedFileBuf], { type: file.type }), file.name);
      formData.append('file_name', file.name);
      formData.append('encrypted_aes_key', encryptedAesKeyForBackend);
      formData.append('iv', ivHex);
      formData.append('original_file_hash', fileHashHex);

      setStatus('📤 Uploading to server...');
      await axios.post('http://localhost:8000/api/v1/files/upload', formData, {
        withCredentials: true,
        headers: { Accept: 'application/json' },
      });

      setStatus('✅ File uploaded!');
      fetchMyFiles();
    } catch (e: any) {
      console.error(e);
      setStatus('❌ Upload error: ' + (e.response?.data?.detail || e.message));
    }
  };

  // ---------- FETCH ----------
  const fetchMyFiles = async () => {
    try {
      const resp = await axios.get<FileInfo[]>('http://localhost:8000/api/v1/files/my', {
        withCredentials: true,
      });
      setFiles(resp.data);
    } catch (e) {
      console.error('Fetch files error:', e);
    }
  };

  // ---------- DOWNLOAD + DECRYPT ----------
  const downloadAndDecrypt = async (f: FileInfo) => {
    try {
      setStatus('⏳ Requesting download info...');
      const resp = await axios.get(`http://localhost:8000/api/v1/files/${f.fileId}/download-info`, {
        withCredentials: true,
      });
      const { encryptedFileData, encryptedAesKey, iv } = resp.data;

      //   window.ethereum
      const eth = window.ethereum;
      if (!eth) {
        throw new Error('MetaMask not available');
      }

      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error('No MetaMask account connected');
      }

      const userAddress = accounts[0];
      const publicKey = (await eth.request({
        method: 'eth_getEncryptionPublicKey',
        params: [userAddress],
      })) as string;

      console.log('🔑 encryption publicKey for', userAddress, ':', publicKey);
      console.log('RAW encryptedAesKey (from backend):', encryptedAesKey);

      try {
        const base64Decoded = atob(encryptedAesKey);
        console.log('base64Decoded (string):', base64Decoded.slice(0, 200));
        const encJson = JSON.parse(base64Decoded);
        console.log('encJson object:', encJson);
      } catch (err) {
        console.error('Failed to parse encryptedAesKey:', err);
      }

      setStatus('🔑 Requesting MetaMask to decrypt AES key...');
      const encJson = JSON.parse(atob(encryptedAesKey));

      console.log('🔍 trying to decrypt with address', userAddress);
      console.log('🔍 payload:', JSON.stringify(encJson));

      const jsonString = atob(encryptedAesKey);
      const decryptedKeyB64 = (await eth.request({
        method: 'eth_decrypt',
        params: [jsonString, userAddress],
      })) as string;

      const rawAesKeyBuf = base64ToArrayBuffer(decryptedKeyB64);
      const aesKey = await crypto.subtle.importKey('raw', rawAesKeyBuf, 'AES-GCM', true, ['decrypt']);
      const encryptedFileBuf = base64ToArrayBuffer(encryptedFileData);
      const ivBytes = Uint8Array.from(iv.match(/.{2}/g)!.map((h: string) => parseInt(h, 16)));

      setStatus('🔓 Decrypting file...');
      const decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, aesKey, encryptedFileBuf);

      const blob = new Blob([decryptedBuf], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.filename ?? f.ipfsCid;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('✅ File downloaded and decrypted!');
    } catch (err: any) {
      console.error('Download error:', err);
      setStatus('❌ Download error: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="file-manager-container">
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)}
          style={{ display: 'none' }}
        />
        <button className="upload-button" onClick={handleButtonClick}>
          <UploadIcon />
          <span>Upload File</span>
        </button>
        <p className="upload-prompt">To upload a file, drag it here or click the button</p>
      </div>

      {user && (
        <div className="user-info">
          <FoxIcon className="fox-icon" />
          <p>
            Your wallet: <span>{user.address}</span>
          </p>
        </div>
      )}

      <div className="file-list-container">
        {files.length > 0 && <h2 className="file-list-title">Uploaded files</h2>}
        <div className="file-list">
          {files.map((f) => (
            <div key={f.fileId} className="file-item">
              <img src={FileIcon} alt="File" className="file-icon" />
              <span className="file-name">{f.filename || 'Unnamed file'}</span>
              <button className="download-button" onClick={() => downloadAndDecrypt(f)}>
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
      {status && <p className="status-message">{status}</p>}
    </div>
  );
};
