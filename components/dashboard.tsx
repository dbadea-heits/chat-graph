"use client";

import { useState, ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Award, BookOpen, Clock, BarChart } from "lucide-react";
import { useNeo4jGraph } from "@/hooks/use-neo4j-graph";
import { GraphNode } from "@/types/graph";

interface SkillCardProps {
  title: string;
  description?: string;
  supports?: GraphNode[];
  buildsFrom?: GraphNode[];
  icon?: ReactNode;
  category: string;
}

interface Skill extends SkillCardProps {
  // Add any additional properties specific to Skill objects here
}

type SkillsByCategory = {
  [category: string]: Skill[];
};

type CategoryIconsType = {
  [key: string]: ReactNode;
};

const colorMap = {
  skills: "bg-blue-100 text-blue-800",
  competencies: "bg-green-100 text-green-800",
  proficiencies: "bg-yellow-100 text-yellow-800",
  aptitudes: "bg-purple-100 text-purple-800",
  knowledge: "bg-pink-100 text-pink-800",
  tools: "bg-cyan-100 text-cyan-800",
  unknown: "bg-gray-100 text-gray-800",
};

const categoryIcons: CategoryIconsType = {
  "K-12 Foundation": <BookOpen className="h-5 w-5 text-blue-500" />,
  "College/University": <GraduationCap className="h-5 w-5 text-green-500" />,
  "Early Career": <BarChart className="h-5 w-5 text-yellow-500" />,
  "Continuing Education": <Clock className="h-5 w-5 text-purple-500" />,
};

const SkillCard = ({
  title,
  description,
  supports,
  buildsFrom,
}: SkillCardProps) => {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Badge className={colorMap.skills} >Skill</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        {buildsFrom && buildsFrom.length > 0 && (
          <div className="mb-2">
            <p className="text-sm font-medium text-slate-700">Builds from:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {buildsFrom.map((skill) => (
                <Badge key={skill.id} className={`${colorMap[skill.type]} text-xs`}>
                  {skill.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {supports && supports.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-700">Supports:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {supports.map((skill) => (
                <Badge key={skill.id} className={`${colorMap[skill.type]} text-xs`}>
                  {skill.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function Dashboard({ graphId }: { graphId: string }) {
  const { nodes, edges, refreshData: refreshHookData } = useNeo4jGraph(graphId);
  const [activeTab, setActiveTab] = useState("learning-journey");

  return (
    <div className="flex-1 p-6 bg-slate-50/5 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Skills Dashboard
          </h1>
          <p className="text-slate-300">
            Track your learning journey and showcase your growth.
          </p>
        </div>

        <Tabs defaultValue="learning-journey" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="learning-journey">Skills</TabsTrigger>
            <TabsTrigger value="verified">Verified Skills</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>
          
          <div className="mb-6 p-4 bg-slate-800/50 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Legend: Skill Categories</h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(colorMap).filter(([key]) => key !== 'unknown').map(([key, value]) => (
                <div key={key} className="flex items-center">
                  <Badge className={value}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <TabsContent value="learning-journey">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Skills</h2>
                <p className="text-slate-300 mb-6">
                  Your skills spiral and build upon each other throughout your
                  learning journey. See how foundational knowledge supports
                  advanced learning, which then develops into professional
                  expertise.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 grid-flow-row-dense">
                {nodes.filter(node => node.type === 'skills').map((node) => (
                  <div key={node.id} className="flex">
                    <SkillCard
                      description={node.properties.description}
                      key={`${node.label}-${node.properties.displayName}`}
                      title={node.properties.displayName}
                      supports={edges.filter(edge => edge.source === node.id).map(edge => nodes.find(n => n.id === edge.target))}
                      buildsFrom={edges.filter(edge => edge.target === node.id).map(edge => nodes.find(n => n.id === edge.source))}
                      category={node.properties.category}
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="verified">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Verified Skills
              </h2>
              <p className="text-slate-300 mb-6">
                Skills verified by educational institutions and certification
                bodies.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-green-500" />
                    <h3 className="text-xl font-semibold text-white">
                      Northwestern University
                    </h3>
                  </div>
                  <div className="space-y-3"></div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <h3 className="text-xl font-semibold text-white">
                      American Nurses Credentialing Center
                    </h3>
                  </div>
                  <div className="space-y-3"></div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-purple-500" />
                    <h3 className="text-xl font-semibold text-white">
                      Johns Hopkins University
                    </h3>
                  </div>
                  <div className="space-y-3"></div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recommendations">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Skill Recommendations
              </h2>
              <p className="text-slate-300 mb-6">
                Based on your current skills and learning journey, here are some
                recommended skills to develop next.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="overflow-hidden transition-all hover:shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <CardTitle>Advanced Patient Diagnostics</CardTitle>
                    <CardDescription className="text-blue-100">
                      Recommended next step
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-slate-600 mb-4">
                      This skill builds on your existing knowledge in Physical
                      Assessment and X-Ray Imaging, taking your diagnostic
                      capabilities to the next level.
                    </p>
                    <div className="mb-2">
                      <p className="text-sm font-medium text-slate-700">
                        Builds from:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Physical Assessment
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          X-Ray Imaging
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t">
                    <div className="text-sm text-slate-600">
                      Estimated time: 40 hours
                    </div>
                  </CardFooter>
                </Card>

                <Card className="overflow-hidden transition-all hover:shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                    <CardTitle>Healthcare Leadership</CardTitle>
                    <CardDescription className="text-green-100">
                      Career advancement
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-slate-600 mb-4">
                      Enhance your leadership capabilities in healthcare
                      settings, building on your patient care and ethical
                      foundations.
                    </p>
                    <div className="mb-2">
                      <p className="text-sm font-medium text-slate-700">
                        Builds from:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Patient-Centered Care
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Nursing Ethics
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t">
                    <div className="text-sm text-slate-600">
                      Estimated time: 60 hours
                    </div>
                  </CardFooter>
                </Card>

                <Card className="overflow-hidden transition-all hover:shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                    <CardTitle>Clinical Research Methods</CardTitle>
                    <CardDescription className="text-amber-100">
                      Specialization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-slate-600 mb-4">
                      Learn to design and conduct clinical research, leveraging
                      your critical thinking and data analysis skills.
                    </p>
                    <div className="mb-2">
                      <p className="text-sm font-medium text-slate-700">
                        Builds from:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Critical Thinking
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Data Analysis
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t">
                    <div className="text-sm text-slate-600">
                      Estimated time: 80 hours
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
