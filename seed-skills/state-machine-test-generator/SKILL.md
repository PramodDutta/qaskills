---
name: State Machine Test Generator
description: Generate comprehensive test cases from state machine models covering all states, transitions, guard conditions, and invalid transition attempts for workflow-heavy features
version: 1.0.0
author: Pramod
license: MIT
tags: [state-machine, state-testing, transition-testing, workflow-testing, xstate, fsm, guard-conditions, state-coverage]
testingTypes: [unit, integration]
frameworks: [jest, vitest]
languages: [typescript, javascript, python, java]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# State Machine Test Generator Skill

You are an expert QA engineer specializing in state machine testing and workflow verification. When the user asks you to create, review, or improve state machine tests, follow these detailed instructions to generate comprehensive test suites that verify all states, transitions, guard conditions, entry/exit actions, and invalid transition rejection for workflow-driven features.

## Core Principles

1. **Model before testing** -- Before writing a single test, model the state machine explicitly. Define every state, every transition, every guard, and every action. A test suite without a model is guessing at coverage.
2. **All-states coverage is the minimum** -- Every defined state in the model must be reached by at least one test. If a state cannot be reached, either the model is wrong or the implementation has dead states.
3. **All-transitions coverage is the standard** -- Every defined transition must be exercised. Reaching all states through a single path leaves most transitions untested. Transition coverage requires multiple paths through the machine.
4. **Invalid transitions must be rejected** -- For every state, test that events not defined in that state are either ignored or produce an explicit error. Silent state corruption from invalid events is the most dangerous class of state machine bug.
5. **Guard conditions need boundary testing** -- Guards are predicates that conditionally allow or block transitions. Test the boundary where the guard flips from allowing to blocking. Guards that are always true or always false indicate a modeling error.
6. **Entry and exit actions are first-class behaviors** -- Actions triggered on entering or exiting a state are not side effects; they are required behaviors. Verify they execute in the correct order: exit old state, transition action, enter new state.
7. **Nested states inherit parent behaviors** -- In hierarchical state machines, child states must honor transitions defined at the parent level. Test that parent-level events are handled correctly from within nested child states.
8. **Parallel states are independent** -- In orthogonal (parallel) state machines, each region evolves independently. Test that an event affecting one region does not interfere with the state of another.
9. **Determinism is mandatory** -- For any given state and event pair, there must be exactly one valid transition (or none). Non-deterministic state machines are bugs. Test that no ambiguous transitions exist.
10. **State persistence and recovery** -- If the state machine is persisted (database, local storage), test that restoring a machine from persisted state resumes correctly without replaying the entire event history.

## Project Structure

```
tests/
  state-machines/
    models/
      order-machine.ts
      payment-machine.ts
      auth-machine.ts
      generic-machine.ts
    generators/
      test-path-generator.ts
      transition-table-generator.ts
      invalid-transition-generator.ts
    helpers/
      machine-test-runner.ts
      state-assertions.ts
      action-spy.ts
    tests/
      order-lifecycle.test.ts
      payment-flow.test.ts
      auth-flow.test.ts
      all-states-coverage.test.ts
      all-transitions-coverage.test.ts
      guard-conditions.test.ts
      invalid-transitions.test.ts
      nested-states.test.ts
      parallel-states.test.ts
      entry-exit-actions.test.ts
    coverage/
      state-coverage-reporter.ts
      transition-matrix.ts
    config/
      machine-test.config.ts
```

## State Machine Modeling

Before generating tests, define the machine model. This model is the single source of truth for all test generation.

### Order Lifecycle State Machine

