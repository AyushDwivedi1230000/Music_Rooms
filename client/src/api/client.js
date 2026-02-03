/**
 * API client - base URL from env, used for rooms, upload, admin
 */

import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || '';

const client = axios.create({
  baseURL: baseURL ? `${baseURL}/api` : '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    // Prefer server message for 4xx/5xx so user sees "Database not connected" etc.
    const serverMessage = err.response?.data?.message;
    const message =
      serverMessage || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default client;
