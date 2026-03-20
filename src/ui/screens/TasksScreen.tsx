import React, { useState, useEffect, useCallback } from 'react';
import { exec } from 'node:child_process';
import { Box, Text, useInput } from 'ink';
import type { Theme } from '../../domain/theme/theme.types.js';
import type { TaskStressLevel } from '../../domain/pet/pet.logic.js';
import { integrationsConfigStorage } from '../../infrastructure/storage/integrations-config.js';
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

export const TasksScreen: React.FC<TasksScreenProps> = ({ theme, onBack, onOpenSettings, onStress }) => {
  const integrations = integrationsConfigStorage.read();
  const hasGitHub = Boolean(integrations.github?.token);
  const hasLinear = Boolean(integrations.linear?.apiKey);
  const hasAny = hasGitHub || hasLinear;

  const tabs = [
    ...(hasGitHub ? ['github' as const] : []),
    ...(hasLinear ? ['linear' as const] : []),
  ];

  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [cursorGH, setCursorGH] = useState(0);
  const [cursorLinear, setCursorLinear] = useState(0);
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

  const activeTab = tabs[activeTabIdx] ?? 'github';

  const ghRows =
    github.status === 'ok' ? buildGHRows(github.data) : [];
  const linearRows =
    linear.status === 'ok' ? buildLinearRows(linear.data) : [];

  useInput((input, key) => {
    if (key.tab || input === '\t') {
      setActiveTabIdx((i) => (i + 1) % tabs.length);
      return;
    }
    // Number keys to jump to tab
    if (input === '1' && tabs.length >= 1) { setActiveTabIdx(0); return; }
    if (input === '2' && tabs.length >= 2) { setActiveTabIdx(1); return; }

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

  if (!hasAny) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Panel title="Tasks" borderColor={theme.accent}>
          <Text dimColor>No integrations configured.</Text>
          <Box marginTop={1}>
            <Text dimColor>Press </Text>
            <Text color={theme.accent} bold>[,]</Text>
            <Text dimColor> to open Settings and add your GitHub token or Linear API key.</Text>
          </Box>
        </Panel>
        <FooterHelp
          hints={[
            { key: ',', label: 'settings' },
            { key: 'q/esc', label: 'back' },
          ]}
          borderColor={theme.border}
        />
      </Box>
    );
  }

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
          const count =
            tab === 'github'
              ? totalGH !== null
                ? ` (${totalGH})`
                : ''
              : totalLinear !== null
                ? ` (${totalLinear})`
                : '';
          const label = tab === 'github' ? 'GitHub' : 'Linear';
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

      <Panel title={activeTab === 'github' ? 'GitHub' : 'Linear'} borderColor={theme.accent}>
        {activeTab === 'github' && <GitHubPane github={github} rows={ghRows} cursor={cursorGH} theme={theme} />}
        {activeTab === 'linear' && <LinearPane linear={linear} rows={linearRows} cursor={cursorLinear} theme={theme} />}
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
          { key: '↵', label: 'open' },
          ...(tabs.length > 1 ? [{ key: 'tab/1-2', label: 'switch' }] : []),
          { key: 'r', label: 'refresh' },
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
