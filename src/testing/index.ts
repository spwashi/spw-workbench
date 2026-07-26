/**
 * Headless testing infrastructure for Spw workbench.
 *
 * - Node (no browser): capture-stdio, temp-workspace, cli-harness, runtime-harness
 * - jsdom: dom-css-harness (import from `./dom-css-harness` under vitest.dom)
 */

export {
  beginStdioCapture,
  withStdioCapture,
  type CapturedStdio,
  type StdioCaptureHandle,
} from './capture-stdio'

export {
  createTempWorkspace,
  withTempWorkspace,
  createMinimalConsumerLayout,
  type TempWorkspace,
  type CreateTempWorkspaceOptions,
} from './temp-workspace'

export {
  createRuntimeHarness,
  runtime,
  type RuntimeHarnessAssert,
} from './runtime-harness'

export {
  runHeadlessCli,
  runHeadlessCliIn,
  type HeadlessCliOptions,
  type HeadlessCliResult,
} from './cli-harness'

export {
  createDomCssFixture,
  type DomCssFixture,
  type DomCssFixtureOptions,
} from './dom-css-harness'
