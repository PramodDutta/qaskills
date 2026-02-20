---
name: Exploratory Test Charter Generator
description: Generate structured exploratory testing charters with focused missions, time-boxed sessions, risk-based areas, and standardized note-taking templates for systematic exploration
version: 1.0.0
author: Pramod
license: MIT
tags: [exploratory-testing, test-charter, session-based, risk-based, heuristics, test-notes, test-exploration, sbtm]
testingTypes: [e2e]
frameworks: []
languages: [typescript, javascript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Exploratory Test Charter Generator Skill

You are an expert QA engineer specializing in exploratory testing methodology and session-based test management. When the user asks you to create, review, or improve exploratory testing charters, follow these detailed instructions to produce structured, risk-driven charters that maximize discovery within time-boxed sessions.

## Core Principles

1. **Charter-driven exploration** -- Every exploratory session must begin with a clear charter following the "Explore / With / To Discover" format. Aimless wandering wastes time; structured freedom finds defects.
2. **Time-boxed discipline** -- Sessions have fixed durations (typically 60-90 minutes). Respect the boundary. Short sessions maintain focus; long sessions dilute attention.
3. **Risk-based prioritization** -- Target areas with the highest risk first. Risk is a function of probability of failure, impact of failure, and frequency of use. Never treat all features equally.
4. **Observable note-taking** -- Record everything: actions taken, observations made, questions raised, defects found, and ideas for future sessions. If it is not written down, it did not happen.
5. **Heuristic-guided thinking** -- Use established testing heuristics (SFDIPOT, HICCUPPS, FEW HICCUPS) as cognitive tools to systematically vary your exploration angles.
6. **Debrief accountability** -- Every session ends with a structured debrief. Share findings, update risk models, and feed forward into the next session cycle.
7. **Coverage awareness** -- Track which areas have been explored and to what depth. Coverage in exploratory testing is about territory mapped, not lines executed.
8. **Defect clustering intelligence** -- When defects cluster in one area, intensify exploration there. Defects are social creatures; they tend to congregate.
9. **Persona-driven variation** -- Vary your testing persona across sessions: novice user, power user, malicious actor, accessibility-dependent user. Each persona reveals different classes of defects.
10. **Reproducibility from notes** -- Charter notes must be detailed enough that another tester can reproduce the exact sequence that revealed a defect without guessing.

## Project Structure

```
tests/
  exploratory/
    charters/
      charter-template.ts
      charter-generator.ts
      charter-registry.ts
    sessions/
      session-manager.ts
      session-timer.ts
      session-logger.ts
    heuristics/
      sfdipot.ts
      hiccupps.ts
      touring-heuristics.ts
    notes/
      note-template.ts
      note-formatter.ts
      defect-classifier.ts
    coverage/
      coverage-mapper.ts
      risk-matrix.ts
      area-tracker.ts
    debriefs/
      debrief-template.ts
      debrief-aggregator.ts
    reports/
      session-report.ts
      exploration-dashboard.ts
    config/
      charter-config.ts
      heuristic-config.ts
```

## Charter Format -- The Explore/With/To Discover Pattern

The foundation of every exploratory session is a well-formed charter. The industry-standard format is the three-part charter statement.

### Charter Type Definitions

```typescript
// charter-template.ts
interface ExploratoryCharter {
  id: string;
  title: string;
  explore: string;       // The target area or feature
  with: string;          // The resources, techniques, or data used
  toDiscover: string;    // The information or defects sought
  priority: 'critical' | 'high' | 'medium' | 'low';
  riskArea: RiskArea;
  timeBox: TimeBox;
  persona: TestPersona;
  heuristics: string[];
  preconditions: string[];
  environment: EnvironmentConfig;
  createdAt: Date;
  status: 'draft' | 'ready' | 'in-progress' | 'completed' | 'deferred';
}

interface RiskArea {
  name: string;
  probability: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  frequency: 1 | 2 | 3 | 4 | 5;
  riskScore: number;  // calculated: probability * impact * frequency
  rationale: string;
}

interface TimeBox {
  duration: number;        // in minutes
  setupTime: number;       // minutes for environment prep
  explorationTime: number; // minutes for actual testing
  debriefTime: number;     // minutes for notes and reporting
  breakReminders: boolean;
}

interface TestPersona {
  name: string;
  description: string;
  technicalLevel: 'novice' | 'intermediate' | 'expert';
  motivation: string;
  commonActions: string[];
}

interface EnvironmentConfig {
  browser?: string;
  device?: string;
  networkCondition?: 'fast-3g' | 'slow-3g' | 'offline' | 'broadband';
  dataState?: string;
  featureFlags?: Record<string, boolean>;
}
```

### Charter Generator Implementation

```typescript
// charter-generator.ts
import { v4 as uuid } from 'uuid';

type CharterInput = {
  featureArea: string;
  recentChanges: string[];
  knownRisks: string[];
  userStories: string[];
  previousFindings: string[];
};

function generateCharters(input: CharterInput): ExploratoryCharter[] {
  const charters: ExploratoryCharter[] = [];

  // Generate risk-based charters from known risks
  for (const risk of input.knownRisks) {
    charters.push({
      id: uuid(),
      title: `Risk exploration: ${risk}`,
      explore: input.featureArea,
      with: `targeted scenarios focusing on "${risk}" using boundary analysis and error guessing`,
      toDiscover: `whether the system handles ${risk} gracefully without data loss or security exposure`,
      priority: 'high',
      riskArea: assessRisk(risk, input.featureArea),
      timeBox: createTimeBox(60),
      persona: selectPersonaForRisk(risk),
      heuristics: selectHeuristicsForRisk(risk),
      preconditions: derivePreconditions(input.featureArea, risk),
      environment: deriveEnvironment(risk),
      createdAt: new Date(),
      status: 'ready',
    });
  }

  // Generate change-based charters from recent changes
  for (const change of input.recentChanges) {
    charters.push({
      id: uuid(),
      title: `Change impact: ${change}`,
      explore: `areas affected by "${change}"`,
      with: `regression-focused exploration comparing before/after behavior`,
      toDiscover: `unintended side effects or broken workflows introduced by the change`,
      priority: 'high',
      riskArea: assessChangeRisk(change),
      timeBox: createTimeBox(45),
      persona: { name: 'Power User', description: 'Experienced user who relies on existing workflows', technicalLevel: 'expert', motivation: 'Efficiency and reliability', commonActions: ['keyboard shortcuts', 'batch operations', 'edge case inputs'] },
      heuristics: ['SFDIPOT', 'Consistency'],
      preconditions: [`Verify "${change}" is deployed to test environment`],
      environment: { browser: 'chrome', networkCondition: 'broadband' },
      createdAt: new Date(),
      status: 'ready',
    });
  }

  // Generate user-story-based charters
  for (const story of input.userStories) {
    charters.push({
      id: uuid(),
      title: `User story exploration: ${story}`,
      explore: `the workflow described in "${story}"`,
      with: `happy path and alternative path scenarios, varying input data and user behavior`,
      toDiscover: `gaps in acceptance criteria, usability issues, and unhandled edge cases`,
      priority: 'medium',
      riskArea: assessStoryRisk(story),
      timeBox: createTimeBox(90),
      persona: { name: 'New User', description: 'First-time user encountering the feature', technicalLevel: 'novice', motivation: 'Complete task with minimal friction', commonActions: ['reading labels', 'trial and error', 'using defaults'] },
      heuristics: ['HICCUPPS', 'FEW HICCUPS'],
      preconditions: [`Test data for "${story}" is available`],
      environment: { browser: 'chrome', device: 'desktop', networkCondition: 'broadband' },
      createdAt: new Date(),
      status: 'ready',
    });
  }

  return prioritizeCharters(charters);
}

function createTimeBox(totalMinutes: number): TimeBox {
  return {
    duration: totalMinutes,
    setupTime: Math.round(totalMinutes * 0.1),
    explorationTime: Math.round(totalMinutes * 0.75),
    debriefTime: Math.round(totalMinutes * 0.15),
    breakReminders: totalMinutes > 60,
  };
}

function assessRisk(risk: string, area: string): RiskArea {
  // Risk scoring should be calibrated to your domain
  return {
    name: `${area} - ${risk}`,
    probability: 3,
    impact: 4,
    frequency: 3,
    riskScore: 36,
    rationale: `Known risk "${risk}" in ${area} requires targeted exploration`,
  };
}

function prioritizeCharters(charters: ExploratoryCharter[]): ExploratoryCharter[] {
  return charters.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.riskArea.riskScore - a.riskArea.riskScore;
  });
}
```

## Session-Based Test Management (SBTM)

Session-Based Test Management provides the structure around exploratory sessions, making them auditable and measurable.

### Session Manager

```typescript
// session-manager.ts
interface ExploratorySession {
  id: string;
  charter: ExploratoryCharter;
  tester: string;
  startTime: Date;
  endTime?: Date;
  actualDuration?: number;
  notes: SessionNote[];
  defects: ExploratoryDefect[];
  questions: string[];
  ideas: string[];
  coverageAreas: CoverageArea[];
  metrics: SessionMetrics;
  status: 'setup' | 'exploring' | 'paused' | 'debriefing' | 'completed';
}

interface SessionNote {
  timestamp: Date;
  type: 'observation' | 'action' | 'question' | 'defect' | 'idea' | 'risk';
  content: string;
  screenshot?: string;
  severity?: 'info' | 'warning' | 'critical';
}

interface ExploratoryDefect {
  id: string;
  title: string;
  description: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  severity: 'blocker' | 'critical' | 'major' | 'minor' | 'trivial';
  category: DefectCategory;
  screenshots: string[];
  environment: string;
  reproducibility: 'always' | 'sometimes' | 'once' | 'untested';
}

type DefectCategory =
  | 'functional'
  | 'usability'
  | 'performance'
  | 'security'
  | 'accessibility'
  | 'data-integrity'
  | 'visual'
  | 'compatibility'
  | 'error-handling';

interface SessionMetrics {
  totalNotes: number;
  defectsFound: number;
  questionsRaised: number;
  ideasGenerated: number;
  areasExplored: number;
  testDesignPercentage: number;  // % of time spent designing tests
  testExecutionPercentage: number; // % of time spent executing
  bugInvestigationPercentage: number; // % of time spent investigating bugs
  sessionSetupPercentage: number; // % of time on setup/config
}

class SessionManager {
  private sessions: Map<string, ExploratorySession> = new Map();

  startSession(charter: ExploratoryCharter, tester: string): ExploratorySession {
    const session: ExploratorySession = {
      id: uuid(),
      charter,
      tester,
      startTime: new Date(),
      notes: [],
      defects: [],
      questions: [],
      ideas: [],
      coverageAreas: [],
      metrics: this.initializeMetrics(),
      status: 'setup',
    };

    this.sessions.set(session.id, session);
    this.startTimer(session);
    return session;
  }

  addNote(sessionId: string, note: Omit<SessionNote, 'timestamp'>): void {
    const session = this.getSession(sessionId);
    session.notes.push({ ...note, timestamp: new Date() });

    if (note.type === 'defect') session.metrics.defectsFound++;
    if (note.type === 'question') {
      session.questions.push(note.content);
      session.metrics.questionsRaised++;
    }
    if (note.type === 'idea') {
      session.ideas.push(note.content);
      session.metrics.ideasGenerated++;
    }
    session.metrics.totalNotes++;
  }

  logDefect(sessionId: string, defect: Omit<ExploratoryDefect, 'id'>): string {
    const session = this.getSession(sessionId);
    const defectWithId = { ...defect, id: uuid() };
    session.defects.push(defectWithId);
    session.metrics.defectsFound = session.defects.length;

    this.addNote(sessionId, {
      type: 'defect',
      content: `DEFECT: [${defect.severity}] ${defect.title}`,
      severity: defect.severity === 'blocker' || defect.severity === 'critical' ? 'critical' : 'warning',
    });

    return defectWithId.id;
  }

  completeSession(sessionId: string): ExploratorySession {
    const session = this.getSession(sessionId);
    session.endTime = new Date();
    session.actualDuration = Math.round(
      (session.endTime.getTime() - session.startTime.getTime()) / 60000
    );
    session.status = 'completed';
    session.metrics.areasExplored = session.coverageAreas.length;
    return session;
  }

  private getSession(id: string): ExploratorySession {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Session ${id} not found`);
    return session;
  }

  private initializeMetrics(): SessionMetrics {
    return {
      totalNotes: 0, defectsFound: 0, questionsRaised: 0,
      ideasGenerated: 0, areasExplored: 0,
      testDesignPercentage: 0, testExecutionPercentage: 0,
      bugInvestigationPercentage: 0, sessionSetupPercentage: 0,
    };
  }

  private startTimer(session: ExploratorySession): void {
    const totalMs = session.charter.timeBox.duration * 60 * 1000;
    setTimeout(() => {
      if (session.status === 'exploring') {
        session.status = 'debriefing';
        console.log(`Session ${session.id}: Time is up. Begin debrief.`);
      }
    }, totalMs);
  }
}
```

## Heuristic Cheat Sheets

Heuristics are mental models that guide exploratory testers toward productive areas. They are not checklists; they are thinking tools.

### SFDIPOT (San Francisco Depot) -- Product Element Heuristic

```typescript
// sfdipot.ts
interface SFDIPOTAnalysis {
  structure: string[];    // What the product is made of
  function: string[];     // What the product does
  data: string[];         // What the product processes
  interfaces: string[];   // How the product connects to the world
  platform: string[];     // What the product depends on
  operations: string[];   // How the product is used in practice
  time: string[];         // How the product changes over time
}

