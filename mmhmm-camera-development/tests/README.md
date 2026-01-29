# mmhmm Web App Tests
## Setting up environment
If you are running playwright for the first time on your machine, run following command to install playwright
```sh
npx playwright install
```

```sh
npm install
```

## Running the tests
```sh
npx playwright test
```
## Debug the tests
```sh
npx playwright test --debug
```
Alternatively you can use Visual Studio plugin to debug the tests.

# Code organization
```bash
├── README.md
├── package-lock.json
├── package.json
├── playwright-report
│   └── index.html
├── playwright.config.js
├── test-results
└── tests
    ├── README.md
    └── recordings
        ├── components.html
        └── integration
            └── datapipe.spec.js
```
# Test writing Guidelines
Because these tests are unit tests and integration tests, there is no strict guideline or a framework that can be built to save the developer's efforts. Nonetheless, some basic helper routines and fixtures have been provided that can replace the repetitive code.
- *tests* directory contains all the tests. It is loosely organized based on logical components of the malk code. e.g all the tests for the recording code present in `~/teleport/recordings` directory are in `~/tests/recordings`. Integration tests should go in `~/tests/\<component\>/integration` directory and unit tests should go in  `~/tests/\<component\>/unit` directory. All the files needed to run the tests should be kept at `~/tests/\<component\>` level.
- `tests/fixtures/test_fixture.js` provides a fixture for test. To use this fixture, import the `test` from this module instead of the playwright. e.g `import { test } from "../../fixtures/test_fixture";`. This fixture loads the web-application by loading teleport/index.html.
- It is recommended that the developer names the test in following pattern *[INTEG|UNIT]_<LOGICAL_MODULE_NAME>_<SEQUENCE_NUMBER>: <DESCRIPTION>*. E.g A first integration test for image brigde could be named as `INTEG_IMAGEBRIDGE_1: Check that media record from cloudy results in correct creation of image bridge`. Test fixture then prints the part before `:` as test id. i.e `INTEG_IMAGEBRIDGE_1`.
- `tests/test-utils/logger.js` contains logger control. User can enable/disable the printing of application's console logs using this class. This can be used for debugging purposes. Enable logging by calling `TestLogger.getInstance().enableLogging();`. To disable it, call `TestLogger.getInstance().disableLogging`. By default the logging is disabled.
- Module specific code that is used by multiple tests should be written in a file that is located at the root level of the module folder. `tests/bridges/utils.js` contains all the common code used by the multiple tests. Function `setupTest` calls `evaluateHandle` to set up things on the page, required for the test and then returns the handle containing promise.`INTEG_IMAGEBRIDGE_1` uses this handle, customizes test specific things in the context of the page, creates the required classes for the test and executes the test code.

# Github actions
- Github action for running the tests is written in `.github/workflows/unittests.yml`. `package.json` defines module specific run targets to run the tests for a module.
- Unittest action is executed when there is merge in malk's development, alpha or production branch, or on push to preview branch.
- Test report is uploaded as an artifact upon failure.