```typescript
// order-machine.ts
import { createMachine, assign } from 'xstate';

interface OrderContext {
  orderId: string;
  items: Array<{ id: string; quantity: number; price: number }>;
  total: number;
  paymentId?: string;
  shippingId?: string;
  cancellationReason?: string;
  refundAmount?: number;
  retryCount: number;
}

type OrderEvent =
  | { type: 'ADD_ITEM'; item: { id: string; quantity: number; price: number } }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'SUBMIT' }
  | { type: 'PAYMENT_RECEIVED'; paymentId: string }
  | { type: 'PAYMENT_FAILED'; reason: string }
  | { type: 'RETRY_PAYMENT' }
  | { type: 'SHIP'; shippingId: string }
  | { type: 'DELIVER' }
  | { type: 'CANCEL'; reason: string }
  | { type: 'REQUEST_RETURN' }
  | { type: 'APPROVE_RETURN' }
  | { type: 'REJECT_RETURN' }
  | { type: 'REFUND_PROCESSED'; amount: number };

const orderMachine = createMachine({
  id: 'order',
  initial: 'draft',
  context: {
    orderId: '',
    items: [],
    total: 0,
    retryCount: 0,
  } as OrderContext,
  states: {
    draft: {
      on: {
        ADD_ITEM: {
          actions: assign({
            items: ({ context, event }) => [...context.items, event.item],
            total: ({ context, event }) => context.total + event.item.price * event.item.quantity,
          }),
        },
        REMOVE_ITEM: {
          actions: assign({
            items: ({ context, event }) => context.items.filter(i => i.id !== event.itemId),
            total: ({ context, event }) => {
              const item = context.items.find(i => i.id === event.itemId);
              return item ? context.total - item.price * item.quantity : context.total;
            },
          }),
        },
        SUBMIT: {
          target: 'pending_payment',
          guard: ({ context }) => context.items.length > 0,
        },
        CANCEL: 'cancelled',
      },
    },
    pending_payment: {
      on: {
        PAYMENT_RECEIVED: {
          target: 'confirmed',
          actions: assign({ paymentId: ({ event }) => event.paymentId }),
        },
        PAYMENT_FAILED: [
          {
            target: 'payment_retry',
            guard: ({ context }) => context.retryCount < 3,
          },
          {
            target: 'cancelled',
          },
        ],
        CANCEL: {
          target: 'cancelled',
          actions: assign({ cancellationReason: ({ event }) => event.reason }),
        },
      },
    },
    payment_retry: {
      entry: assign({ retryCount: ({ context }) => context.retryCount + 1 }),
      on: {
        RETRY_PAYMENT: 'pending_payment',
        CANCEL: 'cancelled',
      },
    },
    confirmed: {
      on: {
        SHIP: {
          target: 'shipped',
          actions: assign({ shippingId: ({ event }) => event.shippingId }),
        },
        CANCEL: {
          target: 'refunding',
          actions: assign({ cancellationReason: ({ event }) => event.reason }),
        },
      },
    },
    shipped: {
      on: {
        DELIVER: 'delivered',
      },
    },
    delivered: {
      on: {
        REQUEST_RETURN: 'return_requested',
      },
    },
    return_requested: {
      on: {
        APPROVE_RETURN: 'refunding',
        REJECT_RETURN: 'delivered',
      },
    },
    refunding: {
      on: {
        REFUND_PROCESSED: {
          target: 'refunded',
          actions: assign({ refundAmount: ({ event }) => event.amount }),
        },
      },
    },
    refunded: {
      type: 'final',
    },
    cancelled: {
      type: 'final',
    },
  },
});

// Export the machine definition for test generation
export { orderMachine, OrderContext, OrderEvent };
```

## Test Path Generation from State Graphs

Generating test paths systematically ensures coverage rather than relying on manual enumeration.

