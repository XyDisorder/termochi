import React, { useState, useEffect, useCallback } from 'react';
import { exec } from 'node:child_process';
import { Box, Text, useInput } from 'ink';
import type { Theme } from '../../domain/theme/theme.types.js';
import type { TaskStressLevel } from '../../domain/pet/pet.logic.js';
import { integrationsConfigStorage } from '../../infrastructure/storage/integrations-config.js';
import { todoStorage } from '../../infrastructure/storage/todo-storage.js';
import type { CalendarEvent } from '../../infrastructure/integrations/calendar.js';
import type { TodoItem } from '../../infrastructure/storage/todo-storage.js';
import { fetchGitHubData } from '../../infrastructure/integrations/github.js';
import type { GitHubData, GitHubPR, GitHubIssue } from '../../infrastructure/integrations/github.js';
import { fetchLinearData, priorityLabel } from '../../infrastructure/integrations/linear.js';
import type { LinearData, LinearIssue } from '../../infrastructure/integrations/linear.js';
import { Panel } from '../components/Panel.js';
import { FooterHelp } from '../components/FooterHelp.js';

interface TasksScreenProps {
  theme: Theme;
  onBack: () => void;
  onOpenSettings: () => void;
  onStress?: (level: TaskStressLevel) => void;
  calendarEvents?: CalendarEvent[];
}

type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string };

// Flat list of navigable rows per tab
type GHRow =
  | { kind: 'header'; label: string }
  | { kind: 'pr'; pr: GitHubPR; tag: 'open' | 'review' }
  | { kind: 'issue'; issue: GitHubIssue };

type LinearRow =
  | { kind: 'header'; label: string }
  | { kind: 'issue'; issue: LinearIssue };

function buildGHRows(data: GitHubData): GHRow[] {
  const rows: GHRow[] = [];
  if (data.reviewRequested.length > 0) {
    rows.push({ kind: 'header', label: `Review Requested (${data.reviewRequested.length})` });
    data.reviewRequested.forEach((pr) => rows.push({ kind: 'pr', pr, tag: 'review' }));
  }
  if (data.openPRs.length > 0) {
    rows.push({ kind: 'header', label: `Open PRs (${data.openPRs.length})` });
    data.openPRs.forEach((pr) => rows.push({ kind: 'pr', pr, tag: 'open' }));
  }
  if (data.assignedIssues.length > 0) {
    rows.push({ kind: 'header', label: `Assigned Issues (${data.assignedIssues.length})` });
    data.assignedIssues.forEach((issue) => rows.push({ kind: 'issue', issue }));
  }
  return rows;
}

function buildLinearRows(data: LinearData): LinearRow[] {
  const rows: LinearRow[] = [];
  const inProgress = data.assignedIssues.filter(
    (i) => i.stateType === 'started' || i.stateName.toLowerCase().includes('progress')
  );
  const rest = data.assignedIssues.filter((i) => !inProgress.includes(i));

  if (inProgress.length > 0) {
    rows.push({ kind: 'header', label: `In Progress (${inProgress.length})` });
    inProgress.forEach((issue) => rows.push({ kind: 'issue', issue }));
  }
  if (rest.length > 0) {
    rows.push({ kind: 'header', label: `Backlog (${rest.length})` });
    rest.forEach((issue) => rows.push({ kind: 'issue', issue }));
  }
  return rows;
}

function getSelectedUrl(rows: GHRow[] | LinearRow[], cursor: number): string | null {
  const row = rows[cursor];
  if (!row || row.kind === 'header') return null;
  if ('pr' in row) return row.pr.url;
  if ('issue' in row) return row.issue.url;
  return null;
}

