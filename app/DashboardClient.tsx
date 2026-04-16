"use client";

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
    Card, Metric, Text, Grid, Title, BarChart, LineChart,
    Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge, Flex,
    TabGroup, TabList, Tab, TabPanels, TabPanel,
    Icon, ProgressBar,
    Subtitle,
    Divider,
    type CustomTooltipProps
} from "@tremor/react";
import { Listbox, Popover, Transition } from "@headlessui/react";
import {
    ResponsiveContainer,
    BarChart as RechartsBarChart,
    Bar as RechartsBar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Cell,
    LabelList,
} from "recharts";
import { 
    Search, 
    Calendar, 
    User, 
    Package, 
    Activity, 
    AlertCircle, 
    CheckCircle2, 
    ArrowUpRight,
    FilterX,
    TrendingUp,
    TrendingDown,
    Target,
    Zap,
    BarChart3,
    Clock,
    ChevronDown,
    Check,
    X,
    RefreshCw,
    GitBranch,
    User2
} from "lucide-react";

interface ClientData {
    key: string;
    summary: string;
    issueType: string;
    status: string;
    statusCategory: string;
    created: string;
    updated: string;
    assignee: string;
    labels: string[];
    manager: string;
    clinicalManager: string;
    goLiveDate: string | null;
    packageCategory: string;
    isClosed: boolean;
    phase: string;
    updatedDaysAgo: number;
    healthScore: number | null;
    surveyStatus: string | null;
}

const COLORS: Record<string, string> = {
    "Implementation (Pre–Go-Live)": "indigo",
    "Post–Go-Live / Monitoring": "cyan",
    "Handover / Success": "emerald",
    "RCM": "cyan",
    "Churn / Left": "red"
};

const PHASES = [
    "Implementation (Pre–Go-Live)",
    "Post–Go-Live / Monitoring",
    "Handover / Success",
    "RCM",
    "Churn / Left"
];

type FilterOption = {
    value: string;
    label: string;
};

type StatusChartDatum = {
    name: string;
    count: number;
};

type WorkflowStatusCount = {
    label: string;
    value: number;
};

type ActivityRange = "24h" | "7d" | "30d";

type RecentActivityItem = {
    issueKey: string;
    summary: string;
    actor: string;
    whenISO: string;
    whenRelative: string;
    changeText: string;
    newStatus: string | null;
    link: string;
};

function wrapStatusLabel(label: string, maxLineLength = 14) {
    const words = label.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    words.forEach((word) => {
        const next = currentLine ? `${currentLine} ${word}` : word;
        if (next.length <= maxLineLength) {
            currentLine = next;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    });

    if (currentLine) lines.push(currentLine);

    return lines.slice(0, 3);
}

function StatusAxisTick({
    x,
    y,
    payload,
}: {
    x?: number;
    y?: number;
    payload?: { value: string[] | string };
}) {
    const rawValue = payload?.value;
    const lines = Array.isArray(rawValue)
        ? rawValue
        : typeof rawValue === "string"
            ? wrapStatusLabel(rawValue)
            : [];

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                textAnchor="end"
                fill="#334155"
                className="font-[family-name:var(--font-geist-sans)] text-[12px] font-semibold"
            >
                {lines.map((line, index) => (
                    <tspan key={`${line}-${index}`} x={0} dy={index === 0 ? 0 : 14}>
                        {line}
                    </tspan>
                ))}
            </text>
        </g>
    );
}

function StatusBarValueLabel(props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    value?: string | number;
}) {
    const { x = 0, y = 0, width = 0, height = 0, value } = props;

    return (
        <text
            x={x + width + 12}
            y={y + height / 2}
            dominantBaseline="middle"
            fill="#0f172a"
            className="font-[family-name:var(--font-geist-sans)] text-[12px] font-black"
        >
            {value}
        </text>
    );
}

function StatusCheckChart({ data }: { data: StatusChartDatum[] }) {
    return (
        <div className="h-full w-full font-[family-name:var(--font-geist-sans)]">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 8, right: 44, bottom: 8, left: 12 }}
                    barCategoryGap={12}
                >
                    <CartesianGrid stroke="#cbd5e1" strokeDasharray="4 8" horizontal={false} />
                    <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                        allowDecimals={false}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        width={180}
                        tick={<StatusAxisTick />}
                    />
                    <RechartsTooltip
                        cursor={{ fill: "rgba(99, 102, 241, 0.08)", radius: 16 }}
                        content={({ active, payload, label }) => (
                            <DashboardChartTooltip active={active} payload={payload} label={Array.isArray(label) ? label.join(" ") : label} />
                        )}
                    />
                    <RechartsBar dataKey="count" radius={[16, 16, 16, 16]} barSize={38}>
                        <LabelList dataKey="count" position="right" content={<StatusBarValueLabel />} />
                        {data.map((entry, index) => (
                            <Cell
                                key={`${entry.name}-${index}`}
                                fill={index < 2 ? "#4f46e5" : index < 5 ? "#06b6d4" : "#94a3b8"}
                            />
                        ))}
                    </RechartsBar>
                </RechartsBarChart>
            </ResponsiveContainer>
        </div>
    );
}

function formatTooltipLabel(label: CustomTooltipProps["label"]) {
    if (typeof label !== "string") return label ?? "";

    if (/^\d{4}-\d{2}$/.test(label)) {
        const [year, month] = label.split("-");
        return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
        });
    }

    return label;
}

