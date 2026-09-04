/**
 * Evidence-based startup evaluation engine.
 *
 * This is the JavaScript/ES-module port of the supplied backend.ts file. It is
 * deliberately deterministic and explainable: the same input and config always
 * produce the same result. It does not call an external AI service and it does
 * not make a procurement award.
 */

export const DEFAULT_EVALUATION_CONFIG = {
  algorithmVersion: '1.0.0',
  minimumEvidenceConfidence: 55,
  minimumScaleRecommendationScore: 75,
  manualReviewRiskThreshold: 70,
  weights: {
    startupCapability: {
      teamExecution: 0.2,
      technologyMaturity: 0.2,
      relevantDeploymentEvidence: 0.2,
      operationalCapacity: 0.15,
      governance: 0.1,
      financialContinuity: 0.1,
      supportCapability: 0.05,
    },
    finalRecommendationPrePilot: {
      capability: 0.18,
      problemFit: 0.22,
      evidenceConfidence: 0.12,
      governance: 0.1,
      scalability: 0.1,
      pilotReadiness: 0.12,
      riskAdjusted: 0.06,
      security: 0.06,
      financial: 0.04,
    },
    finalRecommendationPostPilot: {
      problemFit: 0.18,
      pilotPerformance: 0.3,
      evidenceConfidence: 0.1,
      scalability: 0.12,
      governance: 0.08,
      riskAdjusted: 0.08,
      financial: 0.05,
      security: 0.09,
    },
  },
};

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : 0));

const average = (...values) => values.length
  ? values.reduce((sum, value) => sum + clamp(value), 0) / values.length
  : 0;

const weightedAverage = (metrics) => {
  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
  if (totalWeight <= 0) return 0;
  return clamp(metrics.reduce((sum, metric) => sum + clamp(metric.value) * metric.weight, 0) / totalWeight);
};

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const inverseScore = (riskValue) => 100 - clamp(riskValue);

const riskLevelFromScore = (riskScore) => {
  if (riskScore >= 80) return 'CRITICAL';
  if (riskScore >= 60) return 'HIGH';
  if (riskScore >= 35) return 'MODERATE';
  return 'LOW';
};

export function evaluateEligibility(input) {
  const reasons = [];
  const e = input.eligibility;

  if (!e.registrationValid) reasons.push('Required registration is invalid or unverified.');
  if (!e.requiredRecognitionSatisfied) reasons.push('Required recognition criteria are not satisfied.');
  if (!e.mandatoryDocumentsComplete) reasons.push('Mandatory application documents are incomplete.');
  if (!e.mandatoryTechnicalRequirementsSatisfied) reasons.push('One or more mandatory technical requirements are not satisfied.');
  if (e.debarred) reasons.push('Entity is marked as debarred/prohibited for this evaluation.');
  if (!e.conflictsDeclared) reasons.push('Required conflict-of-interest declarations are incomplete.');
  if (!e.requiredCertificationsSatisfied) reasons.push('Challenge-specific mandatory certification requirements are not satisfied.');

  if (!e.registrationValid || !e.mandatoryTechnicalRequirementsSatisfied || e.debarred) {
    return { status: 'FAIL', reasons };
  }
  if (reasons.length > 0) return { status: 'CONDITIONAL_PASS', reasons };
  return { status: 'PASS', reasons: ['All configured eligibility gates passed.'] };
}

export function evaluateEvidenceConfidence(input) {
  const e = input.evidence;
  const score = weightedAverage([
    { value: e.officialDatabaseVerification, weight: 0.22 },
    { value: e.independentValidation, weight: 0.2 },
    { value: e.verifiedCustomerReferences, weight: 0.18 },
    { value: e.auditedDocuments, weight: 0.15 },
    { value: e.supportingDocuments, weight: 0.1 },
    { value: e.selfDeclaredClaims, weight: 0.08 },
    { value: inverseScore(e.unsupportedClaims), weight: 0.07 },
  ]);
  const reasons = [];
  if (e.officialDatabaseVerification >= 75) reasons.push({ label: 'Official verification', impact: 'POSITIVE', detail: 'Strong proportion of key claims is verified through official sources.' });
  if (e.verifiedCustomerReferences >= 75) reasons.push({ label: 'Customer evidence', impact: 'POSITIVE', detail: 'Customer references are strongly verified.' });
  if (e.unsupportedClaims > 40) reasons.push({ label: 'Unsupported claims', impact: 'NEGATIVE', detail: 'A material share of important claims lacks sufficient supporting evidence.' });
  return { score: round(score), reasons };
}

