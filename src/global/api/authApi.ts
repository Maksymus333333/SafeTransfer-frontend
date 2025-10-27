import axios from 'axios';

export interface NonceResponse {
  nonce: string;
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

export const verifySiwe = async (message: string, signature: string): Promise<void> => {
  await axios.post(
    'http://localhost:8000/api/v1/auth/verify-siwe',
    {
      message,
      signature,
    },
    {
      withCredentials: true,
    }
  );
};

export const getMe = async (): Promise<User> => {
  const response = await axios.get<User>('http://localhost:8000/api/v1/users/me', {
    withCredentials: true,
  });
  return response.data;
};
