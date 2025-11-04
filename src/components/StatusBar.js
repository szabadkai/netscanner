import { createElement } from 'react';
import { Box, Text } from 'ink';

const StatusBar = ({ message = 'Scanning...', hint = 'Press Ctrl+C to exit' }) =>
  createElement(
    Box,
    {
      borderStyle: 'round',
      borderColor: 'blue',
      paddingX: 1,
      paddingY: 0,
      marginTop: 1,
      justifyContent: 'space-between'
    },
    createElement(Text, { color: 'blueBright' }, message),
    createElement(Text, { color: 'gray' }, hint)
  );

export default StatusBar;
