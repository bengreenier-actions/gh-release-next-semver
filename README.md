# gh-release-next-semver

Github Action that gets the next valid GitHub release semver value.

```
v1.2.3 => 2.0.0
```

## YAML

```
- name: Get Next Semver
  id: next_semver
  uses: bengreenier-actions/gh-release-next-semver@master
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    use_tag_name: true
    strip_tag_prefix: "v"
    type: "major"
```

Will yield outputs:

- `next`: contains the next semver value (always with no prefix)

And can be further accessed in yaml with:

```
- name: Leverage output
  run: echo ${{ steps.next_semver.outputs.next }}
```

Where `next_semver` matches the `id` of the step that ran the command.

## License

MIT
