import { createElement } from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';

const LoadingSpinner = ({ label = 'Loading', color = 'cyan' }) =>
  createElement(
    Text,
    { color },
    createElement(Spinner, { type: 'dots' }),
    ' ',
    label
  );

export default LoadingSpinner;