export function evaluateReferenceVerification(input) {
  const r = input.references;
  const submitted = Math.max(r.totalSubmitted, 1);
  const verificationRatio = clamp(((r.verified + r.partiallyVerified * 0.5 - r.contradicted) / submitted) * 100);
  const score = weightedAverage([
    { value: verificationRatio, weight: 0.4 },
    { value: r.reliability, weight: 0.2 },
    { value: r.deliveryTimeliness, weight: 0.15 },
    { value: r.supportResponsiveness, weight: 0.15 },
    { value: r.scalabilityFeedback, weight: 0.1 },
  ]);
  const reasons = [];
  if (r.contradicted > 0) reasons.push({ label: 'Contradicted references', impact: 'NEGATIVE', detail: `${r.contradicted} customer reference(s) contain contradictions requiring review.` });
  if (verificationRatio >= 75) reasons.push({ label: 'Reference verification', impact: 'POSITIVE', detail: 'Most customer references are verified or partially verified.' });
  return { score: round(score), reasons };
}

export function evaluateGovernance(input) {
  const g = input.governance;
  const score = weightedAverage([
    { value: g.disclosureCompleteness, weight: 0.18 },
    { value: g.regulatoryCompliance, weight: 0.18 },
    { value: g.conflictOfInterestQuality, weight: 0.12 },
    { value: g.documentConsistency, weight: 0.15 },
    { value: g.leadershipContinuity, weight: 0.12 },
    { value: inverseScore(g.vendorDependency), weight: 0.12 },
    { value: inverseScore(g.litigationDeliveryRisk), weight: 0.13 },
  ]);
  const reasons = [];
  if (g.documentConsistency < 50) reasons.push({ label: 'Document consistency', impact: 'NEGATIVE', detail: 'Submitted records contain material inconsistencies.' });
  if (g.regulatoryCompliance >= 80) reasons.push({ label: 'Compliance', impact: 'POSITIVE', detail: 'Regulatory and governance controls appear mature.' });
  return { score: round(score), reasons };
}

export function evaluateFinancialSustainability(input) {
  const f = input.financials;
  const score = weightedAverage([
    { value: f.runwayStrength, weight: 0.3 },
    { value: f.workingCapitalStrength, weight: 0.25 },
    { value: inverseScore(f.paymentDependencyRisk), weight: 0.15 },
    { value: f.scalingCapitalReadiness, weight: 0.2 },
    { value: inverseScore(f.burnRisk), weight: 0.1 },
  ]);
  const reasons = [];
  if (f.workingCapitalStrength < 40) reasons.push({ label: 'Working capital', impact: 'NEGATIVE', detail: 'Working-capital strength may be insufficient for delayed payment cycles or scale-up.' });
  if (f.runwayStrength >= 70) reasons.push({ label: 'Runway', impact: 'POSITIVE', detail: 'Financial runway is comparatively resilient for pilot delivery.' });
  return { score: round(score), reasons };
}

export function evaluateSecurity(input) {
  const s = input.security;
  const positive = weightedAverage([
    { value: s.securityReadiness, weight: 0.25 },
    { value: s.privacyArchitecture, weight: 0.2 },
    { value: s.incidentResponse, weight: 0.15 },
    { value: s.accessControl, weight: 0.15 },
    { value: s.certificationCoverage, weight: 0.1 },
    { value: inverseScore(s.criticalVulnerabilities), weight: 0.15 },
  ]);
  const riskScore = round(100 - positive);
  const reasons = [];
  if (s.criticalVulnerabilities > 60) reasons.push({ label: 'Critical vulnerabilities', impact: 'NEGATIVE', detail: 'Critical security issues exceed the configured acceptable range.' });
  if (s.securityReadiness >= 80 && s.privacyArchitecture >= 80) reasons.push({ label: 'Security readiness', impact: 'POSITIVE', detail: 'Security and privacy controls appear strong for pilot deployment.' });
  return { score: round(positive), level: riskLevelFromScore(riskScore), reasons };
}

