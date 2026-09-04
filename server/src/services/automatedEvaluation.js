import { evaluateStartup } from './evaluationEngine.js';

const UNKNOWN = 50;

/**
 * Convert the records AVSAR already captures into the richer input expected by
 * the evidence engine. Values which AVSAR cannot currently prove are kept at a
 * neutral/conservative baseline and are disclosed in `limitations`; they are
 * never silently treated as verified facts.
 */
export function buildEvaluationInput({ application, startup, challenge, coiDeclared }) {
  const snapshot = safeJson(application.eligibility_snapshot, {});
  const checks = snapshot.eligibility?.checks ?? [];
  const fitGates = snapshot.fit?.gates ?? [];
  const attachments = safeJson(application.attachments, []);
  const capabilities = safeJson(startup.capabilities, []);
  const tags = safeJson(challenge.tags, []);
  const kpis = safeJson(challenge.success_kpis, []);
  const combinedText = [
    application.solution_summary,
    application.approach,
    application.differentiators,
    application.risks,
    application.prior_deployments,
  ].filter(Boolean).join(' ');

  const passedCheck = (code, fallback = false) => checks.find((c) => c.code === code)?.pass ?? fallback;
  const eligibilityPassRate = checks.length
    ? (checks.filter((c) => c.pass).length / checks.length) * 100
    : (startup.eligibility_status === 'ELIGIBLE' ? 75 : 40);
  const fitPassRate = fitGates.length
    ? (fitGates.filter((g) => g.pass).length / fitGates.length) * 100
    : (application.status === 'ELIGIBILITY_FAIL' ? 30 : 70);
  const trlScore = clamp((Number(application.trl_claimed || startup.trl || 0) / 9) * 100);
  const teamScore = scaleCount(application.team_size, 3, 15, 35, 90);
  const companyCapacity = scaleCount(startup.employees, 5, 50, 35, 90);
  const documentScore = clamp(25 + attachments.length * 18, 25, 90);
  const applicationCompleteness = average(
    textScore(application.solution_summary, 180),
    textScore(application.approach, 180),
    textScore(application.differentiators, 100),
    textScore(application.risks, 100),
  );
  const hasPriorEvidence = Boolean(application.prior_deployments?.trim());
  const priorGovernmentDelivery = Number(startup.has_prior_govt_order) === 1;
  const priorEvidenceScore = priorGovernmentDelivery ? 78 : hasPriorEvidence ? 52 : 25;
  const budgetCompatibility = ratioScore(challenge.pilot_budget_ceiling, application.quoted_pilot_cost);
  const allowedWeeks = Math.max(1, Number(challenge.pilot_duration_months || 6) * 4.345);
  const timelineCompatibility = ratioScore(allowedWeeks, application.timeline_weeks);
  const exactSector = normal(startup.sector) === normal(challenge.sector);
  const capabilityHits = tags.filter((tag) => capabilities.map(normal).includes(normal(tag))).length;
  const capabilityScore = tags.length
    ? clamp(35 + (capabilityHits / tags.length) * 65)
    : clamp(Number(application.match_score) || (exactSector ? 70 : 45));
  const sameGeography = challenge.level === 'CENTRAL' || (
    normal(startup.state) && normal(startup.state) === normal(challenge.state)
  );
  const approachQuality = textScore(application.approach, 240);
  const riskDisclosure = textScore(application.risks, 150);
  const profileCompleteness = clamp(Number(startup.profile_completeness) || 50);
  const regulatoryScore = average(eligibilityPassRate, startup.kyc_status === 'VERIFIED' ? 90 : 45);
  const integrationMention = mentions(combinedText, ['api', 'integration', 'interoperab', 'sync', 'existing system']);
  const offlineMention = mentions(combinedText, ['offline', 'low bandwidth', 'low-bandwidth', 'store and forward']);
  const languageMention = mentions(combinedText, ['multilingual', 'vernacular', 'language', 'hindi']);
  const securityMention = mentions(combinedText, ['security', 'privacy', 'dpdp', 'encryption', 'access control']);
  const portabilityMention = mentions(combinedText, ['export', 'portab', 'open standard', 'handover']);
  const duplicateDocuments = attachments.length - new Set(attachments.map((a) => normal(a.name))).size;
  const turnover = Number(startup.turnover_last_fy || 0);
  const quote = Number(application.quoted_pilot_cost || 0);
  const capitalRatio = quote > 0 ? turnover / quote : 0;
  const capitalStrength = clamp(30 + Math.min(capitalRatio, 2) * 30);
  const registrationValid = passedCheck('ENTITY_AGE', startup.eligibility_status === 'ELIGIBLE')
    && passedCheck('ENTITY_TYPE', startup.eligibility_status === 'ELIGIBLE');
  const recognitionValid = passedCheck('DPIIT_RECOGNITION', Boolean(startup.dpiit_number))
    && passedCheck('DPIIT_VALIDITY', Boolean(startup.dpiit_number));
  const technicalGatesPassed = snapshot.fit?.pass ?? (application.status !== 'ELIGIBILITY_FAIL');

  const input = {
    // Keep the blind first pass intact. The engine does not require legal identity.
    startupId: application.code,
    startupName: 'Blinded applicant',
    eligibility: {
      registrationValid,
      requiredRecognitionSatisfied: recognitionValid,
      mandatoryDocumentsComplete: attachments.length >= 2,
      mandatoryTechnicalRequirementsSatisfied: technicalGatesPassed,
      debarred: false,
      conflictsDeclared: Boolean(coiDeclared),
      requiredCertificationsSatisfied: challenge.security_clearance
        ? startup.kyc_status === 'VERIFIED'
        : recognitionValid,
    },
    team: {
      executionCapacity: average(teamScore, companyCapacity),
      technicalLeadership: average(trlScore, approachQuality),
      supportCapacity: companyCapacity,
      keyPersonDependency: clamp(100 - teamScore),
    },
    technology: {
      maturity: trlScore,
      architectureQuality: approachQuality,
      integrationReadiness: integrationMention ? 78 : UNKNOWN,
      offlineCapability: offlineMention ? 82 : UNKNOWN,
      multilingualSupport: languageMention ? 80 : UNKNOWN,
    },
    evidence: {
      officialDatabaseVerification: regulatoryScore,
      independentValidation: priorGovernmentDelivery ? 72 : 30,
      verifiedCustomerReferences: priorGovernmentDelivery ? 75 : hasPriorEvidence ? 40 : 20,
      auditedDocuments: attachments.length >= 3 ? 68 : documentScore,
      supportingDocuments: documentScore,
      selfDeclaredClaims: applicationCompleteness,
      unsupportedClaims: clamp(100 - average(documentScore, priorEvidenceScore)),
    },
    references: {
      totalSubmitted: hasPriorEvidence ? 1 : 0,
      verified: priorGovernmentDelivery ? 1 : 0,
      partiallyVerified: hasPriorEvidence && !priorGovernmentDelivery ? 1 : 0,
      unverified: hasPriorEvidence ? 0 : 1,
      contradicted: 0,
      reliability: priorEvidenceScore,
      deliveryTimeliness: priorGovernmentDelivery ? 65 : UNKNOWN,
      supportResponsiveness: priorGovernmentDelivery ? 65 : UNKNOWN,
      scalabilityFeedback: priorGovernmentDelivery ? 65 : UNKNOWN,
    },
    operations: {
      relevantDeployments: priorEvidenceScore,
      deliveryHistory: priorEvidenceScore,
      currentCapacity: average(teamScore, companyCapacity),
      maximumDemonstratedScale: priorGovernmentDelivery ? 75 : hasPriorEvidence ? 55 : 30,
      deploymentSpeed: timelineCompatibility,
      supportStructure: companyCapacity,
      businessContinuity: average(companyCapacity, capitalStrength),
    },
    governance: {
      disclosureCompleteness: average(profileCompleteness, applicationCompleteness),
      regulatoryCompliance: regulatoryScore,
      conflictOfInterestQuality: Boolean(coiDeclared) ? 100 : 0,
      documentConsistency: fitPassRate,
      leadershipContinuity: average(companyCapacity, profileCompleteness),
      vendorDependency: UNKNOWN,
      litigationDeliveryRisk: UNKNOWN,
    },
    financials: {
      runwayStrength: capitalStrength,
      workingCapitalStrength: capitalStrength,
      paymentDependencyRisk: clamp(100 - capitalStrength),
      scalingCapitalReadiness: average(capitalStrength, companyCapacity),
      burnRisk: UNKNOWN,
    },
    security: {
      securityReadiness: securityMention ? 72 : 42,
      privacyArchitecture: securityMention ? 70 : 42,
      incidentResponse: UNKNOWN,
      accessControl: securityMention ? 65 : 45,
      certificationCoverage: startup.kyc_status === 'VERIFIED' ? 55 : 35,
      criticalVulnerabilities: UNKNOWN,
    },
    changeOfControl: {
      ipOwnershipClarity: challenge.ip_terms ? 80 : UNKNOWN,
      dataPortability: portabilityMention ? 72 : 42,
      sourceCodeContinuity: UNKNOWN,
      transitionPlan: portabilityMention ? 65 : 40,
      vendorLockInRisk: portabilityMention ? 35 : UNKNOWN,
      acquisitionContinuityRisk: UNKNOWN,
    },
    antiGaming: {
      contradictoryAnswers: fitGates.some((g) => !g.pass) ? 35 : 5,
      unsupportedPerformanceClaims: clamp(100 - average(documentScore, priorEvidenceScore)),
      conflictingDates: timelineCompatibility < 40 ? 35 : 5,
      duplicateDocuments: clamp(duplicateDocuments * 25),
      impossibleScaleClaims: Number(application.trl_claimed || 0) > Number(startup.trl || 0) + 2 ? 60 : 5,
      suddenMaterialEdits: 0,
    },
    problemFit: {
      mandatoryCapabilityMatch: average(capabilityScore, fitPassRate),
      technicalCompatibility: average(trlScore, fitPassRate),
      relevantProblemExperience: priorEvidenceScore,
      deploymentEnvironmentCompatibility: challenge.deployment_env ? 65 : UNKNOWN,
      integrationCompatibility: integrationMention ? 78 : UNKNOWN,
      budgetCompatibility,
      timelineCompatibility,
      geographicContextCompatibility: sameGeography ? 80 : 55,
      languageAccessibilityCompatibility: languageMention ? 80 : UNKNOWN,
    },
    scalability: {
      architectureScalability: average(approachQuality, integrationMention ? 75 : UNKNOWN),
      infrastructureEfficiency: offlineMention ? 75 : UNKNOWN,
      costScalability: budgetCompatibility,
      staffingScalability: average(teamScore, companyCapacity),
      multiLocationSupport: priorGovernmentDelivery ? 78 : hasPriorEvidence ? 58 : 35,
      multiLanguageSupport: languageMention ? 80 : UNKNOWN,
      lowBandwidthSupport: offlineMention ? 82 : UNKNOWN,
      deploymentRepeatability: priorGovernmentDelivery ? 75 : hasPriorEvidence ? 55 : 35,
    },
    pilotReadiness: {
      technologyReadiness: trlScore,
      implementationPlan: approachQuality,
      teamAvailability: teamScore,
      integrationReadiness: integrationMention ? 78 : UNKNOWN,
      securityReadiness: securityMention ? 72 : 42,
      dataReadiness: challenge.data_availability ? 68 : UNKNOWN,
      measurementDesign: kpis.length ? 85 : 25,
      rollbackPlan: riskDisclosure >= 65 ? 58 : 35,
      riskMitigationPlan: riskDisclosure,
      supportAvailability: companyCapacity,
    },
  };

  return {
    input,
    inputBasis: {
      generatedAt: new Date().toISOString(),
      source: 'AVSAR application, startup, challenge and eligibility records',
      derived: true,
      limitations: [
        'AVSAR does not yet store a debarment registry result; no debarment was assumed for this calculation.',
        'Customer references are inferred from the prior-deployments declaration and government-order flag; no live reference check was performed.',
        'Runway, burn rate and audited working capital are not captured; financial scores are conservative estimates from recorded turnover and pilot quote.',
        'Security testing, vulnerability scans, incident response and certification evidence are not captured; unverified security fields receive conservative baseline scores.',
        'Change-of-control, litigation and vendor-dependency evidence is not captured; those fields receive neutral or conservative baseline scores.',
        'This is a deterministic evidence algorithm, not a generative-AI opinion and not an autonomous procurement award.',
      ],
    },
  };
}

