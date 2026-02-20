/**
 * Assumption Registry Protocol (ARP-1.0) — comprehensive test suite
 */

import { AssumptionRegistry } from '../src/assumption-registry';
import type { AssumptionEntry } from '../src/types';

function register(
  reg: AssumptionRegistry,
  overrides: Partial<Parameters<AssumptionRegistry['register']>[0]> = {}
): AssumptionEntry {
  return reg.register({
    agent_id: 'agent-1',
    category: 'temporal',
    statement: 'This guideline is current as of 2026',
    basis: 'Published by NICE in January 2026',
    criticality: 'significant',
    confidence: 0.9,
    testable: true,
    test_method: 'Check NICE website for updates',
    domain: 'medical',
    expires_at: null,
    ...overrides,
  });
}

describe('AssumptionRegistry — Core', () => {
  test('creates registry with system ID', () => {
    const reg = new AssumptionRegistry('system-1');
    expect(reg.system_id).toBe('system-1');
    expect(reg.getAssumptions()).toHaveLength(0);
    expect(reg.verify().valid).toBe(true);
  });

  test('registers assumption with all fields', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    expect(a.id).toBeDefined();
    expect(a.timestamp).toBeDefined();
    expect(a.statement).toContain('2026');
    expect(a.test_method).toBe('Check NICE website for updates');
    expect(a.hash).toBeDefined();
    expect(a.dependent_decisions).toEqual([]);
  });

  test('hash chain maintained', () => {
    const reg = new AssumptionRegistry('system-1');
    const a1 = register(reg);
    const a2 = register(reg, { statement: 'Second assumption' });
    expect(a1.previous_hash).toBe('0');
    expect(a2.previous_hash).toBe(a1.hash);
    expect(reg.verify().valid).toBe(true);
  });

  test('status defaults to untested if testable, active if not', () => {
    const reg = new AssumptionRegistry('system-1');
    const a1 = register(reg, { testable: true });
    const a2 = register(reg, { testable: false });
    expect(a1.status).toBe('untested');
    expect(a2.status).toBe('active');
  });

  test('expired assumption detected by date', () => {
    const reg = new AssumptionRegistry('system-1');
    const past = new Date(Date.now() - 86400000).toISOString();
    register(reg, { expires_at: past });
    const expired = reg.getExpired();
    expect(expired.length).toBeGreaterThanOrEqual(1);
  });
});

describe('AssumptionRegistry — Lifecycle', () => {
  test('validate assumption updates status', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg, { testable: true });
    const result = reg.validate(a.id, {
      validated: true,
      method_used: 'NICE check',
      evidence: 'No updates',
    });
    expect(result.new_status).toBe('validated');
    expect(reg.getAssumptions({ status: 'validated' })).toHaveLength(1);
  });

  test('invalidate assumption with reason', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    reg.invalidate(a.id, 'Guideline superseded');
    const entry = reg.getAssumptions().find((x) => x.id === a.id);
    expect(entry?.status).toBe('invalidated');
    expect(entry?.invalidation_reason).toBe('Guideline superseded');
  });

  test('supersede creates new assumption and links', () => {
    const reg = new AssumptionRegistry('system-1');
    const old = register(reg);
    const created = reg.supersede(old.id, {
      agent_id: 'agent-1',
      category: 'temporal',
      statement: 'Updated guideline 2027',
      basis: 'NICE 2027',
      criticality: 'significant',
      confidence: 0.95,
      testable: true,
      test_method: 'Check NICE',
      domain: 'medical',
      expires_at: null,
    });
    expect(created.id).not.toBe(old.id);
    const oldEntry = reg.getAssumptions().find((x) => x.id === old.id);
    expect(oldEntry?.status).toBe('superseded');
    expect(oldEntry?.superseded_by).toBe(created.id);
  });

  test('cannot validate already invalidated assumption', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    reg.invalidate(a.id, 'Wrong');
    expect(() =>
      reg.validate(a.id, { validated: true, method_used: 'x', evidence: 'y' })
    ).toThrow();
  });

  test('expiry updates status', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    reg.expire(a.id);
    const entry = reg.getAssumptions().find((x) => x.id === a.id);
    expect(entry?.status).toBe('expired');
  });
});

describe('AssumptionRegistry — Dependencies', () => {
  test('add decision dependency', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    reg.addDependency(a.id, 'trace-1');
    reg.addDependency(a.id, 'trace-2');
    const map = reg.getDependencyMap(a.id);
    expect(map.dependent_decisions).toContain('trace-1');
    expect(map.dependent_decisions).toContain('trace-2');
  });

  test('add assumption dependency', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    const b = register(reg);
    reg.addAssumptionDependency(b.id, a.id);
    const mapA = reg.getDependencyMap(a.id);
    expect(mapA.dependent_assumptions).toContain(b.id);
  });

  test('dependency map calculates depth', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    const b = register(reg);
    const c = register(reg);
    reg.addAssumptionDependency(b.id, a.id);
    reg.addAssumptionDependency(c.id, b.id);
    const mapA = reg.getDependencyMap(a.id);
    expect(mapA.dependent_assumptions.length).toBeGreaterThanOrEqual(1);
    expect(mapA.cascade_depth).toBeGreaterThanOrEqual(1);
  });

  test('dependency map calculates total affected', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    reg.addDependency(a.id, 't1');
    reg.addDependency(a.id, 't2');
    const map = reg.getDependencyMap(a.id);
    expect(map.total_affected).toBeGreaterThanOrEqual(2);
  });
});

