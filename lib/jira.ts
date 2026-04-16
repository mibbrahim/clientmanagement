export interface ClientData {
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

export interface WorkflowStatusCount {
    label: string;
    value: number;
}

export type ActivityRange = "24h" | "7d" | "30d";

export interface RecentActivityItem {
    issueKey: string;
    summary: string;
    actor: string;
    whenISO: string;
    whenRelative: string;
    changeText: string;
    newStatus: string | null;
    link: string;
}

type JiraField = {
    id: string;
    name: string;
};

type JiraIssue = {
    key: string;
    fields: Record<string, unknown>;
};

type JiraSearchResponse = {
    issues?: JiraIssue[];
    total?: number;
    isLast?: boolean;
    nextPageToken?: string;
};

type JiraSearchMode = "legacy" | "modern";

type WorkflowStatusBucket = {
    label: string;
    jiraStatuses: string[];
};

const CLIENT_BASE_JQL = 'project = PC AND issuetype IN ("Implementation Client","Live Client")';
const JIRA_PAGE_SIZE = 100;

const WORKFLOW_STATUS_BUCKETS: WorkflowStatusBucket[] = [
    {
        label: "Week 1-4",
        jiraStatuses: [
            "Migrations and integrations",
        ],
    },
    {
        label: "Week 4-8",
        jiraStatuses: [
            "Week 4-8 Data | Training | Int",
        ],
    },
    {
        label: "Week 8+",
        jiraStatuses: ["Week 8+"],
    },
    {
        label: "Week 12",
        jiraStatuses: [
            "12-week Data | Training | Inte",
        ],
    },
    {
        label: "Go Live Phase",
        jiraStatuses: ["Go Live Monitoring"],
    },
    {
        label: "Transitioned to RCM",
        jiraStatuses: ["Transitioned to RCM"],
    },
    {
        label: "Client Left During Implementation",
        jiraStatuses: ["Client Left During Implementation"],
    },
    {
        label: "Handover to Client Success",
        jiraStatuses: [
            "Handover to Client Success",
            "HAND OVER TO CLIENT SUCCESS",
            "Handover to Client Success/ RCM",
        ],
    },
];

function getJiraConfig() {
    const domain = process.env.JIRA_DOMAIN || "sequeltechnologies.atlassian.net";
    const email = process.env.JIRA_EMAIL;
    const token = process.env.JIRA_API_TOKEN;

    // Keep Jira credentials server-side only. This helper is intended for backend usage,
    // such as Server Components and Route Handlers, rather than direct browser requests.
    if (!email || !token) {
        console.error("Missing Jira Credentials");
        return null;
    }

    const cleanDomain = domain.replace("https://", "").replace("/", "");
    const auth = Buffer.from(`${email}:${token}`).toString("base64");

    return {
        cleanDomain,
        headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json",
        },
    };
}