```typescript
// test-path-generator.ts
interface StateNode {
  name: string;
  transitions: Transition[];
  isFinal: boolean;
}

interface Transition {
  event: string;
  target: string;
  guard?: string;
  actions?: string[];
}

interface TestPath {
  name: string;
  steps: TestStep[];
  startState: string;
  endState: string;
  coversStates: string[];
  coversTransitions: string[];
}

interface TestStep {
  fromState: string;
  event: string;
  toState: string;
  guard?: string;
  expectedActions?: string[];
}

class TestPathGenerator {
  private stateGraph: Map<string, StateNode> = new Map();
  private allStates: Set<string> = new Set();
  private allTransitions: Set<string> = new Set();

  constructor(machineDefinition: any) {
    this.parseMachineDefinition(machineDefinition);
  }

  private parseMachineDefinition(definition: any): void {
    for (const [stateName, stateConfig] of Object.entries(definition.states)) {
      this.allStates.add(stateName);
      const transitions: Transition[] = [];

      if ((stateConfig as any).on) {
        for (const [event, target] of Object.entries((stateConfig as any).on)) {
          const targetState = typeof target === 'string' ? target : (target as any).target;
          if (targetState) {
            transitions.push({
              event,
              target: targetState,
              guard: typeof target === 'object' ? (target as any).guard?.toString() : undefined,
            });
            this.allTransitions.add(`${stateName}--${event}-->${targetState}`);
          }
        }
      }

      this.stateGraph.set(stateName, {
        name: stateName,
        transitions,
        isFinal: (stateConfig as any).type === 'final',
      });
    }
  }

  generateAllStatesCoverage(initialState: string): TestPath[] {
    const paths: TestPath[] = [];
    const uncoveredStates = new Set(this.allStates);

    // BFS to find shortest paths to each state
    const queue: Array<{ state: string; path: TestStep[] }> = [
      { state: initialState, path: [] },
    ];
    const visited = new Set<string>();

    while (queue.length > 0 && uncoveredStates.size > 0) {
      const { state, path } = queue.shift()!;

      if (visited.has(state)) continue;
      visited.add(state);

      if (uncoveredStates.has(state)) {
        uncoveredStates.delete(state);
        paths.push({
          name: `reach_${state}`,
          steps: [...path],
          startState: initialState,
          endState: state,
          coversStates: path.map(s => s.toState).concat(state),
          coversTransitions: path.map(s => `${s.fromState}--${s.event}-->${s.toState}`),
        });
      }

      const node = this.stateGraph.get(state);
      if (node && !node.isFinal) {
        for (const transition of node.transitions) {
          queue.push({
            state: transition.target,
            path: [...path, {
              fromState: state,
              event: transition.event,
              toState: transition.target,
              guard: transition.guard,
            }],
          });
        }
      }
    }

    return paths;
  }

  generateAllTransitionsCoverage(initialState: string): TestPath[] {
    const paths: TestPath[] = [];
    const uncoveredTransitions = new Set(this.allTransitions);

    // For each uncovered transition, find the shortest path that includes it
    for (const transition of uncoveredTransitions) {
      const [fromState, rest] = transition.split('-->');
      const [source, event] = fromState.split('--');

      // Find path from initial to the source state
      const pathToSource = this.findShortestPath(initialState, source);
      if (pathToSource) {
        const fullPath = [...pathToSource, {
          fromState: source,
          event,
          toState: rest,
        }];

        paths.push({
          name: `transition_${source}_${event}_${rest}`,
          steps: fullPath,
          startState: initialState,
          endState: rest,
          coversStates: fullPath.map(s => s.toState),
          coversTransitions: fullPath.map(s => `${s.fromState}--${s.event}-->${s.toState}`),
        });
      }
    }

    return paths;
  }

  generateInvalidTransitions(): Array<{ state: string; event: string }> {
    const invalidTransitions: Array<{ state: string; event: string }> = [];
    const allEvents = new Set<string>();

    // Collect all events from the machine
    for (const node of this.stateGraph.values()) {
      for (const t of node.transitions) {
        allEvents.add(t.event);
      }
    }

    // For each state, find events that are NOT valid
    for (const [stateName, node] of this.stateGraph) {
      if (node.isFinal) continue;
      const validEvents = new Set(node.transitions.map(t => t.event));
      for (const event of allEvents) {
        if (!validEvents.has(event)) {
          invalidTransitions.push({ state: stateName, event });
        }
      }
    }

    return invalidTransitions;
  }

  private findShortestPath(from: string, to: string): TestStep[] | null {
    if (from === to) return [];
    const queue: Array<{ state: string; path: TestStep[] }> = [
      { state: from, path: [] },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { state, path } = queue.shift()!;
      if (visited.has(state)) continue;
      visited.add(state);

      const node = this.stateGraph.get(state);
      if (!node) continue;

      for (const transition of node.transitions) {
        const newPath = [...path, {
          fromState: state,
          event: transition.event,
          toState: transition.target,
        }];

        if (transition.target === to) return newPath;
        queue.push({ state: transition.target, path: newPath });
      }
    }

    return null;
  }

  getCoverageReport(executedTransitions: Set<string>): {
    stateCoverage: number;
    transitionCoverage: number;
    uncoveredStates: string[];
    uncoveredTransitions: string[];
  } {
    const coveredStates = new Set<string>();
    for (const t of executedTransitions) {
      const parts = t.split('-->');
      const source = parts[0].split('--')[0];
      coveredStates.add(source);
      coveredStates.add(parts[1]);
    }

    return {
      stateCoverage: Math.round((coveredStates.size / this.allStates.size) * 100),
      transitionCoverage: Math.round((executedTransitions.size / this.allTransitions.size) * 100),
      uncoveredStates: [...this.allStates].filter(s => !coveredStates.has(s)),
      uncoveredTransitions: [...this.allTransitions].filter(t => !executedTransitions.has(t)),
    };
  }
}
```

