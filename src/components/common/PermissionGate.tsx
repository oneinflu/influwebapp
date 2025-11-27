import Alert from "../ui/alert/Alert";
import React from "react";
import { usePermissions } from "../../hooks/usePermissions";

interface PermissionGateProps {
  group: string;
  keys?: string[];
  children: React.ReactNode;
}

export default function PermissionGate({ group, keys, children }: PermissionGateProps) {
  const { loading, has, hasAny } = usePermissions();
  const allowed = keys && keys.length > 0 ? hasAny(group, keys) : has(group);

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-10 w-32 rounded bg-gray-100 animate-pulse dark:bg-white/[0.06]" />
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="p-4 max-w-2xl">
        <Alert variant="error" title="Forbidden" message="You don't have access to this page." />
      </div>
    );
  }
  return <>{children}</>;
}

