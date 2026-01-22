import { PrismaClient } from "@prisma/client";
import { EnhancedGoHighLevelConnector } from "@/integrations/gohighlevel/enhanced-client";
import { getValidAccessTokenWithRealm } from "./tokenRefresh";

const prisma = new PrismaClient();

export interface GHLServiceError {
    code: string;
    message: string;
    details?: any;
}

export class GHLServiceLogger {
    private userId: string;
    private service = "gohighlevel";

    constructor(userId: string) {
        this.userId = userId;
    }

    async logInfo(message: string, details?: any) {
        try {
            await prisma.log.create({
                data: {
                    service: this.service,
                    level: "info",
                    message,
                    details: details ? JSON.stringify(details) : null,
                    userId: this.userId
                }
            });
        } catch (error) {
            console.error("Failed to log info:", error);
        }
    }

    async logError(message: string, error?: any, details?: any) {
        try {
            await prisma.log.create({
                data: {
                    service: this.service,
                    level: "error",
                    message,
                    details: JSON.stringify({
                        error: error instanceof Error ? {
                            name: error.name,
                            message: error.message,
                            stack: error.stack
                        } : error,
                        ...details
                    }),
                    userId: this.userId
                }
            });
        } catch (logError) {
            console.error("Failed to log error:", logError);
        }
    }

    async logWarning(message: string, details?: any) {
        try {
            await prisma.log.create({
                data: {
                    service: this.service,
                    level: "warning",
                    message,
                    details: details ? JSON.stringify(details) : null,
                    userId: this.userId
                }
            });
        } catch (error) {
            console.error("Failed to log warning:", error);
        }
    }
}

export class GHLService {
    private userId: string;
    private logger: GHLServiceLogger;

    constructor(userId: string) {
        this.userId = userId;
        this.logger = new GHLServiceLogger(userId);
    }

    // Get GHL connector instance with error handling and automatic token refresh
    async getConnector(): Promise<{ connector?: EnhancedGoHighLevelConnector; error?: GHLServiceError }> {
        try {
            // Use token refresh utility to get valid token
            const tokenResult = await getValidAccessTokenWithRealm("execview", this.userId);

            if (!tokenResult.success) {
                const error: GHLServiceError = {
                    code: tokenResult.error?.includes("not configured") ? "NO_INTEGRATION" : "MISSING_TOKEN",
                    message: tokenResult.error || "Failed to get valid access token"
                };
                await this.logger.logWarning("GHL token issue", {
                    userId: this.userId,
                    error: tokenResult.error,
                    refreshed: tokenResult.refreshed
                });
                return { error };
            }

            if (!tokenResult.realmId) {
                const error: GHLServiceError = {
                    code: "MISSING_LOCATION",
                    message: "Location ID not found"
                };
                await this.logger.logError("Missing location ID", null, { userId: this.userId });
                return { error };
            }

            // Log if token was refreshed
            if (tokenResult.refreshed) {
                await this.logger.logInfo("GHL token refreshed successfully", { userId: this.userId });
            }

            const connector = new EnhancedGoHighLevelConnector(
                tokenResult.accessToken!,
                tokenResult.realmId
            );

            return { connector };

        } catch (error) {
            const serviceError: GHLServiceError = {
                code: "SERVICE_ERROR",
                message: "Failed to initialize GHL connector",
                details: error instanceof Error ? error.message : "Unknown error"
            };
            await this.logger.logError("Failed to get connector", error);
            return { error: serviceError };
        }
    }

    // Verify GHL connection with comprehensive error handling
    async verifyConnection(): Promise<{ success: boolean; location?: any; error?: GHLServiceError }> {
        try {
            const { connector, error } = await this.getConnector();
            if (error) {
                return { success: false, error };
            }

            const result = await connector!.verifyConnection();
            
            if (result.success) {
                await this.logger.logInfo("GHL connection verified successfully", {
                    location: result.location?.name
                });
                return { success: true, location: result.location };
            } else {
                const serviceError: GHLServiceError = {
                    code: "CONNECTION_FAILED",
                    message: result.error || "Connection verification failed"
                };
                await this.logger.logError("Connection verification failed", null, { error: result.error });
                return { success: false, error: serviceError };
            }

        } catch (error) {
            const serviceError: GHLServiceError = {
                code: "VERIFICATION_ERROR", 
                message: "Failed to verify connection",
                details: error instanceof Error ? error.message : "Unknown error"
            };
            await this.logger.logError("Connection verification error", error);
            return { success: false, error: serviceError };
        }
    }

