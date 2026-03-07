"use client";

import { usePrivacy } from "./PrivacyProvider";

type Props = {
  children: React.ReactNode;
  /** Length of the masked placeholder (default: 6) */
  maskLength?: number;
};

export default function PrivacyValue({ children, maskLength = 6 }: Props) {
  const { privacyMode } = usePrivacy();

  if (privacyMode) {
    return <span className="select-none text-muted/40">{"*".repeat(maskLength)}</span>;
  }

  return <>{children}</>;
}
