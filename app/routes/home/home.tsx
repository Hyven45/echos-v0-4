import RocknRoulette from "~/routes/home/partials/RockNRoulette";
import BranchesMarginales from "~/routes/home/partials/BranchesMarginales/index";
import CollageMonde from "~/routes/home/partials/CollageMonde";
import type { Route } from "../+types/home";
import Hero from "~/routes/home/partials/Hero";
import Navigation from "~/components/Navigation";
import { GroupProvider } from "~/contexts/GroupContext";
import FullScreenCarousel from "~/routes/home/partials/FullScreenCarousel";

export function meta({}: Route["MetaArgs"]) {
  return [
    { title: "ECHOS - Pas de règles, juste du rock" },
    {
      name: "description",
      content:
        "ECHOS, c'est un projet de site web pour les groupes de musique.",
    },
  ];
}

export default function Home() {
  return (
    <GroupProvider>
      <Navigation isScrolled={false} />
      <Hero />
      <RocknRoulette />
      <BranchesMarginales />
      <CollageMonde />
      <FullScreenCarousel />
    </GroupProvider>
  );
}
