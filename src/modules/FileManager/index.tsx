/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { addFileOnChain, verifyFileOnChain } from '../Blockchain';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isAuthenticated) fetchMyFiles();
  }, [isAuthenticated]);

  if (!isAuthenticated) return <p>You need to log in</p>;

  // ---------- UPLOAD FILE ----------
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

      // 3️⃣ blockchain
      await addFileOnChain(uploadedFile.ipfsCid, fileHashHex);
      setStatus('✅ File registered on Sepolia blockchain');

      setSelectedFile(null);

      setFiles((prev) => [...prev, uploadedFile]);
    } catch (err: any) {
      console.error('Upload error:', err);
      setStatus('❌ Upload error: ' + (err.response?.data?.detail || err.message || String(err)));
    }
  };

  // ---------- FETCH FILES ----------
  const fetchMyFiles = async () => {
    try {
      const resp = await axios.get<FileInfo[]>('http://localhost:8000/api/v1/files/my', { withCredentials: true });
      setFiles(resp.data);
    } catch (e) {
      console.error('Fetch files error:', e);
      setStatus('❌ Fetch files error');
    }
  };

  // ---------- DOWNLOAD & DECRYPT ----------
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
    <div>
      {user && <p>User: {user.address}</p>}
      <h2>File Manager — client-side AES encryption + Sepolia</h2>

      <input type="file" onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])} />
      <button disabled={!selectedFile} onClick={() => selectedFile && uploadFile(selectedFile)}>
        Upload (encrypt client-side)
      </button>
      <p>{status}</p>

      <h3>My files</h3>
      <ul>
        {files.map((f) => (
          <li key={f.fileId}>
            {f.filename} — Hash: {f.originalFileHash}
            <button onClick={() => downloadAndDecrypt(f)}>Download & Decrypt</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
