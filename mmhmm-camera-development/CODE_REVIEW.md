# mmhmm-web code review process

This document outlines how we use GitHub pull requests to ensure that all code goes through code review prior to being merged into our development environment.

## Creating a pull request

Do your work in a branch, generally created from `development`. When you're ready to merge your code back to `development`, create a pull request. If you want input from someone else but aren't ready to have your work merged yet, create a draft PR.

- Add at least two reviewers who you believe have the best understanding of the system / area of the code that you're changing.
- In the PR description, include:
   - A reference to the corresponding issue, e.g. `Resolves #1234`
   - A description of the functional change - what are we trying to achieve?
   - A description of the technical approach - how did you go about achieving the desired result? The more architectural change involved, the more detail you should add here.
   - Testing notes to help reviewers understand what needs to be tested.

Once you've created a PR, go through the review process yourself. GitHub won't let you approve your own PR, but it gives you a chance to take a fresh, comprehensive look at the work that you've done.

## Reviewing pull requests

When someone adds you as a reviewer on their pull request, try to provide your review in a timely manner. If you're too busy, let them know.

When reviewing, read the code for both correctness and style, adherence to our standard patterns, etc.

When applicable, check out and run the code. Use your judgement on whether this is necessary. When in doubt, try it.

When you're satisified with a PR, give it your approval.

## Merging pull requests

The creator of the PR is responsible for merging it to `development` once they have the necessary approvals. You should always get at least one approval; use your judgement on whether others are needed. If there's a clear subject matter expert for the area of the code you're changing, make sure you get their approval.

In general, don't merge changes late on Wednesday or prior to our releases on Thursday - this puts unnecessary pressure on QA to get all changes tested before release. There are obvious exceptions to this - if you're fixing a bug that needs to go into a relase, then by all means merge your fix.
