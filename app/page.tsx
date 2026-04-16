// app/page.tsx
import { getClientDashboardData, getWorkflowStatusCounts } from '../lib/jira';
import DashboardClient from './DashboardClient';
import { Title, Text, Flex, Badge } from "@tremor/react";
import { Activity } from "lucide-react";

export const revalidate = 60; // Revalidate every 60 seconds

function formatZoneTime(timeZone: string) {
    return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone,
    }).format(new Date());
}

export default async function ClientDashboard() {
    const [clients, workflowStatusCounts] = await Promise.all([
        getClientDashboardData(),
        getWorkflowStatusCounts(),
    ]);

    const pakistanTime = formatZoneTime("Asia/Karachi");
    const houstonTime = formatZoneTime("America/Chicago");

    return (
        <main className="p-4 md:p-8 min-h-screen relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full -z-10"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[120px] rounded-full -z-10"></div>

            <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-6 glass-card p-6 rounded-[2rem] shadow-2xl border border-white/40">
                <div className="flex items-center gap-5">
                    <div className="genz-gradient-1 p-3.5 rounded-2xl shadow-xl shadow-indigo-200/50 animate-pulse-slow">
                        <Activity className="text-white w-7 h-7" />
                    </div>
                    <div>
                        <Title className="text-3xl font-[900] text-slate-900 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
                            Implementation Team Analysis
                        </Title>
                        <Text className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] opacity-70">Implementation Team</Text>
                    </div>
                </div>
                <div className="flex items-center gap-5">
                    <div className="text-right hidden sm:block">
                        <Text className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Live since</Text>
                        <Text className="text-sm text-indigo-600 font-black italic">PKT {pakistanTime}</Text>
                        <Text className="text-xs text-slate-500 font-black italic">Houston {houstonTime}</Text>
                    </div>
                    <div className="bg-slate-900 text-white py-2 px-6 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-slate-900/20 transform hover:scale-105 transition-transform cursor-default">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                        {clients.length} CLIENTS
                    </div>
                </div>
            </div>

            {clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 glass-card rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <div className="bg-slate-100 p-6 rounded-full mb-4">
                        <Activity className="w-12 h-12 text-slate-300" />
                    </div>
                    <Text className="text-2xl font-black text-slate-800 tracking-tight">Zero signals found.</Text>
                    <Text className="text-slate-400 font-medium mt-2">Check your API tokens or JQL query, bestie.</Text>
                </div>
            ) : (
                <DashboardClient initialData={clients} workflowStatusCounts={workflowStatusCounts} />
            )}
        </main>
    );
}
