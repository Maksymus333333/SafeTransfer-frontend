import axios from 'axios';

export interface NonceResponse {
  nonce: string;
}

export interface VerifySiweResponse {
  access_token: string;
}

export interface User {
  id: string;
  email: string;
  address: string;
}

export const getNonce = async (): Promise<NonceResponse> => {
  const response = await axios.get<NonceResponse>('http://localhost:8000/api/v1/auth/nonce', {
    headers: { Accept: 'application/json' },
  });
  return response.data;
};

export const verifySiwe = async (message: string, signature: string): Promise<VerifySiweResponse> => {
  const response = await axios.post<VerifySiweResponse>('http://localhost:8000/api/v1/auth/verify-siwe', {
    message,
    signature,
  });
  return response.data;
};

export const getMe = async (token: string): Promise<User> => {
  const response = await axios.get<User>('http://localhost:8000/api/v1/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
