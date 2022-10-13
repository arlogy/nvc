# Documentation

## Source code

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

nvc depends on [jsu](https://github.com/arlogy/jsu) which is also built with
older browsers in mind and was originally part of the project. The version used
is 1.4.0.

## Examples

Please see the corresponding directory.

## Unit tests

Only the public API is tested, which excludes internal logic.
- Download and install Node.js
- `git clone <project_git_uri>`
- `cd <project_dir>/tests`
- `npm install`
- `npm run test` (run all tests)

The test dependencies are as follows.
- mocha for unit testing.
- sinon for spies, stubs and mocks.
- jsdom to imitate in a Node.js environment the behavior of a browser.
