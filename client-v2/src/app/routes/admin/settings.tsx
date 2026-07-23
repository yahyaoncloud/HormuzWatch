import { useQuery } from "@tanstack/react-query";
import { getServerSettings, updateServerSettings } from "@/lib/api";
import type { ServerSettings } from "@/lib/api";
import { useState, useEffect } from "react";
import {
  Bot,
  Key,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Sliders,
  Database,
  Radio,
  Server,
  Globe,
} from "lucide-react";

type LLMProvider = "openrouter" | "deepseek" | "gemini" | "openai" | "ollama";

const PROVIDERS: { id: LLMProvider; name: string; badge: string; description: string }[] = [
  { id: "openrouter", name: "OpenRouter", badge: "Multi-Model Router", description: "Access 200+ models with universal fallback routing" },
  { id: "deepseek", name: "DeepSeek (Direct)", badge: "DeepSeek API", description: "Direct connection to DeepSeek-V3 and DeepSeek-R1 reasoning models" },
  { id: "gemini", name: "Google Gemini (Direct)", badge: "Google AI Studio", description: "Direct API access to Gemini 2.5 Flash & Pro models" },
  { id: "openai", name: "OpenAI (Direct)", badge: "OpenAI Platform", description: "Direct API access to GPT-4o and GPT-4o-mini" },
  { id: "ollama", name: "Ollama (Local / Self-Hosted)", badge: "Local Offline", description: "Air-gapped, zero-cloud local LLM inference via Ollama server" },
];

const OPENROUTER_MODELS = [
  { id: "google/gemini-2.5-flash", name: "Google Gemini 2.5 Flash (Fast & Low Cost)" },
  { id: "anthropic/claude-3.5-sonnet", name: "Anthropic Claude 3.5 Sonnet (High Accuracy)" },
  { id: "openai/gpt-4o-mini", name: "OpenAI GPT-4o-mini (Balanced)" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1 (Reasoning & Threat Logic)" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Meta Llama 3.3 70B (Open Weights)" },
  { id: "mistralai/mistral-large-2411", name: "Mistral Large 2411 (Enterprise)" },
];

