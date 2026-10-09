import axios from 'axios';

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL não foi configurada.',
  );
}

export const api = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
});