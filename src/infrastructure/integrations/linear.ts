export interface LinearIssue {
  id: string;
  title: string;
  stateName: string;
  stateType: string;
  priority: number;
  url: string;
  teamName: string;
}

export interface LinearData {
  assignedIssues: LinearIssue[];
}

const LINEAR_API = 'https://api.linear.app/graphql';

const QUERY = `
  query {
    viewer {
      assignedIssues(
        filter: { state: { type: { nin: ["completed", "cancelled"] } } }
        first: 20
        orderBy: updatedAt
      ) {
        nodes {
          id title priority url
          state { name type }
          team { name }
        }
      }
    }
  }
`;

type LinearNode = {
  id: string;
  title: string;
  priority: number;
  url: string;
  state: { name: string; type: string };
  team: { name: string };
};

export async function fetchLinearData(apiKey: string): Promise<LinearData> {
  const res = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: QUERY }),
  });

  if (!res.ok) throw new Error(`Linear API error (${res.status})`);

  const data = (await res.json()) as {
    data?: { viewer?: { assignedIssues?: { nodes: LinearNode[] } } };
    errors?: Array<{ message: string }>;
  };

  if (data.errors?.length) {
    throw new Error(data.errors[0]?.message ?? 'Linear API error');
  }

  const nodes = data.data?.viewer?.assignedIssues?.nodes ?? [];

  return {
    assignedIssues: nodes.map((n) => ({
      id: n.id,
      title: n.title,
      stateName: n.state.name,
      stateType: n.state.type,
      priority: n.priority,
      url: n.url,
      teamName: n.team.name,
    })),
  };
}

export function priorityLabel(p: number): string {
  if (p === 0) return 'No priority';
  if (p === 1) return 'Urgent';
  if (p === 2) return 'High';
  if (p === 3) return 'Medium';
  return 'Low';
}
