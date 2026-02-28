import { NextRequest, NextResponse } from "next/server";
import { getJobsByIds } from "@/lib/query";

const MAX_IDS = 200;
const ID_MAX_LEN = 64;
const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function isValidId(id: string): boolean {
  return id.length > 0 && id.length <= ID_MAX_LEN && ID_REGEX.test(id);
}

export async function GET(request: NextRequest) {
  try {
    const ids = request.nextUrl.searchParams.getAll("ids");

    if (ids.length === 0) {
      return NextResponse.json({ data: [] });
    }

    if (ids.length > MAX_IDS) {
      return NextResponse.json(
        { error: "Too many IDs (max 200)" },
        { status: 400 }
      );
    }

    const validIds = ids.filter((id) => isValidId(id));
    if (validIds.length !== ids.length) {
      return NextResponse.json(
        { error: "Invalid ID format (alphanumeric, hyphen, underscore; max 64 chars)" },
        { status: 400 }
      );
    }

    const jobs = await getJobsByIds(validIds);

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
