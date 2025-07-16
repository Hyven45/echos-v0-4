import { useMemo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useGroups } from "../../../../contexts/GroupContext";
import * as d3Force from "d3-force";
import * as d3Selection from "d3-selection";
import { interpolate } from "d3-interpolate";
import "d3-transition";
import * as d3Ease from "d3-ease";

// Constants
const ANIMATION_DURATION = 500;
const ENTRANCE_ANIMATION_DELAY = 100;
const ENTRANCE_ANIMATION_DURATION = 800;
const OPACITY_ANIMATION_DURATION = 300;
const SUBTITLE_DELAY_OFFSET = 200;

type FilterType = "tous" | "album" | "artist";

interface Node extends d3Force.SimulationNodeDatum {
  id: string;
  src: string;
  alt: string;
  type: "album" | "artist" | "title";
  groupName?: string;
  groupId?: string;
  albumId?: string;
  r: number;
  originalR?: number;
  group: string;
}

// Simulation configuration
const SIMULATION_CONFIG = {
  nodeSize: {
    album: 50,
    artist: 60,
    title: 200,
    hover: 70,
    maxDelta: 20,
    minAlbum: 20,
    minArtist: 25,
    holePadding: 2,
    clipPadding: 2,
  },
  forces: {
    charge: 0,
    collide: 1,
    center: 0.005,
    x: 0.002,
    y: 0.02,
  },
  centerHole: {
    radius: 0,
    strength: 0.02,
  },
  container: {
    width: 1280,
    height: 960,
  },
  performance: {
    alphaDecay: 0.0228,
    velocityDecay: 0.1,
    alphaTarget: 0.3,
    collisionIterations: 3,
    restartAlpha: 0.1,
  },
} as const;

// Utility functions
const createTitleNode = (): Node => ({
  id: "title-center",
  src: "",
  alt: "Titre central",
  type: "title",
  groupName: "Nous ne sommes qu'un",
  r: SIMULATION_CONFIG.nodeSize.title,
  group: "center",
  x: SIMULATION_CONFIG.container.width / 2,
  y: SIMULATION_CONFIG.container.height / 2,
  fx: SIMULATION_CONFIG.container.width / 2,
  fy: SIMULATION_CONFIG.container.height / 2,
});

const createAlbumNode = (album: any, group: any): Node => {
  const baseSize = SIMULATION_CONFIG.nodeSize.album;
  const randomDelta =
    (Math.random() - 0.5) * 2 * SIMULATION_CONFIG.nodeSize.maxDelta;
  return {
    id: `album-${album.id}`,
    src: album.src,
    alt: album.alt,
    type: "album",
    groupName: group.name,
    groupId: group.id,
    albumId: album.id.toString(),
    r: Math.max(SIMULATION_CONFIG.nodeSize.minAlbum, baseSize + randomDelta),
    group: group.id,
  };
};

const createArtistNode = (group: any): Node => {
  const baseSize = SIMULATION_CONFIG.nodeSize.artist;
  const randomDelta =
    (Math.random() - 0.5) * 2 * SIMULATION_CONFIG.nodeSize.maxDelta;
  return {
    id: `artist-${group.id}`,
    src: group.albums[0].src,
    alt: `${group.name} artist photo`,
    type: "artist",
    groupName: group.name,
    groupId: group.id,
    r: Math.max(SIMULATION_CONFIG.nodeSize.minArtist, baseSize + randomDelta),
    group: group.id,
  };
};

const createClusters = (groups: any[], width: number, height: number) => {
  const clusters = new Map();
  const numGroups = groups.length;
  groups.forEach((group, i) => {
    const angle = (i / numGroups) * 2 * Math.PI;
    const radius = Math.min(width, height) / 4;
    clusters.set(group.id, {
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
    });
  });
  return clusters;
};

const createClipPaths = (
  defs: d3Selection.Selection<SVGDefsElement, unknown, null, undefined>,
  data: Node[]
) => {
  data.forEach((d: Node) => {
    defs
      .append("clipPath")
      .attr("id", `clip-${d.id}`)
      .append("circle")
      .attr("r", 0)
      .attr("cx", 0)
      .attr("cy", 0);
  });
};

const createAlbumElements = (
  albums: d3Selection.Selection<SVGGElement, Node, SVGGElement, unknown>
) => {
  // Cercle extérieur noir du vinyle
  albums
    .append("circle")
    .attr("class", "outer")
    .attr("r", 0)
    .style("fill", "#000")
    .style("stroke", "#333")
    .style("stroke-width", 1);

  // Image de l'album
  albums
    .append("image")
    .attr("href", (d: Node) => d.src)
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 0)
    .attr("height", 0)
    .attr("clip-path", (d: Node) => `url(#clip-${d.id})`)
    .style("filter", "grayscale(20%)")
    .attr("preserveAspectRatio", "xMidYMid slice");

  // Trou central
  albums
    .append("circle")
    .attr("class", "hole")
    .attr("r", 0)
    .style("fill", "#1a1a1a");
};

const createArtistElements = (
  artists: d3Selection.Selection<SVGGElement, Node, SVGGElement, unknown>
) => {
  // Bordure blanche
  artists
    .append("circle")
    .attr("class", "outer")
    .attr("r", 0)
    .style("fill", "#fff")
    .style("stroke", "#ddd")
    .style("stroke-width", 1);

  // Photo de l'artiste
  artists
    .append("image")
    .attr("href", (d: Node) => d.src)
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 0)
    .attr("height", 0)
    .attr("clip-path", (d: Node) => `url(#clip-${d.id})`)
    .style("filter", "none")
    .attr("preserveAspectRatio", "xMidYMid slice");
};

const createTitleElements = (
  titleNode: d3Selection.Selection<SVGGElement, Node, SVGGElement, unknown>
) => {
  // Fond semi-transparent pour le titre
  titleNode.append("circle").attr("r", 0).style("fill", "transparent");

  // Texte principal du titre
  titleNode
    .append("text")
    .attr("class", "title-main")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .style("fill", "#B5252A")
    .attr("y", -10)
    .style("font-size", "0rem")
    .style("font-weight", "bold")
    .style("font-family", "Arial, sans-serif")
    .text("ECHOS");

  // Sous-titre
  titleNode
    .append("text")
    .attr("class", "title-sub")
    .attr("text-anchor", "middle")
    .attr("y", 25)
    .attr("dominant-baseline", "central")
    .style("fill", "#fff")
    .style("font-size", "0rem")
    .style("font-weight", "normal")
    .style("font-family", "Arial, sans-serif")
    .text("Nous ne sommes qu'un");
};

const animateNodeEntrance = (
  node: d3Selection.Selection<any, Node, any, any>,
  d: Node,
  i: number,
  defs: d3Selection.Selection<SVGDefsElement, unknown, null, undefined>
) => {
  const delay = i * ENTRANCE_ANIMATION_DELAY;

  // Animer l'apparition du groupe complet
  node
    .transition()
    .delay(delay)
    .duration(OPACITY_ANIMATION_DURATION)
    .ease(d3Ease.easeCircle)
    .style("opacity", 1);

  // Animer les cercles vers leur taille finale
  node
    .selectAll("circle")
    .transition()
    .delay(delay)
    .duration(OPACITY_ANIMATION_DURATION)
    .ease(d3Ease.easeCircle)
    .attr("r", function (this: any) {
      const element = d3Selection.select(this);
      if (element.classed("outer")) return d.r;
      if (element.classed("hole"))
        return SIMULATION_CONFIG.nodeSize.holePadding;
      return d.r;
    });

  // Animer les images vers leur taille finale
  const imageSize = d.r - SIMULATION_CONFIG.nodeSize.clipPadding;
  node
    .selectAll("image")
    .transition()
    .delay(delay)
    .duration(ENTRANCE_ANIMATION_DURATION)
    .ease(d3Ease.easeCircle)
    .attr("x", -imageSize)
    .attr("y", -imageSize)
    .attr("width", imageSize * 2)
    .attr("height", imageSize * 2);

  // Animer les clipPaths
  defs
    .select(`#clip-${d.id} circle`)
    .transition()
    .delay(delay)
    .duration(ENTRANCE_ANIMATION_DURATION)
    .ease(d3Ease.easeCircle)
    .attr("r", imageSize);

  // Animer les textes du titre
  if (d.type === "title") {
    node
      .select(".title-main")
      .transition()
      .delay(delay)
      .duration(ENTRANCE_ANIMATION_DURATION)
      .ease(d3Ease.easeCircle)
      .style("font-size", "3rem");

    node
      .select(".title-sub")
      .transition()
      .delay(delay + SUBTITLE_DELAY_OFFSET)
      .duration(ENTRANCE_ANIMATION_DURATION - SUBTITLE_DELAY_OFFSET)
      .ease(d3Ease.easeCircle)
      .style("font-size", "2rem");
  }
};

const handleNodeClick = (navigate: any, d: Node) => {
  if (d.type === "album" && d.albumId) {
    navigate(`/artist/${d.groupId}?album=${d.albumId}`);
  } else if (d.type === "artist" && d.groupId) {
    navigate(`/artist/${d.groupId}`);
  }
};

const handleNodeHover = (
  element: any,
  d: Node,
  simulation: d3Force.Simulation<Node, undefined>
) => {
  const targetSize = SIMULATION_CONFIG.nodeSize.hover;

  if (!d.originalR) {
    d.originalR = d.r;
  }

  const tween = interpolate(d.r, targetSize);
  d3Selection
    .select(element)
    .transition()
    .duration(ANIMATION_DURATION / 2)
    .ease(d3Ease.easeCircle)
    .tween("radius", function () {
      return function (t) {
        d.r = tween(t);
        updateCollisionForce(simulation);
        restartSimulationIfNeeded(simulation);
      };
    });

  if (d.type === "album") {
    d3Selection
      .select(element)
      .select("image")
      .transition()
      .duration(ANIMATION_DURATION)
      .style("filter", "grayscale(0%)");
  }
};

const handleNodeLeave = (
  element: any,
  d: Node,
  simulation: d3Force.Simulation<Node, undefined>
) => {
  const targetSize =
    d.originalR ||
    (d.type === "album"
      ? SIMULATION_CONFIG.nodeSize.album
      : SIMULATION_CONFIG.nodeSize.artist);

  const tween = interpolate(d.r, targetSize);
  d3Selection
    .select(element)
    .transition()
    .duration(ANIMATION_DURATION / 2)
    .ease(d3Ease.easeCircle)
    .tween("radius", function () {
      return function (t) {
        d.r = tween(t);
        updateCollisionForce(simulation);
        restartSimulationIfNeeded(simulation);
      };
    });

  if (d.type === "album") {
    d3Selection
      .select(element)
      .select("image")
      .transition()
      .duration(ANIMATION_DURATION)
      .style("filter", "grayscale(20%)");
  }
};

const updateVisualsOnTick = (
  nodeGroup: d3Selection.Selection<SVGGElement, Node, SVGGElement, unknown>,
  defs: d3Selection.Selection<SVGDefsElement, unknown, null, undefined>,
  data: Node[]
) => {
  nodeGroup.attr("transform", (d: Node) => `translate(${d.x},${d.y})`);

  // Mettre à jour les tailles visuelles des éléments
  nodeGroup.selectAll("circle").attr("r", function (this: any) {
    const d = d3Selection.select(this.parentNode).datum() as Node;
    const element = d3Selection.select(this);

    if (element.classed("outer")) return d.r;
    if (element.classed("hole")) return SIMULATION_CONFIG.nodeSize.holePadding;
    return d.r;
  });

  // Mettre à jour les tailles et positions des images
  nodeGroup
    .selectAll("image")
    .attr("x", function (this: any) {
      const d = d3Selection.select(this.parentNode).datum() as Node;
      return -(d.r - SIMULATION_CONFIG.nodeSize.clipPadding);
    })
    .attr("y", function (this: any) {
      const d = d3Selection.select(this.parentNode).datum() as Node;
      return -(d.r - SIMULATION_CONFIG.nodeSize.clipPadding);
    })
    .attr("width", function (this: any) {
      const d = d3Selection.select(this.parentNode).datum() as Node;
      return (d.r - SIMULATION_CONFIG.nodeSize.clipPadding) * 2;
    })
    .attr("height", function (this: any) {
      const d = d3Selection.select(this.parentNode).datum() as Node;
      return (d.r - SIMULATION_CONFIG.nodeSize.clipPadding) * 2;
    });

  // Mettre à jour les clipPaths
  defs.selectAll("clipPath circle").attr("r", function (this: any) {
    const clipId = d3Selection.select(this.parentNode).attr("id");
    const nodeId = clipId.replace("clip-", "");
    const node = data.find((d) => d.id === nodeId);
    return node ? node.r - SIMULATION_CONFIG.nodeSize.clipPadding : 0;
  });
};