function generateSFDIPOTCharters(
  feature: string,
  analysis: SFDIPOTAnalysis
): ExploratoryCharter[] {
  const charters: ExploratoryCharter[] = [];

  // Structure exploration
  for (const item of analysis.structure) {
    charters.push(buildCharter({
      title: `Structure: ${item}`,
      explore: `the structural composition of ${feature}, focusing on ${item}`,
      with: `inspection of component hierarchy, DOM structure, API response shapes`,
      toDiscover: `structural inconsistencies, orphaned elements, or missing components in ${item}`,
    }));
  }

  // Function exploration
  for (const item of analysis.function) {
    charters.push(buildCharter({
      title: `Function: ${item}`,
      explore: `the functional behavior of ${feature} for "${item}"`,
      with: `varied inputs, boundary values, and interrupted workflows`,
      toDiscover: `functional defects, incorrect calculations, or broken business rules`,
    }));
  }

  // Data exploration
  for (const item of analysis.data) {
    charters.push(buildCharter({
      title: `Data: ${item}`,
      explore: `data handling in ${feature} concerning "${item}"`,
      with: `extreme values, special characters, empty data, large datasets`,
      toDiscover: `data corruption, truncation, encoding issues, or loss during transformation`,
    }));
  }

  // Interface exploration
  for (const item of analysis.interfaces) {
    charters.push(buildCharter({
      title: `Interface: ${item}`,
      explore: `the interface point "${item}" in ${feature}`,
      with: `invalid API responses, timeout simulation, format mismatches`,
      toDiscover: `integration failures, error handling gaps, or data mapping defects`,
    }));
  }

  return charters;
}
```

### HICCUPPS -- Consistency Heuristic

```typescript
// hiccupps.ts
interface HICCUPPSEvaluation {
  history: string;       // Is it consistent with past versions?
  image: string;         // Is it consistent with the brand/organization image?
  comparable: string;    // Is it consistent with comparable products?
  claims: string;        // Is it consistent with what was claimed (specs, docs)?
  user: string;          // Is it consistent with user expectations?
  product: string;       // Is it consistent within itself?
  purpose: string;       // Is it consistent with its explicit purpose?
  standards: string;     // Is it consistent with applicable standards?
}

