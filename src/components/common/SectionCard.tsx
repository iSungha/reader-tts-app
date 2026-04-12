type Props = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

import { useState } from "react";

export default function SectionCard({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      style={{
        border: "1px solid #2a2a2a",
        borderRadius: "12px",
        marginBottom: "16px",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          color: "inherit",
          textAlign: "left",
          padding: "14px 16px",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>{title}</div>
            {subtitle ? (
              <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "2px" }}>
                {subtitle}
              </div>
            ) : null}
          </div>

          <div style={{ fontSize: "13px", opacity: 0.8 }}>
            {isOpen ? "Hide" : "Show"}
          </div>
        </div>
      </button>

      {isOpen ? (
        <div
          style={{
            borderTop: "1px solid #2a2a2a",
            padding: "16px",
          }}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}