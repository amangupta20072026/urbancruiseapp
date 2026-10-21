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

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    API_BASE_URL: 'https://api.example.test',
    SOCKET_URL: 'https://socket.example.test',
    IMAGE_BASE_URL: 'https://images.example.test',
    PDF_BASE_URL: 'https://pdf.example.test',
  },
}));

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