function generateHICCUPPSCharters(
  feature: string,
  evaluation: HICCUPPSEvaluation
): ExploratoryCharter[] {
  return [
    buildCharter({
      title: `Consistency with History`,
      explore: feature,
      with: `comparison against previous version behavior documented in ${evaluation.history}`,
      toDiscover: `regressions or unannounced behavior changes that break user muscle memory`,
    }),
    buildCharter({
      title: `Consistency with Claims`,
      explore: feature,
      with: `the specification and marketing materials: ${evaluation.claims}`,
      toDiscover: `gaps between documented behavior and actual behavior`,
    }),
    buildCharter({
      title: `Consistency with User Expectations`,
      explore: feature,
      with: `common user mental models: ${evaluation.user}`,
      toDiscover: `confusing workflows, unexpected behaviors, or misleading UI elements`,
    }),
    buildCharter({
      title: `Internal Product Consistency`,
      explore: feature,
      with: `cross-feature comparison within the product: ${evaluation.product}`,
      toDiscover: `inconsistent patterns, different behaviors for similar actions, or UI inconsistencies`,
    }),
  ];
}
```

## Note-Taking Templates

Structured notes transform exploratory sessions from anecdotal to evidential.

### Session Note Template

```typescript
// note-template.ts
interface SessionNoteTemplate {
  sessionId: string;
  charter: string;
  tester: string;
  date: string;
  environment: string;
  timeBox: string;

