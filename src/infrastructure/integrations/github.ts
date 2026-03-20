export interface GitHubPR {
  number: number;
  title: string;
  repository: string;
  url: string;
  draft: boolean;
  staleHours: number;  // hours since last update
  openHours: number;   // hours since PR was created
}

export interface GitHubIssue {
  number: number;
  title: string;
  repository: string;
  url: string;
}

export interface GitHubData {
  username: string;
  openPRs: GitHubPR[];
  reviewRequested: GitHubPR[];
  assignedIssues: GitHubIssue[];
  mergedPRs: GitHubPR[];  // merged in the last 30 days
}

function repoFromUrl(repositoryUrl: string): string {
  const parts = repositoryUrl.split('/');
  return `${parts[parts.length - 2] ?? ''}/${parts[parts.length - 1] ?? ''}`;
}

type SearchItem = {
  number: number;
  title: string;
  repository_url: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  pull_request?: { draft?: boolean };
};

const toHoursAgo = (iso: string): number =>
  (Date.now() - new Date(iso).getTime()) / 3_600_000;

function toPR(item: SearchItem): GitHubPR {
  return {
    number: item.number,
    title: item.title,
    repository: repoFromUrl(item.repository_url),
    url: item.html_url,
    draft: item.pull_request?.draft ?? false,
    staleHours: toHoursAgo(item.updated_at),
    openHours: toHoursAgo(item.created_at),
  };
}

export async function fetchGitHubData(token: string): Promise<GitHubData> {
  const headers: Record<string, string> = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'termochi',
  };

  const userRes = await fetch('https://api.github.com/user', { headers });
  if (!userRes.ok) throw new Error(`GitHub auth failed (${userRes.status})`);
  const user = (await userRes.json()) as { login: string };
  const username = user.login;

  const since30d = new Date(Date.now() - 30 * 24 * 3_600_000)
    .toISOString()
    .split('T')[0]!;

  const [prsRes, reviewRes, issuesRes, mergedRes] = await Promise.all([
    fetch(
      `https://api.github.com/search/issues?q=is:pr+author:${username}+state:open&sort=updated&per_page=20`,
      { headers }
    ),
    fetch(
      `https://api.github.com/search/issues?q=is:pr+review-requested:${username}+state:open&sort=updated&per_page=20`,
      { headers }
    ),
    fetch(
      `https://api.github.com/search/issues?q=is:issue+assignee:${username}+state:open&sort=updated&per_page=20`,
      { headers }
    ),
    fetch(
      `https://api.github.com/search/issues?q=is:pr+author:${username}+is:merged+merged:>${since30d}&sort=updated&per_page=20`,
      { headers }
    ),
  ]);

  const [prsData, reviewData, issuesData, mergedData] = (await Promise.all([
    prsRes.json(),
    reviewRes.json(),
    issuesRes.json(),
    mergedRes.json(),
  ])) as [
    { items: SearchItem[] },
    { items: SearchItem[] },
    { items: SearchItem[] },
    { items: SearchItem[] },
  ];

  return {
    username,
    openPRs: (prsData.items ?? []).map(toPR),
    reviewRequested: (reviewData.items ?? []).map(toPR),
    assignedIssues: (issuesData.items ?? []).map((item) => ({
      number: item.number,
      title: item.title,
      repository: repoFromUrl(item.repository_url),
      url: item.html_url,
    })),
    mergedPRs: (mergedData.items ?? []).map(toPR),
  };
}
