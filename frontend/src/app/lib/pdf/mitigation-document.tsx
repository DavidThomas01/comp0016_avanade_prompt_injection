import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Mitigation, CodeLanguage } from '../../data/mitigations';
import { colors, fonts, spacing, commonStyles } from './theme';
import {
  BrandedHeader,
  PageFooter,
  Section,
  SectionWrap,
  CodeBlock,
  NumberedList,
} from './components';

const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  pseudo: 'Pseudo-code',
  python: 'Python',
  java: 'Java',
};

const METRIC_COLORS: Record<string, string> = {
  'bg-green-500': '#22C55E',
  'bg-yellow-500': '#EAB308',
  'bg-red-500': '#EF4444',
  'bg-blue-500': '#3B82F6',
  'bg-orange-500': '#F97316',
};

function resolveMetricColor(tailwindClass: string): string {
  return METRIC_COLORS[tailwindClass] ?? '#6B7280';
}

const styles = StyleSheet.create({
  titleBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleText: {
    fontSize: fonts.title,
    fontFamily: 'Helvetica-Bold',
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.md,
  },
  codeBasedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  codeBasedText: {
    fontSize: fonts.caption,
    fontFamily: 'Helvetica-Bold',
    color: '#16A34A',
  },
  nonCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nonCodeText: {
    fontSize: fonts.caption,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
  },
  description: {
    fontSize: fonts.body,
    color: colors.text.secondary,
    lineHeight: 1.7,
    marginBottom: spacing.lg,
  },
  detailParagraph: {
    fontSize: fonts.body,
    color: colors.text.secondary,
    lineHeight: 1.7,
    marginBottom: spacing.sm,
  },
  strategyText: {
    fontSize: fonts.body,
    color: colors.text.secondary,
    lineHeight: 1.7,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metricLabel: {
    fontSize: fonts.body,
    fontFamily: 'Helvetica-Bold',
    color: colors.text.primary,
    width: 90,
    flexShrink: 0,
  },
  metricBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  metricValue: {
    fontSize: fonts.caption,
    fontFamily: 'Helvetica-Bold',
    width: 30,
    textAlign: 'right',
  },
  implHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  implLanguageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.orange,
    marginRight: spacing.sm,
  },
  implLanguageName: {
    fontSize: fonts.body,
    fontFamily: 'Helvetica-Bold',
    color: colors.text.primary,
  },
  nonCodeNote: {
    fontSize: fonts.body,
    color: colors.text.muted,
    fontStyle: 'italic',
    lineHeight: 1.6,
  },
});

export function MitigationDocument({
  mitigation,
  languages,
}: {
  mitigation: Mitigation;
  languages?: CodeLanguage[];
}) {
  const allAvailable = (Object.keys(mitigation.implementations) as CodeLanguage[]).filter(
    (lang) => !!mitigation.implementations[lang],
  );
  const availableImpls = languages
    ? allAvailable.filter((lang) => languages.includes(lang))
    : allAvailable;

  return (
    <Document
      title={`Mitigation Report — ${mitigation.name}`}
      author="Prompt Injection Protection"
      subject={mitigation.description}
    >
      <Page size="A4" style={commonStyles.page}>
        <BrandedHeader reportType="Mitigation Report" />
        <PageFooter />

        {/* Title + Badge */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>{mitigation.name}</Text>
          <View style={mitigation.codeBased ? styles.codeBasedBadge : styles.nonCodeBadge}>
            <Text style={mitigation.codeBased ? styles.codeBasedText : styles.nonCodeText}>
              {mitigation.codeBased ? 'CODE-BASED' : 'NON-CODE'}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>{mitigation.description}</Text>

        {/* What It Does */}
        <Section title="What It Does">
          {mitigation.details.map((paragraph, idx) => (
            <Text key={idx} style={styles.detailParagraph}>
              {paragraph}
            </Text>
          ))}
        </Section>

        {/* Strategy */}
        <Section title="Strategy">
          <Text style={styles.strategyText}>{mitigation.strategy}</Text>
        </Section>

        {/* Metrics */}
        {mitigation.metrics.length > 0 && (
          <Section title="Metrics">
            {mitigation.metrics.map((metric, idx) => {
              const barColor = resolveMetricColor(metric.color);
              return (
                <View key={idx} style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <View style={styles.metricBarBg}>
                    <View
                      style={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: barColor,
                        width: `${metric.value}%`,
                      }}
                    />
                  </View>
                  <Text style={[styles.metricValue, { color: barColor }]}>{metric.value}%</Text>
                </View>
              );
            })}
          </Section>
        )}

        {/* Defense Flow */}
        <Section title="Typical Defense Flow">
          <NumberedList items={mitigation.defenseFlow} />
        </Section>

        {/* Implementations */}
        <SectionWrap title="Reference Implementations">
          {mitigation.codeBased ? (
            availableImpls.length > 0 ? (
              availableImpls.map((lang) => (
                <View key={lang} style={{ marginBottom: spacing.md }}>
                  <View style={styles.implHeader}>
                    <View style={styles.implLanguageDot} />
                    <Text style={styles.implLanguageName}>{LANGUAGE_LABELS[lang] ?? lang}</Text>
                  </View>
                  <CodeBlock>{mitigation.implementations[lang]!}</CodeBlock>
                </View>
              ))
            ) : (
              <Text style={styles.nonCodeNote}>No implementation snippets available.</Text>
            )
          ) : (
            <Text style={styles.nonCodeNote}>
              This mitigation is primarily model-level, training-level, or process-level. It is not
              typically implemented as a single runtime code module.
            </Text>
          )}
        </SectionWrap>
      </Page>
    </Document>
  );
}
