import assert from 'node:assert/strict';
import test from 'node:test';
import { createChatConversation, readChatHistory, updateChatMessages, type ChatHistoryMessage } from '../src/utils/kittyChatHistory';

test('conversation history keeps chats separate and titles them from the first question', () => {
  const first = createChatConversation('one', '2026-11-09T10:00:00.000Z');
  const second = createChatConversation('two', '2026-11-09T10:01:00.000Z');
  const saved = updateChatMessages([first, second], 'one', [
    { role: 'user', text: 'Wie buche ich Miete?' },
    { role: 'model', text: 'Aufwandskonto.' },
  ], '2026-11-09T10:02:00.000Z');
  assert.equal(saved[0].id, 'one');
  assert.equal(saved[0].title, 'Wie buche ich Miete?');
  assert.deepEqual(saved[0].messages.map(({ role }) => role), ['user', 'model']);
  assert.equal(saved[1].messages.length, 0);
});

test('stored chat history tolerates corrupt storage and filters invalid messages', () => {
  assert.deepEqual(readChatHistory('not-json'), []);
  const saved = readChatHistory<ChatHistoryMessage>(JSON.stringify([
    { id: 'one', title: 'Frage', updatedAt: '2026-11-09', messages: [{ role: 'user', text: 'Hallo' }, { role: 'bot', text: 'Fehler' }] },
  ]));
  assert.deepEqual(saved[0].messages, [{ role: 'user', text: 'Hallo' }]);
});