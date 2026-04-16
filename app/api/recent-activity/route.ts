import { NextRequest } from "next/server";

import { getRecentActivity, type ActivityRange } from "../../../lib/jira";

export async function GET(request: NextRequest) {
    const rangeParam = request.nextUrl.searchParams.get("range");
    const refreshParam = request.nextUrl.searchParams.get("refresh");

    const range: ActivityRange =
        rangeParam === "24h" || rangeParam === "7d" || rangeParam === "30d"
            ? rangeParam
            : "7d";

    const items = await getRecentActivity(range, Boolean(refreshParam));

    return Response.json({ items });
}
