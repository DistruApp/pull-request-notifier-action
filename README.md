# Pull Request Notifier Action

Runs on `push`. Finds the PRs behind the commits between the push's `before` and
`after`, looking them up in batches of 100 commits per GraphQL query. For PRs with
the specified label, it reports as outputs:

- The name of the PR
- A link to the PR
- Loom, PRD and Notion Ticket links included in the PR body
- The name of the author

## Outputs

### `pull-request-information`

A list of objects of the form:

```
{
  authorLogin: string,
  loomLinks: [string],
  notionLinks: [string],
  prdLinks: [string],
  prLink: string, // https://github.com/<owner>/<repo>/pull/<number>
  prTitle: string
}
```

## Example usage

```
- name: Examine PRs
  id: examine-prs
  uses: DistruApp/pull-request-notifier-action@v1.0.4
  with:
    label: reportme

- run: echo "${{ steps.examine-prs.outputs.pull-request-information }}"
```

For more info on how to use outputs: https://help.github.com/en/actions/reference/contexts-and-expression-syntax-for-github-actions#steps-context

## How to publish

Install `ncc` using homebrew.

Check in the results of `npm run package`.

Make an annotated tag. `git tag -a v1.0.0 -m v1.0.0`

Push it all up. `git push origin --tags`