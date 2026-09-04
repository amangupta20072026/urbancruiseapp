/**
 * SVG import stub. .svg files are usually loaded via
 * react-native-svg-transformer as React components. In tests we don't
 * run the transformer, so we swap them out for a lightweight
 * forwardRef component that accepts any props and renders nothing.
 *
 * Exposes BOTH a default and a named `ReactComponent` export to match
 * the two common transformer conventions.
 */
const React = require('react');

const SvgMock = React.forwardRef((props, ref) =>
  React.createElement('Svg', { ...props, ref }),
);
SvgMock.displayName = 'SvgMock';

module.exports = {
  __esModule: true,
  default: SvgMock,
  ReactComponent: SvgMock,
};