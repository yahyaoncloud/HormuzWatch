import MarkdownPage from "./MarkdownPage";
import disclaimerContent from "../../../docs/website_documents/DISCLAIMER.md?raw";
import { ShieldAlert } from "lucide-react";

export default function DisclaimerPage() {
  return (
    <MarkdownPage 
      content={disclaimerContent} 
      title="Disclaimer & Terms of Use"
      icon={ShieldAlert}
    />
  );
}