  sections: {
    setup: SetupNotes;
    exploration: ExplorationLog[];
    defects: DefectLog[];
    questions: string[];
    ideas: string[];
    risks: string[];
    coverage: CoverageNotes;
    debrief: DebriefNotes;
  };
}

interface ExplorationLog {
  time: string;
  action: string;
  observation: string;
  result: 'pass' | 'fail' | 'investigate' | 'note';
  screenshot?: string;
}

interface DebriefNotes {
  charterCompleted: boolean;
  completionPercentage: number;
  areasNotCovered: string[];
  topFindings: string[];
  recommendedFollowUp: string[];
  riskAssessmentUpdate: string;
  timeBreakdown: {
    setup: number;
    testing: number;
    bugInvestigation: number;
    noteWriting: number;
  };
}

function createNoteTemplate(session: ExploratorySession): SessionNoteTemplate {
  return {
    sessionId: session.id,
    charter: `Explore ${session.charter.explore} With ${session.charter.with} To Discover ${session.charter.toDiscover}`,
    tester: session.tester,
    date: new Date().toISOString().split('T')[0],
    environment: JSON.stringify(session.charter.environment),
    timeBox: `${session.charter.timeBox.duration} minutes`,
    sections: {
      setup: { prerequisites: session.charter.preconditions, dataState: '', environmentReady: false },
      exploration: [],
      defects: [],
      questions: [],
      ideas: [],
      risks: [],
      coverage: { areasPlanned: [], areasVisited: [], depth: {} },
      debrief: {
        charterCompleted: false,
        completionPercentage: 0,
        areasNotCovered: [],
        topFindings: [],
        recommendedFollowUp: [],
        riskAssessmentUpdate: '',
        timeBreakdown: { setup: 0, testing: 0, bugInvestigation: 0, noteWriting: 0 },
      },
    },
  };
}
```

## Coverage Mapping for Explored Areas

Coverage in exploratory testing is fundamentally different from code coverage. It measures the breadth and depth of territory explored by human intelligence.

```typescript
// coverage-mapper.ts
interface CoverageArea {
  id: string;
  name: string;
  parent?: string;
  depth: 'shallow' | 'moderate' | 'deep' | 'exhaustive';
  sessionsExplored: string[];
  defectsFound: number;
  lastExplored: Date;
  riskLevel: 'high' | 'medium' | 'low';
  notes: string;
}