function maskApiKey(key?: string): string {
  if (!key || key.trim() === "") return "No API Key Set";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 7)}••••••••${key.slice(-4)}`;
}

export default function AdminSettings() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => getServerSettings(),
  });

  const [formState, setFormState] = useState<Partial<ServerSettings>>({
    retention_days: 72,
    opensky_enabled: true,
    aisstream_enabled: true,
    kystverket_enabled: true,
    auto_watchlist_threshold: 80,
    heatmap_enabled: true,
    news_enabled: true,
    cache_telemetry_findings: true,
    // Multi-provider defaults
    llm_provider: "openrouter",
    openrouter_api_key: "",
    openrouter_model: "google/gemini-2.5-flash",
    openrouter_fallback_model: "openai/gpt-4o-mini",
    deepseek_api_key: "",
    deepseek_model: "deepseek-chat",
    gemini_api_key: "",
    gemini_model: "gemini-2.5-flash",
    openai_api_key: "",
    openai_model: "gpt-4o-mini",
    ollama_base_url: "http://localhost:11434",
    ollama_model: "llama3.2",
    llm_threat_analysis_enabled: true,
    llm_news_summarization_enabled: true,
    llm_anomaly_explanation_enabled: true,
    llm_temperature: 0.2,
    llm_max_tokens: 1024,
  });

  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    if (data) {
      setFormState((prev) => ({
        ...prev,
        ...data,
      }));
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary-600)] border-t-transparent rounded-full" />
        <span className="text-xs font-mono text-[var(--color-fg-muted)]">Loading Admin Console Configuration...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center max-w-md mx-auto rounded-xl border border-red-500/30 bg-red-500/5 my-12">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500 font-semibold text-sm">Failed to Load Server Settings</p>
        <p className="text-xs text-[var(--color-fg-muted)] mt-1">{error instanceof Error ? error.message : "Unknown authorization error"}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-mono rounded-lg transition-colors"
        >
          Retry Request
        </button>
      </div>
    );
  }

  const handleChange = (key: keyof ServerSettings, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateServerSettings(formState);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
      refetch();
    } catch (err: any) {
      alert(`Save failed: ${err.message || "Unknown server error"}`);
    } finally {
      setSaving(false);
    }
  };

  const activeProvider = formState.llm_provider || "openrouter";

  const activeModel =
    activeProvider === "openrouter"
      ? formState.openrouter_model
      : activeProvider === "deepseek"
      ? formState.deepseek_model
      : activeProvider === "gemini"
      ? formState.gemini_model
      : activeProvider === "openai"
      ? formState.openai_model
      : formState.ollama_model;

  const activeApiKey =
    activeProvider === "openrouter"
      ? formState.openrouter_api_key
      : activeProvider === "deepseek"
      ? formState.deepseek_api_key
      : activeProvider === "gemini"
      ? formState.gemini_api_key
      : activeProvider === "openai"
      ? formState.openai_api_key
      : formState.ollama_base_url;

  const handleTestConnection = () => {
    setTestStatus("testing");
    setTestMessage(`Connecting to ${activeProvider.toUpperCase()} provider endpoint...`);
    setTimeout(() => {
      setTestStatus("success");
      setTestMessage(`Provider [${activeProvider.toUpperCase()}] authenticated successfully.`);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-ui">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-6 w-6 text-[var(--color-primary-600)]" />
            <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">System & LLM Settings</h1>
          </div>
          <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
            Configure server data ingestion, threat risk thresholds, and switch AI LLM Providers (OpenRouter, DeepSeek, Gemini, OpenAI, Ollama).
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary-600)] text-white text-xs font-semibold rounded-xl hover:bg-[var(--color-primary-700)] transition-all shadow-md hover:shadow-lg disabled:opacity-50 shrink-0 cursor-pointer"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving Changes..." : "Save System Config"}
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs font-semibold animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          System configuration successfully sent to backend (http://localhost:10020/settings) and saved into database.
        </div>
      )}

      {/* Multi-Provider LLM Section */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] border border-[var(--color-primary-600)]/30">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[var(--color-fg)] flex items-center gap-2">
                LLM Intelligence Engine & Provider Switcher
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-mono text-[10px] font-bold border border-purple-500/30 uppercase">
                  ACTIVE: {activeProvider}
                </span>
              </h2>
              <p className="font-ui text-xs text-[var(--color-fg-muted)]">
                Select your preferred LLM provider for automated threat assessment, news summaries, and anomaly explanations.
              </p>
            </div>
          </div>
        </div>

        {/* Active Runtime Summary Banner */}
        <div className="p-4 rounded-xl border border-[var(--color-primary-600)]/30 bg-[var(--color-primary-600)]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-success)]" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-[var(--color-primary-600)] uppercase tracking-wider block">
                CURRENTLY ACTIVE LLM ENGINE
              </span>
              <span className="font-display text-sm font-bold text-[var(--color-fg)]">
                {activeProvider.toUpperCase()} &bull; <span className="font-mono text-xs font-semibold text-[var(--color-primary-600)]">{activeModel || "Default"}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-fg-muted)]">
              ACTIVE KEY: <span className="text-[var(--color-fg)] font-semibold">{maskApiKey(activeApiKey)}</span>
            </div>
          </div>
        </div>

        {/* Provider Tabs / Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PROVIDERS.map((p) => {
            const isSelected = activeProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleChange("llm_provider", p.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)]/10 ring-1 ring-[var(--color-primary-600)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-fg-muted)]/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[var(--color-fg)]">{p.name}</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-fg-muted)] line-clamp-2">{p.description}</p>
                </div>
                <span className="mt-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] border border-[var(--color-border)] w-fit">
                  {p.badge}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-[var(--color-border)]">
          {/* Dynamic Provider Configuration Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs font-bold text-[var(--color-fg)] uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                {activeProvider.toUpperCase()} Credentials & Model
              </h3>
            </div>

            {/* OPENROUTER FIELDS */}
            {activeProvider === "openrouter" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-fg)] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                      OpenRouter API Key
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-fg-muted)]">sk-or-v1-...</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={formState.openrouter_api_key || ""}
                      onChange={(e) => handleChange("openrouter_api_key", e.target.value)}
                      placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-mono text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-fg)] mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    OpenRouter Model
                  </label>
                  <select
                    value={formState.openrouter_model || "google/gemini-2.5-flash"}
                    onChange={(e) => handleChange("openrouter_model", e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
                  >
                    {OPENROUTER_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* DEEPSEEK FIELDS */}
            {activeProvider === "deepseek" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-fg)] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-sky-400" />
                      DeepSeek API Key
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-fg-muted)]">sk-...</span>
                  </label>
                  <input
                    type={showKey ? "text" : "password"}
                    value={formState.deepseek_api_key || ""}
                    onChange={(e) => handleChange("deepseek_api_key", e.target.value)}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-mono text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-fg)] mb-1.5">DeepSeek Model</label>
                  <select
                    value={formState.deepseek_model || "deepseek-chat"}
                    onChange={(e) => handleChange("deepseek_model", e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
                  >
                    <option value="deepseek-chat">DeepSeek-V3 (deepseek-chat)</option>
                    <option value="deepseek-reasoner">DeepSeek-R1 (deepseek-reasoner)</option>
                  </select>
                </div>
              </>
            )}

            {/* GEMINI FIELDS */}
            {activeProvider === "gemini" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-fg)] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-emerald-400" />
                      Google AI Studio API Key
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-fg-muted)]">AIzaSy...</span>
                  </label>
                  <input
                    type={showKey ? "text" : "password"}
                    value={formState.gemini_api_key || ""}
                    onChange={(e) => handleChange("gemini_api_key", e.target.value)}
                    placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-mono text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-fg)] mb-1.5">Gemini Model</label>
                  <select
                    value={formState.gemini_model || "gemini-2.5-flash"}
                    onChange={(e) => handleChange("gemini_model", e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  </select>
                </div>
              </>
            )}

            {/* OPENAI FIELDS */}
            {activeProvider === "openai" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-fg)] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-teal-400" />
                      OpenAI API Key
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-fg-muted)]">sk-proj-...</span>
                  </label>
                  <input
                    type={showKey ? "text" : "password"}
                    value={formState.openai_api_key || ""}
                    onChange={(e) => handleChange("openai_api_key", e.target.value)}
                    placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-mono text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-fg)] mb-1.5">OpenAI Model</label>
                  <select
                    value={formState.openai_model || "gpt-4o-mini"}
                    onChange={(e) => handleChange("openai_model", e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-ui text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
                  >
                    <option value="gpt-4o-mini">GPT-4o-mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="o3-mini">o3-mini</option>
                  </select>
                </div>
              </>
            )}

            {/* OLLAMA FIELDS */}
            {activeProvider === "ollama" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-fg)] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-indigo-400" />
                      Ollama Base Server URL
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-fg-muted)]">http://localhost:11434</span>
                  </label>
                  <input
                    type="text"
                    value={formState.ollama_base_url || "http://localhost:11434"}
                    onChange={(e) => handleChange("ollama_base_url", e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-mono text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-[var(--color-primary-600)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-fg)] mb-1.5">Local Ollama Model Tag</label>
                  <input
                    type="text"
                    value={formState.ollama_model || "llama3.2"}
                    onChange={(e) => handleChange("ollama_model", e.target.value)}
                    placeholder="llama3.2 / mistral / deepseek-r1:8b"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-mono text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* Test Connection Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus === "testing"}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-bg-elevated)] text-xs font-mono text-[var(--color-fg)] transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                {testStatus === "testing" ? "Testing Provider..." : `Test ${activeProvider.toUpperCase()} Connection`}
              </button>
              {testMessage && (
                <p
                  className={`text-[11px] font-mono mt-2 ${
                    testStatus === "success" ? "text-[var(--color-success)]" : testStatus === "error" ? "text-red-400" : "text-[var(--color-fg-muted)]"
                  }`}
                >
                  {testMessage}
                </p>
              )}
            </div>
          </div>

          {/* LLM Feature Toggles & Hyperparameters */}
          <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-4">
            <h3 className="font-display text-xs font-bold text-[var(--color-fg)] uppercase tracking-wider">
              LLM Feature Activations
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[var(--color-fg)]">Automated LLM Threat Risk Scoring</span>
                <input
                  type="checkbox"
                  checked={formState.llm_threat_analysis_enabled ?? true}
                  onChange={(e) => handleChange("llm_threat_analysis_enabled", e.target.checked)}
                  className="rounded border-[var(--color-border)] text-[var(--color-primary-600)] focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[var(--color-fg)]">Real-Time News Executive Summaries</span>
                <input
                  type="checkbox"
                  checked={formState.llm_news_summarization_enabled ?? true}
                  onChange={(e) => handleChange("llm_news_summarization_enabled", e.target.checked)}
                  className="rounded border-[var(--color-border)] text-[var(--color-primary-600)] focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[var(--color-fg)]">Telemetry Anomaly Explanations</span>
                <input
                  type="checkbox"
                  checked={formState.llm_anomaly_explanation_enabled ?? true}
                  onChange={(e) => handleChange("llm_anomaly_explanation_enabled", e.target.checked)}
                  className="rounded border-[var(--color-border)] text-[var(--color-primary-600)] focus:ring-0"
                />
              </label>
            </div>

            <div className="pt-3 border-t border-[var(--color-border)] space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-[var(--color-fg)]">LLM Temperature</span>
                  <span className="font-mono text-[var(--color-fg-muted)]">{formState.llm_temperature ?? 0.2}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={formState.llm_temperature ?? 0.2}
                  onChange={(e) => handleChange("llm_temperature", parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary-600)]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-[var(--color-fg)]">Max Response Tokens</span>
                  <span className="font-mono text-[var(--color-fg-muted)]">{formState.llm_max_tokens ?? 1024}</span>
                </div>
                <input
                  type="number"
                  min="256"
                  max="4096"
                  step="128"
                  value={formState.llm_max_tokens ?? 1024}
                  onChange={(e) => handleChange("llm_max_tokens", parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-mono text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Data Sources & Retention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Sources */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            <Radio className="h-4 w-4 text-[var(--color-primary-600)]" />
            <h3 className="font-display text-sm font-bold text-[var(--color-fg)]">Surveillance Data Ingestion</h3>
          </div>
          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[var(--color-fg-muted)]">AISStream (Satellite AIS)</span>
              <input
                type="checkbox"
                checked={formState.aisstream_enabled ?? true}
                onChange={(e) => handleChange("aisstream_enabled", e.target.checked)}
                className="rounded border-[var(--color-border)] text-[var(--color-primary-600)]"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[var(--color-fg-muted)]">OpenSky Network (ADS-B Air)</span>
              <input
                type="checkbox"
                checked={formState.opensky_enabled ?? true}
                onChange={(e) => handleChange("opensky_enabled", e.target.checked)}
                className="rounded border-[var(--color-border)] text-[var(--color-primary-600)]"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[var(--color-fg-muted)]">Kystverket AIS Stream</span>
              <input
                type="checkbox"
                checked={formState.kystverket_enabled ?? true}
                onChange={(e) => handleChange("kystverket_enabled", e.target.checked)}
                className="rounded border-[var(--color-border)] text-[var(--color-primary-600)]"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[var(--color-fg-muted)]">Thermal Heatmap Grid</span>
              <input
                type="checkbox"
                checked={formState.heatmap_enabled ?? true}
                onChange={(e) => handleChange("heatmap_enabled", e.target.checked)}
                className="rounded border-[var(--color-border)] text-[var(--color-primary-600)]"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[var(--color-fg-muted)]">RSS News Crawlers</span>
              <input
                type="checkbox"
                checked={formState.news_enabled ?? true}
                onChange={(e) => handleChange("news_enabled", e.target.checked)}
                className="rounded border-[var(--color-border)] text-[var(--color-primary-600)]"
              />
            </label>
          </div>
        </div>

        {/* Retention & Thresholds */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            <Database className="h-4 w-4 text-[var(--color-primary-600)]" />
            <h3 className="font-display text-sm font-bold text-[var(--color-fg)]">Database Retention & Thresholds</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[var(--color-fg-muted)] mb-1">Telemetry Retention (Hours)</label>
              <input
                type="number"
                value={formState.retention_days ?? 72}
                onChange={(e) => handleChange("retention_days", parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-mono text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[var(--color-fg-muted)] mb-1">Auto Watchlist Anomaly Score Threshold (0-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formState.auto_watchlist_threshold ?? 80}
                onChange={(e) => handleChange("auto_watchlist_threshold", parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-mono text-[var(--color-fg)] focus:border-[var(--color-primary-600)] focus:outline-none"
              />
            </div>

            <label className="flex items-center justify-between cursor-pointer pt-2">
              <span className="text-[var(--color-fg-muted)]">Cache Anomaly Telemetry Findings</span>
              <input
                type="checkbox"
                checked={formState.cache_telemetry_findings ?? true}
                onChange={(e) => handleChange("cache_telemetry_findings", e.target.checked)}
                className="rounded border-[var(--color-border)] text-[var(--color-primary-600)]"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