## All-States and All-Transitions Coverage Testing

```typescript
// all-states-coverage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import { orderMachine } from '../models/order-machine';

describe('Order Machine -- All States Coverage', () => {
  it('should reach the draft state (initial)', () => {
    const actor = createActor(orderMachine).start();
    expect(actor.getSnapshot().value).toBe('draft');
    actor.stop();
  });

  it('should reach pending_payment from draft', () => {
    const actor = createActor(orderMachine, {
      input: { orderId: 'o1', items: [], total: 0, retryCount: 0 },
    }).start();

    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });

    expect(actor.getSnapshot().value).toBe('pending_payment');
    actor.stop();
  });

  it('should reach confirmed after payment', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'PAYMENT_RECEIVED', paymentId: 'pay_123' });

    expect(actor.getSnapshot().value).toBe('confirmed');
    actor.stop();
  });

  it('should reach payment_retry on payment failure', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'PAYMENT_FAILED', reason: 'insufficient_funds' });

    expect(actor.getSnapshot().value).toBe('payment_retry');
    actor.stop();
  });

  it('should reach shipped after confirmation', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'PAYMENT_RECEIVED', paymentId: 'pay_123' });
    actor.send({ type: 'SHIP', shippingId: 'ship_456' });

    expect(actor.getSnapshot().value).toBe('shipped');
    actor.stop();
  });

  it('should reach delivered after shipping', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'PAYMENT_RECEIVED', paymentId: 'pay_123' });
    actor.send({ type: 'SHIP', shippingId: 'ship_456' });
    actor.send({ type: 'DELIVER' });

    expect(actor.getSnapshot().value).toBe('delivered');
    actor.stop();
  });

  it('should reach return_requested from delivered', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'PAYMENT_RECEIVED', paymentId: 'pay_123' });
    actor.send({ type: 'SHIP', shippingId: 'ship_456' });
    actor.send({ type: 'DELIVER' });
    actor.send({ type: 'REQUEST_RETURN' });

    expect(actor.getSnapshot().value).toBe('return_requested');
    actor.stop();
  });

  it('should reach refunding from return approval', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'PAYMENT_RECEIVED', paymentId: 'pay_123' });
    actor.send({ type: 'SHIP', shippingId: 'ship_456' });
    actor.send({ type: 'DELIVER' });
    actor.send({ type: 'REQUEST_RETURN' });
    actor.send({ type: 'APPROVE_RETURN' });

    expect(actor.getSnapshot().value).toBe('refunding');
    actor.stop();
  });

  it('should reach refunded as final state', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'PAYMENT_RECEIVED', paymentId: 'pay_123' });
    actor.send({ type: 'SHIP', shippingId: 'ship_456' });
    actor.send({ type: 'DELIVER' });
    actor.send({ type: 'REQUEST_RETURN' });
    actor.send({ type: 'APPROVE_RETURN' });
    actor.send({ type: 'REFUND_PROCESSED', amount: 100 });

    expect(actor.getSnapshot().value).toBe('refunded');
    actor.stop();
  });

  it('should reach cancelled from draft', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'CANCEL', reason: 'changed mind' });

    expect(actor.getSnapshot().value).toBe('cancelled');
    actor.stop();
  });
});
```

## Guard Condition Testing

Guards are the gatekeepers of transitions. They must be tested at their boundaries.