describe('AssumptionRegistry — Cascade', () => {
  test('simple cascade (1 assumption, 3 decisions)', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    reg.addDependency(a.id, 'd1');
    reg.addDependency(a.id, 'd2');
    reg.addDependency(a.id, 'd3');
    const report = reg.simulateCascade(a.id);
    expect(report.directly_affected_decisions).toHaveLength(3);
    expect(report.total_cascade_size).toBeGreaterThanOrEqual(3);
    expect(['contained', 'significant', 'systemic']).toContain(report.severity);
  });

  test('chain cascade (assumption A -> assumption B -> decisions)', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    const b = register(reg);
    reg.addAssumptionDependency(b.id, a.id);
    reg.addDependency(b.id, 'trace-b1');
    reg.addDependency(a.id, 'trace-a1');
    const report = reg.simulateCascade(a.id);
    expect(report.directly_affected_decisions).toContain('trace-a1');
    expect(report.affected_assumptions).toContain(b.id);
    expect(report.indirectly_affected_decisions).toContain('trace-b1');
  });

  test('systemic cascade detected (20+ affected)', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    for (let i = 0; i < 22; i++) reg.addDependency(a.id, `trace-${i}`);
    const report = reg.simulateCascade(a.id);
    expect(report.severity).toBe('systemic');
  });

  test('contained cascade classified correctly', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    reg.addDependency(a.id, 't1');
    reg.addDependency(a.id, 't2');
    const report = reg.simulateCascade(a.id);
    expect(report.severity).toBe('contained');
  });
});

describe('AssumptionRegistry — Health', () => {
  test('health counts by status', () => {
    const reg = new AssumptionRegistry('system-1');
    register(reg, { testable: true });
    register(reg, { testable: false });
    const h = reg.getHealth();
    expect(h.total_assumptions).toBe(2);
    expect(h.by_status.untested).toBe(1);
    expect(h.by_status.active).toBe(1);
  });

  test('health counts by criticality', () => {
    const reg = new AssumptionRegistry('system-1');
    register(reg, { criticality: 'foundational' });
    register(reg, { criticality: 'minor' });
    const h = reg.getHealth();
    expect(h.by_criticality.foundational).toBe(1);
    expect(h.by_criticality.minor).toBe(1);
  });

  test('untested foundational flagged as risk', () => {
    const reg = new AssumptionRegistry('system-1');
    register(reg, { testable: true, criticality: 'foundational' });
    const list = reg.getUntestedFoundational();
    expect(list).toHaveLength(1);
    expect(reg.getHealth().untested_foundational).toBe(1);
  });

  test('expired active flagged', () => {
    const reg = new AssumptionRegistry('system-1');
    const past = new Date(Date.now() - 1000).toISOString();
    register(reg, { testable: false, expires_at: past });
    const expired = reg.getExpired();
    expect(expired.length).toBeGreaterThanOrEqual(1);
  });
});

describe('AssumptionRegistry — Querying', () => {
  test('filter by category and status', () => {
    const reg = new AssumptionRegistry('system-1');
    register(reg, { category: 'temporal', testable: true });
    register(reg, { category: 'data_quality', testable: false });
    register(reg, { category: 'temporal', testable: false });
    expect(reg.getAssumptions({ category: 'temporal' })).toHaveLength(2);
    expect(reg.getAssumptions({ status: 'active' })).toHaveLength(2);
  });

  test('get assumptions by Clearpath trace ID', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    reg.addDependency(a.id, 'trace-x');
    const list = reg.getByDecision('trace-x');
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(a.id);
  });
});

describe('AssumptionRegistry — Export', () => {
  test('JSON roundtrip', () => {
    const reg = new AssumptionRegistry('system-1');
    const a = register(reg);
    reg.addDependency(a.id, 'trace-1');
    const b = register(reg);
    reg.addAssumptionDependency(b.id, a.id);
    const json = reg.toJSON();
    const restored = AssumptionRegistry.fromJSON(json);
    expect(restored.system_id).toBe(reg.system_id);
    expect(restored.getAssumptions()).toHaveLength(2);
    const mapA = restored.getDependencyMap(a.id);
    expect(mapA.dependent_decisions).toContain('trace-1');
    expect(mapA.dependent_assumptions).toContain(b.id);
    expect(restored.verify().valid).toBe(true);
  });

  test('Markdown includes vulnerability summary', () => {
    const reg = new AssumptionRegistry('system-1');
    register(reg);
    const md = reg.toMarkdown();
    expect(md).toContain('Assumption Registry');
    expect(md).toContain('vulnerabilities');
    expect(md).toContain('Health');
  });
});
