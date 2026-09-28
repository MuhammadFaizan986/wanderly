"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Luggage, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({ user }: { user: User }) {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full p-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Account menu"
      >
        <span className="block rounded-full bg-[image:var(--gradient-brand)] p-[2px]">
          <Avatar className="size-9 border-2 border-background">
            <AvatarFallback className="bg-card text-xs font-semibold">
              {initials(user.full_name)}
            </AvatarFallback>
          </Avatar>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-semibold">{user.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/trips">
            <Luggage /> My Trips
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/plan">
            <Sparkles /> Plan with AI
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={async () => {
            await logout();
            toast.success("You've been logged out.");
            router.push("/");
          }}
        >
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
