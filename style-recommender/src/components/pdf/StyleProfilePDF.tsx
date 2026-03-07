import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica" },
  title: { fontSize: 28, marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8, color: "#333" },
  text: { fontSize: 11, lineHeight: 1.5, color: "#444" },
  listItem: { fontSize: 11, lineHeight: 1.6, marginLeft: 12, color: "#444" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#eee", marginVertical: 16 },
});

interface StyleProfilePDFProps {
  userName: string;
  profileData: { claude?: Record<string, unknown>; gemini?: Record<string, unknown> };
  colorSeason: string | null;
  kibbeType: string | null;
  styleArchetype: string | null;
}

export function StyleProfilePDF({ userName, profileData, colorSeason, kibbeType, styleArchetype }: StyleProfilePDFProps) {
  const profile = profileData.claude || profileData.gemini || {};

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Style Profile</Text>
        <Text style={styles.subtitle}>{userName}</Text>

        {styleArchetype && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Style Archetype</Text>
            <Text style={styles.text}>{styleArchetype}</Text>
            {typeof (profile as Record<string, unknown>).archetypeDescription === "string" && (
              <Text style={styles.text}>{(profile as Record<string, string>).archetypeDescription}</Text>
            )}
          </View>
        )}

        <View style={styles.divider} />

        {colorSeason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Color Season</Text>
            <Text style={styles.text}>{colorSeason}</Text>
          </View>
        )}

        {kibbeType && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kibbe Body Type</Text>
            <Text style={styles.text}>{kibbeType}</Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Full Analysis</Text>
          <Text style={styles.text}>{JSON.stringify(profile, null, 2)}</Text>
        </View>
      </Page>
    </Document>
  );
}
