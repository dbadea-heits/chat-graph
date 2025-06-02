"use client"
import { useState } from "react"
import Sidebar from "@/components/sidebar"
import ChatInterface from "@/components/chat-interface"
import DataVizInterface from "@/components/data-viz-interface"

export default function T3ChatApp() {
  const [activeTab, setActiveTab] = useState<"chat" | "dataviz">("chat")

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col">{activeTab === "chat" ? <ChatInterface /> : <DataVizInterface />}</main>
    </div>
  )
}
