/**
 * ------------------------------------------------------------------
 * ProfileScreen — SHARED, STACK SCREEN
 * ------------------------------------------------------------------
 * Cross-role "Profile" destination reached from every role's More
 * sheet. Reads identity fields (name, email, phones) from the user
 * slice and pads out the demo with a mock address / DOB / gender
 * block until the backend adds those to /me.
 *
 * LAYOUT (top → bottom):
 *   [Back  Profile  Edit]
 *   [Hero card — avatar + name + phone + email + category chip]
 *   [Personal Information]
 *     Full Name / Email / Mobile / DOB / Gender
 *   [Address Information]
 *     Address / City / State / Pincode / Country
 *
 * EACH ROW:
 *   [icon in tinted circle]  [label]  [value]  [chevron]
 *
 * SCOPE (this pass — UI only):
 *   The rows are `Pressable` so the affordance matches the mockup,
 *   but taps no-op today. When per-field edit sheets ship, branch
 *   on the row `key` inside `onRowPress`.
 *
 * WHY IT LIVES IN /shared/:
 *   Every role reaches this screen; content is role-agnostic today.
 *   When (or if) UC / vendor / driver ever need to see different
 *   fields, branch on `selectUserRole` inside this component — do
 *   not fork per-role copies.
 * ------------------------------------------------------------------
 */

import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Building2,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Globe,
  Map,
  MapPin,
  Mars,
  Mail,
  Pencil,
  Phone,
  User,
} from 'lucide-react-native';

import { SafeScreen } from '@shared/components';
import { Colors, Radius, Shadows, Spacing, Typography } from '@theme';
import {
  selectDisplayName,
  selectUserEmail,
  selectUserPhoneIndia,
} from '@store/selectors/userSelectors';

/* ================================================================
 * Local icon palette
 * ================================================================ *
 * The theme covers primary / accent / info / error / secondary but
 * has no purple, and the mockup uses purple for the Gender and
 * Country tiles. Kept as file-local constants so we don't pollute
 * the theme with a colour used on exactly one screen; if a third
 * screen wants purple tiles, promote these to `theme/colors.ts`.
 */
const ICON_PURPLE = '#8B5CF6';
const ICON_PURPLE_TINT = '#EDE9FE';

/* Pink pair — used for DOB and Pincode. `Colors.error` is too
 * shouty for a static label; the mockup shows a softer pink. */
const ICON_PINK = '#EF4444';
const ICON_PINK_TINT = '#FEE2E2';

/* ================================================================
 * Demo data
 * ================================================================ *
 * `UserProfile` currently only carries name / email / phones (see
 * store/slices/userSlice.ts). The mockup shows DOB, gender, and a
 * full postal address block — this constant supplies them for the
 * UI-only pass. When `/me` returns these fields, delete the object
 * and read from the selectors instead.
 */
const MOCK_EXTRA = {
  dob: '12 Jan 1995',
  gender: 'Male',
  category: 'Individual Customer',
  addressLine: '123, MG Road, Sector 14\nGurugram, Haryana - 122001',
  city: 'Gurugram',
  state: 'Haryana',
  pincode: '122001',
  country: 'India',
};

/* ================================================================
 * Row-config shape — data-driven so the render loop stays tiny
 * ================================================================ */

type IconComp = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type RowDef = {
  key: string;
  label: string;
  value: string;
  Icon: IconComp;
  fg: string;
  bg: string;
};

/* ================================================================
 * Utilities
 * ================================================================ */

/** "Aman Gupta" → "AG"; "Aman" → "A"; "" → "?" */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

