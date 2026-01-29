# Airtime Camera

Forked from `mmhmm-web`

### Development process

See our [pull request and code review documentation](CODE_REVIEW.md)

### Local Development

#### Quick start:

```sh
python3 -m http.server --directory teleport
```

Open browser to http://localhost:8000

#### Developer local development:

**Prep (for now you should only need to run this once):**
```sh
npm install
```

**Mac:**
```sh
npm start
```

**Windows:**
```sh
npm run win-start
```

Open browser to http://localhost:8000

Recommended Tools:
- [Eslint](https://eslint.org/docs/latest/use/getting-started):
  - spell check for your code
  - [Your text editor / IDE](https://eslint.org/docs/latest/use/integrations) has a version of eslint that you need to install if you would like to see in-editor errors/warnings
- [Node Version Manager (NVM)](https://github.com/nvm-sh/nvm):
  - [nvm](https://github.com/nvm-sh/nvm) has been introduced to the codebase so that eventually we all are running the same node version
  - [nvm](https://github.com/nvm-sh/nvm) can be installed following instructions [here](https://github.com/nvm-sh/nvm#installing-and-updating)
  - this is not required at this point, but it is useful to get everyone on the same page

#### Remote Testing

You will need to run an https server if you need test on a separate machine from the one your are serving from. To do this, please run the following:
```sh
npm install
npm run start:https
```

### Deployment

mmhmm for web is deployed to 3 environments: `development`, `alpha` and `production`:

- `development` is intended for development team testing. It builds from the `development` branch and deploys to `/talk/development`.
- `alpha` is intended as a stable environment for internal employee use of pre-release functionality. It builds from the `alpha` branch and deploys to `/talk/alpha`.
- `production` is for external use. It builds from the `production` branch and deploys to `/talk`.

In addition to these three long-lived environments, we often create temporary deployments while working on new featuress, for example `/pages` or `/tours`.

Continuous deployment is automated using [GitHub Actions](https://github.com/All-Turtles/mmhmm-web/actions). Every time a PR is merged to `alpha` or `production`, an Actions workflow builds the deployment and copies it to S3, where it is served by CloudFront. For `development` and feature-based deploys, the Actions run every time a commit is made to the corresponding branch, regardless of whether there is a PR.

It's easy to set up a new continuously-deployed branch by adding a new file to `.github/workflows`. Duplicate `development.yml` and change the `name`, `environment`, branch that it builds from, and S3 subdirectory that it deploys to. You'll also need to create a new [GitHub Environment](https://github.com/All-Turtles/mmhmm-web/settings/environments), or comment out the `environment` section of the configuration file.

### Linting

```sh
npm run lint
```

### Releases

Updates are released by merging to the appropriate branch. The continuous deployment process will then run to deploy the update.

Scheduled production and alpha releases typically occur on Thursday afternoons. Alpha is merged to production, then development is merged to alpha. This ensures that each update has a week of employee use in alpha before being released publicly.

Production releases are tagged and release notes are created using GitHub's [Releases](https://github.com/All-Turtles/mmhmm-web/releases) functionality. Once the software has been released, use the following steps to create the release notes:

1. Create the tag:
    * `git fetch`
    * `git tag -a prod-yyyy-mm-dd -m "Production release mm-dd-yyyy" commitHash`
    * `git push origin prod-yyyy-mm-dd`
2. Create the release notes:
    * Go to https://github.com/All-Turtles/mmhmm-web/tags
    * Click on the tag you just created
    * Click on "Create release from tag"
    * Name the release with the date, e.g. "March 7, 2023"
    * In the description, include a list of GitHub issues resolved in the release and a link to the PR that merged the release into the branch that was deployed.
    * Click "Publish Release"

### Hotfixes

When it's necessary to release a change outside of the usual release schedule, we create a hotfix.

1. Create a new branch using the naming scheme `hotfix/yyyymmdd`, branching from either `alpha` or `production` as needed. Commits to this branch will be automatically deployed to a preview build at https://app.airtimetools.com/talk/hotfix/yyyymmdd for testing.
2. When you're ready to release, create a PR to merge your hotfix to `alpha` or `production`.
3. After merging your PR, delete the `hotfix` branch. The preview build will be automatically deleted.
4. Once the hotfix has been released to production, create a git tag as described above, using a tag of the form `prod-hotfix-yyyy-mm-dd`.

### Localization

When displaying strings in the UI, use `LocalizedString` or `LocalizedStringFormat` to get a localized version of your English string.

When you add or modify an English string that's used in a call to `LocalizedString*`, you'll need to re-run `genstrings.js` to regenerate the English language strings file:

```sh
npm run localize
```

Then commit the updated English strings in `teleport/localizations/en-US`.

The first time you do this, you'll need to run `npm install``:

```sh
npm install
```

### Running/ Testing The Hybrid App Locally (MAC)

Confirm that the hybrid app is closed and run the following command in your terminal:

```sh
defaults write app.mmhmm.hybrid ShowCEFControls -bool true
```

Start your local development environment and open the hybrid app. An address bar should be present and you can use it navigate to `http://localhost:8000` and test the hybrid application locally.

**To access the hybrid apps developer tools:**

1. Launch the app with `--remote-debugging-port=9222 --user-data-dir=remote-profile` args
1. Open chrome and navigate to `chrome://inspect/#devices`
1. Launch the devtools.

_E.G. In your terminal run the following command:_
`/Applications/mmhmm\ desktop.app/Contents/MacOS/mmhmm --remote-debugging-port=9222 --user-data-dir=remote-profile`
