import { Zap, Database, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";
import { getApiConfigs } from "@/lib/dbActions";

const SERVICES_META = {
    clio: {
        name: "Clio",
        description: "Practice management software syncing matters and contacts.",
        icon: Database,
    },
    quickbooks: {
        name: "QuickBooks",
        description: "Financial data, invoices, and expense tracking.",
        icon: BarChart3,
    },
    gohighlevel: {
        name: "GoHighLevel",
        description: "Lead generation and innovative marketing automation.",
        icon: Zap,
    }
};

export default async function IntegrationsPage() {
    // Fetch current configs
    const configs = await getApiConfigs();

    // Helper to check status
    const getStatus = (serviceKey: string) => {
        const config = configs.find((c: any) => c.service === serviceKey);
        if (config && config.access_token) {
            return {
                status: "connected",
                lastSync: new Date(config.updated_at).toLocaleString()
            };
        }
        return {
            status: "pending",
            lastSync: "Never"
        };
    };

    const integrations = Object.entries(SERVICES_META).map(([key, meta]) => {
        const { status, lastSync } = getStatus(key);
        return {
            id: key,
            ...meta,
            status,
            lastSync
        };
    });

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                <p className="text-muted-foreground">Manage your connected data sources and API settings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.map((integration) => (
                    <div key={integration.id} className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-lg bg-primary/10 text-primary">
                                <integration.icon className="w-6 h-6" />
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${integration.status === 'connected'
                                ? 'bg-success/10 text-success'
                                : 'bg-warning/10 text-warning'
                                }`}>
                                {integration.status === 'connected' ? 'Active' : 'Setup Required'}
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold mb-2">{integration.name}</h3>
                        <p className="text-sm text-muted-foreground mb-6 line-clamp-2">
                            {integration.description}
                        </p>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                            <span className="text-xs text-muted-foreground">
                                Last sync: {integration.lastSync}
                            </span>
                            {integration.status !== 'connected' ? (
                                <a
                                    href={`/api/auth/login/${integration.id}`}
                                    className="flex items-center text-sm font-medium text-primary hover:underline"
                                >
                                    Connect <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                                </a>
                            ) : (
                                <div className="flex items-center text-sm font-medium text-success">
                                    Connected <CheckCircle2 className="w-4 h-4 ml-1" />
                                </div>
                            )}

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
