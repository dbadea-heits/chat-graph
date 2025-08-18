"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Bot, User, Search, Paperclip, Loader2, Upload } from "lucide-react"
import { apiConfig } from "@/lib/api-config"
import ReactMarkdown from "react-markdown"

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
}

interface ChatInterfaceProps {
  graphId: string;
  onGraphIdChange: (graphId: string) => void;
}

export default function ChatInterface({ graphId, onGraphIdChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [nodeIds, setNodeIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Function to fetch node IDs - extracted for reuse
  const fetchNodeIds = async () => {
    try {
      const response = await fetch(`${apiConfig.baseUrl}${apiConfig.nodeIdsEndpoint}`)
      const data = await response.json()
      setNodeIds(Object.keys(data))
    } catch (error) {
      console.error('Error fetching node IDs:', error)
    }
  }

  useEffect(() => {
    fetchNodeIds()
  }, [onGraphIdChange, graphId])

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadStatus("Uploading file...")

    // Variable for the polling interval that needs to be accessible in the finally block
    let pollInterval: NodeJS.Timeout;
    let isPolling = false;
    
    try {
      // Create FormData object for proper multipart/form-data handling
      const formData = new FormData()
      formData.append('file', file)
      
      // Send the file to the API using FormData
      const response = await fetch(`${apiConfig.baseUrl}/upload-file`, {
        method: 'POST',
        // Don't set Content-Type header - fetch will set it automatically with the correct boundary
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.job_id) {
        setUploadStatus(`Processing file "${file.name}"...`)
        
        // Poll for job status
        isPolling = true;
        let progress = 0;
        let currentStep = "Processing";
        pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${apiConfig.baseUrl}${apiConfig.jobStatusEndpoint}/${data.job_id}`);
            const statusData = await statusResponse.json();
            
            if (statusData.status === "failed") {
              clearInterval(pollInterval);
              isPolling = false;
              setUploadStatus(`Processing failed: ${statusData.error || "Unknown error"}`);
              return;
            }
            
            progress = statusData.progress;
            currentStep = statusData.current_step || "Processing";
            setUploadStatus(`${currentStep} (${Math.round(progress * 100)}%)`);
            
            if (progress === 1) {
              clearInterval(pollInterval);
              isPolling = false;
              
              // Job completed successfully, update Neo4j with the uploaded file graph
              try {
                const updateResponse = await fetch(`${apiConfig.baseUrl}${apiConfig.updateNeo4jEndpoint}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    graph_path: './graphs/uploaded_files',
                    clear_existing: true
                  }),
                });
                
                const updateData = await updateResponse.json();
                setUploadStatus(`File "${file.name}" processed and loaded into graph!`);
                
                // Refresh the list of graphIds
                await fetchNodeIds();
                
                // If the response includes a new graph_id, select it
                if (updateData.graph_id) {
                  onGraphIdChange(updateData.graph_id);
                }
                
                // Add system message about the successful processing
                const systemMessage: Message = {
                  id: Date.now().toString(),
                  content: `File "${file.name}" has been uploaded, processed, and loaded into the knowledge graph.`,
                  sender: "bot",
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, systemMessage]);
                
                // Reset upload state after a delay
                setTimeout(() => {
                  setIsUploading(false);
                  // Clear status after additional delay
                  setTimeout(() => {
                    setUploadStatus(null);
                  }, 3000);
                }, 1000);
              } catch (updateError) {
                console.error('Error updating Neo4j:', updateError);
                setUploadStatus(`File processed but graph update failed: ${(updateError as Error).message}`);
                
                const systemMessage: Message = {
                  id: Date.now().toString(),
                  content: `File "${file.name}" was processed but couldn't be loaded into the graph.`,
                  sender: "bot",
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, systemMessage]);
                
                // Reset upload state after a delay
                setTimeout(() => {
                  setIsUploading(false);
                  // Clear status after additional delay
                  setTimeout(() => {
                    setUploadStatus(null);
                  }, 3000);
                }, 1000);
              }
            }
          } catch (pollError) {
            console.error('Error polling job status:', pollError);
            clearInterval(pollInterval);
            isPolling = false;
            setUploadStatus(`Error checking processing status: ${(pollError as Error).message}`);
          }
        }, 1000);
      } else {
        // No job_id in response, assume direct processing
        setUploadStatus(`File "${file.name}" uploaded successfully!`);
        
        // Add system message about the upload
        const systemMessage: Message = {
          id: Date.now().toString(),
          content: `File "${file.name}" has been uploaded and processed.`,
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMessage])
      }
      
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadStatus(`Upload failed: ${(error as Error).message}`)
    } finally {
      // Clear file input value to ensure onChange fires even if the same file is selected
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      
      // Only reset the UI if we're not still polling for job status
      if (!isPolling) {
        setTimeout(() => {
          setIsUploading(false)
          // Clear status after a delay
          setTimeout(() => {
            setUploadStatus(null)
          }, 3000)
        }, 1000)
      }
    }
  }

  const triggerFileUpload = () => {
    // Ensure the input is cleared before triggering the click
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
      fileInputRef.current.click()
    }
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
              <h3 className="text-lg font-semibold text-[#4f46e5] mb-2">Ready to Transform Your Teaching?</h3>
              <p className="text-slate-600">
                Start a conversation with our AI assistant to explore your knowledge base, or use the graph visualization to discover connections between concepts. You can also{" "}
                <span className="text-[#3b82f6] font-medium cursor-pointer hover:text-[#2563eb]">
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

      {/* File Upload Section */}
      <div className="px-4 pt-2 pb-0 border-t border-slate-200 bg-slate-700">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Button 
                onClick={triggerFileUpload}
                disabled={isUploading} 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1 bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload File
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            {uploadStatus && (
              <span className={`text-xs ${uploadStatus.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>
                {uploadStatus}
              </span>
            )}
          </div>
        </div>
      </div>
      
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
            <Select value={graphId} onValueChange={onGraphIdChange}>
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
