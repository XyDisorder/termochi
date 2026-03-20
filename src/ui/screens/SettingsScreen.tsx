import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Theme } from '../../domain/theme/theme.types.js';
import { aiConfigStorage } from '../../infrastructure/storage/ai-config.js';
import type { AiProvider } from '../../infrastructure/storage/ai-config.js';
import { integrationsConfigStorage } from '../../infrastructure/storage/integrations-config.js';
import type { IntegrationsConfig } from '../../infrastructure/storage/integrations-config.js';
import { Panel } from '../components/Panel.js';
import { FooterHelp } from '../components/FooterHelp.js';

interface SettingsScreenProps {
  theme: Theme;
  onBack: () => void;
}

type Field = 'ai-provider' | 'ai-key' | 'github-token' | 'linear-key';

const FIELDS: Field[] = ['ai-provider', 'ai-key', 'github-token', 'linear-key'];

const FIELD_LABELS: Record<Field, string> = {
  'ai-provider': 'AI Provider',
  'ai-key': 'API Key',
  'github-token': 'GitHub Token',
  'linear-key': 'Linear API Key',
};

function maskKey(key: string): string {
  if (!key) return '(not set)';
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 6) + '••••••••' + key.slice(-4);
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ theme, onBack }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [inputBuffer, setInputBuffer] = useState('');
  const [saved, setSaved] = useState(false);

  // Current values
  const [aiProvider, setAiProvider] = useState<AiProvider>('claude');
  const [aiKey, setAiKey] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [linearKey, setLinearKey] = useState('');

  // Load on mount
  useEffect(() => {
    const ai = aiConfigStorage.read();
    if (ai) {
      setAiProvider(ai.provider);
      setAiKey(ai.apiKey);
    }
    const integrations = integrationsConfigStorage.read();
    if (integrations.github) setGithubToken(integrations.github.token);
    if (integrations.linear) setLinearKey(integrations.linear.apiKey);
  }, []);

  const selectedField = FIELDS[selectedIdx] ?? 'ai-provider';

  function saveAll(): void {
    if (aiKey.trim()) {
      aiConfigStorage.write({ provider: aiProvider, apiKey: aiKey.trim() });
    }
    const newIntegrations: IntegrationsConfig = {};
    if (githubToken.trim()) newIntegrations.github = { token: githubToken.trim() };
    if (linearKey.trim()) newIntegrations.linear = { apiKey: linearKey.trim() };
    integrationsConfigStorage.write(newIntegrations);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function commitEdit(): void {
    if (selectedField === 'ai-provider') {
      setAiProvider(aiProvider === 'claude' ? 'openai' : 'claude');
    } else if (selectedField === 'ai-key') {
      setAiKey(inputBuffer);
    } else if (selectedField === 'github-token') {
      setGithubToken(inputBuffer);
    } else if (selectedField === 'linear-key') {
      setLinearKey(inputBuffer);
    }
    setEditing(false);
    setInputBuffer('');
  }

  useInput((input, key) => {
    if (editing) {
      if (key.return) {
        commitEdit();
      } else if (key.escape) {
        setEditing(false);
        setInputBuffer('');
      } else if (key.backspace || key.delete) {
        setInputBuffer((b) => b.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        const printable = input.split('').filter((c) => {
          const code = c.charCodeAt(0);
          return code >= 32 && code < 127;
        }).join('');
        if (printable) setInputBuffer((b) => b + printable);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIdx((i) => Math.min(FIELDS.length - 1, i + 1));
    } else if (key.return || input === 'e') {
      if (selectedField === 'ai-provider') {
        setAiProvider((p) => (p === 'claude' ? 'openai' : 'claude'));
      } else {
        const current =
          selectedField === 'ai-key'
            ? aiKey
            : selectedField === 'github-token'
              ? githubToken
              : linearKey;
        setInputBuffer(current);
        setEditing(true);
      }
    } else if (input === 's') {
      saveAll();
    } else if (input === 'q' || key.escape) {
      onBack();
    }
  });

  function renderValue(field: Field): string {
    if (field === 'ai-provider') return aiProvider;
    if (field === 'ai-key') return maskKey(aiKey);
    if (field === 'github-token') return maskKey(githubToken);
    if (field === 'linear-key') return maskKey(linearKey);
    return '';
  }

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Panel title="Settings" borderColor={theme.accent}>
        {/* AI section */}
        <Box marginBottom={1}>
          <Text color={theme.primary} bold>AI Configuration</Text>
        </Box>

        {(['ai-provider', 'ai-key'] as Field[]).map((field) => {
          const isSelected = field === selectedField && !editing;
          const isEditingThis = field === selectedField && editing;
          return (
            <Box key={field} marginBottom={0} gap={2}>
              <Text {...(isSelected ? { color: theme.accent } : {})}>
                {isSelected ? '›' : ' '}
              </Text>
              <Text color={theme.primary} bold dimColor={!isSelected}>
                {FIELD_LABELS[field]}:
              </Text>
              {isEditingThis ? (
                <Box gap={0}>
                  <Text color={theme.accent}>{inputBuffer}</Text>
                  <Text color={theme.accent} bold>▊</Text>
                </Box>
              ) : (
                <Text>{renderValue(field)}</Text>
              )}
            </Box>
          );
        })}

        {/* GitHub section */}
        <Box marginTop={1} marginBottom={1}>
          <Text color={theme.primary} bold>GitHub Integration</Text>
        </Box>

        {(['github-token'] as Field[]).map((field) => {
          const isSelected = field === selectedField && !editing;
          const isEditingThis = field === selectedField && editing;
          return (
            <Box key={field} marginBottom={0} gap={2}>
              <Text {...(isSelected ? { color: theme.accent } : {})}>
                {isSelected ? '›' : ' '}
              </Text>
              <Text color={theme.primary} bold dimColor={!isSelected}>
                {FIELD_LABELS[field]}:
              </Text>
              {isEditingThis ? (
                <Box gap={0}>
                  <Text color={theme.accent}>{inputBuffer}</Text>
                  <Text color={theme.accent} bold>▊</Text>
                </Box>
              ) : (
                <Text>{renderValue(field)}</Text>
              )}
            </Box>
          );
        })}

        {/* Linear section */}
        <Box marginTop={1} marginBottom={1}>
          <Text color={theme.primary} bold>Linear Integration</Text>
        </Box>

        {(['linear-key'] as Field[]).map((field) => {
          const isSelected = field === selectedField && !editing;
          const isEditingThis = field === selectedField && editing;
          return (
            <Box key={field} marginBottom={0} gap={2}>
              <Text {...(isSelected ? { color: theme.accent } : {})}>
                {isSelected ? '›' : ' '}
              </Text>
              <Text color={theme.primary} bold dimColor={!isSelected}>
                {FIELD_LABELS[field]}:
              </Text>
              {isEditingThis ? (
                <Box gap={0}>
                  <Text color={theme.accent}>{inputBuffer}</Text>
                  <Text color={theme.accent} bold>▊</Text>
                </Box>
              ) : (
                <Text>{renderValue(field)}</Text>
              )}
            </Box>
          );
        })}

        {saved && (
          <Box marginTop={1}>
            <Text color="green" bold>✓ Settings saved</Text>
          </Box>
        )}

        {editing && (
          <Box marginTop={1}>
            <Text dimColor>
              {selectedField === 'ai-provider'
                ? 'Press ↵ to toggle'
                : 'Type to edit, ↵ to confirm, esc to cancel'}
            </Text>
          </Box>
        )}
      </Panel>

      <FooterHelp
        hints={
          editing
            ? [
                { key: '↵', label: 'confirm' },
                { key: 'esc', label: 'cancel' },
              ]
            : [
                { key: '↑↓', label: 'navigate' },
                { key: '↵', label: 'edit' },
                { key: 's', label: 'save' },
                { key: 'q/esc', label: 'back' },
              ]
        }
        borderColor={theme.border}
      />
    </Box>
  );
};
