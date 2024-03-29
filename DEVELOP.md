# Development

## API

The source code is written with older browsers in mind, according to the
original project. It is divided into several files each containing its
respective documentation on functions and variables.
- `src/nvc.js` is the main script. It exposes the `Nvc` object which provides
core features such as drawing items on a canvas or controlling user interactions
with it.
- `src/nvc_fsm.js` provides optional FSM features for use with nvc. It extends
the `Nvc` object with new properties.
- `src/nvc_quick.js` is not required to leverage nvc features, but it is useful
for a quick start and also extends the `Nvc` object with new properties.
- As a result, the `Nvc` (public) API is the entry point for using nvc.

nvc depends on [jsu](https://github.com/arlogy/jsu) which is also built with
older browsers in mind and was formerly part of the project. The version used is
that of jsupack in `package*.json` files.

## Tests

The public API is tested, which excludes internal logic (mainly for `src/nvc.js`).
Sample codes are also tested where appropriate.

The test dependencies are as follows, each installed using `npm install <package> --save-dev`.
- mocha as a test framework (and Node.js' built-in assert module for assertions).
- sinon for spies, stubs and mocks.
- jsdom to imitate in a Node.js environment the behavior of a browser.

## CLI

```bash
git clone <project_git_uri>
cd <project_dir>
npm install
```

After `npm install`, the following commands can be considered, the most
important being labeled "key".
- `npm run build` **(key)**: runs all tests and generates HTML examples; this is
the command to use in GitLab CI/CD automation for example.
- `npm run clean`: deletes any automatically generated data.
- `npm run examples:html:update`: updates HTML examples with latest
dependencies.
- `npm run test`: runs all tests.
    - To run specific test scripts, for example when testing local changes to a
    file, replace `test` with one of the `test:...` entries from `package.json`.
