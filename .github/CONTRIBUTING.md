How to contribute to Meteor's push package
==========================================

## Creating a pull request

1. Solve a small issue, bigger things might require discussions with the team
2. Help adding tests
3. We use semantic release, make to follow the guidelines


## Semantic release

Why? this allows better semantic versioning + release done by CI = safer faster
release

How:
We use `semantic-release` with a plugin called `semantic-release-meteor`

Howto:
The commit messages will determin version and what should go in the changelog

Commit message:
```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

Types: feat, fix or perf for changelog items
Use: docs, chore, style, refactor and test for non-changelog items

For more information:
* [@semantic-release/commit-analyzer](https://www.npmjs.com/package/@semantic-release/commit-analyzer)
* [AngularJS Commit Message Conventions](https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y/view)