function openUrl(url: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' :
    process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

// Move cursor index skipping header rows
function moveIdx(rows: Array<{ kind: string }>, current: number, dir: 1 | -1): number {
  let next = current + dir;
  while (next >= 0 && next < rows.length && rows[next]?.kind === 'header') {
    next += dir;
  }
  if (next < 0 || next >= rows.length) return current;
  return next;
}

// Find first selectable index
function firstSelectable(rows: Array<{ kind: string }>): number {
  const idx = rows.findIndex((r) => r.kind !== 'header');
  return idx === -1 ? 0 : idx;
}

function computeStress(gh: LoadState<GitHubData>, lin: LoadState<LinearData>): TaskStressLevel {
  let score = 0;
  if (gh.status === 'ok') {
    if (gh.data.reviewRequested.length >= 5) score += 2;
    else if (gh.data.reviewRequested.length >= 2) score += 1;
  }
  if (lin.status === 'ok') {
    const urgent = lin.data.assignedIssues.filter((i) => i.priority === 1).length;
    if (urgent >= 3) score += 2;
    else if (urgent >= 1) score += 1;
  }
  if (score >= 3) return 'high';
  if (score >= 1) return 'low';
  return 'none';
}

export const TasksScreen: React.FC<TasksScreenProps> = ({ theme, onBack, onOpenSettings, onStress, calendarEvents }) => {
  const integrations = integrationsConfigStorage.read();
  const hasGitHub = Boolean(integrations.github?.token);
  const hasLinear = Boolean(integrations.linear?.apiKey);
  const hasCalendar = calendarEvents !== undefined;
  const hasAny = hasGitHub || hasLinear;

  const tabs = [
    ...(hasGitHub ? ['github' as const] : []),
    ...(hasLinear ? ['linear' as const] : []),
    ...(hasCalendar ? ['calendar' as const] : []),
    'todo' as const,
  ];

  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [cursorGH, setCursorGH] = useState(0);
  const [cursorLinear, setCursorLinear] = useState(0);
  const [cursorTodo, setCursorTodo] = useState(0);
  const [cursorCalendar, setCursorCalendar] = useState(0);
  const [todos, setTodos] = useState<TodoItem[]>(() => todoStorage.readAll());
  const [flash, setFlash] = useState<string | null>(null);

  const [github, setGitHub] = useState<LoadState<GitHubData>>({
    status: hasGitHub ? 'loading' : 'idle',
  });
  const [linear, setLinear] = useState<LoadState<LinearData>>({
    status: hasLinear ? 'loading' : 'idle',
  });

  const load = useCallback(() => {
    if (hasGitHub) {
      setGitHub({ status: 'loading' });
      fetchGitHubData(integrations.github!.token)
        .then((data) => {
          setGitHub({ status: 'ok', data });
          setCursorGH(firstSelectable(buildGHRows(data)));
        })
        .catch((err: unknown) =>
          setGitHub({
            status: 'error',
            message: String(err instanceof Error ? err.message : err),
          })
        );
    }
    if (hasLinear) {
      setLinear({ status: 'loading' });
      fetchLinearData(integrations.linear!.apiKey)
        .then((data) => {
          setLinear({ status: 'ok', data });
          setCursorLinear(firstSelectable(buildLinearRows(data)));
        })
        .catch((err: unknown) =>
          setLinear({
            status: 'error',
            message: String(err instanceof Error ? err.message : err),
          })
        );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // Fire onStress once when all configured sources have finished loading
  const stressFiredRef = React.useRef(false);
  useEffect(() => {
    if (stressFiredRef.current) return;
    const ghDone = !hasGitHub || github.status === 'ok' || github.status === 'error';
    const linDone = !hasLinear || linear.status === 'ok' || linear.status === 'error';
    if (ghDone && linDone) {
      stressFiredRef.current = true;
      onStress?.(computeStress(github, linear));
    }
  }, [github, linear]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeTab = tabs[activeTabIdx] ?? 'todo';

  const ghRows =
    github.status === 'ok' ? buildGHRows(github.data) : [];
  const linearRows =
    linear.status === 'ok' ? buildLinearRows(linear.data) : [];

  // Reload todos whenever switching to the todo tab
  const prevTabRef = React.useRef(activeTabIdx);
  useEffect(() => {
    if (prevTabRef.current !== activeTabIdx && tabs[activeTabIdx] === 'todo') {
      setTodos(todoStorage.readAll());
    }
    prevTabRef.current = activeTabIdx;
  }, [activeTabIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useInput((input, key) => {
    if (key.tab || input === '\t') {
      setActiveTabIdx((i) => (i + 1) % tabs.length);
      return;
    }
    // Number keys to jump to tab
    if (input === '1' && tabs.length >= 1) { setActiveTabIdx(0); return; }
    if (input === '2' && tabs.length >= 2) { setActiveTabIdx(1); return; }
    if (input === '3' && tabs.length >= 3) { setActiveTabIdx(2); return; }

    if (activeTab === 'calendar') {
      const events = calendarEvents ?? [];
      if (key.upArrow) {
        setCursorCalendar((c) => Math.max(0, c - 1));
      } else if (key.downArrow) {
        setCursorCalendar((c) => Math.min(events.length - 1, c + 1));
      } else if (key.return) {
        const event = events[cursorCalendar];
        if (event?.meetingUrl) {
          openUrl(event.meetingUrl);
          setFlash('Opening in browser...');
          setTimeout(() => setFlash(null), 2000);
        }
      } else if (input === 'q' || key.escape) {
        onBack();
      }
      return;
    }

    if (activeTab === 'todo') {
      if (key.upArrow) {
        setCursorTodo((c) => Math.max(0, c - 1));
      } else if (key.downArrow) {
        setCursorTodo((c) => Math.min(todos.length - 1, c + 1));
      } else if (input === ' ' || key.return) {
        const item = todos[cursorTodo];
        if (item) {
          todoStorage.toggle(item.id);
          setTodos(todoStorage.readAll());
        }
      } else if (input === 'd') {
        const item = todos[cursorTodo];
        if (item) {
          todoStorage.delete(item.id);
          const updated = todoStorage.readAll();
          setTodos(updated);
          setCursorTodo((c) => Math.min(c, Math.max(0, updated.length - 1)));
        }
      } else if (input === 'q' || key.escape) {
        onBack();
      }
      return;
    }

    if (key.return) {
      const url = activeTab === 'github'
        ? getSelectedUrl(ghRows, cursorGH)
        : getSelectedUrl(linearRows, cursorLinear);
      if (url) {
        openUrl(url);
        setFlash('Opening in browser...');
        setTimeout(() => setFlash(null), 2000);
      }
    } else if (key.upArrow) {
      if (activeTab === 'github') setCursorGH((c) => moveIdx(ghRows, c, -1));
      else setCursorLinear((c) => moveIdx(linearRows, c, -1));
    } else if (key.downArrow) {
      if (activeTab === 'github') setCursorGH((c) => moveIdx(ghRows, c, 1));
      else setCursorLinear((c) => moveIdx(linearRows, c, 1));
    } else if (input === 'r') {
      load();
    } else if (input === ',') {
      onOpenSettings();
    } else if (input === 'q' || key.escape) {
      onBack();
    }
  });

  const stalePRCount =
    github.status === 'ok'
      ? github.data.openPRs.filter((pr) => pr.openHours >= 48).length
      : 0;

  const totalGH =
    github.status === 'ok'
      ? github.data.openPRs.length +
        github.data.reviewRequested.length +
        github.data.assignedIssues.length
      : null;

  const totalLinear =
    linear.status === 'ok' ? linear.data.assignedIssues.length : null;

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Tab bar */}
      <Box gap={0} marginBottom={1}>
        {tabs.map((tab, i) => {
          const isActive = i === activeTabIdx;
          const pendingTodos = todos.filter((t) => !t.done).length;
          const count =
            tab === 'github'
              ? totalGH !== null ? ` (${totalGH})` : ''
              : tab === 'linear'
                ? totalLinear !== null ? ` (${totalLinear})` : ''
                : tab === 'calendar'
                  ? calendarEvents ? ` (${calendarEvents.length})` : ''
                  : todos.length > 0 ? ` (${pendingTodos}/${todos.length})` : '';
          const label = tab === 'github' ? 'GitHub' : tab === 'linear' ? 'Linear' : tab === 'calendar' ? 'Calendar' : 'Todo';
          const staleTag = tab === 'github' && stalePRCount > 0 ? ` ⚠${stalePRCount}` : '';
          return (
            <Box
              key={tab}
              borderStyle="single"
              borderColor={isActive ? (stalePRCount > 0 && tab === 'github' ? 'red' : theme.accent) : theme.border}
              paddingX={1}
              marginRight={1}
            >
              <Text {...(isActive ? { color: stalePRCount > 0 && tab === 'github' ? 'red' : theme.accent, bold: true } : {})}>
                [{i + 1}] {label}{count}{staleTag}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Panel
        title={activeTab === 'github' ? 'GitHub' : activeTab === 'linear' ? 'Linear' : activeTab === 'calendar' ? 'Calendar' : 'Todo'}
        borderColor={theme.accent}
      >
        {activeTab === 'github' && <GitHubPane github={github} rows={ghRows} cursor={cursorGH} theme={theme} />}
        {activeTab === 'linear' && <LinearPane linear={linear} rows={linearRows} cursor={cursorLinear} theme={theme} />}
        {activeTab === 'calendar' && <CalendarPane events={calendarEvents ?? []} cursor={cursorCalendar} theme={theme} />}
        {activeTab === 'todo' && <TodoPane todos={todos} cursor={cursorTodo} theme={theme} />}
      </Panel>

      {/* URL / flash status line */}
      {(() => {
        if (flash) {
          return (
            <Box paddingX={1} marginTop={0}>
              <Text color="green">✓ {flash}</Text>
            </Box>
          );
        }
        if (activeTab === 'todo' || activeTab === 'calendar') return null;
        const url = activeTab === 'github'
          ? getSelectedUrl(ghRows, cursorGH)
          : getSelectedUrl(linearRows, cursorLinear);
        if (url) {
          return (
            <Box paddingX={1} marginTop={0} gap={1}>
              <Text dimColor>↵</Text>
              <Text dimColor>{url}</Text>
            </Box>
          );
        }
        return null;
      })()}

      <FooterHelp
        hints={[
          { key: '↑↓', label: 'navigate' },
          ...(activeTab === 'todo'
            ? [{ key: 'space/↵', label: 'toggle' }, { key: 'd', label: 'delete' }]
            : [{ key: '↵', label: 'open' }]
          ),
          ...(tabs.length > 1 ? [{ key: `tab/1-${tabs.length}`, label: 'switch' }] : []),
          ...(activeTab !== 'todo' && activeTab !== 'calendar' ? [{ key: 'r', label: 'refresh' }] : []),
          { key: ',', label: 'settings' },
          { key: 'q/esc', label: 'back' },
        ]}
        borderColor={theme.border}
      />
    </Box>
  );
};

// ── GitHub pane ──────────────────────────────────────────────────────────────

const STALE_HOURS = 48; // 2 days

const GitHubPane: React.FC<{
  github: LoadState<GitHubData>;
  rows: GHRow[];
  cursor: number;
  theme: Theme;
}> = ({ github, rows, cursor, theme }) => {
  if (github.status === 'loading') return <Text dimColor>Loading...</Text>;
  if (github.status === 'error')
    return (
      <Box gap={1}>
        <Text color="red">Error:</Text>
        <Text dimColor>{github.message}</Text>
      </Box>
    );
  if (github.status !== 'ok') return null;

  const { data } = github;
  const stalePRs = data.openPRs.filter((pr) => pr.openHours >= STALE_HOURS);
  const totalItems = rows.filter((r) => r.kind !== 'header').length;

  return (
    <Box flexDirection="column">
      {/* Summary row */}
      <Box gap={2} marginBottom={1} flexWrap="wrap">
        <Box gap={1}>
          <Text dimColor>@{data.username}</Text>
        </Box>
        <Text dimColor>·</Text>
        <Box gap={1}>
          <Text color="green" bold>✓</Text>
          <Text color="green">{data.mergedPRs.length} merged</Text>
          <Text dimColor>(30d)</Text>
        </Box>
        <Text dimColor>·</Text>
        <Box gap={1}>
          <Text color={theme.primary} bold>●</Text>
          <Text color={theme.primary}>{data.openPRs.length} open</Text>
        </Box>
        {stalePRs.length > 0 && (
          <>
            <Text dimColor>·</Text>
            <Box gap={1}>
              <Text color="red" bold>⚠</Text>
              <Text color="red">
                {stalePRs.length} stuck &gt;2d
              </Text>
            </Box>
          </>
        )}
      </Box>

      {/* Stale alert banner */}
      {stalePRs.length > 0 && (
        <Box
          borderStyle="single"
          borderColor="red"
          paddingX={1}
          marginBottom={1}
          flexDirection="column"
        >
          <Text color="red" bold>⚠ PRs open for more than 2 days:</Text>
          {stalePRs.map((pr) => (
            <Box key={pr.number} gap={1} marginLeft={1}>
              <Text dimColor>›</Text>
              <Text color="red">#{pr.number}</Text>
              <Text>{pr.title}</Text>
              <Text dimColor>({Math.floor(pr.openHours / 24)}d open)</Text>
            </Box>
          ))}
        </Box>
      )}

      {totalItems === 0 ? (
        <Text dimColor>Nothing to do — all clear! ✨</Text>
      ) : (
        rows.map((row, i) => {
          if (row.kind === 'header') {
            return (
              <Box key={`h-${i}`} marginTop={i === 0 ? 0 : 1} marginBottom={0}>
                <Text color={theme.accent} bold>── {row.label}</Text>
              </Box>
            );
          }
          const isSelected = i === cursor;
          if (row.kind === 'pr') {
            return <PRRow key={`pr-${row.pr.number}-${row.tag}`} pr={row.pr} tag={row.tag} selected={isSelected} theme={theme} />;
          }
          return <IssueRow key={`iss-${row.issue.number}`} issue={row.issue} selected={isSelected} theme={theme} />;
        })
      )}
    </Box>
  );
};

const PRRow: React.FC<{
  pr: GitHubPR;
  tag: 'open' | 'review';
  selected: boolean;
  theme: Theme;
}> = ({ pr, tag, selected, theme }) => {
  const isStale = tag === 'open' && pr.openHours >= STALE_HOURS;
  const daysOpen = Math.floor(pr.openHours / 24);
  return (
    <Box flexDirection="column" marginLeft={2} marginTop={0}>
      <Box gap={1}>
        <Text {...(selected ? { color: theme.accent } : { dimColor: true })}>›</Text>
        {tag === 'review' && <Text color="yellow" bold>!</Text>}
        {isStale && <Text color="red" bold>⚠</Text>}
        {pr.draft && <Text dimColor>[draft]</Text>}
        <Text {...(selected ? { color: theme.primary, bold: true } : {})}>
          #{pr.number} {pr.title}
        </Text>
      </Box>
      <Box gap={2} marginLeft={3}>
        <Text dimColor>{pr.repository}</Text>
        {isStale && <Text color="red">{daysOpen}d open</Text>}
      </Box>
    </Box>
  );
};

const IssueRow: React.FC<{
  issue: GitHubIssue;
  selected: boolean;
  theme: Theme;
}> = ({ issue, selected, theme }) => (
  <Box flexDirection="column" marginLeft={2}>
    <Box gap={1}>
      <Text {...(selected ? { color: theme.accent } : { dimColor: true })}>›</Text>
      <Text {...(selected ? { color: theme.primary, bold: true } : {})}>
        #{issue.number} {issue.title}
      </Text>
    </Box>
    <Text dimColor>   {issue.repository}</Text>
  </Box>
);

// ── Calendar pane ─────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMinutesUntil(date: Date): string {
  const min = Math.round((date.getTime() - Date.now()) / 60_000);
  if (min <= 0) return 'NOW';
  if (min < 60) return `in ${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `in ${h}h${m}m` : `in ${h}h`;
}

const CalendarPane: React.FC<{
  events: CalendarEvent[];
  cursor: number;
  theme: Theme;
}> = ({ events, cursor, theme }) => {
  if (events.length === 0) {
    return <Text dimColor>No meetings today ✨</Text>;
  }
  const now = new Date();
  return (
    <Box flexDirection="column">
      {events.map((event, i) => {
        const isSelected = i === cursor;
        const isPast = event.endAt < now;
        const isNow = event.startAt <= now && event.endAt >= now;
        const minutesUntil = Math.round((event.startAt.getTime() - now.getTime()) / 60_000);
        const isSoon = minutesUntil > 0 && minutesUntil <= 15;
        return (
          <Box key={event.id} flexDirection="column" marginLeft={2} marginTop={i === 0 ? 0 : 0}>
            <Box gap={2}>
              <Text {...(isSelected ? { color: theme.accent } : { dimColor: true })}>›</Text>
              <Text {...(isPast ? { dimColor: true } : isNow ? { color: 'red', bold: true } : isSoon ? { color: 'yellow', bold: true } : {})}>
                {formatTime(event.startAt)}
              </Text>
              <Text {...(isSelected ? { color: theme.primary, bold: true } : isPast ? { dimColor: true } : {})}>
                {event.title}
              </Text>
              {event.meetingUrl && !isPast && (
                <Text dimColor>⬡</Text>
              )}
            </Box>
            <Box gap={2} marginLeft={3}>
              <Text dimColor>{formatTime(event.startAt)} → {formatTime(event.endAt)}</Text>
              {!isPast && (
                <Text {...(isNow ? { color: 'red', bold: true } : isSoon ? { color: 'yellow' } : { dimColor: true })}>
                  {isNow ? '● NOW' : formatMinutesUntil(event.startAt)}
                </Text>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

// ── Todo pane ─────────────────────────────────────────────────────────────────

const TodoPane: React.FC<{
  todos: TodoItem[];
  cursor: number;
  theme: Theme;
}> = ({ todos, cursor, theme }) => {
  if (todos.length === 0) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text dimColor>No todos yet.</Text>
        <Box gap={1}>
          <Text dimColor>Add one from chat with</Text>
          <Text color={theme.accent}>/todo &lt;text&gt;</Text>
        </Box>
      </Box>
    );
  }
  const pending = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  return (
    <Box flexDirection="column">
      {pending.map((item) => (
        <TodoRow key={item.id} item={item} selected={todos.indexOf(item) === cursor} theme={theme} />
      ))}
      {done.length > 0 && (
        <Box flexDirection="column" marginTop={pending.length > 0 ? 1 : 0}>
          <Text color={theme.accent} bold>── Done ({done.length})</Text>
          {done.map((item) => (
            <TodoRow key={item.id} item={item} selected={todos.indexOf(item) === cursor} theme={theme} />
          ))}
        </Box>
      )}
    </Box>
  );
};

const TodoRow: React.FC<{
  item: TodoItem;
  selected: boolean;
  theme: Theme;
}> = ({ item, selected, theme }) => (
  <Box gap={1} marginLeft={2}>
    <Text {...(selected ? { color: theme.accent } : { dimColor: true })}>›</Text>
    <Text {...(item.done ? { dimColor: true } : { color: theme.primary })}>
      {item.done ? '[x]' : '[ ]'}
    </Text>
    <Text {...(selected ? { color: theme.primary, bold: true } : item.done ? { dimColor: true } : {})}>
      {item.text}
    </Text>
  </Box>
);

// ── Linear pane ──────────────────────────────────────────────────────────────

const LinearPane: React.FC<{
  linear: LoadState<LinearData>;
  rows: LinearRow[];
  cursor: number;
  theme: Theme;
}> = ({ linear, rows, cursor, theme }) => {
  if (linear.status === 'loading') return <Text dimColor>Loading...</Text>;
  if (linear.status === 'error')
    return (
      <Box gap={1}>
        <Text color="red">Error:</Text>
        <Text dimColor>{linear.message}</Text>
      </Box>
    );
  if (linear.status !== 'ok') return null;

  const totalItems = rows.filter((r) => r.kind !== 'header').length;
  if (totalItems === 0)
    return <Text dimColor>Nothing assigned — enjoy the peace! ✨</Text>;

  return (
    <Box flexDirection="column">
      {rows.map((row, i) => {
        if (row.kind === 'header') {
          return (
            <Box key={`h-${i}`} marginTop={i === 0 ? 0 : 1} marginBottom={0}>
              <Text color={theme.accent} bold>── {row.label}</Text>
            </Box>
          );
        }
        const isSelected = i === cursor;
        const issue = row.issue;
        const inProgress =
          issue.stateType === 'started' || issue.stateName.toLowerCase().includes('progress');
        return (
          <Box key={issue.id} flexDirection="column" marginLeft={2} marginTop={0}>
            <Box gap={1}>
              <Text {...(isSelected ? { color: theme.accent } : { dimColor: true })}>›</Text>
              <Text {...(inProgress ? { color: theme.accent } : { dimColor: true })}>
                [{issue.stateName}]
              </Text>
              <Text {...(isSelected ? { color: theme.primary, bold: true } : {})}>
                {issue.title}
              </Text>
            </Box>
            <Text dimColor>   {issue.teamName} · {priorityLabel(issue.priority)}</Text>
          </Box>
        );
      })}
    </Box>
  );
};
