import { getApiBaseUrl } from './api';

type StatusCallback = (online: boolean) => void;

let _isOnline = navigator.onLine;
const _listeners: StatusCallback[] = [];
let _pollTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Lightweight connectivity check — HEAD request to the API server.
 * Falls back to navigator.onLine if the request itself errors.
 */
const probeServer = async (): Promise<boolean> => {
    try {
        const baseUrl = getApiBaseUrl();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${baseUrl}/api/auth/check-username?username=_ping`, {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-store',
        });
        clearTimeout(timeout);
        // Any HTTP response (even 4xx) means the server is reachable
        return true;
    } catch {
        return false;
    }
};

const setOnline = (online: boolean) => {
    if (online === _isOnline) return;
    _isOnline = online;
    window.dispatchEvent(new CustomEvent(online ? 'robotrix-online' : 'robotrix-offline'));
    _listeners.forEach(cb => {
        try { cb(online); } catch { /* swallow listener errors */ }
    });
};

/**
 * Returns current connectivity status.
 */
export const isOnline = (): boolean => _isOnline;

/**
 * Subscribe to connectivity changes. Returns an unsubscribe function.
 */
export const onStatusChange = (cb: StatusCallback): (() => void) => {
    _listeners.push(cb);
    return () => {
        const idx = _listeners.indexOf(cb);
        if (idx !== -1) _listeners.splice(idx, 1);
    };
};

/**
 * Force a connectivity re-check right now. Returns the result.
 */
export const checkNow = async (): Promise<boolean> => {
    const result = await probeServer();
    setOnline(result);
    return result;
};

/**
 * Initialise listeners. Call once at app startup.
 */
export const initNetworkMonitor = () => {
    // Browser events give us fast hints
    window.addEventListener('online', () => {
        // Browser says online — verify with a real probe
        probeServer().then(setOnline);
    });
    window.addEventListener('offline', () => {
        setOnline(false);
    });

    // Periodic probe every 30s when offline (to detect reconnection)
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(async () => {
        if (!_isOnline) {
            const result = await probeServer();
            setOnline(result);
        }
    }, 30_000);

    // Initial probe
    probeServer().then(setOnline);
};
