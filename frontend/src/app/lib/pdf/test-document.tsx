import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Test, ChatMessage, RunResult, AttemptResult } from '../../types/testing';
import { colors, fonts, spacing, commonStyles } from './theme';
import {
  BrandedHeader,
  PageFooter,
  Section,
  SectionWrap,
  CodeBlock,
  InfoRow,
  ChatBubble,
  StatusBanner,
  RiskScoreBar,
  BulletList,
} from './components';

const MITIGATION_LABELS: Record<string, string> = {
  delimiter_tokens: 'Delimiter Tokens',
  input_validation: 'Input Validation',
  pattern_matching: 'Pattern Matching',
  blocklist_filtering: 'Blocklist Filtering',
  output_sanitization: 'Output Sanitization',
  anomaly_detection: 'Anomaly Detection',
};

const styles = StyleSheet.create({
  titleText: {
    fontSize: fonts.title,
    fontFamily: 'Helvetica-Bold',
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  reasonLabel: {
    fontSize: fonts.body,
    fontFamily: 'Helvetica-Bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  reasonText: {
    fontSize: fonts.body,
    color: colors.text.secondary,
    lineHeight: 1.7,
    marginBottom: spacing.md,
  },
  timingRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  timingLabel: {
    fontSize: fonts.caption,
    fontFamily: 'Helvetica-Bold',
    color: colors.text.muted,
    width: 60,
  },
  timingValue: {
    fontSize: fonts.caption,
    color: colors.text.secondary,
  },
  emptyChat: {
    fontSize: fonts.body,
    color: colors.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  noAnalysis: {
    fontSize: fonts.body,
    color: colors.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  attemptRow: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  attemptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  attemptIndex: {
    fontSize: fonts.body,
    fontFamily: 'Helvetica-Bold',
    color: colors.text.primary,
  },
  attemptBadgeBlocked: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.status.yellowLight,
    borderWidth: 1,
    borderColor: colors.status.yellowBorder,
  },
  attemptBadgeCompromised: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.status.redLight,
    borderWidth: 1,
    borderColor: colors.status.redBorder,
  },
  attemptBadgeText: {
    fontSize: fonts.tiny,
    fontFamily: 'Helvetica-Bold',
  },
  attemptGoalLabel: {
    fontSize: fonts.caption,
    fontFamily: 'Helvetica-Bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  attemptMeta: {
    fontSize: fonts.caption,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  summarySnippet: {
    fontSize: fonts.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
});

function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, '').replace(/```/g, '').trim())
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '  - ')
    .replace(/^\s*\d+\.\s+/gm, (match) => `  ${match.trim()} `)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function attemptSnippet(attempt: AttemptResult, maxLen: number = 80): string {
  const raw = (attempt.goal || attempt.prompt || '').trim();
  const oneLine = raw.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= maxLen) return oneLine || '(no prompt)';
  return oneLine.slice(0, maxLen) + '…';
}

export function TestDocument({
  test,
  chatMessages,
  runResult,
  mitigationOptions,
}: {
  test: Test;
  chatMessages: ChatMessage[];
  runResult: RunResult | null;
  mitigationOptions?: { id: string; label: string }[];
}) {
  const modelDisplay =
    test.model.type === 'platform'
      ? test.model.model_id ?? 'Platform Model'
      : `External (${test.model.endpoint ?? 'custom endpoint'})`;

  const mitigationLabels = (test.environment?.mitigations ?? []).map((id) => {
    const fromOptions = mitigationOptions?.find((o) => o.id === id);
    if (fromOptions) return fromOptions.label;
    return MITIGATION_LABELS[id] ?? id;
  });

  const createdAt = test.created_at ? formatDateTime(test.created_at) : 'N/A';

  const nonPendingMessages = chatMessages.filter((m) => !m.pending);

  const attempts = (runResult?.attempts ?? []) as AttemptResult[];
  const hasGarakAttempts = attempts.length > 0;
  const totalAttempts = attempts.length;
  const blockedCount = attempts.filter((a) => a.blocked).length;
  const compromisedCount = attempts.filter((a) => a.compromised).length;
  const pctCompromised =
    totalAttempts > 0 ? Math.round((compromisedCount / totalAttempts) * 100) : 0;
  const notableAttempts = attempts.filter((a) => a.compromised || !a.blocked);

  return (
    <Document
      title={`Test Report — ${test.name}`}
      author="Prompt Injection Protection"
    >
      <Page size="A4" style={commonStyles.page}>
        <BrandedHeader reportType="Test Report" />
        <PageFooter />

        <Text style={styles.titleText}>{test.name}</Text>

        {/* Configuration */}
        <Section title="Configuration">
          <InfoRow label="Model" value={modelDisplay} />
          <InfoRow label="Model Type" value={test.model.type === 'platform' ? 'Platform' : 'External'} />
          <InfoRow label="Created" value={createdAt} />

          {test.environment?.system_prompt ? (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ fontSize: fonts.body, fontFamily: 'Helvetica-Bold', color: colors.text.primary, marginBottom: spacing.xs }}>
                System Prompt
              </Text>
              <CodeBlock>{test.environment.system_prompt}</CodeBlock>
            </View>
          ) : null}

          {mitigationLabels.length > 0 && (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ fontSize: fonts.body, fontFamily: 'Helvetica-Bold', color: colors.text.primary, marginBottom: spacing.xs }}>
                Active Mitigations
              </Text>
              <BulletList items={mitigationLabels} />
            </View>
          )}
        </Section>

        {/* Conversation Transcript */}
        <SectionWrap title="Conversation Transcript">
          {nonPendingMessages.length === 0 ? (
            <Text style={styles.emptyChat}>No messages in this test session.</Text>
          ) : (
            nonPendingMessages.map((msg) => (
              <ChatBubble key={msg.id} role={msg.role} content={stripMarkdown(msg.content)} />
            ))
          )}
        </SectionWrap>

        {/* Analysis Results */}
        <Section title="Analysis Results">
          {runResult ? (
            <View>
              <StatusBanner flagged={runResult.analysis.flagged} />
              <RiskScoreBar score={runResult.analysis.score} />

              <Text style={styles.reasonLabel}>Analysis Reason</Text>
              <Text style={styles.reasonText}>{runResult.analysis.reason}</Text>

              <View style={{ marginTop: spacing.sm }}>
                <View style={styles.timingRow}>
                  <Text style={styles.timingLabel}>Started</Text>
                  <Text style={styles.timingValue}>{formatDateTime(runResult.started_at)}</Text>
                </View>
                <View style={styles.timingRow}>
                  <Text style={styles.timingLabel}>Finished</Text>
                  <Text style={styles.timingValue}>{formatDateTime(runResult.finished_at)}</Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.noAnalysis}>No analysis results — test has not been run yet.</Text>
          )}
        </Section>

        {/* Garak Summary — only when run has attempts (framework/Garak run) */}
        {runResult && hasGarakAttempts && (
          <Section title="Garak Summary">
            <InfoRow label="Total attempts" value={String(totalAttempts)} />
            <InfoRow label="Blocked" value={String(blockedCount)} />
            <InfoRow label="Compromised" value={String(compromisedCount)} />
            <InfoRow label="% Compromised" value={`${pctCompromised}%`} />
            {runResult.report_html_url ? (
              <View style={{ marginTop: spacing.sm }}>
                <Text
                  style={{
                    fontSize: fonts.caption,
                    fontFamily: 'Helvetica-Bold',
                    color: colors.text.primary,
                    marginBottom: spacing.xs,
                  }}
                >
                  Detailed HTML report
                </Text>
                <Text style={{ fontSize: fonts.caption, color: colors.text.secondary }}>
                  {runResult.report_html_url}
                </Text>
              </View>
            ) : null}
            {notableAttempts.length > 0 && (
              <View style={{ marginTop: spacing.md }}>
                <Text
                  style={{
                    fontSize: fonts.body,
                    fontFamily: 'Helvetica-Bold',
                    color: colors.text.primary,
                    marginBottom: spacing.xs,
                  }}
                >
                  Notable attempts (compromised or reached model)
                </Text>
                {notableAttempts.map((a, i) => {
                  const idx = attempts.indexOf(a) + 1;
                  const status = a.compromised ? 'Compromised' : 'Reached model';
                  return (
                    <View key={i} style={{ marginBottom: spacing.xs }}>
                      <Text style={styles.attemptIndex}>
                        #{idx} — {status}
                      </Text>
                      <Text style={styles.summarySnippet}>{attemptSnippet(a)}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Section>
        )}

        {/* Appendix – Garak Attempts (full detail) */}
        {runResult && hasGarakAttempts && (
          <SectionWrap title="Appendix – Garak Attempts">
            {attempts.map((attempt, i) => (
              <View key={i} style={styles.attemptRow} wrap={false}>
                <View style={styles.attemptHeader}>
                  <Text style={styles.attemptIndex}>Attempt {i + 1}</Text>
                  {attempt.blocked && (
                    <View style={styles.attemptBadgeBlocked}>
                      <Text style={[styles.attemptBadgeText, { color: colors.status.yellow }]}>
                        BLOCKED
                      </Text>
                    </View>
                  )}
                  {attempt.compromised && (
                    <View style={styles.attemptBadgeCompromised}>
                      <Text style={[styles.attemptBadgeText, { color: colors.status.red }]}>
                        COMPROMISED
                      </Text>
                    </View>
                  )}
                </View>
                {attempt.goal ? (
                  <>
                    <Text style={styles.attemptGoalLabel}>Goal</Text>
                    <Text style={{ fontSize: fonts.body, color: colors.text.secondary, marginBottom: spacing.xs }}>
                      {attempt.goal}
                    </Text>
                  </>
                ) : null}
                <Text style={styles.attemptGoalLabel}>Prompt</Text>
                <CodeBlock>{attempt.prompt || '(none)'}</CodeBlock>
                <Text style={styles.attemptGoalLabel}>Output</Text>
                <CodeBlock variant={attempt.compromised ? 'red' : 'default'}>
                  {attempt.blocked ? '(blocked)' : (attempt.output ?? '(none)')}
                </CodeBlock>
                {attempt.statuses.length > 0 && (
                  <Text style={styles.attemptMeta}>
                    Statuses: [{attempt.statuses.join(', ')}]
                  </Text>
                )}
              </View>
            ))}
          </SectionWrap>
        )}
      </Page>
    </Document>
  );
}