interface FilterButtonsProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const FilterButtons: React.FC<FilterButtonsProps> = ({
  filter,
  onFilterChange,
}) => {
  const filterOptions: { key: FilterType; label: string }[] = [
    { key: "tous", label: "Tous" },
    { key: "album", label: "Albums" },
    { key: "artist", label: "Artistes" },
  ];

  return (
    <div className="flex gap-2 bg-white/4 rounded-xs p-4 shadow-md">
      {filterOptions.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onFilterChange(key)}
          className={`px-7 py-4 rounded-md text-3xl font-medium transition-all duration-200 ${
            filter === key
              ? "bg-[#B5252A] text-white shadow-md"
              : "text-gray-300 hover:text-white hover:bg-black/70"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

const updateCollisionForce = (
  simulation: d3Force.Simulation<Node, undefined>
) => {
  simulation.force(
    "collide",
    d3Force
      .forceCollide<Node>()
      .radius((node: Node) => node.r + SIMULATION_CONFIG.nodeSize.holePadding)
      .strength(SIMULATION_CONFIG.forces.collide)
      .iterations(SIMULATION_CONFIG.performance.collisionIterations)
  );
};

const restartSimulationIfNeeded = (
  simulation: d3Force.Simulation<Node, undefined>
) => {
  if (simulation.alpha() < SIMULATION_CONFIG.performance.restartAlpha) {
    simulation.alpha(SIMULATION_CONFIG.performance.restartAlpha).restart();
  }
};

const CollageMonde = () => {
  const { groups } = useGroups();
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3Force.Simulation<Node, undefined> | null>(
    null
  );
  const [filter, setFilter] = useState<FilterType>("tous");

  // Créer les données pour la simulation
  const data = useMemo(() => {
    const items: Node[] = [];

    // Ajouter le titre central
    items.push(createTitleNode());

    groups.forEach((group) => {
      // Ajouter les albums si le filtre le permet
      if (filter === "tous" || filter === "album") {
        group.albums.forEach((album: any) => {
          items.push(createAlbumNode(album, group));
        });
      }

      // Ajouter un représentant d'artiste si le filtre le permet
      if (
        (filter === "tous" || filter === "artist") &&
        group.albums.length > 0
      ) {
        items.push(createArtistNode(group));
      }
    });

    return items;
  }, [groups, filter]);

  // Initialiser la simulation d3 avec SVG
  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const svg = d3Selection.select(svgRef.current);
    const { width, height } = SIMULATION_CONFIG.container;

    // Nettoyer le SVG précédent
    svg.selectAll("*").remove();

    // Créer des clipPaths pour les images circulaires
    const defs = svg.append("defs");
    createClipPaths(defs, data);

    // Créer des clusters (positions cibles pour chaque groupe)
    const clusters = createClusters(groups, width, height);

    // Créer la simulation
    const simulation = d3Force
      .forceSimulation(data)
      .alphaTarget(SIMULATION_CONFIG.performance.alphaTarget)
      .velocityDecay(SIMULATION_CONFIG.performance.velocityDecay)
      .force(
        "center",
        d3Force
          .forceCenter(width / 2, height / 2)
          .strength(SIMULATION_CONFIG.forces.center)
      )
      .force(
        "x",
        d3Force
          .forceX<Node>()
          .x((d: Node) => {
            const cluster = clusters.get(d.group);
            return cluster ? cluster.x : width / 2;
          })
          .strength(SIMULATION_CONFIG.forces.x)
      )
      .force(
        "y",
        d3Force
          .forceY<Node>()
          .y((d: Node) => {
            const cluster = clusters.get(d.group);
            return cluster ? cluster.y : height / 2;
          })
          .strength(SIMULATION_CONFIG.forces.y)
      )
      .force(
        "collide",
        d3Force
          .forceCollide<Node>()
          .radius((d: Node) => d.r + SIMULATION_CONFIG.nodeSize.holePadding)
          .strength(SIMULATION_CONFIG.forces.collide)
          .iterations(SIMULATION_CONFIG.performance.collisionIterations)
      )
      .force(
        "charge",
        d3Force.forceManyBody().strength(SIMULATION_CONFIG.forces.charge)
      )
      .force(
        "radial",
        d3Force
          .forceRadial<Node>(
            SIMULATION_CONFIG.centerHole.radius,
            width / 2,
            height / 2
          )
          .strength(SIMULATION_CONFIG.centerHole.strength)
      );

    // Créer les groupes pour chaque nœud
    const nodeGroup = svg
      .selectAll(".node")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .style("opacity", 0);

    // Créer les éléments pour chaque type de nœud
    const albums = nodeGroup.filter((d: Node) => d.type === "album");
    const artists = nodeGroup.filter((d: Node) => d.type === "artist");
    const titleNode = nodeGroup.filter((d: Node) => d.type === "title");

    createAlbumElements(albums);
    createArtistElements(artists);
    createTitleElements(titleNode);

    // Animation d'entrée progressive
    nodeGroup.each(function (d: Node, i: number) {
      const node = d3Selection.select(this) as d3Selection.Selection<
        any,
        Node,
        any,
        any
      >;
      animateNodeEntrance(node, d, i, defs);
    });

    // Gestion des interactions avec animation physique (exclure le titre)
    nodeGroup
      .filter((d: Node) => d.type !== "title")
      .style("cursor", "pointer")
      .on("click", function (event: any, d: Node) {
        handleNodeClick(navigate, d);
      })
      .on("mouseenter", function (event: any, d: Node) {
        handleNodeHover(this, d, simulation);
      })
      .on("mouseleave", function (event: any, d: Node) {
        handleNodeLeave(this, d, simulation);
      });

    // Animation tick avec mise à jour des tailles visuelles
    simulation.on("tick", () => {
      updateVisualsOnTick(nodeGroup, defs, data);
    });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [data, groups]);

  return (
    <section
      id="collage-monde"
      className="relative py-16 overflow-hidden flex items-center justify-center flex-col"
    >
      <h2 className="title-stroke red text-[10rem] font-bold mb-16">
        Nos rookies
      </h2>
      <FilterButtons filter={filter} onFilterChange={setFilter} />

      {/* SVG pour la simulation d3 */}
      <svg
        ref={svgRef}
        width={SIMULATION_CONFIG.container.width}
        height={SIMULATION_CONFIG.container.height}
      />

      {/* Textes décoratifs avec la police Hit me, punk! */}
      <div className="absolute top-50 left-20 text-6xl font-bold font-hitmepunk text-white transform -rotate-14 pointer-events-none z-10">
        <svg
          width="465"
          height="131"
          viewBox="0 0 465 131"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20.8232 50.2052L20.8693 49.3071L20.6785 49.2497L20.5064 49.8219L20.6713 50.1515L20.8232 50.2052ZM7.0985 43.0935L7.56659 41.0583L6.99436 40.8862L6.90776 43.0361L7.0985 43.0935ZM43.3026 28.3668C41.9614 19.0837 37.0612 13.5301 28.6021 11.7059C17.3433 10.7144 10.9359 17.9924 9.3798 33.5399C8.47152 47.501 13.1913 55.3656 23.5392 57.1338C33.64 58.1984 39.7387 53.2062 41.8351 42.157L39.8814 41.6574L32.3 39.6813C31.2714 44.4491 28.9578 46.6359 25.3591 46.2415C21.7319 44.772 20.1096 40.7855 20.4922 34.2821C21.488 25.4565 24.1345 21.418 28.4319 22.1664C31.0122 23.0918 32.6015 25.6364 33.1998 29.8002L43.3026 28.3668ZM33.7051 10.0328L45.4271 12.2063C46.1666 12.4073 46.458 12.919 46.3014 13.7412L48.2537 25.816C48.6021 27.1047 48.8264 28.1855 48.9265 29.0583L59.6556 29.2931L48.8473 31.1304C48.5154 32.1452 47.6637 32.2997 46.292 31.5938L37.3205 32.2715L37.3545 36.0416L40.7509 37.4631L52.5359 49.2952L49.3118 48.1255L54.8605 52.4983L47.8494 59.7974L43.6148 61.8277L38.2635 53.3145L38.145 53.7348L37.9191 53.6349L37.6912 53.1424L37.0104 56.1775L37.1957 56.7052L36.8124 57.0219L37.3458 57.1903L36.6108 57.9053L36.4038 60.0829L36.6297 60.1829L37.0519 59.8699L36.8928 60.718L36.2391 60.5774L36.08 61.4255L36.4154 62.4384L36.3784 62.8272L35.9878 63.2217L35.7861 64.1051L35.9362 64.5902L35.5882 64.9495L35.3513 65.7902L35.5755 66.3216L34.7701 66.9514L34.62 66.4663L34.3089 66.4367L34.2294 66.8607L34.3795 67.3459L33.4166 67.5683L33.5387 67.109L32.6147 67.3351L30.7886 65.9059L29.3556 66.9469L29.0519 66.8396L28.8314 66.2693L28.7445 66.7711L28.5981 66.2471L27.6352 66.4695L26.874 65.8086L26.7982 66.1937L24.0182 63.6537L23.8166 64.537C22.8746 64.2644 22.4066 63.6837 22.4126 62.7948L20.7591 63.2655L20.3848 62.249L20.0368 62.6083L19.0108 61.8437L17.4757 61.894L17.5552 61.4699L17.3663 60.9811C16.4267 60.6826 15.4793 60.8803 14.5239 61.5742L14.7129 62.0631L14.0854 63.2983L12.8831 60.6728L12.5794 60.5654L12.4129 61.4913L10.322 59.9585L4.08319 58.3061C3.40293 58.0322 4.7339 49.6701 8.07611 33.2198L8.15195 32.8347L8.00187 32.3495L8.23149 32.4106L8.35362 31.9513L8.20353 31.4662L8.88806 28.3922L9.09503 26.2145L9.47827 25.8978L11.4477 12.1945L11.7588 12.2241L12.1285 9.15936L12.7261 6.58718L13.689 6.36478L32.9737 9.88481L33.9179 9.03282L33.7051 10.0328ZM78.4765 65.7687L78.7599 66.5019L78.8265 65.8019L78.4765 65.7687ZM85.2491 60.5658L85.0791 62.3546L85.2735 62.3731L85.6047 60.9527L85.4435 60.5843L85.2491 60.5658ZM86.5028 51.5031L86.4658 51.892L86.9714 51.9401L87.0453 51.1623L86.5028 51.5031ZM83.5233 70.0545L83.24 70.1453L83.542 70.6841L83.5233 70.0545ZM82.5038 73.7637L82.9704 73.808L82.7887 72.4174C82.7146 72.6458 82.6499 72.9143 82.5944 73.223L82.3222 73.1971L82.5685 73.4952L82.5038 73.7637ZM92.9743 87.0404L92.941 87.3904C94.3706 87.7617 95.0522 88.2974 94.9857 88.9973L95.2134 88.6658L95.4078 88.6843L95.6079 89.0565L97.4965 88.1765L97.6909 88.195L97.6576 88.545L97.4299 88.8765L97.3967 89.2265L98.1412 89.6504L98.6354 88.9911L98.791 89.0058C99.2058 89.0453 99.3676 89.5446 99.2764 90.5038L99.4709 90.5223L99.7407 87.6835L95.7742 87.3065L94.9243 87.5789L94.7631 87.2105L94.5687 87.192L94.341 87.5235L93.3632 87.0774L92.9743 87.0404ZM63.4277 85.802L63.3981 86.1131L64.6129 86.5424L65.5758 86.32L65.0127 85.6387L63.4277 85.802ZM72.2053 87.5779L71.9237 87.2372L71.3015 87.1781L71.272 87.4892L72.1757 87.889L73.4885 87.6998L73.7701 88.0405L74.1107 87.759L74.1403 87.4479L73.8588 87.1072L72.2053 87.5779ZM78.4765 65.7687L78.669 65.3946L78.7023 65.0446L79.4078 65.4648C78.9847 66.8895 78.6694 67.592 78.462 67.5723L78.0932 66.0854L78.3209 65.7539L78.4765 65.7687ZM90.1998 84.0301L90.3942 84.0485L89.9314 84.7893C89.9807 84.2708 89.785 83.9906 89.3443 83.9488L89.3775 83.5988L89.6886 83.6283L89.9163 83.2968L90.1998 84.0301ZM92.2809 82.776L92.5663 83.9018L91.4774 83.7983L91.5476 83.0595L92.2809 82.776ZM90.0323 80.0118L90.1898 80.4192L90.0863 81.508L89.6177 81.0711L89.651 80.7211L90.0323 80.0118ZM95.2376 80.1534L95.432 80.1719L94.7841 81.209L94.5897 81.1905L95.2376 80.1534ZM88.9303 78.8084L89.6303 78.8749L89.56 79.6138L89.1712 79.5768L88.9303 78.8084ZM88.9428 67.1165L89.8372 67.2015L89.767 67.9404L88.8726 67.8554L88.9428 67.1165ZM91.8148 67.0363L91.7483 67.7363L90.2725 67.9884L90.3427 67.2496L91.8148 67.0363ZM83.3914 58.2311L83.5154 58.1644L83.4452 58.9033L83.66 59.1199L83.6305 59.431L82.9491 59.9941L83.4826 60.9865L83.1031 61.2643L82.8309 61.2385L83.2128 63.8253C82.5647 63.7637 82.221 63.9403 82.1815 64.3551C82.8754 64.7611 83.4917 66.2584 84.0305 68.847L84.1082 68.8544L84.1415 68.5044L84.0229 68.1008L84.0562 67.7508L84.2117 67.7656L84.0894 67.4008L84.1929 66.312L84.3152 66.6767L84.5096 66.6952C84.6008 65.736 84.763 65.2675 84.9964 65.2896L85.2429 66.4117L85.0873 66.397L85.2096 66.7617L85.1394 67.5006C84.6727 67.4562 84.3717 68.147 84.2362 69.5729L84.0713 69.2433C84.1293 69.4581 84.1744 69.6716 84.2066 69.884L84.0862 69.9118L84.2029 69.9229L84.1659 70.3117L83.7457 71.0173L83.7772 71.0988C83.3883 71.0618 83.0588 71.5014 82.7887 72.4174L81.0658 59.5797L79.8883 60.4095L79.7271 60.041L79.7641 59.6521L80.9805 58.826L78.4222 25.4656L69.5967 25.0192L68.3488 25.7639L67.5284 25.7251L67.9543 25.3732L67.993 24.5529L61.2507 24.0691L57.2249 23.4903L46.6497 70.3562L57.927 71.428L59.8771 63.2948L61.1233 62.9816L70.0007 63.7075C70.716 66.3653 71.1246 69.3601 71.2264 72.6919L82.5038 73.7637L81.6507 76.547L82.2137 77.2284L82.1509 77.8894C81.4955 78.455 81.1284 79.1525 81.0495 79.9821L80.6995 79.9489L81.02 80.2932L80.9608 80.9154L80.2073 81.8248C79.3876 81.6422 78.595 81.4492 77.8296 81.2457L77.7444 81.316L77.6483 82.3271L77.7224 82.3734L77.641 82.4049L77.6299 82.5215L77.7039 82.5678L77.6262 82.5604C77.6558 82.7987 77.6836 82.919 77.7096 82.9215L77.8262 82.9326C77.904 82.94 77.9706 82.7894 78.0261 82.4807L78.0483 82.2474L78.3983 82.2807L78.4224 82.4399L78.3687 82.5918L78.3928 82.751L78.3318 82.9806L78.367 83.0232C78.2004 83.3998 77.8838 83.5659 77.4171 83.5215C77.0542 83.487 76.7683 83.3291 76.5597 83.0477L76.5208 83.044C76.1826 83.2996 75.8579 83.4126 75.5468 83.383L75.3172 83.322C74.8246 83.2751 74.569 82.9369 74.5504 82.3074C74.5873 81.9185 74.8076 81.6648 75.2113 81.5462L75.2539 81.511C76.1662 81.5454 76.6396 81.3811 76.6741 81.0181L76.6778 80.9792C76.421 80.9287 76.1772 80.8793 75.9463 80.8312L75.9426 80.8701C75.9229 81.0775 75.7408 81.2041 75.3964 81.2498C75.0075 81.2129 74.8303 81.0129 74.8648 80.65L74.8722 80.5722L41.3634 72.7182L50.9365 5.4315L90.2201 9.08644L87.9232 24.1712C87.637 24.9811 87.1698 25.3552 86.5217 25.2936L87.0847 25.9749L86.0129 27.7565L86.1927 28.7546L85.891 29.0398L85.8614 29.3509L86.0153 30.6212L85.7431 30.5953L85.9858 30.9323L85.9562 31.2434L85.5657 32.4619L85.8084 32.7988L85.7788 33.1099L85.4179 34.0174L85.6605 34.3543L85.631 34.6654C85.1276 36.1087 84.6426 36.8081 84.1759 36.7637L84.6799 38.0673L84.3392 38.3488L84.3096 38.6599L84.7638 40.9004L84.4138 40.8672C85.3411 41.8447 85.7877 43.8883 85.7538 46.998L86.0353 47.3387C85.3749 47.4067 84.972 48.2055 84.8266 49.7351L84.5544 49.7092L84.7934 50.085L84.4977 53.196C83.9014 53.1394 83.5836 53.3184 83.5442 53.7332C84.3417 54.1491 84.6875 54.9144 84.5816 56.0292L84.5483 56.3792C84.5089 56.794 84.1651 56.9706 83.517 56.909L83.3914 58.2311ZM79.5383 60.3762L79.8883 60.4095L79.855 60.7595L79.6236 61.1298L79.5904 61.4798L79.7516 61.8483L79.4016 61.815L79.5383 60.3762ZM90.5948 59.2296L90.9837 59.2666L90.9969 60.3665L90.4913 60.3185L90.5948 59.2296ZM84.7931 57.9327L84.9875 57.9512L85.1098 58.316L85.3042 58.3344L85.493 57.9992L85.4228 58.7381C85.6821 58.7627 85.7772 59.138 85.7082 59.8639L85.897 59.5287L86.0526 59.5435L86.6491 60.6988L84.8389 64.8823L84.4889 64.849L84.5259 64.4602L84.7499 64.1675L84.5736 62.3066L84.9236 62.3398L84.7624 61.9714L84.7956 61.6214L85.027 61.251L84.5861 60.1104L84.6194 59.7604L84.8471 59.4289L84.884 59.04L84.7931 57.9327ZM89.5241 57.2837L90.263 57.3539L89.8039 58.0558L89.4539 58.0225L89.5241 57.2837ZM87.7353 57.1137L88.0853 57.1469L88.0151 57.8858L88.2095 57.9043L88.9797 57.2319L88.9464 57.5819L88.4228 59.3764C88.1894 59.3542 88.1073 58.9801 88.1763 58.2542L87.9818 58.2358L87.9116 58.9746L88.1914 59.7467L88.0358 59.732L87.3151 57.8193L87.7353 57.1137ZM91.572 56.3796L91.7295 56.787L91.9239 56.8054L92.0775 56.4277L92.235 56.835L92.2017 57.185L91.974 57.5165L92.3629 57.5535L92.2927 58.2923L91.8373 58.9553L91.5262 58.9258L91.5594 58.5758L91.7871 58.2443L91.6962 57.137L91.5018 57.1185L90.6983 58.1408L90.5039 58.1223L90.5408 57.7334L91.572 56.3796ZM86.4 55.8881C86.3433 56.4843 86.4798 57.1121 86.8096 57.7712L86.8228 58.8711L86.6728 59.21L86.4784 59.1916L86.3172 58.8231L86.1228 58.8046L85.934 59.1398L85.8117 58.7751L85.8486 58.3862L86.3874 58.0842L86.4577 57.3454L85.493 57.9992C85.562 57.2733 85.428 56.8944 85.091 56.8624L85.1575 56.1624L86.4 55.8881ZM103.067 52.685L102.993 53.4627C102.761 54.2516 102.212 54.9319 101.347 55.5036L101.451 54.4148C101.943 54.4616 102.482 53.885 103.067 52.685ZM87.9116 49.4789L87.7748 50.9177L86.8014 53.7289L86.9588 54.1362C86.4774 54.2474 86.1226 54.8154 85.8944 55.84L85.7 55.8216L85.207 53.5773L85.8918 52.1514L85.727 51.8218L85.5714 51.807L84.6475 52.0331L84.714 51.3331L87.9116 49.4789ZM96.8563 44.1293L97.0211 44.4589L96.9879 44.8089L96.7565 45.1793L96.562 45.1608L96.4823 44.7608L96.5156 44.4108L96.6618 44.1108L96.8563 44.1293ZM97.7876 43.8254L97.9821 43.8439L98.3878 44.9419L98.2323 44.9271L98.0711 44.5587L97.8823 44.8939L97.4934 44.8569L97.7876 43.8254ZM86.4513 34.7042L86.6457 34.7226L86.9292 35.4559L86.8922 35.8447L86.3478 35.793L86.4513 34.7042ZM90.4861 33.9497L91.0305 34.0014C91.2702 34.7828 91.5326 35.1871 91.8178 35.2142L91.4866 36.6345L91.6666 38.4566C91.5926 39.2343 91.2669 40.1844 90.6894 41.3066L90.5822 42.4344L91.1266 42.4861L90.6713 43.1491L90.5527 42.7455L90.3582 42.727C90.2671 43.6862 89.7772 44.9868 88.8887 46.6289L88.8555 46.9789L89.0832 46.6474L89.4331 46.6806L89.3999 47.0306L89.1408 48.1047L89.4206 48.8768L88.0727 49.8474L87.9116 49.4789L87.9485 49.09L88.715 48.4566C88.784 47.7307 88.65 47.3517 88.313 47.3197L88.1555 46.9123L88.1887 46.5624C88.5517 46.5969 88.7911 46.0049 88.9069 44.7864L89.6771 44.1141L89.5548 43.7493L89.5843 43.4382C90.127 41.0308 90.4762 39.8345 90.6317 39.8493C90.9947 39.8838 91.2451 39.1752 91.3831 37.7234C90.8484 37.0186 90.5494 35.7607 90.4861 33.9497ZM88.2952 32.6428C88.2484 33.1354 88.3935 33.3977 88.7305 33.4297L88.6603 34.1686L88.4659 34.1501L88.3473 33.7464L88.1918 33.7317L87.4159 34.0503L87.2973 33.6466L87.3306 33.2967L88.2952 32.6428ZM102.866 30.0253L103.216 30.0585L103.69 30.8491L104.622 30.5452L104.548 31.323L103.818 31.5676L102.796 30.7641L102.866 30.0253ZM100.358 28.3351L100.514 28.3499L101.025 28.7516L100.955 29.4905L100.292 29.0351L100.358 28.3351ZM96.4308 27.9618L97.1697 28.0321L96.7143 28.6951L96.3643 28.6618L96.4308 27.9618ZM94.2011 26.6513L95.0659 27.0474L94.992 27.8251L94.4865 27.7771L94.1715 26.9624L94.2011 26.6513ZM90.6623 26.3149L91.0123 26.3482L91.8772 26.7443L91.6847 27.1184L91.6477 27.5073L90.5958 27.0149L90.6623 26.3149ZM88.368 26.0969L89.194 26.4893L88.8089 27.2375L87.9145 27.1525L87.9515 26.7636L88.368 26.0969ZM92.2937 26.0776C92.2493 26.5442 92.4734 26.801 92.966 26.8478L92.5421 27.5923L92.3477 27.5738L91.9067 26.4332L92.1381 26.0628L92.2937 26.0776ZM46.8297 81.674L47.0723 82.011L47.0428 82.3221L46.1095 82.2334L46.8297 81.674ZM42.9503 81.6192L42.8875 82.2803L41.345 82.4084L41.4041 81.7862L42.9503 81.6192ZM39.7376 81.981L40.7098 82.0734L40.6506 82.6956L39.6785 82.6032L39.7376 81.981ZM50.5094 83.0047C52.4106 83.3685 53.3402 83.7707 53.2983 84.2115L52.9872 84.1819L50.4502 83.6269L50.5094 83.0047ZM67.1672 34.4802L67.9876 34.519L69.5046 55.3026L62.2327 54.6115L67.1672 34.4802ZM113.828 17.4905L114.678 18.8662L114.008 19.3126L113.432 19.1794L113.828 17.4905ZM117.398 85.2024L131.712 85.6995L143.343 45.4866L143.968 43.8588L143.788 42.0368L144.76 41.3051L144.797 40.9163L133.157 38.7113L126.604 68.0275L126.18 67.948L126.417 42.7402L126.88 42.8234L126.497 42.3161L127.062 38.0144L117.581 36.2108L115.805 36.3167L114.574 35.6504L114.494 36.0744L117.398 85.2024ZM111.117 16.2911L112.589 20.198L113.165 20.3312L114.545 19.4421L115.121 19.5753L114.987 20.1512L113.479 21.5774L113.345 22.1533L115.034 22.5492L116.187 17.44L111.117 16.2911ZM111.054 92.094L110.315 92.0237L108.284 83.6691L109.143 83.7115L109.782 45.2007L108.443 44.8381L108.576 44.2621L109.915 44.6248L109.824 35.6698L110.417 35.216L110.052 34.5143L109.592 34.3922L110.181 33.9773L110.114 20.2374L109.654 20.1152L110.247 19.6614L110.341 19.0818L110.557 15.5709L145.864 23.0856L145.734 23.6227L149.979 23.5552L151.094 25.0345L141.741 83.3958L141.529 86.8678L138.837 97.4418L111.954 95.0047L111.054 92.094ZM181.061 75.5181L181.345 76.2513L181.411 75.5513L181.061 75.5181ZM187.834 70.3152L187.664 72.104L187.858 72.1225L188.189 70.7021L188.028 70.3337L187.834 70.3152ZM189.087 61.2525L189.05 61.6414L189.556 61.6894L189.63 60.9117L189.087 61.2525ZM186.108 79.8039L185.825 79.8946L186.127 80.4334L186.108 79.8039ZM185.088 83.5131L185.555 83.5574L185.373 82.1668C185.299 82.3952 185.235 82.6637 185.179 82.9724L184.907 82.9465L185.153 83.2446L185.088 83.5131ZM195.559 96.7898L195.526 97.1398C196.955 97.5111 197.637 98.0468 197.57 98.7467L197.798 98.4152L197.992 98.4337L198.192 98.8059L200.081 97.9259L200.276 97.9444L200.242 98.2944L200.015 98.6259L199.981 98.9759L200.726 99.3998L201.22 98.7404L201.376 98.7552C201.79 98.7947 201.952 99.294 201.861 100.253L202.056 100.272L202.325 97.4329L198.359 97.0559L197.509 97.3283L197.348 96.9598L197.153 96.9414L196.926 97.2729L195.948 96.8268L195.559 96.7898ZM166.012 95.5513L165.983 95.8624L167.198 96.2918L168.16 96.0694L167.597 95.3881L166.012 95.5513ZM174.79 97.3273L174.508 96.9866L173.886 96.9275L173.857 97.2386L174.76 97.6384L176.073 97.4492L176.355 97.7899L176.695 97.5084L176.725 97.1973L176.443 96.8566L174.79 97.3273ZM181.061 75.5181L181.254 75.144L181.287 74.794L181.992 75.2142C181.569 76.6389 181.254 77.3414 181.047 77.3217L180.678 75.8348L180.906 75.5033L181.061 75.5181ZM192.784 93.7795L192.979 93.7979L192.516 94.5387C192.565 94.0202 192.37 93.74 191.929 93.6982L191.962 93.3482L192.273 93.3777L192.501 93.0462L192.784 93.7795ZM194.866 92.5254L195.151 93.6512L194.062 93.5477L194.132 92.8089L194.866 92.5254ZM192.617 89.7612L192.774 90.1686L192.671 91.2574L192.202 90.8205L192.236 90.4705L192.617 89.7612ZM197.822 89.9028L198.017 89.9212L197.369 90.9583L197.174 90.9399L197.822 89.9028ZM191.515 88.5578L192.215 88.6243L192.145 89.3632L191.756 89.3262L191.515 88.5578ZM191.527 76.8659L192.422 76.9509L192.352 77.6898L191.457 77.6048L191.527 76.8659ZM194.399 76.7857L194.333 77.4857L192.857 77.7378L192.927 76.999L194.399 76.7857ZM185.976 67.9805L186.1 67.9138L186.03 68.6527L186.245 68.8693L186.215 69.1804L185.534 69.7435L186.067 70.7359L185.688 71.0137L185.416 70.9879L185.797 73.5747C185.149 73.5131 184.806 73.6897 184.766 74.1045C185.46 74.5105 186.076 76.0078 186.615 78.5964L186.693 78.6038L186.726 78.2538L186.608 77.8502L186.641 77.5002L186.796 77.515L186.674 77.1502L186.778 76.0614L186.9 76.4261L187.094 76.4446C187.185 75.4854 187.348 75.0169 187.581 75.039L187.828 76.1611L187.672 76.1464L187.794 76.5111L187.724 77.25C187.257 77.2056 186.956 77.8964 186.821 79.3223L186.656 78.9927C186.714 79.2075 186.759 79.421 186.791 79.6334L186.671 79.6612L186.788 79.6722L186.751 80.0611L186.33 80.7667L186.362 80.8482C185.973 80.8112 185.643 81.2508 185.373 82.1668L183.65 69.329L182.473 70.1589L182.312 69.7904L182.349 69.4015L183.565 68.5754L181.007 35.215L172.181 34.7686L170.933 35.5132L170.113 35.4745L170.539 35.1226L170.578 34.3023L163.835 33.8185L159.81 33.2397L149.234 80.1056L160.512 81.1774L162.462 73.0441L163.708 72.731L172.585 73.4569C173.301 76.1146 173.709 79.1094 173.811 82.4413L185.088 83.5131L184.235 86.2964L184.798 86.9778L184.736 87.6388C184.08 88.2044 183.713 88.9019 183.634 89.7315L183.284 89.6983L183.605 90.0426L183.545 90.6648L182.792 91.5742C181.972 91.3916 181.18 91.1986 180.414 90.9951L180.329 91.0654L180.233 92.0765L180.307 92.1228L180.226 92.1543L180.215 92.2709L180.289 92.3172L180.211 92.3098C180.24 92.5481 180.268 92.6684 180.294 92.6709L180.411 92.682C180.489 92.6894 180.555 92.5388 180.611 92.2301L180.633 91.9968L180.983 92.0301L181.007 92.1893L180.953 92.3412L180.977 92.5004L180.916 92.73L180.952 92.7726C180.785 93.1492 180.468 93.3153 180.002 93.2709C179.639 93.2364 179.353 93.0785 179.144 92.797L179.105 92.7934C178.767 93.049 178.443 93.162 178.131 93.1324L177.902 93.0714C177.409 93.0245 177.154 92.6863 177.135 92.0567C177.172 91.6679 177.392 91.4141 177.796 91.2956L177.839 91.2604C178.751 91.2947 179.224 91.1305 179.259 90.7675L179.262 90.7286C179.006 90.6781 178.762 90.6287 178.531 90.5806L178.527 90.6195C178.508 90.8269 178.325 90.9535 177.981 90.9992C177.592 90.9623 177.415 90.7623 177.449 90.3994L177.457 90.3216L143.948 82.4676L153.521 15.1809L192.805 18.8358L190.508 33.9206C190.222 34.7304 189.754 35.1046 189.106 35.043L189.669 35.7243L188.598 37.5059L188.777 38.504L188.476 38.7892L188.446 39.1003L188.6 40.3706L188.328 40.3447L188.57 40.6816L188.541 40.9927L188.15 42.2113L188.393 42.5482L188.363 42.8593L188.003 43.7668L188.245 44.1037L188.216 44.4148C187.712 45.8581 187.227 46.5575 186.761 46.5131L187.265 47.8167L186.924 48.0982L186.894 48.4093L187.348 50.6498L186.998 50.6165C187.926 51.5941 188.372 53.6377 188.338 56.7474L188.62 57.0881C187.96 57.1561 187.557 57.9549 187.411 59.4844L187.139 59.4586L187.378 59.8344L187.082 62.9454C186.486 62.8887 186.168 63.0678 186.129 63.4826C186.926 63.8985 187.272 64.6638 187.166 65.7786L187.133 66.1285C187.094 66.5433 186.75 66.7199 186.102 66.6584L185.976 67.9805ZM182.123 70.1256L182.473 70.1589L182.44 70.5088L182.208 70.8792L182.175 71.2292L182.336 71.5977L181.986 71.5644L182.123 70.1256ZM193.179 68.979L193.568 69.016L193.582 70.1159L193.076 70.0679L193.179 68.979ZM187.378 67.6821L187.572 67.7006L187.694 68.0654L187.889 68.0838L188.078 67.7486L188.007 68.4875C188.267 68.5121 188.362 68.8874 188.293 69.6133L188.482 69.2781L188.637 69.2929L189.234 70.4482L187.424 74.6317L187.074 74.5984L187.11 74.2095L187.335 73.9169L187.158 72.056L187.508 72.0892L187.347 71.7208L187.38 71.3708L187.612 71.0004L187.171 69.8598L187.204 69.5098L187.432 69.1783L187.469 68.7894L187.378 67.6821ZM192.109 67.0331L192.848 67.1033L192.389 67.8052L192.039 67.7719L192.109 67.0331ZM190.32 66.8631L190.67 66.8963L190.6 67.6352L190.794 67.6537L191.564 66.9813L191.531 67.3313L191.007 69.1257C190.774 69.1036 190.692 68.7295 190.761 68.0036L190.566 67.9852L190.496 68.724L190.776 69.4961L190.62 69.4814L189.9 67.5687L190.32 66.8631ZM194.157 66.129L194.314 66.5364L194.509 66.5548L194.662 66.177L194.82 66.5844L194.786 66.9344L194.559 67.2659L194.948 67.3028L194.877 68.0417L194.422 68.7047L194.111 68.6752L194.144 68.3252L194.372 67.9937L194.281 66.8863L194.086 66.8679L193.283 67.8902L193.089 67.8717L193.125 67.4828L194.157 66.129ZM188.985 65.6375C188.928 66.2337 189.064 66.8615 189.394 67.5206L189.407 68.6205L189.257 68.9594L189.063 68.941L188.902 68.5725L188.707 68.554L188.519 68.8892L188.396 68.5244L188.433 68.1356L188.972 67.8336L189.042 67.0948L188.078 67.7486C188.147 67.0227 188.013 66.6438 187.676 66.6117L187.742 65.9118L188.985 65.6375ZM205.651 62.4343L205.578 63.2121C205.346 64.001 204.797 64.6813 203.932 65.253L204.035 64.1642C204.528 64.211 205.067 63.6344 205.651 62.4343ZM190.496 59.2283L190.359 60.6671L189.386 63.4783L189.543 63.8856C189.062 63.9968 188.707 64.5647 188.479 65.5894L188.285 65.5709L187.792 63.3267L188.476 61.9008L188.312 61.5712L188.156 61.5564L187.232 61.7825L187.299 61.0825L190.496 59.2283ZM199.441 53.8787L199.606 54.2083L199.573 54.5583L199.341 54.9286L199.147 54.9102L199.067 54.5102L199.1 54.1602L199.246 53.8602L199.441 53.8787ZM200.372 53.5748L200.567 53.5933L200.972 54.6913L200.817 54.6765L200.656 54.3081L200.467 54.6433L200.078 54.6063L200.372 53.5748ZM189.036 44.4536L189.23 44.472L189.514 45.2053L189.477 45.5941L188.932 45.5424L189.036 44.4536ZM193.071 43.6991L193.615 43.7508C193.855 44.5322 194.117 44.9365 194.402 44.9636L194.071 46.3839L194.251 48.206C194.177 48.9837 193.852 49.9337 193.274 51.056L193.167 52.1837L193.711 52.2355L193.256 52.8985L193.137 52.4948L192.943 52.4764C192.852 53.4356 192.362 54.7362 191.473 56.3783L191.44 56.7283L191.668 56.3968L192.018 56.43L191.985 56.78L191.725 57.8541L192.005 58.6262L190.657 59.5968L190.496 59.2283L190.533 58.8394L191.3 58.206C191.369 57.4801 191.235 57.1011 190.898 57.0691L190.74 56.6617L190.773 56.3117C191.136 56.3462 191.376 55.7543 191.492 54.5358L192.262 53.8635L192.139 53.4987L192.169 53.1876C192.712 50.7802 193.061 49.5839 193.216 49.5987C193.579 49.6332 193.83 48.9246 193.968 47.4728C193.433 46.768 193.134 45.5101 193.071 43.6991ZM190.88 42.3922C190.833 42.8848 190.978 43.1471 191.315 43.1791L191.245 43.918L191.051 43.8995L190.932 43.4958L190.776 43.481L190.001 43.7997L189.882 43.396L189.915 43.0461L190.88 42.3922ZM205.451 39.7746L205.801 39.8079L206.275 40.5985L207.206 40.2946L207.132 41.0724L206.403 41.317L205.38 40.5135L205.451 39.7746ZM202.943 38.0845L203.099 38.0993L203.61 38.501L203.54 39.2399L202.877 38.7845L202.943 38.0845ZM199.015 37.7112L199.754 37.7815L199.299 38.4445L198.949 38.4112L199.015 37.7112ZM196.786 36.4006L197.651 36.7967L197.577 37.5745L197.071 37.5264L196.756 36.7117L196.786 36.4006ZM193.247 36.0643L193.597 36.0976L194.462 36.4937L194.269 36.8678L194.232 37.2567L193.18 36.7643L193.247 36.0643ZM190.953 35.8463L191.779 36.2387L191.394 36.9869L190.499 36.9019L190.536 36.513L190.953 35.8463ZM194.878 35.827C194.834 36.2936 195.058 36.5504 195.551 36.5972L195.127 37.3417L194.932 37.3232L194.491 36.1826L194.723 35.8122L194.878 35.827ZM149.414 91.4234L149.657 91.7604L149.627 92.0715L148.694 91.9828L149.414 91.4234ZM145.535 91.3686L145.472 92.0297L143.93 92.1578L143.989 91.5356L145.535 91.3686ZM142.322 91.7304L143.294 91.8227L143.235 92.4449L142.263 92.3526L142.322 91.7304ZM153.094 92.7541C154.995 93.1179 155.925 93.5201 155.883 93.9609L155.572 93.9313L153.035 93.3763L153.094 92.7541ZM169.752 44.2296L170.572 44.2683L172.089 65.052L164.817 64.3609L169.752 44.2296ZM216.412 27.2399L217.263 28.6156L216.592 29.062L216.016 28.9288L216.412 27.2399ZM219.983 94.9518L234.297 95.4489L245.927 55.236L246.553 53.6082L246.373 51.7862L247.345 51.0545L247.382 50.6657L235.741 48.4607L229.188 77.7769L228.764 77.6974L229.002 52.4896L229.465 52.5728L229.081 52.0655L229.647 47.7638L220.166 45.9602L218.39 46.0661L217.159 45.3998L217.079 45.8238L219.983 94.9518ZM213.701 26.0405L215.174 29.9474L215.75 30.0806L217.129 29.1915L217.705 29.3247L217.572 29.9006L216.063 31.3267L215.93 31.9027L217.619 32.2986L218.771 27.1894L213.701 26.0405ZM213.638 101.843L212.9 101.773L210.868 93.4185L211.728 93.4609L212.366 54.9501L211.027 54.5875L211.161 54.0115L212.499 54.3742L212.409 45.4192L213.001 44.9654L212.636 44.2637L212.177 44.1416L212.766 43.7267L212.698 29.9868L212.239 29.8646L212.832 29.4108L212.926 28.8312L213.142 25.3203L248.449 32.835L248.319 33.3721L252.563 33.3046L253.678 34.7839L244.326 93.1452L244.113 96.6172L241.421 107.191L214.539 104.754L213.638 101.843ZM256.394 93.7427L266.695 94.761L266.754 94.1388L271.556 51.0405L261.251 50.0611L258.18 83.2004L256.394 93.7427ZM262.247 45.3686L271.965 46.3314L271.979 46.1758L273.272 36.2929L263.55 35.3689L262.247 45.3686ZM281.682 53.4938L280.806 52.3904L279.834 52.298L278.766 53.2167L278.673 54.1888L279.549 55.2923L280.521 55.3847L281.59 54.466L281.682 53.4938ZM229.888 96.8349L229.676 98.6589L230.791 99.3142L233.237 98.7619L234.522 97.6283L234.734 95.8043L233.619 95.149L231.212 95.705L229.888 96.8349ZM279.53 33.1992L271.309 99.4765L247.498 96.5073L246.768 94.2798L246.263 94.2318L248.788 82.9356L248.858 82.1968L248.458 81.4525L248.525 80.7525L249.062 80.058L249.528 80.1023L249.128 79.358L249.198 78.6192L250.001 75.1248L249.535 75.0804L250.072 74.3859L250.681 67.9695L252.587 68.1506L252.657 67.4117L251.888 65.1805L251.955 64.4806L252.927 64.573L254.036 63.2265L253.597 62.4785L254.173 61.7877L254.239 61.0877L253.804 60.3008L253.87 59.6009L254.605 36.5984L255.18 35.9076L255.247 35.2076C254.288 35.1165 253.854 34.5913 253.945 33.632L254.078 32.2321L255.724 30.1912L279.53 33.1992ZM246.384 25.6544L246.588 25.9877L244.923 35.2467L244.651 35.2208L243.86 34.871L244.068 35.1654L243.681 37.1691C242.953 37.126 242.423 38.0174 242.093 39.8433L241.639 39.2508L242.998 36.5155L242.846 35.6378L243.893 32.873L244.438 32.9247L244.162 34.5858L244.473 34.6153L245.161 30.6784L245.074 29.5322L245.502 28.7488L245.418 27.5637L245.755 27.3211L245.82 27.0526L245.694 25.9027L246.073 25.6248L246.384 25.6544ZM239.374 27.5779L239.685 27.6075C239.413 29.0988 239.599 30.1629 240.245 30.7998L239.973 30.7739L238.787 29.2094L239.098 29.239L238.943 28.4002L239.374 27.5779ZM221.271 80.1635L220.376 80.0785L220.484 79.7748L221.404 79.5876L221.271 80.1635ZM233.142 81.1741L231.011 80.893L229.609 80.3674L229.742 79.7915L233.172 80.863L233.927 80.3462L234.239 80.3757L233.142 81.1741ZM241.484 40.0601L241.973 40.6951L241.295 41.2193L241.484 40.0601ZM241.56 42.971L242.105 43.0227L241.855 44.4116L241.311 44.3598L241.56 42.971ZM242.59 45.3447L243.135 45.3964L237.325 78.0401L236.78 77.9883L240.101 59.1555L239.858 58.8185L240.23 58.6184L241.107 53.5223L240.955 52.6446L241.519 51.2464L242.59 45.3447ZM239.865 45.9489L239.744 46.8007L239.161 46.7453L239.191 46.4342L239.865 45.9489ZM239.071 47.286L239.615 47.3378L237.818 52.6211L237.274 52.5694L239.071 47.286ZM239.627 50.5172L240.21 50.5726L240.207 52.2596L239.896 52.23L239.442 51.6375L239.627 50.5172ZM236.868 53.1194L237.413 53.1712L237.137 54.8323L236.593 54.7805L236.868 53.1194ZM236.187 55.3306L236.77 55.386L236.611 56.2341L236.028 56.1787L236.187 55.3306ZM235.665 56.6935L236.21 56.7453L235.953 58.2119L235.408 58.1602L235.665 56.6935ZM237.732 58.0671L238.276 58.1189L238.023 59.5466L237.479 59.4949L237.732 58.0671ZM234.459 60.3065L235.003 60.3583L234.75 61.786L234.205 61.7343L234.459 60.3065ZM233.274 63.6862L233.857 63.7416L233.608 65.1305L233.024 65.075L233.274 63.6862ZM235.802 65.5745L236.385 65.6299L236.132 67.0576L235.549 67.0022L235.802 65.5745ZM232.032 67.2566L232.616 67.312L232.431 68.4324L231.847 68.3769L232.032 67.2566ZM230.209 72.8122L231.337 72.9194L231.25 73.4212L230.123 73.314L230.209 72.8122ZM222.939 80.3613L221.547 80.1505L221.68 79.5746L223.072 79.7854L222.939 80.3613ZM276.444 56.1744L277.116 56.9445L276.307 57.6132L276.444 56.1744ZM272.055 25.9752L272.69 27.1343L271.885 27.764L272.624 27.8342L274.163 26.921C273.203 26.8299 272.747 26.538 272.794 26.0454L272.055 25.9752ZM277.838 55.9537L277.216 55.8946L276.903 55.4725L276.477 55.8244C275.612 56.9455 274.726 57.4629 273.819 57.3767L274.135 57.7599L274.102 58.1099L274.485 57.7932L274.835 57.8264L276.98 58.3834L277.702 58.2166C277.717 58.061 277.72 57.8913 277.711 57.7073L277.429 57.3667L277.774 57.0463C277.782 56.6809 277.804 56.3167 277.838 55.9537ZM276.225 51.0525L276.154 51.7913L276.504 51.8246L277.313 51.156L276.225 51.0525ZM270.596 45.4558L270.53 46.1558L271.579 46.2556L270.946 45.4891L270.596 45.4558ZM272.035 45.5925L271.968 46.2925L273.757 46.4625L273.861 45.3737L272.035 45.5925ZM270.94 41.8393L270.518 42.1523L270.447 42.8912L271.186 42.9614L271.956 42.289L270.94 41.8393ZM269.462 41.6988L269.325 43.1377L269.714 43.1746L269.851 41.7358L269.462 41.6988ZM271.426 40.4337L271.323 41.5226L272.023 41.5891L272.126 40.5002L271.426 40.4337ZM271.143 39.7005L271.11 40.0505L271.88 39.3781L271.913 39.0281L271.143 39.7005ZM274.261 37.4463L274.194 38.1463L275.244 38.246L275.311 37.5461L274.261 37.4463ZM271.383 37.1728L271.317 37.8728L273.069 38.4317L273.419 38.4649L272.822 37.3095L271.7 37.5561L271.383 37.1728ZM274.042 35.6205L273.242 36.604L273.205 36.9928L274.431 35.6575L274.042 35.6205ZM271.295 30.2584L271.262 30.6084L271.508 31.7305L271.897 31.7675L272.663 31.134L272.7 30.7452L272.313 31.1008L271.575 31.0305L271.645 30.2917L271.295 30.2584ZM272.137 29.2398L272.067 29.9787L272.417 30.0119L273.539 29.7654L273.856 30.1487L273.823 30.4986L273.369 31.5542L273.719 31.5875L275.191 31.3743L275.228 30.9854C274.736 30.9386 274.522 30.5652 274.589 29.8652L272.137 29.2398ZM274.862 26.9875L274.479 27.3043L274.446 27.6543L274.763 28.0375L275.502 28.1077L275.535 27.7577L274.862 26.9875ZM281.427 26.8659L282.127 26.9324L281.957 28.7212L281.257 28.6547L281.29 28.3047L281.673 27.988L281.357 27.6047L281.427 26.8659ZM276.716 38.0328L276.47 36.9107C278.293 35.0697 279.241 33.6295 279.313 32.59L279.978 30.1419L311.032 35.3299L314.715 34.9736L315.032 35.3568L315.382 35.3901L317.589 35.286L317.56 35.5971L316.438 35.8436L314.027 53.7818L314.343 54.1651C313.747 54.1084 313.036 55.2573 312.211 57.6116C311.459 57.5402 310.549 58.173 309.48 59.5102C310.672 59.6235 311.245 59.9265 311.198 60.419L311.03 60.9524L310.758 60.9265L310.934 61.1394L310.712 61.8246L310.732 62.0227L310.269 61.9395C308.431 59.5413 306.426 58.1998 304.256 57.915L304.326 57.1762C307.194 57.5533 309.539 55.3043 311.363 50.4289L311.648 48.2586C311.793 41.4972 309.114 37.7634 303.609 37.0571L297.176 36.2103L284.619 34.9777L280.469 78.6481L299.485 80.4554C305.638 79.8369 309.5 75.8092 311.07 68.3723L311.443 68.9963L312.335 69.5127C312.307 69.5362 312.292 69.5609 312.289 69.5868L312.445 69.6016L312.593 69.6941L312.484 69.6053L314 69.7494C313.239 70.331 312.542 70.6441 311.91 70.6887C311.318 73.6145 310.713 81.7709 310.094 95.1579L309.672 95.4709C310.631 95.5621 311.088 95.854 311.041 96.3465L310.837 98.4853C310.769 99.2112 308.816 99.3919 304.979 99.0272L304.662 98.644L277.439 98.1364L276.701 98.0662C275.819 97.9825 276.153 84.6992 277.702 58.2166L278.102 58.1369L277.711 57.7073L277.774 57.0463L277.816 57.0111L277.916 55.9611L277.838 55.9537C278.198 49.9713 277.824 43.9977 276.716 38.0328ZM296.238 60.5276C298.996 61.7837 300.184 63.8716 299.802 66.7913C298.786 70.3308 297.012 71.928 294.481 71.5828L291.141 71.2261L292.209 59.9877L296.238 60.5276ZM296.918 43.8766C299.374 44.1884 300.608 45.7838 300.623 48.6626C299.863 52.2527 297.271 53.7852 292.848 53.2602L293.776 43.4995L296.918 43.8766ZM297.079 30.6292L297.008 31.3681L295.186 31.548L295.253 30.8481L297.079 30.6292ZM293.392 31.0244L294.481 31.1278L294.414 31.8278L293.325 31.7243L293.392 31.0244ZM276.668 46.386L276.635 46.736L276.148 48.1416L275.759 48.1046L275.126 47.3381L275.163 46.9492L276.668 46.386ZM275.323 41.5495L275.639 41.9328L275.989 41.966L277.112 41.7195C277.06 42.264 276.43 42.5573 275.223 42.5995L275.323 41.5495ZM275.426 40.4607L275.323 41.5495L274.654 40.7405L275.037 40.4237L275.426 40.4607ZM273.319 39.5149L274.058 39.5851L273.987 40.3239L274.371 40.0072L275.071 40.0737L274.304 40.7072L273.954 40.6739L273.282 39.9037L273.319 39.5149ZM277.433 30.4887L278.172 30.5589L278.106 31.2589L276.667 31.1221L277.433 30.4887ZM342.494 86.1909L343.155 86.2537L343.004 87.8481L342.343 87.7853L342.494 86.1909ZM330.765 58.9041C331.927 59.0669 332.422 60.0556 332.249 61.8703L331.961 64.9035C331.902 65.5257 331.121 65.8962 329.619 66.015L329.191 65.9744L328.833 65.1949L329.184 59.0285L329.443 58.7785L330.765 58.9041ZM329.335 71.4814L329.896 72.5942L329.863 72.9442L329.301 71.8314L329.335 71.4814ZM337.997 87.6861L338.582 88.1342L338.549 88.4841L337.93 88.3861L337.997 87.6861ZM324.889 83.576L324.874 83.7316L324.608 84.0594L324.578 84.3705L326.091 84.5535L326.121 84.2424C325.501 84.1574 325.091 83.9352 324.889 83.576ZM342.061 94.4683L342.477 93.8016L342.902 89.3295L343.289 87.3259L343.191 86.2963L343.385 86.3148L343.224 85.9463L343.486 83.1853L343.447 83.1816L343.536 82.2483L343.355 82.5058L343.125 82.4447L343.478 80.791C343.329 77.4024 342.822 75.039 341.955 73.701L341.721 73.6788L341.592 75.0399L341.164 74.9992L341.198 74.6493L341.425 74.3178L341.459 73.9678L341.264 73.9493L340.77 74.6086L341.131 75.3492L340.25 75.5401L340.474 75.2475L340.313 74.8791L340.346 74.5291L341.16 72.5661L340.571 72.1569L339.842 72.4015L339.743 71.372L339.019 71.9702L338.886 70.8981C339.83 70.5955 340.652 70.2027 341.352 69.7199L341.397 69.2533L341.941 69.305C343.358 68.1579 344.159 66.6121 344.344 64.6678L344.891 58.9124C345.032 52.4647 343.435 49.043 340.098 48.6473L339.709 48.6104C335.081 48.0397 327.681 47.598 317.508 47.2852L317.666 47.6926L317.633 48.0426L315.219 82.9317L317.393 83.1776L317.888 82.5182L318.088 82.8904L318.278 82.9478L319.667 82.3734L320.064 83.1567L320.824 82.1695L322.104 82.3304L322.504 83.0747L324.113 82.2466L324.346 82.2688L324.317 82.5799L324.05 82.9077L324.017 83.2577L324.791 83.3705C324.733 83.1557 324.716 82.9187 324.741 82.6595L324.974 82.6816L326.454 83.2146L326.944 82.5942L326.848 83.6053L327.509 83.6681L327.635 82.3459L327.995 76.4944L328.219 76.2017L330.199 76.4291C330.983 77.2622 331.291 78.5603 331.123 80.3231L330.9 83.0878L332.255 82.8635C332.823 82.9436 333.064 83.4374 332.978 84.3448L333.211 84.3669L333.478 84.0391L334.53 84.5315L336.309 84.3867L336.67 85.1273L337.328 85.229L338.446 85.0214C338.397 85.5399 339.529 86.0137 341.842 86.4429L341.615 86.7744L341.582 87.1244L340.063 86.5877L335.452 86.3849L335.613 86.7533L335.55 87.4144L335.123 87.3738L335.028 86.3053L334.071 86.8814L332.782 86.4058L331.901 86.5967L331.036 86.2006L330.608 86.1599L330.578 86.471L330.74 86.8395L330.382 88.5321L329.706 95.6484L342.156 97.1847L342.348 95.1626L342.128 95.4163L341.661 95.372L341.691 95.0609L341.964 94.6553L340.681 94.5333L340.751 93.7945L342.112 93.9238L342.061 94.4683ZM332.924 103.488L331.263 103.212L331.111 103.983L332.811 104.262L332.924 103.488ZM331.435 99.3442L331.359 99.7293L333.755 99.29L333.831 98.9048L333.556 98.4864L329.424 99.0353L329.383 99.4631L329.657 99.8815L331.435 99.3442ZM331.498 83.8117L331.465 84.1617L332.317 84.2819L332.383 83.582L332.192 83.5246L331.498 83.8117ZM331.165 84.8395L331.135 85.1506L332.03 85.2356L332.059 84.9245L331.165 84.8395ZM314.935 85.926L314.221 93.4313L326.408 95.2565L327.251 86.3902L314.935 85.926ZM354.379 51.1425L354.924 51.1942L354.883 51.622L354.265 52.348L354.379 51.1425ZM369.586 36.4607L369.861 36.8792L368.652 49.5953L368.341 49.5657L367.367 49.0808L367.641 49.4992L367.382 52.2213C366.522 52.1919 365.973 53.4215 365.737 55.9103L365.103 55.1438L366.484 51.3512L366.284 50.155L367.272 46.3643L367.933 46.4271L367.715 48.7215L368.065 48.7547L368.579 43.3494L368.376 41.7607L368.83 40.7051L368.628 39.1163L369.015 38.7607L369.052 38.3718L368.85 36.7831L369.236 36.4275L369.586 36.4607ZM361.558 39.1899L361.869 39.2195C361.674 41.2676 361.981 42.7224 362.788 43.5839L362.477 43.5543L360.99 41.451L361.34 41.4843L361.097 40.3233L361.558 39.1899ZM357.663 108.664L356.274 108.415L355.803 107.585L358.664 107.622L357.663 108.664ZM361.54 42.6805L361.315 45.0526L365.631 45.4628L365.561 46.2017L358.872 45.566L358.942 44.8272L361.003 45.023L360.694 44.562L360.805 43.3954L361.54 42.6805ZM365 56.2327L365.626 57.0769L364.852 57.7882L365 56.2327ZM365.334 60.149L365.956 60.2082L365.775 62.1136L365.153 62.0545L365.334 60.149ZM366.675 63.3764L367.336 63.4392L363.09 108.121L362.429 108.058L364.875 82.3145L364.562 81.8923L364.949 81.5367L365.607 74.6148L365.368 73.4149L365.903 71.5038L366.675 63.3764ZM363.57 64.2584L363.459 65.425L362.759 65.3585L362.796 64.9696L363.57 64.2584ZM362.685 66.1362L363.385 66.2028L361.641 73.4138L361.018 73.3547L362.685 66.1362ZM363.644 70.5043L364.344 70.5708L364.437 72.8947L364.125 72.8652L363.496 72.0598L363.644 70.5043ZM360.591 74.138L361.252 74.2009L361.037 76.4563L360.376 76.3935L360.591 74.138ZM359.953 77.138L360.652 77.2045L360.542 78.3711L359.842 78.3046L359.953 77.138ZM359.421 79.0102L360.121 79.0767L359.933 81.06L359.233 80.9934L359.421 79.0102ZM361.992 80.8633L362.653 80.9261L362.468 82.8705L361.807 82.8076L361.992 80.8633ZM358.322 83.9675L358.945 84.0266L358.76 85.971L358.138 85.9119L358.322 83.9675ZM360.305 91.1797L361.005 91.2462L360.824 93.1517L360.124 93.0851L360.305 91.1797ZM311.594 104.561L312.326 96.8611L312.17 96.0223L312.324 95.6445L312.365 95.2167L316.995 35.3472L317.302 34.5916C340.031 36.8302 351.366 38.2605 351.307 38.8827C351.535 38.9568 351.149 43.2887 350.15 51.8785C350.305 51.8933 350.319 52.5747 350.191 53.9228L350.078 53.8728C349.255 55.1025 348.666 57.584 348.311 61.3172L348.541 61.3782L350.073 55.9912L350.114 55.5635L350.227 55.6134L350.075 65.8795L349.616 65.7574C349.486 65.7451 349.474 65.1815 349.58 64.0668L349.158 63.5558L348.349 65.8724L348.503 65.4947C349.577 66.303 350.088 66.9794 350.036 67.5239L349.886 67.8628L348.388 66.7002C347.844 68.2965 347.524 69.6002 347.428 70.6112L347.774 70.6834L347.737 71.0723L347.584 71.45L347.543 71.8778C347.774 71.9259 347.863 72.2222 347.812 72.7666L347.315 73.0333L347.201 74.2388L347.159 75.9221L344.785 107.087L344.439 107.015C344.055 106.926 343.838 107.141 343.789 107.66L343.404 106.76L342.217 107.275L342.254 106.886C341.59 107.268 340.771 107.347 339.799 107.124L339.684 106.681L339.721 106.292L339.606 106.674L339.489 106.662L338.185 105.518L337.189 105.267L334.849 107.595L334.773 107.156L334.81 106.767L334.964 106.389L334.847 106.378L334.736 106.721L334.619 106.71L334.504 106.267L334.427 106.26L333.927 106.565L333.199 105.555L332.699 105.86L332.623 105.421L331.778 106.047L331.243 105.486L330.897 105.414L329.478 105.476L329.399 105.076L328.942 106.17L328.901 105.774L328.941 105.346L328.788 105.724L328.632 105.709L328.595 105.274L328.479 105.263C317.225 104.769 311.597 104.535 311.594 104.561ZM365.578 59.2305L366.045 59.2749L366.854 60.2543L366.351 60.5988L366.306 61.0655L367.162 61.9708L365.801 61.8414L365.578 59.2305ZM365.944 55.3807L367.305 55.51L367.224 56.3656L366.757 56.3212L365.944 55.3807ZM357.191 55.4121L359.952 55.6745L359.871 56.53L357.11 56.2676L357.191 55.4121ZM364.928 56.579L366.289 56.7083L366.208 57.5638L364.846 57.4345L364.928 56.579ZM362.897 58.5441L365.619 58.8028C365.562 59.399 365.08 59.6541 364.173 59.5678L362.856 58.9718L362.897 58.5441ZM367.144 66.2853L367.566 61.8522L376.16 62.669L377.143 53.149L356.572 51.1939L354.511 74.1096L354.037 74.143L354.936 75.8372L354.073 75.8337L354.068 76.304L353.207 86.1888L354.618 86.2052L360.073 86.6059L365.263 86.079L365.581 82.7347L373.631 83.4997L374.529 74.0501L366.479 73.2851L367.137 66.3631L366.748 66.3262L365.9 65.3431L366.366 65.3874L367.144 66.2853ZM352.955 87.1851L351.162 106.045L356.179 106.522L359.408 106.397L359.368 106.825L359.875 106.442L371.269 107.525L371.712 102.858L371.286 102.386L371.797 101.964L372.123 98.5417L364.151 97.784L365.049 88.3344L352.955 87.1851ZM389.648 64.4217L389.482 66.1717L392.593 67.2913L393.097 66.9468L393.137 66.5191L389.648 64.4217ZM379.284 113.191L380.179 113.276L383.286 114.435L384.262 113.664L384.14 114.948L383.672 115.335L384.059 115.803L383.974 116.697C382.634 115.105 381.044 114.222 379.203 114.047L379.284 113.191ZM396.351 61.6058L397.712 61.7351L397.671 62.1629L396.188 63.3168L396.351 61.6058ZM382.917 81.9887L383.384 82.033L382.71 84.1664L381.862 83.1833L381.902 82.7555L382.917 81.9887ZM383.451 57.79L377.113 118.282L376.59 119.252L346.125 111.57L346.221 110.559L353.66 40.1266L385.015 42.9888L383.686 55.7327L382.658 54.5756L383.882 53.6717L383.981 52.6217L382.854 52.5145L380.48 54.3686L380.38 55.4186L382.362 57.6865L383.451 57.79ZM384.37 80.3218L384.649 78.6219L385.462 78.7384L385.183 80.4383L384.37 80.3218ZM395.523 88.4839L395.394 89.845L394.616 89.7711L394.745 88.41L395.523 88.4839ZM403.632 90.2748L403.566 90.9748L401.893 90.8159L401.96 90.1159L403.632 90.2748ZM406.118 94.6703L406.052 95.3703L403.99 95.1744L404.057 94.4745L406.118 94.6703ZM408.854 91.4774L408.788 92.1774L406.766 91.9852L406.832 91.2852L408.854 91.4774ZM413.765 92.6504L413.702 93.3115L411.641 93.1156L411.704 92.4545L413.765 92.6504ZM417.095 96.4199L417.033 97.081L414.972 96.8851L415.034 96.224L417.095 96.4199ZM419.03 93.8178L418.964 94.5178L416.864 94.3182L416.93 93.6182L419.03 93.8178ZM421.058 94.3637L420.991 95.0636L419.747 94.9454L419.813 94.2454L421.058 94.3637ZM299.211 84.9811L299.149 85.6421L296.738 85.413L296.8 84.7519L299.211 84.9811ZM303.075 88.0949L303.008 88.7949L300.525 88.912L300.558 88.5621L301.442 87.9397L303.075 88.0949ZM307.715 87.1626L307.649 87.8625L299.971 86.0734L300.034 85.4123L307.715 87.1626ZM309.71 88.0584L308.465 87.9402L308.532 87.2402L308.959 87.2808L309.71 88.0584ZM435.703 101.288L435.64 101.949L388.081 97.4293L388.144 96.7682L415.559 99.3737L416.024 99.0255L416.376 99.4513L423.764 100.154L425.046 99.8829L427.07 100.468L435.703 101.288ZM314.091 89.8482L314.028 90.5093L312.006 90.3171L312.069 89.656L314.091 89.8482ZM318.28 89.54L317.358 90.1586L316.608 89.381L318.28 89.54ZM383.436 92.6324L383.796 90.0769L384.511 88.3398L385.362 88.46L383.863 92.673L384.645 93.5321L384.608 93.921L383.436 92.6324ZM384.601 78.3034L384.744 77.2182L385.168 77.2978L385.453 78.4236L384.601 78.3034ZM336.383 86.081L336.35 86.431C334.173 86.224 332.626 86.5348 331.71 87.3633L331.743 87.0134L333.967 85.4982L333.934 85.8482L335.172 85.6128L336.383 86.081ZM339.328 94.3262L338.87 94.5967L325.337 93.3105L325.367 92.9994L325.895 91.9901L325.437 92.2606L322.56 91.9871C322.591 91.1007 321.272 90.5307 318.602 90.2769L319.446 89.6508L323.469 91.0925L324.746 90.8608L328.767 91.91L328.704 92.571L326.293 92.3419L326.256 92.7308L331.972 93.274L333.681 93.0441L334.811 93.5438L336.52 93.3139L336.872 93.7397L337.3 93.7804L338.97 93.5467L339.361 93.9762L339.328 94.3262ZM407.825 92.3998L408.486 92.4626L408.334 94.057L407.673 93.9941L407.825 92.3998ZM396.096 65.113C397.258 65.2757 397.752 66.2645 397.58 68.0792L397.292 71.1124C397.233 71.7346 396.452 72.1051 394.949 72.2239L394.522 72.1833L394.164 71.4037L394.515 65.2374L394.774 64.9873L396.096 65.113ZM394.665 77.6903L395.227 78.8031L395.193 79.1531L394.632 78.0403L394.665 77.6903ZM403.327 93.895L403.913 94.343L403.879 94.693L403.261 94.595L403.327 93.895ZM390.22 89.7849L390.205 89.9404L389.938 90.2683L389.909 90.5794L391.422 90.7624L391.451 90.4513C390.832 90.3662 390.421 90.1441 390.22 89.7849ZM407.391 100.677L407.808 100.01L408.233 95.5384L408.62 93.5347L408.521 92.5052L408.716 92.5237L408.554 92.1552L408.817 89.3942L408.778 89.3905L408.867 88.4572L408.685 88.7146L408.456 88.6536L408.809 86.9999C408.66 83.6112 408.152 81.2479 407.285 79.9099L407.052 79.8877L406.923 81.2488L406.495 81.2081L406.528 80.8581L406.756 80.5266L406.789 80.1766L406.595 80.1582L406.1 80.8175L406.462 81.5581L405.58 81.749L405.804 81.4564L405.643 81.0879L405.676 80.7379L406.491 78.7749L405.902 78.3658L405.172 78.6104L405.074 77.5808L404.35 78.1791L404.217 77.107C405.161 76.8043 405.983 76.4116 406.683 75.9288L406.727 75.4621L407.272 75.5139C408.689 74.3667 409.489 72.821 409.674 70.8766L410.221 65.1213C410.363 58.6735 408.766 55.2518 405.429 54.8562L405.04 54.8192C400.412 54.2486 393.011 53.8069 382.839 53.4941L382.997 53.9015L382.963 54.2514L380.55 89.1406L382.724 89.3864L383.218 88.7271L383.418 89.0993L383.609 89.1566L384.998 88.5823L385.394 89.3655L386.155 88.3784L387.435 88.5392L387.835 89.2836L389.444 88.4555L389.677 88.4777L389.647 88.7888L389.381 89.1166L389.348 89.4666L390.122 89.5794C390.064 89.3646 390.047 89.1276 390.072 88.8683L390.305 88.8905L391.785 89.4235L392.275 88.8031L392.179 89.8141L392.84 89.877L392.966 88.5548L393.326 82.7032L393.55 82.4106L395.529 82.638C396.313 83.4711 396.622 84.7691 396.454 86.532L396.231 89.2967L397.586 89.0724C398.154 89.1525 398.395 89.6462 398.308 90.5536L398.542 90.5758L398.808 90.248L399.86 90.7403L401.64 90.5955L402.001 91.3362L402.658 91.4379L403.777 91.2303C403.727 91.7488 404.86 92.2226 407.173 92.6517L406.945 92.9832L406.912 93.3332L405.394 92.7965L400.783 92.5937L400.944 92.9622L400.881 93.6233L400.453 93.5826L400.359 92.5142L399.401 93.0903L398.113 92.6146L397.231 92.8055L396.366 92.4094L395.939 92.3688L395.909 92.6799L396.07 93.0484L395.713 94.7409L395.037 101.857L407.486 103.394L407.679 101.371L407.458 101.625L406.992 101.581L407.021 101.27L407.295 100.864L406.012 100.742L406.082 100.003L407.443 100.133L407.391 100.677ZM398.255 109.697L396.594 109.421L396.442 110.192L398.142 110.471L398.255 109.697ZM396.765 105.553L396.689 105.938L399.085 105.499L399.161 105.114L398.887 104.695L394.754 105.244L394.713 105.672L394.988 106.09L396.765 105.553ZM396.829 90.0206L396.796 90.3706L397.647 90.4908L397.714 89.7908L397.523 89.7335L396.829 90.0206ZM396.496 91.0484L396.466 91.3595L397.361 91.4445L397.39 91.1334L396.496 91.0484ZM380.265 92.1349L379.552 99.6401L391.739 101.465L392.581 92.5991L380.265 92.1349ZM419.71 57.3514L420.254 57.4031L420.214 57.8309L419.595 58.5569L419.71 57.3514ZM434.917 42.6696L435.191 43.088L433.983 55.8042L433.672 55.7746L432.697 55.2896L432.972 55.7081L432.713 58.4302C431.852 58.4007 431.304 59.6304 431.067 62.1192L430.434 61.3527L431.815 57.5601L431.614 56.3639L432.603 52.5732L433.264 52.636L433.046 54.9303L433.396 54.9636L433.909 49.5583L433.707 47.9695L434.161 46.9139L433.958 45.3252L434.345 44.9696L434.382 44.5807L434.18 42.9919L434.567 42.6363L434.917 42.6696ZM426.888 45.3988L427.2 45.4284C427.005 47.4764 427.311 48.9312 428.119 49.7927L427.808 49.7632L426.32 47.6599L426.67 47.6932L426.428 46.5322L426.888 45.3988ZM422.993 114.873L421.604 114.623L421.134 113.794L423.995 113.83L422.993 114.873ZM426.871 48.8893L426.645 51.2615L430.962 51.6717L430.891 52.4106L424.203 51.7749L424.273 51.036L426.334 51.2319L426.025 50.7709L426.136 49.6043L426.871 48.8893ZM430.331 62.4415L430.957 63.2858L430.183 63.997L430.331 62.4415ZM430.665 66.3579L431.287 66.417L431.106 68.3225L430.484 68.2634L430.665 66.3579ZM432.006 69.5852L432.667 69.648L428.421 114.33L427.76 114.267L430.206 88.5233L429.893 88.1012L430.28 87.7456L430.938 80.8236L430.699 79.6238L431.234 77.7127L432.006 69.5852ZM428.901 70.4673L428.79 71.6339L428.09 71.5674L428.127 71.1785L428.901 70.4673ZM428.016 72.3451L428.716 72.4116L426.971 79.6227L426.349 79.5635L428.016 72.3451ZM428.974 76.7132L429.674 76.7797L429.767 79.1036L429.456 79.074L428.826 78.2687L428.974 76.7132ZM425.921 80.3469L426.582 80.4097L426.368 82.6652L425.707 82.6024L425.921 80.3469ZM425.283 83.3468L425.983 83.4134L425.872 84.58L425.172 84.5135L425.283 83.3468ZM424.752 85.2191L425.452 85.2856L425.264 87.2688L424.564 87.2023L424.752 85.2191ZM427.323 87.0721L427.984 87.135L427.799 89.0793L427.138 89.0165L427.323 87.0721ZM423.653 90.1764L424.275 90.2355L424.091 92.1799L423.468 92.1207L423.653 90.1764ZM425.636 97.3885L426.336 97.455L426.155 99.3605L425.455 99.294L425.636 97.3885ZM376.925 110.77L377.657 103.07L377.501 102.231L377.655 101.853L377.695 101.426L382.326 41.556L382.633 40.8005C405.362 43.039 416.696 44.4694 416.637 45.0916C416.866 45.1656 416.48 49.4975 415.481 58.0873C415.636 58.1021 415.65 58.7836 415.522 60.1317L415.409 60.0817C414.586 61.3114 413.997 63.7929 413.642 67.526L413.871 67.5871L415.404 62.2001L415.444 61.7723L415.557 61.8223L415.406 72.0884L414.946 71.9662C414.817 71.9539 414.805 71.3904 414.911 70.2756L414.488 69.7646L413.68 72.0813L413.833 71.7035C414.908 72.5119 415.419 73.1883 415.367 73.7327L415.217 74.0716L413.719 72.909C413.175 74.5053 412.855 75.809 412.759 76.8201L413.105 76.8922L413.068 77.2811L412.914 77.6589L412.874 78.0867C413.104 78.1348 413.194 78.431 413.142 78.9754L412.646 79.2422L412.531 80.4477L412.489 82.1309L410.116 113.296L409.77 113.224C409.386 113.135 409.169 113.35 409.12 113.869L408.734 112.969L407.548 113.484L407.585 113.095C406.92 113.476 406.102 113.556 405.129 113.332L405.014 112.89L405.051 112.501L404.937 112.882L404.82 112.871L403.516 111.727L402.52 111.476L400.18 113.804L400.104 113.365L400.141 112.976L400.294 112.598L400.178 112.587L400.066 112.93L399.95 112.919L399.835 112.476L399.757 112.469L399.257 112.774L398.529 111.763L398.029 112.069L397.953 111.63L397.109 112.256L396.574 111.695L396.228 111.623L394.809 111.685L394.729 111.285L394.272 112.379L394.231 111.983L394.272 111.555L394.118 111.933L393.963 111.918L393.926 111.483L393.809 111.472C382.555 110.978 376.927 110.744 376.925 110.77ZM457.772 56.1031L444.55 54.8466L444.46 55.3873L441.014 92.0617L451.972 93.1817L457.772 56.1031ZM440.309 96.5856L439.267 107.552L449.883 108.561L451.353 97.6352L440.309 96.5856ZM463.72 46.7803L464.101 47.719L455.111 130.757L454.637 130.79L432.312 128.708L434.176 107.029L434.265 106.096L435.082 101.622L434.655 101.581L435.167 100.727L441.356 44.6941L463.72 46.7803Z"
            fill="white"
          />
        </svg>
      </div>
      <div className="absolute top-50 right-18 text-7xl font-bold font-hitmepunk text-white transform rotate-8 pointer-events-none z-10">
        <svg
          width="473"
          height="191"
          viewBox="0 0 473 191"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M25.7545 40.0432L21.8891 71.6821L31.4039 74.0513L44.7606 39.2771L45.5299 39.4188L36.3749 75.2664L45.5387 77.5928L45.6285 77.2126L57.4589 29.8755L57.0787 29.7856L41.7337 26.4398L32.1902 52.7228L32.0485 53.4921L31.2793 53.3504L34.8821 29.2758L35.708 24.253L34.1604 24.0076L19.6365 20.4144L7.75437 68.1407L16.9181 70.4671L25.4095 36.0682L25.603 34.9098L26.3723 35.0514L25.8671 39.2269L26.2334 39.7149L25.7925 40.0522L25.7545 40.0432ZM65.4888 14.0722L65.5648 14.0901L66.5055 15.035L66.5436 15.044C66.697 15.1873 66.9415 15.2852 67.2769 15.3377L67.5382 15.7607L67.203 17.6884L66.762 18.0257L67.0613 18.4577L64.0127 31.866L61.5348 31.481L61.1436 31.2681L49.7024 78.6571L49.2994 79.0034L51.0771 79.4637L50.7868 78.9937C53.3999 70.9949 56.8042 58.9685 61 42.9146L61.6932 43.0383L52.2114 79.2501L51.2866 80.2759L51.6916 82.2983C50.5065 83.4631 49.6416 85.7072 49.097 89.0304L48.7459 88.9876L41.9018 86.527L41.4608 86.8643L4.82522 73.9107L3.17743 73.2403L2.87814 72.8083L21.2834 1.89827L22.1183 1.25269L24.9163 3.68009L26.1542 2.68822L26.8564 2.77392L28.9383 5.51374L63.0731 14.1033L64.6842 11.1927L64.9455 11.6157L64.8937 12.0048L63.7235 14.5781L64.8716 13.9664L65.0997 14.0203L65.627 12.2986L66.3293 12.3843L66.1357 13.5427C65.9358 13.7095 65.7201 13.886 65.4888 14.0722ZM67.9159 42.8633L67.1466 42.7216L67.4438 40.7849L68.2131 40.9266L67.9159 42.8633ZM66.7439 62.9367L66.6299 62.9097L68.6667 54.8014C69.4601 51.6708 70.4863 48.4614 71.7451 45.1732C73.4103 41.0712 75.5198 39.3354 78.0735 39.9658C80.1143 40.5016 81.0841 42.2293 80.9828 45.1489C81.1556 46.7953 80.5133 50.8714 79.0559 57.3773L79.1699 57.4043L77.1331 65.5126C76.3397 68.6432 75.3136 71.8526 74.0547 75.1408C72.3895 79.2427 70.2674 80.9755 67.6883 80.3392C65.6475 79.8034 64.6904 78.0786 64.8171 75.1651C64.6443 73.5187 65.2866 69.4425 66.7439 62.9367ZM56.8699 79.7491C57.3981 83.9681 60.2635 86.7325 65.4663 88.0425C72.0376 89.6759 76.8291 87.7444 79.8407 82.2481C82.058 77.8485 83.7198 73.4781 84.826 69.137L87.6667 57.9675L87.4006 57.9046C89.2362 48.8925 89.7057 43.1699 88.809 40.737C88.2748 36.5433 85.4064 33.7916 80.2036 32.4816C73.6323 30.8482 68.8408 32.7797 65.8292 38.276C63.6179 42.6503 61.9591 47.008 60.8528 51.3491L58.0122 62.5186L58.2783 62.5815C56.4367 71.619 55.9672 77.3415 56.8699 79.7491ZM41.7509 18.2154L41.0341 17.0024L40.0837 16.7778L38.8998 17.5416L38.6751 18.4919L39.3919 19.705L40.3423 19.9296L41.5263 19.1658L41.7509 18.2154ZM118.079 91.647L117.619 93.4247L118.633 94.2265L121.132 94.0143L122.56 93.0673L123.02 91.2896L122.006 90.4878L119.545 90.709L118.079 91.647ZM89.2541 92.1796L88.8511 92.5259L88.3949 92.4181L88.5387 91.8098L88.4716 91.7538L87.2344 92.0635L87.7141 93.2606L87.2662 93.797L86.9069 95.3176L87.5911 95.4793L87.8275 96.1774L88.3134 95.65C88.8719 94.8722 89.4048 94.3158 89.9121 93.9808C89.8402 94.2849 89.781 94.592 89.7345 94.9022L89.6965 94.8932L89.6246 95.1973L89.6536 95.2443C89.5099 95.8525 89.3758 96.4764 89.2514 97.116L77.4114 93.7156L49.5124 87.4428L62.6067 22.0208L62.4393 17.1245L62.619 16.3642L66.3825 17.2537C66.7539 15.6824 67.3451 14.9926 68.1561 15.1842L104.194 23.7019C103.739 24.1562 102.346 30.7308 100.014 43.4255C97.824 55.2973 94.5457 71.7152 90.1796 92.6793L89.2541 92.1796ZM128.387 45.997C129.307 45.8399 130.197 45.0199 131.055 43.5371L130.233 42.9413L126.613 43.6512C126.469 44.2594 126.695 44.8345 127.289 45.3764L127.517 45.4303L127.902 45.16C127.848 45.3881 128.01 45.6671 128.387 45.997ZM126.941 38.1895L126.726 37.7374C127.264 36.8209 127.685 36.3986 127.989 36.4705L128.418 37.3745L128.337 37.7167L126.941 38.1895ZM119.459 37.7458L118.623 37.5482C117.26 36.1824 116.701 34.98 116.947 33.9409C118.06 32.0632 118.831 31.1752 119.262 31.277L121.143 36.0565C120.451 37.2846 119.89 37.8476 119.459 37.7458ZM118.752 49.7406L118.242 51.3863L117.453 51.1596L117.962 49.5139L118.752 49.7406ZM118.247 51.7084L117.957 52.7638L117.548 52.627L117.419 51.4727L118.247 51.7084ZM119.531 40.3315L115.405 39.2762L104.135 87.4683L113.02 89.4477L119.001 62.4432L119.902 62.5358L119.232 90.6752L133.137 93.3195L144.229 46.0487L143.811 45.9498L135.401 44.0022L128.528 74.6092L128.717 42.2218L125.595 41.8451L120.443 40.5472L119.71 41.7789L118.883 41.5432L119.531 40.3315ZM109.119 22.0561L113.558 23.1454L113.427 24.0377L108.995 23.4316L108.157 22.3907L108.692 21.9953L109.119 22.0561ZM145.646 89.8136L146.136 89.6083L159.366 92.7351L159.294 93.0392L158.633 93.9668L159.123 93.7615L161.936 94.4263C161.783 95.3 163.012 96.0453 165.622 96.6623L164.7 97.1668L160.913 95.188L159.616 95.2427L155.777 93.653L155.93 93.0067L158.287 93.5638L158.376 93.1837L152.788 91.8629L151.064 91.8567L150.013 91.207L148.289 91.2008L147.998 90.7308L147.58 90.6319L145.894 90.6347L145.565 90.1558L145.646 89.8136ZM147.434 98.3843L147.515 98.0421C149.643 98.5453 151.218 98.4492 152.239 97.7538L152.158 98.096L149.748 99.2924L149.829 98.9503L148.569 99.0139L147.434 98.3843ZM165.841 97.4364L166.839 96.9498L167.475 97.8227L165.841 97.4364ZM170.032 97.7045L170.185 97.0583L172.161 97.5255L172.009 98.1717L170.032 97.7045ZM110.728 30.7049L111.648 27.1494L112.907 27.768L149.818 38.5389C148.598 46.8672 143.96 67.2852 135.902 99.793L135.405 100.197L119.039 95.5667L118.551 95.933L94.3384 89.6885L94.5208 88.407L99.6167 72.111C100.218 72.1727 100.653 71.1786 100.924 69.1285L101.536 65.1791L101.986 64.8038L101.667 64.2868L101.718 63.8976L110.557 31.4272L110.575 31.3511L90.4648 26.5981L89.9568 26.8794L89.6665 26.4094L82.4436 24.7023L81.1373 24.795L79.2124 23.9386L70.773 21.944L70.9257 21.2977L110.728 30.7049ZM174.127 100.077L175.344 100.365L175.182 101.049L174.764 100.95L174.127 100.077ZM73.1327 26.3952L73.2945 25.7109L80.6549 28.5343L80.5022 29.1805L73.1327 26.3952ZM77.857 26.1069L78.0187 25.4226L80.4945 25.6465L80.4137 25.9886L79.4536 26.4842L77.857 26.1069ZM81.2576 29.7203L81.4104 29.0741L83.7673 29.6311L83.6146 30.2774L81.2576 29.7203ZM84.332 30.8082L84.4938 30.1239L85.7102 30.4114L85.5485 31.0957L84.332 30.8082ZM86.266 31.6265L86.4277 30.9423L88.4805 31.4274L88.3188 32.1117L86.266 31.6265ZM88.5385 29.3138L88.6913 28.6676L90.7061 29.1437L90.5534 29.79L88.5385 29.3138ZM91.3213 33.5037L91.474 32.8575L93.4888 33.3337L93.3361 33.9799L91.3213 33.5037ZM96.0255 35.3381L96.1872 34.6538L98.164 35.121L98.0023 35.8053L96.0255 35.3381ZM99.1731 32.5498L99.3348 31.8655L101.35 32.3417L101.188 33.026L99.1731 32.5498ZM101.034 37.2443L101.196 36.56L102.83 36.9463L102.668 37.6306L101.034 37.2443ZM150.549 33.5741L151.889 33.8506L151.776 34.6669L150.401 34.5425L150.549 33.5741ZM139.553 30.1723L146.637 32.1275L146.506 33.0198L146.032 32.9881L139.46 31.0736L139.553 30.1723ZM136.966 29.4003L138.303 29.5157L139.056 30.5766L136.815 30.2076L136.966 29.4003ZM129.83 27.8341L132.981 28.2578L132.794 29.2171L132.414 29.1273L132.01 28.6303L131.475 29.0257L129.69 28.7645L129.83 27.8341ZM118.81 24.8684L128.115 27.1077L127.966 28.0761L118.642 25.7517L118.81 24.8684ZM153.291 36.0686C171.586 40.6333 180.79 43.1298 180.903 43.5578L180.443 44.6534C172.213 78.0035 169.307 89.4518 171.724 78.9983L165.629 103.086L165.302 106.34L165.142 107.186L164.589 107.657L138.007 99.2069L137.269 99.9554L137.103 99.6354L136.913 99.5905L143.952 75.2442C143.504 74.7636 143.348 74.2319 143.486 73.649C144.227 70.399 144.788 68.819 145.168 68.9088C145.428 68.9434 145.354 69.8223 144.946 71.5457L145.175 71.5996L150.327 50.139L150.166 50.1411C150.724 48.8011 151.343 46.6328 152.025 43.6363L151.26 43.1345L151.395 42.5643L151.513 42.9134L151.75 42.9293L151.91 42.0839L151.53 41.9941L151.664 41.4239L152.317 37.6445C152.73 36.3506 153.078 35.7239 153.363 35.7644L153.291 36.0686ZM154.475 80.1397L157.44 80.8405L160.406 81.5413L160.415 81.5033L160.596 81.5863L167.38 52.2026L174.831 53.9637L176.098 48.6035L154.923 43.599L153.656 48.9591L161.069 50.7112L154.247 80.0858L154.484 80.1017L154.475 80.1397ZM192.222 64.6166L192.678 64.7245L193.346 65.8055L192.8 66.0778L192.692 66.534L193.416 67.5479L192.085 67.2335L192.222 64.6166ZM193.111 60.8531L194.442 61.1676L194.244 62.0039L193.788 61.8961L193.111 60.8531ZM184.436 59.6858L187.135 60.3238L186.938 61.1601L184.239 60.5222L184.436 59.6858ZM191.941 61.901L193.271 62.2155L193.073 63.0518L191.743 62.7373L191.941 61.901ZM189.66 63.5695L192.321 64.1985C192.183 64.7814 191.671 64.968 190.784 64.7583L189.561 63.9877L189.66 63.5695ZM192.807 71.8194L193.832 67.4857L202.233 69.4714L204.51 60.1756L184.4 55.4226L179.222 77.8405L178.748 77.8087L179.406 79.6099L178.552 79.4883L178.482 79.9535L176.276 89.6273L177.671 89.8367L183.021 90.9805L188.234 91.1691L189.007 87.8998L196.876 89.7597L199.059 80.522L191.19 78.6622L192.789 71.8955L192.409 71.8056L191.704 70.7156L192.16 70.8235L192.807 71.8194ZM175.89 90.5797L171.533 109.017L176.437 110.176L179.653 110.495L179.554 110.913L180.109 110.603L191.247 113.235L192.325 108.673L191.968 108.147L192.532 107.799L193.323 104.454L185.53 102.612L187.713 93.374L175.89 90.5797ZM215.354 73.0543L214.95 74.765L217.879 76.3L218.425 76.0277L218.524 75.6095L215.354 73.0543ZM198.411 119.946L199.286 120.152L202.205 121.725L203.277 121.096L202.981 122.35L202.464 122.67L202.783 123.187L202.577 124.061C201.467 122.3 200.013 121.207 198.214 120.782L198.411 119.946ZM222.38 71.1825L223.71 71.4969L223.611 71.9151L221.984 72.8551L222.38 71.1825ZM206.282 89.5343L206.738 89.6421L205.778 91.6631L205.073 90.5731L205.172 90.155L206.282 89.5343ZM210.124 65.6366L195.564 124.691L194.912 125.581L165.786 113.8L166.02 112.812L183.032 44.061L213.699 51.1888L210.638 63.6308L209.778 62.3438L211.114 61.616L211.357 60.5896L210.254 60.329L207.649 61.8406L207.406 62.8671L209.059 65.385L210.124 65.6366ZM207.949 88.0821L208.459 86.4364L209.248 86.6631L208.739 88.3088L207.949 88.0821ZM217.88 97.6942L217.565 99.0247L216.805 98.845L217.119 97.5145L217.88 97.6942ZM225.667 100.578L225.506 101.263L223.871 100.876L224.033 100.192L225.667 100.578ZM227.528 105.273L227.366 105.957L225.351 105.481L225.513 104.797L227.528 105.273ZM230.676 102.485L230.514 103.169L228.537 102.702L228.699 102.017L230.676 102.485ZM235.38 104.319L235.227 104.965L233.212 104.489L233.365 103.843L235.38 104.319ZM238.163 108.509L238.01 109.155L235.995 108.679L236.148 108.033L238.163 108.509ZM240.435 106.196L240.273 106.88L238.221 106.395L238.382 105.711L240.435 106.196ZM242.369 107.014L242.207 107.699L240.991 107.411L241.153 106.727L242.369 107.014ZM122.955 81.0387L122.802 81.6849L120.445 81.1279L120.598 80.4816L122.955 81.0387ZM126.355 84.6521L126.194 85.3364L123.718 85.1125L123.799 84.7703L124.759 84.2748L126.355 84.6521ZM131.079 84.3638L130.918 85.0481L123.557 82.2247L123.71 81.5785L131.079 84.3638ZM132.933 85.5243L131.716 85.2368L131.878 84.5525L132.296 84.6514L132.933 85.5243ZM255.928 115.879L255.775 116.525L209.283 105.536L209.436 104.89L236.236 111.225L236.744 110.943L237.035 111.413L244.257 113.12L245.564 113.028L247.489 113.884L255.928 115.879ZM137.028 87.8971L136.875 88.5433L134.898 88.0761L135.051 87.4299L137.028 87.8971ZM141.219 88.1652L140.221 88.6518L139.585 87.7789L141.219 88.1652ZM205.338 100.149L206.045 97.6667L206.991 96.0438L207.818 96.2795L205.756 100.248L206.413 101.206L206.323 101.586L205.338 100.149ZM208.455 86.1143L208.744 85.0588L209.153 85.1957L209.282 86.3499L208.455 86.1143ZM159.626 87.2173L159.545 87.5595C157.416 87.0563 155.842 87.1524 154.821 87.8478L154.902 87.5056L157.312 86.3092L157.231 86.6513L158.49 86.5877L159.626 87.2173ZM161.414 95.788L160.923 95.9933L147.694 92.8665L147.766 92.5624L148.427 91.6348L147.937 91.8401L145.124 91.1753C145.277 90.3016 144.048 89.5563 141.438 88.9393L142.36 88.4347L146.147 90.4136L147.444 90.3589L151.283 91.9486L151.13 92.5949L148.773 92.0378L148.683 92.4179L154.272 93.7387L155.996 93.7449L157.047 94.3946L158.771 94.4008L159.061 94.8708L159.48 94.9697L161.166 94.9669L161.494 95.4458L161.414 95.788ZM235.512 82.1935L235.422 82.5737L237.043 83.3581L237.303 82.2557L235.512 82.1935ZM238.025 82.4264L237.564 82.6787L237.475 83.0589L238.159 83.2206L238.069 83.6007L240.682 83.4155L240.762 83.0733L239.736 82.8307L238.249 82.8404L238.025 82.4264ZM238.126 66.7158L221.506 117.336L221.801 117.446L240.46 123.582L242.603 117.064L235.533 114.711L249.869 70.6955L238.126 66.7158ZM243.754 126.287L246.999 127.335L243.263 127.857L243.135 128.228L242.601 127.941L240.189 128.295L220.75 121.212L214.049 118.825L213.805 116.801L214.87 117.052C223.971 84.6573 228.053 68.349 227.116 68.1274L228.06 67.1867L228.159 66.7685L227.756 67.1148L227.376 67.0249L227.133 66.5259L227.214 66.1838L227.556 66.2646L227.313 65.7656L227.393 65.4235L228.275 63.2234L228.193 62.0401L230.139 60.0917L229.616 59.2457L229.796 58.4854C230.582 58.671 231.239 58.4383 231.767 57.7872L242.168 59.804L258.058 63.5596L258.34 64.0677L259.389 63.8741L260.859 65.4659L262.203 66.0644L262.745 66.9954L243.754 126.287ZM271.369 83.3231L271.826 83.4309L272.493 84.5119L271.947 84.7843L271.839 85.2405L272.563 86.2544L271.233 85.9399L271.369 83.3231ZM272.259 79.5596L273.589 79.8741L273.392 80.7104L272.936 80.6026L272.259 79.5596ZM263.584 78.3923L266.283 79.0303L266.085 79.8666L263.386 79.2287L263.584 78.3923ZM271.088 80.6075L272.419 80.9219L272.221 81.7583L270.89 81.4438L271.088 80.6075ZM268.807 82.276L271.468 82.905C271.33 83.4879 270.818 83.6745 269.931 83.4648L268.708 82.6942L268.807 82.276ZM271.955 90.5259L272.979 86.1922L281.381 88.1779L283.658 78.8821L263.548 74.1291L258.37 96.547L257.896 96.5152L258.554 98.3164L257.699 98.1948L257.63 98.66L255.423 108.334L256.819 108.543L262.168 109.687L267.382 109.876L268.154 106.606L276.023 108.466L278.207 99.2285L270.338 97.3687L271.937 90.602L271.557 90.5121L270.851 89.4221L271.307 89.5299L271.955 90.5259ZM255.038 109.286L250.68 127.724L255.584 128.883L258.8 129.201L258.701 129.619L259.256 129.309L270.395 131.942L271.473 127.38L271.116 126.854L271.68 126.505L272.47 123.16L264.677 121.318L266.861 112.081L255.038 109.286ZM294.502 91.7608L294.098 93.4715L297.026 95.0065L297.572 94.7342L297.671 94.316L294.502 91.7608ZM277.559 138.652L278.433 138.859L281.353 140.432L282.425 139.802L282.128 141.057L281.611 141.376L281.931 141.893L281.724 142.767C280.615 141.007 279.161 139.914 277.361 139.489L277.559 138.652ZM301.527 89.889L302.858 90.2034L302.759 90.6216L301.132 91.5616L301.527 89.889ZM285.429 108.241L285.885 108.349L284.926 110.37L284.22 109.28L284.319 108.861L285.429 108.241ZM289.271 84.3431L274.711 143.398L274.06 144.287L244.934 132.507L245.167 131.518L262.179 62.7675L292.846 69.8952L289.785 82.3373L288.925 81.0503L290.261 80.3225L290.504 79.296L289.402 79.0355L286.797 80.5471L286.554 81.5735L288.207 84.0915L289.271 84.3431ZM287.097 106.789L287.606 105.143L288.396 105.37L287.886 107.015L287.097 106.789ZM297.027 116.401L296.713 117.731L295.952 117.552L296.267 116.221L297.027 116.401ZM304.815 119.285L304.653 119.969L303.018 119.583L303.18 118.899L304.815 119.285ZM306.676 123.979L306.514 124.664L304.499 124.187L304.661 123.503L306.676 123.979ZM309.823 121.191L309.661 121.875L307.685 121.408L307.846 120.724L309.823 121.191ZM314.527 123.025L314.375 123.672L312.36 123.196L312.513 122.549L314.527 123.025ZM317.31 127.215L317.157 127.862L315.143 127.385L315.295 126.739L317.31 127.215ZM319.583 124.903L319.421 125.587L317.368 125.102L317.53 124.417L319.583 124.903ZM321.517 125.721L321.355 126.405L320.138 126.118L320.3 125.433L321.517 125.721ZM202.102 99.7452L201.949 100.391L199.592 99.8343L199.745 99.1881L202.102 99.7452ZM205.503 103.359L205.341 104.043L202.865 103.819L202.946 103.477L203.906 102.981L205.503 103.359ZM210.227 103.07L210.065 103.755L202.705 100.931L202.858 100.285L210.227 103.07ZM212.08 104.231L210.864 103.943L211.025 103.259L211.443 103.358L212.08 104.231ZM335.076 134.585L334.923 135.231L288.43 124.243L288.583 123.597L315.384 129.931L315.892 129.65L316.182 130.12L323.405 131.827L324.711 131.734L326.636 132.591L335.076 134.585ZM216.175 106.604L216.023 107.25L214.046 106.783L214.199 106.136L216.175 106.604ZM220.367 106.872L219.369 107.358L218.732 106.485L220.367 106.872ZM284.486 118.855L285.193 116.373L286.138 114.75L286.966 114.986L284.904 118.954L285.561 119.912L285.471 120.292L284.486 118.855ZM287.602 104.821L287.892 103.765L288.301 103.902L288.429 105.056L287.602 104.821ZM238.774 105.924L238.693 106.266C236.564 105.763 234.989 105.859 233.968 106.554L234.049 106.212L236.459 105.016L236.379 105.358L237.638 105.294L238.774 105.924ZM240.561 114.494L240.071 114.7L226.842 111.573L226.914 111.269L227.574 110.341L227.084 110.547L224.271 109.882C224.424 109.008 223.195 108.263 220.585 107.646L221.507 107.141L225.294 109.12L226.592 109.065L230.43 110.655L230.278 111.301L227.921 110.744L227.831 111.124L233.419 112.445L235.144 112.451L236.194 113.101L237.919 113.107L238.209 113.577L238.627 113.676L240.314 113.673L240.642 114.152L240.561 114.494ZM315.358 106.604L315.721 105.406C316.56 102.313 318.501 100.778 321.546 100.802C323.848 101.48 325.151 104.798 325.455 110.757L331.347 109.942C332.276 103.07 330.498 98.9841 326.016 97.6838L323.382 96.2586L321.956 95.8411C315.224 95.4542 311.149 97.8628 309.732 103.067L308.706 106.557C307.373 111.407 309.89 118.076 316.26 126.566C317.501 129.803 317.881 132.274 317.397 133.979L317.034 135.178C316.221 138.277 314.267 139.809 311.171 139.773C308.864 139.12 307.573 135.805 307.3 129.827L301.446 130.651C300.492 137.516 302.254 141.612 306.73 142.938L309.411 144.334L310.837 144.751C317.57 145.138 321.644 142.73 323.062 137.526L324.049 134.026C325.383 129.177 322.884 122.539 316.554 114.112C315.273 110.812 314.875 108.31 315.358 106.604ZM338.973 87.0187L339.352 87.7907L338.725 88.4052L338.592 89.1365L338.914 89.8145L338.79 90.5078C338.088 90.4221 332.319 112.058 321.482 155.416C308.178 152.833 298.618 150.6 292.801 148.717C301.189 118.776 307.004 95.8128 310.247 79.828C318.668 81.8987 328.244 84.2956 338.973 87.0187ZM360.036 93.6828L360.753 94.8958L361.703 95.1204L362.887 94.3566L363.112 93.4063L362.395 92.1932L361.444 91.9686L360.26 92.7324L360.036 93.6828ZM294.066 80.6998L294.526 78.9221L293.511 78.1203L291.013 78.3325L289.585 79.2795L289.124 81.0572L290.139 81.859L292.6 81.6377L294.066 80.6998ZM283.758 126.35C282.838 126.507 281.948 127.327 281.089 128.81L281.912 129.405L285.532 128.696C285.675 128.087 285.45 127.512 284.856 126.97L284.628 126.917L284.243 127.187C284.296 126.959 284.135 126.68 283.758 126.35ZM285.204 134.157L285.418 134.609C284.881 135.526 284.46 135.948 284.156 135.876L283.727 134.972L283.817 134.592L285.204 134.157ZM292.685 134.601L293.522 134.799C294.885 136.164 295.444 137.367 295.198 138.406C294.085 140.284 293.313 141.172 292.883 141.07L291.002 136.29C291.693 135.062 292.255 134.499 292.685 134.601ZM341.137 127.789L341.023 127.762L343.06 119.654C343.853 116.524 344.88 113.314 346.138 110.026C347.804 105.924 349.913 104.188 352.467 104.819C354.508 105.354 355.477 107.082 355.376 110.002C355.549 111.648 354.907 115.724 353.449 122.23L353.563 122.257L351.526 130.365C350.733 133.496 349.707 136.705 348.448 139.994C346.783 144.095 344.661 145.828 342.082 145.192C340.041 144.656 339.084 142.931 339.21 140.018C339.038 138.371 339.68 134.295 341.137 127.789ZM331.263 144.602C331.791 148.821 334.657 151.585 339.86 152.895C346.431 154.529 351.222 152.597 354.234 147.101C356.451 142.701 358.113 138.331 359.219 133.99L362.06 122.82L361.794 122.757C363.63 113.745 364.099 108.023 363.202 105.59C362.668 101.396 359.8 98.6443 354.597 97.3344C348.026 95.7009 343.234 97.6324 340.222 103.129C338.011 107.503 336.352 111.861 335.246 116.202L332.406 127.371L332.672 127.434C330.83 136.472 330.361 142.194 331.263 144.602ZM316.144 83.0682L315.427 81.8552L314.477 81.6305L313.293 82.3943L313.068 83.3447L313.785 84.5577L314.736 84.7823L315.92 84.0186L316.144 83.0682ZM392.472 156.5L392.012 158.277L393.027 159.079L395.525 158.867L396.953 157.92L397.414 156.142L396.399 155.341L393.938 155.562L392.472 156.5ZM363.647 157.032L363.244 157.379L362.788 157.271L362.932 156.663L362.865 156.607L361.628 156.916L362.107 158.113L361.66 158.65L361.3 160.17L361.984 160.332L362.221 161.03L362.707 160.503C363.265 159.725 363.798 159.169 364.305 158.834C364.234 159.138 364.174 159.445 364.128 159.755L364.09 159.746L364.018 160.05L364.047 160.097C363.903 160.705 363.769 161.329 363.645 161.969L351.805 158.568L323.906 152.296L337 86.8735L336.833 81.9772L337.012 81.2169L340.776 82.1064C341.147 80.5351 341.738 79.8453 342.549 80.037L378.588 88.5546C378.133 89.009 376.739 95.5835 374.408 108.278C372.217 120.15 368.939 136.568 364.573 157.532L363.647 157.032ZM402.78 110.85C403.7 110.693 404.59 109.873 405.449 108.39L404.626 107.794L401.007 108.504C400.863 109.112 401.088 109.687 401.683 110.229L401.911 110.283L402.296 110.013C402.242 110.241 402.403 110.52 402.78 110.85ZM401.334 103.042L401.12 102.59C401.658 101.674 402.078 101.251 402.383 101.323L402.811 102.227L402.73 102.569L401.334 103.042ZM393.853 102.599L393.016 102.401C391.653 101.035 391.095 99.8327 391.34 98.7936C392.453 96.9159 393.225 96.028 393.656 96.1298L395.536 100.909C394.845 102.137 394.284 102.7 393.853 102.599ZM393.145 114.593L392.636 116.239L391.846 116.012L392.356 114.367L393.145 114.593ZM392.64 116.561L392.35 117.617L391.941 117.48L391.813 116.325L392.64 116.561ZM393.924 105.184L389.798 104.129L378.528 152.321L387.413 154.3L393.394 127.296L394.295 127.389L393.625 155.528L407.531 158.172L418.623 110.901L418.205 110.803L409.794 108.855L402.922 139.462L403.11 107.075L399.988 106.698L394.836 105.4L394.104 106.632L393.276 106.396L393.924 105.184ZM383.512 86.9089L387.951 87.9981L387.821 88.8904L383.388 88.2843L382.55 87.2434L383.085 86.8481L383.512 86.9089ZM420.04 154.666L420.53 154.461L433.759 157.588L433.687 157.892L433.026 158.82L433.516 158.614L436.329 159.279C436.176 160.153 437.405 160.898 440.015 161.515L439.093 162.02L435.306 160.041L434.009 160.095L430.17 158.506L430.323 157.859L432.68 158.417L432.77 158.036L427.182 156.716L425.457 156.709L424.406 156.06L422.682 156.054L422.392 155.584L421.973 155.485L420.287 155.487L419.959 155.009L420.04 154.666ZM421.827 163.237L421.908 162.895C424.037 163.398 425.611 163.302 426.632 162.607L426.551 162.949L424.141 164.145L424.222 163.803L422.963 163.867L421.827 163.237ZM440.234 162.289L441.232 161.803L441.869 162.675L440.234 162.289ZM444.425 162.557L444.578 161.911L446.555 162.378L446.402 163.024L444.425 162.557ZM385.121 95.5576L386.042 92.0022L387.3 92.6207L424.211 103.392C422.992 111.72 418.353 132.138 410.295 164.646L409.798 165.05L393.433 160.419L392.945 160.786L368.732 154.541L368.914 153.26L374.01 136.964C374.611 137.025 375.047 136.031 375.317 133.981L375.929 130.032L376.379 129.657L376.06 129.14L376.112 128.75L384.95 96.2799L384.968 96.2039L364.858 91.4509L364.35 91.7322L364.06 91.2622L356.837 89.5551L355.531 89.6477L353.606 88.7914L345.166 86.7967L345.319 86.1505L385.121 95.5576ZM448.521 164.93L449.737 165.218L449.575 165.902L449.157 165.803L448.521 164.93ZM347.526 91.2479L347.688 90.5636L355.048 93.387L354.895 94.0333L347.526 91.2479ZM352.25 90.9596L352.412 90.2753L354.888 90.4993L354.807 90.8414L353.847 91.337L352.25 90.9596ZM355.651 94.5731L355.804 93.9268L358.161 94.4839L358.008 95.1301L355.651 94.5731ZM358.725 95.6609L358.887 94.9767L360.104 95.2642L359.942 95.9485L358.725 95.6609ZM360.659 96.4793L360.821 95.795L362.874 96.2802L362.712 96.9645L360.659 96.4793ZM362.932 94.1666L363.085 93.5203L365.099 93.9965L364.947 94.6428L362.932 94.1666ZM365.715 98.3565L365.867 97.7102L367.882 98.1864L367.729 98.8327L365.715 98.3565ZM370.419 100.191L370.581 99.5065L372.557 99.9737L372.396 100.658L370.419 100.191ZM373.566 97.4025L373.728 96.7183L375.743 97.1945L375.581 97.8787L373.566 97.4025ZM375.427 102.097L375.589 101.413L377.224 101.799L377.062 102.483L375.427 102.097ZM424.943 98.4269L426.282 98.7033L426.17 99.5196L424.794 99.3952L424.943 98.4269ZM413.946 95.025L421.03 96.9803L420.899 97.8726L420.425 97.8408L413.853 95.9263L413.946 95.025ZM411.359 94.253L412.696 94.3684L413.449 95.4294L411.208 95.0603L411.359 94.253ZM404.223 92.6869L407.374 93.1105L407.188 94.0699L406.807 93.98L406.403 93.4831L405.868 93.8785L404.083 93.6172L404.223 92.6869ZM393.204 89.7212L402.508 91.9605L402.36 92.9288L393.035 90.6045L393.204 89.7212ZM464.548 116.819L451.623 113.764L451.459 114.287L443.024 150.144L453.726 152.754L464.548 116.819ZM441.707 154.529L439.173 165.249L449.551 167.702L452.503 157.081L441.707 154.529ZM471.716 108.398L471.965 109.38L451.691 190.405L451.217 190.373L429.387 185.254L434.202 164.034L434.418 163.122L435.84 158.802L435.422 158.703L436.047 157.928L449.848 103.27L471.716 108.398Z"
            fill="white"
          />
        </svg>
      </div>
      <div className="absolute bottom-50 right-22 text-6xl font-bold font-hitmepunk text-white transform -rotate-8 pointer-events-none z-10">
        <svg
          width="231"
          height="141"
          viewBox="0 0 231 141"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M40.2255 81.9506C41.513 81.7171 42.3506 82.4658 42.7383 84.1968L43.4058 87.0938C43.553 87.7018 42.8559 88.2943 41.3146 88.8714L40.8157 88.9737L40.1499 88.3518L38.6055 82.5367L38.7555 82.2092L40.2255 81.9506ZM42.7404 93.9892L43.6693 94.8201L43.7286 95.1688L42.7997 94.3379L42.7404 93.9892ZM32.0713 112.203L33.5735 119.005L47.1899 116.892L45.2894 108.415L45.4772 108.362L42.857 99.0757L43.0713 98.6892L45.2387 98.312C46.3552 98.8047 47.1 99.8916 47.4733 101.573L48.0656 104.207L49.2428 107.039L48.7439 107.141L48.83 107.442L49.1521 107.715L49.2768 109.426L50.8166 116.218L64.6473 113.718L64.1737 111.781L64.0612 112.098L63.5623 112.2L63.4762 111.9L63.9205 110.472L62.9407 106.202L62.7139 104.276L62.2731 103.305L62.5092 103.278L62.1763 102.967L61.3634 99.421L61.2241 99.786L60.9505 99.8238L60.8366 98.1498C59.5751 95.0709 58.2679 93.0615 56.915 92.1218L56.6897 92.1864L56.9805 93.4846L56.5083 93.5386L56.449 93.1899L56.5883 92.825L56.4914 92.487L56.2929 92.5032L55.9501 93.2923L56.5569 93.8498L55.6826 94.3441L55.8702 94.0059L55.548 93.7325L55.4887 93.3838L55.7393 91.2803L54.9665 91.136L54.2693 91.539L53.8018 90.6164L53.2229 91.4325L52.7447 90.4724C55.9732 88.4095 57.2662 85.926 56.6237 83.0219L55.3264 77.5016C53.4223 71.5186 50.6302 68.8647 46.9499 69.54L46.4885 69.6316C41.3632 70.5584 33.3108 72.473 22.3314 75.3752L22.616 75.6594L22.7128 75.9973L32.2215 112.16L32.0713 112.203ZM50.7552 49.9203L52.8319 57.1677L53.385 57.8219L53.3424 58.2405L53.45 58.616L71.0704 114.153L70.91 115.012C36.8157 122.993 22.8512 126.019 29.0166 124.09L12.7521 66.3361L16.1241 62.3629L16.4194 62.6846L16.527 63.0601L16.4469 63.4894L16.6346 63.4356L16.6772 63.0171L16.8275 62.974L17.1604 63.285L17.3106 63.242L17.9164 62.662L19.3333 63.0687L19.9392 62.4888L20.197 62.8212L21.1834 61.7259L22.1922 61.8432L22.6804 61.7033L24.7132 60.7144L24.971 61.0469L25.174 59.7697L25.4318 60.1022L25.5394 60.4777L25.6195 60.0484L25.8073 59.9946L26.0651 60.3271L26.2528 60.2733C42.5949 53.3963 50.7624 49.9454 50.7552 49.9203ZM76.3681 88.5388L76.2555 88.5711L74.0655 80.5028C73.2261 77.3842 72.551 74.0831 72.0404 70.5994C71.4862 66.2071 72.4769 63.6612 75.0125 62.9618C77.0547 62.4308 78.7456 63.4633 80.0854 66.0592C81.0416 67.4106 82.4754 71.28 84.3868 77.6672L84.4995 77.6349L86.6895 85.7032C87.5289 88.8218 88.2039 92.1229 88.7145 95.6066C89.2688 99.9989 88.2655 102.548 85.7049 103.255C83.6628 103.786 81.9843 102.75 80.6695 100.147C79.7134 98.7953 78.2796 94.926 76.3681 88.5388ZM75.9806 108.032C78.5051 111.454 82.3566 112.463 87.5352 111.061C94.0656 109.271 97.2998 105.242 97.2378 98.9751C97.0194 94.0532 96.3308 89.4285 95.1721 85.1011L92.1857 73.9697L91.9228 74.045C89.1152 65.2868 86.7253 60.0661 84.7531 58.3828C82.2358 54.9865 78.3878 53.9896 73.2093 55.3922C66.6788 57.1822 63.4446 61.2107 63.5067 67.4777C63.7179 72.3746 64.4028 76.9867 65.5616 81.3141L68.548 92.4456L68.8109 92.3703C71.6256 101.153 74.0155 106.374 75.9806 108.032ZM32.6927 61.76L31.4742 61.0527L30.5354 61.3217L29.8764 62.567L30.1454 63.5058L31.3639 64.2131L32.3027 63.9441L32.9617 62.6988L32.6927 61.76ZM135.186 88.467L135.654 90.2427L136.932 90.4456L139.007 89.0382L139.789 87.5137L139.321 85.7381L138.044 85.5352L136.006 86.9318L135.186 88.467ZM110.306 103.032L110.124 103.531L109.674 103.661L109.501 103.06L109.416 103.044L108.488 103.919L109.492 104.728L109.364 105.415L109.794 106.917L110.47 106.724L111.018 107.217L111.183 106.519C111.29 105.568 111.483 104.822 111.761 104.281C111.847 104.582 111.946 104.879 112.057 105.172L112.019 105.183L112.106 105.483L112.154 105.51C112.326 106.111 112.514 106.72 112.719 107.339L100.729 110.165L73.3271 118.342L52.7443 54.8767L50.2031 50.688L49.9879 49.937L53.7055 48.8718C53.2608 47.3196 53.4389 46.4288 54.24 46.1993L89.8387 35.9988C89.6639 36.6177 91.6648 43.0335 95.8415 55.2461C99.7385 66.672 104.911 82.5951 111.358 103.015L110.306 103.032ZM121.845 43.6096C122.571 43.0224 122.946 41.8721 122.969 40.1587L121.961 40.0414L119.151 42.4312C119.323 43.0321 119.801 43.4234 120.584 43.6052L120.81 43.5407L121.013 43.1166C121.078 43.3419 121.355 43.5063 121.845 43.6096ZM116.765 37.5074L116.357 37.218C116.377 36.1556 116.538 35.5813 116.838 35.4952L117.654 36.0741L117.751 36.4121L116.765 37.5074ZM110.023 40.7802L109.196 41.017C107.339 40.4925 106.264 39.7171 105.97 38.6907C106.022 36.5087 106.261 35.3567 106.686 35.2347L110.665 38.4833C110.662 39.8926 110.448 40.6583 110.023 40.7802ZM119.539 72.4303L119.254 71.5774L119.055 71.5936L119.104 72.1892L119.378 72.4358L119.539 72.4303ZM104.165 70.8216L103.857 68.7561L103.262 68.8048L103.966 70.8379L104.165 70.8216ZM132.491 43.8912C127.852 35.739 121.262 32.3583 112.721 33.7492C101.878 36.9375 98.5709 46.0527 102.8 61.0947C107.052 74.4233 114.318 80.0213 124.597 77.8887C134.389 75.1912 138.244 68.3166 136.16 57.265L134.159 57.5133L126.38 58.4422C127.163 63.2564 125.808 66.137 122.314 67.084C118.4 67.0405 115.434 63.9217 113.416 57.7277C111.12 49.148 112.109 44.4219 116.383 43.5494C119.123 43.4686 121.532 45.2571 123.609 48.9149L132.491 43.8912ZM116.861 30.3281L128.567 28.0709C129.329 27.9881 129.787 28.358 129.942 29.1806L136.169 39.7086C136.963 40.7811 137.567 41.7053 137.979 42.4812L148.053 38.782L138.662 44.4392C138.723 45.5051 137.987 45.96 136.452 45.8037L128.348 49.7108L129.756 53.2081L133.437 53.2911L148.729 60.0026L145.3 60.0911L152.063 62.1356L148.201 71.4909L145 74.9273L136.91 68.9562L136.953 69.3908L136.706 69.3802L136.314 69.0049L136.789 72.0791L137.154 72.5027L136.913 72.9375L137.471 72.8995L137.048 73.8334L137.65 75.9363L137.897 75.9469L138.176 75.5013L138.337 76.3489L137.678 76.4568L137.839 77.3044L138.521 78.1248L138.629 78.5003L138.409 79.0102L138.544 79.9062L138.861 80.303L138.668 80.7646L138.755 81.6338L139.157 82.0466L138.638 82.927L138.321 82.5302L138.02 82.6163L138.101 83.0401L138.418 83.4369L137.603 83.9956L137.549 83.5234L136.771 84.0713L134.549 83.4077L133.595 84.9L133.273 84.911L132.86 84.4606L132.962 84.9596L132.635 84.5252L131.819 85.0838L130.869 84.7465L130.94 85.1328L127.424 83.7833L127.559 84.6793C126.582 84.7695 125.935 84.3997 125.616 83.5701L124.248 84.6121L123.529 83.8024L123.336 84.264L122.101 83.9269L120.691 84.5343L120.61 84.1105L120.255 83.7244C119.272 83.7896 118.462 84.3196 117.826 85.3145L118.18 85.7006L118.047 87.0797L115.969 85.0745L115.647 85.0855L115.831 86.0082L113.324 85.3448L106.913 86.0848C106.18 86.0782 104.365 77.8075 101.469 61.2728L101.399 60.8866L101.082 60.4897L101.318 60.4627L101.264 59.9906L100.948 59.5938L100.462 56.4821L99.8597 54.3792L100.101 53.9444L96.9301 40.4683L97.2305 40.3822L96.4556 37.3942L96.0726 34.7814L96.8878 34.2227L116.126 30.4574L116.694 29.3195L116.861 30.3281ZM176.499 78.2138L162.218 52.4804L161.044 26.4042L151.238 29.0516L152.898 53.566L152.335 53.7274L145.584 30.5905L136.974 33.017L152.204 85.1756L160.84 82.7008L152.997 55.8946L153.56 55.7332C153.98 57.1029 158.372 65.529 166.736 81.0114L176.499 78.2138ZM164.215 19.3191L164.521 19.6784L164.613 20.1398L164.731 20.5528C164.86 20.2451 164.988 19.8426 165.117 19.3453C164.795 19.3563 164.494 19.3475 164.215 19.3191ZM164.215 19.3191C162.316 19.2133 161.738 18.9454 162.482 18.5156L164.569 18.5677L163.85 18.8955L164.215 19.3191ZM165.997 27.3824L176.399 66.0929L179.757 79.5152C180.347 79.4003 180.725 79.6307 180.89 80.2065L182.165 85.0829L181.989 86.0274L177.187 86.1437L177.327 86.6319L181.812 86.1187L182.081 87.0575L181.893 87.1113L175.884 87.411L175.626 86.5098L174.634 87.1598L173.759 87.3697L148.514 87.0456L148.304 86.1712C144.591 72.3628 138.854 52.1996 131.093 25.6813L131.226 25.1554L131.65 25.0745L132.015 25.4982L134.734 23.5001L135.974 23.7137L136.494 23.1178L139.478 23.8881L139.692 22.9329L139.917 22.8683L140.271 23.2544L140.368 22.7392L142.916 22.6997L142.809 23.1773L142.949 23.6655L143.137 23.6117L143.657 23.0157L144.27 24.303L144.366 23.7878L144.602 23.7608L145.273 24.5437C146.296 23.9527 146.934 23.201 147.187 22.2886L147.59 22.7015L147.697 23.077L147.564 23.6029L147.8 23.5759L148.652 22.4378L149.006 22.8238L149.205 22.8076C149.98 22.0164 150.305 21.1648 150.179 20.2528C153.735 20.1821 155.662 20.7136 155.959 21.8473L156.163 20.8545L156.834 21.6374L158.384 20.3806C158.581 20.9743 159.111 21.4997 159.973 21.9569L161.249 20.7379C161.393 21.2386 161.876 21.6013 162.699 21.8261L163.267 21.2569L163.385 21.6699L163.466 21.2406L163.691 21.1761L164.035 21.5246C164.267 21.485 164.499 21.1611 164.731 20.5528C165.851 24.6478 166.273 26.9243 165.997 27.3824ZM165.117 19.3453C165.138 19.2308 165.168 19.1002 165.208 18.9535L165.326 19.3666C165.244 19.3631 165.174 19.356 165.117 19.3453ZM204.398 11.2185L191.63 14.8769L191.743 15.4134L201.928 50.8135L212.539 47.8543L204.398 11.2185ZM202.924 55.2823L205.958 65.8718L216.21 62.9343L213.588 52.2265L202.924 55.2823ZM206.53 0.367519L207.228 1.10208L229.182 81.6881L228.753 81.8923L207.209 88.1061L201.028 67.2438L200.77 66.3426L199.897 61.879L199.484 61.9974L199.65 61.0153L184.949 6.59207L206.53 0.367519Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
};

export default CollageMonde;
