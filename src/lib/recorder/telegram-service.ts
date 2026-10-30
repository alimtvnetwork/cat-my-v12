export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isEnabled: boolean;
}

const STORAGE_KEY = "cat_vision_telegram_config";

export function loadTelegramConfig(): TelegramConfig {
  if (typeof window === "undefined") {
    return { botToken: "", chatId: "", isEnabled: false };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { botToken: "", chatId: "", isEnabled: false };
    }

    const parsed = JSON.parse(raw);

    return {
      botToken: String(parsed.botToken ?? "").trim(),
      chatId: String(parsed.chatId ?? "").trim(),
      isEnabled: Boolean(parsed.isEnabled),
    };
  } catch {
    return { botToken: "", chatId: "", isEnabled: false };
  }
}

export function saveTelegramConfig(config: TelegramConfig): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export async function testTelegramConnection(botToken: string): Promise<{ isSuccess: boolean; message: string }> {
  const token = botToken.trim();

  if (!token) {
    return { isSuccess: false, message: "Bot token is empty." };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();

    if (data.ok && data.result) {
      return {
        isSuccess: true,
        message: `Connected successfully to bot: @${data.result.username || data.result.first_name}`,
      };
    }

    return {
      isSuccess: false,
      message: data.description || "Invalid bot token.",
    };
  } catch (err) {
    return {
      isSuccess: false,
      message: err instanceof Error ? err.message : "Network error contacting Telegram API.",
    };
  }
}

export async function sendTelegramMessage(text: string): Promise<{ isSuccess: boolean; message: string }> {
  const config = loadTelegramConfig();

  if (!config.botToken || !config.chatId) {
    return {
      isSuccess: false,
      message: "Telegram bot token or Chat ID is missing. Configure settings first.",
    };
  }

  try {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    const data = await res.json();

    if (data.ok) {
      return { isSuccess: true, message: "Bug report sent to Telegram successfully!" };
    }

    return { isSuccess: false, message: data.description || "Telegram API rejected message." };
  } catch (err) {
    return {
      isSuccess: false,
      message: err instanceof Error ? err.message : "Failed to connect to Telegram API.",
    };
  }
}
