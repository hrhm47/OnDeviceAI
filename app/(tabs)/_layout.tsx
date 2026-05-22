import { Tabs } from "expo-router";
import React from "react";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { FieldColors } from "@/constants/theme";

export default function TabLayout() {
  return (
    <Tabs
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
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bench"
        options={{
          title: "ASR Test",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="mic.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="phase3-native-asr"
        options={{
          title: "Phase 3",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="waveform" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="phase4-extraction"
        options={{
          title: "Phase 4",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="list.bullet.rectangle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Results",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="chart.bar.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="datasets"
        options={{
          title: "Drafts",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="folder.fill" color={color} />
          ),
        }}
      />
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
