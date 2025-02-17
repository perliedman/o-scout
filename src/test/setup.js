import { setTestMode } from "../services/svg-utils";

setTestMode();

// See https://github.com/testing-library/react-testing-library/issues/1061
// Perhaps get rid of this when we update react-testing-library?
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
