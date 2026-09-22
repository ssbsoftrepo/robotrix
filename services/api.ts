import { Capacitor } from '@capacitor/core';

export const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }
    if (Capacitor.isNativePlatform()) {
        return 'http://13.206.205.222';
    }
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `http://${hostname}`;
    }
    return 'http://localhost:8081';
};

/**
 * Check if an error is a network connectivity error (as opposed to a server error).
 * Used by the offline cache layer to decide whether to fall back to cached data.
 */
export const isNetworkError = (e: any): boolean => {
    if (e instanceof TypeError && (e.message === 'Failed to fetch' || e.message === 'NetworkError when attempting to fetch resource.' || e.message.includes('Network request failed'))) {
        return true;
    }
    if (e && e._isNetworkError === true) {
        return true;
    }
    return false;
};

export const getAuthToken = () => localStorage.getItem('robotrix_token');
export const setAuthToken = (token: string) => localStorage.setItem('robotrix_token', token);
export const removeAuthToken = () => {
    localStorage.removeItem('robotrix_token');
    localStorage.removeItem('robotrix_role');
    localStorage.removeItem('robotrix_username');
    localStorage.removeItem('robotrix_tenant');
};

async function request(path: string, options: RequestInit = {}) {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const baseUrl = getApiBaseUrl();

    let response: Response;
    try {
        response = await fetch(`${baseUrl}${path}`, {
            ...options,
            headers,
        });
    } catch (e: any) {
        // Tag network errors so the offline layer can identify them
        const networkErr: any = new Error(e.message || 'Network request failed');
        networkErr._isNetworkError = true;
        throw networkErr;
    }

    if (!response.ok) {
        const text = await response.text();
        if (response.status === 401 || response.status === 403) {
            removeAuthToken();
            window.dispatchEvent(new Event('auth-error'));
        }
        throw new Error(text || 'Request failed');
    }

    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('image/') || contentType.includes('application/octet-stream'))) {
        return response.blob();
    }

    const text = await response.text();
    try {
        return text ? JSON.parse(text) : null;
    } catch (e) {
        return text;
    }
}

export const api = {
    login: (body: any) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    checkUsername: (username: string) => request(`/api/auth/check-username?username=${encodeURIComponent(username)}`),
    createHospital: (body: any) => request('/api/superadmin/hospitals', { method: 'POST', body: JSON.stringify(body) }),
    createDoctor: (body: any) => request('/api/hospitaladmin/users', { method: 'POST', body: JSON.stringify(body) }),
    getPatients: () => request('/api/patients'),
    getNextPid: () => request('/api/patients/next-pid'),
    createPatient: (body: any) => request('/api/patients', { method: 'POST', body: JSON.stringify(body) }),
    updatePatient: (id: string | number, body: any) => request(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deletePatient: (id: string | number) => request(`/api/patients/${id}`, { method: 'DELETE' }),
    savePlan: (formData: FormData) => request('/api/plans', { method: 'POST', body: formData }),
    getPlanImage: (planId: number | string, imageType: string) => request(`/api/images/${planId}/${imageType}`),
    getPlansForPatient: (patientId: number | string) => request(`/api/patients/${patientId}/plans`),
    getPlanDetails: (planId: number | string) => request(`/api/plans/${planId}`),
    getHospitals: (page: number, size: number, search?: string) => {
        let url = `/api/superadmin/hospitals?page=${page}&size=${size}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return request(url);
    },
    updateHospital: (id: string, body: any) => request(`/api/superadmin/hospitals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    toggleHospital: (id: string) => request(`/api/superadmin/hospitals/${id}/toggle`, { method: 'POST' }),
    renewSubscription: (id: string) => request(`/api/superadmin/hospitals/${id}/renew`, { method: 'POST' }),
    getDoctors: (page: number, size: number, search?: string) => {
        let url = `/api/hospitaladmin/users?page=${page}&size=${size}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return request(url);
    },
    updateDoctor: (id: number | string, body: any) => request(`/api/hospitaladmin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    resetDoctorPassword: (id: number | string, newPassword: string) => request(`/api/hospitaladmin/users/${id}/reset-password`, { method: 'PUT', body: JSON.stringify({ newPassword }) }),
    resetHospitalAdminPassword: (id: string, newPassword: string) => request(`/api/superadmin/hospitals/${id}/reset-password`, { method: 'PUT', body: JSON.stringify({ newPassword }) }),
    forgotPasswordRequest: (email: string) => request('/api/auth/forgot-password/request', { method: 'POST', body: JSON.stringify({ email }) }),
    forgotPasswordVerify: (email: string, otp: string) => request('/api/auth/forgot-password/verify', { method: 'POST', body: JSON.stringify({ email, otp }) }),
    forgotPasswordReset: (body: any) => request('/api/auth/forgot-password/reset', { method: 'POST', body: JSON.stringify(body) }),
    getApiBaseUrl
};

