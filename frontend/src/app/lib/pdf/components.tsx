import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors, fonts, spacing } from './theme';

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerBar: {
    flexDirection: 'row',
    height: 6,
  },
  headerBarLeft: {
    flex: 1,
    backgroundColor: colors.brand.orange,
  },
  headerBarRight: {
    flex: 1,
    backgroundColor: colors.brand.magenta,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 40,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerLeft: {},
  headerProjectName: {
    fontSize: fonts.tiny,
    fontFamily: 'Helvetica',
    color: colors.text.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerReportType: {
    fontSize: fonts.subheading,
    fontFamily: 'Helvetica-Bold',
    color: colors.text.primary,
  },
  headerDate: {
    fontSize: fonts.caption,
    color: colors.text.muted,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingBottom: spacing.lg,
  },
  footerDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginBottom: spacing.sm,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: fonts.tiny,
    color: colors.text.light,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border.light,
  },
  sectionAccent: {
    width: 3,
    height: 14,
    backgroundColor: colors.brand.orange,
    borderRadius: 1.5,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: fonts.heading,
    fontFamily: 'Helvetica-Bold',
    color: colors.text.primary,
  },
  codeBlockContainer: {
    backgroundColor: colors.bg.codeBlock,
    borderRadius: 6,
    padding: spacing.md,
    marginVertical: spacing.xs,
  },
  codeBlockRedContainer: {
    backgroundColor: '#2D1215',
    borderRadius: 6,
    padding: spacing.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: '#5C1D24',
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 8.5,
    color: colors.bg.codeText,
    lineHeight: 1.5,
  },
  codeTextRed: {
    fontFamily: 'Courier',
    fontSize: 8.5,
    color: '#FCA5A5',
    lineHeight: 1.5,
  },
  badgeHigh: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: colors.status.redLight,
    borderWidth: 1,
    borderColor: colors.status.redBorder,
  },
  badgeMedium: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: colors.status.yellowLight,
    borderWidth: 1,
    borderColor: colors.status.yellowBorder,
  },
  badgeLow: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgeTextHigh: {
    fontSize: fonts.caption,
    fontFamily: 'Helvetica-Bold',
    color: colors.status.red,
  },
  badgeTextMedium: {
    fontSize: fonts.caption,
    fontFamily: 'Helvetica-Bold',
    color: colors.status.yellow,
  },
  badgeTextLow: {
    fontSize: fonts.caption,
    fontFamily: 'Helvetica-Bold',
    color: '#2563EB',
  },
  tagContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.bg.subtle,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagText: {
    fontSize: fonts.tiny,
    color: colors.text.muted,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  infoLabel: {
    fontSize: fonts.body,
    fontFamily: 'Helvetica-Bold',
    color: colors.text.primary,
    width: 110,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: fonts.body,
    color: colors.text.secondary,
    flex: 1,
  },
  comparisonBox: {
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  comparisonHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  comparisonHeaderText: {
    fontSize: fonts.caption,
    fontFamily: 'Helvetica-Bold',
  },
  comparisonBody: {
    padding: spacing.md,
  },
  comparisonBodyText: {
    fontSize: fonts.body,
    color: colors.text.secondary,
    lineHeight: 1.6,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    paddingRight: spacing.lg,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand.orange,
    marginTop: 4,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: fonts.body,
    color: colors.text.secondary,
    lineHeight: 1.6,
    flex: 1,
  },
  numberedRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    paddingRight: spacing.lg,
  },
  numberedIndex: {
    fontSize: fonts.body,
    color: colors.text.muted,
    width: 16,
    flexShrink: 0,
  },
  numberedText: {
    fontSize: fonts.body,
    color: colors.text.secondary,
    lineHeight: 1.6,
    flex: 1,
  },
});

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function BrandedHeader({ reportType }: { reportType: string }) {
  return (
    <View style={styles.headerContainer} fixed>
      <View style={styles.headerBar}>
        <View style={styles.headerBarLeft} />
        <View style={styles.headerBarRight} />
      </View>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerProjectName}>Prompt Injection Protection</Text>
          <Text style={styles.headerReportType}>{reportType}</Text>
        </View>
        <Text style={styles.headerDate}>{formatDate(new Date())}</Text>
      </View>
    </View>
  );
}

