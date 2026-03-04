import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Test, ChatMessage, RunResult } from '../../types/testing';
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
      </Page>
    </Document>
  );
}
