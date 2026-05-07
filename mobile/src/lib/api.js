import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://bakufix.up.railway.app/api';

const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use(async (cfg) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const setToken = (t) => SecureStore.setItemAsync('token', t);
export const getToken = ()  => SecureStore.getItemAsync('token');
export const removeToken = () => SecureStore.deleteItemAsync('token');

export default api;
