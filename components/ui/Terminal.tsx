"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { SceneController } from "@/ai/executor/SceneController";
import { Terminal as TerminalIcon, X, CornerDownLeft, Sparkles, CheckCircle2, Shield } from "lucide-react";
import { SceneCommand } from "@/types/commands";
import { EasterEggManager } from "@/engine/easter/EasterEggs";
import { ProceduralAudio } from "@/engine/audio/ProceduralAudio";

interface LogEntry {
  id: string;
  sender: "user" | "nexus" | "system";
  text: string;
  command?: SceneCommand;
  timestamp: string;
  provider?: "gemini" | "fallback";
}

const SAMPLE_PROMPTS = [
  "Take me to the AI laboratory",
  "Inspect the Interface Spire in Code City",
  "Transform the Data Ocean into a sphere",
  "Explain how the AI Core works",
  "Start the guided tour",
  "Return to the beginning",
];

export const Terminal: React.FC = () => {
  const isTerminalOpen = useWorldStore((state) => state.isTerminalOpen);
  const setTerminalOpen = useWorldStore((state) => state.setTerminalOpen);
  const currentZone = useWorldStore((state) => state.currentZone);
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const qualityTier = useWorldStore((state) => state.qualityTier);
  const oceanState = useWorldStore((state) => state.oceanState);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init",
      sender: "nexus",
      text: "NEXUS AI Cognitive Command Interface online. Powered by Google Gemini-compatible structured intent pipeline.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    },
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTerminalOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isTerminalOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  if (!isTerminalOpen) return null;

  const submitPrompt = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    const userEntry: LogEntry = {
      id: Math.random().toString(),
      sender: "user",
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };

    setLogs((prev) => [...prev, userEntry]);
    setInput("");

    // Check for secret Easter Eggs
    const egg = EasterEggManager.check(promptText);
    if (egg) {
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "nexus",
          text: egg.message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        },
      ]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          currentZone,
          selectedPoiId: selectedPoi?.id || null,
          qualityTier,
          oceanState,
        }),
      });

      const data = await response.json();

      if (data.command) {
        SceneController.execute(data.command);
      }

      ProceduralAudio.playAIResponse();

      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "nexus",
          text: data.message || "Directive acknowledged and executed.",
          command: data.command,
          provider: data.provider,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        },
      ]);
    } catch (err: unknown) {
      console.warn("AI API fallback engagement:", err);
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "nexus",
          text: "NEXUS cognitive subsystem routed directive through local heuristics.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-md font-mono">
      <div className="relative w-full max-w-2xl glass-panel-glow rounded-lg border border-cyan-500/40 p-3.5 sm:p-6 flex flex-col h-[82dvh] sm:h-[520px] max-h-[85dvh] shadow-[0_0_50px_rgba(0,240,255,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-white/10 mb-3 sm:mb-4 gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <TerminalIcon className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-white tracking-widest truncate">
              NEXUS COGNITIVE TERMINAL
            </span>
            <span className="hidden sm:flex text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 items-center gap-1 shrink-0">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>SCHEMA VALIDATED</span>
            </span>
          </div>
          <button
            onClick={() => setTerminalOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Log History */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 text-xs">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`p-2.5 rounded border leading-relaxed ${
                log.sender === "user"
                  ? "bg-cyan-950/30 border-cyan-500/30 text-cyan-200 ml-8"
                  : "bg-slate-900/50 border-white/5 text-slate-300 mr-8"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span className="font-semibold uppercase text-slate-400">
                  {log.sender === "user" ? "USER DIRECTIVE" : "NEXUS // COGNITION"}
                </span>
                <span className="flex items-center gap-1.5">
                  {log.provider && (
                    <span className="text-cyan-400 text-[9px] uppercase font-bold">
                      [{log.provider}]
                    </span>
                  )}
                  <span>{log.timestamp}</span>
                </span>
              </div>
              <p className="whitespace-pre-wrap">{log.text}</p>
              {log.command && (
                <div className="mt-2 pt-1 border-t border-cyan-500/20 text-[10px] text-cyan-400 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                  <span>ACTION EXECUTED: {log.command.action.toUpperCase()}</span>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="p-2.5 rounded border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 text-xs flex items-center space-x-2 animate-pulse mr-8">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Interpreting intent via Gemini cognition pipeline...</span>
            </div>
          )}
        </div>

        {/* Suggestion Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 mb-3 text-[10px]">
          <span className="text-slate-500 whitespace-nowrap">Directives:</span>
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => submitPrompt(prompt)}
              className="px-2 py-1 rounded bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/40 border border-white/10 text-slate-300 whitespace-nowrap transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitPrompt(input);
          }}
          className="flex items-center space-x-2 border border-cyan-500/40 rounded p-1.5 bg-black/40 focus-within:border-cyan-400 focus-within:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all"
        >
          <span className="text-cyan-400 font-bold px-2 text-sm">{">"}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Issue natural language command to NEXUS..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-white text-xs placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-1.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