export function PageFooter() {
  return (
    <View style={styles.footerContainer} fixed>
      <View style={styles.footerDivider} />
      <View style={styles.footerContent}>
        <Text style={styles.footerText}>Prompt Injection Protection</Text>
        <Text
          style={styles.footerText}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>
    </View>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionContainer} wrap={false}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function SectionWrap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function CodeBlock({ children, variant = 'default' }: { children: string; variant?: 'default' | 'red' }) {
  const isRed = variant === 'red';
  return (
    <View style={isRed ? styles.codeBlockRedContainer : styles.codeBlockContainer}>
      <Text style={isRed ? styles.codeTextRed : styles.codeText}>{children}</Text>
    </View>
  );
}

export function ImpactBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const badgeStyle =
    level === 'high' ? styles.badgeHigh : level === 'medium' ? styles.badgeMedium : styles.badgeLow;
  const textStyle =
    level === 'high' ? styles.badgeTextHigh : level === 'medium' ? styles.badgeTextMedium : styles.badgeTextLow;
  return (
    <View style={badgeStyle}>
      <Text style={textStyle}>{level.toUpperCase()}</Text>
    </View>
  );
}

export function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tagContainer}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function ComparisonBox({
  headerLabel,
  headerColor,
  borderColor,
  bgColor,
  children,
}: {
  headerLabel: string;
  headerColor: string;
  borderColor: string;
  bgColor: string;
  children: string;
}) {
  return (
    <View style={[styles.comparisonBox, { borderColor }]}>
      <View style={[styles.comparisonHeader, { backgroundColor: bgColor }]}>
        <Text style={[styles.comparisonHeaderText, { color: headerColor }]}>{headerLabel}</Text>
      </View>
      <View style={styles.comparisonBody}>
        <Text style={styles.comparisonBodyText}>{children}</Text>
      </View>
    </View>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function NumberedList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} style={styles.numberedRow}>
          <Text style={styles.numberedIndex}>{idx + 1}.</Text>
          <Text style={styles.numberedText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function StatusBanner({ flagged }: { flagged: boolean }) {
  const bgColor = flagged ? colors.status.redLight : colors.status.greenLight;
  const borderColor = flagged ? colors.status.redBorder : colors.status.greenBorder;
  const textColor = flagged ? colors.status.red : colors.status.green;
  const label = flagged ? 'PROMPT INJECTION DETECTED' : 'SAFE PROMPT';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: 6,
        backgroundColor: bgColor,
        borderWidth: 1,
        borderColor,
        marginBottom: spacing.sm,
      }}
    >
      <Text style={{ fontSize: fonts.subheading, fontFamily: 'Helvetica-Bold', color: textColor }}>
        {label}
      </Text>
    </View>
  );
}

export function RiskScoreBar({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const barColor = score > 0.7 ? colors.status.red : score > 0.4 ? colors.status.yellow : colors.status.green;
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <Text style={{ fontSize: fonts.body, fontFamily: 'Helvetica-Bold', color: colors.text.primary }}>
          Risk Score
        </Text>
        <Text style={{ fontSize: fonts.body, fontFamily: 'Helvetica-Bold', color: barColor }}>
          {percentage}%
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: '#E5E7EB',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: barColor,
            width: `${percentage}%`,
          }}
        />
      </View>
    </View>
  );
}

export function ChatBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  const accentColor = isUser ? colors.brand.orange : colors.border.medium;
  return (
    <View
      style={{
        flexDirection: 'row',
        marginBottom: spacing.sm,
      }}
    >
      <View
        style={{
          width: 3,
          backgroundColor: accentColor,
          borderRadius: 1.5,
          marginRight: spacing.sm,
          flexShrink: 0,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: fonts.caption,
            fontFamily: 'Helvetica-Bold',
            color: isUser ? colors.brand.orange : colors.text.muted,
            marginBottom: 2,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {isUser ? 'User' : 'Assistant'}
        </Text>
        <Text style={{ fontSize: fonts.body, color: colors.text.secondary, lineHeight: 1.6 }}>
          {content}
        </Text>
      </View>
    </View>
  );
}