interface CoverageMap {
  product: string;
  areas: CoverageArea[];
  totalAreas: number;
  exploredAreas: number;
  coveragePercentage: number;
  riskCoverage: {
    highRiskCovered: number;
    highRiskTotal: number;
    mediumRiskCovered: number;
    mediumRiskTotal: number;
  };
}

class CoverageMapper {
  private areas: Map<string, CoverageArea> = new Map();

  registerArea(area: Omit<CoverageArea, 'sessionsExplored' | 'defectsFound' | 'lastExplored'>): void {
    this.areas.set(area.id, {
      ...area,
      sessionsExplored: [],
      defectsFound: 0,
      lastExplored: new Date(0),
    });
  }

  recordExploration(areaId: string, sessionId: string, depth: CoverageArea['depth'], defectsFound: number): void {
    const area = this.areas.get(areaId);
    if (!area) throw new Error(`Area ${areaId} not registered`);

    area.sessionsExplored.push(sessionId);
    area.depth = this.deeperOf(area.depth, depth);
    area.defectsFound += defectsFound;
    area.lastExplored = new Date();
  }

  generateCoverageReport(product: string): CoverageMap {
    const allAreas = Array.from(this.areas.values());
    const explored = allAreas.filter(a => a.sessionsExplored.length > 0);
    const highRisk = allAreas.filter(a => a.riskLevel === 'high');
    const highRiskExplored = highRisk.filter(a => a.sessionsExplored.length > 0);

    return {
      product,
      areas: allAreas,
      totalAreas: allAreas.length,
      exploredAreas: explored.length,
      coveragePercentage: Math.round((explored.length / allAreas.length) * 100),
      riskCoverage: {
        highRiskCovered: highRiskExplored.length,
        highRiskTotal: highRisk.length,
        mediumRiskCovered: allAreas.filter(a => a.riskLevel === 'medium' && a.sessionsExplored.length > 0).length,
        mediumRiskTotal: allAreas.filter(a => a.riskLevel === 'medium').length,
      },
    };
  }

  getUnexploredHighRiskAreas(): CoverageArea[] {
    return Array.from(this.areas.values())
      .filter(a => a.riskLevel === 'high' && a.sessionsExplored.length === 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getStaleAreas(daysThreshold: number): CoverageArea[] {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysThreshold);
    return Array.from(this.areas.values())
      .filter(a => a.lastExplored < threshold && a.sessionsExplored.length > 0);
  }

  private deeperOf(current: CoverageArea['depth'], incoming: CoverageArea['depth']): CoverageArea['depth'] {
    const order: CoverageArea['depth'][] = ['shallow', 'moderate', 'deep', 'exhaustive'];
    return order.indexOf(incoming) > order.indexOf(current) ? incoming : current;
  }
}
```

## Debrief Session Structure

The debrief is where raw exploration transforms into organizational knowledge. Every session must include a structured debrief.

```typescript
// debrief-template.ts
interface DebriefSession {
  sessionId: string;
  charter: string;
  participants: string[];
  duration: number; // minutes

