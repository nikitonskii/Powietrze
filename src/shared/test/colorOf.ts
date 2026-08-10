import { StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

/**
 * Test-only helper: reads the flattened `color` style off a rendered
 * text node.
 *
 * NOTE: @testing-library/react-native v14 renders with the `test-renderer`
 * package (not `react-test-renderer`) — its queries (getByText, within(),
 * etc.) return `TestInstance` from `test-renderer`, which is the correct
 * type here even though it is not `react-test-renderer`'s `ReactTestInstance`.
 * `TestInstance.props` is typed `Record<string, any>` by that package itself
 * (loosely-typed by design, since props are arbitrary per host component),
 * so indexing into `.style` is implicitly `any` — no local cast needed.
 */
export function colorOf(node: TestInstance): string {
  return StyleSheet.flatten(node.props.style).color;
}
