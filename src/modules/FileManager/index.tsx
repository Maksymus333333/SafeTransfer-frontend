/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { encrypt as ethEncrypt } from '@metamask/eth-sig-util';

interface FileInfo {
  fileId: string;
  ipfsCid: string;
  originalFileHash: string;
  fileName: string;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isAuthenticated) fetchMyFiles();
  }, [isAuthenticated]);

  if (!isAuthenticated) return <p>You need to log in</p>;

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setStatus('⚙️ File selected. Generating AES key and encrypting...');
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    try {
      setStatus('🔐 Preparing encryption...');

      const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', aesKey));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const fileData = await file.arrayBuffer();
      setStatus('🔐 Encrypting file...');
      const encryptedFile = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, fileData);

      const hashBuffer = await crypto.subtle.digest('SHA-256', fileData);
      const fileHashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (!(window as any).ethereum) {
        setStatus('❌ MetaMask not found.');
        return;
      }
      const eth = (window as any).ethereum;

      setStatus('🔑 Requesting public key from MetaMask...');
      const encryptionPublicKey = await eth.request({
        method: 'eth_getEncryptionPublicKey',
        params: [user?.address],
      });

      setStatus('🔐 Encrypting AES key...');
      const encResult = ethEncrypt({
        publicKey: encryptionPublicKey,
        data: arrayBufferToBase64(rawKey.buffer),
        version: 'x25519-xsalsa20-poly1305',
      });
      const encryptedAesKeyString = btoa(JSON.stringify(encResult));

      const ivHex = Array.from(iv)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const formData = new FormData();
      formData.append('encrypted_file', new Blob([encryptedFile], { type: file.type }), file.name);
      formData.append('encrypted_aes_key', encryptedAesKeyString);
      formData.append('iv', ivHex);
      formData.append('original_file_hash', fileHashHex);

      setStatus('📤 Uploading...');
      await axios.post('http://localhost:8000/api/v1/files/upload', formData, {
        withCredentials: true,
        headers: { Accept: 'application/json' },
      });

      setStatus('✅ File uploaded successfully');
      setSelectedFile(null);
      fetchMyFiles();
    } catch (err: any) {
      console.error('Upload error:', err);
      setStatus('❌ Upload error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const fetchMyFiles = async () => {
    try {
      const resp = await axios.get('http://localhost:8000/api/v1/files/my', {
        withCredentials: true,
      });

      const mappedFiles: FileInfo[] = resp.data.map((f: any) => ({
        fileId: f.fileId,
        ipfsCid: f.ipfsCid,
        originalFileHash: f.originalFileHash,
        fileName: f.ipfsCid,
      }));
      setFiles(mappedFiles);
    } catch (err) {
      console.error('Fetch files error:', err);
    }
  };

  const downloadFile = async (file: FileInfo) => {
    try {
      setStatus('⏳ Fetching file...');
      const resp = await axios.get(`http://localhost:8000/api/v1/files/${file.fileId}/download-info`, {
        withCredentials: true,
      });

      const { encryptedAesKey, encryptedFileData, iv } = resp.data;

      const eth = (window as any).ethereum;
      const encObjJson = atob(encryptedAesKey);
      const encObj = JSON.parse(encObjJson);
      const cipherTextBase64 = btoa(JSON.stringify(encObj));
      const decryptedKeyB64 = await eth.request({ method: 'eth_decrypt', params: [cipherTextBase64, user?.address] });

      const rawAesKeyBuf = base64ToArrayBuffer(decryptedKeyB64);
      const aesKey = await crypto.subtle.importKey('raw', rawAesKeyBuf, 'AES-GCM', true, ['decrypt']);

      const encryptedFileBuf = base64ToArrayBuffer(encryptedFileData);
      const ivBytes = Uint8Array.from(iv.match(/.{2}/g)!.map((h: string) => parseInt(h, 16)));
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, aesKey, encryptedFileBuf);

      const blob = new Blob([decrypted]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('✅ File downloaded and decrypted!');
    } catch (err: any) {
      console.error('Download error:', err);
      setStatus('❌ Download error: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      {user && <p>User: {user.address}</p>}
      <h2>File Manager (AES-GCM + MetaMask)</h2>

      <input type="file" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} />

      <p>{status}</p>

      <h3>My files</h3>
      <ul>
        {files.map((f) => (
          <li key={f.fileId}>
            <strong>IPFS:</strong> {f.ipfsCid} <br />
            <small>Hash: {f.originalFileHash}</small> <br />
            <button onClick={() => downloadFile(f)}>Download & Decrypt</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
