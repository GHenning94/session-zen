"use client";
import { useState, useEffect, useRef } from "react";
import { Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrbitalCenterAvatar } from "@/components/OrbitalCenterAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({
  timelineData,
}: RadialOrbitalTimelineProps) {
  const { user } = useAuth();
  const [orbitalAvatar, setOrbitalAvatar] = useState<string>("");
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Load orbital avatar from configuracoes
  useEffect(() => {
    const loadOrbitalAvatar = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('configuracoes')
        .select('logo_url')
        .eq('user_id', user.id)
        .single();
      
      if (data?.logo_url) {
        setOrbitalAvatar(data.logo_url);
      }
    };
    
    loadOrbitalAvatar();
  }, [user]);

  const handleAvatarChange = async (newUrl: string) => {
    if (!user) return;
    
    // Update configuracoes table with new logo_url
    const { error } = await supabase
      .from('configuracoes')
      .upsert({
        user_id: user.id,
        logo_url: newUrl,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (!error) {
      setOrbitalAvatar(newUrl);
    }
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        // Center node rotation
        const nodeIndex = timelineData.findIndex((item) => item.id === id);
        const totalNodes = timelineData.length;
        const targetAngle = (nodeIndex / totalNodes) * 360;
        setRotationAngle(270 - targetAngle);

        setPulseEffect({});
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }

      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;

    if (autoRotate) {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate]);

  const calculateNodePosition = (index: number, total: number, isMobile: boolean = false) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = isMobile ? 135 : 140;
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = 1;

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "bg-primary text-primary-foreground";
      case "in-progress":
        return "bg-background border-2 border-primary text-foreground";
      case "pending":
        return "bg-background border-2 border-muted-foreground/30 text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div
      className="w-full h-[380px] md:h-[400px] flex flex-col items-center justify-center pointer-events-none"
      ref={containerRef}
    >
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center pointer-events-none">
        <div
          className="absolute w-full h-full flex items-center justify-center pointer-events-none"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Centro orbital com gradiente da plataforma e avatar upload */}
          <OrbitalCenterAvatar 
            currentAvatarUrl={orbitalAvatar}
            onAvatarChange={handleAvatarChange}
          />

          {/* Órbita */}
          <div className="absolute w-[270px] h-[270px] md:w-[280px] md:h-[280px] rounded-full border-2 border-border/60 animate-slow-pulse"></div>

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length, isMobile);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => (nodeRefs.current[item.id] = el)}
                className="absolute transition-all duration-700 cursor-pointer pointer-events-auto"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                {/* Nó orbital com barra de progresso circular */}
                <div className="relative">
                  {/* Barra de progresso circular ao redor do nó */}
                  {item.energy > 0 && item.status !== "pending" && (
                    <svg
                      className="absolute -inset-1 w-12 h-12"
                      viewBox="0 0 48 48"
                    >
                      {/* Background circle */}
                      <circle
                        cx="24"
                        cy="24"
                        r="22"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-muted/30"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="24"
                        cy="24"
                        r="22"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className={item.status === "completed" ? "text-primary" : "text-primary/80"}
                        strokeDasharray={`${(item.energy / 100) * 138.2} 138.2`}
                        transform="rotate(-90 24 24)"
                        style={{ transition: 'stroke-dasharray 0.5s ease' }}
                      />
                    </svg>
                  )}
                  
                  <div
                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center relative z-10
                    ${
                      isExpanded
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50"
                        : isRelated
                        ? "bg-primary/60 text-primary-foreground shadow-md shadow-primary/30"
                        : `${getStatusStyles(item.status)} shadow-sm transition-all duration-300`
                    }
                    transform
                    ${isExpanded ? "scale-150" : ""}
                  `}
                  >
                    <Icon size={16} />
                  </div>
                </div>

                {/* Título do nó - sem porcentagem nos círculos orbitais */}
                <div
                  className={`
                  absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-center
                  transition-all duration-300
                `}
                >
                  <span className={`text-xs font-semibold tracking-wider ${isExpanded ? "text-foreground" : "text-muted-foreground"}`}>
                    {item.title}
                  </span>
                </div>

                {/* Card de detalhes expandido */}
                {isExpanded && (
                  <Card className="absolute top-20 left-1/2 -translate-x-1/2 w-64 bg-card/95 backdrop-blur-lg border-border shadow-elegant overflow-visible pointer-events-auto">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-border"></div>
                    <CardHeader className="pb-2 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItem(item.id);
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
                        aria-label="Fechar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="flex justify-between items-center">
                        <Badge
                          className={`px-2 text-xs ${getStatusStyles(
                            item.status
                          )}`}
                        >
                          {item.status === "completed"
                            ? "CONCLUÍDO"
                            : item.status === "in-progress"
                            ? "EM PROGRESSO"
                            : "PENDENTE"}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {item.date}
                        </span>
                      </div>
                      <CardTitle className="text-sm mt-2">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      <div className="space-y-1">
                        {item.content.split('\n').map((line, idx) => (
                          <p key={idx}>{line}</p>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-border">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="flex items-center">
                            Progresso
                          </span>
                          <span className="font-mono">{item.energy}%</span>
                        </div>
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-primary"
                            style={{ width: `${item.energy}%` }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
