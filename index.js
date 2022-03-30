const core = require("@actions/core");
const { context, GitHub } = require("@actions/github");
const _ = require("lodash");

async function run() {
  try {
    const client = new GitHub(core.getInput("token", { required: true }));

    const base = context.payload.before;
    const head = context.payload.after;

    const compareResponse = await client.repos.compareCommits({
      base,
      head,
      owner: context.repo.owner,
      repo: context.repo.repo,
    });

    if (compareResponse.status !== 200) {
      core.setFailed(
        `The GitHub API for comparing the base and head commits for this ${context.eventName} event returned ${compareResponse.status}, expected 200. ` +
          "Please submit an issue on this action's GitHub repo."
      );
    }

    const commits = compareResponse.data.commits;

    const pullRequests = await Promise.all(
      commits.map(async (commit) => {
        core.info(`Handling commit ${commit.sha}...`);
        return (
          await client.repos.listPullRequestsAssociatedWithCommit({
            owner: context.repo.owner,
            repo: context.repo.repo,
            commit_sha: commit.sha,
          })
        ).data;
      })
    );

    const uniquePullRequests = _.uniqBy(
      _.flatten(pullRequests),
      (pr) => pr.number
    );

    const informationToReport = uniquePullRequests
      .filter((pr) => {
        core.info(`Filtering labels for PR ${pr.number}...`);
        core.info(JSON.stringify(pr.labels));

        return pr.labels.find(
          (label) => label.name === core.getInput("label", { required: true })
        );
      })
      .map((pr) => {
        core.info(`Filtering body for PR ${pr.number}...`);
        core.info(JSON.stringify(pr.body));

        // [some text](https://www.loom.com/share/2fb40c442cf8437c8a5bfd43e9a2e4b4)
        const loomLinks = [];
        for (let match of pr.body.matchAll(
          /\[.*\]\((https:\/\/www\.loom\.com.*)\)/g
        )) {
          let [_full, key] = match;
          loomLinks.push(key);
        }

        core.info("Found loom links...");
        core.info(JSON.stringify(loomLinks));

        const results = {
          authorLogin: pr.user.login,
          loomLinks,
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
