import { NextRequest, NextResponse } from "next/server";
import { getJobsByIds } from "@/lib/query";

export async function GET(request: NextRequest) {
  try {
    const ids = request.nextUrl.searchParams.getAll("ids");

    if (ids.length === 0) {
      return NextResponse.json({ data: [] });
    }

    if (ids.length > 200) {
      return NextResponse.json(
        { error: "Too many IDs (max 200)" },
        { status: 400 }
      );
    }

    const jobs = await getJobsByIds(ids);

    return NextResponse.json(
      { data: jobs },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
