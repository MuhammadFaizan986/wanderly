"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { href: "/search", label: "Flights" },
  { href: "/plan", label: "AI Planner" },
  { href: "/trips", label: "My Trips" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-300",
        scrolled
          ? "border-border/70 bg-background/75 shadow-soft backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "group relative px-4 py-2 text-[0.95rem] font-medium text-foreground/75 transition-colors hover:text-foreground",
                    active && "text-foreground",
                  )}
                >
                  {link.label}
                  <span
                    className={cn(
                      "absolute inset-x-4 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-[image:var(--gradient-brand)] transition-transform duration-300 group-hover:scale-x-100",
                      active && "scale-x-100",
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden rounded-full px-4 sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            asChild
            variant="ink"
            className="relative hidden h-11 px-6 text-[0.95rem] before:absolute before:-inset-[2px] before:-z-10 before:rounded-full before:bg-[image:var(--gradient-brand)] before:opacity-70 before:blur-[2px] sm:inline-flex"
          >
            <Link href="/plan">
              <Sparkles data-icon="inline-start" />
              Plan with AI
            </Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="px-4 pt-4">
                <Logo />
              </SheetTitle>
              <ul className="flex flex-col gap-1 px-2">
                {[...links, { href: "/login", label: "Log in" } as const].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block rounded-xl px-3 py-2.5 font-medium hover:bg-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="px-4 pt-2">
                <Button asChild variant="brand" className="h-11 w-full">
                  <Link href="/plan">
                    <Sparkles data-icon="inline-start" />
                    Plan with AI
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </motion.header>
  );
}
