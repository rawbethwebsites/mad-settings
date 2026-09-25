import type { Metadata } from "next";
import CampApp from "@/components/camp/CampApp";

export const metadata: Metadata = {
  title: "Camp Games — MAD SETTINGS",
  description: "Play the MAD SETTINGS campsite games, earn points, and carry your tent.",
};

export default function CampPage() {
  return <CampApp />;
}