function normalizeStatusName(value: string) {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function canonicalizeStatusName(value: string) {
    return normalizeStatusName(value)
        .replace(/[–—]/g, "-")
        .replace(/\s*\/\s*/g, "/")
        .replace(/\s*\|\s*/g, " | ")
        .replace(/\s*\+\s*/g, "+");
}

function escapeJqlString(value: string) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getRecord(value: unknown) {
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function getStringValue(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback;
}

function getStringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getDisplayValue(value: unknown, fallback: string) {
    if (typeof value === "string" && value.length > 0) {
        return value;
    }

    const record = getRecord(value);

    if (typeof record?.displayName === "string" && record.displayName.length > 0) {
        return record.displayName;
    }

    if (typeof record?.value === "string" && record.value.length > 0) {
        return record.value;
    }

    return fallback;
}

function getStatusName(issueFields: Record<string, unknown>) {
    const statusField = getRecord(issueFields.status);
    return typeof statusField?.name === "string" ? statusField.name : "Unknown";
}

function getStatusCategoryKey(issueFields: Record<string, unknown>) {
    const statusField = getRecord(issueFields.status);
    const statusCategory = getRecord(statusField?.statusCategory);
    return typeof statusCategory?.key === "string" ? statusCategory.key : "new";
}

function getJiraBrowseBaseUrl(cleanDomain: string) {
    // If you want a custom Jira base URL, set JIRA_BASE_URL in env.
    return process.env.JIRA_BASE_URL || `https://${cleanDomain}`;
}

function getRangeCutoff(range: ActivityRange) {
    const now = Date.now();

    switch (range) {
        case "24h":
            return new Date(now - 24 * 60 * 60 * 1000);
        case "30d":
            return new Date(now - 30 * 24 * 60 * 60 * 1000);
        case "7d":
        default:
            return new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
}

function getRangeJqlClause(range: ActivityRange) {
    switch (range) {
        case "24h":
            return 'updated >= -1d';
        case "30d":
            return 'updated >= -30d';
        case "7d":
        default:
            return 'updated >= -7d';
    }
}

function formatRelativeTime(whenISO: string) {
    const timestamp = new Date(whenISO).getTime();
    const diffMs = Date.now() - timestamp;

    if (diffMs < 60 * 1000) return "Just now";

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
        const minutes = Math.max(1, Math.round(diffMs / minute));
        return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }

    if (diffMs < day) {
        const hours = Math.max(1, Math.round(diffMs / hour));
        return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    const days = Math.max(1, Math.round(diffMs / day));
    return `${days} day${days === 1 ? "" : "s"} ago`;
}

function getFetchCacheOptions(revalidate: number, bypassCache = false) {
    return bypassCache ? { cache: "no-store" as const } : { next: { revalidate } };
}

async function postJiraSearch({
    cleanDomain,
    headers,
    jql,
    fields,
    startAt,
    nextPageToken,
    maxResults,
    revalidate,
    bypassCache,
}: {
    cleanDomain: string;
    headers: Record<string, string>;
    jql: string;
    fields: string[];
    startAt?: number;
    nextPageToken?: string;
    maxResults: number;
    revalidate: number;
    bypassCache?: boolean;
}) {
    const legacyEndpoint = `https://${cleanDomain}/rest/api/3/search`;
    const modernEndpoint = `https://${cleanDomain}/rest/api/3/search/jql`;
    const legacyBody = JSON.stringify({
        jql,
        fields,
        startAt: startAt ?? 0,
        maxResults,
        failFast: false,
    });
    const modernBody = JSON.stringify({
        jql,
        fields,
        maxResults,
        failFast: false,
        ...(nextPageToken ? { nextPageToken } : {}),
    });

    const legacyResponse = await fetch(legacyEndpoint, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: legacyBody,
        ...getFetchCacheOptions(revalidate, bypassCache),
    });

    if (legacyResponse.ok) {
        return {
            mode: "legacy" as JiraSearchMode,
            data: await legacyResponse.json() as JiraSearchResponse,
        };
    }

    const legacyErrorText = await legacyResponse.text();

    const modernResponse = await fetch(modernEndpoint, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: modernBody,
        ...getFetchCacheOptions(revalidate, bypassCache),
    });

    if (modernResponse.ok) {
        return {
            mode: "modern" as JiraSearchMode,
            data: await modernResponse.json() as JiraSearchResponse,
        };
    }

    const modernErrorText = await modernResponse.text();
    throw new Error(
        [
            `POST ${legacyEndpoint}: ${legacyResponse.status} ${legacyResponse.statusText} - ${legacyErrorText}`,
            `POST ${modernEndpoint}: ${modernResponse.status} ${modernResponse.statusText} - ${modernErrorText}`,
        ].join(" | "),
    );
}

async function fetchAllJiraIssues({
    cleanDomain,
    headers,
    jql,
    fields,
    revalidate,
    bypassCache,
}: {
    cleanDomain: string;
    headers: Record<string, string>;
    jql: string;
    fields: string[];
    revalidate: number;
    bypassCache?: boolean;
}) {
    const issues: JiraIssue[] = [];
    let startAt = 0;
    let nextPageToken: string | undefined;
    let guard = 0;

    while (true) {
        const { data: page, mode } = await postJiraSearch({
            cleanDomain,
            headers,
            jql,
            fields,
            startAt,
            nextPageToken,
            maxResults: JIRA_PAGE_SIZE,
            revalidate,
            bypassCache,
        });

        const pageIssues = Array.isArray(page.issues) ? page.issues : [];
        issues.push(...pageIssues);
        guard += 1;

        if (guard > 500) {
            throw new Error("Jira search pagination exceeded safe page limit");
        }

        if (mode === "legacy") {
            const total = typeof page.total === "number" ? page.total : issues.length;
            startAt += pageIssues.length;

            if (pageIssues.length === 0 || startAt >= total) {
                break;
            }
        } else {
            const isLast = page.isLast === true;
            nextPageToken = typeof page.nextPageToken === "string" && page.nextPageToken.length > 0
                ? page.nextPageToken
                : undefined;

            if (pageIssues.length === 0 || isLast || !nextPageToken) {
                break;
            }
        }

        if (pageIssues.length === 0) {
            break;
        }
    }

    return issues;
}

async function fetchJiraTotalForStatus({
    cleanDomain,
    headers,
    baseJql,
    statusName,
}: {
    cleanDomain: string;
    headers: Record<string, string>;
    baseJql: string;
    statusName: string;
}) {
    const jql = `${baseJql} AND status = "${escapeJqlString(statusName)}"`;

    const issues = await fetchAllJiraIssues({
        cleanDomain,
        headers,
        jql,
        fields: ["status"],
        revalidate: 60,
    });

    return issues.length;
}

async function fetchJiraFields(cleanDomain: string, headers: Record<string, string>) {
    const response = await fetch(`https://${cleanDomain}/rest/api/3/field`, {
        headers,
        next: { revalidate: 3600 },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch fields");
    }

    return response.json() as Promise<JiraField[]>;
}

function buildFieldMap(fields: JiraField[]) {
    const fieldMap: Record<string, string> = {};
    const wanted = new Set([
        "Manager",
        "Implementation Manager",
        "Account Manager",
        "Clinical Manager",
        "Go Live Date",
        "Package Category",
        "PEHR Package",
        "Customer ID",
        "Kickoff Satisfaction Score",
        "Training Satisfaction Score",
        "Pulse Survey Score",
        "Go-Live Readiness Score",
        "Post Go-Live Score",
        "Final Implementation Satisfaction",
        "Client Health Score",
        "Survey Response Status",
    ]);

    fields.forEach((field) => {
        if (wanted.has(field.name)) {
            fieldMap[field.name] = field.id;
        }
    });

    return fieldMap;
}

function logWorkflowStatusDebug(issues: JiraIssue[]) {
    const statusFrequency = issues.reduce<Record<string, number>>((acc, issue) => {
        const statusName = getStatusName(issue.fields);
        acc[statusName] = (acc[statusName] || 0) + 1;
        return acc;
    }, {});

    console.log(`[Jira workflow] total issues fetched: ${issues.length}`);
    console.log("[Jira workflow] status frequency:", statusFrequency);
    console.table(
        Object.entries(statusFrequency)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => ({ status, count })),
    );
}

async function fetchRecentIssueSummaries({
    cleanDomain,
    headers,
    range,
    bypassCache,
}: {
    cleanDomain: string;
    headers: Record<string, string>;
    range: ActivityRange;
    bypassCache?: boolean;
}) {
    const jql = `${CLIENT_BASE_JQL} AND ${getRangeJqlClause(range)} ORDER BY updated DESC`;
    const { data } = await postJiraSearch({
        cleanDomain,
        headers,
        jql,
        fields: ["summary", "updated", "status", "issuetype"],
        startAt: 0,
        maxResults: 20,
        revalidate: 60,
        bypassCache,
    });

    return Array.isArray(data.issues) ? data.issues : [];
}

async function fetchIssueChangelog({
    cleanDomain,
    headers,
    issueKey,
    bypassCache,
}: {
    cleanDomain: string;
    headers: Record<string, string>;
    issueKey: string;
    bypassCache?: boolean;
}) {
    const response = await fetch(
        `https://${cleanDomain}/rest/api/3/issue/${encodeURIComponent(issueKey)}?expand=changelog`,
        {
            headers,
            ...getFetchCacheOptions(60, bypassCache),
        },
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch changelog for ${issueKey}`);
    }

    return response.json() as Promise<Record<string, unknown>>;
}

function buildActivityText(items: Record<string, unknown>[]) {
    const statusItem = items.find((item) => item.field === "status");

    if (statusItem) {
        const fromValue = getStringValue(statusItem.fromString, "Unknown");
        const toValue = getStringValue(statusItem.toString, "Unknown");

        return {
            changeText: `Status: ${fromValue} -> ${toValue}`,
            newStatus: toValue,
        };
    }

    const assigneeItem = items.find((item) => item.field === "assignee");

    if (assigneeItem) {
        const fromValue = getStringValue(assigneeItem.fromString, "Unassigned");
        const toValue = getStringValue(assigneeItem.toString, "Unassigned");

        return {
            changeText: `Assignee: ${fromValue} -> ${toValue}`,
            newStatus: null,
        };
    }

    const businessFields = items.filter((item) => {
        const fieldName = getStringValue(item.field);
        return ["Go Live Date", "Manager", "Package Category"].includes(fieldName);
    });

    if (businessFields.length > 0) {
        return {
            changeText: `Updated: ${businessFields.slice(0, 2).map((item) => getStringValue(item.field)).join(", ")}`,
            newStatus: null,
        };
    }

    const firstItems = items.slice(0, 2).map((item) => getStringValue(item.field)).filter(Boolean);

    return {
        changeText: firstItems.length > 0 ? `Updated: ${firstItems.join(", ")}` : "Issue updated",
        newStatus: null,
    };
}

function buildFallbackActivityItem(issue: JiraIssue, cleanDomain: string): RecentActivityItem | null {
    const summary = getStringValue(issue.fields.summary, issue.key);
    const updated = getStringValue(issue.fields.updated);
    if (!updated) return null;

    const currentStatus = getStatusName(issue.fields);

    return {
        issueKey: issue.key,
        summary,
        actor: "Jira user",
        whenISO: updated,
        whenRelative: formatRelativeTime(updated),
        changeText: "Updated (no changelog details available)",
        newStatus: currentStatus === "Unknown" ? null : currentStatus,
        link: `${getJiraBrowseBaseUrl(cleanDomain)}/browse/${issue.key}`,
    };
}

async function buildRecentActivityItems({
    cleanDomain,
    headers,
    issues,
    range,
    bypassCache,
}: {
    cleanDomain: string;
    headers: Record<string, string>;
    issues: JiraIssue[];
    range: ActivityRange;
    bypassCache?: boolean;
}) {
    const cutoff = getRangeCutoff(range).getTime();
    const items: RecentActivityItem[] = [];

    for (let index = 0; index < issues.length; index += 4) {
        const batch = issues.slice(index, index + 4);
        const batchItems = await Promise.all(
            batch.map(async (issue) => {
                try {
                    const detail = await fetchIssueChangelog({
                        cleanDomain,
                        headers,
                        issueKey: issue.key,
                        bypassCache,
                    });

                    const changelog = getRecord(detail.changelog);
                    const histories = Array.isArray(changelog?.histories)
                        ? changelog.histories.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
                        : [];

                    const latestHistory = histories
                        .filter((history) => {
                            const created = getStringValue(history.created);
                            return created ? new Date(created).getTime() >= cutoff : false;
                        })
                        .sort((a, b) => {
                            return new Date(getStringValue(b.created)).getTime() - new Date(getStringValue(a.created)).getTime();
                        })[0];

                    if (!latestHistory) {
                        return null;
                    }

                    const historyItems = Array.isArray(latestHistory.items)
                        ? latestHistory.items.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
                        : [];

                    const actor = getDisplayValue(latestHistory.author, "Jira user");
                    const whenISO = getStringValue(latestHistory.created);
                    const summary = getStringValue(issue.fields.summary, issue.key);
                    const { changeText, newStatus } = buildActivityText(historyItems);

                    return {
                        issueKey: issue.key,
                        summary,
                        actor,
                        whenISO,
                        whenRelative: formatRelativeTime(whenISO),
                        changeText,
                        newStatus,
                        link: `${getJiraBrowseBaseUrl(cleanDomain)}/browse/${issue.key}`,
                    } satisfies RecentActivityItem;
                } catch {
                    const updated = getStringValue(issue.fields.updated);
                    const updatedAt = updated ? new Date(updated).getTime() : 0;

                    if (updatedAt >= cutoff) {
                        return buildFallbackActivityItem(issue, cleanDomain);
                    }

                    return null;
                }
            }),
        );

        items.push(...batchItems.filter((item): item is RecentActivityItem => item !== null));
    }

    return items.sort((a, b) => new Date(b.whenISO).getTime() - new Date(a.whenISO).getTime());
}

export async function getRecentActivity(range: ActivityRange = "7d", bypassCache = false): Promise<RecentActivityItem[]> {
    const jira = getJiraConfig();

    if (!jira) {
        return [];
    }

    try {
        const issues = await fetchRecentIssueSummaries({
            cleanDomain: jira.cleanDomain,
            headers: jira.headers,
            range,
            bypassCache,
        });

        return await buildRecentActivityItems({
            cleanDomain: jira.cleanDomain,
            headers: jira.headers,
            issues,
            range,
            bypassCache,
        });
    } catch (error) {
        console.error("Jira Recent Activity Fetch Error:", error);
        return [];
    }
}

export async function getWorkflowStatusCounts(): Promise<WorkflowStatusCount[]> {
    const jira = getJiraConfig();

    if (!jira) {
        return WORKFLOW_STATUS_BUCKETS.map((bucket) => ({ label: bucket.label, value: 0 }));
    }

    try {
        const issues = await fetchAllJiraIssues({
            cleanDomain: jira.cleanDomain,
            headers: jira.headers,
            jql: CLIENT_BASE_JQL,
            fields: ["status"],
            revalidate: 60,
        });

        logWorkflowStatusDebug(issues);

        const statusFrequency = issues.reduce<Record<string, number>>((acc, issue) => {
            const statusName = getStatusName(issue.fields);
            const key = canonicalizeStatusName(statusName);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const uniqueStatuses = Array.from(new Set(WORKFLOW_STATUS_BUCKETS.flatMap((bucket) => bucket.jiraStatuses)));
        const statusTotals = new Map<string, number>();

        await Promise.all(
            uniqueStatuses.map(async (statusName) => {
                const total = await fetchJiraTotalForStatus({
                    cleanDomain: jira.cleanDomain,
                    headers: jira.headers,
                    baseJql: CLIENT_BASE_JQL,
                    statusName,
                });

                statusTotals.set(normalizeStatusName(statusName), total);
            }),
        );

        console.log(
            "[Jira workflow] bucket source totals:",
            Object.fromEntries(statusTotals.entries()),
        );

        return WORKFLOW_STATUS_BUCKETS.map((bucket) => {
            const exactTotal = bucket.jiraStatuses.reduce((sum, statusName) => {
                return sum + (statusTotals.get(normalizeStatusName(statusName)) || 0);
            }, 0);

            const canonicalTotal = bucket.jiraStatuses.reduce((sum, statusName) => {
                return sum + (statusFrequency[canonicalizeStatusName(statusName)] || 0);
            }, 0);

            return {
                label: bucket.label,
                value: Math.max(exactTotal, canonicalTotal),
            };
        });
    } catch (error) {
        console.error("Jira Workflow Status Fetch Error:", error);
        return WORKFLOW_STATUS_BUCKETS.map((bucket) => ({ label: bucket.label, value: 0 }));
    }
}

export async function getClientDashboardData(): Promise<ClientData[]> {
    const jira = getJiraConfig();

    if (!jira) {
        return [];
    }

    try {
        const fields = await fetchJiraFields(jira.cleanDomain, jira.headers);
        const fieldMap = buildFieldMap(fields);

        const managerField = fieldMap["Manager"] || fieldMap["Implementation Manager"] || fieldMap["Account Manager"];
        const clinicalManagerField = fieldMap["Clinical Manager"];
        const goLiveField = fieldMap["Go Live Date"];
        const packageField = fieldMap["Package Category"];
        const healthScoreField = fieldMap["Client Health Score"];
        const surveyStatusField = fieldMap["Survey Response Status"];

        const issues = await fetchAllJiraIssues({
            cleanDomain: jira.cleanDomain,
            headers: jira.headers,
            jql: `${CLIENT_BASE_JQL} ORDER BY updated DESC`,
            fields: [
                "summary",
                "issuetype",
                "status",
                "created",
                "updated",
                "assignee",
                "labels",
                "priority",
                managerField,
                clinicalManagerField,
                goLiveField,
                packageField,
                healthScoreField,
                surveyStatusField,
            ].filter(Boolean) as string[],
            revalidate: 60,
        });

        const now = new Date();

        return issues.map((issue): ClientData => {
            const issueFields = issue.fields;
            const statusName = getStatusName(issueFields);
            const statusCategory = getStatusCategoryKey(issueFields);
            const normalizedStatus = normalizeStatusName(statusName);

            let phase = "Implementation (Pre–Go-Live)";

            if (normalizedStatus.includes("monitor")) {
                phase = "Post–Go-Live / Monitoring";
            } else if (normalizedStatus.includes("handover") || normalizedStatus.includes("client success")) {
                phase = "Handover / Success";
            } else if (normalizedStatus.includes("rcm")) {
                phase = "RCM";
            } else if (normalizedStatus.includes("left")) {
                phase = "Churn / Left";
            }

            const updatedDate = new Date(getStringValue(issueFields.updated));
            const diffTime = Math.abs(now.getTime() - updatedDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                key: issue.key,
                summary: getStringValue(issueFields.summary, issue.key),
                issueType: getStringValue(getRecord(issueFields.issuetype)?.name, "Unknown"),
                status: statusName,
                statusCategory,
                created: getStringValue(issueFields.created),
                updated: getStringValue(issueFields.updated),
                assignee: getDisplayValue(issueFields.assignee, "Unassigned"),
                labels: getStringArray(issueFields.labels),
                manager: managerField ? getDisplayValue(issueFields[managerField], "Unassigned") : "Unassigned",
                clinicalManager: clinicalManagerField ? getDisplayValue(issueFields[clinicalManagerField], "Unassigned") : "Unassigned",
                goLiveDate: goLiveField ? getStringValue(issueFields[goLiveField]) || null : null,
                packageCategory: packageField ? getDisplayValue(issueFields[packageField], "N/A") : "N/A",
                isClosed: statusCategory === "done" || ["done", "closed", "complete", "completed"].includes(normalizedStatus),
                phase,
                updatedDaysAgo: diffDays,
                healthScore: healthScoreField ? (parseFloat(getStringValue(issueFields[healthScoreField])) || null) : null,
                surveyStatus: surveyStatusField ? getDisplayValue(issueFields[surveyStatusField], "") || null : null,
            };
        });
    } catch (error) {
        console.error("Jira Data Fetch Error:", error);
        return [];
    }
}
