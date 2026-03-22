import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import * as LucideIcons from "lucide-react";
import {
  MemoryNode,
  GraphNode,
  GraphEdge } from "../types";
import { memoryService } from "../services/memoryService";
import { soundService } from "../services/soundService";
const {
  RefreshCw,
  Clock,
  Box,
  Maximize,
  Minimize,
} = LucideIcons as any;
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import { setHexAlpha } from "../config/themeColors";

interface Props {
  memories: MemoryNode[]; // Keep for fallback if graph unavailable
  theme?: any;
}

const LucaCloud: React.FC<Props> = ({ memories, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [isGraphMode, setIsGraphMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const graphRef = useRef<any>();
  const activeNodeRef = useRef<any>(null);

  // Fullscreen Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const nodeRgbCore = useMemo(() => {
    if (!theme?.hex) return "59, 130, 246"; // Blue default
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(theme.hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : "59, 130, 246";
  }, [theme]);

  // Use raw memories to generate dummy graph data if no graph service is active
  const fallbackGraphData = useMemo(() => {
    // 1. Cluster Similar Memories
    const clusters = new Map<
      string,
      { memory: (typeof memories)[0]; count: number }
    >();

    memories.forEach((m) => {
      // Normalize text to group highly similar messages (strip timestamps and roles)
      let coreText = m.value
        .replace(/\[?\d{4}-\d{2}-\d{2}T.*?Z\]?\s*/g, "") // Remove ISO
        .replace(/\[?\d{2}:\d{2}\.\d{3}Z\]?\s*/g, "") // Remove short times
        .replace(/^(User|LUCA|System):\s*/gi, "") // Remove Role
        .trim();

      if (!coreText) coreText = m.value;

      // Group by the first 60 characters to catch identical repeated prompts
      const clusterKey = coreText.substring(0, 60).toLowerCase();

      if (clusters.has(clusterKey)) {
        clusters.get(clusterKey)!.count += 1;
      } else {
        clusters.set(clusterKey, { memory: m, count: 1 });
      }
    });

    // 2. Map clustered memory objects to graph nodes
    let clusteredMemories = Array.from(clusters.values()).map((c) => {
      const displayValue =
        c.count > 1
          ? `[CLUSTERED x${c.count}]\n${c.memory.value}`
          : c.memory.value;
      return {
        ...c.memory,
        value: displayValue,
        // Scale nodes physically larger if they represent a massive cluster
        _clusterCount: c.count,
      };
    });

    // 3. Cap display to max 250 most recent clusters to prevent lag and overlap
    clusteredMemories = clusteredMemories.slice(-250);

    const nodes: GraphNode[] = clusteredMemories.map((m) => ({
      id: m.id,
      label: m.value,
      type: m.category === "USER_STATE" ? "ENTITY" : "CONCEPT",
      created: m.timestamp,
      _isMemoryText: true, // Flag to render as big bubble
      _clusterCount: m._clusterCount,
    }));

    // Generate random connections for visual flair on pure memories
    const edges: GraphEdge[] = [];
    if (nodes.length > 1) {
      for (let i = 0; i < nodes.length; i++) {
        if (Math.random() > 0.5 && i > 0) {
          edges.push({
            source: nodes[i].id,
            target: nodes[Math.floor(Math.random() * i)].id,
            relation: "ASSOCIATES",
            weight: 1,
            created: Date.now(),
          });
        }
      }
    }

    return { nodes, edges };
  }, [memories]);

  // Fetch Graph Data from Backend
  const fetchGraph = async () => {
    setLoading(true);
    const data = await memoryService.getGraphData();

    if (data && Object.keys(data.nodes).length > 0) {
      const nodesArr: GraphNode[] = Object.values(data.nodes);
      setGraphNodes(nodesArr);
      setGraphEdges(data.edges);
      setIsGraphMode(true);
    } else {
      // Fallback Visualizer using 3D ForceGraph with raw memories
      setGraphNodes(fallbackGraphData.nodes);
      setGraphEdges(fallbackGraphData.edges);
      setIsGraphMode(false);
    }
    setLoading(false);
  };

  // Initial Load
  useEffect(() => {
    fetchGraph();
    const interval = setInterval(fetchGraph, 7000); // Poll slower for 3D
    return () => clearInterval(interval);
  }, [fallbackGraphData]);

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const visibleEdges = useMemo(() => {
    return graphEdges.filter((e) => showHistory || !e.expired);
  }, [graphEdges, showHistory]);

  // Graph Data Structure mapping required by ForceGraph3D
  const activeData = useMemo(() => {
    return {
      nodes: graphNodes,
      links: visibleEdges,
    };
  }, [graphNodes, visibleEdges]);

  // Configure d3Forces when ref is mounted
  useEffect(() => {
    setTimeout(() => {
      if (graphRef.current) {
        // Tune physics to create a dense sphere cluster (Memories)
        // Weak repulsion so they pack tightly, small link distances
        graphRef.current.d3Force("charge").strength(-25);
        graphRef.current.d3Force("link").distance(35);
      }
    }, 100);
  }, [isGraphMode]);

  // 3D Bubble Generation
  const createBubbleNode = useCallback(
    (node: any, isExpanded: boolean = false) => {
      // 1. Create a 2D HTML5 Canvas off-screen
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return new THREE.Sprite();

      const size = 256;
      canvas.width = size;
      canvas.height = size;

      // Detect node type coloring
      let colorStart = `rgba(${nodeRgbCore}, 0.5)`;
      let colorEnd = `rgba(${nodeRgbCore}, 0.1)`;
      const borderColor = `rgba(${nodeRgbCore}, 0.8)`;

      if (node.type === "CONCEPT" || node._isMemoryText) {
        colorStart = `rgba(${nodeRgbCore}, 0.6)`;
        colorEnd = `rgba(${nodeRgbCore}, 0.2)`;
      }

      // 1.5 Draw Solid Background if Expanded for Text Readability
      if (isExpanded) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
        ctx.fillStyle = "#050505"; // Solid dark underlay
        ctx.fill();

        // Keep gradient very subtle over the dark background so white text pops
        colorStart = `rgba(${nodeRgbCore}, 0.3)`;
        colorEnd = `rgba(${nodeRgbCore}, 0.1)`;
      }

      // 2. Draw Sphere Background (Gradient)
      const gradient = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2,
      );
      gradient.addColorStop(0, colorStart);
      gradient.addColorStop(0.8, colorEnd);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // 3. Draw Outer Glow / Border Ring
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, 2 * Math.PI);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 4;
      ctx.stroke();

      // 4. Inject Text
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Text Wrapping Logic
      const words = node.label ? node.label.toString().split(" ") : ["UNKNOWN"];
      const lines = [];
      let currentLine = words[0];

      // Fit text inside the circle (approx center width)
      const maxTextWidth = size * 0.7;

      // Auto-scale font based on total word count
      const fontSize = words.length > 20 ? 12 : words.length > 10 ? 16 : 22;
      ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxTextWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);

      // Draw the multiple lines of text centered vertically
      const lineHeight = fontSize * 1.2;
      // Cap rendered lines to prevent escaping bubble
      const maxLines = Math.floor((size * 0.6) / lineHeight);
      const displayLines = lines.slice(0, maxLines);
      if (lines.length > maxLines) {
        displayLines[displayLines.length - 1] += "...";
      }

      const startY = size / 2 - ((displayLines.length - 1) * lineHeight) / 2;

      displayLines.forEach((line, i) => {
        ctx.fillText(line, size / 2, startY + i * lineHeight);
      });

      // 5. Convert to ThreeJS texture mapping
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: isExpanded, // Force expanded nodes to sort in front natively
        depthTest: true,
      });
      const sprite = new THREE.Sprite(material);

      // Nodes holding actual memory data blocks get bigger scales
      // If it's a cluster of many messages, make it even bigger base scale
      const clusterBonus =
        node._clusterCount && node._clusterCount > 1
          ? Math.min(node._clusterCount * 2, 20)
          : 0;
      const baseScale = node._isMemoryText ? 40 + clusterBonus : 25;
      sprite.scale.set(baseScale, baseScale, 1);

      return sprite;
    },
    [nodeRgbCore],
  );

  // Interaction Handlers
  const handleNodeClick = useCallback(
    (node: any) => {
      const activeNode = activeNodeRef.current;
      // If clicking same node, ignore
      if (activeNode && activeNode.id === node.id) return;

      // Revert previous active node scale and opacity
      if (activeNode) {
        const clusterBonus =
          activeNode._clusterCount && activeNode._clusterCount > 1
            ? Math.min(activeNode._clusterCount * 2, 20)
            : 0;
        const baseScale = activeNode._isMemoryText ? 40 + clusterBonus : 25;
        const shrunkenObj = createBubbleNode(activeNode, false);
        shrunkenObj.scale.set(baseScale, baseScale, 1);

        // Transfer texture map to the existing object without breaking the ForceGraph ref
        if (activeNode.__threeObj && shrunkenObj.material) {
          (activeNode.__threeObj.material as THREE.SpriteMaterial).map = (
            shrunkenObj.material as THREE.SpriteMaterial
          ).map;
          activeNode.__threeObj.scale.set(baseScale, baseScale, 1);
        }
      }

      // Expand clicked node moderately, allowing user to control exact size via mouse zoom
      if (node.__threeObj) {
        const bigScale = node._isMemoryText ? 80 : 60;
        const expandedObj = createBubbleNode(node, true);

        // Transfer texture map
        if (expandedObj.material) {
          (node.__threeObj.material as THREE.SpriteMaterial).map = (
            expandedObj.material as THREE.SpriteMaterial
          ).map;
          node.__threeObj.scale.set(bigScale, bigScale, 1);
        }
      }

      // Move camera smoothly mapping spherical dist mapping (closer zoom)
      const distance = 100;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

      if (graphRef.current) {
        graphRef.current.cameraPosition(
          {
            x: node.x * distRatio,
            y: node.y * distRatio,
            z: node.z * distRatio,
          }, // new position
          node, // lookAt ({ x, y, z })
          1500, // ms transition duration
        );
      }

      activeNodeRef.current = node;
    },
    [createBubbleNode],
  );

  const handleBackgroundClick = useCallback(() => {
    const activeNode = activeNodeRef.current;
    if (activeNode) {
      if (activeNode.__threeObj) {
        const clusterBonus =
          activeNode._clusterCount && activeNode._clusterCount > 1
            ? Math.min(activeNode._clusterCount * 2, 20)
            : 0;
        const baseScale = activeNode._isMemoryText ? 40 + clusterBonus : 25;
        const shrunkenObj = createBubbleNode(activeNode, false);

        if (shrunkenObj.material) {
          (activeNode.__threeObj.material as THREE.SpriteMaterial).map = (
            shrunkenObj.material as THREE.SpriteMaterial
          ).map;
          activeNode.__threeObj.scale.set(baseScale, baseScale, 1);
        }
      }
      activeNodeRef.current = null;
    }
  }, [createBubbleNode]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-black relative overflow-hidden border rounded group transition-all`}
      style={{
        borderColor: theme
          ? setHexAlpha(theme.hex, 0.2)
          : "rgba(126, 34, 206, 0.2)",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
      }}
    >
      {/* Header / Status */}
      <div
        className={`absolute top-3 right-3 text-[10px] font-mono ${theme ? theme.coreColor : "text-purple-500"} z-10 flex flex-col items-end gap-1 pointer-events-none`}
      >
        <div className="flex items-center gap-2">
          {loading && <RefreshCw size={10} className="animate-spin" />}
          {isGraphMode
            ? "PROJECT SYNAPSE V2 (3D)"
            : "LUCA MEMORY CLUSTERS (3D)"}
        </div>
        <div className="text-[9px] opacity-60">
          NODES: {graphNodes.length} | EDGES: {graphEdges.length}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-3 left-3 z-20 flex gap-2">
        <button
          onClick={async () => {
            soundService.play("KEYSTROKE");
            setLoading(true);
            await fetchGraph();
            if (graphRef.current) {
              graphRef.current.d3ReheatSimulation();
            }
            // Flash a success sound or state if needed
            setTimeout(() => setLoading(false), 500);
          }}
          disabled={loading}
          className={`transition-colors p-1 rounded ${
            loading
              ? "text-white animate-pulse"
              : "text-slate-600 hover:text-white hover:bg-white/10"
          }`}
          title="Force Graph Refresh"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>

        {isGraphMode && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1 rounded transition-all flex items-center gap-1 text-[9px] font-bold ${
              showHistory
                ? "bg-red-900/30 text-red-400 border border-red-500/30"
                : "text-slate-600 hover:text-white"
            }`}
            title="Toggle Temporal History (Expired Edges)"
          >
            <Clock size={14} />
            {showHistory ? "HISTORY: ON" : "HISTORY: OFF"}
          </button>
        )}
      </div>

      {/* 3D Force Graph Render */}
      <div className="absolute inset-0 cursor-move">
        <ForceGraph3D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={activeData}
          backgroundColor="#000000"
          showNavInfo={false}
          // Node Design
          nodeThreeObject={createBubbleNode}
          // Edge Design
          linkWidth={0.5}
          linkColor={(link: any) =>
            link.expired
              ? "rgba(239, 68, 68, 0.2)"
              : `rgba(${nodeRgbCore}, 0.4)`
          }
          // Interactive Handlers
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          // Add custom forces to keep nodes clustered in a spherical cloud
          cooldownTicks={100}
          onEngineStop={() => {
            // Auto-fit bounds on first layout calculation
            if (graphRef.current) {
              // graphRef.current.zoomToFit(400);
            }
          }}
        />
      </div>

      {/* Control Hint Overlay */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 text-[9px] font-mono text-slate-300 bg-black/60 px-2 py-1 rounded border border-white/5 pointer-events-none">
        <Box size={10} /> ROTATE / SCROLL TO ZOOM
      </div>

      {/* Fullscreen Toggle */}
      <button
        onClick={toggleFullscreen}
        className="absolute bottom-3 right-3 z-20 p-1.5 rounded bg-black/50 text-slate-500 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
      </button>
    </div>
  );
};

export default LucaCloud;
