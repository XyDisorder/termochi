import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PetState } from '../../domain/pet/pet.types.js';
import type { Theme } from '../../domain/theme/theme.types.js';
import { aiConfigStorage } from '../../infrastructure/storage/ai-config.js';
import { sendAiMessage } from '../../infrastructure/integrations/ai-chat.js';
import type { ChatMessage, PetContext } from '../../infrastructure/integrations/ai-chat.js';
import { memoryStorage } from '../../infrastructure/storage/memory-storage.js';
import { todoStorage } from '../../infrastructure/storage/todo-storage.js';
import { getMoodLabel } from '../../domain/pet/pet.logic.js';
import { Panel } from '../components/Panel.js';
import { FooterHelp } from '../components/FooterHelp.js';

interface AiChatScreenProps {
  pet: PetState;
  theme: Theme;
  onBack: (hadConversation: boolean) => void;
  onOpenSettings: () => void;
}

type DisplayMessage = { from: 'user' | 'pet'; text: string };

function buildContext(pet: PetState): PetContext {
  return {
    name: pet.name,
    species: pet.species,
    moodLabel: getMoodLabel(pet.stats),
    stats: pet.stats,
    memories: memoryStorage.readAll().map((m) => m.text),
  };
}

export const AiChatScreen: React.FC<AiChatScreenProps> = ({
  pet,
  theme,
  onBack,
  onOpenSettings,
}) => {
  const aiConfig = aiConfigStorage.read();
  const hasAi = aiConfig !== null;

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [inputBuffer, setInputBuffer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hadConversation = useRef(false);

  // Kick off with an AI-generated greeting on mount
  useEffect(() => {
    if (!hasAi || !aiConfig) return;
    setIsLoading(true);
    const ctx = buildContext(pet);
    sendAiMessage(
      aiConfig,
      ctx,
      [{ role: 'user', content: '__greeting__' }]
    )
      .then((greeting) => {
        setMessages([{ from: 'pet', text: greeting }]);
        setHistory([
          { role: 'user', content: '__greeting__' },
          { role: 'assistant', content: greeting },
        ]);
      })
      .catch(() => {
        // Fallback static greeting if API fails at startup
        const fallback = `Hey! What's on your mind?`;
        setMessages([{ from: 'pet', text: fallback }]);
        setHistory([{ role: 'assistant', content: fallback }]);
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendMessage(): Promise<void> {
    const text = inputBuffer.trim();
    if (!text || isLoading || !aiConfig) return;
    setInputBuffer('');

    // Local commands
    if (text.startsWith('/remember ')) {
      const mem = text.slice('/remember '.length).trim();
      if (mem) {
        memoryStorage.add(mem);
        setMessages((prev) => [...prev, { from: 'pet', text: `Got it, I'll remember that.` }]);
      }
      return;
    }
    if (text === '/forget') {
      memoryStorage.clear();
      setMessages((prev) => [...prev, { from: 'pet', text: `Done — I've cleared everything I knew about you.` }]);
      return;
    }
    if (text.startsWith('/todo ')) {
      const task = text.slice('/todo '.length).trim();
      if (task) {
        todoStorage.add(task);
        setMessages((prev) => [...prev, { from: 'pet', text: `Added to your todos: "${task}" ✓` }]);
      }
      return;
    }

    const userMsg: DisplayMessage = { from: 'user', text };
    const newHistory: ChatMessage[] = [...history, { role: 'user', content: text }];

    setMessages((prev) => [...prev, userMsg]);
    setHistory(newHistory);
    setIsLoading(true);
    setError(null);
    hadConversation.current = true;

    try {
      const reply = await sendAiMessage(aiConfig, buildContext(pet), newHistory);
      const updated: ChatMessage[] = [...newHistory, { role: 'assistant', content: reply }];
      setHistory(updated);
      setMessages((prev) => [...prev, { from: 'pet', text: reply }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useInput((input, key) => {
    if (isLoading) return;

    if (key.return) {
      void sendMessage();
    } else if (key.escape) {
      onBack(hadConversation.current);
    } else if (input === ',' && messages.length === 0) {
      onOpenSettings();
    } else if (key.backspace || key.delete) {
      setInputBuffer((b) => b.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      const printable = input
        .split('')
        .filter((c) => { const code = c.charCodeAt(0); return code >= 32 && code < 127; })
        .join('');
      if (printable) setInputBuffer((b) => b + printable);
    }
  });

  if (!hasAi) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Panel title={`Chat with ${pet.name}`} borderColor={theme.accent}>
          <Text dimColor>No AI provider configured.</Text>
          <Box marginTop={1}>
            <Text dimColor>Press </Text>
            <Text color={theme.accent} bold>[,]</Text>
            <Text dimColor> to open Settings and add your Claude or OpenAI API key.</Text>
          </Box>
        </Panel>
        <FooterHelp
          hints={[{ key: ',', label: 'settings' }, { key: 'esc', label: 'back' }]}
          borderColor={theme.border}
        />
      </Box>
    );
  }

  const visibleMessages = messages.slice(-6);

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Panel title={`${pet.name}`} borderColor={theme.accent}>
        <Box flexDirection="column" minHeight={8}>
          {visibleMessages.length === 0 && isLoading && (
            <Text dimColor>...</Text>
          )}
          {visibleMessages.map((msg, i) => (
            <Box key={i} flexDirection="column" marginBottom={1}>
              <Text color={msg.from === 'pet' ? theme.accent : theme.primary} bold>
                {msg.from === 'pet' ? pet.name : 'You'}
              </Text>
              {/* Render each line of a multi-line reply separately */}
              {msg.text.split('\n').map((line, j) => (
                <Text key={j} wrap="wrap">
                  {line}
                </Text>
              ))}
            </Box>
          ))}
          {isLoading && messages.length > 0 && (
            <Box gap={1}>
              <Text color={theme.accent} bold>{pet.name}</Text>
              <Text dimColor>is thinking...</Text>
            </Box>
          )}
          {error && (
            <Box gap={1} marginTop={1}>
              <Text color="red">Error:</Text>
              <Text dimColor>{error}</Text>
            </Box>
          )}
        </Box>

        {/* Input */}
        <Box marginTop={1} borderStyle="single" borderColor={theme.border} paddingX={1} gap={1}>
          <Text dimColor>You ›</Text>
          <Text wrap="wrap">{inputBuffer}</Text>
          <Text color={theme.accent} bold>▊</Text>
        </Box>
      </Panel>

      <FooterHelp
        hints={[
          { key: '↵', label: 'send' },
          { key: '/remember …', label: 'save memory' },
          { key: '/todo …', label: 'add todo' },
          { key: '/forget', label: 'clear memories' },
          { key: 'esc', label: 'back' },
        ]}
        borderColor={theme.border}
      />
    </Box>
  );
};