export function runAutomatedEvaluation(records) {
  const { input, inputBasis } = buildEvaluationInput(records);
  return { result: evaluateStartup(input), inputBasis };
}

export function toCommitteeRecommendation(engineRecommendation) {
  if (engineRecommendation === 'SCALE' || engineRecommendation === 'EXTEND_PILOT') return 'RECOMMEND';
  if (['SCALE_WITH_CONDITIONS', 'RE_PILOT', 'MANUAL_REVIEW'].includes(engineRecommendation)) {
    return 'RECOMMEND_WITH_CONDITIONS';
  }
  return 'NOT_RECOMMEND';
}

export function automatedRemarks(result, inputBasis) {
  const factors = result.explanation.negativeFactors.slice(0, 2);
  const flags = result.mandatoryReviewFlags.length
    ? ` Review flags: ${result.mandatoryReviewFlags.join(', ')}.`
    : '';
  const factorText = factors.length ? ` Key concerns: ${factors.join(' ')}` : '';
  return `Automated evidence evaluation v${result.algorithmVersion}: ${result.recommendation}. Final score ${result.scores.finalScore}/100; overall risk ${result.riskLevel} (${result.scores.overallRisk}/100).${flags}${factorText} ${inputBasis.limitations[5]}`;
}

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));
const average = (...values) => values.reduce((sum, value) => sum + clamp(value), 0) / Math.max(values.length, 1);
const normal = (value) => String(value ?? '').trim().toLowerCase();
const mentions = (text, terms) => terms.some((term) => normal(text).includes(normal(term)));
const textScore = (text, fullAt) => clamp(30 + (Math.min(String(text ?? '').trim().length, fullAt) / fullAt) * 60);
const scaleCount = (value, low, high, floor, ceiling) => {
  const n = Number(value) || 0;
  if (n <= low) return floor;
  if (n >= high) return ceiling;
  return floor + ((n - low) / (high - low)) * (ceiling - floor);
};
const ratioScore = (ceiling, actual) => {
  const max = Number(ceiling) || 0;
  const used = Number(actual) || 0;
  if (max <= 0 || used <= 0) return 30;
  if (used > max) return clamp(50 - ((used - max) / max) * 100);
  return clamp(70 + ((max - used) / max) * 30);
};
const safeJson = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
};
