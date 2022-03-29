# Pull Request Notifier Action

This action accepts a list of commit SHAs and attempts to find the PR associated with
each.  If those PRs are tagged with the specified label, it reports as outputs:

- The name of the PR
- A link to the PR
- Links to any Loom video(s) included in the PR body
- The name of the author

## Outputs

### `pull-request-information`

A list of objects of the form:

{
  authorLogin: string,
  loomLinks: [string],
  prLink: string,
  prTitle: string
}

## Example usage

```
- name: Examine PRs
  id: examine-prs
  uses: DistruApp/pull-request-notifier-action@v0.0.16
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