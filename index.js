const core = require("@actions/core");
const { context, GitHub } = require("@actions/github");
const _ = require("lodash");

// GitHub's secondary rate limit rejects bursts of concurrent requests, so
// commits are looked up in a few sequential GraphQL queries, not one REST call
// each.
const COMMITS_PER_QUERY = 100;
const COMPARE_PAGE_SIZE = 100;

// Extracts URLs from markdown links whose label matches `label`, e.g.
// [Notion Ticket](https://www.notion.so/...) -> ["https://www.notion.so/..."].
// The PR template ships these as empty placeholders (e.g. `[PRD]()`), so we
// only capture links that actually point somewhere.
function extractLabeledLinks(body, label) {
  const links = [];
  const pattern = new RegExp(`\\[${label}\\]\\((https?:\\/\\/[^)\\s]+)\\)`, "gi");
  for (let match of (body || "").matchAll(pattern)) {
    let [_full, url] = match;
    links.push(url);
  }
  return links;
}

// Unpaginated, the compare API stops at 250 commits and drops the rest.
async function fetchCommitShas(client, owner, repo, base, head) {
  const shas = [];
  for (let page = 1; ; page++) {
    const { data } = await client.request(
      "GET /repos/{owner}/{repo}/compare/{base}...{head}",
      { owner, repo, base, head, page, per_page: COMPARE_PAGE_SIZE }
    );
    shas.push(...data.commits.map((commit) => commit.sha));

    if (
      data.commits.length < COMPARE_PAGE_SIZE ||
      shas.length >= data.total_commits
    ) {
      return shas;
    }
  }
}

async function fetchPullRequests(client, owner, repo, shas) {
  const pullRequests = [];
  for (const chunk of _.chunk(shas, COMMITS_PER_QUERY)) {
    core.info(`Looking up PRs for ${chunk.length} commits...`);

    const commitFields = chunk
      .map((sha, i) => `c${i}: object(oid: "${sha}") { ...pullRequests }`)
      .join("\n");
    const { repository } = await client.graphql(
      `query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) { ${commitFields} }
      }
      fragment pullRequests on Commit {
        associatedPullRequests(first: 10) {
          nodes {
            author { login }
            body
            labels(first: 100) { nodes { name } }
            number
            title
            url
          }
        }
      }`,
      { owner, repo }
    );

    for (const commit of Object.values(repository)) {
      if (commit) pullRequests.push(...commit.associatedPullRequests.nodes);
    }
  }
  return pullRequests;
}

async function run() {
  try {
    const client = new GitHub(core.getInput("token", { required: true }));
    const label = core.getInput("label", { required: true });
    const { owner, repo } = context.repo;

    const shas = await fetchCommitShas(
      client,
      owner,
      repo,
      context.payload.before,
      context.payload.after
    );
    core.info(`Found ${shas.length} commits`);

    const pullRequests = await fetchPullRequests(client, owner, repo, shas);
    const uniquePullRequests = _.uniqBy(pullRequests, (pr) => pr.number);

    const informationToReport = uniquePullRequests
      .filter((pr) => {
        core.info(`Filtering labels for PR ${pr.number}...`);
        core.info(JSON.stringify(pr.labels.nodes));

        return pr.labels.nodes.some(({ name }) => name === label);
      })
      .map((pr) => {
        core.info(`Filtering body for PR ${pr.number}...`);
        core.info(JSON.stringify(pr.body));

        const loomLinks = extractLabeledLinks(pr.body, "Loom");
        const prdLinks = extractLabeledLinks(pr.body, "PRD");
        const notionLinks = extractLabeledLinks(pr.body, "Notion Ticket");

        core.info("Found reportable links...");
        core.info(JSON.stringify({ loomLinks, notionLinks, prdLinks }));

        const results = {
          // Deleted accounts come back as a null author.
          authorLogin: pr.author?.login ?? "ghost",
          loomLinks,
          notionLinks,
          prdLinks,
          prLink: pr.url,
          prTitle: pr.title,
        };

        core.info("Reporting PR information...");
        core.info(JSON.stringify(results));

        return results;
      });

    core.setOutput(
      "pull-request-information",
      JSON.stringify(informationToReport)
    );
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