```typescript
// guard-conditions.test.ts
describe('Order Machine -- Guard Conditions', () => {
  describe('SUBMIT guard: items.length > 0', () => {
    it('should block SUBMIT when cart is empty', () => {
      const actor = createActor(orderMachine).start();
      actor.send({ type: 'SUBMIT' });

      // Should remain in draft -- guard blocked the transition
      expect(actor.getSnapshot().value).toBe('draft');
      actor.stop();
    });

    it('should allow SUBMIT when cart has one item', () => {
      const actor = createActor(orderMachine).start();
      actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 50 } });
      actor.send({ type: 'SUBMIT' });

      expect(actor.getSnapshot().value).toBe('pending_payment');
      actor.stop();
    });

    it('should allow SUBMIT when cart has multiple items', () => {
      const actor = createActor(orderMachine).start();
      actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 50 } });
      actor.send({ type: 'ADD_ITEM', item: { id: 'i2', quantity: 2, price: 30 } });
      actor.send({ type: 'SUBMIT' });

      expect(actor.getSnapshot().value).toBe('pending_payment');
      expect(actor.getSnapshot().context.total).toBe(110);
      actor.stop();
    });

    it('should block SUBMIT after removing all items', () => {
      const actor = createActor(orderMachine).start();
      actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 50 } });
      actor.send({ type: 'REMOVE_ITEM', itemId: 'i1' });
      actor.send({ type: 'SUBMIT' });

      expect(actor.getSnapshot().value).toBe('draft');
      expect(actor.getSnapshot().context.items).toHaveLength(0);
      actor.stop();
    });
  });

  describe('PAYMENT_FAILED guard: retryCount < 3', () => {
    it('should allow retry on first failure', () => {
      const actor = createActor(orderMachine).start();
      actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
      actor.send({ type: 'SUBMIT' });
      actor.send({ type: 'PAYMENT_FAILED', reason: 'timeout' });

      expect(actor.getSnapshot().value).toBe('payment_retry');
      expect(actor.getSnapshot().context.retryCount).toBe(1);
      actor.stop();
    });

    it('should allow retry up to 3 times', () => {
      const actor = createActor(orderMachine).start();
      actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
      actor.send({ type: 'SUBMIT' });

      // First failure and retry
      actor.send({ type: 'PAYMENT_FAILED', reason: 'timeout' });
      actor.send({ type: 'RETRY_PAYMENT' });

      // Second failure and retry
      actor.send({ type: 'PAYMENT_FAILED', reason: 'timeout' });
      actor.send({ type: 'RETRY_PAYMENT' });

      // Third failure and retry
      actor.send({ type: 'PAYMENT_FAILED', reason: 'timeout' });
      expect(actor.getSnapshot().value).toBe('payment_retry');
      expect(actor.getSnapshot().context.retryCount).toBe(3);
      actor.stop();
    });

    it('should cancel order after exhausting retries', () => {
      const actor = createActor(orderMachine).start();
      actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
      actor.send({ type: 'SUBMIT' });

      // Exhaust all retries
      for (let i = 0; i < 3; i++) {
        actor.send({ type: 'PAYMENT_FAILED', reason: 'timeout' });
        if (i < 2) actor.send({ type: 'RETRY_PAYMENT' });
      }

      // Fourth failure should cancel
      actor.send({ type: 'RETRY_PAYMENT' });
      actor.send({ type: 'PAYMENT_FAILED', reason: 'final_failure' });

      expect(actor.getSnapshot().value).toBe('cancelled');
      actor.stop();
    });
  });
});
```

## Invalid Transition Testing

