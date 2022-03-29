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

    core.info(JSON.stringify(compareResponse.data));
  
    const commits = compareResponse.data.commits;
  
    const pullRequests = await Promise.all(
      commits.map(async (commit) => {
        core.info("Handling commit...");
        core.info(JSON.stringify(commit));
        return await client.repos.listPullRequestsAssociatedWithCommit({
          owner: context.repo.owner,
          repo: context.repo.repo,
          commit: commit.tree.sha,
        }).data;
      })
    );
  
    const uniquePullRequests = _.uniqBy(pullRequests, (pr) => pr.number);
  
    const informationToReport = uniquePullRequests
      .filter((pr) =>
        pr.labels.find(
          (label) => label.name === core.getInput("label", { required: true })
        )
      )
      .map((pr) => {
        // [some text](https://www.loom.com/share/2fb40c442cf8437c8a5bfd43e9a2e4b4)
        // remove first match because we don't want the whole PR body, only the links
        const loomLinks = pr.body
          .match(/\[.*\]\((https:\/\/www.loom.com.*)\)/)
          .slice(1, -1);
  
        return {
          authorLogin: pr.user.login,
          loomLinks,
          prLink: pr.url,
          prTitle: pr.title,
        };
      });
  
    core.setOutput("pull-request-information", informationToReport);
  } catch (error) {
    core.setFailed(error.message);
  }  
}

run();