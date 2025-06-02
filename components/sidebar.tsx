"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, BarChart3, Search, Plus, LogIn, Menu } from "lucide-react"
import { useState } from "react"

interface SidebarProps {
  activeTab: "chat" | "dataviz"
  setActiveTab: (tab: "chat" | "dataviz") => void
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="w-64 bg-slate-800/90 backdrop-blur-sm border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Menu className="w-5 h-5 text-[#9e58bd]" />
          <h1 className="text-xl font-bold text-[#9e58bd]">T3.chat</h1>
        </div>

        <Button
          className="w-full bg-[#9e58bd] hover:bg-[#8a4ba8] text-white rounded-lg"
          onClick={() => setActiveTab("chat")}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your threads..."
            className="pl-10 bg-slate-700/50 border-slate-600 text-slate-200 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Navigation</div>

          <Button
            variant={activeTab === "chat" ? "secondary" : "ghost"}
            className={`w-full justify-start ${
              activeTab === "chat"
                ? "bg-[#9e58bd]/20 text-[#9e58bd] border border-[#9e58bd]/30"
                : "text-slate-300 hover:bg-slate-700/50 hover:text-[#9e58bd]"
            }`}
            onClick={() => setActiveTab("chat")}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat Interface
          </Button>

          <Button
            variant={activeTab === "dataviz" ? "secondary" : "ghost"}
            className={`w-full justify-start ${
              activeTab === "dataviz"
                ? "bg-[#00828e]/20 text-[#00828e] border border-[#00828e]/30"
                : "text-slate-300 hover:bg-slate-700/50 hover:text-[#00828e]"
            }`}
            onClick={() => setActiveTab("dataviz")}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Data Visualization
          </Button>

          <div className="pt-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Help</div>
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-300 hover:bg-slate-700/50 hover:text-slate-200"
            >
              Welcome to T3 Chat
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-300 hover:bg-slate-700/50 hover:text-slate-200"
            >
              FAQ
            </Button>
          </div>
        </div>
      </div>

      {/* Login */}
      <div className="p-4 border-t border-slate-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-slate-700/50 hover:text-slate-200"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Login
        </Button>
      </div>
    </div>
  )
}
