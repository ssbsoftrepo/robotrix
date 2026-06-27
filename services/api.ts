const BASE_URL = 'http://localhost:8081';

export const getAuthToken = () => sessionStorage.getItem('robotrix_token');
export const setAuthToken = (token: string) => sessionStorage.setItem('robotrix_token', token);
export const removeAuthToken = () => {
    sessionStorage.removeItem('robotrix_token');
    sessionStorage.removeItem('robotrix_role');
    sessionStorage.removeItem('robotrix_username');
    sessionStorage.removeItem('robotrix_tenant');
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

    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const text = await response.text();
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
    createPatient: (body: any) => request('/api/patients', { method: 'POST', body: JSON.stringify(body) }),
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
    getDoctors: (page: number, size: number, search?: string) => {
        let url = `/api/hospitaladmin/users?page=${page}&size=${size}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return request(url);
    },
    updateDoctor: (id: number | string, body: any) => request(`/api/hospitaladmin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};
