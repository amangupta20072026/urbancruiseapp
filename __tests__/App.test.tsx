/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// Redux Persist is not under test here.
// Prevent persistStore() from starting its timeout/rehydration cycle.
jest.mock('redux-persist', () => {
  const actual = jest.requireActual('redux-persist');

  return {
    ...actual,

    persistStore: jest.fn(() => ({
      dispatch: jest.fn(),
      subscribe: jest.fn(() => () => {}),
      getState: jest.fn(() => ({
        registry: [],
        bootstrapped: true,
      })),

      pause: jest.fn(),
      persist: jest.fn(),
      purge: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

import App from '../App';

test('renders correctly', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});