    // Sync GHL data with comprehensive error handling
    async syncData(): Promise<{ success: boolean; stats?: any; error?: GHLServiceError }> {
        try {
            await this.logger.logInfo("Starting GHL data sync");

            const { connector, error } = await this.getConnector();
            if (error) {
                return { success: false, error };
            }

            const result = await connector!.syncAllData(this.userId);

            if (result.success) {
                await this.logger.logInfo("GHL sync completed successfully", result.stats);
                
                // Update sync status
                await prisma.syncStatus.upsert({
                    where: {
                        userId_service: {
                            userId: this.userId,
                            service: "gohighlevel"
                        }
                    },
                    update: {
                        lastUpdated: new Date(),
                        status: "success",
                        errorMessage: null
                    },
                    create: {
                        userId: this.userId,
                        service: "gohighlevel",
                        lastUpdated: new Date(),
                        status: "success"
                    }
                });

                // Invalidate cache
                await this.invalidateCache();

                return { success: true, stats: result.stats };

            } else {
                const serviceError: GHLServiceError = {
                    code: "SYNC_FAILED",
                    message: result.error || "Data sync failed"
                };
                await this.logger.logError("GHL sync failed", null, { error: result.error });

                // Update sync status
                await prisma.syncStatus.upsert({
                    where: {
                        userId_service: {
                            userId: this.userId,
                            service: "gohighlevel"
                        }
                    },
                    update: {
                        lastUpdated: new Date(),
                        status: "error",
                        errorMessage: result.error || "Sync failed"
                    },
                    create: {
                        userId: this.userId,
                        service: "gohighlevel",
                        lastUpdated: new Date(),
                        status: "error",
                        errorMessage: result.error || "Sync failed"
                    }
                });

                return { success: false, error: serviceError };
            }

        } catch (error) {
            const serviceError: GHLServiceError = {
                code: "SYNC_ERROR",
                message: "Failed to sync data",
                details: error instanceof Error ? error.message : "Unknown error"
            };
            await this.logger.logError("Sync error", error);

            // Update sync status
            try {
                await prisma.syncStatus.upsert({
                    where: {
                        userId_service: {
                            userId: this.userId,
                            service: "gohighlevel"
                        }
                    },
                    update: {
                        lastUpdated: new Date(),
                        status: "error",
                        errorMessage: serviceError.message
                    },
                    create: {
                        userId: this.userId,
                        service: "gohighlevel",
                        lastUpdated: new Date(),
                        status: "error",
                        errorMessage: serviceError.message
                    }
                });
            } catch (dbError) {
                console.error("Failed to update sync status:", dbError);
            }

            return { success: false, error: serviceError };
        }
    }

    // Get enhanced metrics with error handling
    async getMetrics(): Promise<{ success: boolean; data?: any; error?: GHLServiceError }> {
        try {
            // Check cache first
            const cached = await prisma.dashboardCache.findUnique({
                where: {
                    userId_cacheKey: {
                        userId: this.userId,
                        cacheKey: "ghl_enhanced_metrics"
                    }
                }
            });

            const cacheAge = cached ? Date.now() - cached.updatedAt.getTime() : Infinity;
            const isCacheValid = cacheAge < 5 * 60 * 1000; // 5 minutes

            if (cached && isCacheValid) {
                await this.logger.logInfo("Serving GHL metrics from cache", { cacheAge });
                return { success: true, data: JSON.parse(cached.cacheData) };
            }

            const { connector, error } = await this.getConnector();
            if (error) {
                return { success: false, error };
            }

            const result = await connector!.getEnhancedMetrics(this.userId);

            // Cache the result
            await prisma.dashboardCache.upsert({
                where: {
                    userId_cacheKey: {
                        userId: this.userId,
                        cacheKey: "ghl_enhanced_metrics"
                    }
                },
                update: {
                    cacheData: JSON.stringify(result),
                    updatedAt: new Date()
                },
                create: {
                    userId: this.userId,
                    cacheKey: "ghl_enhanced_metrics",
                    cacheData: JSON.stringify(result)
                }
            });

            await this.logger.logInfo("GHL metrics fetched successfully", {
                leadsWeekly: result.data?.leadsWeekly,
                opportunitiesYTD: result.data?.opportunitiesYTD
            });

            return { success: true, data: result };

        } catch (error) {
            const serviceError: GHLServiceError = {
                code: "METRICS_ERROR",
                message: "Failed to get metrics",
                details: error instanceof Error ? error.message : "Unknown error"
            };
            await this.logger.logError("Failed to get metrics", error);
            return { success: false, error: serviceError };
        }
    }