export function evaluateChangeOfControlRisk(input) {
  const c = input.changeOfControl;
  const continuityScore = weightedAverage([
    { value: c.ipOwnershipClarity, weight: 0.2 },
    { value: c.dataPortability, weight: 0.2 },
    { value: c.sourceCodeContinuity, weight: 0.15 },
    { value: c.transitionPlan, weight: 0.15 },
    { value: inverseScore(c.vendorLockInRisk), weight: 0.15 },
    { value: inverseScore(c.acquisitionContinuityRisk), weight: 0.15 },
  ]);
  const riskScore = 100 - continuityScore;
  const reasons = [];
  if (c.vendorLockInRisk >= 60) reasons.push({ label: 'Vendor lock-in', impact: 'NEGATIVE', detail: 'High dependency may complicate transition after acquisition, merger, or vendor failure.' });
  if (c.dataPortability >= 80 && c.transitionPlan >= 75) reasons.push({ label: 'Continuity planning', impact: 'POSITIVE', detail: 'Data portability and transition planning reduce change-of-control risk.' });
  return { score: round(riskScore), level: riskLevelFromScore(riskScore), reasons };
}

export function evaluateAntiGaming(input) {
  const a = input.antiGaming;
  const riskScore = weightedAverage([
    { value: a.contradictoryAnswers, weight: 0.22 },
    { value: a.unsupportedPerformanceClaims, weight: 0.22 },
    { value: a.conflictingDates, weight: 0.14 },
    { value: a.duplicateDocuments, weight: 0.12 },
    { value: a.impossibleScaleClaims, weight: 0.18 },
    { value: a.suddenMaterialEdits, weight: 0.12 },
  ]);
  const reasons = [];
  if (riskScore >= 60) reasons.push({ label: 'Application anomaly risk', impact: 'NEGATIVE', detail: 'Application contains multiple anomalies and should receive manual verification.' });
  return { score: round(riskScore), level: riskLevelFromScore(riskScore), reasons };
}

export function evaluateProblemFit(input) {
  const p = input.problemFit;
  const score = weightedAverage([
    { value: p.mandatoryCapabilityMatch, weight: 0.3 },
    { value: p.technicalCompatibility, weight: 0.15 },
    { value: p.relevantProblemExperience, weight: 0.15 },
    { value: p.deploymentEnvironmentCompatibility, weight: 0.1 },
    { value: p.integrationCompatibility, weight: 0.1 },
    { value: p.budgetCompatibility, weight: 0.05 },
    { value: p.timelineCompatibility, weight: 0.05 },
    { value: p.geographicContextCompatibility, weight: 0.05 },
    { value: p.languageAccessibilityCompatibility, weight: 0.05 },
  ]);
  const reasons = [];
  if (p.mandatoryCapabilityMatch < 60) reasons.push({ label: 'Mandatory capability gap', impact: 'NEGATIVE', detail: 'One or more important challenge capabilities are only partially matched.' });
  if (p.technicalCompatibility >= 85) reasons.push({ label: 'Technical fit', impact: 'POSITIVE', detail: 'Solution architecture is strongly compatible with the challenge requirements.' });
  if (p.geographicContextCompatibility < 50) reasons.push({ label: 'Context fit', impact: 'NEGATIVE', detail: 'The solution has limited evidence for the target geographic/deployment context.' });
  return { score: round(score), reasons };
}

export function evaluateScalability(input) {
  const s = input.scalability;
  const score = weightedAverage([
    { value: s.architectureScalability, weight: 0.2 },
    { value: s.infrastructureEfficiency, weight: 0.12 },
    { value: s.costScalability, weight: 0.15 },
    { value: s.staffingScalability, weight: 0.1 },
    { value: s.multiLocationSupport, weight: 0.15 },
    { value: s.multiLanguageSupport, weight: 0.08 },
    { value: s.lowBandwidthSupport, weight: 0.08 },
    { value: s.deploymentRepeatability, weight: 0.12 },
  ]);
  const reasons = [];
  if (s.costScalability < 50) reasons.push({ label: 'Cost at scale', impact: 'NEGATIVE', detail: 'Projected cost growth may limit large-scale deployment.' });
  if (s.multiLocationSupport >= 80) reasons.push({ label: 'Multi-location readiness', impact: 'POSITIVE', detail: 'Solution appears capable of repeated deployment across multiple districts or departments.' });
  return { score: round(score), reasons };
}