function DashboardChartTooltip({ active, payload, label }: CustomTooltipProps) {
    const items = (payload ?? []).filter((item) => item && item.value !== undefined && item.type !== "none");

    if (!active || items.length === 0) return null;

    const displayLabel = formatTooltipLabel(label);

    return (
        <div className="min-w-[220px] rounded-[1.4rem] border border-white/70 bg-white/92 p-4 shadow-[0_24px_55px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
            <div className="mb-3 border-b border-slate-100 pb-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Live insight</p>
                    <p className="mt-1 text-lg font-black tracking-tight text-slate-900">{String(displayLabel)}</p>
                </div>
            </div>
            <div className="space-y-2">
                {items.map((item, index) => {
                    const numericValue = typeof item.value === "number" ? item.value : Number(item.value) || 0;
                    const tone = typeof item.color === "string" ? item.color : "#6366f1";

                    return (
                        <div key={`${item.name}-${index}`} className="flex items-center justify-between rounded-2xl bg-slate-50/90 px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white" style={{ backgroundColor: tone }} />
                                <div className="min-w-0">
                                    <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        {String(item.name ?? "Value")}
                                    </p>
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                        {numericValue} {numericValue === 1 ? "Client" : "Clients"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const ACTIVITY_RANGE_OPTIONS: { value: ActivityRange; label: string }[] = [
    { value: "24h", label: "Last 24h" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
];

function getActivityBadgeTone(status: string | null) {
    if (!status) return "bg-slate-100 text-slate-500 border-slate-200";

    const normalized = status.toLowerCase();

    if (normalized.includes("monitor") || normalized.includes("go live")) {
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
    }

    if (normalized.includes("handover") || normalized.includes("success")) {
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (normalized.includes("left")) {
        return "bg-red-50 text-red-700 border-red-200";
    }

    if (normalized.includes("week")) {
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }

    return "bg-slate-100 text-slate-600 border-slate-200";
}

function RecentActivitySkeleton() {
    return (
        <div className="relative pl-8">
            <div className="absolute left-[11px] top-1 bottom-1 w-px bg-slate-200/80" />
            <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="relative rounded-[1.6rem] border border-white/70 bg-white/70 p-4 shadow-[0_18px_35px_rgba(148,163,184,0.12)]">
                        <div className="absolute -left-[26px] top-5 h-5 w-5 rounded-full border-4 border-white bg-slate-200 shadow-sm" />
                        <div className="animate-pulse space-y-3">
                            <div className="h-3 w-28 rounded-full bg-slate-200" />
                            <div className="h-4 w-3/4 rounded-full bg-slate-200" />
                            <div className="h-3 w-2/3 rounded-full bg-slate-100" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RecentActivityFeed() {
    const [range, setRange] = useState<ActivityRange>("24h");
    const [items, setItems] = useState<RecentActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let isMounted = true;

        async function loadActivity() {
            setIsLoading(true);

            try {
                const response = await fetch(`/api/recent-activity?range=${range}&refresh=${refreshKey}`, {
                    cache: "no-store",
                });
                const payload = await response.json() as { items?: RecentActivityItem[] };

                if (isMounted) {
                    setItems(Array.isArray(payload.items) ? payload.items : []);
                }
            } catch {
                if (isMounted) {
                    setItems([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadActivity();

        return () => {
            isMounted = false;
        };
    }, [range, refreshKey]);

    return (
        <Card className="ring-0 shadow-2xl rounded-[2.5rem] glass-card p-8 overflow-hidden border-white/50 hover:shadow-cyan-500/10 transition-all hover:scale-[1.02] duration-300">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-8 rounded-full" style={{ background: "linear-gradient(135deg, #06b6d4 0%, #10b981 100%)" }} />
                    <div>
                        <Title className="text-2xl font-black text-slate-900 tracking-tighter">Recent Activity</Title>
                        <Subtitle className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Latest updates from Jira (PC)</Subtitle>
                    </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Listbox value={range} onChange={setRange}>
                        <div className="relative min-w-[11rem]">
                            <Listbox.Button className="group flex h-12 w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 text-left shadow-[0_14px_30px_rgba(148,163,184,0.14)] backdrop-blur-xl">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Range</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {ACTIVITY_RANGE_OPTIONS.find((option) => option.value === range)?.label}
                                    </p>
                                </div>
                                <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-data-[headlessui-state=open]:rotate-180" />
                            </Listbox.Button>
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-200"
                                enterFrom="opacity-0 translate-y-2 scale-[0.98]"
                                enterTo="opacity-100 translate-y-0 scale-100"
                                leave="transition ease-in duration-150"
                                leaveFrom="opacity-100 translate-y-0 scale-100"
                                leaveTo="opacity-0 translate-y-1 scale-[0.98]"
                            >
                                <Listbox.Options className="absolute right-0 z-50 mt-3 w-full overflow-hidden rounded-[1.4rem] border border-white/80 bg-white/95 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl focus:outline-none">
                                    {ACTIVITY_RANGE_OPTIONS.map((option) => (
                                        <Listbox.Option
                                            key={option.value}
                                            value={option.value}
                                            className="cursor-pointer rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition data-[focus]:bg-cyan-50 data-[focus]:text-slate-900"
                                        >
                                            {option.label}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </Transition>
                        </div>
                    </Listbox>
                    <button
                        type="button"
                        onClick={() => setRefreshKey(Date.now())}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800"
                    >
                        <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="min-h-[20rem]">
                {isLoading ? (
                    <RecentActivitySkeleton />
                ) : items.length === 0 ? (
                    <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white/55 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                            <Clock size={28} />
                        </div>
                        <p className="text-xl font-black tracking-tight text-slate-900">No activity in selected range</p>
                        <p className="mt-2 text-sm font-medium text-slate-400">Try a wider window or refresh the feed.</p>
                    </div>
                ) : (
                    <div className="relative pl-8">
                        <div className="absolute left-[11px] top-1 bottom-1 w-px bg-gradient-to-b from-cyan-200 via-slate-200 to-transparent" />
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div
                                    key={`${item.issueKey}-${item.whenISO}`}
                                    className="group relative rounded-[1.7rem] border border-white/70 bg-white/78 p-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_24px_55px_rgba(6,182,212,0.14)]"
                                >
                                    <div className="absolute -left-[26px] top-5 flex h-5 w-5 items-center justify-center rounded-full border-4 border-white bg-cyan-400 shadow-[0_8px_18px_rgba(6,182,212,0.28)]">
                                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                    </div>
                                    <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="min-w-0">
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-indigo-600 transition group-hover:text-indigo-700"
                                            >
                                                {item.issueKey}
                                                <ArrowUpRight size={14} />
                                            </a>
                                            <p className="mt-1 truncate text-lg font-black tracking-tight text-slate-900">{item.summary}</p>
                                        </div>
                                        {item.newStatus && (
                                            <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getActivityBadgeTone(item.newStatus)}`}>
                                                {item.newStatus}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                                                <GitBranch size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold leading-6 text-slate-900">{item.changeText}</p>
                                                <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px] font-semibold text-slate-400">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <User2 size={13} />
                                                        {item.actor}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5" title={new Date(item.whenISO).toLocaleString()}>
                                                        <Clock size={13} />
                                                        {item.whenRelative}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

function FilterSearchField({
    label,
    value,
    onChange,
    placeholder
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    return (
        <div className="filter-field lg:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.24em] mb-3 ml-1">{label}</label>
            <div className="group relative h-16 overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/85 shadow-[0_20px_45px_rgba(148,163,184,0.18)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(99,102,241,0.16)] focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100">
                <div className="absolute inset-y-0 left-0 flex items-center pl-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 shadow-inner shadow-white/80">
                        <Search size={22} strokeWidth={2.2} />
                    </div>
                </div>
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="h-full w-full bg-transparent pl-20 pr-6 text-lg font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
            </div>
        </div>
    );
}

function FilterSingleSelect({
    label,
    icon: IconComponent,
    value,
    onChange,
    options,
}: {
    label: string;
    icon: typeof Calendar;
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
}) {
    const selected = options.find((option) => option.value === value);

    return (
        <div className="filter-field">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.24em] mb-3 ml-1">{label}</label>
            <Listbox value={value} onChange={onChange}>
                <div className="relative">
                    <Listbox.Button className="group relative flex h-16 w-full items-center overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/85 pl-5 pr-14 text-left shadow-[0_20px_45px_rgba(148,163,184,0.18)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(99,102,241,0.16)] focus:outline-none focus:ring-4 focus:ring-indigo-100">
                        <div className="mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 shadow-inner shadow-white/80">
                            <IconComponent size={20} strokeWidth={2.1} />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Quick pick</p>
                            <p className="truncate text-base font-semibold text-slate-900">{selected?.label}</p>
                        </div>
                        <ChevronDown className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-transform group-data-[headlessui-state=open]:rotate-180" />
                    </Listbox.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-2 scale-[0.98]"
                        enterTo="opacity-100 translate-y-0 scale-100"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0 scale-100"
                        leaveTo="opacity-0 translate-y-1 scale-[0.98]"
                    >
                        <Listbox.Options className="absolute left-0 right-0 z-50 mt-3 max-h-72 overflow-auto rounded-[1.5rem] border border-white/80 bg-white/95 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl focus:outline-none">
                            {options.map((option) => (
                                <Listbox.Option
                                    key={option.value}
                                    value={option.value}
                                    className="group flex cursor-pointer items-center justify-between rounded-2xl px-4 py-3 text-slate-700 transition data-[focus]:bg-indigo-50 data-[focus]:text-slate-900"
                                >
                                    {({ selected }) => (
                                        <>
                                            <div>
                                                <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
                                                <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                                            </div>
                                            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${selected ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-300"}`}>
                                                <Check size={16} strokeWidth={3} />
                                            </div>
                                        </>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
        </div>
    );
}

function FilterMultiSelect({
    label,
    icon: IconComponent,
    selected,
    onChange,
    options,
    placeholder,
}: {
    label: string;
    icon: typeof User;
    selected: string[];
    onChange: (value: string[]) => void;
    options: FilterOption[];
    placeholder: string;
}) {
    const [query, setQuery] = useState("");

    const filteredOptions = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return options;
        return options.filter((option) => option.label.toLowerCase().includes(normalized));
    }, [options, query]);

    const selectedLabels = options
        .filter((option) => selected.includes(option.value))
        .map((option) => option.label);

    const summary =
        selectedLabels.length === 0
            ? placeholder
            : selectedLabels.length === 1
                ? selectedLabels[0]
                : `${selectedLabels.length} selected`;

    const toggleValue = (value: string) => {
        onChange(
            selected.includes(value)
                ? selected.filter((item) => item !== value)
                : [...selected, value]
        );
    };

    return (
        <div className="filter-field">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.24em] mb-3 ml-1">{label}</label>
            <Popover className="relative">
                {({ open, close }) => (
                    <>
                        <Popover.Button className={`group relative flex h-16 w-full items-center overflow-hidden rounded-[1.6rem] border bg-white/85 pl-5 pr-14 text-left shadow-[0_20px_45px_rgba(148,163,184,0.18)] backdrop-blur-xl transition-all focus:outline-none focus:ring-4 focus:ring-indigo-100 ${open ? "border-indigo-300 shadow-[0_24px_55px_rgba(99,102,241,0.18)]" : "border-white/70 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(99,102,241,0.16)]"}`}>
                            <div className="mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 shadow-inner shadow-white/80">
                                <IconComponent size={20} strokeWidth={2.1} />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                                    {selected.length === 0 ? "Nothing selected" : `${selected.length} active`}
                                </p>
                                <p className="truncate text-base font-semibold text-slate-900">{summary}</p>
                            </div>
                            <ChevronDown className={`absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                        </Popover.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-200"
                            enterFrom="opacity-0 translate-y-2 scale-[0.98]"
                            enterTo="opacity-100 translate-y-0 scale-100"
                            leave="transition ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0 scale-100"
                            leaveTo="opacity-0 translate-y-1 scale-[0.98]"
                        >
                            <Popover.Panel className="absolute left-0 right-0 z-50 mt-3 rounded-[1.5rem] border border-white/80 bg-white/95 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
                                <div className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                                    <Search size={16} className="text-slate-400" />
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={`Search ${label.toLowerCase()}...`}
                                        className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                                    />
                                    {query && (
                                        <button
                                            type="button"
                                            onClick={() => setQuery("")}
                                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition hover:text-slate-700"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                {selected.length > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {selectedLabels.map((item) => (
                                            <span key={item} className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-indigo-700">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="max-h-72 space-y-2 overflow-auto pr-1">
                                    {filteredOptions.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-400">
                                            Nothing matched that search.
                                        </div>
                                    ) : (
                                        filteredOptions.map((option) => {
                                            const isSelected = selected.includes(option.value);
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => toggleValue(option.value)}
                                                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${isSelected ? "bg-indigo-50 shadow-inner shadow-white" : "bg-white hover:bg-slate-50"}`}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-slate-900">{option.label}</p>
                                                        <p className="mt-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
                                                    </div>
                                                    <div className={`ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${isSelected ? "border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-200" : "border-slate-200 bg-white text-slate-300"}`}>
                                                        <Check size={16} strokeWidth={3} />
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-1 pt-3">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                                        {selected.length} selected
                                    </p>
                                    <div className="ml-auto flex flex-wrap justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onChange([])}
                                            className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => close()}
                                            className="rounded-full bg-slate-900 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-slate-900/20 transition hover:scale-[1.03]"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            </Popover.Panel>
                        </Transition>
                    </>
                )}
            </Popover>
        </div>
    );
}

export default function DashboardClient({
    initialData,
    workflowStatusCounts,
}: {
    initialData: ClientData[];
    workflowStatusCounts: WorkflowStatusCount[];
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
    const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
    const [selectedPhases, setSelectedPhases] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState("all");
    const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
    const [hoveredKPI, setHoveredKPI] = useState<string | null>(null);

    const handleKPIClick = (kpiType: string) => {
        if (selectedKPI === kpiType) {
            setSelectedKPI(null);
            setSelectedPhases([]);
        } else {
            setSelectedKPI(kpiType);
            switch (kpiType) {
                case 'active':
                    setSelectedPhases(["Implementation (Pre–Go-Live)"]);
                    break;
                case 'monitoring':
                    setSelectedPhases(["Post–Go-Live / Monitoring"]);
                    break;
                case 'handedOver':
                    setSelectedPhases(["Handover / Success"]);
                    break;
                case 'lost':
                    setSelectedPhases(["Churn / Left"]);
                    break;
                default:
                    setSelectedPhases([]);
            }
        }
    };

    // Managers list
    const managers = useMemo(() => Array.from(new Set(initialData.map(c => c.manager))).sort(), [initialData]);
    // Packages list
    const packages = useMemo(() => Array.from(new Set(initialData.map(c => c.packageCategory))).sort(), [initialData]);
    const dateOptions: FilterOption[] = [
        { value: "all", label: "Forever" },
        { value: "30", label: "Last 30 days" },
        { value: "60", label: "Last 60 days" },
        { value: "90", label: "Last 90 days" },
    ];
    const managerOptions = managers.map((manager) => ({ value: manager, label: manager }));
    const packageOptions = packages.map((pkg) => ({ value: pkg, label: pkg }));
    const phaseOptions = PHASES.map((phase) => ({ value: phase, label: phase }));

    const filteredData = useMemo(() => {
        return initialData.filter(c => {
            const matchesSearch = c.summary.toLowerCase().includes(searchTerm.toLowerCase()) || c.key.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesManager = selectedManagers.length === 0 || selectedManagers.includes(c.manager);
            const matchesPackage = selectedPackages.length === 0 || selectedPackages.includes(c.packageCategory);
            const matchesPhase = selectedPhases.length === 0 || selectedPhases.includes(c.phase);
            
            let matchesDate = true;
            if (dateRange !== "all") {
                const now = new Date();
                const createdDate = new Date(c.created);
                const diffTime = Math.abs(now.getTime() - createdDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (dateRange === "30") matchesDate = diffDays <= 30;
                else if (dateRange === "60") matchesDate = diffDays <= 60;
                else if (dateRange === "90") matchesDate = diffDays <= 90;
            }

            return matchesSearch && matchesManager && matchesPackage && matchesPhase && matchesDate;
        });
    }, [initialData, searchTerm, selectedManagers, selectedPackages, selectedPhases, dateRange]);

    // KPI Calculations
    const totalClients = filteredData.length;
    const activeImpls = filteredData.filter(c => !c.isClosed && c.phase === "Implementation (Pre–Go-Live)").length;
    const inMonitoring = filteredData.filter(c => c.phase === "Post–Go-Live / Monitoring").length;
    const handedOver = filteredData.filter(c => c.phase === "Handover / Success").length;
    const clientsLeft = filteredData.filter(c => c.phase === "Churn / Left").length;
    
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);
    const upcomingGoLives = filteredData.filter(c => {
        if (!c.goLiveDate) return false;
        const gld = new Date(c.goLiveDate);
        return gld >= new Date() && gld <= next30Days;
    }).length;

    const avgHealth = useMemo(() => {
        const withHealth = filteredData.filter(c => c.healthScore !== null);
        if (withHealth.length === 0) return null;
        return (withHealth.reduce((acc, c) => acc + (c.healthScore || 0), 0) / withHealth.length).toFixed(1);
    }, [filteredData]);

    // Chart Data
    const outcomeData = [
        { name: "Left", count: filteredData.filter(c => c.phase === "Churn / Left").length },
        { name: "Handover", count: filteredData.filter(c => c.phase === "Handover / Success").length }
    ];

    const statusChartData = workflowStatusCounts.map((item) => ({
        name: item.label,
        count: item.value,
    }));

    const activeClientRows = filteredData
        .filter(c => c.phase === "Implementation (Preâ€“Go-Live)" || c.phase === "Postâ€“Go-Live / Monitoring")
        .sort((a, b) => {
            if (!a.goLiveDate && !b.goLiveDate) return b.updated.localeCompare(a.updated);
            if (!a.goLiveDate) return 1;
            if (!b.goLiveDate) return -1;
            return a.goLiveDate.localeCompare(b.goLiveDate);
        })
        .map((c) => (
            <TableRow key={c.key} className="table-row-hover group">
                <TableCell className="py-6 px-6">
                    <a href={`https://${process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'sequeltechnologies.atlassian.net'}/browse/${c.key}`} target="_blank" className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-black text-[10px] hover:scale-110 transition-transform inline-block shadow-lg shadow-slate-900/20 group-hover:shadow-xl group-hover:shadow-slate-900/30">
                        {c.key}
                    </a>
                </TableCell>
                <TableCell className="font-black text-slate-900 py-6 px-6 text-sm group-hover:text-indigo-700 transition-colors">{c.summary}</TableCell>
                <TableCell className="py-6 px-6"><Badge color={COLORS[c.phase]} className="rounded-xl font-black text-[9px] uppercase tracking-widest border-0 py-1 px-3 shadow-sm group-hover:scale-105 transition-transform">{c.phase.split(" ")[0]}</Badge></TableCell>
                <TableCell className="text-slate-600 py-6 px-6 font-bold italic group-hover:text-slate-800 transition-colors">{c.manager}</TableCell>
                <TableCell className="py-6 px-6">
                    {c.goLiveDate ? (
                        <div className="flex items-center gap-2 group-hover:scale-105 transition-transform">
                            <Calendar size={14} className="text-indigo-500" />
                            <span className="font-black text-slate-900 text-xs">{new Date(c.goLiveDate).toLocaleDateString()}</span>
                        </div>
                    ) : (
                        <span className="text-slate-300 font-black text-[10px]">TBD</span>
                    )}
                </TableCell>
                <TableCell className="text-slate-400 py-6 px-6 text-[11px] font-bold italic group-hover:text-slate-600 transition-colors">{c.updatedDaysAgo}d ago</TableCell>
            </TableRow>
        ));

    const managerCounts = filteredData.reduce((acc, c) => {
        if (!c.isClosed) {
            acc[c.manager] = (acc[c.manager] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);
    const managerData = Object.entries(managerCounts).map(([name, count]) => ({ name, count }));

    const packageCounts = filteredData.reduce((acc, c) => {
        acc[c.packageCategory] = (acc[c.packageCategory] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const packageData = Object.entries(packageCounts).map(([name, count]) => ({ name, count }));

    // Timeline Data
    const timelineData = useMemo(() => {
        const months: Record<string, number> = {};
        filteredData.forEach(c => {
            if (c.goLiveDate) {
                const date = new Date(c.goLiveDate);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                months[key] = (months[key] || 0) + 1;
            }
        });
        return Object.entries(months)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, count]) => ({ month, count }));
    }, [filteredData]);

    const exceptionsData = filteredData.filter(c => {
        const isStale = c.updatedDaysAgo > 14;
        const missingGoLive = !c.goLiveDate;
        const unassignedManager = c.manager === "Unassigned";
        const isLeft = c.phase === "Churn / Left";
        return isStale || missingGoLive || unassignedManager || isLeft;
    });

    const getExceptionReason = (c: ClientData) => {
        const reasons = [];
        if (c.updatedDaysAgo > 14) reasons.push(`Stale (${c.updatedDaysAgo}d)`);
        if (!c.goLiveDate) reasons.push("Missing Go Live");
        if (c.manager === "Unassigned") reasons.push("Unassigned Manager");
        if (c.phase === "Churn / Left") reasons.push("Client Left");
        return reasons.join(", ");
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-1000">
            {/* Welcome Header */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                    <div className="w-12 h-12 genz-gradient-1 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <BarChart3 size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="bg-gradient-to-r from-slate-950 via-blue-900 to-blue-600 bg-clip-text text-4xl font-black tracking-tighter text-transparent">Client Dashboard</h1>
                        <p className="mt-1 bg-gradient-to-r from-slate-950 via-blue-900 to-blue-600 bg-clip-text text-sm font-bold uppercase tracking-widest text-transparent">Real-time insights & analytics</p>
                    </div>
                </div>
            </div>
            {/* Filter Bar */}
            <Card className="filter-panel sticky top-4 z-20 overflow-visible p-6 glass-card shadow-2xl rounded-[2rem] border-white/50">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.35em]">Control Center</p>
                        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">Filter the portfolio without losing the vibe.</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-full border border-white/70 bg-white/70 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 shadow-sm shadow-slate-200/60">
                            {filteredData.length} visible
                        </div>
                        <div className="rounded-full border border-white/50 bg-slate-900 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-slate-900/15">
                            {selectedManagers.length + selectedPackages.length + selectedPhases.length + (searchTerm ? 1 : 0) + (dateRange !== "all" ? 1 : 0)} active filters
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                    <FilterSearchField
                        label="Search the Vibe"
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Find a client..."
                    />
                    <FilterSingleSelect
                        label="Timeline"
                        icon={Calendar}
                        value={dateRange}
                        onChange={setDateRange}
                        options={dateOptions}
                    />
                    <FilterMultiSelect
                        label="The Manager"
                        icon={User}
                        selected={selectedManagers}
                        onChange={setSelectedManagers}
                        options={managerOptions}
                        placeholder="Anyone"
                    />
                    <FilterMultiSelect
                        label="Package"
                        icon={Package}
                        selected={selectedPackages}
                        onChange={setSelectedPackages}
                        options={packageOptions}
                        placeholder="Any package"
                    />
                    <FilterMultiSelect
                        label="Status"
                        icon={Activity}
                        selected={selectedPhases}
                        onChange={setSelectedPhases}
                        options={phaseOptions}
                        placeholder="Any status"
                    />
                </div>
                {(searchTerm || selectedManagers.length > 0 || selectedPackages.length > 0 || selectedPhases.length > 0 || dateRange !== "all") && (
                    <div className="mt-5 flex justify-end">
                        <button 
                            onClick={() => {
                                setSearchTerm(""); setSelectedManagers([]); setSelectedPackages([]); setSelectedPhases([]); setDateRange("all");
                            }}
                            className="text-[11px] font-black text-white px-5 py-3 genz-gradient-2 rounded-2xl shadow-lg shadow-amber-200 flex items-center gap-2 hover:scale-105 transition-all"
                        >
                            <FilterX size={14} strokeWidth={3} /> RESET FILTERS
                        </button>
                    </div>
                )}
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <Card 
                    className={`group ring-0 shadow-xl hover-glow rounded-[2rem] glass-card p-6 relative overflow-hidden cursor-pointer transition-all duration-300 ${
                        selectedKPI === 'total' ? 'ring-2 ring-indigo-500 shadow-indigo-500/20 scale-105' : ''
                    } ${hoveredKPI === 'total' ? 'scale-102' : ''}`}
                    onClick={() => handleKPIClick('total')}
                    onMouseEnter={() => setHoveredKPI('total')}
                    onMouseLeave={() => setHoveredKPI(null)}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150"></div>
                    <Flex alignItems="start" className="gap-4">
                        <div className="flex h-16 w-16 items-center justify-center genz-gradient-1 rounded-[1.6rem] shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                            <Icon icon={User} variant="simple" color="white" size="sm" />
                        </div>
                        <div>
                            <Text className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Global</Text>
                            <Metric className="text-slate-900 font-black tracking-tighter text-3xl group-hover:text-indigo-600 transition-colors">{totalClients}</Metric>
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingUp size={12} className="text-green-500" />
                                <Text className="text-green-500 font-bold text-[10px]">Active Portfolio</Text>
                            </div>
                        </div>
                    </Flex>
                </Card>
                <Card 
                    className={`group ring-0 shadow-xl hover-glow rounded-[2rem] glass-card p-6 relative overflow-hidden cursor-pointer transition-all duration-300 ${
                        selectedKPI === 'lost' ? 'ring-2 ring-red-500 shadow-red-500/20 scale-105' : ''
                    } ${hoveredKPI === 'lost' ? 'scale-102' : ''}`}
                    onClick={() => handleKPIClick('lost')}
                    onMouseEnter={() => setHoveredKPI('lost')}
                    onMouseLeave={() => setHoveredKPI(null)}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150"></div>
                    <Flex alignItems="start" className="gap-4">
                        <div className="flex h-16 w-16 items-center justify-center genz-gradient-2 rounded-[1.6rem] shadow-lg shadow-red-200 group-hover:scale-110 transition-transform">
                            <Icon icon={AlertCircle} variant="simple" color="white" size="sm" />
                        </div>
                        <div>
                            <Text className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Lost</Text>
                            <Metric className="text-slate-900 font-black tracking-tighter text-3xl group-hover:text-red-600 transition-colors">{clientsLeft}</Metric>
                            <div className="flex items-center gap-1 mt-1">
                                <TrendingDown size={12} className="text-red-500" />
                                <Text className="text-red-500 font-bold text-[10px]">Churn</Text>
                            </div>
                        </div>
                    </Flex>
                </Card>
                <Card 
                    className={`group ring-0 shadow-xl hover-glow rounded-[2rem] glass-card p-6 relative overflow-hidden cursor-pointer transition-all duration-300 ${
                        selectedKPI === 'upcoming' ? 'ring-2 ring-cyan-500 shadow-cyan-500/20 scale-105' : ''
                    } ${hoveredKPI === 'upcoming' ? 'scale-102' : ''}`}
                    onClick={() => handleKPIClick('upcoming')}
                    onMouseEnter={() => setHoveredKPI('upcoming')}
                    onMouseLeave={() => setHoveredKPI(null)}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150"></div>
                    <Flex alignItems="start" className="gap-4">
                        <div className="flex h-16 w-16 items-center justify-center genz-gradient-3 rounded-[1.6rem] shadow-lg shadow-cyan-200 group-hover:scale-110 transition-transform" style={{background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)'}}>
                            <Icon icon={Calendar} variant="simple" color="white" size="sm" />
                        </div>
                        <div>
                            <Text className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Go Live</Text>
                            <Metric className="text-slate-900 font-black tracking-tighter text-3xl group-hover:text-cyan-600 transition-colors">{upcomingGoLives}</Metric>
                            <div className="flex items-center gap-1 mt-1">
                                <Clock size={12} className="text-cyan-500" />
                                <Text className="text-cyan-500 font-bold text-[10px]">Next 30 Days</Text>
                            </div>
                        </div>
                    </Flex>
                </Card>
                <Card 
                    className={`group ring-0 shadow-xl hover-glow rounded-[2rem] glass-card p-6 relative overflow-hidden cursor-pointer transition-all duration-300 ${
                        selectedKPI === 'handedOver' ? 'ring-2 ring-green-500 shadow-green-500/20 scale-105' : ''
                    } ${hoveredKPI === 'handedOver' ? 'scale-102' : ''}`}
                    onClick={() => handleKPIClick('handedOver')}
                    onMouseEnter={() => setHoveredKPI('handedOver')}
                    onMouseLeave={() => setHoveredKPI(null)}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150"></div>
                    <Flex alignItems="start" className="gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-[1.6rem] shadow-lg group-hover:scale-110 transition-transform genz-gradient-3 shadow-emerald-200">
                            <Icon icon={CheckCircle2} variant="simple" color="white" size="sm" />
                        </div>
                        <div>
                            <Text className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Completed</Text>
                            <Metric className="font-black tracking-tighter text-3xl transition-colors text-green-600 group-hover:text-green-700">{handedOver}</Metric>
                            <div className="flex items-center gap-1 mt-1">
                                <CheckCircle2 size={12} className="text-green-500" />
                                <Text className="font-bold text-[10px] text-green-500">Success</Text>
                            </div>
                        </div>
                    </Flex>
                </Card>
            </div>

            {/* Active KPI Indicator */}
            {selectedKPI && (
                <div className="flex items-center justify-center mb-8">
                    <div className="bg-slate-900/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20 animate-in slide-in-from-top-5 duration-500">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full animate-pulse ${
                                selectedKPI === 'active' ? 'bg-amber-500' :
                                selectedKPI === 'monitoring' ? 'bg-cyan-500' :
                                selectedKPI === 'handedOver' ? 'bg-green-500' :
                                selectedKPI === 'lost' ? 'bg-red-500' :
                                selectedKPI === 'upcoming' ? 'bg-cyan-500' : 'bg-indigo-500'
                            }`}></div>
                            <Text className="text-slate-700 font-black text-sm">
                                Filtering by: {
                                    selectedKPI === 'total' ? 'All Clients' :
                                    selectedKPI === 'active' ? 'Active Implementations' :
                                    selectedKPI === 'monitoring' ? 'Post-Go-Live Monitoring' :
                                    selectedKPI === 'handedOver' ? 'Successful Handovers' :
                                    selectedKPI === 'lost' ? 'Lost Clients' :
                                    selectedKPI === 'upcoming' ? 'Upcoming Go-Lives' : 'Unknown'
                                }
                            </Text>
                            <button 
                                onClick={() => handleKPIClick(selectedKPI)}
                                className="text-slate-400 hover:text-slate-600 transition-colors hover:scale-110"
                            >
                                <FilterX size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            <Grid numItems={1} numItemsMd={2} numItemsLg={3} className="gap-8">
                <Card className="ring-0 shadow-2xl rounded-[2.5rem] glass-card p-8 overflow-hidden border-white/50 hover:shadow-indigo-500/10 transition-all hover:scale-[1.02] duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-8 genz-gradient-1 rounded-full"></div>
                            <div>
                                <Title className="text-2xl font-black text-slate-900 tracking-tighter">Win vs Loss</Title>
                                <Subtitle className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Success Metrics</Subtitle>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <BarChart3 size={20} className="text-indigo-500" />
                        </div>
                    </div>
                    <div className="h-80 win-loss-chart">
                        <BarChart
                            className="h-full w-full"
                            data={outcomeData}
                            index="name"
                            categories={["count"]}
                            colors={["red", "emerald"]}
                            showLegend={false}
                            valueFormatter={(v) => `${v} Clients`}
                            showAnimation={true}
                            allowDecimals={false}
                            customTooltip={DashboardChartTooltip}
                        />
                    </div>
                </Card>
                <RecentActivityFeed />
                <Card className="ring-0 shadow-2xl rounded-[2.5rem] glass-card p-8 overflow-hidden border-white/50 hover:shadow-cyan-500/10 transition-all hover:scale-[1.02] duration-300 xl:col-span-1 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-8 genz-gradient-3 rounded-full"></div>
                            <div>
                                <Title className="text-2xl font-black text-slate-900 tracking-tighter">Go-Live Timeline</Title>
                                <Subtitle className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Monthly Launches</Subtitle>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendingUp size={20} className="text-cyan-500" />
                        </div>
                    </div>
                    <div className="h-80 timeline-chart">
                        <LineChart
                            className="h-full w-full"
                            data={timelineData}
                            index="month"
                            categories={["count"]}
                            colors={["cyan"]}
                            showAnimation={true}
                            valueFormatter={(v) => `${v} Launches`}
                            showLegend={false}
                            allowDecimals={false}
                            customTooltip={DashboardChartTooltip}
                        />
                    </div>
                </Card>
                <Card className="ring-0 shadow-2xl rounded-[2.5rem] glass-card p-8 overflow-hidden border-white/50 hover:shadow-indigo-500/10 transition-all hover:scale-[1.02] duration-300">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-3 h-8 genz-gradient-1 rounded-full"></div>
                        <div>
                            <Title className="text-2xl font-black text-slate-900 tracking-tighter">Status Check</Title>
                            <Subtitle className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Current Workflow</Subtitle>
                        </div>
                    </div>
                    <div className="h-[28rem]">
                        <StatusCheckChart data={statusChartData} />
                    </div>
                </Card>
                <Card className="ring-0 shadow-2xl rounded-[2.5rem] glass-card p-8 overflow-hidden border-white/50 hover:shadow-cyan-500/10 transition-all hover:scale-[1.02] duration-300">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-3 h-8 genz-gradient-3 rounded-full"></div>
                        <div>
                            <Title className="text-2xl font-black text-slate-900 tracking-tighter">Load Board</Title>
                            <Subtitle className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Active workload</Subtitle>
                        </div>
                    </div>
                    <div className="h-96">
                        <BarChart
                            className="h-full w-full"
                            data={managerData}
                            index="name"
                            categories={["count"]}
                            colors={["cyan"]}
                            showAnimation={true}
                            showLegend={false}
                            allowDecimals={false}
                            customTooltip={DashboardChartTooltip}
                        />
                    </div>
                </Card>
            </Grid>

            {/* Tables Section */}
            <TabGroup className="mt-16">
                <TabList className="bg-slate-900/5 p-2 rounded-2xl inline-flex mb-8 gap-2 backdrop-blur-md">
                    <Tab className="rounded-xl py-3 px-8 data-[selected]:bg-slate-900 data-[selected]:text-white data-[selected]:shadow-2xl font-black text-[11px] uppercase tracking-widest text-slate-500 transition-all">Active Clients</Tab>
                    <Tab className="rounded-xl py-3 px-8 data-[selected]:bg-red-500 data-[selected]:text-white data-[selected]:shadow-2xl font-black text-[11px] uppercase tracking-widest text-slate-500 transition-all">Exceptions ({exceptionsData.length})</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <Card className="ring-0 shadow-2xl rounded-[2.5rem] glass-card border-white/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHead className="bg-slate-900/5">
                                        <TableRow>
                                            <TableHeaderCell className="text-slate-900 font-black py-6 px-6 text-[10px] uppercase tracking-widest opacity-50">ID</TableHeaderCell>
                                            <TableHeaderCell className="text-slate-900 font-black py-6 px-6 text-[10px] uppercase tracking-widest opacity-50">Client</TableHeaderCell>
                                            <TableHeaderCell className="text-slate-900 font-black py-6 px-6 text-[10px] uppercase tracking-widest opacity-50">Phase</TableHeaderCell>
                                            <TableHeaderCell className="text-slate-900 font-black py-6 px-6 text-[10px] uppercase tracking-widest opacity-50">Lead</TableHeaderCell>
                                            <TableHeaderCell className="text-slate-900 font-black py-6 px-6 text-[10px] uppercase tracking-widest opacity-50">Go Live</TableHeaderCell>
                                            <TableHeaderCell className="text-slate-900 font-black py-6 px-6 text-[10px] uppercase tracking-widest opacity-50">Update</TableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {activeClientRows}
                                        {/*
                                        {filteredData
                                            .filter(c => c.phase === "Implementation (Pre–Go-Live)" || c.phase === "Post–Go-Live / Monitoring")
                                            .sort((a, b) => {
                                                if (!a.goLiveDate && !b.goLiveDate) return b.updated.localeCompare(a.updated);
                                                if (!a.goLiveDate) return 1;
                                                if (!b.goLiveDate) return -1;
                                                return a.goLiveDate.localeCompare(b.goLiveDate);
                                            })
                                            .map((c) => (
                                                    c.phase === "Implementation (Pre–Go-Live)";
                                                
                                            <TableRow key={c.key} className="table-row-hover group">
                                                        <TableCell className="py-6 px-6">
                                                            <a href={`https://${process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'sequeltechnologies.atlassian.net'}/browse/${c.key}`} target="_blank" className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-black text-[10px] hover:scale-110 transition-transform inline-block shadow-lg shadow-slate-900/20 group-hover:shadow-xl group-hover:shadow-slate-900/30">
                                                                {c.key}
                                                            </a>
                                                        </TableCell>
                                                        <TableCell className="font-black text-slate-900 py-6 px-6 text-sm group-hover:text-indigo-700 transition-colors">{c.summary}</TableCell>
                                                        <TableCell className="py-6 px-6"><Badge color={COLORS[c.phase]} className="rounded-xl font-black text-[9px] uppercase tracking-widest border-0 py-1 px-3 shadow-sm group-hover:scale-105 transition-transform">{c.phase.split(" ")[0]}</Badge></TableCell>
                                                        <TableCell className="text-slate-600 py-6 px-6 font-bold italic group-hover:text-slate-800 transition-colors">{c.manager}</TableCell>
                                                        <TableCell className="py-6 px-6">
                                                            {c.goLiveDate ? (
                                                                <div className="flex items-center gap-2 group-hover:scale-105 transition-transform">
                                                                    <Calendar size={14} className="text-indigo-500" />
                                                                    <span className="font-black text-slate-900 text-xs">{new Date(c.goLiveDate).toLocaleDateString()}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 font-black text-[10px]">TBD</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-slate-400 py-6 px-6 text-[11px] font-bold italic group-hover:text-slate-600 transition-colors">{c.updatedDaysAgo}d ago</TableCell>
                                                    </TableRow>
                                            ))}
                                        */}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </TabPanel>
                    <TabPanel>
                        <Card className="ring-0 shadow-2xl rounded-[2.5rem] glass-card border-white/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHead className="bg-red-500/5">
                                        <TableRow>
                                            <TableHeaderCell className="text-red-900 font-black py-6 px-6 text-[10px] uppercase tracking-widest opacity-50">Key</TableHeaderCell>
                                            <TableHeaderCell className="text-red-900 font-black py-6 px-6 text-[10px] uppercase tracking-widest opacity-50">Summary</TableHeaderCell>
                                            <TableHeaderCell className="text-red-900 font-black py-6 px-6 text-[10px] uppercase tracking-widest opacity-50">Red Flags</TableHeaderCell>
                                            <TableHeaderCell className="text-red-900 font-black py-6 px-6 text-[10px] uppercase tracking-widest opacity-50">Updated</TableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {exceptionsData.map((c) => (
                                            <TableRow key={c.key} className="table-row-hover group">
                                                <TableCell className="py-6 px-6">
                                                    <a href={`https://${process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'sequeltechnologies.atlassian.net'}/browse/${c.key}`} target="_blank" className="bg-red-500 text-white px-3 py-1.5 rounded-xl font-black text-[10px] shadow-lg shadow-red-200 inline-block group-hover:shadow-xl group-hover:shadow-red-200/50 transition-all">
                                                        {c.key}
                                                    </a>
                                                </TableCell>
                                                <TableCell className="font-black text-slate-900 py-6 px-6 text-sm group-hover:text-red-700 transition-colors">{c.summary}</TableCell>
                                                <TableCell className="py-6 px-6">
                                                    <div className="flex flex-wrap gap-2">
                                                        {getExceptionReason(c).split(", ").map(r => (
                                                            <Badge key={r} color="red" size="xs" className="rounded-xl font-black text-[9px] uppercase tracking-tighter py-1 px-3 border-0 shadow-sm group-hover:scale-105 transition-transform">{r}</Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-red-400 py-6 px-6 text-[11px] font-black italic group-hover:text-red-600 transition-colors">{c.updatedDaysAgo}d ago</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </div>
    );
}
