import { createElement } from 'react';
import { Box } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

const Header = () =>
  createElement(
    Box,
    { flexDirection: 'column', alignItems: 'center', marginBottom: 1 },
    createElement(
      Gradient,
      { name: 'cristal' },
      createElement(BigText, { text: 'NetScanner', font: 'simple' })
    )
  );

export default Header;
