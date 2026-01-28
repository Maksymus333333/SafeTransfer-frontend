/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { addFileOnChain, verifyFileOnChain } from '../Blockchain';
import UploadIcon from '../../assets/icons/UploadIcon';
import FoxIcon from '../../assets/icons/FoxIcon.svg';
import FileIcon from '../../assets/icons/FileIconn.svg';
import './styles/styles.css';

interface FileInfo {
  fileId: string;
  ipfsCid: string;
  originalFileHash: string;
  filename?: string;
  contentType?: string;
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
    e.stopPropagation();
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

  const uploadFile = async (file: File) => {
    try {
      setStatus('🔐 Generating AES key and IV...');
      const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12));

      setStatus('🔐 Encrypting file...');
      const fileData = await file.arrayBuffer();
      const encryptedBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, fileData);

      const hashBuf = await crypto.subtle.digest('SHA-256', fileData);
      const fileHashHex = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      setStatus('📤 Uploading encrypted file to server...');
      const form = new FormData();
      form.append('encrypted_file', new Blob([encryptedBuf], { type: file.type }), file.name);
      form.append('file_type', file.type);
      form.append('iv', btoa(String.fromCharCode(...iv)));
      form.append('original_file_hash', fileHashHex);

      const exportedKey = await crypto.subtle.exportKey('raw', aesKey);
      form.append('encrypted_aes_key', arrayBufferToBase64(exportedKey));

      const resp = await axios.post('http://localhost:8000/api/v1/files/upload', form, {
        withCredentials: true,
        headers: { Accept: 'application/json' },
      });

      const uploadedFile: FileInfo = resp.data;

      setStatus('✅ File uploaded. Registering on blockchain...');

      await addFileOnChain(uploadedFile.ipfsCid, fileHashHex);
      setStatus('✅ File registered on Sepolia blockchain');

      setFiles((prev) => [...prev, uploadedFile]);
    } catch (err: any) {
      console.error('Upload error:', err);
      setStatus('❌ Upload error: ' + (err.response?.data?.detail || err.message || String(err)));
    }
  };

  const fetchMyFiles = async () => {
    try {
      const resp = await axios.get<FileInfo[]>('http://localhost:8000/api/v1/files/my', { withCredentials: true });
      setFiles(resp.data);
    } catch (e) {
      console.error('Fetch files error:', e);
      setStatus('❌ Fetch files error');
    }
  };

  const downloadAndDecrypt = async (f: FileInfo) => {
    try {
      setStatus('⏳ Downloading encrypted file...');

      const isNewFile = f.ipfsCid === files[files.length - 1]?.ipfsCid;

      if (!isNewFile) {
        const hashOk = await verifyFileOnChain(f.originalFileHash);
        if (!hashOk) throw new Error('❌ File hash mismatch. Cannot download.');
      }

      const resp = await axios.get(`http://localhost:8000/api/v1/files/${f.fileId}/download-info`, {
        withCredentials: true,
      });
      const { encryptedFileData, encryptedAesKey, iv } = resp.data;

      const rawKeyBuf = base64ToArrayBuffer(encryptedAesKey);
      const aesKey = await crypto.subtle.importKey('raw', rawKeyBuf, 'AES-GCM', false, ['decrypt']);

      const ivBytes = new Uint8Array(
        atob(iv)
          .split('')
          .map((c) => c.charCodeAt(0))
      );
      if (ivBytes.byteLength !== 12) throw new Error(`Invalid IV length: ${ivBytes.byteLength}`);

      const encryptedBuf = base64ToArrayBuffer(encryptedFileData);

      setStatus('🔓 Decrypting file...');
      const decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, aesKey, encryptedBuf);

      const blob = new Blob([decryptedBuf], { type: f.contentType ?? 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.filename ?? f.ipfsCid ?? 'download.bin';
      a.click();
      URL.revokeObjectURL(url);

      setStatus('✅ File decrypted and downloaded');
    } catch (err: any) {
      console.error(err);
      setStatus('❌ Download error: ' + (err.response?.data?.detail || err.message || String(err)));
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
          <UploadIcon />
          Upload File
        </button>
        <p className="upload-prompt">or drag and drop your file here</p>
      </div>

      {status && <p className="status-message">{status}</p>}

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
                  Download
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
