import { Octokit } from '@octokit/rest';
import picomatch from 'picomatch';

async function cachedFetch(key, ttlMs, fetchFn) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < ttlMs) {
        return data;
      }
    }
  } catch {
    // corrupted cache entry, ignore
  }
  const data = await fetchFn();
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // storage full — still return the data, just skip caching
  }
  return data;
}

export function clearCache() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('gh-cache-')) keys.push(key);
  }
  keys.forEach(k => localStorage.removeItem(k));
}

function mapRepository(repo) {
  return {
    full_name: repo.full_name,
    name: repo.name,
    owner: { login: repo.owner.login },
  };
}

function mapRepositoryData(repo, runsData, prsData) {
  return {
    name: repo.full_name,
    workflow_runs: runsData.workflow_runs.map(run => ({
      run_id: run.id,
      name: run.name,
      conclusion: run.conclusion,
      status: run.status,
      created_at: run.created_at,
      html_url: run.html_url,
    })),
    open_prs: prsData.map(pr => ({
      number: pr.number,
      title: pr.title,
      user: pr.user?.login,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      html_url: pr.html_url,
      draft: pr.draft,
      labels: pr.labels?.map(l => l.name) || [],
    })),
  };
}

export function createDashboardClient(token) {
  const octokit = new Octokit({ auth: token });

  return {
    async fetchMatchedRepositories(patterns, { reposTtl = 5 * 60 * 1000 } = {}) {
      const orgs = [...new Set(patterns.map(p => p.split('/')[0]))];

      const allRepos = [];
      for (const org of orgs) {
        const repos = await cachedFetch(`gh-cache-repos-${org}`, reposTtl, async () => {
          const raw = await octokit.paginate(octokit.repos.listForOrg, {
            org,
            per_page: 100,
          });
          return raw.map(mapRepository);
        });
        allRepos.push(...repos);
      }

      const isMatch = picomatch(patterns);
      return allRepos.filter(repo => isMatch(repo.full_name));
    },

    async fetchRepositoryData(repo, { runsTtl = 2 * 60 * 1000, prsTtl = 2 * 60 * 1000 } = {}) {
      const runsData = await cachedFetch(`gh-cache-runs-${repo.full_name}`, runsTtl, async () => {
        const { data } = await octokit.actions.listWorkflowRunsForRepo({
          owner: repo.owner.login,
          repo: repo.name,
          per_page: 20,
        });
        return data;
      });

      const prsData = await cachedFetch(`gh-cache-prs-${repo.full_name}`, prsTtl, async () => {
        const { data } = await octokit.pulls.list({
          owner: repo.owner.login,
          repo: repo.name,
          state: 'open',
          sort: 'updated',
          direction: 'desc',
          per_page: 10,
        });
        return data;
      });

      return mapRepositoryData(repo, runsData, prsData);
    },
  };
}
