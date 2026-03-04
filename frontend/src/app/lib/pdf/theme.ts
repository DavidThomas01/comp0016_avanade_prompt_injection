import { StyleSheet } from '@react-pdf/renderer';

export const colors = {
  brand: {
    orange: '#FF5800',
    orangeLight: '#FF7A33',
    magenta: '#A4005A',
  },
  status: {
    red: '#DC2626',
    redLight: '#FEF2F2',
    redBorder: '#FECACA',
    green: '#16A34A',
    greenLight: '#F0FDF4',
    greenBorder: '#BBF7D0',
    yellow: '#CA8A04',
    yellowLight: '#FEFCE8',
    yellowBorder: '#FEF08A',
  },
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    muted: '#6B7280',
    light: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  bg: {
    page: '#FFFFFF',
    subtle: '#F9FAFB',
    codeBlock: '#1E1B2E',
    codeText: '#E2E8F0',
    headerBar: '#FF5800',
  },
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
  },
} as const;

export const fonts = {
  title: 18,
  heading: 13,
  subheading: 11,
  body: 9.5,
  caption: 8,
  tiny: 7,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const commonStyles = StyleSheet.create({
  page: {
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: fonts.body,
    color: colors.text.primary,
    backgroundColor: colors.bg.page,
  },
  sectionTitle: {
    fontSize: fonts.heading,
    fontFamily: 'Helvetica-Bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  bodyText: {
    fontSize: fonts.body,
    color: colors.text.secondary,
    lineHeight: 1.6,
  },
  codeBlock: {
    backgroundColor: colors.bg.codeBlock,
    borderRadius: 6,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 8.5,
    color: colors.bg.codeText,
    lineHeight: 1.5,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: fonts.caption,
    fontFamily: 'Helvetica-Bold',
  },
  bulletPoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand.orange,
    marginTop: 4,
    marginRight: spacing.sm,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginVertical: spacing.md,
  },
});
