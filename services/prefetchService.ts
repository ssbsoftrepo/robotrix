/**
 * Prefetch Service — Eagerly downloads all patient plans + images into
 * IndexedDB so they are available offline without manually visiting each case.
 *
 * Called:
 *   1. After successful login (once patients are loaded)
 *   2. When connectivity is restored (robotrix-online event)
 *
 * Runs in the background and does NOT block the UI.
 */

import { api, isNetworkError } from './api';
import { isOnline } from './networkStatus';
import {
    cachePlanMeta,
    cachePlanData,
    cachePlanImage,
    getCachedPlanImage,
    getCachedPatients,
    cachePatients,
} from './offlineDb';
import type { PlanMetadata } from '../utils/storage';
import type { Patient } from '../types';

let _isPrefetching = false;
let _aborted = false;

type PrefetchStatusCallback = (status: 'idle' | 'prefetching' | 'done' | 'error', message?: string) => void;
let _statusCallback: PrefetchStatusCallback | null = null;

export const onPrefetchStatus = (cb: PrefetchStatusCallback) => {
    _statusCallback = cb;
};

const notify = (status: 'idle' | 'prefetching' | 'done' | 'error', message?: string) => {
    if (_statusCallback) {
        try { _statusCallback(status, message); } catch { /* swallow */ }
    }
};

/**
 * Abort any in-progress prefetch (e.g. on logout).
 */
export const abortPrefetch = () => {
    _aborted = true;
};

/**
 * Check if a plan's images are all cached already.
 */
const extractImageKeys = (data: any, path: string = ''): string[] => {
    const keys: string[] = [];
    if (data === null || data === undefined) return keys;

    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            keys.push(...extractImageKeys(item, `${path}_${index}`));
        });
        return keys;
    }

    if (typeof data === 'object') {
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                if (typeof value === 'string' && value.startsWith('dbimage:')) {
                    keys.push(value.replace('dbimage:', ''));
                } else if (typeof value === 'object') {
                    keys.push(...extractImageKeys(value, path ? `${path}_${key}` : key));
                }
            }
        }
    }

    return keys;
};

/**
 * Prefetch a single plan's data and all its images.
 */
const prefetchPlan = async (planId: string): Promise<void> => {
    if (_aborted || !isOnline()) return;

    // 1. Fetch plan data from server
    let planData: any = null;
    try {
        planData = await api.getPlanDetails(planId);
    } catch (e: any) {
        if (isNetworkError(e)) return; // Lost connectivity — bail silently
        console.warn(`[Prefetch] Failed to fetch plan ${planId}:`, e);
        return;
    }

    if (!planData) return;

    // 2. Cache the raw plan data (with dbimage: references intact)
    await cachePlanData(planId, planData);

    // 3. Extract all dbimage: references and fetch/cache each image
    const imageKeys = extractImageKeys(planData);

    for (const imageKey of imageKeys) {
        if (_aborted || !isOnline()) return;

        // Skip if already cached
        const existing = await getCachedPlanImage(planId, imageKey);
        if (existing) continue;

        try {
            const blob = await api.getPlanImage(planId, imageKey);
            if (blob instanceof Blob) {
                await cachePlanImage(planId, imageKey, blob);
            }
        } catch (e: any) {
            if (isNetworkError(e)) return; // Lost connectivity
            console.warn(`[Prefetch] Failed to fetch image ${imageKey} for plan ${planId}:`, e);
        }
    }
};

/**
 * Main prefetch entry point. Downloads all plans + images for all patients.
 *
 * @param patients - Optional patient list. If not provided, reads from cache.
 */
export const prefetchAllCases = async (patients?: Patient[]): Promise<void> => {
    if (_isPrefetching) {
        console.log('[Prefetch] Already running, skipping duplicate call.');
        return;
    }
    if (!isOnline()) {
        console.log('[Prefetch] Offline, skipping prefetch.');
        return;
    }

    _isPrefetching = true;
    _aborted = false;
    notify('prefetching', 'Downloading cases for offline access...');

    try {
        // Get patient list
        let patientList = patients;
        if (!patientList || patientList.length === 0) {
            // Fetch from server and cache
            try {
                const response = await api.getPatients();
                if (Array.isArray(response)) {
                    patientList = response.map((p: any) => {
                        const nameParts = (p.name || '').trim().split(' ');
                        return {
                            id: String(p.id),
                            pid: p.pid || `PID-${String(p.id).padStart(4, '0')}`,
                            firstName: nameParts[0] || '',
                            lastName: nameParts.slice(1).join(' ') || '',
                            age: p.age ? String(p.age) : '',
                            gender: p.gender || 'Male',
                            date: p.createdAt ? p.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                        } as Patient;
                    });
                    await cachePatients(patientList);
                }
            } catch (e: any) {
                if (isNetworkError(e)) {
                    patientList = await getCachedPatients();
                } else {
                    console.warn('[Prefetch] Failed to fetch patients:', e);
                    patientList = await getCachedPatients();
                }
            }
        }

        if (!patientList || patientList.length === 0) {
            console.log('[Prefetch] No patients to prefetch.');
            _isPrefetching = false;
            notify('done');
            return;
        }

        // For each patient, fetch plan list + plan data + images
        for (const patient of patientList) {
            if (_aborted || !isOnline()) break;

            // Skip offline-only patients (not yet synced to server)
            if (patient.id.startsWith('offline-')) continue;

            try {
                // Fetch plan metadata
                const serverPlans = await api.getPlansForPatient(patient.id);
                if (!Array.isArray(serverPlans)) continue;

                const plans: PlanMetadata[] = serverPlans.map((sp: any) => {
                    let caseDataObj: any = {};
                    try {
                        caseDataObj = typeof sp.caseData === 'string' ? JSON.parse(sp.caseData) : sp.caseData;
                    } catch { /* ignore parse errors */ }
                    return {
                        id: String(sp.id),
                        patientId: patient.id,
                        name: caseDataObj.planName || `Plan ${sp.id}`,
                        createdAt: sp.createdAt || new Date().toISOString(),
                        updatedAt: sp.updatedAt || new Date().toISOString(),
                        legSide: sp.legSide || 'left',
                    } as PlanMetadata;
                });

                // Cache plan metadata
                await cachePlanMeta(patient.id, plans);

                // Prefetch each plan's data + images
                for (const plan of plans) {
                    if (_aborted || !isOnline()) break;
                    await prefetchPlan(plan.id);
                }
            } catch (e: any) {
                if (isNetworkError(e)) break; // Lost connectivity
                console.warn(`[Prefetch] Error prefetching for patient ${patient.id}:`, e);
            }
        }

        if (!_aborted) {
            console.log('[Prefetch] All cases prefetched successfully.');
            notify('done', 'All cases cached for offline access.');
        }
    } catch (e: any) {
        console.error('[Prefetch] Unexpected error:', e);
        notify('error', e.message || 'Prefetch failed');
    } finally {
        _isPrefetching = false;
    }
};