```typescript
// invalid-transitions.test.ts
describe('Order Machine -- Invalid Transitions', () => {
  it('should not allow SHIP from draft state', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'SHIP', shippingId: 'ship_1' });

    expect(actor.getSnapshot().value).toBe('draft');
    actor.stop();
  });

  it('should not allow DELIVER from pending_payment state', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'DELIVER' });

    expect(actor.getSnapshot().value).toBe('pending_payment');
    actor.stop();
  });

  it('should not allow PAYMENT_RECEIVED from confirmed state', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'PAYMENT_RECEIVED', paymentId: 'pay_1' });

    // Try to receive payment again
    actor.send({ type: 'PAYMENT_RECEIVED', paymentId: 'pay_2' });

    expect(actor.getSnapshot().value).toBe('confirmed');
    expect(actor.getSnapshot().context.paymentId).toBe('pay_1');
    actor.stop();
  });

  it('should not allow REQUEST_RETURN from shipped state', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'PAYMENT_RECEIVED', paymentId: 'pay_1' });
    actor.send({ type: 'SHIP', shippingId: 'ship_1' });
    actor.send({ type: 'REQUEST_RETURN' });

    expect(actor.getSnapshot().value).toBe('shipped');
    actor.stop();
  });

  it('should not process any events in final cancelled state', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'CANCEL', reason: 'test' });

    expect(actor.getSnapshot().value).toBe('cancelled');

    // Try every event type
    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'PAYMENT_RECEIVED', paymentId: 'pay_1' });
    actor.send({ type: 'SHIP', shippingId: 'ship_1' });

    expect(actor.getSnapshot().value).toBe('cancelled');
    actor.stop();
  });

  it('should not process events in final refunded state', () => {
    const actor = createActor(orderMachine).start();
    actor.send({ type: 'ADD_ITEM', item: { id: 'i1', quantity: 1, price: 100 } });
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'PAYMENT_RECEIVED', paymentId: 'pay_1' });
    actor.send({ type: 'SHIP', shippingId: 'ship_1' });
    actor.send({ type: 'DELIVER' });
    actor.send({ type: 'REQUEST_RETURN' });
    actor.send({ type: 'APPROVE_RETURN' });
    actor.send({ type: 'REFUND_PROCESSED', amount: 100 });

    expect(actor.getSnapshot().value).toBe('refunded');

    actor.send({ type: 'SHIP', shippingId: 'ship_2' });
    expect(actor.getSnapshot().value).toBe('refunded');
    actor.stop();
  });
});
```

## Entry/Exit Action Verification

```typescript
// entry-exit-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMachine, createActor } from 'xstate';

describe('Entry and Exit Actions', () => {
  const onEnterConfirmed = vi.fn();
  const onExitDraft = vi.fn();
  const onEnterShipped = vi.fn();
  const onExitShipped = vi.fn();
  const sendConfirmationEmail = vi.fn();
  const sendShippingNotification = vi.fn();

  const machineWithActions = createMachine({
    id: 'order-with-actions',
    initial: 'draft',
    context: { items: [] as string[] },
    states: {
      draft: {
        exit: () => onExitDraft(),
        on: {
          SUBMIT: 'confirmed',
        },
      },
      confirmed: {
        entry: [
          () => onEnterConfirmed(),
          () => sendConfirmationEmail(),
        ],
        on: {
          SHIP: 'shipped',
        },
      },
      shipped: {
        entry: [
          () => onEnterShipped(),
          () => sendShippingNotification(),
        ],
        exit: () => onExitShipped(),
        on: {
          DELIVER: 'delivered',
        },
      },
      delivered: {
        type: 'final',
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute exit action when leaving draft', () => {
    const actor = createActor(machineWithActions).start();
    actor.send({ type: 'SUBMIT' });

    expect(onExitDraft).toHaveBeenCalledTimes(1);
    actor.stop();
  });

  it('should execute entry actions when entering confirmed', () => {
    const actor = createActor(machineWithActions).start();
    actor.send({ type: 'SUBMIT' });

    expect(onEnterConfirmed).toHaveBeenCalledTimes(1);
    expect(sendConfirmationEmail).toHaveBeenCalledTimes(1);
    actor.stop();
  });

  it('should execute actions in order: exit old, enter new', () => {
    const callOrder: string[] = [];
    onExitDraft.mockImplementation(() => callOrder.push('exit_draft'));
    onEnterConfirmed.mockImplementation(() => callOrder.push('enter_confirmed'));

    const actor = createActor(machineWithActions).start();
    actor.send({ type: 'SUBMIT' });

    expect(callOrder).toEqual(['exit_draft', 'enter_confirmed']);
    actor.stop();
  });

  it('should execute exit and entry actions during transition through shipped', () => {
    const actor = createActor(machineWithActions).start();
    actor.send({ type: 'SUBMIT' });
    actor.send({ type: 'SHIP' });

    expect(onEnterShipped).toHaveBeenCalledTimes(1);
    expect(sendShippingNotification).toHaveBeenCalledTimes(1);

    actor.send({ type: 'DELIVER' });
    expect(onExitShipped).toHaveBeenCalledTimes(1);
    actor.stop();
  });

  it('should not execute entry actions if transition is blocked', () => {
    // If we send an invalid event, no actions should fire
    const actor = createActor(machineWithActions).start();
    actor.send({ type: 'SHIP' }); // Invalid from draft

    expect(onExitDraft).not.toHaveBeenCalled();
    expect(onEnterShipped).not.toHaveBeenCalled();
    actor.stop();
  });
});
```

