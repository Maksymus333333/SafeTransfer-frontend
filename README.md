# 🔐 SafeTransfer

**SafeTransfer** — це React-застосунок для безпечного зберігання та обміну файлами з end-to-end шифруванням, використовуючи MetaMask та Ethereum блокчейн.

## ✨ собливості

- 🦊 **MetaMask автентифікація** — вхід через Ethereum гаманець (SIWE)
- 🔒 **End-to-End шифрування** — AES-256-GCM для файлів + x25519 для ключів
- 📤 **Drag & Drop завантаження** — зручний інтерфейс для файлів
- 🔑 **риватний ключ не покидає MetaMask** — максимальна безпека
- ⛓️ **Ethereum Smart Contract** — готовий для децентралізованого зберігання

## 🏗️ рхітектура

```
src/
├── App.tsx                 # оловний компонент
├── context/
│   └── AuthContext.tsx     # онтекст автентифікації (SIWE)
├── global/
│   ├── api/
│   │   └── authApi.ts      # API для автентифікації
│   └── router/
│       └── Routes.tsx      # аршрутизація
├── modules/
│   ├── Ethers/             # Інтеграція з Ethereum контрактом
│   ├── FileManager/        # енеджер файлів (upload/download)
│   ├── Header/             # Шапка сайту
│   ├── Login/              # Сторінка входу
│   └── landing/            # ендинг сторінки
└── pages/
    └── LandingPage/        # оловна сторінка
```

## 🔑 отік автентифікації

```
1. ористувач натискає "Login"
         ↓
2. GET /api/v1/auth/nonce → отримання nonce
         ↓
3. MetaMask: eth_requestAccounts → отримання адреси
         ↓
4. ормування SIWE повідомлення
         ↓
5. MetaMask: personal_sign → підпис повідомлення
         ↓
6. POST /api/v1/auth/verify-siwe → верифікація
         ↓
7. GET /api/v1/users/me → дані користувача
```

## 📤 отік завантаження файлу

```
1. ибір файлу (drag & drop або кнопка)
         ↓
2. енерація AES-256-GCM ключа + IV
         ↓
3. Шифрування файлу AES-GCM
         ↓
4. SHA-256 хеш оригінального файлу
         ↓
5. MetaMask: eth_getEncryptionPublicKey
         ↓
6. Шифрування AES ключа публічним ключем (x25519-xsalsa20-poly1305)
         ↓
7. POST /api/v1/files/upload → відправка на сервер
```

## 📥 отік завантаження файлу

```
1. GET /api/v1/files/{fileId}/download-info
         ↓
2. MetaMask: eth_decrypt → дешифрування AES ключа
         ↓
3. AES-GCM decrypt → дешифрування файлу
         ↓
4. втоматичне завантаження файлу
```

## 🔐 Схема шифрування

```
┌────────────────────────────────────────────────────────────┐
│                    UPLOAD (Шифрування)                      │
├────────────────────────────────────────────────────────────┤
│  [Original File] ──AES-256-GCM──→ [Encrypted File]         │
│                        ↑                                    │
│                   [AES Key] + [IV]                          │
│                        │                                    │
│  [MetaMask PubKey] ──x25519──→ [Encrypted AES Key]         │
│                                                             │
│  → Backend: encrypted_file + encrypted_aes_key + iv        │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                   DOWNLOAD (ешифрування)                   │
├────────────────────────────────────────────────────────────┤
│  [Encrypted AES Key] ──MetaMask eth_decrypt──→ [AES Key]   │
│                                                             │
│  [Encrypted File] + [AES Key] + [IV]                       │
│           ↓                                                 │
│       AES-GCM decrypt → [Original File]                    │
└────────────────────────────────────────────────────────────┘
```

## �� API Endpoints

| етод   | Endpoint                               | пис                     |
| ------ | -------------------------------------- | ----------------------- |
| `GET`  | `/api/v1/auth/nonce`                   | тримання nonce для SIWE |
| `POST` | `/api/v1/auth/verify-siwe`             | ерифікація підпису      |
| `GET`  | `/api/v1/users/me`                     | ані користувача         |
| `POST` | `/api/v1/files/upload`                 | авантаження файлу       |
| `GET`  | `/api/v1/files/my`                     | Список файлів           |
| `GET`  | `/api/v1/files/{fileId}/download-info` | Інфо для завантаження   |

## 🔗 Smart Contract

**дреса:** `0x55EE4E217290854c3285a6725C97748c04Ee3246`

**ункції:**

- `addFile(ipfsCid, originalFileHash)` — додати файл
- `getFilesByOwner(address)` — отримати файли власника

## 🚀 апуск проекту

### становлення залежностей

```bash
npm install
```

### апуск в режимі розробки

```bash
npm start
```

ідкрийте [http://localhost:3000](http://localhost:3000) у браузері.

### бірка для продакшену

```bash
npm run build
```

### інтинг та форматування

```bash
npm run lint
npm run format
```

## 🛠️ Технології

- **React 19** + **TypeScript**
- **Ethers.js 6** — взаємодія з Ethereum
- **SIWE** — Sign-In with Ethereum
- **@metamask/eth-sig-util** — шифрування ключів
- **Web Crypto API** — AES-GCM шифрування
- **Axios** — HTTP клієнт
- **React Router 7** — маршрутизація
- **CRACO** — налаштування Webpack

## 🔒 езпека

1. **End-to-End Encryption** — файли шифруються на клієнті
2. **риватний ключ в MetaMask** — `eth_decrypt` без експорту ключа
3. **HttpOnly Cookies** — захист сесії
4. **SIWE стандарт** — безпечна Web3 автентифікація
5. **SHA-256** — перевірка цілісності файлів

## 📝 іцензія

MIT License

## 👤 втор

**Maksymus333333** — [GitHub](https://github.com/Maksymus333333)
