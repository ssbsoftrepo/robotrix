const BASE_URL = 'http://localhost:8081';

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
    return text ? JSON.parse(text) : null;
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
};
