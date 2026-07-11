import { encrypt, decrypt } from '@/lib/encryption'

type TelegramChannelRow = {
  encrypted_token: string
  chat_id_encrypted?: string | null
}

export async function resolveTelegramChatId(
  token: string,
  channelData: TelegramChannelRow
): Promise<string> {
  if (channelData.chat_id_encrypted) {
    try {
      return decrypt(channelData.chat_id_encrypted)
    } catch {
      // fall through to detection
    }
  }

  const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`)
  if (!updatesRes.ok) {
    throw new Error('Failed to fetch updates from Telegram')
  }
  const updatesData = await updatesRes.json()
  const messages = updatesData.result || []
  const lastMessage = [...messages].reverse().find((m: { message?: { chat?: { id?: number } } }) => m.message?.chat?.id)
  if (!lastMessage?.message?.chat?.id) {
    throw new Error('No chat history found. Send /start to your bot first, or enter your Chat ID manually in Settings.')
  }
  return String(lastMessage.message.chat.id)
}

export function encryptChatId(chatId: string): string {
  return encrypt(chatId)
}
