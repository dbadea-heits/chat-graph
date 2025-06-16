"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Bot, User, Search, Paperclip, Loader2 } from "lucide-react"
import { apiConfig } from "@/lib/api-config"
import ReactMarkdown from "react-markdown"

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [graphId, setGraphId] = useState("default")
  const [nodeIds, setNodeIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchNodeIds = async () => {
      try {
        const response = await fetch(`${apiConfig.baseUrl}${apiConfig.nodeIdsEndpoint}`)
        const data = await response.json()
        setNodeIds(data)
        if (data.length > 0) {
          setGraphId(data[0])
        }
      } catch (error) {
        console.error('Error fetching node IDs:', error)
      }
    }

    fetchNodeIds()
  }, [])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch(`${apiConfig.baseUrl}${apiConfig.askRagEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: inputValue,
          graph_id: graphId
        })
      })

      const data = await response.json()
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botResponse])
    } catch (error) {
      console.error('Error fetching response:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error while processing your request.",
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const generateBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase()

    if (input.includes("graph") || input.includes("node") || input.includes("relationship")) {
      return "I can see you're interested in graph data! Check out the Data Visualization tab to explore the Neo4j graph with interactive nodes and relationships. You can search and filter the data there."
    }

    if (input.includes("search") || input.includes("filter")) {
      return "You can use the search functionality in the Data Visualization tab to filter nodes by type, properties, or relationships. Try searching for specific node labels or property values."
    }

    if (input.includes("neo4j") || input.includes("bloom")) {
      return "Filter and explore your AI's knowledge base."
    }

    return "That's interesting! I can help you with graph data queries and visualization. Try switching to the Data Visualization tab to explore the interactive graph."
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Chat Interface</h2>
          <p className="text-sm text-slate-400">AI-powered conversations with graph data insights</p>
        </div>
      </div>

      {/* Welcome Content */}
      {messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl text-center space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Welcome to The Brain Builder</h1>

            <div className="space-y-4 text-left">
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">1. Your Personal Knowledge Base</h3>
                <p className="text-slate-400">
                  Starting with philosophy, access a comprehensive collection of concepts, thinkers, and ideas across multiple domains, all organized in an interactive graph database. Perfect for building engaging curriculum materials.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">2. AI-Powered Course Design</h3>
                <p className="text-slate-400">
                  Let our advanced AI help you create <span className="font-medium text-[#9e58bd]">engaging lesson plans</span>, 
                  <span className="font-medium text-[#00828e]"> interactive discussions</span>, and 
                  <span className="font-medium text-[#9e58bd]"> thought-provoking assignments</span> tailored to your students' needs.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">3. Customizable Learning Paths</h3>
                <p className="text-slate-400">
                  Filter and customize the knowledge base to match your curriculum requirements. Create unique learning journeys that connect concepts across different domains in meaningful ways for your students.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-lg font-semibold text-[#9e58bd] mb-2">Ready to Transform Your Teaching?</h3>
              <p className="text-slate-400">
                Start a conversation with our AI assistant to explore your knowledge base, or use the graph visualization to discover connections between concepts. You can also{" "}
                <span className="text-[#00828e] font-medium cursor-pointer hover:text-[#00a3b0]">
                  explore our teaching resources
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${message.sender === "user" ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={message.sender === "user" ? "bg-[#9e58bd]" : "bg-[#00828e]"}>
                    {message.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === "user"
                      ? "bg-[#9e58bd] text-white"
                      : "bg-slate-700 border border-slate-600 text-slate-100"
                  }`}
                >
                  <div className={`markdown-content text-sm ${message.sender === "user" ? "user-message" : ""}`}>
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  <span className="text-xs opacity-70 mt-1 block">{message.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-[#00828e]">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-[80%] rounded-lg p-3 bg-slate-700 border border-slate-600 text-slate-100">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#00828e]" />
                    <p className="text-sm text-slate-400">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="mb-2 text-xs text-slate-500 text-center">
            Make sure you agree to our <span className="text-[#9e58bd] cursor-pointer hover:text-[#b06bd1]">Terms</span>{" "}
            and our <span className="text-[#9e58bd] cursor-pointer hover:text-[#b06bd1]">Privacy Policy</span>
          </div>

          <div className="relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message here..."
              className="pr-20 pl-4 py-3 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400 rounded-lg"
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />

            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-[#9e58bd]">
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleSendMessage}
                size="sm"
                className="h-8 w-8 p-0 bg-[#9e58bd] hover:bg-[#8a4ba8] text-white rounded-md"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <Select value={graphId} onValueChange={setGraphId}>
              <SelectTrigger className="w-48 h-8 bg-slate-700 border-slate-600 text-slate-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {nodeIds.map((nodeId) => (
                  <SelectItem key={nodeId} value={nodeId} className="text-slate-200 focus:bg-slate-600">
                    {nodeId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-[#00828e]">
              <Search className="w-4 h-4 mr-1" />
              Search
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