export function evaluatePilotReadiness(input) {
  const p = input.pilotReadiness;
  const score = weightedAverage([
    { value: p.technologyReadiness, weight: 0.14 },
    { value: p.implementationPlan, weight: 0.12 },
    { value: p.teamAvailability, weight: 0.1 },
    { value: p.integrationReadiness, weight: 0.12 },
    { value: p.securityReadiness, weight: 0.1 },
    { value: p.dataReadiness, weight: 0.1 },
    { value: p.measurementDesign, weight: 0.12 },
    { value: p.rollbackPlan, weight: 0.08 },
    { value: p.riskMitigationPlan, weight: 0.06 },
    { value: p.supportAvailability, weight: 0.06 },
  ]);
  const reasons = [];
  if (p.measurementDesign < 50) reasons.push({ label: 'Pilot measurement', impact: 'NEGATIVE', detail: 'Pilot KPI measurement design is not yet strong enough for evidence-based evaluation.' });
  if (p.implementationPlan >= 80) reasons.push({ label: 'Implementation plan', impact: 'POSITIVE', detail: 'Pilot implementation plan is detailed and operationally ready.' });
  return { score: round(score), reasons };
}

export function evaluatePilotPerformance(input) {
  const p = input.pilotPerformance;
  if (!p) return null;
  const score = weightedAverage([
    { value: p.technicalKpis, weight: 0.27 },
    { value: p.operationalOutcomes, weight: 0.18 },
    { value: p.reliability, weight: 0.1 },
    { value: p.costEfficiency, weight: 0.09 },
    { value: p.securityCompliance, weight: 0.1 },
    { value: p.userFeedback, weight: 0.08 },
    { value: p.implementationTimeline, weight: 0.05 },
    { value: p.supportResponsiveness, weight: 0.05 },
    { value: p.independentValidation, weight: 0.08 },
  ]);
  const reasons = [];
  if (p.mandatoryKpiFailed) reasons.push({ label: 'Mandatory KPI failure', impact: 'NEGATIVE', detail: 'At least one mandatory pilot success criterion was not achieved.' });
  if (p.independentValidation >= 80) reasons.push({ label: 'Independent validation', impact: 'POSITIVE', detail: 'Independent validation strongly supports the measured pilot results.' });
  return { score: round(score), reasons };
}

export function evaluateStartupCapability(input, config = DEFAULT_EVALUATION_CONFIG) {
  const governance = evaluateGovernance(input).score;
  const financial = evaluateFinancialSustainability(input).score;
  const references = evaluateReferenceVerification(input).score;
  const teamExecution = average(input.team.executionCapacity, input.team.technicalLeadership);
  const technologyMaturity = average(input.technology.maturity, input.technology.architectureQuality, input.technology.integrationReadiness);
  const operationalCapacity = average(input.operations.currentCapacity, input.operations.maximumDemonstratedScale, input.operations.deploymentSpeed, input.operations.businessContinuity);
  const weights = config.weights.startupCapability;
  const score = weightedAverage([
    { value: teamExecution, weight: weights.teamExecution },
    { value: technologyMaturity, weight: weights.technologyMaturity },
    { value: references, weight: weights.relevantDeploymentEvidence },
    { value: operationalCapacity, weight: weights.operationalCapacity },
    { value: governance, weight: weights.governance },
    { value: financial, weight: weights.financialContinuity },
    { value: input.operations.supportStructure, weight: weights.supportCapability },
  ]);
  const reasons = [];
  if (teamExecution >= 80) reasons.push({ label: 'Execution capacity', impact: 'POSITIVE', detail: 'Team and technical execution capacity are strong.' });
  if (references < 50) reasons.push({ label: 'Deployment evidence', impact: 'NEGATIVE', detail: 'Relevant customer/deployment evidence is limited or insufficiently verified.' });
  return { score: round(score), reasons };
}

