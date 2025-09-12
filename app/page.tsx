"use client"
import { useState } from "react"
import Sidebar from "@/components/sidebar"
import ChatInterface from "@/components/chat-interface"
import DataVizInterface from "@/components/data-viz-interface"
import Dashboard from "@/components/dashboard"

export default function T3ChatApp() {
  const [activeTab, setActiveTab] = useState<"chat" | "dataviz" | "dashboard">("chat")
  const [graphId, setGraphId] = useState<string>("default")

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col ml-64">
        {activeTab === "chat" ? (
          <ChatInterface graphId={graphId} onGraphIdChange={setGraphId} />
        ) : activeTab === "dataviz" ? (
          <DataVizInterface graphId={graphId} />
        ) : (
          <Dashboard graphId={graphId} />
        )}
      </main>
    </div>
  )
}
