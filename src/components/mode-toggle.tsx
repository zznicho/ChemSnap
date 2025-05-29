import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("alkali")}>
          Alkali
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("noble-gas")}>
          Noble Gas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("halogen")}>
          Halogen
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("transition-metal")}>
          Transition Metal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("lanthanide")}>
          Lanthanide
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("actinide")}>
          Actinide
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("covalent")}>
          Covalent
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("ionic")}>
          Ionic
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}