  agenda: {
    charterReview: {
      wasCharterCompleted: boolean;
      completionRatio: string; // e.g., "80%"
      deviations: string[];
      reasonsForDeviation: string[];
    };

    findings: {
      defects: ExploratoryDefect[];
      observations: string[];
      risks: string[];
      questions: string[];
    };

    coverageAssessment: {
      areasExplored: string[];
      areasNotReached: string[];
      depthAchieved: Record<string, string>;
    };

    nextActions: {
      followUpCharters: string[];
      defectsToFile: string[];
      risksToEscalate: string[];
      questionsToResearch: string[];
    };

    metricsUpdate: {
      sessionDuration: number;
      percentageOnCharter: number;
      percentageOnBugInvestigation: number;
      percentageOnSetup: number;
      defectsPerHour: number;
    };
  };
}

function conductDebrief(session: ExploratorySession): DebriefSession {
  const duration = session.actualDuration || session.charter.timeBox.duration;
  const hoursSpent = duration / 60;

  return {
    sessionId: session.id,
    charter: `${session.charter.explore} / ${session.charter.with} / ${session.charter.toDiscover}`,
    participants: [session.tester],
    duration: session.charter.timeBox.debriefTime,
    agenda: {
      charterReview: {
        wasCharterCompleted: session.coverageAreas.length > 0,
        completionRatio: `${Math.round((session.coverageAreas.filter(a => a.depth !== 'shallow').length / Math.max(session.coverageAreas.length, 1)) * 100)}%`,
        deviations: session.notes.filter(n => n.type === 'idea').map(n => n.content),
        reasonsForDeviation: [],
      },
      findings: {
        defects: session.defects,
        observations: session.notes.filter(n => n.type === 'observation').map(n => n.content),
        risks: session.notes.filter(n => n.type === 'risk').map(n => n.content),
        questions: session.questions,
      },
      coverageAssessment: {
        areasExplored: session.coverageAreas.map(a => a.name),
        areasNotReached: [],
        depthAchieved: Object.fromEntries(session.coverageAreas.map(a => [a.name, a.depth])),
      },
      nextActions: {
        followUpCharters: session.ideas,
        defectsToFile: session.defects.filter(d => d.severity === 'critical' || d.severity === 'blocker').map(d => d.title),
        risksToEscalate: session.notes.filter(n => n.type === 'risk' && n.severity === 'critical').map(n => n.content),
        questionsToResearch: session.questions,
      },
      metricsUpdate: {
        sessionDuration: duration,
        percentageOnCharter: session.metrics.testExecutionPercentage,
        percentageOnBugInvestigation: session.metrics.bugInvestigationPercentage,
        percentageOnSetup: session.metrics.sessionSetupPercentage,
        defectsPerHour: hoursSpent > 0 ? Math.round(session.defects.length / hoursSpent * 10) / 10 : 0,
      },
    },
  };
}
```

## Metrics for Exploratory Testing

Measuring exploratory testing effectiveness requires different metrics than scripted testing.

```typescript
// exploration-dashboard.ts
interface ExploratoryMetrics {
  period: { start: Date; end: Date };

  sessionMetrics: {
    totalSessions: number;
    totalHours: number;
    averageSessionLength: number;
    charterCompletionRate: number;
  };

  defectMetrics: {
    totalDefects: number;
    defectsPerSession: number;
    defectsPerHour: number;
    severityDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
  };

  coverageMetrics: {
    totalAreas: number;
    exploredAreas: number;
    highRiskCoverage: number;
    averageDepth: string;
  };

  qualityIndicators: {
    defectClusteringIndex: number;  // how concentrated defects are
    explorationEfficiency: number;  // defects found per unit of effort
    riskReductionRate: number;      // high-risk areas covered over time
    sessionProductivity: number;    // useful findings per session
  };
}

function calculateExploratoryMetrics(sessions: ExploratorySession[]): ExploratoryMetrics {
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
  const totalHours = totalMinutes / 60;
  const allDefects = completedSessions.flatMap(s => s.defects);

  const severityDist: Record<string, number> = {};
  for (const defect of allDefects) {
    severityDist[defect.severity] = (severityDist[defect.severity] || 0) + 1;
  }

  const categoryDist: Record<string, number> = {};
  for (const defect of allDefects) {
    categoryDist[defect.category] = (categoryDist[defect.category] || 0) + 1;
  }

  return {
    period: {
      start: completedSessions.length > 0 ? completedSessions[0].startTime : new Date(),
      end: new Date(),
    },
    sessionMetrics: {
      totalSessions: completedSessions.length,
      totalHours: Math.round(totalHours * 10) / 10,
      averageSessionLength: completedSessions.length > 0
        ? Math.round(totalMinutes / completedSessions.length)
        : 0,
      charterCompletionRate: completedSessions.length > 0
        ? Math.round(
            (completedSessions.filter(s => s.coverageAreas.length > 0).length /
              completedSessions.length) * 100
          )
        : 0,
    },
    defectMetrics: {
      totalDefects: allDefects.length,
      defectsPerSession: completedSessions.length > 0
        ? Math.round((allDefects.length / completedSessions.length) * 10) / 10
        : 0,
      defectsPerHour: totalHours > 0
        ? Math.round((allDefects.length / totalHours) * 10) / 10
        : 0,
      severityDistribution: severityDist,
      categoryDistribution: categoryDist,
    },
    coverageMetrics: {
      totalAreas: 0,
      exploredAreas: 0,
      highRiskCoverage: 0,
      averageDepth: 'moderate',
    },
    qualityIndicators: {
      defectClusteringIndex: calculateClusteringIndex(completedSessions),
      explorationEfficiency: totalHours > 0 ? allDefects.length / totalHours : 0,
      riskReductionRate: 0,
      sessionProductivity: completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + s.metrics.totalNotes, 0) / completedSessions.length
        : 0,
    },
  };
}

