"use client";

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";

const ACTIVE_PROFILE_STORAGE_KEY = "telehealth.activeProfileId";

type ProxyRelationship = {
  id: string;
  patientId: string;
  relationshipType: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isActive: boolean;
  createdAt: string;
  patient: {
    user: {
      firstName: string;
      lastName: string;
    } | null;
  } | null;
};

type ProfileOption = {
  patientId: string;
  label: string;
};

type ActiveProfileContextValue = {
  activeProfileId: string | null;
  setActiveProfileId: (value: string | null) => void;
  profiles: ProfileOption[];
  relationships: ProxyRelationship[];
  isLoading: boolean;
  refreshRelationships: () => Promise<void>;
};

const ActiveProfileContext = createContext<ActiveProfileContextValue | null>(null);

function formatRelationshipType(relationshipType: string) {
  return relationshipType.toLowerCase().replaceAll("_", " ");
}

function buildProfileOptions(relationships: ProxyRelationship[]) {
  const seen = new Set<string>();
  return relationships
    .filter((relationship) => relationship.status === "APPROVED" && relationship.isActive)
    .filter((relationship) => {
      if (seen.has(relationship.patientId)) {
        return false;
      }
      seen.add(relationship.patientId);
      return true;
    })
    .map((relationship) => {
      const firstName = relationship.patient?.user?.firstName ?? "Family";
      const lastName = relationship.patient?.user?.lastName ?? "Member";
      return {
        patientId: relationship.patientId,
        label: `${firstName} ${lastName} (${formatRelationshipType(relationship.relationshipType)})`,
      };
    });
}

export function ActiveProfileProvider({children}: {children: React.ReactNode}) {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
  });
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [relationships, setRelationships] = useState<ProxyRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRelationships = useCallback(async () => {
    const response = await fetch("/api/proxy");

    if (!response.ok) {
      setRelationships([]);
      setProfiles([]);
      setIsLoading(false);
      return;
    }

    const payload = (await response.json()) as ProxyRelationship[];
    setRelationships(payload);
    const nextProfiles = buildProfileOptions(payload);
    setProfiles(nextProfiles);
    setIsLoading(false);

    setActiveProfileId((previous) => {
      if (!previous) {
        return null;
      }

      const stillAvailable = nextProfiles.some((profile) => profile.patientId === previous);

      if (!stillAvailable) {
        window.localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
        return null;
      }

      return previous;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRelationships() {
      const response = await fetch("/api/proxy");

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setRelationships([]);
        setProfiles([]);
        setIsLoading(false);
        return;
      }

      const payload = (await response.json()) as ProxyRelationship[];

      if (!isMounted) {
        return;
      }

      setRelationships(payload);
      const nextProfiles = buildProfileOptions(payload);
      setProfiles(nextProfiles);
      setIsLoading(false);

      setActiveProfileId((previous) => {
        if (!previous) {
          return null;
        }

        const stillAvailable = nextProfiles.some((profile) => profile.patientId === previous);

        if (!stillAvailable) {
          window.localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
          return null;
        }

        return previous;
      });
    }

    void loadRelationships();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateActiveProfileId = useCallback((value: string | null) => {
    setActiveProfileId(value);

    if (value) {
      window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, value);
      return;
    }

    window.localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
  }, []);

  const value = useMemo<ActiveProfileContextValue>(() => ({
    activeProfileId,
    setActiveProfileId: updateActiveProfileId,
    profiles,
    relationships,
    isLoading,
    refreshRelationships,
  }), [activeProfileId, isLoading, profiles, refreshRelationships, relationships, updateActiveProfileId]);

  return <ActiveProfileContext.Provider value={value}>{children}</ActiveProfileContext.Provider>;
}

export function useActiveProfile() {
  const context = useContext(ActiveProfileContext);

  if (!context) {
    throw new Error("useActiveProfile must be used within ActiveProfileProvider");
  }

  return context;
}
