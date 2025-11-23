import Image from "next/image";
import { Header } from "@/components/header";
import { CanvasArea } from "@/components/canvasArea";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <Header />
      
      <div>
        <CanvasArea />
      </div>

    </div>
  );
}
