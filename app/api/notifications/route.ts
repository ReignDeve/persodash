// app/api/notifications/route.ts
import { NextResponse } from "next/server";
import {
  addNotification,
  listNotifications,
  Notification,
  NotificationType,
  NotificationSeverity,
} from "../../services/notificationService";
import { sendTelegramMessage } from "@/app/services/telegramService";

type CreateNotificationBody = {
  type: NotificationType;
  source: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
};

export async function GET() {
  const items = listNotifications();
  return NextResponse.json({ data: items });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<CreateNotificationBody>;

  if (!body.type || !body.source || !body.severity || !body.title || !body.message) {
    return NextResponse.json(
      { error: "Missing fields" },
      { status: 400 }
    );
  }

  const notification = addNotification({
    type: body.type,
    source: body.source,
    severity: body.severity,
    title: body.title,
    message: body.message,
  });

  // Telegram Push
  const text = [
    `*${notification.title}*`,
    "",
    `Typ: ${notification.type}`,
    `Quelle: ${notification.source}`,
    `Level: ${notification.severity.toUpperCase()}`,
    "",
    notification.message,
    "",
    `Zeit: ${new Date(notification.createdAt).toLocaleString("de-DE")}`,
  ].join("\n");

  await sendTelegramMessage(text);

  return NextResponse.json({ data: notification }, { status: 201 });
}