export function evaluateOverallRisk(input) {
  const antiGaming = evaluateAntiGaming(input).score;
  const changeRisk = evaluateChangeOfControlRisk(input).score;
  const securityRisk = 100 - evaluateSecurity(input).score;
  const operationalRisk = 100 - average(input.operations.deliveryHistory, input.operations.businessContinuity, input.operations.supportStructure);
  const financialRisk = 100 - evaluateFinancialSustainability(input).score;
  const governanceRisk = 100 - evaluateGovernance(input).score;
  const riskScore = weightedAverage([
    { value: antiGaming, weight: 0.16 },
    { value: changeRisk, weight: 0.12 },
    { value: securityRisk, weight: 0.22 },
    { value: operationalRisk, weight: 0.18 },
    { value: financialRisk, weight: 0.15 },
    { value: governanceRisk, weight: 0.17 },
  ]);
  const reasons = [];
  if (riskScore >= 60) reasons.push({ label: 'Overall risk', impact: 'NEGATIVE', detail: 'Combined security, governance, continuity, operational or evidence risks require additional human review.' });
  return { score: round(riskScore), level: riskLevelFromScore(riskScore), reasons };
}

export function confidenceAdjustedScore(rawScore, evidenceConfidence) {
  const multiplier = 0.6 + 0.4 * (clamp(evidenceConfidence) / 100);
  return round(clamp(rawScore) * multiplier);
}

