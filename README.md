# Pull Request Notifier Action

This action accepts a list of commit SHAs and attempts to find the PR associated with
each.  If those PRs are tagged with the specified label, it reports as outputs:

- The name of the PR
- A link to the PR
- Links to any Loom video(s) included in the PR body
- The name of the author

## Outputs

### `pull-request-information`

A list of objects containing information about PRs that should be reported

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