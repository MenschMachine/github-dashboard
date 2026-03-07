import { Octokit } from '@octokit/rest';
import picomatch from 'picomatch';

export async function fetchDashboardData(token, patterns) {
  const octokit = new Octokit({ auth: token });

  const orgs = [...new Set(patterns.map(p => p.split('/')[0]))];

  const allRepos = [];
  for (const org of orgs) {
    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org,
      per_page: 100,
    });
    allRepos.push(...repos);
  }

  const isMatch = picomatch(patterns);
  const matched = allRepos.filter(r => isMatch(r.full_name));

  const repoResults = await Promise.all(
    matched.map(async (repo) => {
      const { data } = await octokit.actions.listWorkflowRunsForRepo({
        owner: repo.owner.login,
        repo: repo.name,
        per_page: 20,
      });

      const workflow_runs = data.workflow_runs.map(run => ({
        run_id: run.id,
        name: run.name,
        conclusion: run.conclusion,
        status: run.status,
        created_at: run.created_at,
        html_url: run.html_url,
      }));

      return {
        name: repo.full_name,
        workflow_runs,
      };
    })
  );

  const totalRuns = repoResults.reduce((sum, r) => sum + r.workflow_runs.length, 0);

  return {
    updated_at: new Date().toISOString(),
    repository_count: repoResults.length,
    total_runs: totalRuns,
    repositories: repoResults,
  };
}
