"use client";

import { Palette, Sun, Moon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeStore } from "@/features/theme/store";
import { THEMES, type ThemeId } from "@/lib/themes";
import { cn } from "@/lib/utils";

export function ThemeSelector() {
  const theme = useThemeStore((s) => s.theme);
  const colorMode = useThemeStore((s) => s.colorMode);
  const setTheme = useThemeStore((s) => s.setTheme);
  const toggleColorMode = useThemeStore((s) => s.toggleColorMode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change theme"
        className={cn(
          "flex items-center justify-center h-9 w-9 rounded-full",
          "hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        )}
      >
        <Palette size={18} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {/* Color theme group — Label must be a direct child of Group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Color Theme
          </DropdownMenuLabel>

          {THEMES.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => setTheme(t.id as ThemeId)}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <span className="flex gap-1 shrink-0">
                <span
                  className="w-3 h-3 rounded-full ring-1 ring-black/10"
                  style={{ background: t.primarySwatch }}
                />
                <span
                  className="w-3 h-3 rounded-full ring-1 ring-black/10"
                  style={{ background: t.accentSwatch }}
                />
              </span>
              <span className="flex-1 text-sm">{t.label}</span>
              {theme === t.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Mode group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Mode
          </DropdownMenuLabel>

          <DropdownMenuItem
            onClick={toggleColorMode}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            {colorMode === "light" ? (
              <>
                <Moon size={14} className="shrink-0" />
                <span className="text-sm">Switch to Dark</span>
              </>
            ) : (
              <>
                <Sun size={14} className="shrink-0" />
                <span className="text-sm">Switch to Light</span>
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
