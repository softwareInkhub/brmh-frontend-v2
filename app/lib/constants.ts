export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws'); 