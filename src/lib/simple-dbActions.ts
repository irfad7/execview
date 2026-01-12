"use server";

import { SimpleAuthService } from "./simple-auth";
import { FirmMetrics } from "./types";
import { cookies } from "next/headers";
import { getMockData } from "./mockData";

// Helper to get current authenticated user
async function getUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        
        if (!token) return null;
        
        const user = await SimpleAuthService.validateSession(token);
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

export async function ensureDb() {
    // Using simple in-memory storage for demo
    console.log('Simple storage ready');
}

export async function getSyncStatus() {
    const user = await getUser();
    if (!user) return null;
    
    return {
        id: 1,
        service: 'general',
        lastUpdated: new Date(),
        status: 'success',
        errorMessage: null,
        userId: user.id
    };
}

export async function updateSyncStatus(status: string, errorMessage?: string) {
    const user = await getUser();
    if (!user) return;
    
    // Log sync status update for demo
    console.log(`Sync status updated: ${status}`, errorMessage);
}

export async function refreshDashboardData(): Promise<FirmMetrics> {
    const user = await getUser();
    if (!user) throw new Error("Unauthorized");

    console.log("Using mock data for dashboard refresh");
    
    // Return mock data for demo
    return await getMockData();
}

export async function getLiveDashboardData(): Promise<FirmMetrics | null> {
    const user = await getUser();
    if (!user) return null;

    // Return mock data
    return await getMockData();
}

export async function getCachedData(): Promise<FirmMetrics | null> {
    return getLiveDashboardData();
}

export async function setCachedData(data: FirmMetrics) {
    // In a real implementation, this would cache the data
    console.log('Data cached successfully (mock)');
}

export async function getApiConfigs() {
    const user = await getUser();
    if (!user) return [];
    
    return [
        {
            id: '1',
            service: 'clio',
            isActive: false,
            accessToken: null,
            updatedAt: new Date(),
            userId: user.id
        },
        {
            id: '2', 
            service: 'execview', // GHL alias
            isActive: false,
            accessToken: null,
            updatedAt: new Date(),
            userId: user.id
        },
        {
            id: '3',
            service: 'quickbooks',
            isActive: false,
            accessToken: null,
            updatedAt: new Date(),
            userId: user.id
        }
    ];
}

export async function getProfile() {
    const user = await getUser();
    if (!user) return null;
    
    return {
        id: user.id,
        name: 'My Legal Academy Admin',
        firmName: 'My Legal Academy',
        email: user.email,
        phone: '',
        userId: user.id
    };
}

export async function updateProfile(profile: any) {
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');
    
    console.log('Profile updated (mock):', profile);
}