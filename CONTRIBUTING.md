# Contributing

Thank you for helping improve the Bisibility TypeScript SDK.

## Where to File What

- Bug reports for this repository: use the issue tracker here.
- Feature specs, ideas, and anything product-wide: use the
  [bisibility hub](https://github.com/CorgiCorner/bisibility). Specs go
  through its feature spec form and are triaged together with the app.

## Development setup

1. Install the Node.js version from `.nvmrc` and npm 10.9.3.
2. Run `npm ci`.
3. Run `npm run check` before opening a pull request.

The SDK supports Node.js 18 and newer, while repository development and publishing use the exact
toolchain pinned by `.nvmrc` and `packageManager`.

## Pull requests

- Keep changes focused and add tests for behavior changes.
- Update the README and changelog when the public API or runtime behavior changes.
- Do not include credentials, private API responses, or customer data in fixtures.
- Use English for code, documentation, commit messages, and review discussion.

By contributing, you agree that your contribution is licensed under Apache-2.0.
