import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { ShieldAlert } from "lucide-react";

interface MarkdownPageProps {
  content: string;
  title?: string;
  icon?: React.ElementType;
}

export default function MarkdownPage({ content, title, icon: Icon = ShieldAlert }: MarkdownPageProps) {
  return (
    <div className="page-container fade-up" style={{ padding: "32px 16px", margin: "0 auto" }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px", paddingBottom: "16px", borderBottom: "1px solid rgba(148,163,184,0.15)" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8" }}>
            <Icon size={20} />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
            {title}
          </h1>
        </div>
      )}

      <div style={{
        background: "rgba(11,18,32,0.6)",
        border: "1px solid rgba(148,163,184,0.1)",
        borderRadius: "12px",
        padding: "32px",
        color: "#cbd5e1",
        lineHeight: 1.7,
        fontSize: "0.9375rem"
      }}>
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({ node, ...props }) => <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f8fafc", marginBottom: "24px", fontFamily: "'Space Grotesk', sans-serif" }} {...props} />,
              h2: ({ node, ...props }) => <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f1f5f9", marginTop: "32px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid rgba(148,163,184,0.1)", fontFamily: "'Space Grotesk', sans-serif" }} {...props} />,
              h3: ({ node, ...props }) => <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#e2e8f0", marginTop: "24px", marginBottom: "12px" }} {...props} />,
              p: ({ node, ...props }) => <p style={{ marginBottom: "16px", color: "#94a3b8" }} {...props} />,
              ul: ({ node, ...props }) => <ul style={{ paddingLeft: "24px", marginBottom: "16px", color: "#94a3b8", listStyleType: "disc" }} {...props} />,
              ol: ({ node, ...props }) => <ol style={{ paddingLeft: "24px", marginBottom: "16px", color: "#94a3b8", listStyleType: "decimal" }} {...props} />,
              li: ({ node, ...props }) => <li style={{ marginBottom: "8px" }} {...props} />,
              a: ({ node, ...props }) => <a style={{ color: "#818cf8", textDecoration: "none" }} {...props} />,
              strong: ({ node, ...props }) => <strong style={{ color: "#e2e8f0", fontWeight: 700 }} {...props} />,
              hr: ({ node, ...props }) => <hr style={{ border: "none", borderTop: "1px solid rgba(148,163,184,0.1)", margin: "32px 0" }} {...props} />
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
