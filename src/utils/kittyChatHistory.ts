export type ChatHistoryMessage = {
  role: 'user' | 'model';
  text: string;
};

export type ChatConversation<T extends ChatHistoryMessage = ChatHistoryMessage> = {
  id: string;
  title: string;
  updatedAt: string;
  messages: T[];
};

export const MAX_CHAT_CONVERSATIONS = 50;
const MAX_CHAT_MESSAGES = 500;
const MAX_CHAT_TITLE_LENGTH = 48;

export const createChatConversation = <T extends ChatHistoryMessage>(id: string, updatedAt: string): ChatConversation<T> => ({
  id,
  title: 'Neuer Chat',
  updatedAt,
  messages: [],
});

export const readChatHistory = <T extends ChatHistoryMessage>(raw: string | null): ChatConversation<T>[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ChatConversation<T> =>
      !!item && typeof item === 'object' && typeof item.id === 'string' &&
      typeof item.title === 'string' && typeof item.updatedAt === 'string' &&
      Array.isArray(item.messages),
    ).map((item) => ({
      ...item,
      messages: item.messages.filter((message: unknown): message is T =>
        !!message && typeof message === 'object' &&
        ['user', 'model'].includes((message as ChatHistoryMessage).role) &&
        typeof (message as ChatHistoryMessage).text === 'string',
      ).slice(-MAX_CHAT_MESSAGES),
    })).sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)).slice(0, MAX_CHAT_CONVERSATIONS);
  } catch {
    return [];
  }
};

export const updateChatMessages = <T extends ChatHistoryMessage>(
  conversations: ChatConversation<T>[],
  id: string,
  messages: T[],
  updatedAt: string,
): ChatConversation<T>[] => conversations.map((conversation) => {
  if (conversation.id !== id) return conversation;
  const savedMessages = messages.slice(-MAX_CHAT_MESSAGES);
  const firstQuestion = savedMessages.find((message) => message.role === 'user')?.text.trim();
  const title = firstQuestion
    ? firstQuestion.length > MAX_CHAT_TITLE_LENGTH ? `${firstQuestion.slice(0, MAX_CHAT_TITLE_LENGTH - 1)}…` : firstQuestion
    : conversation.title;
  return { ...conversation, title, updatedAt, messages: savedMessages };
}).sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)).slice(0, MAX_CHAT_CONVERSATIONS);