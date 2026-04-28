import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { createMeetingFromTemplate } from "@/lib/meeting-from-template";
import { writeAuditLog } from "@/lib/audit-log";

export async function POST() {
  const auth = await getAuthContext();
  if (!auth) return jsonError("Unauthorized", 401);

  const result = await createMeetingFromTemplate();
  if (!result.ok) {
    const status =
      result.error === "no_template"
        ? 404
        : result.error === "schedule_error"
          ? 500
          : 409;
    return jsonError(result.message, status);
  }

  await writeAuditLog({
    username: auth.username,
    action: "meetings.from-template.POST",
    subject: `meeting:${result.meetingId}`,
    changes: { id: result.meetingId, meetup_date: result.meetupYmd },
  });
  return NextResponse.json({
    id: result.meetingId,
    meetup_date: result.meetupYmd,
  });
}