export function evaluateStartup(input, config = DEFAULT_EVALUATION_CONFIG) {
  const eligibility = evaluateEligibility(input);
  const evidence = evaluateEvidenceConfidence(input);
  const references = evaluateReferenceVerification(input);
  const governance = evaluateGovernance(input);
  const financial = evaluateFinancialSustainability(input);
  const security = evaluateSecurity(input);
  const changeOfControl = evaluateChangeOfControlRisk(input);
  const antiGaming = evaluateAntiGaming(input);
  const problemFit = evaluateProblemFit(input);
  const scalability = evaluateScalability(input);
  const pilotReadiness = evaluatePilotReadiness(input);
  const pilotPerformance = evaluatePilotPerformance(input);
  const capability = evaluateStartupCapability(input, config);
  const overallRisk = evaluateOverallRisk(input);
  const adjustedFit = confidenceAdjustedScore(problemFit.score, evidence.score);
  const adjustedCapability = confidenceAdjustedScore(capability.score, evidence.score);
  const mandatoryReviewFlags = [];

  if (eligibility.status === 'FAIL') mandatoryReviewFlags.push('ELIGIBILITY_FAIL');
  if (eligibility.status === 'CONDITIONAL_PASS') mandatoryReviewFlags.push('CONDITIONAL_ELIGIBILITY');
  if (evidence.score < config.minimumEvidenceConfidence) mandatoryReviewFlags.push('LOW_EVIDENCE_CONFIDENCE');
  if (['HIGH', 'CRITICAL'].includes(antiGaming.level)) mandatoryReviewFlags.push('ANTI_GAMING_REVIEW');
  if (['HIGH', 'CRITICAL'].includes(security.level)) mandatoryReviewFlags.push('SECURITY_REVIEW');
  if (overallRisk.score >= config.manualReviewRiskThreshold) mandatoryReviewFlags.push('HIGH_OVERALL_RISK');
  if (input.pilotPerformance?.mandatoryKpiFailed) mandatoryReviewFlags.push('MANDATORY_PILOT_KPI_FAILED');

  let finalScore;
  if (pilotPerformance) {
    const w = config.weights.finalRecommendationPostPilot;
    finalScore = weightedAverage([
      { value: adjustedFit, weight: w.problemFit },
      { value: pilotPerformance.score, weight: w.pilotPerformance },
      { value: evidence.score, weight: w.evidenceConfidence },
      { value: scalability.score, weight: w.scalability },
      { value: governance.score, weight: w.governance },
      { value: inverseScore(overallRisk.score), weight: w.riskAdjusted },
      { value: financial.score, weight: w.financial },
      { value: security.score, weight: w.security },
    ]);
  } else {
    const w = config.weights.finalRecommendationPrePilot;
    finalScore = weightedAverage([
      { value: adjustedCapability, weight: w.capability },
      { value: adjustedFit, weight: w.problemFit },
      { value: evidence.score, weight: w.evidenceConfidence },
      { value: governance.score, weight: w.governance },
      { value: scalability.score, weight: w.scalability },
      { value: pilotReadiness.score, weight: w.pilotReadiness },
      { value: inverseScore(overallRisk.score), weight: w.riskAdjusted },
      { value: security.score, weight: w.security },
      { value: financial.score, weight: w.financial },
    ]);
  }
  finalScore = round(finalScore);

  let recommendation;
  if (eligibility.status === 'FAIL' || security.level === 'CRITICAL') recommendation = 'HOLD';
  else if (input.pilotPerformance?.mandatoryKpiFailed) recommendation = 'RE_PILOT';
  else if (evidence.score < 40 || overallRisk.level === 'CRITICAL') recommendation = 'MANUAL_REVIEW';
  else if (pilotPerformance) {
    if (finalScore >= 85 && overallRisk.level === 'LOW') recommendation = 'SCALE';
    else if (finalScore >= config.minimumScaleRecommendationScore) recommendation = 'SCALE_WITH_CONDITIONS';
    else if (finalScore >= 60) recommendation = 'EXTEND_PILOT';
    else if (finalScore >= 50) recommendation = 'RE_PILOT';
    else recommendation = 'DO_NOT_SCALE';
  } else if (finalScore >= 80 && pilotReadiness.score >= 70) recommendation = 'SCALE_WITH_CONDITIONS';
  else if (finalScore >= 65) recommendation = 'EXTEND_PILOT';
  else recommendation = 'MANUAL_REVIEW';

  const allReasons = [
    ...capability.reasons, ...problemFit.reasons, ...evidence.reasons,
    ...references.reasons, ...governance.reasons, ...financial.reasons,
    ...security.reasons, ...changeOfControl.reasons, ...antiGaming.reasons,
    ...scalability.reasons, ...pilotReadiness.reasons,
    ...(pilotPerformance?.reasons ?? []), ...overallRisk.reasons,
  ];
  const positiveFactors = allReasons.filter((r) => r.impact === 'POSITIVE').map((r) => `${r.label}: ${r.detail}`);
  const negativeFactors = allReasons.filter((r) => r.impact === 'NEGATIVE').map((r) => `${r.label}: ${r.detail}`);
  const missingOrWeakEvidence = [];
  if (evidence.score < 60) missingOrWeakEvidence.push('Overall evidence confidence is below the preferred review threshold.');
  if (input.references.verified < 1) missingOrWeakEvidence.push('No fully verified customer reference is currently available.');
  if (input.evidence.officialDatabaseVerification < 50) missingOrWeakEvidence.push('Official-source verification is limited.');
  if (input.pilotReadiness.measurementDesign < 50) missingOrWeakEvidence.push('Pilot measurement design needs stronger baseline/KPI evidence.');

  return {
    startupId: input.startupId,
    startupName: input.startupName,
    algorithmVersion: config.algorithmVersion,
    eligibility,
    scores: {
      startupCapability: capability.score,
      problemFit: problemFit.score,
      evidenceConfidence: evidence.score,
      governance: governance.score,
      scalability: scalability.score,
      financialSustainability: financial.score,
      pilotReadiness: pilotReadiness.score,
      securityReadiness: security.score,
      referenceVerification: references.score,
      overallRisk: overallRisk.score,
      changeOfControlRisk: changeOfControl.score,
      antiGamingRisk: antiGaming.score,
      pilotPerformance: pilotPerformance?.score ?? null,
      confidenceAdjustedProblemFit: adjustedFit,
      confidenceAdjustedCapability: adjustedCapability,
      finalScore,
    },
    riskLevel: overallRisk.level,
    recommendation,
    mandatoryReviewFlags,
    explanation: { positiveFactors, negativeFactors, missingOrWeakEvidence },
  };
}

export function compareStartups(startups, config = DEFAULT_EVALUATION_CONFIG) {
  const rank = (status) => status === 'PASS' ? 3 : status === 'CONDITIONAL_PASS' ? 2 : 1;
  return startups.map((startup) => evaluateStartup(startup, config)).sort((a, b) => {
    const eligibilityDifference = rank(b.eligibility.status) - rank(a.eligibility.status);
    return eligibilityDifference || b.scores.finalScore - a.scores.finalScore;
  });
}
