import { router, Tabs, usePathname } from "expo-router";
import React, { useEffect } from "react";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { FieldColors } from "@/constants/theme";
import { useAppSettingsStore } from "@/src/store/useAppSettingsStore";

export default function TabLayout() {
  const { fieldUiEnabled, hasLoaded, loadSettings } = useAppSettingsStore();
  const pathname = usePathname();

  useEffect(() => {
    if (!hasLoaded) {
      loadSettings().catch(console.error);
    }
  }, [hasLoaded, loadSettings]);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    if (fieldUiEnabled && pathname !== "/field" && pathname !== "/settings") {
      router.replace("/field");
    }

    if (!fieldUiEnabled && pathname === "/field") {
      router.replace("/");
    }
  }, [fieldUiEnabled, hasLoaded, pathname]);

  return (
    <Tabs
      initialRouteName={fieldUiEnabled ? "field" : "index"}
      screenOptions={{
        tabBarActiveTintColor: FieldColors.primary,
        tabBarInactiveTintColor: FieldColors.textSubtle,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: FieldColors.surface,
          borderTopColor: FieldColors.border,
          minHeight: 68,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="field"
        options={{
          title: "Field",
          href: fieldUiEnabled ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="mic.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          href: fieldUiEnabled ? null : undefined,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bench"
        options={{
          title: "ASR Test",
          href: fieldUiEnabled ? null : undefined,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="mic.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="phase3-native-asr"
        options={{
          title: "Phase 3",
          href: fieldUiEnabled ? null : undefined,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="waveform" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="phase4-extraction"
        options={{
          title: "Phase 4",
          href: fieldUiEnabled ? null : undefined,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="list.bullet.rectangle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Results",
          href: fieldUiEnabled ? null : undefined,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="chart.bar.fill" color={color} />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="datasets"
        options={{
          title: "Drafts",
          href: fieldUiEnabled ? null : undefined,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="folder.fill" color={color} />
          ),
        }}
      /> */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
