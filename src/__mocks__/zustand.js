// Copied from https://github.com/pmndrs/zustand/wiki/Testing

import { act } from "react";
import { afterEach } from "vitest";

// a variable to hold reset functions for all stores declared in the app
const storeResetFns = new Set();

// TODO: this is quite inelegant and brittle, but lets tests directly
// access the stores and for example initialize their state.
export const stores = [];

// when creating a store, we get its initial state, create a reset function and add it in the set
export const _internalCreate = (actualCreate) => (createState) => {
  const store = actualCreate(createState);
  const initialState = store.getState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  stores.push(store);
  return store;
};

// Reset all stores after each test run
afterEach(() => {
  act(() => storeResetFns.forEach((resetFn) => resetFn()));
});