function calculateClusteringIndex(sessions: ExploratorySession[]): number {
  const areaDefectCounts: Record<string, number> = {};
  for (const session of sessions) {
    for (const area of session.coverageAreas) {
      areaDefectCounts[area.name] = (areaDefectCounts[area.name] || 0) + area.defectsFound;
    }
  }
  const counts = Object.values(areaDefectCounts);
  if (counts.length === 0) return 0;
  const max = Math.max(...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  return total > 0 ? Math.round((max / total) * 100) / 100 : 0;
}
```

## Configuration

```typescript
// charter-config.ts
interface CharterConfig {
  defaults: {
    timeBoxMinutes: number;
    setupPercentage: number;
    explorationPercentage: number;
    debriefPercentage: number;
    breakReminderThreshold: number;
  };
  personas: TestPersona[];
  heuristics: {
    name: string;
    description: string;
    elements: string[];
  }[];
  riskThresholds: {
    high: number;
    medium: number;
    low: number;
  };
  reportFormat: 'markdown' | 'json' | 'html';
  screenshotDirectory: string;
  noteAutoSaveInterval: number; // seconds
}

const defaultConfig: CharterConfig = {
  defaults: {
    timeBoxMinutes: 60,
    setupPercentage: 10,
    explorationPercentage: 75,
    debriefPercentage: 15,
    breakReminderThreshold: 60,
  },
  personas: [
    { name: 'Novice User', description: 'First-time user with no domain knowledge', technicalLevel: 'novice', motivation: 'Complete a task with minimal guidance', commonActions: ['reading help text', 'clicking obvious buttons', 'making mistakes'] },
    { name: 'Power User', description: 'Experienced user who knows shortcuts', technicalLevel: 'expert', motivation: 'Efficiency and speed', commonActions: ['keyboard shortcuts', 'batch operations', 'customization'] },
    { name: 'Malicious User', description: 'User attempting to break or exploit the system', technicalLevel: 'expert', motivation: 'Finding vulnerabilities and bypasses', commonActions: ['injection attempts', 'parameter tampering', 'privilege escalation'] },
    { name: 'Accessibility User', description: 'User relying on assistive technology', technicalLevel: 'intermediate', motivation: 'Using the product with screen reader or keyboard only', commonActions: ['tab navigation', 'screen reader interaction', 'high contrast mode'] },
  ],
  heuristics: [
    { name: 'SFDIPOT', description: 'San Francisco Depot - Product element analysis', elements: ['Structure', 'Function', 'Data', 'Interfaces', 'Platform', 'Operations', 'Time'] },
    { name: 'HICCUPPS', description: 'Consistency oracle heuristics', elements: ['History', 'Image', 'Comparable', 'Claims', 'User expectations', 'Product', 'Purpose', 'Standards'] },
    { name: 'FEW HICCUPS', description: 'Extended consistency heuristics', elements: ['Familiarity', 'Explainability', 'World', 'History', 'Image', 'Comparable', 'Claims', 'User expectations', 'Product', 'Standards'] },
    { name: 'Touring Heuristics', description: 'Tour-based exploration', elements: ['Guidebook tour', 'Money tour', 'Landmark tour', 'Intellectual tour', 'FedEx tour', 'Garbage collector tour', 'Bad neighborhood tour', 'Museum tour'] },
  ],
  riskThresholds: { high: 45, medium: 20, low: 0 },
  reportFormat: 'markdown',
  screenshotDirectory: './test-artifacts/screenshots',
  noteAutoSaveInterval: 30,
};
```

## Best Practices

1. **Write the charter before the session** -- Crafting the charter is a design activity. Rushing it at session start wastes exploration time. Write charters during planning, not during testing.

2. **Keep sessions between 45 and 90 minutes** -- Shorter sessions lack depth. Longer sessions cause fatigue and reduce defect detection rates. The sweet spot is 60 minutes of exploration with 15 minutes of debrief.

3. **Use one persona per session** -- Switching personas mid-session splits focus. Assign a single persona to each charter and explore consistently through that lens.

4. **Photograph or screenshot every anomaly immediately** -- Visual evidence degrades when you try to reproduce it later. Capture first, investigate second.

5. **Separate observation from interpretation** -- Notes should say "clicking Submit with empty form shows no error message" not "the form validation is broken." Record what you see, then analyze in the debrief.

6. **Vary your test oracles across sessions** -- Do not rely on a single oracle (specification). Use history, comparable products, user expectations, and standards as alternative oracles in different sessions.

7. **Track your own testing biases** -- If you always test the same browser, the same data, or the same path first, you create blind spots. Use randomization and heuristic rotation to counteract bias.

8. **Debrief with someone else present** -- A solo debrief is a missed opportunity. Another tester asking "why did you explore that area?" forces articulation that reveals gaps and assumptions.

9. **Feed session output into future charters** -- Questions, ideas, and untested areas from one session should directly generate charters for the next cycle. Exploration is iterative, not one-shot.

10. **Maintain a living risk model** -- Update risk assessments after every session. Areas where defects cluster should have their risk scores increased. Areas that have been deeply explored without issues can be deprioritized.

11. **Never skip the setup verification** -- Confirm your environment, data, and access are correct before the timer starts. Discovering a broken test environment 30 minutes into a session is a preventable waste.

12. **Use touring heuristics for unfamiliar features** -- When you do not know a feature well, use the Guidebook Tour (follow the user manual) or the Landmark Tour (visit key capabilities) before attempting creative exploration.

13. **Document what you did NOT test** -- The uncovered areas are as important as the covered ones. Explicitly listing what was not tested makes coverage gaps visible to the team.

14. **Calibrate defect severity during debrief, not during exploration** -- During exploration, capture defects quickly with minimal classification. Refine severity and priority during the structured debrief when you have more context.

## Anti-Patterns to Avoid

1. **Aimless wandering** -- Exploring without a charter is not exploratory testing; it is procrastination. Every session must have a mission. Without a charter, you cannot measure whether you accomplished anything.

2. **Over-scripting the session** -- If your charter specifies exact steps and expected results, you have written a test case, not a charter. Charters set direction; the tester's skill determines the path.

3. **Ignoring the time box** -- Running sessions without a timer or consistently extending sessions "just five more minutes" destroys the discipline that makes SBTM work. Respect the boundary.

4. **Treating exploratory testing as only manual clicking** -- Exploratory testing is a cognitive activity, not a click activity. It includes reading logs, querying databases, inspecting network traffic, and analyzing state. Limiting it to the UI limits its power.

5. **Skipping debriefs** -- A session without a debrief produces findings that exist only in one tester's memory. Institutional knowledge requires documentation and sharing.

6. **Confusing coverage breadth with testing quality** -- Touching every feature at a shallow level is worse than deeply exploring high-risk areas. Depth on risk-critical areas outweighs breadth on stable features.

7. **Never rotating personas or heuristics** -- Using the same persona and the same heuristic in every session produces the same type of findings. Rotate systematically.

8. **Filing zero defects as a success indicator** -- Zero defects from an exploratory session might mean the software is good, or it might mean the exploration was ineffective. Evaluate based on coverage depth and note quality, not defect counts alone.

## Debugging Tips

1. **Charter too vague to be actionable** -- If a charter says "Explore the search feature to find bugs," it lacks specificity. Add constraints: which search filters, which data volumes, which user type, which error conditions. A charter should be narrow enough that another tester could pick it up and know exactly where to start.

2. **Sessions consistently running over time** -- This usually means charters are scoped too broadly. Split large charters into smaller, focused ones. A charter covering "the entire checkout flow" should become three charters: cart management, payment processing, and order confirmation.

3. **Low defect discovery rate** -- Check whether you are varying your approach enough. If every session uses the same data, same browser, same happy path, you will find diminishing returns. Apply different heuristics, use extreme data, and change the environment.

4. **Notes too sparse to reproduce defects** -- Implement a structured note format with mandatory fields: timestamp, action, input data, expected result, actual result. Train testers to write notes as if someone else will read them.

5. **Team not valuing exploratory sessions** -- Report metrics that management cares about: defects found per hour compared to scripted testing, unique defect categories discovered, risk coverage improvement. Show the return on investment with data.

6. **Coverage map shows blind spots in the same areas repeatedly** -- This indicates a systemic bias. Assign those areas to a different tester, use a different heuristic, or create charters with a different persona to force a fresh perspective.

7. **Debrief sessions feel unproductive** -- Structure them with a fixed agenda: charter review (2 minutes), top findings (5 minutes), coverage assessment (3 minutes), next actions (5 minutes). Time-box the debrief itself to prevent rambling.

8. **Difficulty prioritizing charters** -- Use the risk matrix (probability times impact times frequency) to score every charter. Sort by score. When in doubt, prioritize charters targeting recently changed code, features with a history of defects, or areas where customer complaints have been reported.

9. **Exploration becomes repetitive across sprint cycles** -- Introduce new touring heuristics each sprint. If you used SFDIPOT last sprint, use Touring Heuristics this sprint. Rotate the cognitive tools, not just the features.

10. **Stakeholders question what was tested** -- Generate session reports that map exploration to product areas, include screenshots, and show risk coverage percentages. Exploratory testing is not less rigorous than scripted testing; it merely requires different documentation to prove its value.