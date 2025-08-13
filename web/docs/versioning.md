# Automatic Versioning Guide

This project uses automatic versioning based on PR labels following semantic versioning principles.

## How It Works

When a PR is merged to the `main` branch, our GitHub Action automatically:
1. Checks the PR labels to determine the version bump type
2. Updates the version in `web/package.json`
3. Creates a Git tag for the new version
4. Generates a changelog entry
5. Creates a GitHub release

## Version Labels

Add one of these labels to your PR to control versioning:

### `version:major` 🔴
- **Use for**: Breaking changes that require users to update their usage
- **Examples**: 
  - Removing or renaming API endpoints
  - Changing database schema in incompatible ways
  - Removing or changing component props
- **Version change**: `1.2.3` → `2.0.0`

### `version:minor` 🟡  
- **Use for**: New features that are backward compatible
- **Examples**:
  - Adding new API endpoints
  - Adding new UI components
  - Adding new database fields (non-breaking)
  - New admin features
- **Version change**: `1.2.3` → `1.3.0`

### `version:patch` 🟢
- **Use for**: Bug fixes and small improvements
- **Examples**:
  - Fixing bugs
  - Performance improvements
  - UI/UX tweaks
  - Security patches
- **Version change**: `1.2.3` → `1.2.4`

### `version:skip` ⚪
- **Use for**: Changes that don't affect the application functionality
- **Examples**:
  - Documentation updates
  - Test additions/fixes
  - CI/CD changes
  - Code comments
- **Version change**: No change

## Default Behavior

- **No version label**: Defaults to `patch` bump (safest option)
- **Multiple version labels**: Uses the highest precedence (major > minor > patch)
- **Skip versioning**: Only when explicitly labeled with `version:skip`

## Best Practices

### For Developers
1. **Always add a version label** to your PR (don't rely on defaults)
2. **Consider the impact** of your changes on existing users
3. **Document breaking changes** clearly in the PR description
4. **Test thoroughly** before requesting review

### For Reviewers
1. **Verify the version label** matches the type of changes
2. **Suggest label changes** if the bump type seems incorrect
3. **Ensure breaking changes** are properly documented

## Examples

### Bug Fix PR
```
Title: Fix user profile update validation
Labels: version:patch
Result: 1.2.3 → 1.2.4
```

### New Feature PR
```
Title: Add volunteer achievement badges
Labels: version:minor
Result: 1.2.3 → 1.3.0
```

### Breaking Change PR
```
Title: Refactor authentication API endpoints
Labels: version:major
Result: 1.2.3 → 2.0.0
```

### Documentation Update
```
Title: Update README with deployment instructions
Labels: version:skip
Result: No version change
```

## Troubleshooting

### Version Bump Didn't Happen
- Check if the PR was merged to `main` branch
- Verify the PR labels were applied before merge
- Check the GitHub Actions workflow logs

### Wrong Version Bump
- The automatic bump cannot be undone easily
- Create a new PR with the correct version manually
- Contact maintainers for assistance

### Workflow Failed
- Check the GitHub Actions tab for error details
- Common issues:
  - Permission errors (contact admin)
  - Package.json syntax errors
  - Network connectivity issues

## Manual Override

If you need to manually set a specific version:
1. Update `web/package.json` version field
2. Create a PR with `version:skip` label
3. After merge, manually create a Git tag: `git tag v1.2.3`
4. Push the tag: `git push origin v1.2.3`

## Version History

All version changes are tracked in:
- Git tags (prefixed with `v`, e.g., `v1.2.3`)
- GitHub Releases with auto-generated changelogs
- `CHANGELOG.md` file (auto-generated)

## Support

For questions about versioning:
- Check existing issues in the repository
- Ask in team chat/discussions
- Contact project maintainers