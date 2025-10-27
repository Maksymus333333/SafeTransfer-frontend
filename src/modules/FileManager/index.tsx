/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface FileInfo {
  fileId: string;
  ipfsCid: string;
  originalFileHash: string;
  fileName?: string;
}

export const FileManager: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isAuthenticated) fetchMyFiles();
  }, [isAuthenticated]);

  if (!isAuthenticated) return <p>You need to log in</p>;

  // ==================== UPLOAD ====================
  const uploadFile = async () => {
    if (!selectedFile) return;

    try {
      setStatus('🔐 Encrypting file...');

      // 1️⃣ Генеруємо AES ключ і IV
      const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', aesKey));
      const iv = crypto.getRandomValues(new Uint8Array(16));

      // 2️⃣ Шифруємо файл
      const fileData = await selectedFile.arrayBuffer();
      const encryptedFile = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, fileData);

      // 3️⃣ Форматуємо ключ, IV і hash
      const keyBase64 = btoa(String.fromCharCode(...rawKey)); // Base64 AES ключ
      const ivHex = Array.from(iv)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileData);
      const fileHashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // 4️⃣ FormData
      const formData = new FormData();
      formData.append('encrypted_file', new Blob([encryptedFile], { type: selectedFile.type }), selectedFile.name);
      formData.append('encrypted_aes_key', keyBase64);
      formData.append('iv', ivHex);
      formData.append('original_file_hash', fileHashHex);

      // 5️⃣ POST
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const response = await axios.post('http://localhost:8000/api/v1/files/upload', formData, {
        withCredentials: true,
        headers: { Accept: 'application/json' },
      });

      setStatus('✅ File uploaded!');
      setSelectedFile(null);
      fetchMyFiles();
    } catch (err: any) {
      console.error('Upload error:', err);
      setStatus('❌ Upload error: ' + (err.response?.data?.detail || err.message));
    }
  };

  // ==================== FETCH FILES ====================
  const fetchMyFiles = async () => {
    try {
      const resp = await axios.get<FileInfo[]>('http://localhost:8000/api/v1/files/my', {
        withCredentials: true,
      });
      setFiles(resp.data);
    } catch (err) {
      console.error('Fetch files error:', err);
    }
  };

  // ==================== DOWNLOAD ====================
  const downloadFile = async (file: FileInfo) => {
    try {
      setStatus('⏳ Fetching file...');
      const resp = await axios.get(`http://localhost:8000/api/v1/files/${file.fileId}/download-info`, {
        withCredentials: true,
      });

      const { encryptedAesKey, encryptedFileData, iv } = resp.data;

      // 🔑 1️⃣ Розшифровуємо AES ключ
      // Тут тобі потрібно розшифрувати AES ключ своїм приватним ключем (RSA-OAEP)
      // Для прикладу я покажу як, якщо ключ не зашифрований і можна використовувати прямо:
      const aesKeyRaw = Uint8Array.from(atob(encryptedAesKey), (c) => c.charCodeAt(0));
      const aesKey = await crypto.subtle.importKey('raw', aesKeyRaw, 'AES-GCM', true, ['decrypt']);

      // 🔓 2️⃣ Розшифровуємо файл
      const fileData = Uint8Array.from(atob(encryptedFileData), (c) => c.charCodeAt(0));
      const ivBytes = Uint8Array.from(iv.match(/.{2}/g)!.map((h: string) => parseInt(h, 16)));

      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, aesKey, fileData);

      // 📂 3️⃣ Завантажуємо
      const blob = new Blob([decrypted]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName || file.ipfsCid;
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
      <h2>File Manager</h2>

      <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
      {selectedFile && <p>Selected: {selectedFile.name}</p>}
      <button onClick={uploadFile} disabled={!selectedFile}>
        Upload File
      </button>

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