/* ================================================================
 * Screen
 * ================================================================ */

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();

  const displayName = useSelector(selectDisplayName);
  const email = useSelector(selectUserEmail);
  const phone = useSelector(selectUserPhoneIndia);

  const initials = initialsOf(displayName || 'User');

  /* -------- Handlers (UI-only no-ops for now) -------- */
  const onBack = useCallback(() => navigation.goBack(), [navigation]);
  const onEdit = useCallback(() => {
    // TODO(nav): open profile edit sheet
  }, []);
  const onAvatarChange = useCallback(() => {
    // TODO: launch photo picker (react-native-image-picker is in deps)
  }, []);
  const onRowPress = useCallback((_key: string) => {
    // TODO(nav): open per-field edit sheet keyed by `_key`
  }, []);

  /* -------- Row configs -------- *
   * Declared inline so the list order is obvious at a glance and
   * icons/colours track the mockup 1-to-1. */
  const personal: RowDef[] = [
    {
      key: 'name',
      label: 'Full Name',
      value: displayName,
      Icon: User,
      fg: Colors.primary,
      bg: Colors.primaryTint,
    },
    {
      key: 'email',
      label: 'Email Address',
      value: email,
      Icon: Mail,
      fg: Colors.accent,
      bg: Colors.accentTint,
    },
    {
      key: 'phone',
      label: 'Mobile Number',
      value: phone,
      Icon: Phone,
      fg: Colors.info,
      bg: Colors.infoTint,
    },
    {
      key: 'dob',
      label: 'Date of Birth',
      value: MOCK_EXTRA.dob,
      Icon: Calendar,
      fg: ICON_PINK,
      bg: ICON_PINK_TINT,
    },
    {
      key: 'gender',
      label: 'Gender',
      value: MOCK_EXTRA.gender,
      Icon: Mars,
      fg: ICON_PURPLE,
      bg: ICON_PURPLE_TINT,
    },
  ];

  const address: RowDef[] = [
    {
      key: 'address',
      label: 'Address',
      value: MOCK_EXTRA.addressLine,
      Icon: MapPin,
      fg: Colors.primary,
      bg: Colors.primaryTint,
    },
    {
      key: 'city',
      label: 'City',
      value: MOCK_EXTRA.city,
      Icon: Building2,
      fg: Colors.accent,
      bg: Colors.accentTint,
    },
    {
      key: 'state',
      label: 'State',
      value: MOCK_EXTRA.state,
      Icon: Map,
      fg: Colors.info,
      bg: Colors.infoTint,
    },
    {
      key: 'pincode',
      label: 'Pincode',
      value: MOCK_EXTRA.pincode,
      Icon: MapPin,
      fg: ICON_PINK,
      bg: ICON_PINK_TINT,
    },
    {
      key: 'country',
      label: 'Country',
      value: MOCK_EXTRA.country,
      Icon: Globe,
      fg: ICON_PURPLE,
      bg: ICON_PURPLE_TINT,
    },
  ];

  /* -------- Render -------- */
  return (
    <SafeScreen edges={['top']} backgroundColor={Colors.background}>
      {/* Custom header — the shared ScreenHeader can't take a right
          slot AND look like this compact layout; small enough that
          inlining is clearer than composing. */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft
            size={26}
            color={Colors.textPrimary}
            strokeWidth={2.25}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <Pencil size={14} color={Colors.primary} strokeWidth={2.5} />
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollBg}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Two decorative circles — pinned bottom-right, clipped
              by the card's overflow: hidden. Purely visual. */}
          <View style={styles.heroBlobA} />
          <View style={styles.heroBlobB} />

          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Pressable
              onPress={onAvatarChange}
              hitSlop={4}
              style={({ pressed }) => [
                styles.cameraBadge,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <Camera
                size={12}
                color={Colors.textOnPrimary}
                strokeWidth={2.5}
              />
            </Pressable>
          </View>

          <View style={styles.heroBody}>
            <Text style={styles.heroName} numberOfLines={1}>
              {displayName || 'Your Name'}
            </Text>
            <Text style={styles.heroMeta}>{phone}</Text>
            <Text style={styles.heroMeta} numberOfLines={1}>
              {email}
            </Text>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{MOCK_EXTRA.category}</Text>
            </View>
          </View>
        </View>

        {/* ── Personal Information ─────────────────────── */}
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.card}>
          {personal.map((row, i) => (
            <InfoRow
              key={row.key}
              row={row}
              isLast={i === personal.length - 1}
              onPress={() => onRowPress(row.key)}
            />
          ))}
        </View>

        {/* ── Address Information ──────────────────────── */}
        <Text style={styles.sectionTitle}>Address Information</Text>
        <View style={styles.card}>
          {address.map((row, i) => (
            <InfoRow
              key={row.key}
              row={row}
              isLast={i === address.length - 1}
              onPress={() => onRowPress(row.key)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

export default ProfileScreen;

/* ================================================================
 * InfoRow — icon + label + value + chevron
 * ================================================================ *
 * Divider drawn on the ROW (not the card) so the last row can
 * suppress it cleanly via `isLast` without a `:last-child`-style
 * selector (which RN doesn't support).
 */

const InfoRow: React.FC<{
  row: RowDef;
  isLast: boolean;
  onPress: () => void;
}> = ({ row, isLast, onPress }) => {
  const { Icon, label, value, fg, bg } = row;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowDivider,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || 'not set'}`}
    >
      <View style={[styles.rowIcon, { backgroundColor: bg }]}>
        <Icon size={20} color={fg} strokeWidth={2} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
      <ChevronRight size={18} color={Colors.textTertiary} strokeWidth={2} />
    </Pressable>
  );
};

/* ================================================================
 * Styles
 * ================================================================ */

const styles = StyleSheet.create({
  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  headerBtn: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  editBtnText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '700',
  },

  /* Scroll */
  scrollBg: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
  },

  /* Hero card */
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryTint,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  /* Decorative circles pinned to the right edge, subtly lighter
   * than the card background. Purely visual — safe to remove. */
  heroBlobA: {
    position: 'absolute',
    right: -60,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.primaryLight,
    opacity: 0.18,
  },
  heroBlobB: {
    position: 'absolute',
    right: -30,
    bottom: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.primaryLight,
    opacity: 0.15,
  },
  avatarWrap: {
    width: 88,
    height: 88,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primaryLight + '55', // translucent so hero bg shows through
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.h2,
    color: Colors.primaryDark,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: Radius.circle,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryTint,
  },
  heroBody: {
    flex: 1,
    gap: 2,
  },
  heroName: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroMeta: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: '#D6F0DB', // slightly deeper than primaryTint so it reads on the hero bg
  },
  categoryChipText: {
    ...Typography.caption,
    color: Colors.primaryDark,
    fontWeight: '700',
  },

  /* Section title */
  sectionTitle: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },

  /* Info card + row */
  card: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
    width: 110, // fixed width keeps values left-aligned across all rows
  },
  rowValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },

  pressed: {
    opacity: 0.85,
  },
});