## Payment Flow State Machine Example

```typescript
// payment-machine.ts
const paymentMachine = createMachine({
  id: 'payment',
  initial: 'idle',
  context: {
    amount: 0,
    currency: 'USD',
    attempts: 0,
    lastError: null as string | null,
    transactionId: null as string | null,
  },
  states: {
    idle: {
      on: {
        INITIATE: {
          target: 'processing',
          guard: ({ event }) => event.amount > 0,
          actions: assign({ amount: ({ event }) => event.amount }),
        },
      },
    },
    processing: {
      entry: assign({ attempts: ({ context }) => context.attempts + 1 }),
      on: {
        SUCCESS: {
          target: 'authorized',
          actions: assign({ transactionId: ({ event }) => event.transactionId }),
        },
        FAILURE: [
          { target: 'retrying', guard: ({ context }) => context.attempts < 3 },
          { target: 'failed' },
        ],
        TIMEOUT: [
          { target: 'retrying', guard: ({ context }) => context.attempts < 3 },
          { target: 'failed' },
        ],
      },
    },
    retrying: {
      after: {
        2000: 'processing', // Auto-retry after 2 seconds
      },
      on: {
        CANCEL: 'cancelled',
      },
    },
    authorized: {
      on: {
        CAPTURE: 'captured',
        VOID: 'voided',
      },
    },
    captured: {
      on: {
        REFUND: 'refunding',
      },
    },
    refunding: {
      on: {
        REFUND_COMPLETE: 'refunded',
        REFUND_FAILED: 'captured', // Back to captured if refund fails
      },
    },
    refunded: { type: 'final' },
    voided: { type: 'final' },
    failed: { type: 'final' },
    cancelled: { type: 'final' },
  },
});
```

## Configuration

```typescript
// machine-test.config.ts
interface StateMachineTestConfig {
  coverage: {
    requireAllStatesCoverage: boolean;
    requireAllTransitionsCoverage: boolean;
    minimumStateCoverage: number;       // percentage
    minimumTransitionCoverage: number;  // percentage
  };
  generation: {
    maxPathLength: number;
    maxPathsPerState: number;
    includeInvalidTransitions: boolean;
    includeGuardBoundaries: boolean;
  };
  reporting: {
    generateTransitionMatrix: boolean;
    generateStateDiagram: boolean;
    outputDirectory: string;
    format: 'json' | 'markdown' | 'html';
  };
  timeouts: {
    stateTransitionMs: number;
    asyncActionMs: number;
    delayedTransitionMs: number;
  };
}

const defaultConfig: StateMachineTestConfig = {
  coverage: {
    requireAllStatesCoverage: true,
    requireAllTransitionsCoverage: true,
    minimumStateCoverage: 100,
    minimumTransitionCoverage: 90,
  },
  generation: {
    maxPathLength: 20,
    maxPathsPerState: 5,
    includeInvalidTransitions: true,
    includeGuardBoundaries: true,
  },
  reporting: {
    generateTransitionMatrix: true,
    generateStateDiagram: false,
    outputDirectory: './test-artifacts/state-machine',
    format: 'markdown',
  },
  timeouts: {
    stateTransitionMs: 5000,
    asyncActionMs: 10000,
    delayedTransitionMs: 15000,
  },
};
```

## Best Practices

1. **Define the state machine model independently of the implementation** -- The model used for test generation should come from requirements, not from reading the code. Testing against the code's own model only verifies internal consistency, not correctness.

2. **Use a transition table for systematic coverage** -- Create a matrix with states as rows and events as columns. Each cell shows the expected target state or "invalid." This table is both documentation and a test generation input.

3. **Test every guard at its boundary** -- If a guard checks `retryCount < 3`, test with retryCount of 2 (should pass) and 3 (should fail). Boundary testing on guards catches off-by-one errors that cause the most subtle state machine bugs.

4. **Verify context mutations alongside state changes** -- A correct state transition with incorrect context is still a bug. Assert both the new state and the updated context after every transition.