    // Get sync status
    async getSyncStatus(): Promise<{ lastUpdated?: Date; status?: string; errorMessage?: string }> {
        try {
            const syncStatus = await prisma.syncStatus.findUnique({
                where: {
                    userId_service: {
                        userId: this.userId,
                        service: "gohighlevel"
                    }
                }
            });

            return {
                lastUpdated: syncStatus?.lastUpdated || undefined,
                status: syncStatus?.status || "never_synced",
                errorMessage: syncStatus?.errorMessage || undefined
            };

        } catch (error) {
            await this.logger.logError("Failed to get sync status", error);
            return { status: "error", errorMessage: "Failed to get sync status" };
        }
    }

    // Get recent logs for debugging
    async getRecentLogs(limit: number = 50): Promise<any[]> {
        try {
            const logs = await prisma.log.findMany({
                where: {
                    userId: this.userId,
                    service: "gohighlevel"
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return logs.map(log => ({
                id: log.id,
                level: log.level,
                message: log.message,
                details: log.details ? JSON.parse(log.details) : null,
                createdAt: log.createdAt
            }));

        } catch (error) {
            await this.logger.logError("Failed to get logs", error);
            return [];
        }
    }

    // Invalidate all GHL-related cache
    async invalidateCache(): Promise<void> {
        try {
            await prisma.dashboardCache.deleteMany({
                where: {
                    userId: this.userId,
                    cacheKey: {
                        in: ["ghl_metrics", "ghl_enhanced_metrics", "firm_metrics"]
                    }
                }
            });
            await this.logger.logInfo("GHL cache invalidated");
        } catch (error) {
            await this.logger.logError("Failed to invalidate cache", error);
        }
    }

    // Health check for GHL integration
    async healthCheck(): Promise<{ healthy: boolean; checks: any; error?: GHLServiceError }> {
        try {
            const checks = {
                hasIntegration: false,
                hasValidToken: false,
                hasLocationId: false,
                connectionWorks: false,
                hasRecentData: false,
                syncStatus: "unknown"
            };

            // Check integration exists
            const apiConfig = await prisma.apiConfig.findFirst({
                where: {
                    userId: this.userId,
                    service: "execview",
                    isActive: true
                }
            });

            checks.hasIntegration = !!apiConfig;
            checks.hasValidToken = !!(apiConfig?.accessToken);
            checks.hasLocationId = !!(apiConfig?.realmId);

            if (checks.hasIntegration && checks.hasValidToken && checks.hasLocationId) {
                // Test connection
                const connectionResult = await this.verifyConnection();
                checks.connectionWorks = connectionResult.success;

                // Check for recent data
                const recentContacts = await prisma.gHLContact.count({
                    where: {
                        userId: this.userId,
                        isActive: true,
                        updatedAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                        }
                    }
                });

                checks.hasRecentData = recentContacts > 0;

                // Get sync status
                const syncStatus = await this.getSyncStatus();
                checks.syncStatus = syncStatus.status || "unknown";
            }

            const healthy = checks.hasIntegration && 
                           checks.hasValidToken && 
                           checks.hasLocationId && 
                           checks.connectionWorks;

            return { healthy, checks };

        } catch (error) {
            const serviceError: GHLServiceError = {
                code: "HEALTH_CHECK_ERROR",
                message: "Failed to perform health check",
                details: error instanceof Error ? error.message : "Unknown error"
            };
            await this.logger.logError("Health check failed", error);
            return { 
                healthy: false, 
                checks: { error: "Health check failed" }, 
                error: serviceError 
            };
        }
    }
}