5. **Test the complete happy path end-to-end** -- One test should walk the machine from initial state to a final state through the most common path. This verifies the machine works as a cohesive whole, not just in isolated transitions.

6. **Test all paths to final states** -- If the machine has multiple final states (completed, cancelled, failed), verify there is at least one test that reaches each final state.

7. **Use spies for action verification** -- Do not assert on side effects of actions (emails sent, database writes). Instead, spy on the action functions and verify they were called with the correct arguments.

8. **Test state persistence and restoration** -- If the machine state is persisted (Redux, database), test that a machine restored from persisted state behaves identically to one that arrived there through transitions.

9. **Generate tests from the model when possible** -- Use the TestPathGenerator pattern to automatically generate test paths from the model. Manual test enumeration misses paths that automated generation catches.

10. **Maintain the model as a living document** -- When requirements change, update the model first, regenerate tests, then update the implementation. The model is the contract between requirements and code.

11. **Test time-dependent transitions explicitly** -- If the machine uses delayed transitions (timeouts, debounces), test with fake timers to verify correct behavior without waiting for real time to pass.

12. **Verify no unhandled event warnings in production** -- In development, unhandled events should log warnings. In production, they should be silently ignored. Test both modes.

## Anti-Patterns to Avoid

1. **Testing only the happy path** -- A state machine that handles the happy path correctly but crashes on unexpected events is not production-ready. Test error paths, cancellation paths, and timeout paths with equal rigor.

2. **Coupling tests to implementation details** -- Do not assert on internal implementation details like XState internals, actor references, or internal event queues. Test the observable behavior: current state, context, and triggered actions.

3. **Ignoring dead states** -- A state that cannot be reached from the initial state is a dead state. If your coverage report shows an unreachable state, it is either a model error or a test gap. Investigate, do not ignore.

4. **Testing guards in isolation without state context** -- A guard function might work correctly when tested alone but fail when the context is modified by prior transitions. Always test guards within the full state machine context.

5. **Assuming events are processed synchronously** -- In asynchronous state machines, events may be queued, batched, or delayed. Do not assume that sending an event immediately changes the state. Use proper async assertions.

6. **Hardcoding transition sequences without documenting the path** -- A test that sends 8 events in sequence without comments is unmaintainable. Document what each event is testing and why the sequence matters.

7. **Skipping invalid transition tests because "the UI prevents it"** -- The UI is not the only entry point. API calls, WebSocket messages, and race conditions can trigger events from unexpected states. The state machine must be its own safety net.

## Debugging Tips

1. **State does not change after sending an event** -- Check for guard conditions blocking the transition. Log the guard evaluation result. The most common cause is a guard referencing stale context or using the wrong comparison operator.

2. **Wrong state after a sequence of events** -- Add logging to every transition to trace the actual path. Compare it against the expected path. The divergence point reveals which transition is misconfigured.

3. **Actions execute but produce incorrect results** -- Actions receive the context and event at the time of execution, not at the time of modeling. Verify that the context shape matches what the action expects by logging the full context object.

4. **Parallel states interfere with each other** -- This should not happen in a correctly modeled machine. If it does, check for shared context mutations between regions. Each parallel region should only modify its own slice of context.

5. **Tests pass individually but fail when run together** -- State machine actors must be created fresh for each test. If you are reusing an actor across tests, accumulated state from previous tests leaks into subsequent ones.

6. **Delayed transitions fire at wrong times** -- Use fake timers in tests. Real timers introduce flakiness. With fake timers, advance time explicitly and assert state changes at precise intervals.

7. **Model and implementation diverge after refactoring** -- Run the coverage reporter after every change. If any state or transition is uncovered, either the model or the implementation drifted. Reconcile them before merging.

8. **Guard conditions pass when they should block** -- Log the exact values being compared in the guard. Off-by-one errors (using `<=` instead of `<`) and type coercion issues (`"3" < 3` evaluating differently than expected) are the usual culprits.

9. **Entry actions fire multiple times** -- This happens when a self-transition is modeled (a state transitions to itself). Verify whether the self-transition should re-execute entry actions or not. In XState, external self-transitions re-execute entry/exit; internal transitions do not.

10. **Context is undefined in actions** -- Ensure the machine has a properly defined initial context. If using TypeScript, verify the context type matches the actual initial value. Missing context initialization is a common source of runtime errors in actions.